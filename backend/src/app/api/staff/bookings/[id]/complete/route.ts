import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { confirmPointsForBooking } from "@/lib/loyalty";
import { recordCustomerTravelPlace } from "@/lib/travel-place";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const bookingId = BigInt(id);

    await prisma.$executeRaw`
      UPDATE bookings
      SET booking_status = 'COMPLETED'
      WHERE id = ${bookingId}
    `;

    await recordCustomerTravelPlace(bookingId);

    const result = await confirmPointsForBooking({
      bookingId,
    });

    const confirmedPoints = Number((result as any)?.points || 0);

    return NextResponse.json({
      success: true,
      message:
        confirmedPoints > 0
          ? `Hoàn thành tour, cộng ${confirmedPoints} điểm và cập nhật bản đồ đã đi thành công`
          : "Hoàn thành tour và cập nhật bản đồ đã đi thành công",
      data: {
        confirmedPoints,
      },
    });
  } catch (error) {
    console.error("COMPLETE_BOOKING_ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Không thể hoàn thành tour" },
      { status: 500 }
    );
  }
}