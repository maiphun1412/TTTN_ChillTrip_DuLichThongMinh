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
    const debts = await prisma.$queryRawUnsafe(`
      SELECT 
        d.*,
        c.full_name,
        b.booking_code
      FROM debts d
      LEFT JOIN customers c ON d.customer_id = c.id
      LEFT JOIN bookings b ON d.booking_id = b.id
      ORDER BY d.updated_at DESC
    `);

    return NextResponse.json({
      success: true,
      data: serialize(debts),
    });
  } catch (error) {
    console.error("GET_ADMIN_DEBTS_ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Lỗi lấy công nợ" },
      { status: 500 }
    );
  }
}