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
        { success: false, message: "Bạn không có quyền tạo thông báo khẩn" },
        { status: 403 }
      ),
      user: null,
    };
  }

  return { error: null, user };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getCurrentStaff(request);
    if (auth.error) return auth.error;

    const body = await request.json();

    const title = String(body.title || "").trim();
    const content = String(body.content || "").trim();
    const targetRole = String(body.targetRole || "ALL").trim();

    if (!title) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập tiêu đề thông báo" },
        { status: 400 }
      );
    }

    if (!content) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập nội dung thông báo" },
        { status: 400 }
      );
    }

    if (targetRole === "ALL") {
      await prisma.$executeRaw`
        INSERT INTO notifications (
          user_id,
          title,
          content,
          notification_type,
          is_read,
          created_at
        )
        SELECT
          u.id,
          ${title},
          ${content},
          'OPERATION_URGENT',
          0,
          GETDATE()
        FROM users u
        INNER JOIN roles r ON r.id = u.role_id
        WHERE r.code IN ('STAFF', 'ADMIN', 'GUIDE')
          AND u.status = 'ACTIVE'
      `;
    } else {
      await prisma.$executeRaw`
        INSERT INTO notifications (
          user_id,
          title,
          content,
          notification_type,
          is_read,
          created_at
        )
        SELECT
          u.id,
          ${title},
          ${content},
          'OPERATION_URGENT',
          0,
          GETDATE()
        FROM users u
        INNER JOIN roles r ON r.id = u.role_id
        WHERE r.code = ${targetRole}
          AND u.status = 'ACTIVE'
      `;
    }

    return NextResponse.json({
      success: true,
      message: "Đã tạo thông báo khẩn",
      data: {
        sent: true,
      },
    });
  } catch (error) {
    console.error("POST /api/staff/operation-notice error:", error);

    return NextResponse.json(
      { success: false, message: "Không tạo được thông báo khẩn" },
      { status: 500 }
    );
  }
}