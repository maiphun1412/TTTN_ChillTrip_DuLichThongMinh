import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail } from "@/lib/api-response";
import { requireRole } from "@/lib/permissions";

function serialize(data: any) {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(req, ["ADMIN"]);
  if (!auth.ok) {
    return fail(
      auth.reason === "UNAUTHORIZED" ? "Chưa đăng nhập" : "Không có quyền",
      auth.reason === "UNAUTHORIZED" ? 401 : 403
    );
  }

  try {
    const { id } = await context.params;
    const customerId = Number(id);

    if (!customerId) {
      return NextResponse.json(
        { success: false, message: "ID khách hàng không hợp lệ" },
        { status: 400 }
      );
    }

    const messages = await prisma.$queryRaw`
      SELECT
        id,
        customer_id,
        sender_type,
        message_content,
        is_read,
        created_at
      FROM customer_messages
      WHERE customer_id = ${customerId}
      ORDER BY created_at ASC
    `;

    return NextResponse.json({
      success: true,
      data: serialize(messages),
    });
  } catch (error) {
    console.error("GET_CUSTOMER_MESSAGES_ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Không lấy được tin nhắn" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(req, ["ADMIN"]);
  if (!auth.ok) {
    return fail(
      auth.reason === "UNAUTHORIZED" ? "Chưa đăng nhập" : "Không có quyền",
      auth.reason === "UNAUTHORIZED" ? 401 : 403
    );
  }

  try {
    const { id } = await context.params;
    const customerId = Number(id);
    const body = await req.json();

    const content = String(body.content || "").trim();

    if (!customerId) {
      return NextResponse.json(
        { success: false, message: "ID khách hàng không hợp lệ" },
        { status: 400 }
      );
    }

    if (!content) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập nội dung tin nhắn" },
        { status: 400 }
      );
    }

    const created = await prisma.$queryRaw`
      INSERT INTO customer_messages (
        customer_id,
        sender_type,
        message_content,
        is_read,
        created_at
      )
      OUTPUT INSERTED.*
      VALUES (
        ${customerId},
        'ADMIN',
        ${content},
        1,
        GETDATE()
      )
    `;

    return NextResponse.json({
      success: true,
      message: "Gửi tin nhắn thành công",
      data: serialize(created),
    });
  } catch (error) {
    console.error("SEND_CUSTOMER_MESSAGE_ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Không gửi được tin nhắn" },
      { status: 500 }
    );
  }
}