import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAccessToken } from "@/lib/auth";

type CurrentUserRow = {
  id: bigint;
  roleCode: string;
};

type CountRow = {
  value: number | bigint | null;
};

type MoneyRow = {
  value: number | string | null;
};

type BookingRow = {
  id: bigint;
  bookingCode: string;
  tour: string | null;
  customer: string | null;
  date: Date | null;
  price: number | string | null;
  status: string;
};

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.replace("Bearer ", "");
}

function toNumber(value: unknown) {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

function toStringId(value: unknown) {
  if (value === null || value === undefined) return "";
  return value.toString();
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return null;

  const date = new Date(value);

  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function firstValue<T extends { value: unknown }>(rows: T[]) {
  return rows?.[0]?.value ?? 0;
}

export async function GET(request: NextRequest) {
  try {
    const token = getBearerToken(request);

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Chưa đăng nhập",
        },
        { status: 401 }
      );
    }

    const payload = verifyAccessToken(token);

    if (!payload?.userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Token không hợp lệ",
        },
        { status: 401 }
      );
    }

    const currentUsers = await prisma.$queryRaw<CurrentUserRow[]>`
      SELECT 
        u.id,
        r.code AS roleCode
      FROM users u
      INNER JOIN roles r ON r.id = u.role_id
      WHERE u.id = ${BigInt(payload.userId)}
    `;

    const currentUser = currentUsers[0];

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          message: "Không tìm thấy người dùng",
        },
        { status: 404 }
      );
    }

    if (currentUser.roleCode !== "STAFF" && currentUser.roleCode !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message: "Bạn không có quyền xem trang nhân viên",
        },
        { status: 403 }
      );
    }

    const [
      pendingBookingRows,
      latestBookings,
      supportRequestRows,
      upcomingTourRows,
      todayRevenueRows,
      unpaidDebtRows,
      preparingOperationRows,
      pendingGuideAssignRows,
      missingDocumentRows,
    ] = await Promise.all([
      prisma.$queryRaw<CountRow[]>`
        SELECT COUNT(*) AS value
        FROM bookings
        WHERE booking_status = 'PENDING'
      `,

      prisma.$queryRaw<BookingRow[]>`
        SELECT TOP 5
          b.id,
          b.booking_code AS bookingCode,
          t.tour_name AS tour,
          COALESCE(b.contact_name, c.full_name) AS customer,
          ds.start_date AS date,
          b.total_payable_amount AS price,
          b.booking_status AS status
        FROM bookings b
        LEFT JOIN tours t ON t.id = b.tour_id
        LEFT JOIN customers c ON c.id = b.customer_id
        LEFT JOIN departure_schedules ds ON ds.id = b.departure_id
        ORDER BY b.booked_at DESC
      `,

      prisma.$queryRaw<CountRow[]>`
        SELECT COUNT(*) AS value
        FROM cancellation_requests
        WHERE request_status = 'PENDING'
      `,

      prisma.$queryRaw<CountRow[]>`
        SELECT COUNT(*) AS value
        FROM departure_schedules
        WHERE start_date >= CAST(GETDATE() AS DATE)
          AND start_date <= DATEADD(DAY, 1, CAST(GETDATE() AS DATE))
      `,

      prisma.$queryRaw<MoneyRow[]>`
        SELECT COALESCE(SUM(amount), 0) AS value
        FROM payments
        WHERE payment_status = 'PAID'
          AND paid_at >= CAST(GETDATE() AS DATE)
      `,

      prisma.$queryRaw<MoneyRow[]>`
        SELECT COALESCE(SUM(remaining_amount), 0) AS value
        FROM debts
        WHERE debt_status <> 'PAID'
      `,

      prisma.$queryRaw<CountRow[]>`
        SELECT COUNT(*) AS value
        FROM departure_operations
        WHERE operation_status = 'PREPARING'
      `,

      prisma.$queryRaw<CountRow[]>`
        SELECT COUNT(*) AS value
        FROM departure_schedules
        WHERE guide_id IS NULL
          AND start_date >= CAST(GETDATE() AS DATE)
      `,

      prisma.$queryRaw<CountRow[]>`
        SELECT COUNT(*) AS value
        FROM passenger_documents
        WHERE status = 'PENDING'
      `,
    ]);

    const pendingBookings = toNumber(firstValue(pendingBookingRows));
    const supportRequests = toNumber(firstValue(supportRequestRows));
    const upcomingTours = toNumber(firstValue(upcomingTourRows));
    const todayRevenue = toNumber(firstValue(todayRevenueRows));
    const unpaidDebt = toNumber(firstValue(unpaidDebtRows));
    const preparingOperations = toNumber(firstValue(preparingOperationRows));
    const pendingGuideAssign = toNumber(firstValue(pendingGuideAssignRows));
    const missingDocuments = toNumber(firstValue(missingDocumentRows));

    const bookingItems = latestBookings.map((booking) => ({
      id: toStringId(booking.id),
      bookingCode: booking.bookingCode,
      tour: booking.tour || "Chưa có tour",
      customer: booking.customer || "Chưa có khách hàng",
      date: formatDate(booking.date),
      price: toNumber(booking.price),
      status: booking.status,
    }));

    return NextResponse.json({
      success: true,
      message: "Lấy dữ liệu dashboard nhân viên thành công",
      data: {
        summary: {
          pendingBookings,
          supportRequests,
          upcomingTours,
          todayRevenue,
          unpaidDebt,
          preparingOperations,
          urgentTasks:
            pendingBookings +
            supportRequests +
            upcomingTours +
            preparingOperations +
            pendingGuideAssign +
            missingDocuments,
        },
        bookings: bookingItems,
        logistics: {
          preparingOperations,
          missingDocuments,
          pendingGuideAssign,
        },
      },
    });
  } catch (error) {
    console.error("GET /api/staff/dashboard error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Không lấy được dữ liệu dashboard nhân viên",
      },
      { status: 500 }
    );
  }
}