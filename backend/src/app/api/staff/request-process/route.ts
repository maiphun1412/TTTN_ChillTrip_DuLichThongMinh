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
        { success: false, message: "Bạn không có quyền xử lý yêu cầu" },
        { status: 403 }
      ),
      user: null,
    };
  }

  return { error: null, user };
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getCurrentStaff(request);
    if (auth.error) return auth.error;

    const body = await request.json();

    const requestId = String(body.requestId || "").trim();
    const action = String(body.action || "").trim();
    const note = body.note ? String(body.note).trim() : "";

    if (!requestId || requestId === "undefined") {
      return NextResponse.json(
        { success: false, message: "Thiếu mã yêu cầu cần xử lý" },
        { status: 400 }
      );
    }

    if (action !== "APPROVED" && action !== "REJECTED") {
      return NextResponse.json(
        { success: false, message: "Trạng thái xử lý không hợp lệ" },
        { status: 400 }
      );
    }

    await prisma.$executeRaw`
      UPDATE cancellation_requests
      SET
        request_status = ${action},
        processed_at = GETDATE(),
        processed_by = ${auth.user!.id}
      WHERE id = ${BigInt(requestId)}
    `;

    if (action === "APPROVED") {
      await prisma.$executeRaw`
        UPDATE bookings
        SET
          booking_status = 'CANCELLED',
          cancelled_at = ISNULL(cancelled_at, GETDATE()),
          updated_by = ${auth.user!.id}
        WHERE id = (
          SELECT booking_id
          FROM cancellation_requests
          WHERE id = ${BigInt(requestId)}
        )
      `;
    }

    const requestRows = await prisma.$queryRaw<any[]>`
      SELECT TOP 1
        cr.id,
        cr.booking_id AS bookingId,
        b.booking_code AS bookingCode,
        c.id AS customerId,
        c.email AS customerEmail,
        c.full_name AS customerName
      FROM cancellation_requests cr
      INNER JOIN bookings b ON b.id = cr.booking_id
      INNER JOIN customers c ON c.id = b.customer_id
      WHERE cr.id = ${BigInt(requestId)}
    `;

    const requestInfo = requestRows[0];

    if (requestInfo?.customerEmail) {
      const subject =
        action === "APPROVED"
          ? `Yêu cầu hủy booking ${requestInfo.bookingCode} đã được duyệt`
          : `Yêu cầu hủy booking ${requestInfo.bookingCode} chưa được duyệt`;

      const content =
        action === "APPROVED"
          ? `ChillTrip đã duyệt yêu cầu hủy booking ${requestInfo.bookingCode}. ${note}`
          : `ChillTrip chưa thể duyệt yêu cầu hủy booking ${requestInfo.bookingCode}. ${note}`;

      await prisma.$executeRaw`
        INSERT INTO email_logs (
          booking_id,
          customer_id,
          recipient_email,
          subject,
          body,
          send_status,
          sent_at,
          created_at
        )
        VALUES (
          ${requestInfo.bookingId},
          ${requestInfo.customerId},
          ${requestInfo.customerEmail},
          ${subject},
          ${content},
          'SENT',
          GETDATE(),
          GETDATE()
        )
      `;
    }

    return NextResponse.json({
      success: true,
      message: "Đã xử lý yêu cầu",
      data: {
        processed: true,
      },
    });
  } catch (error) {
    console.error("PATCH /api/staff/request-process error:", error);

    return NextResponse.json(
      { success: false, message: "Không xử lý được yêu cầu" },
      { status: 500 }
    );
  }
}