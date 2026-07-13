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

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const guideAuth = await requireGuide(req);

  if (!guideAuth) {
    return fail("Bạn không có quyền truy cập khu vực hướng dẫn viên", 403);
  }

  try {
    const { id } = await context.params;
    const assignmentId = Number(id);

    if (!assignmentId || Number.isNaN(assignmentId)) {
      return fail("ID phân công không hợp lệ", 400);
    }

    const assignmentRows: any[] = await prisma.$queryRawUnsafe(
      `
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
        WHERE ga.id = @P1
          AND ga.guide_id = @P2
      `,
      BigInt(assignmentId),
      BigInt(guideAuth.guideId)
    );

    if (!assignmentRows.length) {
      return fail("Không tìm thấy tour được phân công", 404);
    }

    const assignment = assignmentRows[0];

    const passengers = await prisma.$queryRawUnsafe(
      `
        SELECT
          bp.id,
          bp.booking_id AS bookingId,
          b.booking_code AS bookingCode,
          b.booking_status AS bookingStatus,

          bp.passenger_type AS passengerType,
          bp.full_name AS fullName,
          bp.gender,
          bp.date_of_birth AS dateOfBirth,
          bp.phone,
          bp.email,
          bp.id_number AS idNumber,
          bp.passport_number AS passportNumber,
          bp.nationality,
          bp.emergency_contact_name AS emergencyContactName,
          bp.emergency_contact_phone AS emergencyContactPhone,
          bp.meal_note AS mealNote,
          bp.health_note AS healthNote,
          bp.room_preference AS roomPreference,
          bp.is_booking_contact AS isBookingContact,

          b.contact_name AS contactName,
          b.contact_phone AS contactPhone,
          b.contact_email AS contactEmail,
          b.special_notes AS specialNotes
        FROM booking_passengers bp
        INNER JOIN bookings b ON bp.booking_id = b.id
        WHERE b.departure_id = @P1
          AND b.booking_status NOT IN ('CANCELLED')
        ORDER BY b.id ASC, bp.id ASC
      `,
      BigInt(assignment.departureId)
    );

    const pickupPoints = await prisma.$queryRawUnsafe(
      `
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
        WHERE pp.departure_id = @P1
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
      `,
      BigInt(assignment.departureId)
    );

    const itineraryDays = await prisma.$queryRawUnsafe(
      `
        SELECT
          itd.id,
          itd.day_no AS dayNo,
          itd.title,
          itd.description,
          itd.overnight_location AS overnightLocation
        FROM itinerary_days itd
        INNER JOIN itineraries i ON itd.itinerary_id = i.id
        WHERE i.tour_id = @P1
          AND i.is_active = 1
        ORDER BY itd.day_no ASC
      `,
      BigInt(assignment.tourId)
    );

    const activities = await prisma.$queryRawUnsafe(
      `
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
        WHERE i.tour_id = @P1
          AND i.is_active = 1
        ORDER BY itd.day_no ASC, ia.sort_order ASC, ia.id ASC
      `,
      BigInt(assignment.tourId)
    );

    const logs = await prisma.$queryRawUnsafe(
      `
        SELECT
          id,
          log_time AS logTime,
          log_type AS logType,
          content,
          created_by AS createdBy
        FROM departure_operation_logs
        WHERE departure_id = @P1
        ORDER BY log_time DESC
      `,
      BigInt(assignment.departureId)
    );

    return ok(
      serialize({
        assignment,
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