import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api-response";
import { requireAuth, requireRole } from "@/lib/permissions";
import { z } from "zod";

function serialize<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

const updateDepartureSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  maxSeats: z.number().int().min(1).optional(),
  availableSeats: z.number().int().min(0).optional(),
  bookedSeats: z.number().int().min(0).optional(),
  bookingStatus: z.enum(["OPEN", "FULL", "CLOSED", "CANCELLED"]).optional(),
  notes: z.string().optional(),
});

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(req);
  if (!auth) return fail("Chưa đăng nhập", 401);

  try {
    const { id } = await context.params;

    const departure = await prisma.departureSchedule.findUnique({
      where: { id: BigInt(id) },
      include: {
        tour: true,
        bookings: true,
      },
    });

    if (!departure) return fail("Không tìm thấy đợt khởi hành", 404);

    return ok(serialize(departure), "Lấy chi tiết đợt khởi hành thành công");
  } catch (error) {
    console.error("GET /api/departures/[id] error:", error);
    return fail("Không thể lấy chi tiết đợt khởi hành", 500);
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(req, ["ADMIN", "STAFF"]);
  if (!auth.ok) {
    return fail(
      auth.reason === "UNAUTHORIZED" ? "Chưa đăng nhập" : "Không có quyền",
      auth.reason === "UNAUTHORIZED" ? 401 : 403
    );
  }

  try {
    const { id } = await context.params;
    const body = await req.json();
    const parsed = updateDepartureSchema.safeParse(body);

    if (!parsed.success) {
      return fail("Dữ liệu không hợp lệ", 422, parsed.error.flatten());
    }

    const existed = await prisma.departureSchedule.findUnique({
      where: { id: BigInt(id) },
    });

    if (!existed) return fail("Không tìm thấy đợt khởi hành", 404);

    const startDate =
      parsed.data.startDate !== undefined
        ? new Date(parsed.data.startDate)
        : existed.startDate;
    const endDate =
      parsed.data.endDate !== undefined
        ? new Date(parsed.data.endDate)
        : existed.endDate;

    if (endDate < startDate) {
      return fail("Ngày kết thúc phải lớn hơn hoặc bằng ngày khởi hành", 422);
    }

    const updated = await prisma.departureSchedule.update({
      where: { id: BigInt(id) },
      data: {
        ...(parsed.data.startDate !== undefined ? { startDate } : {}),
        ...(parsed.data.endDate !== undefined ? { endDate } : {}),
        ...(parsed.data.maxSeats !== undefined ? { maxSeats: parsed.data.maxSeats } : {}),
        ...(parsed.data.availableSeats !== undefined
          ? { availableSeats: parsed.data.availableSeats }
          : {}),
        ...(parsed.data.bookedSeats !== undefined
          ? { bookedSeats: parsed.data.bookedSeats }
          : {}),
        ...(parsed.data.bookingStatus !== undefined
          ? { bookingStatus: parsed.data.bookingStatus }
          : {}),
        ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes || null } : {}),
      },
      include: {
        tour: true,
      },
    });

    return ok(serialize(updated), "Cập nhật đợt khởi hành thành công");
  } catch (error) {
    console.error("PATCH /api/departures/[id] error:", error);
    return fail("Không thể cập nhật đợt khởi hành", 500);
  }
}