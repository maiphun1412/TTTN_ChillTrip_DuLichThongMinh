import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api-response";
import { requireRole } from "@/lib/permissions";

function serialize<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = requireRole(req, ["ADMIN", "STAFF"]);

  if (!auth.ok) {
    return fail(
      auth.reason === "UNAUTHORIZED" ? "Chưa đăng nhập" : "Không có quyền",
      auth.reason === "UNAUTHORIZED" ? 401 : 403
    );
  }

  try {
    const { id } = await context.params;
    const bookingId = BigInt(id);

    const booking = await prisma.bookings.findUnique({
      where: {
        id: bookingId,
      },
    });

    if (!booking) {
      return fail("Không tìm thấy booking", 404);
    }

    const updated = await prisma.bookings.update({
      where: {
        id: bookingId,
      },
      data: {
        booking_status: "CONFIRMED",
        confirmed_at: new Date(),
      },
    });

    return ok(serialize(updated), "Xác nhận booking thành công");
  } catch (error) {
    console.error("PATCH /api/bookings/[id]/confirm error:", error);
    return fail("Không thể xác nhận booking", 500);
  }
}