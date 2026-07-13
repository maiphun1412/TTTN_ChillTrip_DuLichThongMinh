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

export async function PATCH(
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

    const contract = await prisma.group_contracts.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy yêu cầu tour đoàn" },
        { status: 404 }
      );
    }

    if (contract.contract_status !== "DRAFT") {
      return NextResponse.json(
        { success: false, message: "Yêu cầu này đã được xử lý" },
        { status: 400 }
      );
    }

    if (!contract.booking_id) {
      return NextResponse.json(
        { success: false, message: "Yêu cầu chưa liên kết booking" },
        { status: 400 }
      );
    }

    if (!contract.departure_id) {
      return NextResponse.json(
        { success: false, message: "Yêu cầu chưa có lịch khởi hành" },
        { status: 400 }
      );
    }

    const guestCount = Number(contract.expected_guest_count || 0);

    if (guestCount <= 0) {
      return NextResponse.json(
        { success: false, message: "Số khách dự kiến không hợp lệ" },
        { status: 400 }
      );
    }

    const departure = await prisma.departure_schedules.findUnique({
      where: { id: contract.departure_id },
    });

    if (!departure) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy lịch khởi hành" },
        { status: 404 }
      );
    }

    if (departure.booking_status !== "OPEN") {
      return NextResponse.json(
        { success: false, message: "Lịch khởi hành không còn mở bán" },
        { status: 400 }
      );
    }

    if (Number(departure.available_seats || 0) < guestCount) {
      return NextResponse.json(
        {
          success: false,
          message: `Chỉ còn ${departure.available_seats} chỗ, không đủ để duyệt tour đoàn`,
        },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.departure_schedules.update({
        where: { id: contract.departure_id! },
        data: {
          available_seats: { decrement: guestCount },
          booked_seats: { increment: guestCount },
        },
      });

      await tx.bookings.update({
        where: { id: contract.booking_id! },
        data: {
          booking_status: "CONFIRMED",
          confirmed_at: new Date(),
          updated_by: BigInt(auth.userId),
        },
      });

      const updatedContract = await tx.group_contracts.update({
        where: { id: contract.id },
        data: {
          contract_status: "ACTIVE",
          signed_date: new Date(),
        },
      });

      await tx.notifications.create({
        data: {
          user_id: BigInt(auth.userId),
          title: "Đã duyệt yêu cầu tour đoàn",
          content: `Yêu cầu tour đoàn ${contract.contract_code} đã được duyệt.`,
          notification_type: "BOOKING",
          is_read: false,
        },
      });

      return updatedContract;
    });

    return NextResponse.json({
      success: true,
      message: "Đã duyệt yêu cầu tour đoàn",
      data: serialize(result),
    });
  } catch (error) {
    console.error("APPROVE_GROUP_CONTRACT_ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Không duyệt được yêu cầu tour đoàn" },
      { status: 500 }
    );
  }
}