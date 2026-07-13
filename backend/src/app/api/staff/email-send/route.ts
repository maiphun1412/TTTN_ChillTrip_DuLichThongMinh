import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAccessToken } from "@/lib/auth";

type CurrentUserRow = {
  id: bigint;
  roleCode: string;
};

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  return authHeader.replace("Bearer ", "");
}

async function getCurrentStaff(request: NextRequest) {
  const token = getBearerToken(request);

  if (!token) {
    return {
      error: NextResponse.json(
        { success: false, message: "Chưa đăng nhập" },
        { status: 401 }
      ),
      user: null,
    };
  }

  const payload = verifyAccessToken(token);

  if (!payload?.userId) {
    return {
      error: NextResponse.json(
        { success: false, message: "Token không hợp lệ" },
        { status: 401 }
      ),
      user: null,
    };
  }

  const users = await prisma.$queryRaw<CurrentUserRow[]>`
    SELECT u.id, r.code AS roleCode
    FROM users u
    INNER JOIN roles r ON r.id = u.role_id
    WHERE u.id = ${BigInt(payload.userId)}
  `;

  const user = users[0];

  if (!user) {
    return {
      error: NextResponse.json(
        { success: false, message: "Không tìm thấy người dùng" },
        { status: 404 }
      ),
      user: null,
    };
  }

  if (user.roleCode !== "STAFF" && user.roleCode !== "ADMIN") {
    return {
      error: NextResponse.json(
        { success: false, message: "Bạn không có quyền gửi email" },
        { status: 403 }
      ),
      user: null,
    };
  }

  return { error: null, user };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getCurrentStaff(request);
    if (auth.error) return auth.error;

    const body = await request.json();

    const customerId = body.customerId ? String(body.customerId) : "";
    const bookingId = body.bookingId ? String(body.bookingId) : "";
    const recipientEmail = String(body.recipientEmail || "").trim();
    const subject = String(body.subject || "").trim();
    const content = String(body.body || "").trim();

    if (!recipientEmail) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập email người nhận" },
        { status: 400 }
      );
    }

    if (!subject) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập tiêu đề email" },
        { status: 400 }
      );
    }

    if (!content) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập nội dung email" },
        { status: 400 }
      );
    }

    const rows = await prisma.$queryRaw<{ id: bigint }[]>`
      INSERT INTO email_logs (
        booking_id,
        customer_id,
        recipient_email,
        subject,
        body,
        send_status,
        sent_at,
        error_message,
        created_at
      )
      OUTPUT INSERTED.id
      VALUES (
        ${bookingId ? BigInt(bookingId) : null},
        ${customerId ? BigInt(customerId) : null},
        ${recipientEmail},
        ${subject},
        ${content},
        'SENT',
        GETDATE(),
        NULL,
        GETDATE()
      )
    `;

    return NextResponse.json({
      success: true,
      message: "Đã gửi email",
      data: {
        emailId: rows[0].id.toString(),
      },
    });
  } catch (error) {
    console.error("POST /api/staff/email-send error:", error);

    return NextResponse.json(
      { success: false, message: "Không gửi được email" },
      { status: 500 }
    );
  }
}