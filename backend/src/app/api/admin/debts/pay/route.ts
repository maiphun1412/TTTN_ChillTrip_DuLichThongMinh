import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const debtId = Number(body.debtId);
    const amount = Number(body.amount);

    const debt: any = await prisma.$queryRawUnsafe(`
      SELECT * FROM debts WHERE id = ${debtId}
    `);

    if (!debt.length) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy công nợ" },
        { status: 404 }
      );
    }

    const newPaid = Number(debt[0].paid_amount) + amount;
    const remaining = Number(debt[0].total_amount) - newPaid;

    await prisma.$executeRawUnsafe(`
      UPDATE debts
      SET 
        paid_amount = ${newPaid},
        remaining_amount = ${remaining},
        debt_status = '${remaining <= 0 ? "PAID" : "PARTIAL"}',
        updated_at = GETDATE()
      WHERE id = ${debtId}
    `);

    await prisma.$executeRawUnsafe(`
      INSERT INTO debt_transactions (debt_id, transaction_type, amount, description)
      VALUES (${debtId}, 'PAYMENT', ${amount}, N'Thanh toán công nợ')
    `);

    return NextResponse.json({
      success: true,
      message: "Thanh toán công nợ thành công",
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { success: false, message: "Lỗi thanh toán công nợ" },
      { status: 500 }
    );
  }
}