import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAccessToken } from "@/lib/auth";

type CurrentUserRow = {
  id: bigint;
  roleCode: string;
};

type ScheduleRow = {
  id: bigint;
  departureCode: string;
  tourId: bigint;
  tourCode: string;
  tourName: string;
  tourImage: string | null;
  startDate: Date;
  endDate: Date;
  maxSeats: number;
  availableSeats: number;
  bookedSeats: number;
  bookingStatus: string;
  guideId: bigint | null;
  guideName: string | null;
  notes: string | null;
};

type OptionRow = {
  id: bigint;
  label: string;
};

type SummaryRow = {
  totalSchedules: number | bigint | null;
  openSchedules: number | bigint | null;
  fullSchedules: number | bigint | null;
  cancelledSchedules: number | bigint | null;
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

function formatDateInput(value: Date | string | null | undefined) {
  if (!value) return "";

  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getFillRate(bookedSeats: number, maxSeats: number) {
  if (maxSeats <= 0) return 0;
  return Math.round((bookedSeats / maxSeats) * 1000) / 10;
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
        { success: false, message: "Bạn không có quyền quản lý lịch trình" },
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

    const rows = await prisma.$queryRaw<ScheduleRow[]>`
      SELECT TOP 200
        ds.id,
        ds.departure_code AS departureCode,
        ds.tour_id AS tourId,
        t.tour_code AS tourCode,
        t.tour_name AS tourName,
        t.featured_image_url AS tourImage,
        ds.start_date AS startDate,
        ds.end_date AS endDate,
        ds.max_seats AS maxSeats,
        ds.available_seats AS availableSeats,
        ds.booked_seats AS bookedSeats,
        ds.booking_status AS bookingStatus,
        ds.guide_id AS guideId,
        u.full_name AS guideName,
        ds.notes
      FROM departure_schedules ds
      INNER JOIN tours t ON t.id = ds.tour_id
      LEFT JOIN tour_guides tg ON tg.id = ds.guide_id
      LEFT JOIN users u ON u.id = tg.user_id
      WHERE
        (${status} = 'ALL' OR ds.booking_status = ${status})
        AND (
          ${keyword} = ''
          OR ds.departure_code LIKE '%' + ${keyword} + '%'
          OR t.tour_code LIKE '%' + ${keyword} + '%'
          OR t.tour_name LIKE N'%' + ${keyword} + N'%'
          OR u.full_name LIKE N'%' + ${keyword} + N'%'
        )
      ORDER BY ds.start_date ASC
    `;

    const tourRows = await prisma.$queryRaw<OptionRow[]>`
      SELECT id, tour_name AS label
      FROM tours
      WHERE status IN ('ACTIVE', 'DRAFT', 'INACTIVE')
      ORDER BY tour_name ASC
    `;

    const guideRows = await prisma.$queryRaw<OptionRow[]>`
      SELECT tg.id, u.full_name AS label
      FROM tour_guides tg
      INNER JOIN users u ON u.id = tg.user_id
      WHERE tg.status = 'ACTIVE'
      ORDER BY u.full_name ASC
    `;

    const summaryRows = await prisma.$queryRaw<SummaryRow[]>`
      SELECT
        COUNT(*) AS totalSchedules,
        SUM(CASE WHEN booking_status = 'OPEN' THEN 1 ELSE 0 END) AS openSchedules,
        SUM(CASE WHEN booking_status = 'FULL' THEN 1 ELSE 0 END) AS fullSchedules,
        SUM(CASE WHEN booking_status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelledSchedules
      FROM departure_schedules
    `;

    const schedules = rows.map((item) => ({
      id: toStringId(item.id),
      departureCode: item.departureCode,
      tourId: toStringId(item.tourId),
      tourCode: item.tourCode,
      tourName: item.tourName,
      tourImage: item.tourImage,
      startDate: formatDateInput(item.startDate),
      endDate: formatDateInput(item.endDate),
      maxSeats: item.maxSeats,
      availableSeats: item.availableSeats,
      bookedSeats: item.bookedSeats,
      bookingStatus: item.bookingStatus,
      guideId: item.guideId ? toStringId(item.guideId) : null,
      guideName: item.guideName,
      notes: item.notes,
      fillRate: getFillRate(item.bookedSeats, item.maxSeats),
    }));

    const summary = summaryRows[0];

    return NextResponse.json({
      success: true,
      message: "Lấy danh sách lịch khởi hành thành công",
      data: {
        schedules,
        tours: tourRows.map((item) => ({
          id: toStringId(item.id),
          label: item.label,
        })),
        guides: guideRows.map((item) => ({
          id: toStringId(item.id),
          label: item.label,
        })),
        total: schedules.length,
        summary: {
          totalSchedules: toNumber(summary?.totalSchedules),
          openSchedules: toNumber(summary?.openSchedules),
          fullSchedules: toNumber(summary?.fullSchedules),
          cancelledSchedules: toNumber(summary?.cancelledSchedules),
        },
      },
    });
  } catch (error) {
    console.error("GET /api/staff/schedules error:", error);

    return NextResponse.json(
      { success: false, message: "Không lấy được lịch khởi hành" },
      { status: 500 }
    );
  }
}