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

    const result = await prisma.$transaction(async (tx) => {
      if (contract.booking_id) {
        await tx.bookings.update({
          where: { id: contract.booking_id },
          data: {
            booking_status: "CANCELLED",
            cancelled_at: new Date(),
            updated_by: BigInt(auth.userId),
          },
        });
      }

      const updatedContract = await tx.group_contracts.update({
        where: { id: contract.id },
        data: {
          contract_status: "REJECTED",
        },
      });

      await tx.notifications.create({
        data: {
          user_id: BigInt(auth.userId),
          title: "Đã từ chối yêu cầu tour đoàn",
          content: `Yêu cầu tour đoàn ${contract.contract_code} đã bị từ chối.`,
          notification_type: "BOOKING",
          is_read: false,
        },
      });

      return updatedContract;
    });

    return NextResponse.json({
      success: true,
      message: "Đã từ chối yêu cầu tour đoàn",
      data: serialize(result),
    });
  } catch (error) {
    console.error("REJECT_GROUP_CONTRACT_ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Không từ chối được yêu cầu tour đoàn" },
      { status: 500 }
    );
  }
}