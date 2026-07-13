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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(req);

  if (!auth) {
    return NextResponse.json(
      { success: false, message: "Chưa đăng nhập" },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;
    const contractId = BigInt(id);

    const result = await prisma.$queryRaw`
      SELECT
        gc.*,
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
      WHERE gc.id = ${contractId}
    `;

    const contracts = result as any[];

    if (!contracts.length) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy yêu cầu tour đoàn" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: serialize(contracts[0]),
    });
  } catch (error) {
    console.error("GET_ADMIN_GROUP_CONTRACT_DETAIL_ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Không lấy được chi tiết tour đoàn" },
      { status: 500 }
    );
  }
}