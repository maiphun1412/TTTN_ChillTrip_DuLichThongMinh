import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function serialize(data: any) {
  return JSON.parse(
    JSON.stringify(data, (_, v) =>
      typeof v === "bigint" ? v.toString() : v
    )
  );
}

export async function GET() {
  try {
    const result: any = await prisma.$queryRawUnsafe(`
      SELECT
        ISNULL(SUM(amount),0) AS total_revenue,
        COUNT(*) AS total_payments,
        SUM(CASE WHEN payment_status = 'PENDING' THEN 1 ELSE 0 END) AS pending_payments
      FROM payments
    `);

    const debt: any = await prisma.$queryRawUnsafe(`
      SELECT
        ISNULL(SUM(total_amount),0) AS total_debt,
        ISNULL(SUM(paid_amount),0) AS paid_amount,
        ISNULL(SUM(remaining_amount),0) AS remaining_amount
      FROM debts
    `);

    return NextResponse.json({
      success: true,
      data: serialize({
        revenue: result[0],
        debt: debt[0],
      }),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { success: false, message: "Lỗi lấy dashboard tài chính" },
      { status: 500 }
    );
  }
}