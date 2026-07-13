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

    const guests = await prisma.$queryRawUnsafe(`
      SELECT
        bp.id,
        bp.booking_id,
        bp.passenger_type,
        bp.full_name,
        bp.gender,
        bp.date_of_birth,
        bp.phone,
        bp.email,
        bp.id_number,
        bp.passport_number,
        bp.nationality,
        bp.emergency_contact_name,
        bp.emergency_contact_phone,
        bp.meal_note,
        bp.health_note,
        bp.room_preference,
        bp.is_booking_contact,

        b.booking_code,
        b.contact_name,
        b.contact_phone,
        b.contact_email,
        b.booking_status

      FROM booking_passengers bp
      INNER JOIN bookings b ON bp.booking_id = b.id
      WHERE b.departure_id = ${id}
        AND b.booking_status IN ('PENDING', 'CONFIRMED', 'PAID', 'COMPLETED')
      ORDER BY b.booking_code ASC, bp.id ASC
    `);

    return NextResponse.json({
      success: true,
      data: serialize(guests),
    });
  } catch (error) {
    console.error("GET_ADMIN_SCHEDULE_GUESTS_ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Không lấy được danh sách khách" },
      { status: 500 }
    );
  }
}