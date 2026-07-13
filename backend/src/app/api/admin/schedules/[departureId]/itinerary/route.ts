import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function serialize(data: any) {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

export async function GET(
  req: Request,
  context: { params: Promise<{ departureId: string }> }
) {
  try {
    const { departureId } = await context.params;
    const id = Number(departureId);

    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID lịch khởi hành không hợp lệ" },
        { status: 400 }
      );
    }

   const departure: any[] = await prisma.$queryRawUnsafe(`
  SELECT
    ds.*,
    t.tour_name,
    t.tour_code,
    t.featured_image_url,

    tg.id AS guide_id,
    tg.guide_code,
    tg.region,
    tg.languages,
    tg.experience_years,
    u.full_name AS guide_name,
    u.phone AS guide_phone

  FROM departure_schedules ds
  INNER JOIN tours t ON ds.tour_id = t.id
  LEFT JOIN tour_guides tg ON ds.guide_id = tg.id
  LEFT JOIN users u ON tg.user_id = u.id
  WHERE ds.id = ${id}
`);

    if (!departure.length) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy lịch khởi hành" },
        { status: 404 }
      );
    }

    const days = await prisma.$queryRawUnsafe(`
      SELECT
        d.id,
        d.day_no,
        d.title,
        d.description,
        d.overnight_location
      FROM itinerary_days d
      INNER JOIN itineraries i ON d.itinerary_id = i.id
      WHERE i.tour_id = ${departure[0].tour_id}
        AND i.is_active = 1
      ORDER BY d.day_no ASC
    `);

    const activities = await prisma.$queryRawUnsafe(`
      SELECT
        a.id,
        a.itinerary_day_id,
        a.activity_time,
        a.activity_title,
        a.location_name,
        a.description,
        a.sort_order
      FROM itinerary_activities a
      INNER JOIN itinerary_days d ON a.itinerary_day_id = d.id
      INNER JOIN itineraries i ON d.itinerary_id = i.id
      WHERE i.tour_id = ${departure[0].tour_id}
        AND i.is_active = 1
      ORDER BY d.day_no ASC, a.sort_order ASC, a.id ASC
    `);

    return NextResponse.json({
      success: true,
      data: serialize({
        departure: departure[0],
        days,
        activities,
      }),
    });
  } catch (error) {
    console.error("GET_ADMIN_SCHEDULE_ITINERARY_ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Không lấy được lộ trình tour" },
      { status: 500 }
    );
  }
}