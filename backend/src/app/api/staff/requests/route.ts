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

function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return null;

  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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
        { success: false, message: "Bạn không có quyền xem email và yêu cầu" },
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
    const emailStatus = searchParams.get("emailStatus") || "ALL";
    const requestStatus = searchParams.get("requestStatus") || "ALL";

    const summaryRows = await prisma.$queryRaw<any[]>`
      SELECT
        (SELECT COUNT(*) FROM email_logs WHERE send_status = 'PENDING') AS pendingEmails,
        (
          SELECT COUNT(*)
          FROM email_logs
          WHERE send_status = 'SENT'
            AND CAST(sent_at AS DATE) = CAST(GETDATE() AS DATE)
        ) AS sentToday,
        (SELECT COUNT(*) FROM email_logs WHERE send_status = 'FAILED') AS failedEmails,
        (SELECT COUNT(*) FROM cancellation_requests WHERE request_status = 'PENDING') AS pendingRequests,
        (
          SELECT COUNT(*)
          FROM cancellation_requests
          WHERE request_status <> 'PENDING'
        ) AS processedRequests
    `;

    const emails = await prisma.$queryRaw<any[]>`
      SELECT TOP 150
        e.id,
        b.booking_code AS bookingCode,
        c.full_name AS customerName,
        t.tour_name AS tourName,
        e.recipient_email AS recipientEmail,
        e.subject,
        e.body,
        e.send_status AS sendStatus,
        e.sent_at AS sentAt,
        e.error_message AS errorMessage,
        e.created_at AS createdAt
      FROM email_logs e
      LEFT JOIN bookings b ON b.id = e.booking_id
      LEFT JOIN customers c ON c.id = ISNULL(e.customer_id, b.customer_id)
      LEFT JOIN tours t ON t.id = b.tour_id
      WHERE
        (${emailStatus} = 'ALL' OR e.send_status = ${emailStatus})
        AND (
          ${keyword} = ''
          OR e.recipient_email LIKE '%' + ${keyword} + '%'
          OR e.subject LIKE N'%' + ${keyword} + N'%'
          OR b.booking_code LIKE '%' + ${keyword} + '%'
          OR c.full_name LIKE N'%' + ${keyword} + N'%'
          OR t.tour_name LIKE N'%' + ${keyword} + N'%'
        )
      ORDER BY e.created_at DESC
    `;

    const requests = await prisma.$queryRaw<any[]>`
      SELECT TOP 150
        cr.id,
        b.id AS bookingId,
        b.booking_code AS bookingCode,
        c.full_name AS customerName,
        c.email AS customerEmail,
        c.phone AS customerPhone,
        t.tour_name AS tourName,
        cr.reason,
        cr.request_status AS requestStatus,
        cr.requested_at AS requestedAt,
        cr.processed_at AS processedAt
      FROM cancellation_requests cr
      INNER JOIN bookings b ON b.id = cr.booking_id
      INNER JOIN customers c ON c.id = b.customer_id
      INNER JOIN tours t ON t.id = b.tour_id
      WHERE
        (${requestStatus} = 'ALL' OR cr.request_status = ${requestStatus})
        AND (
          ${keyword} = ''
          OR b.booking_code LIKE '%' + ${keyword} + '%'
          OR c.full_name LIKE N'%' + ${keyword} + N'%'
          OR c.email LIKE '%' + ${keyword} + '%'
          OR c.phone LIKE '%' + ${keyword} + '%'
          OR t.tour_name LIKE N'%' + ${keyword} + N'%'
        )
      ORDER BY cr.requested_at DESC
    `;

    const customers = await prisma.$queryRaw<any[]>`
      SELECT TOP 200
        c.id AS customerId,
        b.id AS bookingId,
        b.booking_code AS bookingCode,
        c.full_name AS customerName,
        c.email AS customerEmail,
        t.tour_name AS tourName
      FROM customers c
      LEFT JOIN bookings b ON b.customer_id = c.id
      LEFT JOIN tours t ON t.id = b.tour_id
      WHERE c.email IS NOT NULL
      ORDER BY c.created_at DESC
    `;

    const summary = summaryRows[0] || {};

    return NextResponse.json({
      success: true,
      message: "Lấy dữ liệu email và yêu cầu thành công",
      data: {
        summary: {
          pendingEmails: toNumber(summary.pendingEmails),
          sentToday: toNumber(summary.sentToday),
          failedEmails: toNumber(summary.failedEmails),
          pendingRequests: toNumber(summary.pendingRequests),
          processedRequests: toNumber(summary.processedRequests),
        },
        emails: emails.map((item) => ({
          id: toStringId(item.id),
          bookingCode: item.bookingCode,
          customerName: item.customerName,
          tourName: item.tourName,
          recipientEmail: item.recipientEmail,
          subject: item.subject,
          body: item.body,
          sendStatus: item.sendStatus,
          sentAt: formatDateTime(item.sentAt),
          errorMessage: item.errorMessage,
          createdAt: formatDateTime(item.createdAt),
        })),
        requests: requests.map((item) => ({
          id: toStringId(item.id),
          bookingId: toStringId(item.bookingId),
          bookingCode: item.bookingCode,
          customerName: item.customerName,
          customerEmail: item.customerEmail,
          customerPhone: item.customerPhone,
          tourName: item.tourName,
          reason: item.reason,
          requestStatus: item.requestStatus,
          requestedAt: formatDateTime(item.requestedAt),
          processedAt: formatDateTime(item.processedAt),
        })),
        customers: customers.map((item) => ({
          customerId: toStringId(item.customerId),
          bookingId: item.bookingId ? toStringId(item.bookingId) : null,
          bookingCode: item.bookingCode,
          customerName: item.customerName,
          customerEmail: item.customerEmail,
          tourName: item.tourName,
        })),
      },
    });
  } catch (error) {
    console.error("GET /api/staff/requests error:", error);

    return NextResponse.json(
      { success: false, message: "Không lấy được dữ liệu email và yêu cầu" },
      { status: 500 }
    );
  }
}