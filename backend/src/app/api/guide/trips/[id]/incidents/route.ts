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

export async function POST(
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

    const issueType = String(body.issueType || "OTHER").trim();
    const title = String(body.title || "").trim();
    const description = String(body.description || "").trim();
    const severity = String(body.severity || "NORMAL").trim();

    if (!title) {
      return fail("Vui lòng nhập tiêu đề vấn đề", 400);
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
      `Tiêu đề: ${title}`,
      description ? `Mô tả: ${description}` : "",
    ]
      .filter(Boolean)
      .join("\n");

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
          'INCIDENT',
          @P2,
          @P3
        )
      `,
      departureId,
      content,
      BigInt(guideAuth.userId)
    );

    return ok(serialize(inserted[0]), "Đã gửi báo cáo vấn đề phát sinh");
  } catch (error) {
    console.error("POST /api/guide/trips/[id]/incidents error:", error);
    return fail("Không thể gửi báo cáo vấn đề phát sinh", 500);
  }
}