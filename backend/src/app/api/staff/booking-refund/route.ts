import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAccessToken } from "@/lib/auth";

type CurrentUserRow = {
  id: bigint;
  roleCode: string;
};

type BookingMoneyRow = {
  id: bigint;
  paidAmount: number | string | null;
};

type InsertedIdRow = {
  id: bigint;
};

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.replace("Bearer ", "");
}

function toNumber(value: unknown) {
  if (value === null || value === undefined) return 0;
  return Number(value);
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
        { success: false, message: "Bạn không có quyền xử lý hoàn tiền" },
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
        { success: false, message: "Thiếu mã đặt chỗ cần hoàn tiền" },
        { status: 400 }
      );
    }

    const bookingId = BigInt(id);

    const bookingRows = await prisma.$queryRaw<BookingMoneyRow[]>`
      SELECT
        b.id,
        COALESCE((
          SELECT SUM(p.amount)
          FROM payments p
          WHERE p.booking_id = b.id
            AND p.payment_status = 'PAID'
        ), 0) AS paidAmount
      FROM bookings b
      WHERE b.id = ${bookingId}
    `;

    const booking = bookingRows[0];

    if (!booking) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy đặt chỗ" },
        { status: 404 }
      );
    }

    const paidAmount = toNumber(booking.paidAmount);

    if (paidAmount <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Booking này chưa có thanh toán, không thể tạo hoàn tiền",
        },
        { status: 400 }
      );
    }

    const existedRefund = await prisma.$queryRaw<{ refund_code: string }[]>`
      SELECT TOP 1 refund_code
      FROM refunds
      WHERE booking_id = ${bookingId}
        AND refund_status = 'PENDING'
      ORDER BY id DESC
    `;

    if (existedRefund[0]) {
      return NextResponse.json({
        success: true,
        message: "Booking đã có yêu cầu hoàn tiền đang chờ xử lý",
        data: {
          refundCode: existedRefund[0].refund_code,
        },
      });
    }

    const requestRows = await prisma.$queryRaw<InsertedIdRow[]>`
      INSERT INTO cancellation_requests (
        booking_id,
        requested_by,
        reason,
        request_status,
        requested_at
      )
      OUTPUT INSERTED.id
      VALUES (
        ${bookingId},
        ${auth.user!.id},
        N'Nhân viên tạo yêu cầu hoàn tiền từ màn hình đặt chỗ',
        'PENDING',
        GETDATE()
      )
    `;

    const cancellationRequestId = requestRows[0].id;
    const refundCode = `REF${Date.now()}`;

    await prisma.$executeRaw`
      INSERT INTO refunds (
        booking_id,
        cancellation_request_id,
        refund_code,
        refund_amount,
        cancellation_fee_amount,
        refund_status,
        refund_method,
        created_at
      )
      VALUES (
        ${bookingId},
        ${cancellationRequestId},
        ${refundCode},
        ${paidAmount},
        0,
        'PENDING',
        N'Chuyển khoản',
        GETDATE()
      )
    `;

    return NextResponse.json({
      success: true,
      message: "Đã tạo yêu cầu hoàn tiền",
      data: {
        refundCode,
      },
    });
  } catch (error) {
    console.error("POST /api/staff/booking-refund error:", error);

    return NextResponse.json(
      { success: false, message: "Không tạo được yêu cầu hoàn tiền" },
      { status: 500 }
    );
  }
}