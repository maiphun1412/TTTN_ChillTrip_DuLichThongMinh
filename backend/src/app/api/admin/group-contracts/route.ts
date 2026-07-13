import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/permissions";

function serialize(data: any) {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);

  if (!auth) {
    return NextResponse.json(
      { success: false, message: "Chưa đăng nhập" },
      { status: 401 }
    );
  }

  try {
    const contracts = await prisma.$queryRaw`
      SELECT
        gc.id,
        gc.booking_id,
        gc.contract_code,
        gc.customer_id,
        gc.organization_name,
        gc.representative_name,
        gc.representative_phone,
        gc.representative_email,
        gc.tour_id,
        gc.departure_id,
        gc.expected_guest_count,
        gc.contract_value,
        gc.payment_terms,
        gc.cancellation_terms,
        gc.contract_status,
        gc.signed_date,
        gc.attached_file_url,
        gc.created_at,
        gc.created_by,

        b.booking_code,
        b.booking_status,
        b.total_payable_amount,

        t.tour_name,
        t.tour_code,

        ds.start_date,
        ds.end_date,
        ds.available_seats,
        ds.booked_seats
      FROM group_contracts gc
      LEFT JOIN bookings b ON gc.booking_id = b.id
      LEFT JOIN tours t ON gc.tour_id = t.id
      LEFT JOIN departure_schedules ds ON gc.departure_id = ds.id
      ORDER BY gc.created_at DESC
    `;

    return NextResponse.json({
      success: true,
      data: serialize(contracts),
    });
  } catch (error) {
    console.error("GET_ADMIN_GROUP_CONTRACTS_ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Không lấy được danh sách tour đoàn",
      },
      { status: 500 }
    );
  }
}