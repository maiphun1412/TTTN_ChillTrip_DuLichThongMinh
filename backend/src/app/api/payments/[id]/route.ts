import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api-response";
import { requireAuth, requireRole } from "@/lib/permissions";
import { z } from "zod";

function serialize<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

const updatePaymentSchema = z.object({
  paymentStatus: z
    .enum(["PENDING", "SUCCESS", "FAILED", "REFUNDED", "PARTIAL_REFUND"])
    .optional(),
  transactionCode: z.string().optional(),
  proofUrl: z.string().optional(),
});

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(req);
  if (!auth) return fail("Chưa đăng nhập", 401);

  try {
    const { id } = await context.params;

    const payment = await prisma.payment.findUnique({
      where: { id: BigInt(id) },
      include: {
        booking: {
          include: {
            customer: true,
            tour: true,
          },
        },
      },
    });

    if (!payment) return fail("Không tìm thấy thanh toán", 404);

    if (auth.roleCode === "CUSTOMER") {
      const customer = await prisma.customer.findFirst({
        where: { userId: BigInt(auth.userId) },
      });

      if (!customer || payment.booking.customerId !== customer.id) {
        return fail("Bạn không có quyền xem thanh toán này", 403);
      }
    }

    return ok(serialize(payment), "Lấy chi tiết thanh toán thành công");
  } catch (error) {
    console.error("GET /api/payments/[id] error:", error);
    return fail("Không thể lấy chi tiết thanh toán", 500);
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(req, ["ADMIN", "STAFF"]);
  if (!auth.ok) {
    return fail(
      auth.reason === "UNAUTHORIZED" ? "Chưa đăng nhập" : "Không có quyền",
      auth.reason === "UNAUTHORIZED" ? 401 : 403
    );
  }

  try {
    const { id } = await context.params;
    const body = await req.json();
    const parsed = updatePaymentSchema.safeParse(body);

    if (!parsed.success) {
      return fail("Dữ liệu không hợp lệ", 422, parsed.error.flatten());
    }

    const existed = await prisma.payment.findUnique({
      where: { id: BigInt(id) },
    });

    if (!existed) return fail("Không tìm thấy thanh toán", 404);

    const updated = await prisma.payment.update({
      where: { id: BigInt(id) },
      data: {
        ...(parsed.data.paymentStatus !== undefined
          ? { paymentStatus: parsed.data.paymentStatus }
          : {}),
        ...(parsed.data.transactionCode !== undefined
          ? { transactionCode: parsed.data.transactionCode || null }
          : {}),
        ...(parsed.data.proofUrl !== undefined
          ? { proofUrl: parsed.data.proofUrl || null }
          : {}),
      },
      include: {
        booking: true,
      },
    });

    return ok(serialize(updated), "Cập nhật thanh toán thành công");
  } catch (error) {
    console.error("PATCH /api/payments/[id] error:", error);
    return fail("Không thể cập nhật thanh toán", 500);
  }
}