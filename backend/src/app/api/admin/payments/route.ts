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
      whereClause = `WHERE p.created_at >= '${startDate} 00:00:00' AND p.created_at < '${nextDateStr} 00:00:00'`;
    }

    const payments = await prisma.$queryRawUnsafe(`
      SELECT 
        p.*,
        b.booking_code,
        c.full_name
      FROM payments p
      LEFT JOIN bookings b ON p.booking_id = b.id
      LEFT JOIN customers c ON b.customer_id = c.id
      ${whereClause}
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