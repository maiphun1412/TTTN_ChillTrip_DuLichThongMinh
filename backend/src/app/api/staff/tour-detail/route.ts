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
        { success: false, message: "Bạn không có quyền xem tour" },
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
    const id = searchParams.get("id");

    if (!id || id === "undefined") {
      return NextResponse.json(
        { success: false, message: "Thiếu mã tour cần xem chi tiết" },
        { status: 400 }
      );
    }

    const tourId = BigInt(id);

    const tourRows = await prisma.$queryRaw<any[]>`
      SELECT TOP 1
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
      WHERE t.id = ${tourId}
    `;

    const tour = tourRows[0];

    if (!tour) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy tour" },
        { status: 404 }
      );
    }

    const departures = await prisma.$queryRaw<any[]>`
      SELECT
        ds.id,
        ds.departure_code AS departureCode,
        ds.start_date AS startDate,
        ds.end_date AS endDate,
        ds.max_seats AS maxSeats,
        ds.available_seats AS availableSeats,
        ds.booked_seats AS bookedSeats,
        ds.booking_status AS bookingStatus,
        u.full_name AS guideName
      FROM departure_schedules ds
      LEFT JOIN tour_guides tg ON tg.id = ds.guide_id
      LEFT JOIN users u ON u.id = tg.user_id
      WHERE ds.tour_id = ${tourId}
      ORDER BY ds.start_date ASC
    `;

    const itineraryDays = await prisma.$queryRaw<any[]>`
      SELECT
        iday.id,
        iday.day_no AS dayNo,
        iday.title,
        iday.description,
        iday.overnight_location AS overnightLocation
      FROM itineraries i
      INNER JOIN itinerary_days iday ON iday.itinerary_id = i.id
      WHERE i.tour_id = ${tourId}
        AND i.is_active = 1
      ORDER BY iday.day_no ASC
    `;

    const maxSeats = toNumber(tour.totalMaxSeats);
    const bookedSeats = toNumber(tour.totalBookedSeats);
    const fillRate = maxSeats <= 0 ? 0 : Math.round((bookedSeats / maxSeats) * 1000) / 10;

    return NextResponse.json({
      success: true,
      message: "Lấy chi tiết tour thành công",
      data: {
        tour: {
          id: toStringId(tour.id),
          tourCode: tour.tourCode,
          tourName: tour.tourName,
          slug: tour.slug,
          tourType: tour.tourType,
          durationDays: tour.durationDays,
          durationNights: tour.durationNights,
          transportType: tour.transportType,
          basePrice: toNumber(tour.basePrice),
          childPrice: toNumber(tour.childPrice),
          maxCapacity: tour.maxCapacity,
          shortDescription: tour.shortDescription,
          description: tour.description,
          featuredImageUrl: tour.featuredImageUrl,
          includedServices: tour.includedServices,
          excludedServices: tour.excludedServices,
          status: tour.status,
          isFeatured: Boolean(tour.isFeatured),
          categoryName: tour.categoryName,
          destinationName: tour.destinationName,
          destinationCity: tour.destinationCity,
          destinationCountry: tour.destinationCountry,
          nextDepartureDate: formatDate(tour.nextDepartureDate),
          totalDepartures: toNumber(tour.totalDepartures),
          totalMaxSeats: maxSeats,
          totalBookedSeats: bookedSeats,
          totalAvailableSeats: toNumber(tour.totalAvailableSeats),
          fillRate,
        },
        departures: departures.map((item) => ({
          id: toStringId(item.id),
          departureCode: item.departureCode,
          startDate: formatDate(item.startDate),
          endDate: formatDate(item.endDate),
          maxSeats: toNumber(item.maxSeats),
          availableSeats: toNumber(item.availableSeats),
          bookedSeats: toNumber(item.bookedSeats),
          bookingStatus: item.bookingStatus,
          guideName: item.guideName,
        })),
        itineraryDays: itineraryDays.map((item) => ({
          id: toStringId(item.id),
          dayNo: item.dayNo,
          title: item.title,
          description: item.description,
          overnightLocation: item.overnightLocation,
        })),
      },
    });
  } catch (error) {
    console.error("GET /api/staff/tour-detail error:", error);

    return NextResponse.json(
      { success: false, message: "Không lấy được chi tiết tour" },
      { status: 500 }
    );
  }
}