import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api-response";
import { requireAuth, requireRole } from "@/lib/permissions";
import { confirmPointsForBooking } from "@/lib/loyalty";
import { z } from "zod";

function serialize<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

function makePaymentCode() {
  return `PAY${Date.now()}`;
}

const createPaymentSchema = z.object({
  bookingId: z.coerce.bigint(),
  paymentMethod: z.string().min(1),
  amount: z.number().positive(),
  transactionCode: z.string().optional(),
  proofUrl: z.string().optional(),
});

export async function GET(req: Request) {
  const auth = requireAuth(req);
  if (!auth) return fail("Chưa đăng nhập", 401);

  try {
    const { searchParams } = new URL(req.url);
    const bookingId = searchParams.get("bookingId")?.trim() || "";
    const paymentStatus = searchParams.get("paymentStatus")?.trim() || "";

    const whereClause: any = {
      ...(bookingId ? { booking_id: BigInt(bookingId) } : {}),
      ...(paymentStatus ? { payment_status: paymentStatus } : {}),
    };

    const payments = await (prisma as any).payments.findMany({
      where: whereClause,
      include: {
        bookings: {
          include: {
            customers: true,
            tours: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });

    return ok(serialize(payments), "Lấy danh sách thanh toán thành công");
  } catch (error) {
    console.error("GET /api/payments error:", error);
    return fail("Không thể lấy danh sách thanh toán", 500);
  }
}

export async function POST(req: Request) {
  const auth = await requireRole(req, ["ADMIN", "STAFF"]);
  if (!auth.ok) {
    return fail(
      auth.reason === "UNAUTHORIZED" ? "Chưa đăng nhập" : "Không có quyền",
      auth.reason === "UNAUTHORIZED" ? 401 : 403
    );
  }

  try {
    const body = await req.json();
    const parsed = createPaymentSchema.safeParse(body);

    if (!parsed.success) {
      return fail("Dữ liệu không hợp lệ", 422, parsed.error.flatten());
    }

    const data = parsed.data;
    const prismaAny = prisma as any;

    const booking = await prismaAny.bookings.findUnique({
      where: { id: data.bookingId },
      include: {
        debts: true,
        payments: true,
      },
    });

    if (!booking) return fail("Không tìm thấy booking", 404);
    if (!booking.debts) return fail("Không tìm thấy công nợ của booking", 404);

    const paidSuccess = booking.payments
      .filter(
        (p: { payment_status: string; amount: number | bigint }) =>
          p.payment_status === "SUCCESS"
      )
      .reduce(
        (sum: number, p: { amount: number | bigint }) =>
          sum + Number(p.amount),
        0
      );

    const nextPaid = paidSuccess + data.amount;

    if (nextPaid > Number(booking.total_payable_amount)) {
      return fail("Số tiền thanh toán vượt quá giá trị booking", 422);
    }

    const created = await prisma.$transaction(async (tx) => {
      const txAny = tx as any;

      const payment = await txAny.payments.create({
        data: {
          booking_id: data.bookingId,
          payment_code: makePaymentCode(),
          payment_method: data.paymentMethod,
          amount: data.amount,
          payment_status: "SUCCESS",
          transaction_code: data.transactionCode || null,
          proof_url: data.proofUrl || null,
          paid_at: new Date(),
        },
      });

      const remainingAmount = Number(booking.total_payable_amount) - nextPaid;
      const debtStatus =
        remainingAmount <= 0 ? "PAID" : nextPaid > 0 ? "PARTIAL" : "UNPAID";
      const bookingStatus =
        remainingAmount <= 0 ? "PAID" : "PARTIALLY_PAID";

      await txAny.debts.update({
        where: { booking_id: booking.id },
        data: {
          paid_amount: nextPaid,
          remaining_amount: remainingAmount,
          debt_status: debtStatus,
        },
      });

      await txAny.bookings.update({
        where: { id: booking.id },
        data: {
          booking_status: bookingStatus,
        },
      });

      return txAny.payments.findUnique({
        where: { id: payment.id },
        include: {
          bookings: true,
        },
      });
    });

    if (created?.bookings?.booking_status === "PAID") {
      await confirmPointsForBooking({
        bookingId: data.bookingId,
      });
    }

    return ok(serialize(created), "Tạo thanh toán thành công", 201);
  } catch (error) {
    console.error("POST /api/payments error:", error);
    return fail("Không thể tạo thanh toán", 500);
  }
}