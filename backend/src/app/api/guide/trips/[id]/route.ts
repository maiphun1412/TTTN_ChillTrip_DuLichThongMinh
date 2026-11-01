import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api-response";
import { verifyGuideAccess } from "@/lib/guide-auth";
import {
  canSharePassengerPhoneByBookingConsent,
  checkGuideAssignmentOwnership,
  evaluateTripAccessWindow,
  parseAssignmentId,
  recordGuidePrivacyAccessStrict,
  recordGuidePrivacyDeniedSafe,
  redactSensitiveNotes,
  resolveBookingPhoneConsentMap,
} from "@/lib/guide-privacy";

function serialize<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

/**
 * DTO tối thiểu cho hành khách trong chi tiết chuyến đi:
 * Tuyệt đối KHÔNG truy vấn CCCD (id_number), hộ chiếu (passport_number), ngày sinh (date_of_birth),
 * giới tính (gender), email (contact_email), sức khỏe (health_note), liên hệ khẩn cấp,
 * hay các trường ghi chú tự do cá nhân của khách (special_notes, meal_note, room_preference).
 */
type MinimizedTripPassengerRow = {
  id: bigint | null;
  bookingId: bigint;
  customerId: bigint;
  bookingCode: string;
  bookingStatus: string;
  adultCount: number;
  childCount: number;
  passengerType: string | null;
  fullName: string | null;
  phone: string | null;
  isBookingContact: boolean | number | null;
  contactName: string;
  contactPhone: string | null;
  customerPhone: string | null;
};

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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
    const { id } = await context.params;
    const assignmentId = parseAssignmentId(id);

    if (assignmentId === null) {
      return fail("ID phân công không hợp lệ", 400);
    }

    const ownership = await checkGuideAssignmentOwnership(
      assignmentId,
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
      // Trả 404 thống nhất để không làm lộ sự tồn tại của phân công thuộc HDV khác
      return fail("Không tìm thấy tour được phân công", 404);
    }

    const assignmentRows: any[] = await prisma.$queryRaw`
      SELECT
        ga.id AS assignmentId,
        ga.assigned_at AS assignedAt,
        ga.notes AS assignmentNotes,

        ds.id AS departureId,
        ds.departure_code AS departureCode,
        ds.start_date AS startDate,
        ds.end_date AS endDate,
        ds.max_seats AS maxSeats,
        ds.available_seats AS availableSeats,
        ds.booked_seats AS bookedSeats,
        ds.booking_status AS bookingStatus,

        ISNULL(dope.operation_status, 'PREPARING') AS operationStatus,
        dope.notes AS operationNotes,
        dope.updated_at AS operationUpdatedAt,

        t.id AS tourId,
        t.tour_code AS tourCode,
        t.tour_name AS tourName,
        t.tour_type AS tourType,
        t.duration_days AS durationDays,
        t.duration_nights AS durationNights,
        t.featured_image_url AS featuredImageUrl,
        t.short_description AS shortDescription,
        t.description,
        t.included_services AS includedServices,
        t.excluded_services AS excludedServices,

        d.destination_name AS destinationName,
        d.city AS destinationCity,
        d.country AS destinationCountry
      FROM guide_assignments ga
      INNER JOIN departure_schedules ds ON ga.departure_id = ds.id
      INNER JOIN tours t ON ds.tour_id = t.id
      LEFT JOIN destinations d ON t.destination_id = d.id
      LEFT JOIN departure_operations dope ON dope.departure_id = ds.id
      WHERE ga.id = ${assignmentId}
        AND ga.guide_id = ${guideId}
        AND ds.guide_id IS NOT NULL
        AND ds.guide_id = ga.guide_id
    `;

    if (!assignmentRows.length) {
      return fail("Không tìm thấy tour được phân công", 404);
    }

    const rawAssignment = assignmentRows[0];
    const departureId = BigInt(rawAssignment.departureId);
    const tourId = BigInt(rawAssignment.tourId);

    const windowEval = evaluateTripAccessWindow({
      startDate: rawAssignment.startDate,
      endDate: rawAssignment.endDate,
      bookingStatus: rawAssignment.bookingStatus,
      operationStatus: rawAssignment.operationStatus,
    });

    let passengers: any[] = [];
    let registeredPassengerCount = 0;

    if (!windowEval.allowed) {
      await recordGuidePrivacyDeniedSafe(req, {
        accessorUserId: guideUserId,
        accessorRole: "GUIDE",
        dataType: "PASSENGER_LIST",
        reason: windowEval.logReason ?? "TRIP_EXPIRED",
        purpose: "TOUR_OPERATION",
        departureId,
      });
    } else {
      // Chỉ SELECT các trường tối thiểu phục vụ vận hành đoàn
      // Dùng LEFT JOIN booking_passengers từ bookings để không bỏ sót booking chưa có hồ sơ hành khách (VD: BK004)
      const rawPassengers = await prisma.$queryRaw<MinimizedTripPassengerRow[]>`
        SELECT
          bp.id,
          b.id AS bookingId,
          b.customer_id AS customerId,
          b.booking_code AS bookingCode,
          b.booking_status AS bookingStatus,
          b.adult_count AS adultCount,
          b.child_count AS childCount,

          bp.passenger_type AS passengerType,
          bp.full_name AS fullName,
          bp.phone,
          bp.is_booking_contact AS isBookingContact,

          b.contact_name AS contactName,
          b.contact_phone AS contactPhone,
          c.phone AS customerPhone
        FROM bookings b
        LEFT JOIN customers c ON c.id = b.customer_id
        LEFT JOIN booking_passengers bp ON bp.booking_id = b.id
        WHERE b.departure_id = ${departureId}
          AND b.booking_status NOT IN ('CANCELLED')
        ORDER BY b.id ASC, bp.id ASC
      `;

      const bookingConsentInputs = rawPassengers.map((p) => ({
        bookingId: BigInt(p.bookingId),
        customerId: BigInt(p.customerId),
      }));
      const consentMap =
        await resolveBookingPhoneConsentMap(bookingConsentInputs);

      const ownerMap = new Map<
        string,
        { customerId: bigint; bookingId: bigint }
      >();
      for (const row of rawPassengers) {
        const key = `${row.customerId}_${row.bookingId}`;
        ownerMap.set(key, {
          customerId: BigInt(row.customerId),
          bookingId: BigInt(row.bookingId),
        });
      }

      const owners = Array.from(ownerMap.values());

      // Cơ chế Fail-Closed: khi có dữ liệu hành khách, bắt buộc xác nhận ghi log ALLOWED thực sự thành công trước khi trả
      if (owners.length > 0) {
        try {
          const insertedCount = await recordGuidePrivacyAccessStrict(req, {
            accessorUserId: guideUserId,
            accessorRole: "GUIDE",
            dataType: "PASSENGER_LIST",
            action: "VIEW",
            result: "ALLOWED",
            purpose: "TOUR_OPERATION",
            departureId,
            owners,
          });

          if (insertedCount < owners.length) {
            throw new Error(
              "Số dòng nhật ký bảo mật ghi nhận không khớp với số chủ dữ liệu"
            );
          }
        } catch (logError) {
          console.error(
            "[GET /api/guide/trips/[id]] Từ chối trả dữ liệu vì không ghi được privacy_access_logs:",
            logError
          );
          return fail(
            "Không thể xác nhận nhật ký bảo mật quyền riêng tư, từ chối truy cập dữ liệu hành khách",
            500
          );
        }
      }

      // DTO allowlist tường minh cho từng hành khách (bao gồm cả booking chưa có bản ghi booking_passengers)
      passengers = [];
      for (const row of rawPassengers) {
          const consent = consentMap.get(String(row.bookingId)) ?? {
            phoneShared: false,
            consentStatus: "NO_CONSENT_SCHEMA" as const,
          };

          if(row.id !== null && row.id !== undefined) {
            registeredPassengerCount += 1;
            const allowPassengerPhone = canSharePassengerPhoneByBookingConsent({
              bookingConsentShared: consent.phoneShared,
              isBookingContact: row.isBookingContact,
              passengerPhone: row.phone,
              bookingContactPhone: row.contactPhone,
              customerPhone: row.customerPhone,
            });

        passengers.push({
          id: row.id,
          bookingId: row.bookingId,
          bookingCode: row.bookingCode,
          bookingStatus: row.bookingStatus,
          passengerType: row.passengerType,
          fullName: row.fullName,
          hasPassengerInfo: true,
          phone: allowPassengerPhone ? row.phone : null,
          phoneShared: allowPassengerPhone,
          phoneConsentStatus: consent.consentStatus,
          mealNote: null,
          roomPreference: null,
          isBookingContact: Boolean(row.isBookingContact),
          contactName: row.contactName,
          contactPhone: consent.phoneShared ? row.contactPhone : null,
          contactPhoneShared: consent.phoneShared,
          specialNotes: null,
        });
      } else {
        const adultCount = Number(row.adultCount || 0);
        const childCount = Number(row.childCount || 0);
        const totalSlots = Math.max(1, adultCount + childCount);

        for (let index = 0; index < totalSlots; index++) {
          passengers.push({
            id: `${row.bookingId}-missing-${index}`,
            bookingId: row.bookingId,
            bookingCode: row.bookingCode,
            bookingStatus: row.bookingStatus,
            passengerType: index < adultCount ? "ADULT" : "CHILD",
            fullName: "Chưa có thông tin hành khách",
            hasPassengerInfo: false,
            phone: null,
            phoneShared: false,
            phoneConsentStatus: consent.consentStatus,
            mealNote: null,
            roomPreference: null,
            isBookingContact: false,
            contactName: row.contactName,
            contactPhone: consent.phoneShared ? row.contactPhone : null,
            contactPhoneShared: consent.phoneShared,
            specialNotes: null,
          });
        }
      }
    }
  }

    const rawPickupPoints = await prisma.$queryRaw<any[]>`
      SELECT
        pp.id,
        pp.point_type AS pointType,
        pp.point_name AS pointName,
        pp.address,
        pp.province,
        pp.pickup_time AS pickupTime,
        pp.dropoff_time AS dropoffTime,
        pp.notes,
        COUNT(DISTINCT b.id) AS bookingCount,
        COALESCE(SUM(b.adult_count + b.child_count), 0) AS passengerCount
      FROM pickup_points pp
      LEFT JOIN bookings b ON b.pickup_point_id = pp.id
        AND b.booking_status NOT IN ('CANCELLED')
      WHERE pp.departure_id = ${departureId}
        AND pp.is_active = 1
      GROUP BY
        pp.id,
        pp.point_type,
        pp.point_name,
        pp.address,
        pp.province,
        pp.pickup_time,
        pp.dropoff_time,
        pp.notes
      ORDER BY pp.pickup_time ASC
    `;

  const pickupPoints = rawPickupPoints.map((pp) => ({
    id: pp.id,
    pointType: pp.pointType,
    pointName: pp.pointName,
    address: pp.address,
    province: pp.province,
    pickupTime: pp.pickupTime,
    dropoffTime: pp.dropoffTime,
    notes: redactSensitiveNotes(pp.notes),
    bookingCount: Number(pp.bookingCount || 0),
    passengerCount: Number(pp.passengerCount || 0),
  }));

  const rawItineraryDays = await prisma.$queryRaw<any[]>`
      SELECT
        itd.id,
        itd.day_no AS dayNo,
        itd.title,
        itd.description,
        itd.overnight_location AS overnightLocation
      FROM itinerary_days itd
      INNER JOIN itineraries i ON itd.itinerary_id = i.id
      WHERE i.tour_id = ${tourId}
        AND i.is_active = 1
      ORDER BY itd.day_no ASC
    `;

  const itineraryDays = rawItineraryDays.map((day) => ({
    id: day.id,
    dayNo: day.dayNo,
    title: day.title,
    description: day.description,
    overnightLocation: day.overnightLocation,
  }));

  const rawActivities = await prisma.$queryRaw<any[]>`
      SELECT
        ia.id,
        ia.itinerary_day_id AS itineraryDayId,
        ia.activity_time AS activityTime,
        ia.activity_title AS activityTitle,
        ia.location_name AS locationName,
        ia.description,
        ia.sort_order AS sortOrder
      FROM itinerary_activities ia
      INNER JOIN itinerary_days itd ON ia.itinerary_day_id = itd.id
      INNER JOIN itineraries i ON itd.itinerary_id = i.id
      WHERE i.tour_id = ${tourId}
        AND i.is_active = 1
      ORDER BY itd.day_no ASC, ia.sort_order ASC, ia.id ASC
    `;

  const activities = rawActivities.map((act) => ({
    id: act.id,
    itineraryDayId: act.itineraryDayId,
    activityTime: act.activityTime,
    activityTitle: act.activityTitle,
    locationName: act.locationName,
    description: act.description,
    sortOrder: act.sortOrder,
  }));

  const rawLogs = await prisma.$queryRaw<any[]>`
      SELECT
        id,
        log_time AS logTime,
        log_type AS logType,
        content,
        created_by AS createdBy
      FROM departure_operation_logs
      WHERE departure_id = ${departureId}
      ORDER BY log_time DESC
    `;

  const logs = rawLogs.map((log) => ({
    id: log.id,
    logTime: log.logTime,
    logType: log.logType,
    content: redactSensitiveNotes(log.content) ?? "",
    createdBy: log.createdBy,
  }));

  // DTO allowlist tường minh cho assignment
  const assignment = {
    assignmentId: rawAssignment.assignmentId,
    assignedAt: rawAssignment.assignedAt,
    assignmentNotes: redactSensitiveNotes(rawAssignment.assignmentNotes),
    departureId: rawAssignment.departureId,
    departureCode: rawAssignment.departureCode,
    startDate: rawAssignment.startDate,
    endDate: rawAssignment.endDate,
    maxSeats: rawAssignment.maxSeats,
    availableSeats: rawAssignment.availableSeats,
    bookedSeats: rawAssignment.bookedSeats,
    bookingStatus: rawAssignment.bookingStatus,
    operationStatus: rawAssignment.operationStatus,
    operationNotes: redactSensitiveNotes(rawAssignment.operationNotes),
    operationUpdatedAt: rawAssignment.operationUpdatedAt,
    tourId: rawAssignment.tourId,
    tourCode: rawAssignment.tourCode,
    tourName: rawAssignment.tourName,
    tourType: rawAssignment.tourType,
    durationDays: rawAssignment.durationDays,
    durationNights: rawAssignment.durationNights,
    featuredImageUrl: rawAssignment.featuredImageUrl,
    shortDescription: rawAssignment.shortDescription,
    description: rawAssignment.description,
    includedServices: rawAssignment.includedServices,
    excludedServices: rawAssignment.excludedServices,
    destinationName: rawAssignment.destinationName,
    destinationCity: rawAssignment.destinationCity,
    destinationCountry: rawAssignment.destinationCountry,
    passengerCount: passengers.length,
    registeredPassengerCount,
    passengerAccessAllowed: windowEval.allowed,
    passengerAccessCode: windowEval.code,
    passengerAccessMessage: windowEval.message,
    allowedFrom: windowEval.allowedFrom,
    allowedUntil: windowEval.allowedUntil,
  };

  return ok(
    serialize({
      assignment,
      passengerAccess: {
        allowed: windowEval.allowed,
        code: windowEval.code,
        message: windowEval.message,
        allowedFrom: windowEval.allowedFrom,
        allowedUntil: windowEval.allowedUntil,
      },
      passengers,
      pickupPoints,
      itineraryDays,
      activities,
      logs,
    }),
    "Lấy chi tiết chuyến đi thành công"
  );
} catch (error) {
  console.error("GET /api/guide/trips/[id] error:", error);
  return fail("Không thể lấy chi tiết chuyến đi", 500);
}
}
