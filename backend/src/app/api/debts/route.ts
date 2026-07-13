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

export async function GET(req: Request) {
  const auth = requireAuth(req);
  if (!auth) return fail("Chưa đăng nhập", 401);

  try {
    const { searchParams } = new URL(req.url);
    const bookingId = searchParams.get("bookingId")?.trim() || "";
    const customerId = searchParams.get("customerId")?.trim() || "";
    const debtStatus = searchParams.get("debtStatus")?.trim() || "";

    const whereClause: any = {
      ...(bookingId ? { bookingId: BigInt(bookingId) } : {}),
      ...(customerId ? { customerId: BigInt(customerId) } : {}),
      ...(debtStatus ? { debtStatus } : {}),
    };

    if (auth.roleCode === "CUSTOMER") {
      const customer = await prisma.customer.findFirst({
        where: { userId: BigInt(auth.userId) },
      });

      if (!customer) {
        return fail("Không tìm thấy thông tin khách hàng", 404);
      }

      whereClause.customerId = customer.id;
    }

    const debts = await prisma.debt.findMany({
      where: whereClause,
      include: {
        booking: {
          include: {
            tour: true,
            departure: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return ok(serialize(debts), "Lấy danh sách công nợ thành công");
  } catch (error) {
    console.error("GET /api/debts error:", error);
    return fail("Không thể lấy danh sách công nợ", 500);
  }
}