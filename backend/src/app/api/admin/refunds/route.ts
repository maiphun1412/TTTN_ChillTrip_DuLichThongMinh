import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function serialize(data: any) {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

export async function GET() {
  try {
    const refunds = await prisma.$queryRawUnsafe(`
      SELECT 
        r.*,
        b.booking_code
      FROM refunds r
      LEFT JOIN bookings b ON r.booking_id = b.id
      ORDER BY r.created_at DESC
    `);

    return NextResponse.json({
      success: true,
      data: serialize(refunds),
    });
  } catch (error) {
    console.error("GET_ADMIN_REFUNDS_ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Lỗi lấy refund" },
      { status: 500 }
    );
  }
}