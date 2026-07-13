import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPaymentUrl } from "@/lib/vnpay";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const paymentId = Number(body.paymentId);

    if (!paymentId || Number.isNaN(paymentId)) {
      return NextResponse.json(
        { message: "Thiếu mã thanh toán" },
        { status: 400 }
      );
    }

    const payment = await prisma.payments.findUnique({
      where: {
        id: BigInt(paymentId),
      },
      include: {
        bookings: true,
      },
    });

    if (!payment) {
      return NextResponse.json(
        { message: "Không tìm thấy thanh toán" },
        { status: 404 }
      );
    }

    if (payment.payment_method !== "VNPAY") {
      return NextResponse.json(
        { message: "Thanh toán này không phải VNPay" },
        { status: 400 }
      );
    }

    const paymentUrl = createPaymentUrl({
      amount: Number(payment.amount),
      txnRef: payment.payment_code || `PAY${payment.id.toString()}`,
      orderInfo: `Thanh toán booking ${
        payment.bookings?.booking_code || payment.booking_id.toString()
      }`,
    });

    return NextResponse.json({
      paymentUrl,
      paymentId: payment.id.toString(),
      paymentCode: payment.payment_code,
      amount: Number(payment.amount),
    });
  } catch (error) {
    console.error("POST /api/payments/vnpay/create error:", error);

    return NextResponse.json(
      { message: "Không thể tạo link thanh toán VNPay" },
      { status: 500 }
    );
  }
}