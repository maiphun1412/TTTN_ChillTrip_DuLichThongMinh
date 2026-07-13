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
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const bookingId = Number(id);

    if (!bookingId) {
      return NextResponse.json(
        { success: false, message: "ID đặt chỗ không hợp lệ" },
        { status: 400 }
      );
    }

    const booking: any = await prisma.$queryRawUnsafe(`
      SELECT
        b.*,

        c.full_name AS customer_name,
        c.email AS customer_email,
        c.phone AS customer_phone,
        c.address AS customer_address,

        t.tour_name,
        t.tour_code,
        t.tour_type,
        t.duration_days,
        t.duration_nights,
        t.featured_image_url,
        (
          SELECT TOP 1 ti.image_url
          FROM tour_images ti
          WHERE ti.tour_id = t.id
          ORDER BY ti.is_cover DESC, ti.sort_order ASC, ti.id ASC
        ) AS tour_image_url,

       ds.start_date,
ds.end_date,
ds.max_seats,
ds.booked_seats,
ds.available_seats,

        pp.point_name AS pickup_name,
        pp.address AS pickup_address,

        p.promotion_name
      FROM bookings b
      LEFT JOIN customers c ON b.customer_id = c.id
      LEFT JOIN tours t ON b.tour_id = t.id
      LEFT JOIN departure_schedules ds ON b.departure_id = ds.id
      LEFT JOIN pickup_points pp ON b.pickup_point_id = pp.id
      LEFT JOIN promotions p ON b.promotion_id = p.id
      WHERE b.id = ${bookingId}
    `);

    if (!booking?.length) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy đặt chỗ" },
        { status: 404 }
      );
    }

    const passengers = await prisma.$queryRawUnsafe(`
      SELECT *
      FROM booking_passengers
      WHERE booking_id = ${bookingId}
      ORDER BY id ASC
    `);

    const documents = await prisma.$queryRawUnsafe(`
      SELECT
        pd.*,
        bp.full_name AS passenger_name
      FROM passenger_documents pd
      INNER JOIN booking_passengers bp
        ON pd.booking_passenger_id = bp.id
      WHERE bp.booking_id = ${bookingId}
      ORDER BY pd.id ASC
    `);

    const promotions = await prisma.$queryRawUnsafe(`
      SELECT
        bp.*,
        p.promotion_name
      FROM booking_promotions bp
      INNER JOIN promotions p ON bp.promotion_id = p.id
      WHERE bp.booking_id = ${bookingId}
    `);

    const itineraryDays = await prisma.$queryRawUnsafe(`
      SELECT
        d.id,
        d.day_no,
        d.title,
        d.description,
        d.overnight_location
      FROM itinerary_days d
      INNER JOIN itineraries i ON d.itinerary_id = i.id
      INNER JOIN bookings b ON b.tour_id = i.tour_id
      WHERE b.id = ${bookingId}
        AND i.is_active = 1
      ORDER BY d.day_no ASC
    `);

    const itineraryActivities = await prisma.$queryRawUnsafe(`
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
      INNER JOIN bookings b ON b.tour_id = i.tour_id
      WHERE b.id = ${bookingId}
        AND i.is_active = 1
      ORDER BY d.day_no ASC, a.sort_order ASC, a.id ASC
    `);

    return NextResponse.json({
      success: true,
      data: serialize({
        booking: booking[0],
        passengers,
        documents,
        promotions,
        itineraryDays,
        itineraryActivities,
      }),
    });
  } catch (error) {
    console.error("GET_ADMIN_BOOKING_DETAIL_ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Không lấy được chi tiết đặt chỗ" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const bookingId = Number(id);

    if (!bookingId) {
      return NextResponse.json(
        { success: false, message: "ID đặt chỗ không hợp lệ" },
        { status: 400 }
      );
    }

    const body = await req.json();

    const updated = await prisma.bookings.update({
      where: { id: BigInt(bookingId) },
      data: {
        contact_name: String(body.contactName || "").trim(),
        contact_phone: String(body.contactPhone || "").trim(),
        contact_email: body.contactEmail
          ? String(body.contactEmail).trim()
          : null,
        special_notes: body.specialNotes
          ? String(body.specialNotes).trim()
          : null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Cập nhật đặt chỗ thành công",
      data: serialize(updated),
    });
  } catch (error) {
    console.error("UPDATE_ADMIN_BOOKING_ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Không cập nhật được đặt chỗ" },
      { status: 500 }
    );
  }
}