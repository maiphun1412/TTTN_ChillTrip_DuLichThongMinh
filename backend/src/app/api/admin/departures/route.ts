import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api-response";
import { requireRole } from "@/lib/permissions";
import { z } from "zod";

function serialize<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

const createDepartureSchema = z.object({
  tourId: z.coerce.bigint(),
  departureCode: z.string().min(2, "Mã đợt khởi hành không hợp lệ"),
  startDate: z.string().min(1, "Thiếu ngày khởi hành"),
  endDate: z.string().min(1, "Thiếu ngày kết thúc"),
  maxSeats: z.number().int().min(1),
  availableSeats: z.number().int().min(0),
  bookedSeats: z.number().int().min(0).default(0),
  bookingStatus: z.enum(["OPEN", "FULL", "CLOSED", "CANCELLED"]).default("OPEN"),
  notes: z.string().optional(),
});

export async function GET(req: Request) {
  const auth = requireRole(req, ["ADMIN"]);
  if (!auth.ok) {
    return fail(
      auth.reason === "UNAUTHORIZED" ? "Chưa đăng nhập" : "Không có quyền",
      auth.reason === "UNAUTHORIZED" ? 401 : 403
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const keyword = searchParams.get("keyword")?.trim() || "";
    const bookingStatus = searchParams.get("bookingStatus")?.trim() || "";
    const tourId = searchParams.get("tourId")?.trim() || "";

    const departures = await prisma.departureSchedule.findMany({
      where: {
        ...(keyword
          ? {
              OR: [
                { departureCode: { contains: keyword } },
                { notes: { contains: keyword } },
                { tour: { tourName: { contains: keyword } } },
              ],
            }
          : {}),
        ...(bookingStatus ? { bookingStatus } : {}),
        ...(tourId ? { tourId: BigInt(tourId) } : {}),
      },
      include: {
        tour: true,
      },
      orderBy: {
        startDate: "asc",
      },
    });

    return ok(serialize(departures), "Lấy danh sách đợt khởi hành thành công");
  } catch (error) {
    console.error("GET /api/admin/departures error:", error);
    return fail("Không thể lấy danh sách đợt khởi hành", 500);
  }
}

export async function POST(req: Request) {
  const auth = requireRole(req, ["ADMIN"]);
  if (!auth.ok) {
    return fail(
      auth.reason === "UNAUTHORIZED" ? "Chưa đăng nhập" : "Không có quyền",
      auth.reason === "UNAUTHORIZED" ? 401 : 403
    );
  }

  try {
    const body = await req.json();
    const parsed = createDepartureSchema.safeParse(body);

    if (!parsed.success) {
      return fail("Dữ liệu không hợp lệ", 422, parsed.error.flatten());
    }

    const data = parsed.data;

    if (new Date(data.endDate) < new Date(data.startDate)) {
      return fail("Ngày kết thúc phải lớn hơn hoặc bằng ngày khởi hành", 422);
    }

    if (data.bookedSeats > data.maxSeats) {
      return fail("Số chỗ đã đặt không được lớn hơn số chỗ tối đa", 422);
    }

    if (data.availableSeats > data.maxSeats) {
      return fail("Số chỗ còn lại không được lớn hơn số chỗ tối đa", 422);
    }

    const tour = await prisma.tour.findUnique({
      where: { id: data.tourId },
    });

    if (!tour) {
      return fail("Không tìm thấy tour", 404);
    }

    const existed = await prisma.departureSchedule.findUnique({
      where: { departureCode: data.departureCode },
    });

    if (existed) {
      return fail("Mã đợt khởi hành đã tồn tại", 409);
    }

    const created = await prisma.departureSchedule.create({
      data: {
        tourId: data.tourId,
        departureCode: data.departureCode,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        maxSeats: data.maxSeats,
        availableSeats: data.availableSeats,
        bookedSeats: data.bookedSeats,
        bookingStatus: data.bookingStatus,
        notes: data.notes || null,
      },
      include: {
        tour: true,
      },
    });

    return ok(serialize(created), "Tạo đợt khởi hành thành công", 201);
  } catch (error) {
    console.error("POST /api/admin/departures error:", error);
    return fail("Không thể tạo đợt khởi hành", 500);
  }
}