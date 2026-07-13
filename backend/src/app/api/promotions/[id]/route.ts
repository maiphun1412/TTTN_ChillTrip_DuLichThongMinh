import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api-response";

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
  try {
    const { id } = await context.params;

    const promotion = await prisma.promotions.findFirst({
      where: {
        OR: [
          /^\d+$/.test(id) ? { id: BigInt(id) } : {},
          { promotion_code: id.toUpperCase() },
        ],
      },
      select: {
        id: true,
        promotion_code: true,
        promotion_name: true,
        promotion_type: true,
        discount_value: true,
        min_order_amount: true,
        max_discount_amount: true,
        usage_limit: true,
        used_count: true,
        start_at: true,
        end_at: true,
        status: true,
        description: true,

        banner_image_url: true,
        thumbnail_image_url: true,
        highlight_title: true,
        highlight_subtitle: true,
        terms_conditions: true,
        usage_guide: true,
        theme_color: true,
        is_featured: true,

        promotion_tours: {
          select: {
            tour_id: true,
            tours: {
              select: {
                id: true,
                tour_name: true,
                slug: true,
                tour_type: true,
                duration_days: true,
                duration_nights: true,
                base_price: true,
                featured_image_url: true,
                short_description: true,
              },
            },
          },
        },
      },
    });

    if (!promotion) {
      return fail("Không tìm thấy khuyến mãi", 404);
    }

    return ok(
      serialize({
        ...promotion,
        bannerImageUrl:
          promotion.banner_image_url ||
          promotion.thumbnail_image_url ||
          "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1600&auto=format&fit=crop",
        imageUrl:
          promotion.thumbnail_image_url ||
          promotion.banner_image_url ||
          "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop",
        tours: promotion.promotion_tours.map((item) => item.tours),
      }),
      "Lấy chi tiết khuyến mãi thành công"
    );
  } catch (error) {
    console.error("GET /api/promotions/[id] error:", error);
    return fail("Không thể lấy chi tiết khuyến mãi", 500);
  }
}