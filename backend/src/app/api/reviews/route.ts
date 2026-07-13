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

const createReviewSchema = z.object({
  bookingId: z.coerce.bigint(),
  tourId: z.coerce.bigint(),
  rating: z.coerce.number().int().min(1).max(5),
  reviewTitle: z.string().optional(),
  reviewContent: z.string().optional(),
  images: z.array(z.string()).optional(),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tourId = searchParams.get("tourId")?.trim();

    const reviews = await prisma.reviews.findMany({
      where: {
        ...(tourId ? { tour_id: BigInt(tourId) } : {}),
        is_public: true,
        moderation_status: "APPROVED",
      },
      orderBy: {
        created_at: "desc",
      },
    });

    return ok(serialize(reviews), "Lấy danh sách đánh giá thành công");
  } catch (error) {
    console.error("GET /api/reviews error:", error);
    return fail("Không thể lấy danh sách đánh giá", 500);
  }
}

export async function POST(req: Request) {
  const auth = requireAuth(req);
  if (!auth) return fail("Chưa đăng nhập", 401);

  try {
    const body = await req.json();
    const parsed = createReviewSchema.safeParse(body);

    if (!parsed.success) {
      return fail("Dữ liệu không hợp lệ", 422, parsed.error.flatten());
    }

    const data = parsed.data;

    const customer = await prisma.customers.findFirst({
      where: {
        user_id: BigInt(auth.userId),
      },
    });

    if (!customer) {
      return fail("Không tìm thấy thông tin khách hàng", 404);
    }

    const booking = await prisma.bookings.findUnique({
      where: {
        id: data.bookingId,
      },
    });

    if (!booking) {
      return fail("Không tìm thấy booking", 404);
    }

    if (booking.customer_id !== customer.id) {
      return fail("Bạn không có quyền đánh giá booking này", 403);
    }

    if (booking.tour_id !== data.tourId) {
      return fail("Tour không khớp với booking", 400);
    }

    if (booking.booking_status !== "COMPLETED") {
      return fail("Chỉ có thể đánh giá tour đã hoàn thành", 400);
    }

    const existed = await prisma.reviews.findFirst({
      where: {
        booking_id: data.bookingId,
        customer_id: customer.id,
      },
    });

    if (existed) {
      return fail("Bạn đã đánh giá booking này rồi", 409);
    }

    const created = await prisma.reviews.create({
      data: {
        booking_id: data.bookingId,
        customer_id: customer.id,
        tour_id: data.tourId,
        rating: data.rating,
        review_title: data.reviewTitle || null,
        review_content: data.reviewContent || null,
        is_public: false,
        moderation_status: "PENDING",
      },
    });

    if (data.images && data.images.length > 0) {
      await prisma.review_images.createMany({
        data: data.images.map((imageUrl, index) => ({
          review_id: created.id,
          image_url: imageUrl,
          sort_order: index,
        })),
      });
    }

    return ok(serialize(created), "Gửi đánh giá thành công", 201);
  } catch (error) {
    console.error("POST /api/reviews error:", error);
    return fail("Không thể gửi đánh giá", 500);
  }
}