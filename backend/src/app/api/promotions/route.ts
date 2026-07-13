import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api-response";

function serialize<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tourId = searchParams.get("tourId");
    const includeExpired = searchParams.get("includeExpired") === "true";

    const now = new Date();

    const promotions = await prisma.promotions.findMany({
      where: {
        status: "ACTIVE",
        ...(includeExpired
          ? {}
          : {
              start_at: { lte: now },
              end_at: { gte: now },
            }),
        ...(tourId
          ? {
              promotion_tours: {
                some: {
                  tour_id: BigInt(tourId),
                },
              },
            }
          : {}),
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
                featured_image_url: true,
                base_price: true,
              },
            },
          },
        },
      },
      orderBy: [
        { is_featured: "desc" },
        { start_at: "desc" },
      ],
    });

    const availablePromotions = promotions
      .filter((promotion) => {
        if (promotion.usage_limit === null) return true;
        return promotion.used_count < promotion.usage_limit;
      })
      .map((promotion) => {
        const firstTour = promotion.promotion_tours?.[0]?.tours || null;

        return {
          ...promotion,
          imageUrl:
            promotion.thumbnail_image_url ||
            promotion.banner_image_url ||
            firstTour?.featured_image_url ||
            "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop",
          bannerImageUrl:
            promotion.banner_image_url ||
            promotion.thumbnail_image_url ||
            firstTour?.featured_image_url ||
            "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1600&auto=format&fit=crop",
          tourName: firstTour?.tour_name || null,
          tourId: firstTour?.id || null,
          tourBasePrice: firstTour?.base_price || null,
        };
      });

    return ok(
      serialize(availablePromotions),
      "Lấy danh sách khuyến mãi thành công"
    );
  } catch (error) {
    console.error("GET /api/promotions error:", error);
    return fail("Không thể lấy danh sách khuyến mãi", 500);
  }
}