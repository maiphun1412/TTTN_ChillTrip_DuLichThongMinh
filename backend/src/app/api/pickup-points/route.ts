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
    const departureId = req.nextUrl.searchParams.get("departureId");

    if (!departureId) {
      return NextResponse.json(
        { success: false, message: "Thiếu departureId" },
        { status: 400 }
      );
    }

    const pickupPoints = await prisma.pickup_points.findMany({
      where: {
        departure_id: BigInt(departureId),
        is_active: true,
      },
      orderBy: {
        pickup_time: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      data: serialize(pickupPoints),
    });
  } catch (error) {
    console.error("GET_PICKUP_POINTS_ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Không lấy được danh sách điểm đón" },
      { status: 500 }
    );
  }
}