import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAccessToken } from "@/lib/auth";

type CurrentUserRow = {
  id: bigint;
  roleCode: string;
};

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

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
        { success: false, message: "Bạn không có quyền xác nhận đặt chỗ" },
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
        { success: false, message: "Thiếu mã đặt chỗ cần xác nhận" },
        { status: 400 }
      );
    }

    const bookingId = BigInt(id);

    const bookingRows = await prisma.$queryRaw<
      {
        id: bigint;
        booking_status: string;
      }[]
    >`
      SELECT TOP 1 id, booking_status
      FROM bookings
      WHERE id = ${bookingId}
    `;

    const booking = bookingRows[0];

    if (!booking) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy đặt chỗ" },
        { status: 404 }
      );
    }

    if (booking.booking_status === "CANCELLED") {
      return NextResponse.json(
        { success: false, message: "Booking đã hủy, không thể xác nhận" },
        { status: 400 }
      );
    }

    if (booking.booking_status === "COMPLETED") {
      return NextResponse.json(
        { success: false, message: "Booking đã hoàn thành" },
        { status: 400 }
      );
    }

    await prisma.$executeRaw`
      UPDATE bookings
      SET
        booking_status = 'CONFIRMED',
        confirmed_at = GETDATE(),
        updated_by = ${auth.user!.id}
      WHERE id = ${bookingId}
    `;

    return NextResponse.json({
      success: true,
      message: "Xác nhận đặt chỗ thành công",
      data: {
        bookingId: id,
      },
    });
  } catch (error) {
    console.error("PATCH /api/staff/booking-confirm error:", error);

    return NextResponse.json(
      { success: false, message: "Không xác nhận được đặt chỗ" },
      { status: 500 }
    );
  }
}