import { prisma } from "@/lib/prisma";

function toBigIntId(value: string | number | bigint) {
  return typeof value === "bigint" ? value : BigInt(value);
}

export async function createPendingPointsForBooking(params: {
  customerId: string | number | bigint;
  bookingId: string | number | bigint;
  amount: string | number;
}) {
  const customerId = toBigIntId(params.customerId);
  const bookingId = toBigIntId(params.bookingId);
  const amount = Number(params.amount || 0);

  if (!customerId || !bookingId || amount <= 0) return null;

  const prismaAny = prisma as any;

  const existedTransaction = await prismaAny.loyalty_transactions.findFirst({
    where: {
      booking_id: bookingId,
      transaction_type: "EARN",
    },
  });

  if (existedTransaction) return existedTransaction;

  const rule = await prismaAny.loyalty_rules.findFirst({
    where: {
      status: "ACTIVE",
      min_order_amount: {
        lte: amount,
      },
    },
    orderBy: {
      id: "desc",
    },
  });

  const earnRate = Number(rule?.earn_rate || 0.0001);
  const points = Math.floor(amount * earnRate);

  if (points <= 0) return null;

  return prismaAny.loyalty_transactions.create({
    data: {
      customer_id: customerId,
      booking_id: bookingId,
      transaction_type: "EARN",
      points,
      point_status: "PENDING",
      description: `Điểm chờ xác nhận từ booking #${bookingId.toString()}`,
    },
  });
}

export async function confirmPointsForBooking(params: {
  bookingId: string | number | bigint;
}) {
  const bookingId = toBigIntId(params.bookingId);
  const prismaAny = prisma as any;

  const transaction = await prismaAny.loyalty_transactions.findFirst({
    where: {
      booking_id: bookingId,
      transaction_type: "EARN",
      point_status: "PENDING",
    },
  });

  if (!transaction) return null;

  return prisma.$transaction(async (tx) => {
    const txAny = tx as any;

    const wallet = await txAny.loyalty_wallets.upsert({
      where: {
        customer_id: transaction.customer_id,
      },
      create: {
        customer_id: transaction.customer_id,
        point_balance: transaction.points,
        total_earned: transaction.points,
        total_used: 0,
      },
      update: {
        point_balance: {
          increment: transaction.points,
        },
        total_earned: {
          increment: transaction.points,
        },
        updated_at: new Date(),
      },
    });

    const updatedTransaction = await txAny.loyalty_transactions.update({
      where: {
        id: transaction.id,
      },
      data: {
        point_status: "CONFIRMED",
        description: `Đã cộng ${transaction.points} điểm sau khi hoàn thành tour`,
      },
    });

    return {
      wallet,
      transaction: updatedTransaction,
      points: transaction.points,
    };
  });
}