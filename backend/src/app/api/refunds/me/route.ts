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
      return ok([], "Khách hàng chưa có yêu cầu hoàn hủy");
    }

    const refunds = await prisma.$queryRawUnsafe(
      `
        SELECT
          cr.id AS cancellationRequestId,
          cr.reason,
          cr.request_status AS requestStatus,
          cr.requested_at AS requestedAt,
          cr.processed_at AS processedAt,

          r.id AS refundId,
          r.refund_code AS refundCode,
          r.refund_amount AS refundAmount,
          r.cancellation_fee_amount AS cancellationFeeAmount,
          r.refund_status AS refundStatus,
          r.refund_method AS refundMethod,
          r.refund_at AS refundAt,
          r.notes AS refundNotes,

          b.id AS bookingId,
          b.booking_code AS bookingCode,
          b.booking_status AS bookingStatus,

          t.id AS tourId,
          t.tour_name AS tourName,
          t.tour_code AS tourCode
        FROM cancellation_requests cr
        INNER JOIN bookings b ON cr.booking_id = b.id
        INNER JOIN tours t ON b.tour_id = t.id
        LEFT JOIN refunds r ON r.cancellation_request_id = cr.id
        WHERE b.customer_id = @P1
        ORDER BY cr.requested_at DESC
      `,
      customerId
    );

    return ok(serialize(refunds), "Lấy danh sách hoàn hủy thành công");
  } catch (error) {
    console.error("GET /api/refunds/me error:", error);
    return fail("Không thể lấy danh sách hoàn hủy", 500);
  }
}