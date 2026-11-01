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

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authCheck = await verifyGuideAccess(req);

  if (!authCheck.ok) {
    await recordGuideAuditLog(req, {
      module: "GUIDE_TRIP",
      action: "CREATE_INCIDENT_DENIED",
      entityName: "departure_schedules",
      newData: { reason: authCheck.reason },
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

    const body = await req.json();

    const issueType = String(body?.issueType || "OTHER").trim();
    const rawTitle = String(body?.title || "").trim();
    const rawDescription = String(body?.description || "").trim();
    const severity = String(body?.severity || "NORMAL").trim();

    if (!rawTitle) {
      return fail("Vui lòng nhập tiêu đề vấn đề", 400);
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
        module: "GUIDE_TRIP",
        action: "CREATE_INCIDENT_DENIED",
        entityName: "departure_schedules",
        newData: { reason: "GUIDE_NOT_ASSIGNED" },
      });
      return fail("Không tìm thấy tour được phân công", 404);
    }

    const departureId = ownership.departureId;
    const safeTitle = redactSensitiveNotes(rawTitle) ?? rawTitle;
    const safeDescription = redactSensitiveNotes(rawDescription) ?? "";

    const typeTextMap: Record<string, string> = {
      CUSTOMER: "Khách hàng",
      TRANSPORT: "Phương tiện",
      HOTEL: "Khách sạn",
      ITINERARY: "Lịch trình",
      PAYMENT: "Thanh toán",
      OTHER: "Khác",
    };

    const severityTextMap: Record<string, string> = {
      LOW: "Thấp",
      NORMAL: "Bình thường",
      HIGH: "Cao",
      URGENT: "Khẩn cấp",
    };

    const content = [
      `Loại vấn đề: ${typeTextMap[issueType] || issueType}`,
      `Mức độ: ${severityTextMap[severity] || severity}`,
      `Tiêu đề: ${safeTitle}`,
      safeDescription ? `Mô tả: ${safeDescription}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const inserted: any[] = await prisma.$queryRaw`
      INSERT INTO departure_operation_logs (
        departure_id,
        log_type,
        content,
        created_by
      )
      OUTPUT
        inserted.id,
        inserted.departure_id AS departureId,
        inserted.log_time AS logTime,
        inserted.log_type AS logType,
        inserted.content,
        inserted.created_by AS createdBy
      VALUES (
        ${departureId},
        'INCIDENT',
        ${content},
        ${guideUserId}
      )
    `;

    await recordGuideAuditLog(req, {
      actorUserId: guideUserId,
      module: "GUIDE_TRIP",
      action: "CREATE_INCIDENT",
      entityName: "departure_schedules",
      entityId: departureId,
      newData: {
        issueType,
        severity,
      },
    });

    const row = inserted[0];
    return ok(
      serialize({
        id: row?.id,
        departureId: row?.departureId,
        logTime: row?.logTime,
        logType: row?.logType,
        content: redactSensitiveNotes(row?.content) ?? "",
        createdBy: row?.createdBy,
      }),
      "Đã gửi báo cáo vấn đề phát sinh"
    );
  } catch (error) {
    console.error("POST /api/guide/trips/[id]/incidents error:", error);
    return fail("Không thể gửi báo cáo vấn đề phát sinh", 500);
  }
}
