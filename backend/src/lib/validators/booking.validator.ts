import { z } from "zod";

export const createBookingSchema = z.object({
  customerId: z.coerce.bigint(),
  tourId: z.coerce.bigint(),
  departureId: z.coerce.bigint(),
  pickupPointId: z.coerce.bigint().optional(),
  promotionId: z.coerce.bigint().optional(),
  contactName: z.string().min(2, "Tên liên hệ tối thiểu 2 ký tự"),
  contactPhone: z.string().min(8, "Số điện thoại không hợp lệ"),
  contactEmail: z.string().email("Email không hợp lệ").optional().or(z.literal("")),
  adultCount: z.number().int().min(1, "Phải có ít nhất 1 người lớn"),
  childCount: z.number().int().min(0).default(0),
  specialNotes: z.string().optional(),
});

export const updateBookingSchema = z.object({
  contactName: z.string().min(2).optional(),
  contactPhone: z.string().min(8).optional(),
  contactEmail: z.string().email("Email không hợp lệ").optional().or(z.literal("")),
  bookingStatus: z
    .enum([
      "PENDING",
      "RESERVED",
      "CONFIRMED",
      "PARTIALLY_PAID",
      "PAID",
      "CANCELLED",
      "COMPLETED",
    ])
    .optional(),
  specialNotes: z.string().optional(),
});

export const cancelBookingSchema = z.object({
  reason: z.string().min(1, "Lý do hủy không được để trống"),
});