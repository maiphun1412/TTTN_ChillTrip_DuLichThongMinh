import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAccessToken } from "@/lib/auth";

type CurrentUserRow = {
  id: bigint;
  roleCode: string;
};

type DebtRow = {
  id: bigint;
  bookingCode: string;
  customerId: bigint;
  userId: bigint | null;
  customerName: string;
  customerEmail: string | null;
  remainingAmount: number;
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
        { success: false, message: "Bạn không có quyền nhắc nợ" },
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id || id === "undefined") {
      return NextResponse.json(
        { success: false, message: "Thiếu mã công nợ cần nhắc" },
        { status: 400 }
      );
    }

    const rows = await prisma.$queryRaw<DebtRow[]>`
      SELECT TOP 1
        d.id,
        b.booking_code AS bookingCode,
        c.id AS customerId,
        c.user_id AS userId,
        c.full_name AS customerName,
        c.email AS customerEmail,
        d.remaining_amount AS remainingAmount
      FROM debts d
      INNER JOIN bookings b ON b.id = d.booking_id
      INNER JOIN customers c ON c.id = d.customer_id
      WHERE d.id = ${BigInt(id)}
    `;

    const debt = rows[0];

    if (!debt) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy công nợ" },
        { status: 404 }
      );
    }

    const title = `Nhắc thanh toán booking ${debt.bookingCode}`;
    const content = `ChillTrip xin nhắc quý khách còn công nợ ${Number(
      debt.remainingAmount
    ).toLocaleString("vi-VN")}đ cho booking ${debt.bookingCode}. Vui lòng thanh toán để hoàn tất đơn đặt tour.`;

    if (debt.userId) {
      await prisma.$executeRaw`
        INSERT INTO notifications (
          user_id,
          title,
          content,
          notification_type,
          is_read,
          created_at
        )
        VALUES (
          ${debt.userId},
          ${title},
          ${content},
          'DEBT_REMINDER',
          0,
          GETDATE()
        )
      `;
    }

    if (debt.customerEmail) {
      await prisma.$executeRaw`
        INSERT INTO email_logs (
          customer_id,
          recipient_email,
          subject,
          body,
          send_status,
          created_at
        )
        VALUES (
          ${debt.customerId},
          ${debt.customerEmail},
          ${title},
          ${content},
          'PENDING',
          GETDATE()
        )
      `;
    }

    return NextResponse.json({
      success: true,
      message: "Đã tạo thông báo nhắc nợ",
      data: {
        sent: true,
      },
    });
  } catch (error) {
    console.error("POST /api/staff/debt-remind error:", error);

    return NextResponse.json(
      { success: false, message: "Không nhắc nợ được" },
      { status: 500 }
    );
  }
}