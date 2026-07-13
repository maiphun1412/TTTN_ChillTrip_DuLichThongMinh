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
        { success: false, message: "Bạn không có quyền cập nhật trạng thái tour" },
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id || id === "undefined") {
      return NextResponse.json(
        { success: false, message: "Thiếu mã tour cần cập nhật" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const status = String(body.status || "").trim();

    if (!status) {
      return NextResponse.json(
        { success: false, message: "Thiếu trạng thái tour" },
        { status: 400 }
      );
    }

    await prisma.$executeRaw`
      UPDATE tours
      SET
        status = ${status},
        updated_by = ${auth.user!.id},
        updated_at = GETDATE()
      WHERE id = ${BigInt(id)}
    `;

    return NextResponse.json({
      success: true,
      message: "Cập nhật trạng thái tour thành công",
      data: { id },
    });
  } catch (error) {
    console.error("PATCH /api/staff/tour-status error:", error);

    return NextResponse.json(
      { success: false, message: "Không cập nhật được trạng thái tour" },
      { status: 500 }
    );
  }
}