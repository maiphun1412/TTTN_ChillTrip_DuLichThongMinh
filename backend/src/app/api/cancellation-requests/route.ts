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

type CancelBookingBody = {
  bookingId?: string | number;
  reason?: string;
};

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);

  if (!auth) {
    return fail("Chưa đăng nhập", 401);
  }

  try {
    const body = (await req.json()) as CancelBookingBody;

    const bookingId = Number(body.bookingId);
    const reason = body.reason?.trim() || "Khách hàng yêu cầu hủy tour";

    if (!bookingId || Number.isNaN(bookingId)) {
      return fail("Thiếu bookingId", 400);
    }

    const bookingRows: any[] = await prisma.$queryRawUnsafe(
      `
        SELECT
          b.id,
          b.booking_code AS bookingCode,
          b.booking_status AS bookingStatus,
          b.customer_id AS customerId,
          c.user_id AS userId,
          ds.start_date AS startDate
        FROM bookings b
        INNER JOIN customers c ON b.customer_id = c.id
        LEFT JOIN departure_schedules ds ON b.departure_id = ds.id
        WHERE b.id = @P1
      `,
      BigInt(bookingId)
    );

    const booking = bookingRows[0];

    if (!booking) {
      return fail("Không tìm thấy booking", 404);
    }

    if (String(booking.userId) !== String(auth.userId)) {
      return fail("Bạn không có quyền hủy booking này", 403);
    }

    if (["CANCELLED", "COMPLETED"].includes(String(booking.bookingStatus))) {
      return fail("Booking này không thể gửi yêu cầu hủy", 400);
    }

    if (!booking.startDate) {
      return fail("Booking chưa có ngày khởi hành nên chưa thể hủy online", 400);
    }

    const startDate = new Date(booking.startDate);
    const now = new Date();

    if (startDate.getTime() <= now.getTime()) {
      return fail("Tour đã khởi hành nên không thể gửi yêu cầu hủy online", 400);
    }

    const existedRows: any[] = await prisma.$queryRawUnsafe(
      `
        SELECT TOP 1 id, request_status AS requestStatus
        FROM cancellation_requests
        WHERE booking_id = @P1
          AND request_status IN ('PENDING', 'APPROVED')
        ORDER BY requested_at DESC
      `,
      BigInt(bookingId)
    );

    if (existedRows.length > 0) {
      return fail("Booking này đã có yêu cầu hủy đang xử lý", 400);
    }

    const createdRows: any[] = await prisma.$queryRawUnsafe(
      `
        INSERT INTO cancellation_requests (
          booking_id,
          requested_by,
          reason,
          request_status,
          requested_at
        )
        OUTPUT
          inserted.id,
          inserted.booking_id AS bookingId,
          inserted.requested_by AS requestedBy,
          inserted.reason,
          inserted.request_status AS requestStatus,
          inserted.requested_at AS requestedAt
        VALUES (
          @P1,
          @P2,
          @P3,
          'PENDING',
          GETDATE()
        )
      `,
      BigInt(bookingId),
      BigInt(auth.userId),
      reason
    );

    return ok(
      serialize(createdRows[0]),
      "Đã gửi yêu cầu hủy tour. ChillTrip sẽ kiểm tra chính sách hoàn tiền và phản hồi sớm."
    );
  } catch (error) {
    console.error("POST /api/cancellation-requests error:", error);
    return fail("Không thể gửi yêu cầu hủy tour", 500);
  }
}