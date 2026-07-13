import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAccessToken } from "@/lib/auth";

type CurrentUserRow = {
  id: bigint;
  roleCode: string;
};

type TourRow = {
  id: bigint;
  tourCode: string;
  tourName: string;
  slug: string | null;
  tourType: string;
  durationDays: number;
  durationNights: number;
  transportType: string | null;
  basePrice: number | string;
  childPrice: number | string;
  maxCapacity: number;
  shortDescription: string | null;
  description: string | null;
  featuredImageUrl: string | null;
  includedServices: string | null;
  excludedServices: string | null;
  status: string;
  isFeatured: boolean | number;
  categoryName: string | null;
  destinationName: string | null;
  destinationCity: string | null;
  destinationCountry: string | null;
  nextDepartureDate: Date | null;
  totalDepartures: number | bigint | null;
  totalMaxSeats: number | bigint | null;
  totalBookedSeats: number | bigint | null;
  totalAvailableSeats: number | bigint | null;
};

type CountRow = {
  value: number | bigint | null;
};

type SummaryRow = {
  totalTours: number | bigint | null;
  activeTours: number | bigint | null;
  todayDepartures: number | bigint | null;
  totalAvailableSeats: number | bigint | null;
  totalBookedSeats: number | bigint | null;
  totalMaxSeats: number | bigint | null;
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
        { success: false, message: "Bạn không có quyền quản lý tour" },
        { status: 403 }
      ),
      user: null,
    };
  }

  return { error: null, user };
}

function getFillRate(booked: number, max: number) {
  if (max <= 0) return 0;
  return Math.round((booked / max) * 1000) / 10;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getCurrentStaff(request);
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);

    const keyword = searchParams.get("keyword") || "";
    const status = searchParams.get("status") || "ALL";
    const region = searchParams.get("region") || "ALL";
    const tourType = searchParams.get("tourType") || "ALL";
    const page = Math.max(Number(searchParams.get("page") || 1), 1);
    const pageSize = Math.min(Math.max(Number(searchParams.get("pageSize") || 10), 5), 50);
    const offset = (page - 1) * pageSize;

    const whereRegion =
      region === "NORTH"
        ? "Bắc"
        : region === "CENTRAL"
          ? "Trung"
          : region === "SOUTH"
            ? "Nam"
            : "";

    const totalRows = await prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*) AS value
      FROM tours t
      LEFT JOIN destinations d ON d.id = t.destination_id
      WHERE
        (${status} = 'ALL' OR t.status = ${status})
        AND (${tourType} = 'ALL' OR t.tour_type = ${tourType})
        AND (
          ${whereRegion} = ''
          OR d.destination_name LIKE N'%' + ${whereRegion} + N'%'
          OR d.city LIKE N'%' + ${whereRegion} + N'%'
          OR d.destination_type LIKE N'%' + ${whereRegion} + N'%'
        )
        AND (
          ${keyword} = ''
          OR t.tour_code LIKE '%' + ${keyword} + '%'
          OR t.tour_name LIKE N'%' + ${keyword} + N'%'
          OR d.destination_name LIKE N'%' + ${keyword} + N'%'
        )
    `;

    const summaryRows = await prisma.$queryRaw<SummaryRow[]>`
      SELECT
        COUNT(DISTINCT t.id) AS totalTours,
        SUM(CASE WHEN t.status = 'ACTIVE' THEN 1 ELSE 0 END) AS activeTours,
        (
          SELECT COUNT(*)
          FROM departure_schedules ds
          WHERE CAST(ds.start_date AS DATE) = CAST(GETDATE() AS DATE)
        ) AS todayDepartures,
        COALESCE((
          SELECT SUM(ds.available_seats)
          FROM departure_schedules ds
        ), 0) AS totalAvailableSeats,
        COALESCE((
          SELECT SUM(ds.booked_seats)
          FROM departure_schedules ds
        ), 0) AS totalBookedSeats,
        COALESCE((
          SELECT SUM(ds.max_seats)
          FROM departure_schedules ds
        ), 0) AS totalMaxSeats
      FROM tours t
    `;

    const rows = await prisma.$queryRaw<TourRow[]>`
      SELECT
        t.id,
        t.tour_code AS tourCode,
        t.tour_name AS tourName,
        t.slug,
        t.tour_type AS tourType,
        t.duration_days AS durationDays,
        t.duration_nights AS durationNights,
        t.transport_type AS transportType,
        t.base_price AS basePrice,
        t.child_price AS childPrice,
        t.max_capacity AS maxCapacity,
        t.short_description AS shortDescription,
        t.description,
        t.featured_image_url AS featuredImageUrl,
        t.included_services AS includedServices,
        t.excluded_services AS excludedServices,
        t.status,
        t.is_featured AS isFeatured,
        tc.category_name AS categoryName,
        d.destination_name AS destinationName,
        d.city AS destinationCity,
        d.country AS destinationCountry,
        dsStats.nextDepartureDate,
        dsStats.totalDepartures,
        dsStats.totalMaxSeats,
        dsStats.totalBookedSeats,
        dsStats.totalAvailableSeats
      FROM tours t
      LEFT JOIN tour_categories tc ON tc.id = t.category_id
      LEFT JOIN destinations d ON d.id = t.destination_id
      OUTER APPLY (
        SELECT
          MIN(CASE WHEN ds.start_date >= CAST(GETDATE() AS DATE) THEN ds.start_date END) AS nextDepartureDate,
          COUNT(*) AS totalDepartures,
          COALESCE(SUM(ds.max_seats), 0) AS totalMaxSeats,
          COALESCE(SUM(ds.booked_seats), 0) AS totalBookedSeats,
          COALESCE(SUM(ds.available_seats), 0) AS totalAvailableSeats
        FROM departure_schedules ds
        WHERE ds.tour_id = t.id
      ) dsStats
      WHERE
        (${status} = 'ALL' OR t.status = ${status})
        AND (${tourType} = 'ALL' OR t.tour_type = ${tourType})
        AND (
          ${whereRegion} = ''
          OR d.destination_name LIKE N'%' + ${whereRegion} + N'%'
          OR d.city LIKE N'%' + ${whereRegion} + N'%'
          OR d.destination_type LIKE N'%' + ${whereRegion} + N'%'
        )
        AND (
          ${keyword} = ''
          OR t.tour_code LIKE '%' + ${keyword} + '%'
          OR t.tour_name LIKE N'%' + ${keyword} + N'%'
          OR d.destination_name LIKE N'%' + ${keyword} + N'%'
        )
      ORDER BY t.created_at DESC
      OFFSET ${offset} ROWS FETCH NEXT ${pageSize} ROWS ONLY
    `;

    const total = toNumber(totalRows[0]?.value);
    const summary = summaryRows[0];
    const totalMaxSeats = toNumber(summary?.totalMaxSeats);
    const totalBookedSeats = toNumber(summary?.totalBookedSeats);

    const tours = rows.map((item) => {
      const maxSeats = toNumber(item.totalMaxSeats);
      const bookedSeats = toNumber(item.totalBookedSeats);

      return {
        id: toStringId(item.id),
        tourCode: item.tourCode,
        tourName: item.tourName,
        slug: item.slug,
        tourType: item.tourType,
        durationDays: item.durationDays,
        durationNights: item.durationNights,
        transportType: item.transportType,
        basePrice: toNumber(item.basePrice),
        childPrice: toNumber(item.childPrice),
        maxCapacity: item.maxCapacity,
        shortDescription: item.shortDescription,
        description: item.description,
        featuredImageUrl: item.featuredImageUrl,
        includedServices: item.includedServices,
        excludedServices: item.excludedServices,
        status: item.status,
        isFeatured: Boolean(item.isFeatured),
        categoryName: item.categoryName,
        destinationName: item.destinationName,
        destinationCity: item.destinationCity,
        destinationCountry: item.destinationCountry,
        nextDepartureDate: formatDate(item.nextDepartureDate),
        totalDepartures: toNumber(item.totalDepartures),
        totalMaxSeats: maxSeats,
        totalBookedSeats: bookedSeats,
        totalAvailableSeats: toNumber(item.totalAvailableSeats),
        fillRate: getFillRate(bookedSeats, maxSeats),
      };
    });

    return NextResponse.json({
      success: true,
      message: "Lấy danh sách tour thành công",
      data: {
        tours,
        total,
        page,
        pageSize,
        totalPages: Math.max(Math.ceil(total / pageSize), 1),
        summary: {
          totalTours: toNumber(summary?.totalTours),
          activeTours: toNumber(summary?.activeTours),
          todayDepartures: toNumber(summary?.todayDepartures),
          totalAvailableSeats: toNumber(summary?.totalAvailableSeats),
          averageFillRate: getFillRate(totalBookedSeats, totalMaxSeats),
        },
      },
    });
  } catch (error) {
    console.error("GET /api/staff/tours error:", error);

    return NextResponse.json(
      { success: false, message: "Không lấy được danh sách tour" },
      { status: 500 }
    );
  }
}