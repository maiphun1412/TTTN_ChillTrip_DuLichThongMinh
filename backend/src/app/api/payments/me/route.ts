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

async function getCustomerIdByUserId(userId: string) {
  const rows: any[] = await prisma.$queryRawUnsafe(
    `
      SELECT id
      FROM customers
      WHERE user_id = @P1
    `,
    BigInt(userId)
  );

  return rows[0]?.id ? BigInt(rows[0].id) : null;
}

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);

  if (!auth) {
    return fail("Chưa đăng nhập", 401);
  }

  try {
    const customerId = await getCustomerIdByUserId(auth.userId);

    if (!customerId) {
      return ok([], "Khách hàng chưa có dữ liệu thanh toán");
    }

    const payments = await prisma.$queryRawUnsafe(
      `
        SELECT
          p.id,
          p.payment_code AS paymentCode,
          p.payment_method AS paymentMethod,
          p.amount,
          p.payment_status AS paymentStatus,
          p.transaction_code AS transactionCode,
          p.proof_url AS proofUrl,
          p.paid_at AS paidAt,
          p.created_at AS createdAt,

          b.id AS bookingId,
          b.booking_code AS bookingCode,
          b.booking_status AS bookingStatus,

          t.id AS tourId,
          t.tour_name AS tourName,
          t.tour_code AS tourCode
        FROM payments p
        INNER JOIN bookings b ON p.booking_id = b.id
        INNER JOIN tours t ON b.tour_id = t.id
        WHERE b.customer_id = @P1
        ORDER BY p.created_at DESC
      `,
      customerId
    );

    return ok(serialize(payments), "Lấy danh sách thanh toán thành công");
  } catch (error) {
    console.error("GET /api/payments/me error:", error);
    return fail("Không thể lấy danh sách thanh toán", 500);
  }
}