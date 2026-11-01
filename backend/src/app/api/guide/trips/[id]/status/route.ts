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

const ALLOWED_STATUS = [
  "PREPARING",
  "CONFIRMED",
  "PICKING_UP",
  "ON_TOUR",
  "COMPLETED",
  "CANCELLED",
];

function serialize<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authCheck = await verifyGuideAccess(req);

  if (!authCheck.ok) {
    await recordGuideAuditLog(req, {
      module: "GUIDE_TRIP",
      action: "UPDATE_STATUS_DENIED",
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

    const operationStatus = String(body?.operationStatus || "").trim();
    const rawNote = String(body?.note || "").trim();
    const safeNote = redactSensitiveNotes(rawNote) ?? "";

    if (!ALLOWED_STATUS.includes(operationStatus)) {
      return fail("Trạng thái chuyến đi không hợp lệ", 400);
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
        action: "UPDATE_STATUS_DENIED",
        entityName: "departure_schedules",
        newData: { reason: "GUIDE_NOT_ASSIGNED" },
      });
      return fail("Không tìm thấy tour được phân công", 404);
    }

    const departureId = ownership.departureId;
    const oldStatus = ownership.operationStatus ?? "PREPARING";

    await prisma.$executeRaw`
      IF EXISTS (SELECT 1 FROM departure_operations WHERE departure_id = ${departureId})
      BEGIN
        UPDATE departure_operations
        SET
          operation_status = ${operationStatus},
          notes = ${safeNote || null},
          updated_at = GETDATE()
        WHERE departure_id = ${departureId}
      END
      ELSE
      BEGIN
        INSERT INTO departure_operations (
          departure_id,
          operation_status,
          notes,
          updated_at
        )
        VALUES (
          ${departureId},
          ${operationStatus},
          ${safeNote || null},
          GETDATE()
        )
      END
    `;

    const statusTextMap: Record<string, string> = {
      PREPARING: "Đang chuẩn bị",
      CONFIRMED: "Đã xác nhận",
      PICKING_UP: "Đang đón khách",
      ON_TOUR: "Đang đi tour",
      COMPLETED: "Hoàn thành",
      CANCELLED: "Đã hủy",
    };

    const content = safeNote
      ? `Cập nhật trạng thái: ${
          statusTextMap[operationStatus] || operationStatus
        }. Ghi chú: ${safeNote}`
      : `Cập nhật trạng thái: ${
          statusTextMap[operationStatus] || operationStatus
        }`;

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
        'STATUS',
        ${content},
        ${guideUserId}
      )
    `;

    await recordGuideAuditLog(req, {
      actorUserId: guideUserId,
      module: "GUIDE_TRIP",
      action: "UPDATE_STATUS",
      entityName: "departure_schedules",
      entityId: departureId,
      oldData: { status: oldStatus },
      newData: {
        status: operationStatus,
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
      "Cập nhật tình trạng chuyến đi thành công"
    );
  } catch (error) {
    console.error("PATCH /api/guide/trips/[id]/status error:", error);
    return fail("Không thể cập nhật tình trạng chuyến đi", 500);
  }
}
