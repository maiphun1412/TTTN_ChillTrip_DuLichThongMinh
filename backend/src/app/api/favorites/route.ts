import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api-response";
import { requireAuth } from "@/lib/permissions";

function serialize<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

function getAuthUserId(auth: unknown) {
  const payload = auth as {
    id?: string | number;
    userId?: string | number;
    sub?: string | number;
  };

  return payload.id || payload.userId || payload.sub;
}

export async function GET(req: Request) {
  const auth = requireAuth(req);

  if (!auth) {
    return fail("Chưa đăng nhập", 401);
  }

  const userId = getAuthUserId(auth);

  if (!userId) {
    return fail("Không xác định được người dùng", 401);
  }

  try {
    const favorites = await prisma.favorites.findMany({
      where: {
        user_id: BigInt(userId),
      },
      include: {
        tours: {
          include: {
            destinations: true,
            tour_images: {
              orderBy: [{ is_cover: "desc" }, { sort_order: "asc" }],
            },
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });

    const result = favorites.map((item) => {
      const tour = item.tours;
      const coverImage =
        tour.tour_images?.find((image) => image.is_cover) ||
        tour.tour_images?.[0];

      return {
        id: item.id,
        tourId: tour.id,
        tourName: tour.tour_name,
        slug: tour.slug,
        tourType: tour.tour_type,
        durationDays: tour.duration_days,
        durationNights: tour.duration_nights,
        basePrice: tour.base_price,
        shortDescription: tour.short_description,
        imageUrl: coverImage?.image_url || tour.featured_image_url || null,
        destination: tour.destinations
          ? {
              id: tour.destinations.id,
              name: tour.destinations.destination_name,
              country: tour.destinations.country,
              city: tour.destinations.city,
            }
          : null,
        createdAt: item.created_at,
      };
    });

    return ok(serialize(result), "Lấy danh sách yêu thích thành công");
  } catch (error) {
    console.error("GET /api/favorites error:", error);
    return fail("Không thể lấy danh sách yêu thích", 500);
  }
}

export async function POST(req: Request) {
  const auth = requireAuth(req);

  if (!auth) {
    return fail("Chưa đăng nhập", 401);
  }

  const userId = getAuthUserId(auth);

  if (!userId) {
    return fail("Không xác định được người dùng", 401);
  }

  try {
    const body = await req.json();
    const tourId = body?.tourId;

    if (!tourId) {
      return fail("Thiếu tourId", 400);
    }

    const tour = await prisma.tours.findUnique({
      where: {
        id: BigInt(tourId),
      },
    });

    if (!tour) {
      return fail("Không tìm thấy tour", 404);
    }

    const existed = await prisma.favorites.findFirst({
      where: {
        user_id: BigInt(userId),
        tour_id: BigInt(tourId),
      },
    });

    if (existed) {
      return ok(serialize(existed), "Tour đã có trong danh sách yêu thích");
    }

    const favorite = await prisma.favorites.create({
      data: {
        user_id: BigInt(userId),
        tour_id: BigInt(tourId),
      },
    });

    return ok(serialize(favorite), "Đã thêm tour vào yêu thích");
  } catch (error) {
    console.error("POST /api/favorites error:", error);
    return fail("Không thể thêm tour vào yêu thích", 500);
  }
}