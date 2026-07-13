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

    const trips = await prisma.$queryRawUnsafe(
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
          dope.updated_at AS operationUpdatedAt,

          t.id AS tourId,
          t.tour_code AS tourCode,
          t.tour_name AS tourName,
          t.tour_type AS tourType,
          t.duration_days AS durationDays,
          t.duration_nights AS durationNights,
          t.featured_image_url AS featuredImageUrl,
          t.short_description AS shortDescription,

          d.destination_name AS destinationName,
          d.city AS destinationCity,
          d.country AS destinationCountry,

          COUNT(DISTINCT b.id) AS bookingCount,
          COALESCE(SUM(b.adult_count + b.child_count), 0) AS passengerCount
        FROM guide_assignments ga
        INNER JOIN departure_schedules ds ON ga.departure_id = ds.id
        INNER JOIN tours t ON ds.tour_id = t.id
        LEFT JOIN destinations d ON t.destination_id = d.id
        LEFT JOIN departure_operations dope ON dope.departure_id = ds.id
        LEFT JOIN bookings b ON b.departure_id = ds.id
          AND b.booking_status NOT IN ('CANCELLED')
        WHERE ga.guide_id = @P1
        GROUP BY
          ga.id,
          ga.assigned_at,
          ga.notes,
          ds.id,
          ds.departure_code,
          ds.start_date,
          ds.end_date,
          ds.max_seats,
          ds.available_seats,
          ds.booked_seats,
          ds.booking_status,
          dope.operation_status,
          dope.updated_at,
          t.id,
          t.tour_code,
          t.tour_name,
          t.tour_type,
          t.duration_days,
          t.duration_nights,
          t.featured_image_url,
          t.short_description,
          d.destination_name,
          d.city,
          d.country
        ORDER BY ds.start_date ASC
      `,
      guideId
    );

    return ok(serialize(trips), "Lấy lịch tour được phân công thành công");
  } catch (error) {
    console.error("GET /api/guide/trips error:", error);
    return fail("Không thể lấy lịch tour được phân công", 500);
  }
}