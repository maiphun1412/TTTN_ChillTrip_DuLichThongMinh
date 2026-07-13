import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function serialize(data: any) {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const bookingId = Number(id);
    const body = await req.json();

    const newDepartureId = Number(body.departureId);

    if (!bookingId || !newDepartureId) {
      return NextResponse.json(
        { success: false, message: "Dữ liệu đổi ngày không hợp lệ" },
        { status: 400 }
      );
    }

    const booking = await prisma.bookings.findUnique({
      where: { id: BigInt(bookingId) },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy đơn đặt tour" },
        { status: 404 }
      );
    }

    if (
      booking.booking_status === "CANCELLED" ||
      booking.booking_status === "COMPLETED"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Đơn đã hủy hoặc hoàn thành, không thể đổi ngày",
        },
        { status: 400 }
      );
    }

    const newDeparture = await prisma.departure_schedules.findUnique({
      where: { id: BigInt(newDepartureId) },
    });

    if (!newDeparture) {
      return NextResponse.json(
        { success: false, message: "Ngày khởi hành mới không tồn tại" },
        { status: 404 }
      );
    }

    if (newDeparture.tour_id !== booking.tour_id) {
      return NextResponse.json(
        { success: false, message: "Ngày khởi hành không thuộc tour này" },
        { status: 400 }
      );
    }

    if (newDeparture.booking_status !== "OPEN") {
      return NextResponse.json(
        { success: false, message: "Ngày khởi hành này không còn mở bán" },
        { status: 400 }
      );
    }

    const totalPeople = booking.adult_count + booking.child_count;

    if (newDeparture.available_seats < totalPeople) {
      return NextResponse.json(
        { success: false, message: "Ngày mới không đủ số chỗ trống" },
        { status: 400 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.departure_schedules.update({
        where: { id: booking.departure_id },
        data: {
          available_seats: { increment: totalPeople },
          booked_seats: { decrement: totalPeople },
        },
      });

      await tx.departure_schedules.update({
        where: { id: BigInt(newDepartureId) },
        data: {
          available_seats: { decrement: totalPeople },
          booked_seats: { increment: totalPeople },
        },
      });

      return tx.bookings.update({
        where: { id: BigInt(bookingId) },
        data: {
          departure_id: BigInt(newDepartureId),
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Đổi ngày khởi hành thành công",
      data: serialize(updated),
    });
  } catch (error) {
    console.error("CHANGE_DEPARTURE_ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Không đổi được ngày khởi hành" },
      { status: 500 }
    );
  }
}