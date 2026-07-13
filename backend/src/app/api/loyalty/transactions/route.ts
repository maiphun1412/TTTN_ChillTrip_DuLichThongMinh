import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api-response";

function serialize<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get("customerId");

    if (!customerId) {
      return fail("Thiếu customerId", 400);
    }

    const transactions = await (prisma as any).loyalty_transactions.findMany({
      where: {
        customer_id: BigInt(customerId),
      },
      orderBy: {
        created_at: "desc",
      },
    });

    return ok(serialize(transactions), "Lấy lịch sử điểm thành công");
  } catch (error) {
    console.error("GET /api/loyalty/transactions error:", error);
    return fail("Không thể lấy lịch sử điểm", 500);
  }
}