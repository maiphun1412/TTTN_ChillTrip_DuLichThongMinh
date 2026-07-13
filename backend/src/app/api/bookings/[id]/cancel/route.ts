import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api-response";
import { requireAuth } from "@/lib/permissions";
import { z } from "zod";

function serialize<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

const cancelSchema = z.object({
  reason: z.string().min(1, "Lý do hủy không được để trống"),
});

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(req);

  if (!auth) {
    return fail("Chưa đăng nhập", 401);
  }

  try {
    const { id } = await context.params;
    const body = await req.json();
    const parsed = cancelSchema.safeParse(body);

    if (!parsed.success) {
      return fail("Dữ liệu không hợp lệ", 422, parsed.error.flatten());
    }

    const booking = await prisma.bookings.findUnique({
      where: { id: BigInt(id) },
      include: {
        departure_schedules: true,
        debts: true,
      },
    });

    if (!booking) {
      return fail("Không tìm thấy booking", 404);
    }

    if (booking.booking_status === "CANCELLED") {
      return fail("Booking đã bị hủy trước đó", 422);
    }

    if (auth.roleCode === "CUSTOMER") {
      const customer = await prisma.customers.findFirst({
        where: { user_id: BigInt(auth.userId) },
      });

      if (!customer || customer.id !== booking.customer_id) {
        return fail("Bạn không có quyền hủy booking này", 403);
      }
    } else if (!["ADMIN", "STAFF"].includes(auth.roleCode)) {
      return fail("Không có quyền hủy booking", 403);
    }

    const totalPeople = booking.adult_count + booking.child_count;

    const cancelled = await prisma.$transaction(async (tx: any) => {
      const updatedBooking = await tx.bookings.update({
        where: { id: booking.id },
        data: {
          booking_status: "CANCELLED",
          cancelled_at: new Date(),
        },
      });

      await tx.departure_schedules.update({
        where: { id: booking.departure_id },
        data: {
          available_seats: { increment: totalPeople },
          booked_seats: { decrement: totalPeople },
        },
      });

      if (booking.debts) {
        await tx.debts.update({
          where: { booking_id: booking.id },
          data: {
            debt_status: "PAID",
            remaining_amount: 0,
          },
        });
      }

      await tx.cancellation_requests.create({
        data: {
          booking_id: booking.id,
          requested_by: BigInt(auth.userId),
          reason: parsed.data.reason,
          request_status: "APPROVED",
          requested_at: new Date(),
          processed_at: new Date(),
          processed_by: BigInt(auth.userId),
        },
      });

      return updatedBooking;
    });

    return ok(serialize(cancelled), "Hủy booking thành công");
  } catch (error) {
    console.error("PATCH /api/bookings/[id]/cancel error:", error);
    return fail("Không thể hủy booking", 500);
  }
}