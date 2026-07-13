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
        booking_status = 'CANCELLED',
        cancelled_at = GETDATE()
      WHERE id = ${bookingId}
        AND booking_status IN ('PENDING', 'CONFIRMED')
    `);

    return NextResponse.json({
      success: true,
      message: "Hủy đặt chỗ thành công",
    });
  } catch (error) {
    console.error("CANCEL_BOOKING_ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Không hủy được đặt chỗ" },
      { status: 500 }
    );
  }
}