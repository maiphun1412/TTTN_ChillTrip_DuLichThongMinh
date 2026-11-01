import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api-response";
import { verifyGuideAccess } from "@/lib/guide-auth";
import {
  canSharePassengerPhoneByBookingConsent,
  checkGuideAssignmentOwnership,
  checkGuideDepartureOwnership,
  evaluateTripAccessWindow,
  parseAssignmentId,
  parsePositiveBigInt,
  recordGuidePrivacyAccessStrict,
  recordGuidePrivacyDeniedSafe,
  resolveBookingPhoneConsentMap,
} from "@/lib/guide-privacy";

function serialize<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

type AssignedTripHeaderRow = {
  assignmentId: bigint;
  departureId: bigint;
  departureCode: string;
  startDate: Date | string;
  endDate: Date | string;
  bookingStatus: string;
  operationStatus: string | null;
  tourId: bigint;
  tourCode: string;
  tourName: string;
  durationDays: number;
  durationNights: number;
  featuredImageUrl: string | null;
};

/**
 * DTO tối thiểu phục vụ vận hành đoàn:
 * Tuyệt đối KHÔNG truy vấn CCCD (id_number), hộ chiếu (passport_number), ngày sinh (date_of_birth),
 * giới tính (gender), email (contact_email), sức khỏe (health_note), liên hệ khẩn cấp,
 * hay các trường ghi chú tự do cá nhân của khách (special_notes, meal_note, room_preference).
 */
type MinimizedPassengerRow = {
  assignmentId: bigint;
  departureId: bigint;
  bookingId: bigint;
  customerId: bigint;
  bookingCode: string;
  bookingStatus: string;
  contactName: string;
  contactPhone: string | null;
  customerPhone: string | null;
  adultCount: number;
  childCount: number;
  pickupName: string | null;
  pickupAddress: string | null;
  pickupTime: string | null;
  passengerId: bigint | null;
  passengerType: string | null;
  passengerName: string | null;
  passengerPhone: string | null;
  isBookingContact: boolean | number | null;
};

export async function GET(req: NextRequest) {
  const authCheck = await verifyGuideAccess(req);

  if (!authCheck.ok) {
    await recordGuidePrivacyDeniedSafe(req, {
      dataType: "PASSENGER_LIST",
      reason: authCheck.reason,
      purpose: "TOUR_OPERATION",
    });
    return fail(authCheck.message, authCheck.status);
  }

  const guideId = BigInt(authCheck.guide.guideId);
  const guideUserId = BigInt(authCheck.guide.userId);

  try {
    const { searchParams } = new URL(req.url);
    const rawAssignmentId = searchParams.get("assignmentId");
    const rawDepartureId = searchParams.get("departureId");

    let filterAssignmentId: bigint | null = null;
    let filterDepartureId: bigint | null = null;

    if (rawAssignmentId !== null && rawAssignmentId.trim() !== "") {
      filterAssignmentId = parseAssignmentId(rawAssignmentId);
      if (filterAssignmentId === null) {
        return fail("ID phân công không hợp lệ", 400);
      }

      const ownership = await checkGuideAssignmentOwnership(
        filterAssignmentId,
        guideId
      );
      if (
        ownership.status === "NOT_FOUND" ||
        ownership.status === "FORBIDDEN_NOT_ASSIGNED"
      ) {
        await recordGuidePrivacyDeniedSafe(req, {
          accessorUserId: guideUserId,
          accessorRole: "GUIDE",
          dataType: "PASSENGER_LIST",
          reason: "GUIDE_NOT_ASSIGNED",
          purpose: "TOUR_OPERATION",
        });
        return fail("Không tìm thấy chuyến đi được phân công", 404);
      }
    }

    if (rawDepartureId !== null && rawDepartureId.trim() !== "") {
      filterDepartureId = parsePositiveBigInt(rawDepartureId);
      if (filterDepartureId === null) {
        return fail("ID lịch khởi hành không hợp lệ", 400);
      }

      const ownership = await checkGuideDepartureOwnership(
        filterDepartureId,
        guideId
      );
      if (
        ownership.status === "NOT_FOUND" ||
        ownership.status === "FORBIDDEN_NOT_ASSIGNED"
      ) {
        await recordGuidePrivacyDeniedSafe(req, {
          accessorUserId: guideUserId,
          accessorRole: "GUIDE",
          dataType: "PASSENGER_LIST",
          reason: "GUIDE_NOT_ASSIGNED",
          purpose: "TOUR_OPERATION",
        });
        return fail("Không tìm thấy chuyến đi được phân công", 404);
      }
    }

    const extraFilters: Prisma.Sql[] = [];
    if (filterAssignmentId !== null) {
      extraFilters.push(Prisma.sql`AND ga.id = ${filterAssignmentId}`);
    }
    if (filterDepartureId !== null) {
      extraFilters.push(Prisma.sql`AND ds.id = ${filterDepartureId}`);
    }

    const tripHeaders = await prisma.$queryRaw<AssignedTripHeaderRow[]>`
      SELECT
        ga.id AS assignmentId,
        ds.id AS departureId,
        ds.departure_code AS departureCode,
        ds.start_date AS startDate,
        ds.end_date AS endDate,
        ds.booking_status AS bookingStatus,
        dope.operation_status AS operationStatus,
        t.id AS tourId,
        t.tour_code AS tourCode,
        t.tour_name AS tourName,
        t.duration_days AS durationDays,
        t.duration_nights AS durationNights,
        t.featured_image_url AS featuredImageUrl
      FROM guide_assignments ga
      INNER JOIN departure_schedules ds ON ga.departure_id = ds.id
      INNER JOIN tours t ON ds.tour_id = t.id
      LEFT JOIN departure_operations dope ON dope.departure_id = ds.id
      WHERE ga.guide_id = ${guideId}
        AND ds.guide_id IS NOT NULL
        AND ds.guide_id = ga.guide_id
        ${extraFilters.length ? Prisma.join(extraFilters, " ") : Prisma.empty}
      ORDER BY ds.start_date ASC
    `;

    const tripMap = new Map<string, any>();
    const allowedAssignmentIds: bigint[] = [];

    for (const header of tripHeaders) {
      const assignmentIdStr = String(header.assignmentId);
      const windowEval = evaluateTripAccessWindow({
        startDate: header.startDate,
        endDate: header.endDate,
        bookingStatus: header.bookingStatus,
        operationStatus: header.operationStatus,
      });

      if (!windowEval.allowed) {
        await recordGuidePrivacyDeniedSafe(req, {
          accessorUserId: guideUserId,
          accessorRole: "GUIDE",
          dataType: "PASSENGER_LIST",
          reason: windowEval.logReason ?? "TRIP_EXPIRED",
          purpose: "TOUR_OPERATION",
          departureId: header.departureId,
        });

        // Nếu client truyền đích danh assignmentId/departureId của chuyến ngoài thời hạn thì trả 403 ngay
        if (filterAssignmentId !== null || filterDepartureId !== null) {
          return fail(windowEval.message, 403);
        }
      } else {
        allowedAssignmentIds.push(BigInt(header.assignmentId));
      }

      tripMap.set(assignmentIdStr, {
        assignmentId: assignmentIdStr,
        departureId: String(header.departureId),
        departureCode: header.departureCode,
        startDate: header.startDate,
        endDate: header.endDate,
        tourId: String(header.tourId),
        tourCode: header.tourCode,
        tourName: header.tourName,
        durationDays: header.durationDays,
        durationNights: header.durationNights,
        featuredImageUrl: header.featuredImageUrl,
        passengerAccessAllowed: windowEval.allowed,
        passengerAccessCode: windowEval.code,
        passengerAccessMessage: windowEval.message,
        allowedFrom: windowEval.allowedFrom,
        allowedUntil: windowEval.allowedUntil,
        bookingCount: 0,
        passengerCount: 0,
        bookings: [],
      });
    }

    if (allowedAssignmentIds.length > 0) {
      // Chỉ SELECT đúng các trường tối thiểu cần thiết (tên, phân loại khách, điểm đón, SĐT chờ kiểm tra consent)
      const rows = await prisma.$queryRaw<MinimizedPassengerRow[]>`
        SELECT
          ga.id AS assignmentId,
          ds.id AS departureId,
          b.id AS bookingId,
          b.customer_id AS customerId,
          b.booking_code AS bookingCode,
          b.booking_status AS bookingStatus,
          b.contact_name AS contactName,
          b.contact_phone AS contactPhone,
          c.phone AS customerPhone,
          b.adult_count AS adultCount,
          b.child_count AS childCount,
          pp.point_name AS pickupName,
          pp.address AS pickupAddress,
          pp.pickup_time AS pickupTime,
          bp.id AS passengerId,
          bp.passenger_type AS passengerType,
          bp.full_name AS passengerName,
          bp.phone AS passengerPhone,
          bp.is_booking_contact AS isBookingContact
        FROM guide_assignments ga
        INNER JOIN departure_schedules ds ON ga.departure_id = ds.id
        INNER JOIN bookings b ON b.departure_id = ds.id
        LEFT JOIN customers c ON c.id = b.customer_id
        LEFT JOIN pickup_points pp ON b.pickup_point_id = pp.id
        LEFT JOIN booking_passengers bp ON bp.booking_id = b.id
        WHERE ga.guide_id = ${guideId}
          AND ds.guide_id IS NOT NULL
          AND ds.guide_id = ga.guide_id
          AND ga.id IN (${Prisma.join(allowedAssignmentIds)})
          AND ds.booking_status <> 'CANCELLED'
          AND b.booking_status NOT IN ('CANCELLED')
        ORDER BY ds.start_date ASC, b.booking_code ASC, bp.id ASC
      `;

      const bookingConsentInputs = rows.map((r) => ({
        bookingId: BigInt(r.bookingId),
        customerId: BigInt(r.customerId),
      }));
      const consentMap =
        await resolveBookingPhoneConsentMap(bookingConsentInputs);

      // Nhóm chủ dữ liệu thực tế theo từng chuyến (departureId) để ghi log ALLOWED bắt buộc trước khi trả dữ liệu
      const ownersByDeparture = new Map<
        string,
        Map<string, { customerId: bigint; bookingId: bigint }>
      >();

      for (const row of rows) {
        const depKey = String(row.departureId);
        if (!ownersByDeparture.has(depKey)) {
          ownersByDeparture.set(depKey, new Map());
        }
        const bookingKey = `${row.customerId}_${row.bookingId}`;
        ownersByDeparture.get(depKey)!.set(bookingKey, {
          customerId: BigInt(row.customerId),
          bookingId: BigInt(row.bookingId),
        });
      }

      // Cơ chế Fail-Closed: xác minh ghi log ALLOWED thực sự thành công trước khi trả dữ liệu cá nhân
      try {
        for (const [depIdStr, ownerMap] of ownersByDeparture.entries()) {
          const owners = Array.from(ownerMap.values());
          if (owners.length === 0) continue;

          const insertedCount = await recordGuidePrivacyAccessStrict(req, {
            accessorUserId: guideUserId,
            accessorRole: "GUIDE",
            dataType: "PASSENGER_LIST",
            action: "VIEW",
            result: "ALLOWED",
            purpose: "TOUR_OPERATION",
            departureId: BigInt(depIdStr),
            owners,
          });

          if (insertedCount < owners.length) {
            throw new Error(
              "Số dòng nhật ký bảo mật ghi nhận không khớp với số chủ dữ liệu"
            );
          }
        }
      } catch (logError) {
        console.error(
          "[GET /api/guide/passengers] Từ chối trả dữ liệu vì không ghi được privacy_access_logs:",
          logError
        );
        return fail(
          "Không thể xác nhận nhật ký bảo mật quyền riêng tư, từ chối truy cập dữ liệu hành khách",
          500
        );
      }

      for (const row of rows) {
        const assignmentIdStr = String(row.assignmentId);
        const bookingIdStr = String(row.bookingId);
        const trip = tripMap.get(assignmentIdStr);
        if (!trip) continue;

          const consent = consentMap.get(bookingIdStr) ?? {
            phoneShared: false,
            consentStatus: "NO_CONSENT_SCHEMA" as const,
          };

          let booking = trip.bookings.find(
            (item: any) => item.id === bookingIdStr
          );

          if(!booking) {
            // DTO allowlist tường minh cho booking
            booking = {
              id: bookingIdStr,
              bookingCode: row.bookingCode,
              bookingStatus: row.bookingStatus,
              contactName: row.contactName,
              contactPhone: consent.phoneShared ? row.contactPhone : null,
              contactPhoneShared: consent.phoneShared,
              phoneConsentStatus: consent.consentStatus,
              adultCount: Number(row.adultCount || 0),
              childCount: Number(row.childCount || 0),
              specialNotes: null,
              pickupName: row.pickupName,
              pickupAddress: row.pickupAddress,
              pickupTime: row.pickupTime,
              passengers: [],
            };

            trip.bookings.push(booking);
          }

        if(row.passengerId !== null && row.passengerId !== undefined) {
            const passengerIdStr = String(row.passengerId);
        const existed = booking.passengers.some(
          (item: any) => item.id === passengerIdStr
        );

        if (!existed) {
          const allowPassengerPhone = canSharePassengerPhoneByBookingConsent({
            bookingConsentShared: consent.phoneShared,
            isBookingContact: row.isBookingContact,
            passengerPhone: row.passengerPhone,
            bookingContactPhone: row.contactPhone,
            customerPhone: row.customerPhone,
          });

          // DTO allowlist tường minh cho hành khách
          booking.passengers.push({
            id: passengerIdStr,
            passengerType: row.passengerType,
            fullName: row.passengerName,
            hasPassengerInfo: true,
            phone: allowPassengerPhone ? row.passengerPhone : null,
            phoneShared: allowPassengerPhone,
            phoneConsentStatus: consent.consentStatus,
            mealNote: null,
            roomPreference: null,
            isBookingContact: Boolean(row.isBookingContact),
          });
        }
      }
    }
  }

    // DTO allowlist tường minh cho từng chuyến đi
    const trips = Array.from(tripMap.values()).map((trip) => {
    const passengerCount = trip.bookings.reduce(
      (sum: number, booking: any) => {
        if (booking.passengers.length > 0) {
          return sum + booking.passengers.length;
        }
        return (
          sum +
          Number(booking.adultCount || 0) +
          Number(booking.childCount || 0)
        );
      },
      0
    );

    return {
      assignmentId: trip.assignmentId,
      departureId: trip.departureId,
      departureCode: trip.departureCode,
      startDate: trip.startDate,
      endDate: trip.endDate,
      tourId: trip.tourId,
      tourCode: trip.tourCode,
      tourName: trip.tourName,
      durationDays: trip.durationDays,
      durationNights: trip.durationNights,
      featuredImageUrl: trip.featuredImageUrl,
      passengerAccessAllowed: trip.passengerAccessAllowed,
      passengerAccessCode: trip.passengerAccessCode,
      passengerAccessMessage: trip.passengerAccessMessage,
      allowedFrom: trip.allowedFrom,
      allowedUntil: trip.allowedUntil,
      bookingCount: trip.bookings.length,
      passengerCount,
      bookings: trip.bookings,
    };
  });

  return ok(serialize(trips), "Lấy danh sách khách thành công");
} catch (error) {
  console.error("GET /api/guide/passengers error:", error);
  return fail("Không thể lấy danh sách khách", 500);
}
}
