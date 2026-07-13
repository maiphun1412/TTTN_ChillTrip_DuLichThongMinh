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

const updateDebtSchema = z.object({
  dueDate: z.string().optional(),
  debtStatus: z.enum(["UNPAID", "PARTIAL", "PAID", "OVERDUE"]).optional(),
  notes: z.string().optional(),
});

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(req);
  if (!auth) return fail("Chưa đăng nhập", 401);

  try {
    const { id } = await context.params;

    const debt = await prisma.debt.findUnique({
      where: { id: BigInt(id) },
      include: {
        booking: {
          include: {
            customer: true,
            tour: true,
            departure: true,
          },
        },
      },
    });

    if (!debt) return fail("Không tìm thấy công nợ", 404);

    if (auth.roleCode === "CUSTOMER") {
      const customer = await prisma.customer.findFirst({
        where: { userId: BigInt(auth.userId) },
      });

      if (!customer || customer.id !== debt.customerId) {
        return fail("Bạn không có quyền xem công nợ này", 403);
      }
    }

    return ok(serialize(debt), "Lấy chi tiết công nợ thành công");
  } catch (error) {
    console.error("GET /api/debts/[id] error:", error);
    return fail("Không thể lấy chi tiết công nợ", 500);
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = requireRole(req, ["ADMIN", "STAFF"]);
  if (!auth.ok) {
    return fail(
      auth.reason === "UNAUTHORIZED" ? "Chưa đăng nhập" : "Không có quyền",
      auth.reason === "UNAUTHORIZED" ? 401 : 403
    );
  }

  try {
    const { id } = await context.params;
    const body = await req.json();
    const parsed = updateDebtSchema.safeParse(body);

    if (!parsed.success) {
      return fail("Dữ liệu không hợp lệ", 422, parsed.error.flatten());
    }

    const existed = await prisma.debt.findUnique({
      where: { id: BigInt(id) },
    });

    if (!existed) return fail("Không tìm thấy công nợ", 404);

    const updated = await prisma.debt.update({
      where: { id: BigInt(id) },
      data: {
        ...(parsed.data.dueDate !== undefined
          ? { dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null }
          : {}),
        ...(parsed.data.debtStatus !== undefined
          ? { debtStatus: parsed.data.debtStatus }
          : {}),
        ...(parsed.data.notes !== undefined
          ? { notes: parsed.data.notes || null }
          : {}),
      },
      include: {
        booking: true,
      },
    });

    return ok(serialize(updated), "Cập nhật công nợ thành công");
  } catch (error) {
    console.error("PATCH /api/debts/[id] error:", error);
    return fail("Không thể cập nhật công nợ", 500);
  }
}