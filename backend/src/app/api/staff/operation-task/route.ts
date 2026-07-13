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
        { success: false, message: "Bạn không có quyền xử lý tác vụ" },
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

    const taskType = String(body.taskType || "").trim();
    const refId = String(body.refId || "").trim();

    if (!taskType || !refId || refId === "undefined") {
      return NextResponse.json(
        { success: false, message: "Thiếu thông tin tác vụ cần xử lý" },
        { status: 400 }
      );
    }

    if (taskType === "BOOKING_CONFIRM") {
      await prisma.$executeRaw`
        UPDATE bookings
        SET
          booking_status = 'CONFIRMED',
          confirmed_at = ISNULL(confirmed_at, GETDATE()),
          updated_by = ${auth.user!.id}
        WHERE id = ${BigInt(refId)}
      `;
    }

    if (taskType === "EMAIL_RESEND") {
      await prisma.$executeRaw`
        UPDATE email_logs
        SET
          send_status = 'SENT',
          sent_at = GETDATE(),
          error_message = NULL
        WHERE id = ${BigInt(refId)}
      `;
    }

    if (taskType === "DOCUMENT_CHECK") {
      await prisma.$executeRaw`
        UPDATE passenger_documents
        SET
          status = 'APPROVED',
          notes = ISNULL(notes, N'Đã duyệt bởi nhân viên vận hành')
        WHERE id = ${BigInt(refId)}
      `;
    }

    if (taskType === "OPERATION_READY") {
      await prisma.$executeRaw`
        UPDATE departure_operations
        SET
          operation_status = 'READY',
          updated_at = GETDATE()
        WHERE id = ${BigInt(refId)}
      `;

      await prisma.$executeRaw`
        INSERT INTO departure_operation_logs (
          departure_id,
          log_time,
          log_type,
          content,
          created_by
        )
        SELECT
          departure_id,
          GETDATE(),
          'READY',
          N'Nhân viên đã hoàn tất checklist vận hành',
          ${auth.user!.id}
        FROM departure_operations
        WHERE id = ${BigInt(refId)}
      `;
    }

    return NextResponse.json({
      success: true,
      message: "Đã xử lý tác vụ",
      data: {
        done: true,
      },
    });
  } catch (error) {
    console.error("PATCH /api/staff/operation-task error:", error);

    return NextResponse.json(
      { success: false, message: "Không xử lý được tác vụ" },
      { status: 500 }
    );
  }
}