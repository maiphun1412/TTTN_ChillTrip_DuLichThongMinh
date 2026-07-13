import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAccessToken } from "@/lib/auth";

type CurrentUserRow = {
  id: bigint;
  roleCode: string;
};

type BookingRow = {
  id: bigint;
  bookingCode: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  tourName: string | null;
  tourImage: string | null;
  startDate: Date | null;
  endDate: Date | null;
  adultCount: number | null;
  childCount: number | null;
  totalAmount: number | string | null;
  discountAmount: number | string | null;
  payableAmount: number | string | null;
  paidAmount: number | string | null;
  bookingStatus: string;
  specialNotes: string | null;
  bookedAt: Date | null;
};

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
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

  return new Date(value).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

async function getCurrentStaff(request: NextRequest) {
  const token = getBearerToken(request);

  if (!token) {
    return {
      error: NextResponse.json(
        { success: false, message: "Chưa đăng nhập" },
        { status: 401 }
      ),
      user: null,
    };
  }

  const payload = verifyAccessToken(token);

  if (!payload?.userId) {
    return {
      error: NextResponse.json(
        { success: false, message: "Token không hợp lệ" },
        { status: 401 }
      ),
      user: null,
    };
  }

  const users = await prisma.$queryRaw<CurrentUserRow[]>`
    SELECT u.id, r.code AS roleCode
    FROM users u
    INNER JOIN roles r ON r.id = u.role_id
    WHERE u.id = ${BigInt(payload.userId)}
  `;

  const user = users[0];

  if (!user) {
    return {
      error: NextResponse.json(
        { success: false, message: "Không tìm thấy người dùng" },
        { status: 404 }
      ),
      user: null,
    };
  }

  if (user.roleCode !== "STAFF" && user.roleCode !== "ADMIN") {
    return {
      error: NextResponse.json(
        { success: false, message: "Bạn không có quyền truy cập" },
        { status: 403 }
      ),
      user: null,
    };
  }

  return { error: null, user };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getCurrentStaff(request);
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "ALL";
    const keyword = searchParams.get("keyword") || "";
    const paymentStatus = searchParams.get("paymentStatus") || "ALL";
    const fromDate = searchParams.get("fromDate") || "";
    const toDate = searchParams.get("toDate") || "";

    const rows = await prisma.$queryRaw<BookingRow[]>`
      SELECT TOP 100
        b.id,
        b.booking_code AS bookingCode,
        COALESCE(b.contact_name, c.full_name) AS customerName,
        COALESCE(b.contact_email, c.email) AS customerEmail,
        COALESCE(b.contact_phone, c.phone) AS customerPhone,
        t.tour_name AS tourName,
        t.featured_image_url AS tourImage,
        ds.start_date AS startDate,
        ds.end_date AS endDate,
        b.adult_count AS adultCount,
        b.child_count AS childCount,
        b.total_original_amount AS totalAmount,
        b.discount_amount AS discountAmount,
        b.total_payable_amount AS payableAmount,
        pay.paidAmount AS paidAmount,
        b.booking_status AS bookingStatus,
        b.special_notes AS specialNotes,
        b.booked_at AS bookedAt
      FROM bookings b
      LEFT JOIN customers c ON c.id = b.customer_id
      LEFT JOIN tours t ON t.id = b.tour_id
      LEFT JOIN departure_schedules ds ON ds.id = b.departure_id
      OUTER APPLY (
        SELECT COALESCE(SUM(p.amount), 0) AS paidAmount
        FROM payments p
        WHERE p.booking_id = b.id
          AND p.payment_status = 'PAID'
      ) pay
      WHERE
        (${status} = 'ALL' OR b.booking_status = ${status})
        AND (
          ${paymentStatus} = 'ALL'
          OR (${paymentStatus} = 'UNPAID' AND pay.paidAmount = 0)
          OR (${paymentStatus} = 'PARTIAL' AND pay.paidAmount > 0 AND pay.paidAmount < b.total_payable_amount)
          OR (${paymentStatus} = 'PAID' AND pay.paidAmount >= b.total_payable_amount)
        )
        AND (${fromDate} = '' OR ds.start_date >= CAST(${fromDate} AS DATE))
        AND (${toDate} = '' OR ds.start_date <= CAST(${toDate} AS DATE))
        AND (
          ${keyword} = ''
          OR b.booking_code LIKE '%' + ${keyword} + '%'
          OR b.contact_name LIKE '%' + ${keyword} + '%'
          OR b.contact_phone LIKE '%' + ${keyword} + '%'
          OR b.contact_email LIKE '%' + ${keyword} + '%'
          OR c.full_name LIKE '%' + ${keyword} + '%'
          OR c.phone LIKE '%' + ${keyword} + '%'
          OR t.tour_name LIKE '%' + ${keyword} + '%'
        )
      ORDER BY b.booked_at DESC
    `;

    const bookings = rows.map((item) => {
      const adultCount = item.adultCount || 0;
      const childCount = item.childCount || 0;
      const payableAmount = toNumber(item.payableAmount);
      const paidAmount = toNumber(item.paidAmount);

      return {
        id: toStringId(item.id),
        bookingCode: item.bookingCode,
        customerName: item.customerName || "Chưa có tên khách",
        customerEmail: item.customerEmail || "",
        customerPhone: item.customerPhone || "",
        tourName: item.tourName || "Chưa có tour",
        tourImage: item.tourImage || "",
        startDate: formatDate(item.startDate),
        endDate: formatDate(item.endDate),
        adultCount,
        childCount,
        pax: adultCount + childCount,
        totalAmount: toNumber(item.totalAmount),
        discountAmount: toNumber(item.discountAmount),
        payableAmount,
        paidAmount,
        remainingAmount: Math.max(payableAmount - paidAmount, 0),
        bookingStatus: item.bookingStatus,
        specialNotes: item.specialNotes || "",
        bookedAt: formatDate(item.bookedAt),
      };
    });

    return NextResponse.json({
      success: true,
      message: "Lấy danh sách đặt chỗ thành công",
      data: {
        bookings,
        total: bookings.length,
      },
    });
  } catch (error) {
    console.error("GET /api/staff/bookings error:", error);

    return NextResponse.json(
      { success: false, message: "Không lấy được danh sách đặt chỗ" },
      { status: 500 }
    );
  }
}