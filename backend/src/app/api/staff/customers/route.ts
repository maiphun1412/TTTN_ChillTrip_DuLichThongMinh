import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAccessToken } from "@/lib/auth";

type CurrentUserRow = {
  id: bigint;
  roleCode: string;
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
        { success: false, message: "Bạn không có quyền xem khách hàng" },
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
    const keyword = searchParams.get("keyword") || "";
    const customerType = searchParams.get("customerType") || "ALL";

    const rows = await prisma.$queryRaw<any[]>`
      SELECT TOP 200
        c.id,
        c.customer_code AS customerCode,
        c.full_name AS fullName,
        c.gender,
        c.date_of_birth AS dateOfBirth,
        c.email,
        c.phone,
        c.address,
        c.customer_type AS customerType,
        c.notes,
        u.avatar_url AS avatarUrl,
        u.status AS userStatus,
        COALESCE(bs.totalBookings, 0) AS totalBookings,
        COALESCE(bs.totalSpent, 0) AS totalSpent,
        bs.lastBookedAt
      FROM customers c
      LEFT JOIN users u ON u.id = c.user_id
      OUTER APPLY (
        SELECT
          COUNT(*) AS totalBookings,
          COALESCE(SUM(b.total_payable_amount), 0) AS totalSpent,
          MAX(b.booked_at) AS lastBookedAt
        FROM bookings b
        WHERE b.customer_id = c.id
      ) bs
      WHERE
        (${customerType} = 'ALL' OR c.customer_type = ${customerType})
        AND (
          ${keyword} = ''
          OR c.customer_code LIKE '%' + ${keyword} + '%'
          OR c.full_name LIKE N'%' + ${keyword} + N'%'
          OR c.phone LIKE '%' + ${keyword} + '%'
          OR c.email LIKE '%' + ${keyword} + '%'
        )
      ORDER BY c.created_at DESC
    `;

    const summaryRows = await prisma.$queryRaw<any[]>`
      SELECT
        COUNT(*) AS totalCustomers,
        SUM(CASE WHEN customer_type = 'INDIVIDUAL' THEN 1 ELSE 0 END) AS individualCustomers,
        SUM(CASE WHEN customer_type <> 'INDIVIDUAL' THEN 1 ELSE 0 END) AS corporateCustomers,
        (
          SELECT COUNT(DISTINCT customer_id)
          FROM bookings
        ) AS customersWithBookings
      FROM customers
    `;

    const customers = rows.map((item) => ({
      id: toStringId(item.id),
      customerCode: item.customerCode,
      fullName: item.fullName,
      gender: item.gender,
      dateOfBirth: formatDate(item.dateOfBirth),
      email: item.email,
      phone: item.phone,
      address: item.address,
      customerType: item.customerType,
      notes: item.notes,
      avatarUrl: item.avatarUrl,
      userStatus: item.userStatus,
      totalBookings: toNumber(item.totalBookings),
      totalSpent: toNumber(item.totalSpent),
      lastBookedAt: formatDate(item.lastBookedAt),
    }));

    const summary = summaryRows[0];

    return NextResponse.json({
      success: true,
      message: "Lấy danh sách khách hàng thành công",
      data: {
        customers,
        total: customers.length,
        summary: {
          totalCustomers: toNumber(summary?.totalCustomers),
          individualCustomers: toNumber(summary?.individualCustomers),
          corporateCustomers: toNumber(summary?.corporateCustomers),
          customersWithBookings: toNumber(summary?.customersWithBookings),
        },
      },
    });
  } catch (error) {
    console.error("GET /api/staff/customers error:", error);

    return NextResponse.json(
      { success: false, message: "Không lấy được danh sách khách hàng" },
      { status: 500 }
    );
  }
}