import { z } from "zod";

export const createPaymentSchema = z.object({
  bookingId: z.coerce.bigint(),
  paymentMethod: z.string().min(1, "Thiếu phương thức thanh toán"),
  amount: z.number().positive("Số tiền phải lớn hơn 0"),
  transactionCode: z.string().optional(),
  proofUrl: z.string().optional(),
});

export const updatePaymentSchema = z.object({
  paymentStatus: z
    .enum(["PENDING", "SUCCESS", "FAILED", "REFUNDED", "PARTIAL_REFUND"])
    .optional(),
  transactionCode: z.string().optional(),
  proofUrl: z.string().optional(),
});