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

    const prismaAny = prisma as any;

    const wallet = await prismaAny.loyalty_wallets.findUnique({
      where: {
        customer_id: BigInt(customerId),
      },
    });

    const pendingResult = await prismaAny.loyalty_transactions.aggregate({
      where: {
        customer_id: BigInt(customerId),
        transaction_type: "EARN",
        point_status: "PENDING",
      },
      _sum: {
        points: true,
      },
    });

    const pendingPoints = Number(pendingResult?._sum?.points || 0);

    return ok(
      serialize({
        ...(wallet || {
          customer_id: customerId,
          point_balance: 0,
          total_earned: 0,
          total_used: 0,
        }),
        pending_points: pendingPoints,
      }),
      "Lấy ví điểm thành công"
    );
  } catch (error) {
    console.error("GET /api/loyalty/wallet error:", error);
    return fail("Không thể lấy ví điểm", 500);
  }
}