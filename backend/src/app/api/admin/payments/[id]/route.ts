import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPendingPointsForBooking } from "@/lib/loyalty";

type PaymentBookingRow = {
  payment_id: bigint;
  booking_id: bigint;
  customer_id: bigint;
  total_payable_amount: number;
  total_paid_amount: number;
};

export async function PUT(req: Request, { params }: any) {
  try {
    const { id } = params;
    const body = await req.json();

    const paymentId = Number(id);
    const status = String(body.status || "").trim().toUpperCase();

    if (!paymentId || Number.isNaN(paymentId)) {
      return NextResponse.json(
        { success: false, message: "Thiếu payment id" },
        { status: 400 }
      );
    }

    if (!status) {
      return NextResponse.json(
        { success: false, message: "Thiếu trạng thái thanh toán" },
        { status: 400 }
      );
    }

    await prisma.$executeRaw`
      UPDATE payments
      SET 
        payment_status = ${status},
        paid_at = CASE WHEN ${status} = 'PAID' THEN GETDATE() ELSE NULL END
      WHERE id = ${BigInt(paymentId)}
    `;

    let pendingPoints = 0;

    if (status === "PAID") {
      const rows = await prisma.$queryRaw<PaymentBookingRow[]>`
        SELECT
          p.id AS payment_id,
          b.id AS booking_id,
          b.customer_id,
          b.total_payable_amount,
          (
            SELECT COALESCE(SUM(p2.amount), 0)
            FROM payments p2
            WHERE p2.booking_id = b.id
              AND p2.payment_status = 'PAID'
          ) AS total_paid_amount
        FROM payments p
        INNER JOIN bookings b ON b.id = p.booking_id
        WHERE p.id = ${BigInt(paymentId)}
      `;

      const booking = rows[0];

      if (booking) {
        await prisma.$executeRaw`
          UPDATE debts
          SET
            paid_amount = ${booking.total_paid_amount},
            remaining_amount =
              CASE
                WHEN ${booking.total_payable_amount} - ${booking.total_paid_amount} < 0 THEN 0
                ELSE ${booking.total_payable_amount} - ${booking.total_paid_amount}
              END,
            debt_status =
              CASE
                WHEN ${booking.total_paid_amount} >= ${booking.total_payable_amount} THEN 'PAID'
                ELSE 'PARTIALLY_PAID'
              END,
            updated_at = GETDATE()
          WHERE booking_id = ${booking.booking_id}
        `;

        await prisma.$executeRaw`
          UPDATE bookings
          SET
            booking_status =
              CASE
                WHEN ${booking.total_paid_amount} >= ${booking.total_payable_amount} THEN 'PAID'
                ELSE booking_status
              END
          WHERE id = ${booking.booking_id}
        `;

        if (
          Number(booking.total_paid_amount) >=
          Number(booking.total_payable_amount)
        ) {
          const loyaltyResult = await createPendingPointsForBooking({
            customerId: booking.customer_id,
            bookingId: booking.booking_id,
            amount: booking.total_payable_amount,
          });

          pendingPoints = Number((loyaltyResult as any)?.points || 0);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message:
        pendingPoints > 0
          ? `Cập nhật thanh toán thành công. Khách hàng có ${pendingPoints} điểm chờ xác nhận.`
          : "Cập nhật thanh toán thành công",
      data: {
        pendingPoints,
      },
    });
  } catch (err) {
    console.error("PUT_ADMIN_PAYMENT_ERROR:", err);

    return NextResponse.json(
      { success: false, message: "Lỗi update payment" },
      { status: 500 }
    );
  }
}