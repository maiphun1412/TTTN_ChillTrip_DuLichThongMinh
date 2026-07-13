import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api-response";
import { requireGuide } from "@/lib/guide-auth";

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

    const body = await req.json();

    const operationStatus = String(body.operationStatus || "").trim();
    const note = String(body.note || "").trim();

    if (!ALLOWED_STATUS.includes(operationStatus)) {
      return fail("Trạng thái chuyến đi không hợp lệ", 400);
    }

    const rows: any[] = await prisma.$queryRawUnsafe(
      `
        SELECT
          ga.id AS assignmentId,
          ga.departure_id AS departureId
        FROM guide_assignments ga
        WHERE ga.id = @P1
          AND ga.guide_id = @P2
      `,
      BigInt(assignmentId),
      BigInt(guideAuth.guideId)
    );

    if (!rows.length) {
      return fail("Không tìm thấy tour được phân công", 404);
    }

    const departureId = BigInt(rows[0].departureId);

    await prisma.$executeRawUnsafe(
      `
        IF EXISTS (SELECT 1 FROM departure_operations WHERE departure_id = @P1)
        BEGIN
          UPDATE departure_operations
          SET
            operation_status = @P2,
            notes = @P3,
            updated_at = GETDATE()
          WHERE departure_id = @P1
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
            @P1,
            @P2,
            @P3,
            GETDATE()
          )
        END
      `,
      departureId,
      operationStatus,
      note || null
    );

    const statusTextMap: Record<string, string> = {
      PREPARING: "Đang chuẩn bị",
      CONFIRMED: "Đã xác nhận",
      PICKING_UP: "Đang đón khách",
      ON_TOUR: "Đang đi tour",
      COMPLETED: "Hoàn thành",
      CANCELLED: "Đã hủy",
    };

    const content = note
      ? `Cập nhật trạng thái: ${
          statusTextMap[operationStatus] || operationStatus
        }. Ghi chú: ${note}`
      : `Cập nhật trạng thái: ${
          statusTextMap[operationStatus] || operationStatus
        }`;

    const inserted: any[] = await prisma.$queryRawUnsafe(
      `
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
          @P1,
          'STATUS',
          @P2,
          @P3
        )
      `,
      departureId,
      content,
      BigInt(guideAuth.userId)
    );

    return ok(
      serialize(inserted[0]),
      "Cập nhật tình trạng chuyến đi thành công"
    );
  } catch (error) {
    console.error("PATCH /api/guide/trips/[id]/status error:", error);
    return fail("Không thể cập nhật tình trạng chuyến đi", 500);
  }
}