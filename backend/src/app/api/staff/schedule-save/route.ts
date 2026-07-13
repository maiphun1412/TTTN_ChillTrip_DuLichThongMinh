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
  const number = Number(value);
  if (Number.isNaN(number)) return 0;
  return number;
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
        { success: false, message: "Bạn không có quyền cập nhật lịch trình" },
        { status: 403 }
      ),
      user: null,
    };
  }

  return { error: null, user };
}

async function readPayload(request: NextRequest) {
  const body = await request.json();

  const tourId = String(body.tourId || "").trim();
  const departureCode = String(body.departureCode || "").trim();
  const startDate = String(body.startDate || "").trim();
  const endDate = String(body.endDate || "").trim();

  const maxSeats = toNumber(body.maxSeats);
  const bookedSeats = toNumber(body.bookedSeats);
  const availableSeats = toNumber(body.availableSeats);

  if (!tourId) throw new Error("Vui lòng chọn tour");
  if (!departureCode) throw new Error("Mã khởi hành không được để trống");
  if (!startDate) throw new Error("Ngày khởi hành không được để trống");
  if (!endDate) throw new Error("Ngày kết thúc không được để trống");
  if (maxSeats <= 0) throw new Error("Số chỗ tối đa phải lớn hơn 0");
  if (bookedSeats < 0) throw new Error("Số chỗ đã đặt không hợp lệ");
  if (availableSeats < 0) throw new Error("Số chỗ còn trống không hợp lệ");
  if (bookedSeats + availableSeats > maxSeats) {
    throw new Error("Tổng số chỗ đã đặt và còn trống không được vượt quá số chỗ tối đa");
  }

  return {
    id: body.id ? String(body.id) : "",
    tourId,
    departureCode,
    startDate,
    endDate,
    maxSeats,
    availableSeats,
    bookedSeats,
    bookingStatus: body.bookingStatus ? String(body.bookingStatus) : "OPEN",
    guideId: body.guideId ? String(body.guideId) : "",
    notes: body.notes ? String(body.notes).trim() : "",
  };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getCurrentStaff(request);
    if (auth.error) return auth.error;

    const body = await readPayload(request);

    const rows = await prisma.$queryRaw<{ id: bigint }[]>`
      INSERT INTO departure_schedules (
        tour_id,
        departure_code,
        start_date,
        end_date,
        max_seats,
        available_seats,
        booked_seats,
        booking_status,
        guide_id,
        notes,
        created_at,
        updated_at
      )
      OUTPUT INSERTED.id
      VALUES (
        ${BigInt(body.tourId)},
        ${body.departureCode},
        CAST(${body.startDate} AS DATE),
        CAST(${body.endDate} AS DATE),
        ${body.maxSeats},
        ${body.availableSeats},
        ${body.bookedSeats},
        ${body.bookingStatus},
        ${body.guideId ? BigInt(body.guideId) : null},
        ${body.notes || null},
        GETDATE(),
        GETDATE()
      )
    `;

    return NextResponse.json({
      success: true,
      message: "Tạo lịch khởi hành thành công",
      data: {
        id: rows[0].id.toString(),
      },
    });
  } catch (error) {
    console.error("POST /api/staff/schedule-save error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Không tạo được lịch khởi hành",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getCurrentStaff(request);
    if (auth.error) return auth.error;

    const body = await readPayload(request);

    if (!body.id || body.id === "undefined") {
      return NextResponse.json(
        { success: false, message: "Thiếu mã lịch khởi hành cần cập nhật" },
        { status: 400 }
      );
    }

    await prisma.$executeRaw`
      UPDATE departure_schedules
      SET
        tour_id = ${BigInt(body.tourId)},
        departure_code = ${body.departureCode},
        start_date = CAST(${body.startDate} AS DATE),
        end_date = CAST(${body.endDate} AS DATE),
        max_seats = ${body.maxSeats},
        available_seats = ${body.availableSeats},
        booked_seats = ${body.bookedSeats},
        booking_status = ${body.bookingStatus},
        guide_id = ${body.guideId ? BigInt(body.guideId) : null},
        notes = ${body.notes || null},
        updated_at = GETDATE()
      WHERE id = ${BigInt(body.id)}
    `;

    return NextResponse.json({
      success: true,
      message: "Cập nhật lịch khởi hành thành công",
      data: {
        id: body.id,
      },
    });
  } catch (error) {
    console.error("PATCH /api/staff/schedule-save error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Không cập nhật được lịch khởi hành",
      },
      { status: 500 }
    );
  }
}