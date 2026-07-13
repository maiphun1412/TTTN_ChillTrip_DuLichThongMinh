import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const bookingId = Number(id);

    if (!bookingId) {
      return NextResponse.json(
        { success: false, message: "ID đặt chỗ không hợp lệ" },
        { status: 400 }
      );
    }

    await prisma.$executeRawUnsafe(`
      UPDATE bookings
      SET
        booking_status = 'CONFIRMED',
        confirmed_at = GETDATE()
      WHERE id = ${bookingId}
        AND booking_status = 'PENDING'
    `);

    return NextResponse.json({
      success: true,
      message: "Xác nhận đặt chỗ thành công",
    });
  } catch (error) {
    console.error("CONFIRM_BOOKING_ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Không xác nhận được đặt chỗ" },
      { status: 500 }
    );
  }
}