import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function serialize(data: any) {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const tourId = searchParams.get("tourId") || searchParams.get("tour_id");

    if (!tourId || Number.isNaN(Number(tourId))) {
      return NextResponse.json(
        { success: false, message: "Thiếu tourId" },
        { status: 400 }
      );
    }

    const departures = await prisma.departure_schedules.findMany({
      where: {
        tour_id: BigInt(tourId),
        booking_status: "OPEN",
        available_seats: {
          gt: 0,
        },
      },
      select: {
        id: true,
        departure_code: true,
        start_date: true,
        end_date: true,
        max_seats: true,
        available_seats: true,
        booked_seats: true,
        booking_status: true,
      },
      orderBy: {
        start_date: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      data: serialize(departures),
    });
  } catch (error) {
    console.error("GET_ADMIN_BOOKING_DEPARTURES_ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Không lấy được ngày khởi hành" },
      { status: 500 }
    );
  }
}