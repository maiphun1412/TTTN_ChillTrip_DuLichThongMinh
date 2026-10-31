import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function serialize(data: any) {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

    let whereClause = "";
    if (startDate && endDate && dateRegex.test(startDate) && dateRegex.test(endDate)) {
      const nextDate = new Date(endDate);
      nextDate.setDate(nextDate.getDate() + 1);
      const nextDateStr = nextDate.toISOString().split("T")[0];
      whereClause = `WHERE b.booked_at >= '${startDate} 00:00:00' AND b.booked_at < '${nextDateStr} 00:00:00'`;
    }

    const debts = await prisma.$queryRawUnsafe(`
      SELECT 
        d.*,
        c.full_name,
        b.booking_code,
        b.booked_at
      FROM debts d
      LEFT JOIN customers c ON d.customer_id = c.id
      LEFT JOIN bookings b ON d.booking_id = b.id
      ${whereClause}
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