import { prisma } from "@/lib/prisma";

function makePaymentCode() {
  return `PAY${Date.now()}`;
}

export const paymentService = {
  async create(input: {
    bookingId: bigint;
    paymentMethod: string;
    amount: number;
    transactionCode?: string;
    proofUrl?: string;
    createdBy?: bigint;
    status?: "PENDING" | "SUCCESS" | "PAID" | "FAILED";
  }) {
    const booking = await prisma.bookings.findUnique({
      where: { id: input.bookingId },
      include: {
        debts: true,
        payments: true,
      },
    });

    if (!booking) {
      throw new Error("BOOKING_NOT_FOUND");
    }

    if (!booking.debts) {
      throw new Error("DEBT_NOT_FOUND");
    }

    const paymentStatus = input.status || "PENDING";

    const paidSuccess = booking.payments
      .filter(
        (p) => p.payment_status === "SUCCESS" || p.payment_status === "PAID"
      )
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const nextPaid =
      paymentStatus === "SUCCESS" || paymentStatus === "PAID"
        ? paidSuccess + input.amount
        : paidSuccess;

    if (nextPaid > Number(booking.total_payable_amount)) {
      throw new Error("PAYMENT_EXCEEDS_TOTAL");
    }

    return prisma.$transaction(async (tx) => {
      const payment = await tx.payments.create({
        data: {
          booking_id: input.bookingId,
          payment_code: makePaymentCode(),
          payment_method: input.paymentMethod,
          amount: input.amount,
          payment_status: paymentStatus,
          transaction_code: input.transactionCode || null,
          proof_url: input.proofUrl || null,
          paid_at:
            paymentStatus === "SUCCESS" || paymentStatus === "PAID"
              ? new Date()
              : null,
          created_by: input.createdBy || null,
        },
      });

      if (paymentStatus === "SUCCESS" || paymentStatus === "PAID") {
        const remainingAmount = Number(booking.total_payable_amount) - nextPaid;

        const debtStatus =
          remainingAmount <= 0 ? "PAID" : nextPaid > 0 ? "PARTIAL" : "UNPAID";

        const bookingStatus =
          remainingAmount <= 0 ? "PAID" : "PARTIALLY_PAID";

        await tx.debts.update({
          where: { booking_id: booking.id },
          data: {
            paid_amount: nextPaid,
            remaining_amount: remainingAmount,
            debt_status: debtStatus,
            updated_at: new Date(),
          },
        });

        await tx.bookings.update({
          where: { id: booking.id },
          data: {
            booking_status: bookingStatus,
          },
        });
      }

      return payment;
    });
  },

  async getById(id: bigint) {
    const payment = await prisma.payments.findUnique({
      where: { id },
      include: {
        bookings: {
          include: {
            customers: true,
            tours: true,
          },
        },
      },
    });

    if (!payment) {
      throw new Error("PAYMENT_NOT_FOUND");
    }

    return payment;
  },
};