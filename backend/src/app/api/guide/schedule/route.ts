import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api-response";
import { verifyGuideAccess } from "@/lib/guide-auth";
import {
  checkGuideDepartureOwnership,
  parsePositiveBigInt,
  recordGuideAuditLog,
  redactSensitiveNotes,
} from "@/lib/guide-privacy";

function serialize<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

type RawScheduleRow = {
  assignmentId: bigint;
  assignmentNotes: string | null;

  departureId: bigint;
  departureCode: string;
  startDate: Date | string;
  endDate: Date | string;
  maxSeats: number;
  availableSeats: number;
  bookedSeats: number;
  bookingStatus: string;

  operationStatus: string | null;

  tourId: bigint;
  tourCode: string;
  tourName: string;
  tourType: string;
  durationDays: number;
  durationNights: number;
  featuredImageUrl: string | null;
  shortDescription: string | null;

  destinationName: string | null;
  destinationCity: string | null;
  destinationCountry: string | null;

  itineraryId: bigint | null;
  itineraryTitle: string | null;

  dayId: bigint | null;
  dayNo: number | null;
  dayTitle: string | null;
  dayDescription: string | null;
  overnightLocation: string | null;

  activityId: bigint | null;
  activityTime: string | null;
  activityTitle: string | null;
  locationName: string | null;
  activityDescription: string | null;
  sortOrder: number | null;

  passengerCount: number | null;
  bookingCount: number | null;
};

export async function GET(req: NextRequest) {
  const authCheck = await verifyGuideAccess(req);

  if (!authCheck.ok) {
    return fail(authCheck.message, authCheck.status);
  }

  try {
    const guideId = BigInt(authCheck.guide.guideId);

    const rows = await prisma.$queryRaw<RawScheduleRow[]>`
      WITH booking_summary AS (
        SELECT
          departure_id,
          COUNT(id) AS bookingCount,
          COALESCE(SUM(adult_count + child_count), 0) AS passengerCount
        FROM bookings
        WHERE booking_status NOT IN ('CANCELLED')
        GROUP BY departure_id
      )

      SELECT
        ga.id AS assignmentId,
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

        i.id AS itineraryId,
        i.title AS itineraryTitle,

        iday.id AS dayId,
        iday.day_no AS dayNo,
        iday.title AS dayTitle,
        iday.description AS dayDescription,
        iday.overnight_location AS overnightLocation,

        ia.id AS activityId,
        ia.activity_time AS activityTime,
        ia.activity_title AS activityTitle,
        ia.location_name AS locationName,
        ia.description AS activityDescription,
        ia.sort_order AS sortOrder,

        ISNULL(bs.bookingCount, 0) AS bookingCount,
        ISNULL(bs.passengerCount, 0) AS passengerCount
      FROM guide_assignments ga
      INNER JOIN departure_schedules ds ON ga.departure_id = ds.id
      INNER JOIN tours t ON ds.tour_id = t.id
      LEFT JOIN destinations d ON t.destination_id = d.id
      LEFT JOIN departure_operations dope ON dope.departure_id = ds.id
      LEFT JOIN booking_summary bs ON bs.departure_id = ds.id
      LEFT JOIN itineraries i ON i.tour_id = t.id
        AND i.is_active = 1
      LEFT JOIN itinerary_days iday ON iday.itinerary_id = i.id
      LEFT JOIN itinerary_activities ia ON ia.itinerary_day_id = iday.id
      WHERE ga.guide_id = ${guideId}
        AND ds.guide_id IS NOT NULL
        AND ds.guide_id = ga.guide_id
      ORDER BY ds.start_date ASC, iday.day_no ASC, ia.sort_order ASC, ia.id ASC
    `;

    const map = new Map<string, any>();

    for (const row of rows) {
      const assignmentId = String(row.assignmentId);

      if (!map.has(assignmentId)) {
        map.set(assignmentId, {
          assignmentId,
          assignmentNotes: redactSensitiveNotes(row.assignmentNotes),

          departureId: String(row.departureId),
          departureCode: row.departureCode,
          startDate: row.startDate,
          endDate: row.endDate,
          maxSeats: row.maxSeats,
          availableSeats: row.availableSeats,
          bookedSeats: row.bookedSeats,
          bookingStatus: row.bookingStatus,
          operationStatus: row.operationStatus || "PREPARING",

          tourId: String(row.tourId),
          tourCode: row.tourCode,
          tourName: row.tourName,
          tourType: row.tourType,
          durationDays: row.durationDays,
          durationNights: row.durationNights,
          featuredImageUrl: row.featuredImageUrl,
          shortDescription: row.shortDescription,

          destinationName: row.destinationName,
          destinationCity: row.destinationCity,
          destinationCountry: row.destinationCountry,

          itineraryId: row.itineraryId ? String(row.itineraryId) : null,
          itineraryTitle: row.itineraryTitle,

          passengerCount: Number(row.passengerCount || 0),
          bookingCount: Number(row.bookingCount || 0),

          itineraryDays: [],
        });
      }

      const trip = map.get(assignmentId);

      if (!row.dayId) continue;

      const dayId = String(row.dayId);

      let day = trip.itineraryDays.find((item: any) => item.id === dayId);

      if (!day) {
        day = {
          id: dayId,
          dayNo: Number(row.dayNo || 0),
          title: row.dayTitle,
          description: row.dayDescription,
          overnightLocation: row.overnightLocation,
          activities: [],
        };

        trip.itineraryDays.push(day);
      }

      if (row.activityId) {
        const activityId = String(row.activityId);

        const existed = day.activities.some(
          (item: any) => item.id === activityId
        );

        if (!existed) {
          day.activities.push({
            id: activityId,
            activityTime: row.activityTime,
            activityTitle: row.activityTitle,
            locationName: row.locationName,
            description: row.activityDescription,
            sortOrder: row.sortOrder,
          });
        }
      }
    }

    return ok(
      serialize(Array.from(map.values())),
      "Lấy lịch trình hướng dẫn viên thành công"
    );
  } catch (error) {
    console.error("GET /api/guide/schedule error:", error);
    return fail("Không thể lấy lịch trình hướng dẫn viên", 500);
  }
}

export async function POST(req: NextRequest) {
  const authCheck = await verifyGuideAccess(req);

  if (!authCheck.ok) {
    await recordGuideAuditLog(req, {
      module: "GUIDE_SCHEDULE",
      action: "CREATE_ITINERARY_NOTE_DENIED",
      entityName: "departure_schedules",
      newData: { reason: authCheck.reason },
    });
    return fail(authCheck.message, authCheck.status);
  }

  const guideId = BigInt(authCheck.guide.guideId);
  const guideUserId = BigInt(authCheck.guide.userId);

  try {
    const body = await req.json();

    const departureId = parsePositiveBigInt(body?.departureId);
    const dayNo = Number(body?.dayNo);
    const rawContent = String(body?.content || "").trim();

    if (departureId === null) {
      return fail("Thiếu hoặc sai định dạng departureId", 400);
    }

    if (!rawContent) {
      return fail("Vui lòng nhập nội dung ghi chú", 400);
    }

    // Chặn IDOR: xác minh departureId có thực sự được phân công còn hiệu lực cho HDV đang đăng nhập không
    const ownership = await checkGuideDepartureOwnership(departureId, guideId);

    if (
      ownership.status === "NOT_FOUND" ||
      ownership.status === "FORBIDDEN_NOT_ASSIGNED"
    ) {
      await recordGuideAuditLog(req, {
        actorUserId: guideUserId,
        module: "GUIDE_SCHEDULE",
        action: "CREATE_ITINERARY_NOTE_DENIED",
        entityName: "departure_schedules",
        newData: { reason: "GUIDE_NOT_ASSIGNED" },
      });
      // Trả 404 thống nhất để không làm lộ sự tồn tại của chuyến đi thuộc HDV khác
      return fail("Không tìm thấy chuyến đi được phân công", 404);
    }

    const safeContent = redactSensitiveNotes(rawContent) ?? rawContent;
    const formattedNote = `Ngày ${
      !Number.isNaN(dayNo) && dayNo > 0 ? dayNo : "?"
    }: ${safeContent}`;

    await prisma.$executeRaw`
      INSERT INTO departure_operation_logs (
        departure_id,
        log_type,
        content,
        created_by
      )
      VALUES (
        ${departureId},
        'ITINERARY_NOTE',
        ${formattedNote},
        ${guideUserId}
      )
    `;

    await recordGuideAuditLog(req, {
      actorUserId: guideUserId,
      module: "GUIDE_SCHEDULE",
      action: "CREATE_ITINERARY_NOTE",
      entityName: "departure_schedules",
      entityId: departureId,
      newData: {
        dayNo: !Number.isNaN(dayNo) && dayNo > 0 ? dayNo : null,
      },
    });

    return ok(null, "Đã lưu ghi chú lịch trình");
  } catch (error) {
    console.error("POST /api/guide/schedule error:", error);
    return fail("Không thể lưu ghi chú lịch trình", 500);
  }
}
