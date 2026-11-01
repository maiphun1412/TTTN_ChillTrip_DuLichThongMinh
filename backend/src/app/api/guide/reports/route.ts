import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api-response";
import { verifyGuideAccess } from "@/lib/guide-auth";
import {
  checkGuideAssignmentOwnership,
  parseAssignmentId,
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

function sanitizeReportObject(value: unknown): unknown {
  if (typeof value === "string") {
    return redactSensitiveNotes(value) ?? value;
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeReportObject);
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = sanitizeReportObject(v);
    }
    return out;
  }
  return value;
}

function safeParseReport(content?: string | null) {
  if (!content) return null;

  try {
    return sanitizeReportObject(JSON.parse(content));
  } catch {
    return {
      generalSummary: redactSensitiveNotes(content) ?? content,
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
  const authCheck = await verifyGuideAccess(req);

  if (!authCheck.ok) {
    return fail(authCheck.message, authCheck.status);
  }

  try {
    const guideId = BigInt(authCheck.guide.guideId);

    const rows = await prisma.$queryRaw<RawReportRow[]>`
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
        SELECT
          x.id,
          x.departure_id,
          x.log_type,
          x.content,
          x.log_time
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
      WHERE ga.guide_id = ${guideId}
        AND ds.guide_id IS NOT NULL
        AND ds.guide_id = ga.guide_id
      ORDER BY ds.end_date DESC, ds.start_date DESC
    `;

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
        assignmentNotes: redactSensitiveNotes(row.assignmentNotes),

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

    return ok(
      serialize(data),
      "Lấy danh sách báo cáo kết thúc chuyến thành công"
    );
  } catch (error) {
    console.error("GET /api/guide/reports error:", error);
    return fail("Không thể lấy danh sách báo cáo kết thúc chuyến", 500);
  }
}

export async function POST(req: NextRequest) {
  const authCheck = await verifyGuideAccess(req);

  if (!authCheck.ok) {
    await recordGuideAuditLog(req, {
      module: "GUIDE_REPORT",
      action: "SUBMIT_REPORT_DENIED",
      entityName: "departure_schedules",
      newData: { reason: authCheck.reason },
    });
    return fail(authCheck.message, authCheck.status);
  }

  const guideId = BigInt(authCheck.guide.guideId);
  const guideUserId = BigInt(authCheck.guide.userId);

  try {
    const body = await req.json();

    const assignmentId = parseAssignmentId(body?.assignmentId);
    const status = String(body?.status || "DRAFT").toUpperCase();
    const rawReport = body?.report || {};

    if (assignmentId === null) {
      return fail("Thiếu hoặc sai định dạng ID phân công chuyến đi", 400);
    }

    const ownership = await checkGuideAssignmentOwnership(
      assignmentId,
      guideId
    );

    if (
      ownership.status === "NOT_FOUND" ||
      ownership.status === "FORBIDDEN_NOT_ASSIGNED"
    ) {
      await recordGuideAuditLog(req, {
        actorUserId: guideUserId,
        module: "GUIDE_REPORT",
        action: "SUBMIT_REPORT_DENIED",
        entityName: "departure_schedules",
        newData: { reason: "GUIDE_NOT_ASSIGNED" },
      });
      return fail("Không tìm thấy chuyến được phân công", 404);
    }

    const departureId = ownership.departureId;
    const safeReport = sanitizeReportObject(rawReport);

    const logType =
      status === "SUBMITTED" ? "END_TRIP_REPORT" : "END_TRIP_REPORT_DRAFT";

    await prisma.$executeRaw`
      INSERT INTO departure_operation_logs (
        departure_id,
        log_type,
        content,
        created_by
      )
      VALUES (
        ${departureId},
        ${logType},
        ${JSON.stringify(safeReport)},
        ${guideUserId}
      )
    `;

    await recordGuideAuditLog(req, {
      actorUserId: guideUserId,
      module: "GUIDE_REPORT",
      action: status === "SUBMITTED" ? "SUBMIT_REPORT" : "SAVE_REPORT_DRAFT",
      entityName: "departure_schedules",
      entityId: departureId,
      newData: { status },
    });

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
