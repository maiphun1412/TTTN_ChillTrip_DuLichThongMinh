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

function safeParseReport(content?: string | null) {
  if (!content) return null;

  try {
    return JSON.parse(content);
  } catch {
    return {
      generalSummary: content,
    };
  }
}

type RawReportRow = {
  assignmentId: bigint;
  assignmentNotes: string | null;

  departureId: bigint;
  departureCode: string;
  startDate: Date | string;
  endDate: Date | string;
  bookingStatus: string;

  tourId: bigint;
  tourCode: string;
  tourName: string;
  durationDays: number;
  durationNights: number;
  featuredImageUrl: string | null;

  destinationName: string | null;
  destinationCity: string | null;
  destinationCountry: string | null;

  bookingCount: number | null;
  passengerCount: number | null;

  reportId: bigint | null;
  reportType: string | null;
  reportContent: string | null;
  reportSubmittedAt: Date | string | null;
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

    const rows = await prisma.$queryRawUnsafe<RawReportRow[]>(
      `
        WITH booking_summary AS (
          SELECT
            departure_id,
            COUNT(id) AS bookingCount,
            COALESCE(SUM(adult_count + child_count), 0) AS passengerCount
          FROM bookings
          WHERE booking_status NOT IN ('CANCELLED')
          GROUP BY departure_id
        ),
        latest_report AS (
          SELECT *
          FROM (
            SELECT
              id,
              departure_id,
              log_type,
              content,
              log_time,
              ROW_NUMBER() OVER (
                PARTITION BY departure_id
                ORDER BY log_time DESC, id DESC
              ) AS rn
            FROM departure_operation_logs
            WHERE log_type IN ('END_TRIP_REPORT_DRAFT', 'END_TRIP_REPORT')
          ) x
          WHERE x.rn = 1
        )
        SELECT
          ga.id AS assignmentId,
          ga.notes AS assignmentNotes,

          ds.id AS departureId,
          ds.departure_code AS departureCode,
          ds.start_date AS startDate,
          ds.end_date AS endDate,
          ds.booking_status AS bookingStatus,

          t.id AS tourId,
          t.tour_code AS tourCode,
          t.tour_name AS tourName,
          t.duration_days AS durationDays,
          t.duration_nights AS durationNights,
          t.featured_image_url AS featuredImageUrl,

          d.destination_name AS destinationName,
          d.city AS destinationCity,
          d.country AS destinationCountry,

          ISNULL(bs.bookingCount, 0) AS bookingCount,
          ISNULL(bs.passengerCount, 0) AS passengerCount,

          lr.id AS reportId,
          lr.log_type AS reportType,
          lr.content AS reportContent,
          lr.log_time AS reportSubmittedAt
        FROM guide_assignments ga
        INNER JOIN departure_schedules ds ON ga.departure_id = ds.id
        INNER JOIN tours t ON ds.tour_id = t.id
        LEFT JOIN destinations d ON t.destination_id = d.id
        LEFT JOIN booking_summary bs ON bs.departure_id = ds.id
        LEFT JOIN latest_report lr ON lr.departure_id = ds.id
        WHERE ga.guide_id = @P1
        ORDER BY ds.end_date DESC, ds.start_date DESC
      `,
      guideId
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const data = rows.map((row) => {
      const endDate = new Date(row.endDate);
      endDate.setHours(23, 59, 59, 999);

      const isEnded =
        !Number.isNaN(endDate.getTime()) && endDate.getTime() < today.getTime();

      const reportStatus =
        row.reportType === "END_TRIP_REPORT"
          ? "SUBMITTED"
          : row.reportType === "END_TRIP_REPORT_DRAFT"
            ? "DRAFT"
            : "MISSING";

      return {
        assignmentId: String(row.assignmentId),
        assignmentNotes: row.assignmentNotes,

        departureId: String(row.departureId),
        departureCode: row.departureCode,
        startDate: row.startDate,
        endDate: row.endDate,
        bookingStatus: row.bookingStatus,

        tourId: String(row.tourId),
        tourCode: row.tourCode,
        tourName: row.tourName,
        durationDays: row.durationDays,
        durationNights: row.durationNights,
        featuredImageUrl: row.featuredImageUrl,

        destinationName: row.destinationName,
        destinationCity: row.destinationCity,
        destinationCountry: row.destinationCountry,

        bookingCount: Number(row.bookingCount || 0),
        passengerCount: Number(row.passengerCount || 0),

        isEnded,
        mustReport: isEnded && reportStatus !== "SUBMITTED",

        reportId: row.reportId ? String(row.reportId) : null,
        reportStatus,
        reportSubmittedAt: row.reportSubmittedAt,
        report: safeParseReport(row.reportContent),
      };
    });

    return ok(serialize(data), "Lấy danh sách báo cáo kết thúc chuyến thành công");
  } catch (error) {
    console.error("GET /api/guide/reports error:", error);
    return fail("Không thể lấy danh sách báo cáo kết thúc chuyến", 500);
  }
}

export async function POST(req: NextRequest) {
  const guideAuth = await requireGuide(req);

  if (!guideAuth) {
    return fail("Bạn không có quyền truy cập khu vực hướng dẫn viên", 403);
  }

  try {
    const body = await req.json();

    const assignmentId = Number(body.assignmentId);
    const status = String(body.status || "DRAFT").toUpperCase();
    const report = body.report || {};

    if (!assignmentId || Number.isNaN(assignmentId)) {
      return fail("Thiếu ID phân công chuyến đi", 400);
    }

    const assignmentRows: any[] = await prisma.$queryRawUnsafe(
      `
        SELECT
          ga.id AS assignmentId,
          ga.departure_id AS departureId,
          ds.end_date AS endDate
        FROM guide_assignments ga
        INNER JOIN departure_schedules ds ON ga.departure_id = ds.id
        WHERE ga.id = @P1
          AND ga.guide_id = @P2
      `,
      assignmentId,
      Number(guideAuth.guideId)
    );

    if (!assignmentRows.length) {
      return fail("Không tìm thấy chuyến được phân công", 404);
    }

    const departureId = Number(assignmentRows[0].departureId);

    const logType =
      status === "SUBMITTED" ? "END_TRIP_REPORT" : "END_TRIP_REPORT_DRAFT";

    await prisma.$executeRawUnsafe(
      `
        INSERT INTO departure_operation_logs (
          departure_id,
          log_type,
          content,
          created_by
        )
        VALUES (
          @P1,
          @P2,
          @P3,
          @P4
        )
      `,
      departureId,
      logType,
      JSON.stringify(report),
      Number(guideAuth.userId)
    );

    return ok(
      null,
      status === "SUBMITTED"
        ? "Đã gửi báo cáo kết thúc chuyến"
        : "Đã lưu bản nháp báo cáo"
    );
  } catch (error) {
    console.error("POST /api/guide/reports error:", error);
    return fail("Không thể lưu báo cáo kết thúc chuyến", 500);
  }
}