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

  if (!auth) {
    return fail("Chưa đăng nhập", 401);
  }

  try {
    const customer = await prisma.customers.findFirst({
      where: {
        user_id: BigInt(auth.userId),
      },
      select: {
        id: true,
        user_id: true,
      },
    });

    if (!customer) {
      return fail("Không tìm thấy thông tin khách hàng", 404);
    }

    const places = await prisma.$queryRaw<
      {
        id: bigint;
        customerId: bigint;
        destinationId: bigint;
        destinationName: string;
        country: string | null;
        city: string | null;
        destinationType: string | null;
        latitude: number | null;
        longitude: number | null;
        visitedAt: Date;
        firstCompletedBookingId: bigint | null;
      }[]
    >`
      SELECT
        ctp.id,
        ctp.customer_id AS customerId,
        ctp.destination_id AS destinationId,
        d.destination_name AS destinationName,
        d.country,
        d.city,
        d.destination_type AS destinationType,
        d.latitude,
        d.longitude,
        ctp.visited_at AS visitedAt,
        ctp.first_completed_booking_id AS firstCompletedBookingId
      FROM customer_travel_places ctp
      INNER JOIN destinations d ON ctp.destination_id = d.id
      INNER JOIN bookings b ON ctp.first_completed_booking_id = b.id
      WHERE
        ctp.customer_id = ${customer.id}
        AND b.customer_id = ${customer.id}
        AND b.booking_status = 'COMPLETED'
      ORDER BY ctp.visited_at DESC
    `;

    return ok(
      serialize({
        total: places.length,
        places,
      }),
      "Lấy danh sách điểm đến đã đi thành công"
    );
  } catch (error) {
    console.error("GET /api/profile/travel-places error:", error);
    return fail("Không thể lấy danh sách điểm đến đã đi", 500);
  }
}