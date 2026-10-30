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

export async function GET(req: Request) {
  const auth = await requireRole(req, ["ADMIN"]);
  if (!auth.ok) {
    return fail(
      auth.reason === "UNAUTHORIZED" ? "Chưa đăng nhập" : "Không có quyền",
      auth.reason === "UNAUTHORIZED" ? 401 : 403
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const keyword = searchParams.get("keyword")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "";
    const isPublic = searchParams.get("isPublic");
    const rating = searchParams.get("rating");

    const reviews = await prisma.reviews.findMany({
      where: {
        ...(keyword
          ? {
              OR: [
                { review_title: { contains: keyword } },
                { review_content: { contains: keyword } },
                { customers: { full_name: { contains: keyword } } },
                { tours: { tour_name: { contains: keyword } } },
                { tours: { tour_code: { contains: keyword } } },
              ],
            }
          : {}),

        ...(status ? { moderation_status: status } : {}),

        ...(isPublic === "true"
          ? { is_public: true }
          : isPublic === "false"
          ? { is_public: false }
          : {}),

        ...(rating ? { rating: Number(rating) } : {}),
      },
      include: {
        customers: true,
        tours: true,
        bookings: true,
      },
      orderBy: {
        created_at: "desc",
      },
    });

    return ok(serialize(reviews), "Lấy danh sách đánh giá thành công");
  } catch (error) {
    console.error("GET /api/admin/reviews error:", error);
    return fail("Không thể lấy danh sách đánh giá", 500);
  }
}