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
      return ok([], "Khách hàng chưa có công nợ");
    }

    const debts = await prisma.$queryRawUnsafe(
      `
        SELECT
          d.id,
          d.total_amount AS totalAmount,
          d.paid_amount AS paidAmount,
          d.remaining_amount AS remainingAmount,
          d.due_date AS dueDate,
          d.debt_status AS debtStatus,
          d.notes,
          d.updated_at AS updatedAt,

          b.id AS bookingId,
          b.booking_code AS bookingCode,
          b.booking_status AS bookingStatus,

          t.id AS tourId,
          t.tour_name AS tourName,
          t.tour_code AS tourCode,

          ds.start_date AS startDate,
          ds.end_date AS endDate,

          cr.id AS cancellationRequestId,
          cr.request_status AS cancellationRequestStatus,
          cr.requested_at AS cancellationRequestedAt
        FROM debts d
        INNER JOIN bookings b ON d.booking_id = b.id
        INNER JOIN tours t ON b.tour_id = t.id
        LEFT JOIN departure_schedules ds ON b.departure_id = ds.id
        OUTER APPLY (
          SELECT TOP 1
            cr2.id,
            cr2.request_status,
            cr2.requested_at
          FROM cancellation_requests cr2
          WHERE cr2.booking_id = b.id
          ORDER BY cr2.requested_at DESC
        ) cr
        WHERE d.customer_id = @P1
        ORDER BY d.updated_at DESC
      `,
      customerId
    );

    return ok(serialize(debts), "Lấy danh sách công nợ thành công");
  } catch (error) {
    console.error("GET /api/debts/me error:", error);
    return fail("Không thể lấy danh sách công nợ", 500);
  }
}