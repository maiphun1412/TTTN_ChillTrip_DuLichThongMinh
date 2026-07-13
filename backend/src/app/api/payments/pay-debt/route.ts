import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api-response";
import { requireAuth } from "@/lib/permissions";

function serialize<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

function createPaymentCode() {
  return `PAY${Date.now()}`;
}

type PayDebtBody = {
  debtId?: string | number;
  amount?: string | number;
  paymentMethod?: string;
};

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);

  if (!auth) {
    return fail("Chưa đăng nhập", 401);
  }

  try {
    const body = (await req.json()) as PayDebtBody;

    const debtId = Number(body.debtId);
    const amount = Number(body.amount || 0);
    const paymentMethod = body.paymentMethod || "BANK_TRANSFER";

    if (!debtId || Number.isNaN(debtId)) {
      return fail("Thiếu debtId", 400);
    }

    if (!amount || amount <= 0) {
      return fail("Số tiền thanh toán không hợp lệ", 400);
    }

    const debtRows: any[] = await prisma.$queryRawUnsafe(
      `
        SELECT
          d.id,
          d.booking_id AS bookingId,
          d.customer_id AS customerId,
          d.remaining_amount AS remainingAmount,
          d.debt_status AS debtStatus,
          c.user_id AS userId
        FROM debts d
        INNER JOIN customers c ON d.customer_id = c.id
        WHERE d.id = @P1
      `,
      BigInt(debtId)
    );

    const debt = debtRows[0];

    if (!debt) {
      return fail("Không tìm thấy công nợ", 404);
    }

    if (String(debt.userId) !== String(auth.userId)) {
      return fail("Bạn không có quyền thanh toán công nợ này", 403);
    }

    const remainingAmount = Number(debt.remainingAmount || 0);

    if (remainingAmount <= 0) {
      return fail("Công nợ này đã được thanh toán đủ", 400);
    }

    if (amount > remainingAmount) {
      return fail("Số tiền thanh toán vượt quá công nợ còn lại", 400);
    }

    const paymentCode = createPaymentCode();

    const paymentRows: any[] = await prisma.$queryRawUnsafe(
      `
        INSERT INTO payments (
          booking_id,
          payment_code,
          payment_method,
          amount,
          payment_status,
          created_at,
          created_by
        )
        OUTPUT
          inserted.id,
          inserted.booking_id AS bookingId,
          inserted.payment_code AS paymentCode,
          inserted.payment_method AS paymentMethod,
          inserted.amount,
          inserted.payment_status AS paymentStatus,
          inserted.created_at AS createdAt
        VALUES (
          @P1,
          @P2,
          @P3,
          @P4,
          'PENDING',
          GETDATE(),
          @P5
        )
      `,
      BigInt(debt.bookingId),
      paymentCode,
      paymentMethod,
      amount,
      BigInt(auth.userId)
    );

    return ok(
      serialize(paymentRows[0]),
      "Đã tạo yêu cầu thanh toán. Vui lòng chờ xác nhận."
    );
  } catch (error) {
    console.error("POST /api/payments/pay-debt error:", error);
    return fail("Không thể tạo thanh toán công nợ", 500);
  }
}