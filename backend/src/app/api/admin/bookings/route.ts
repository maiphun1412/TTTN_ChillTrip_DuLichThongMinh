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

    const keyword = searchParams.get("keyword")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "";
    const page = Math.max(Number(searchParams.get("page") || 1), 1);
    const limit = Math.max(Number(searchParams.get("limit") || 10), 1);
    const offset = (page - 1) * limit;

    const where: string[] = [];
    const values: any[] = [];

    if (status) {
      where.push(`b.booking_status = @P${values.length + 1}`);
      values.push(status);
    }

    if (keyword) {
      where.push(`
        (
          b.booking_code LIKE @P${values.length + 1}
          OR b.contact_name LIKE @P${values.length + 1}
          OR b.contact_phone LIKE @P${values.length + 1}
          OR b.contact_email LIKE @P${values.length + 1}
          OR t.tour_name LIKE @P${values.length + 1}
        )
      `);
      values.push(`%${keyword}%`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const data = await prisma.$queryRawUnsafe(
      `
        SELECT
          b.id,
          b.booking_code,
          b.booking_status,
          b.contact_name,
          b.contact_phone,
          b.contact_email,
          b.adult_count,
          b.child_count,
          b.total_original_amount,
          b.discount_amount,
          b.total_payable_amount,
          b.booked_at,
          b.confirmed_at,
          b.cancelled_at,
          b.completed_at,

          c.full_name AS customer_name,
          c.email AS customer_email,
          t.tour_name,
          ds.start_date,
          ds.end_date

        FROM bookings b
        LEFT JOIN customers c ON b.customer_id = c.id
        LEFT JOIN tours t ON b.tour_id = t.id
        LEFT JOIN departure_schedules ds ON b.departure_id = ds.id
        ${whereSql}
        ORDER BY b.booked_at DESC
        OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
      `,
      ...values
    );

    const totalResult: any = await prisma.$queryRawUnsafe(
      `
        SELECT COUNT(*) AS total
        FROM bookings b
        LEFT JOIN customers c ON b.customer_id = c.id
        LEFT JOIN tours t ON b.tour_id = t.id
        LEFT JOIN departure_schedules ds ON b.departure_id = ds.id
        ${whereSql}
      `,
      ...values
    );

    const total = Number(serialize(totalResult)?.[0]?.total || 0);

    return NextResponse.json({
      success: true,
      data: serialize(data),
      pagination: {
        page,
        limit,
        total,
      },
    });
  } catch (error) {
    console.error("GET_ADMIN_BOOKINGS_ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Không lấy được danh sách đặt chỗ",
      },
      { status: 500 }
    );
  }
}