import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function serialize(data: any) {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const date = searchParams.get("date");
    const status = searchParams.get("status");
    const guideId = searchParams.get("guideId");
    const keyword = searchParams.get("keyword")?.trim();

    let whereSql = "WHERE 1 = 1";

    if (date) {
      whereSql += ` AND CAST(ds.start_date AS DATE) = '${date}'`;
    }

    if (status) {
      whereSql += ` AND ds.booking_status = '${status}'`;
    } else {
      whereSql += ` AND ds.booking_status IN ('OPEN', 'CLOSED')`;
    }

    if (guideId) {
      whereSql += ` AND ds.guide_id = ${Number(guideId)}`;
    }

    if (keyword) {
      whereSql += `
        AND (
          t.tour_name LIKE N'%${keyword}%'
          OR t.tour_code LIKE N'%${keyword}%'
          OR ds.departure_code LIKE N'%${keyword}%'
          OR u.full_name LIKE N'%${keyword}%'
        )
      `;
    }

    const schedules = await prisma.$queryRawUnsafe(`
      SELECT
        ds.id,
        ds.departure_code,
        ds.start_date,
        ds.end_date,
        ds.max_seats,
        ds.available_seats,
        ds.booked_seats,
        ds.booking_status,

        t.id AS tour_id,
        t.tour_code,
        t.tour_name,
        t.tour_type,
        t.featured_image_url,

        tg.id AS guide_id,
        tg.guide_code,
        tg.region,
        tg.languages,
        tg.experience_years,
        u.full_name AS guide_name,
        u.phone AS guide_phone,

        (
          SELECT COUNT(*)
          FROM bookings b
          WHERE b.departure_id = ds.id
            AND b.booking_status IN ('PENDING', 'CONFIRMED', 'PAID', 'COMPLETED')
        ) AS booking_count,

        (
          SELECT COUNT(*)
          FROM booking_passengers bp
          INNER JOIN bookings b ON bp.booking_id = b.id
          WHERE b.departure_id = ds.id
            AND b.booking_status IN ('PENDING', 'CONFIRMED', 'PAID', 'COMPLETED')
        ) AS passenger_count

      FROM departure_schedules ds
      INNER JOIN tours t ON ds.tour_id = t.id
      LEFT JOIN tour_guides tg ON ds.guide_id = tg.id
      LEFT JOIN users u ON tg.user_id = u.id
      ${whereSql}
      ORDER BY ds.start_date ASC
    `);

    return NextResponse.json({
      success: true,
      data: serialize(schedules),
    });
  } catch (error) {
    console.error("GET_ADMIN_SCHEDULES_TODAY_ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Không lấy được lịch trình" },
      { status: 500 }
    );
  }
}