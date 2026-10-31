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

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(req, ["ADMIN"]);
  if (!auth.ok) {
    return fail(
      auth.reason === "UNAUTHORIZED" ? "Chưa đăng nhập" : "Không có quyền",
      auth.reason === "UNAUTHORIZED" ? 401 : 403
    );
  }

  try {
    const { id } = await context.params;
    const userId = Number(id);

    if (!userId) {
      return fail("ID nhân sự không hợp lệ", 400);
    }

    const guide = await prisma.tour_guides.findUnique({
      where: { user_id: userId },
    });

    if (!guide) {
      return ok([], "Nhân sự này không phải hướng dẫn viên");
    }

    const schedules = await prisma.departure_schedules.findMany({
      where: {
        guide_id: guide.id,
      },
      include: {
        tours: true,
      },
      orderBy: {
        start_date: "asc",
      },
    });

    const data = schedules.map((item) => ({
      id: item.id,
      departureCode: item.departure_code,
      title: item.tours?.tour_name || "Tour chưa có tên",
      tourCode: item.tours?.tour_code || "",
      startDate: item.start_date,
      endDate: item.end_date,
      bookingStatus: item.booking_status,
      notes: item.notes,
      type: "TOUR",
    }));

    return ok(serialize(data), "Lấy lịch làm việc hướng dẫn viên thành công");
  } catch (error) {
    console.error("GET /api/admin/users/[id]/schedules error:", error);
    return fail("Không thể lấy lịch làm việc hướng dẫn viên", 500);
  }
}