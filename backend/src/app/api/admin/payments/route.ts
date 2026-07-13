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
    const payments = await prisma.$queryRawUnsafe(`
      SELECT 
        p.*,
        b.booking_code,
        c.full_name
      FROM payments p
      LEFT JOIN bookings b ON p.booking_id = b.id
      LEFT JOIN customers c ON b.customer_id = c.id
      ORDER BY p.created_at DESC
    `);

    return NextResponse.json({
      success: true,
      data: serialize(payments),
    });
  } catch (error) {
    console.error("GET_ADMIN_PAYMENTS_ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Lỗi lấy danh sách thanh toán" },
      { status: 500 }
    );
  }
}