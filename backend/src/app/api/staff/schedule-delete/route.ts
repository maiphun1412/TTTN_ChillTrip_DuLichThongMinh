import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAccessToken } from "@/lib/auth";

type CurrentUserRow = {
  id: bigint;
  roleCode: string;
};

type BookingCountRow = {
  totalBookings: number | bigint | null;
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
        { success: false, message: "Bạn không có quyền xóa lịch khởi hành" },
        { status: 403 }
      ),
      user: null,
    };
  }

  return { error: null, user };
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await getCurrentStaff(request);
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id || id === "undefined") {
      return NextResponse.json(
        { success: false, message: "Thiếu mã lịch khởi hành cần xóa" },
        { status: 400 }
      );
    }

    const scheduleId = BigInt(id);

    const bookingRows = await prisma.$queryRaw<BookingCountRow[]>`
      SELECT COUNT(*) AS totalBookings
      FROM bookings
      WHERE departure_id = ${scheduleId}
    `;

    const totalBookings = toNumber(bookingRows[0]?.totalBookings);

    if (totalBookings > 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Lịch khởi hành này đã có booking, không thể xóa. Hãy chuyển sang trạng thái Đã hủy hoặc Đã đóng.",
        },
        { status: 400 }
      );
    }

    await prisma.$executeRaw`
      DELETE FROM departure_schedules
      WHERE id = ${scheduleId}
    `;

    return NextResponse.json({
      success: true,
      message: "Xóa lịch khởi hành thành công",
      data: {
        id,
      },
    });
  } catch (error) {
    console.error("DELETE /api/staff/schedule-delete error:", error);

    return NextResponse.json(
      { success: false, message: "Không xóa được lịch khởi hành" },
      { status: 500 }
    );
  }
}