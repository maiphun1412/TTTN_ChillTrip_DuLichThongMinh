import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAccessToken } from "@/lib/auth";
import { createPendingPointsForBooking } from "@/lib/loyalty";

type CurrentUserRow = {
  id: bigint;
  roleCode: string;
};

type BookingForLoyaltyRow = {
  id: bigint;
  customer_id: bigint;
  total_payable_amount: number;
  booking_status: string;
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
        { success: false, message: "Bạn không có quyền ghi nhận thanh toán" },
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

    const bookingId = String(body.bookingId || "").trim();
    const amount = Number(body.amount || 0);
    const paymentMethod = String(body.paymentMethod || "BANK_TRANSFER").trim();

    const transactionCode = body.transactionCode
      ? String(body.transactionCode).trim()
      : null;

    const proofUrl = body.proofUrl ? String(body.proofUrl).trim() : null;
    const paidAt = body.paidAt ? String(body.paidAt) : null;

    if (!bookingId || bookingId === "undefined") {
      return NextResponse.json(
        { success: false, message: "Thiếu booking cần ghi nhận thanh toán" },
        { status: 400 }
      );
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, message: "Số tiền thanh toán phải lớn hơn 0" },
        { status: 400 }
      );
    }

    const bookingBigIntId = BigInt(bookingId);
    const paymentCode = `PAY${Date.now()}`;

    const rows = await prisma.$queryRaw<{ id: bigint }[]>`
      INSERT INTO payments (
        booking_id,
        payment_code,
        payment_method,
        amount,
        payment_status,
        transaction_code,
        proof_url,
        paid_at,
        created_at,
        created_by
      )
      OUTPUT INSERTED.id
      VALUES (
        ${bookingBigIntId},
        ${paymentCode},
        ${paymentMethod},
        ${amount},
        'PAID',
        ${transactionCode},
        ${proofUrl},
        ${paidAt ? paidAt : null},
        GETDATE(),
        ${auth.user!.id}
      )
    `;

    await prisma.$executeRaw`
      UPDATE debts
      SET
        paid_amount = paid_amount + ${amount},
        remaining_amount =
          CASE
            WHEN remaining_amount - ${amount} < 0 THEN 0
            ELSE remaining_amount - ${amount}
          END,
        debt_status =
          CASE
            WHEN remaining_amount - ${amount} <= 0 THEN 'PAID'
            ELSE 'PARTIALLY_PAID'
          END,
        updated_at = GETDATE()
      WHERE booking_id = ${bookingBigIntId}
    `;

    await prisma.$executeRaw`
      UPDATE bookings
      SET
        booking_status =
          CASE
            WHEN total_payable_amount <= (
              SELECT COALESCE(SUM(amount), 0)
              FROM payments
              WHERE booking_id = ${bookingBigIntId}
                AND payment_status = 'PAID'
            )
            THEN 'PAID'
            ELSE booking_status
          END,
        updated_by = ${auth.user!.id}
      WHERE id = ${bookingBigIntId}
    `;

    const bookingRows = await prisma.$queryRaw<BookingForLoyaltyRow[]>`
      SELECT
        id,
        customer_id,
        total_payable_amount,
        booking_status
      FROM bookings
      WHERE id = ${bookingBigIntId}
    `;

    const booking = bookingRows[0];
    let pendingPoints = 0;

    if (booking && booking.booking_status === "PAID") {
      const loyaltyResult = await createPendingPointsForBooking({
        customerId: booking.customer_id,
        bookingId: booking.id,
        amount: booking.total_payable_amount,
      });

      pendingPoints = Number((loyaltyResult as any)?.points || 0);
    }

    return NextResponse.json({
      success: true,
      message:
        pendingPoints > 0
          ? `Ghi nhận thanh toán thành công. Khách hàng có ${pendingPoints} điểm chờ xác nhận.`
          : "Ghi nhận thanh toán thành công",
      data: {
        paymentId: rows[0].id.toString(),
        paymentCode,
        pendingPoints,
      },
    });
  } catch (error) {
    console.error("POST /api/staff/payment-record error:", error);

    return NextResponse.json(
      { success: false, message: "Không ghi nhận được thanh toán" },
      { status: 500 }
    );
  }
}