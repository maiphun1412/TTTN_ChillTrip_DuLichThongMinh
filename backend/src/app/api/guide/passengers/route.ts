import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api-response";
import { requireGuide } from "@/lib/guide-auth";

function serialize<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

type RawPassengerRow = {
  assignmentId: bigint;
  departureId: bigint;
  departureCode: string;
  startDate: Date | string;
  endDate: Date | string;

  tourId: bigint;
  tourCode: string;
  tourName: string;
  durationDays: number;
  durationNights: number;
  featuredImageUrl: string | null;

  bookingId: bigint;
  bookingCode: string;
  bookingStatus: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string | null;
  adultCount: number;
  childCount: number;
  specialNotes: string | null;

  pickupName: string | null;
  pickupAddress: string | null;
  pickupTime: Date | string | null;

  passengerId: bigint | null;
  passengerType: string | null;
  passengerName: string | null;
  passengerGender: string | null;
  passengerDob: Date | string | null;
  passengerPhone: string | null;
  passengerEmail: string | null;
  idNumber: string | null;
  passportNumber: string | null;
  nationality: string | null;
  mealNote: string | null;
  healthNote: string | null;
  roomPreference: string | null;
  isBookingContact: boolean | number | null;
};

export async function GET(req: NextRequest) {
  const guideAuth = await requireGuide(req);

  if (!guideAuth) {
    return fail("Bạn không có quyền truy cập khu vực hướng dẫn viên", 403);
  }

  try {
    const guideId = Number(guideAuth.guideId);

    if (!guideId || Number.isNaN(guideId)) {
      return fail("Không xác định được hướng dẫn viên", 403);
    }

    const rows = await prisma.$queryRawUnsafe<RawPassengerRow[]>(
      `
        SELECT
          ga.id AS assignmentId,

          ds.id AS departureId,
          ds.departure_code AS departureCode,
          ds.start_date AS startDate,
          ds.end_date AS endDate,

          t.id AS tourId,
          t.tour_code AS tourCode,
          t.tour_name AS tourName,
          t.duration_days AS durationDays,
          t.duration_nights AS durationNights,
          t.featured_image_url AS featuredImageUrl,

          b.id AS bookingId,
          b.booking_code AS bookingCode,
          b.booking_status AS bookingStatus,
          b.contact_name AS contactName,
          b.contact_phone AS contactPhone,
          b.contact_email AS contactEmail,
          b.adult_count AS adultCount,
          b.child_count AS childCount,
          b.special_notes AS specialNotes,

          pp.point_name AS pickupName,
          pp.address AS pickupAddress,
          pp.pickup_time AS pickupTime,

          bp.id AS passengerId,
          bp.passenger_type AS passengerType,
          bp.full_name AS passengerName,
          bp.gender AS passengerGender,
          bp.date_of_birth AS passengerDob,
          bp.phone AS passengerPhone,
          bp.email AS passengerEmail,
          bp.id_number AS idNumber,
          bp.passport_number AS passportNumber,
          bp.nationality AS nationality,
          bp.meal_note AS mealNote,
          bp.health_note AS healthNote,
          bp.room_preference AS roomPreference,
          bp.is_booking_contact AS isBookingContact
        FROM guide_assignments ga
        INNER JOIN departure_schedules ds ON ga.departure_id = ds.id
        INNER JOIN tours t ON ds.tour_id = t.id
        INNER JOIN bookings b ON b.departure_id = ds.id
        LEFT JOIN pickup_points pp ON b.pickup_point_id = pp.id
        LEFT JOIN booking_passengers bp ON bp.booking_id = b.id
        WHERE ga.guide_id = @P1
          AND b.booking_status NOT IN ('CANCELLED')
        ORDER BY ds.start_date ASC, b.booking_code ASC, bp.id ASC
      `,
      guideId
    );

    const tripMap = new Map<string, any>();

    for (const row of rows) {
      const assignmentId = String(row.assignmentId);
      const bookingId = String(row.bookingId);

      if (!tripMap.has(assignmentId)) {
        tripMap.set(assignmentId, {
          assignmentId,

          departureId: String(row.departureId),
          departureCode: row.departureCode,
          startDate: row.startDate,
          endDate: row.endDate,

          tourId: String(row.tourId),
          tourCode: row.tourCode,
          tourName: row.tourName,
          durationDays: row.durationDays,
          durationNights: row.durationNights,
          featuredImageUrl: row.featuredImageUrl,

          bookingCount: 0,
          passengerCount: 0,

          bookings: [],
        });
      }

      const trip = tripMap.get(assignmentId);

      let booking = trip.bookings.find((item: any) => item.id === bookingId);

      if (!booking) {
        booking = {
          id: bookingId,
          bookingCode: row.bookingCode,
          bookingStatus: row.bookingStatus,
          contactName: row.contactName,
          contactPhone: row.contactPhone,
          contactEmail: row.contactEmail,
          adultCount: row.adultCount,
          childCount: row.childCount,
          specialNotes: row.specialNotes,

          pickupName: row.pickupName,
          pickupAddress: row.pickupAddress,
          pickupTime: row.pickupTime,

          passengers: [],
        };

        trip.bookings.push(booking);
      }

      if (row.passengerId) {
        const passengerId = String(row.passengerId);

        const existed = booking.passengers.some(
          (item: any) => item.id === passengerId
        );

        if (!existed) {
          booking.passengers.push({
            id: passengerId,
            passengerType: row.passengerType,
            fullName: row.passengerName,
            gender: row.passengerGender,
            dateOfBirth: row.passengerDob,
            phone: row.passengerPhone,
            email: row.passengerEmail,
            idNumber: row.idNumber,
            passportNumber: row.passportNumber,
            nationality: row.nationality,
            mealNote: row.mealNote,
            healthNote: row.healthNote,
            roomPreference: row.roomPreference,
            isBookingContact: Boolean(row.isBookingContact),
          });
        }
      }
    }

    const trips = Array.from(tripMap.values()).map((trip) => {
      const passengerCount = trip.bookings.reduce(
        (sum: number, booking: any) => {
          if (booking.passengers.length > 0) {
            return sum + booking.passengers.length;
          }

          return sum + Number(booking.adultCount || 0) + Number(booking.childCount || 0);
        },
        0
      );

      return {
        ...trip,
        bookingCount: trip.bookings.length,
        passengerCount,
      };
    });

    return ok(serialize(trips), "Lấy danh sách khách thành công");
  } catch (error) {
    console.error("GET /api/guide/passengers error:", error);
    return fail("Không thể lấy danh sách khách", 500);
  }
}