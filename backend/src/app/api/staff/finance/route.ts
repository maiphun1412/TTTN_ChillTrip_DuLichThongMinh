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
        { success: false, message: "Bạn không có quyền xem tài chính" },
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
    const status = searchParams.get("status") || "ALL";

    const summaryRows = await prisma.$queryRaw<any[]>`
      SELECT
        COALESCE(SUM(CASE 
          WHEN p.payment_status = 'PAID'
            AND MONTH(ISNULL(p.paid_at, p.created_at)) = MONTH(GETDATE())
            AND YEAR(ISNULL(p.paid_at, p.created_at)) = YEAR(GETDATE())
          THEN p.amount ELSE 0 END), 0) AS monthRevenue,

        COALESCE(SUM(CASE 
          WHEN p.payment_status = 'PENDING'
          THEN p.amount ELSE 0 END), 0) AS pendingPaymentAmount,

        COALESCE(SUM(CASE 
          WHEN p.payment_status = 'PAID'
          THEN p.amount ELSE 0 END), 0) AS paidAmount,

        COALESCE((SELECT SUM(remaining_amount) FROM debts WHERE remaining_amount > 0), 0) AS unpaidDebtAmount,

        COALESCE((SELECT SUM(refund_amount) FROM refunds WHERE refund_status <> 'REJECTED'), 0) AS refundAmount
      FROM payments p
    `;

    const summary = summaryRows[0] || {};
    const monthRevenue = toNumber(summary.monthRevenue);
    const refundAmount = toNumber(summary.refundAmount);

    const transactions = await prisma.$queryRaw<any[]>`
      SELECT TOP 100
        p.id,
        p.payment_code AS paymentCode,
        b.booking_code AS bookingCode,
        c.full_name AS customerName,
        t.tour_name AS tourName,
        p.amount,
        p.payment_method AS paymentMethod,
        p.payment_status AS paymentStatus,
        p.transaction_code AS transactionCode,
        p.paid_at AS paidAt,
        p.created_at AS createdAt
      FROM payments p
      INNER JOIN bookings b ON b.id = p.booking_id
      INNER JOIN customers c ON c.id = b.customer_id
      INNER JOIN tours t ON t.id = b.tour_id
      WHERE
        (${status} = 'ALL' OR p.payment_status = ${status})
        AND (
          ${keyword} = ''
          OR p.payment_code LIKE '%' + ${keyword} + '%'
          OR b.booking_code LIKE '%' + ${keyword} + '%'
          OR c.full_name LIKE N'%' + ${keyword} + N'%'
          OR t.tour_name LIKE N'%' + ${keyword} + N'%'
        )
      ORDER BY p.created_at DESC
    `;

    const debts = await prisma.$queryRaw<any[]>`
      SELECT TOP 100
        d.id,
        b.id AS bookingId,
        b.booking_code AS bookingCode,
        c.full_name AS customerName,
        c.phone AS customerPhone,
        c.email AS customerEmail,
        d.total_amount AS totalAmount,
        d.paid_amount AS paidAmount,
        d.remaining_amount AS remainingAmount,
        d.due_date AS dueDate,
        d.debt_status AS debtStatus,
        d.notes,
        CASE
          WHEN d.due_date IS NOT NULL AND d.remaining_amount > 0 AND d.due_date < CAST(GETDATE() AS DATE)
          THEN DATEDIFF(DAY, d.due_date, CAST(GETDATE() AS DATE))
          ELSE 0
        END AS overdueDays
      FROM debts d
      INNER JOIN bookings b ON b.id = d.booking_id
      INNER JOIN customers c ON c.id = d.customer_id
      WHERE d.remaining_amount > 0
      ORDER BY overdueDays DESC, d.updated_at DESC
    `;

    const refunds = await prisma.$queryRaw<any[]>`
      SELECT TOP 50
        r.id,
        r.refund_code AS refundCode,
        b.booking_code AS bookingCode,
        c.full_name AS customerName,
        r.refund_amount AS refundAmount,
        r.cancellation_fee_amount AS cancellationFeeAmount,
        r.refund_status AS refundStatus,
        r.refund_method AS refundMethod,
        r.refund_at AS refundAt
      FROM refunds r
      INNER JOIN bookings b ON b.id = r.booking_id
      INNER JOIN customers c ON c.id = b.customer_id
      ORDER BY r.created_at DESC
    `;

    const bookingOptions = await prisma.$queryRaw<any[]>`
      SELECT TOP 100
        b.id,
        b.booking_code AS bookingCode,
        c.full_name AS customerName,
        t.tour_name AS tourName,
        b.total_payable_amount AS totalPayableAmount,
        b.total_payable_amount - COALESCE(paid.paidAmount, 0) AS remainingAmount
      FROM bookings b
      INNER JOIN customers c ON c.id = b.customer_id
      INNER JOIN tours t ON t.id = b.tour_id
      OUTER APPLY (
        SELECT COALESCE(SUM(p.amount), 0) AS paidAmount
        FROM payments p
        WHERE p.booking_id = b.id
          AND p.payment_status = 'PAID'
      ) paid
      WHERE b.total_payable_amount - COALESCE(paid.paidAmount, 0) > 0
      ORDER BY b.booked_at DESC
    `;

    const trend = await prisma.$queryRaw<any[]>`
      SELECT
        FORMAT(DATEADD(MONTH, -v.n, GETDATE()), 'MM/yyyy') AS label,
        COALESCE(SUM(CASE 
          WHEN p.payment_status = 'PAID'
          THEN p.amount ELSE 0 END), 0) AS revenue
      FROM (VALUES (5), (4), (3), (2), (1), (0)) v(n)
      LEFT JOIN payments p
        ON MONTH(ISNULL(p.paid_at, p.created_at)) = MONTH(DATEADD(MONTH, -v.n, GETDATE()))
        AND YEAR(ISNULL(p.paid_at, p.created_at)) = YEAR(DATEADD(MONTH, -v.n, GETDATE()))
      GROUP BY v.n, FORMAT(DATEADD(MONTH, -v.n, GETDATE()), 'MM/yyyy')
      ORDER BY v.n DESC
    `;

    return NextResponse.json({
      success: true,
      message: "Lấy dữ liệu tài chính thành công",
      data: {
        summary: {
          monthRevenue,
          pendingPaymentAmount: toNumber(summary.pendingPaymentAmount),
          paidAmount: toNumber(summary.paidAmount),
          unpaidDebtAmount: toNumber(summary.unpaidDebtAmount),
          refundAmount,
          netRevenue: Math.max(0, monthRevenue - refundAmount),
        },
        transactions: transactions.map((item) => ({
          id: toStringId(item.id),
          paymentCode: item.paymentCode,
          bookingCode: item.bookingCode,
          customerName: item.customerName,
          tourName: item.tourName,
          amount: toNumber(item.amount),
          paymentMethod: item.paymentMethod,
          paymentStatus: item.paymentStatus,
          transactionCode: item.transactionCode,
          paidAt: formatDate(item.paidAt),
          createdAt: formatDate(item.createdAt),
        })),
        debts: debts.map((item) => ({
          id: toStringId(item.id),
          bookingId: toStringId(item.bookingId),
          bookingCode: item.bookingCode,
          customerName: item.customerName,
          customerPhone: item.customerPhone,
          customerEmail: item.customerEmail,
          totalAmount: toNumber(item.totalAmount),
          paidAmount: toNumber(item.paidAmount),
          remainingAmount: toNumber(item.remainingAmount),
          dueDate: formatDate(item.dueDate),
          debtStatus: item.debtStatus,
          overdueDays: toNumber(item.overdueDays),
          notes: item.notes,
        })),
        refunds: refunds.map((item) => ({
          id: toStringId(item.id),
          refundCode: item.refundCode,
          bookingCode: item.bookingCode,
          customerName: item.customerName,
          refundAmount: toNumber(item.refundAmount),
          cancellationFeeAmount: toNumber(item.cancellationFeeAmount),
          refundStatus: item.refundStatus,
          refundMethod: item.refundMethod,
          refundAt: formatDate(item.refundAt),
        })),
        bookingOptions: bookingOptions.map((item) => ({
          id: toStringId(item.id),
          bookingCode: item.bookingCode,
          customerName: item.customerName,
          tourName: item.tourName,
          totalPayableAmount: toNumber(item.totalPayableAmount),
          remainingAmount: toNumber(item.remainingAmount),
        })),
        revenueTrend: trend.map((item) => ({
          label: item.label,
          revenue: toNumber(item.revenue),
        })),
      },
    });
  } catch (error) {
    console.error("GET /api/staff/finance error:", error);

    return NextResponse.json(
      { success: false, message: "Không lấy được dữ liệu tài chính" },
      { status: 500 }
    );
  }
}