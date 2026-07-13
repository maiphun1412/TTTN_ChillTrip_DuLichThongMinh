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

const updateReviewSchema = z.object({
  isPublic: z.boolean().optional(),
  moderationStatus: z
    .enum(["PENDING", "APPROVED", "REJECTED", "HIDDEN"])
    .optional(),
});

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = requireRole(req, ["ADMIN"]);
  if (!auth.ok) {
    return fail(
      auth.reason === "UNAUTHORIZED" ? "Chưa đăng nhập" : "Không có quyền",
      auth.reason === "UNAUTHORIZED" ? 401 : 403
    );
  }

  try {
    const { id } = await context.params;
    const reviewId = Number(id);

    if (!reviewId) {
      return fail("ID đánh giá không hợp lệ", 400);
    }

    const review = await prisma.reviews.findUnique({
      where: { id: reviewId },
      include: {
        customers: true,
        tours: true,
        bookings: true,
      },
    });

    if (!review) {
      return fail("Không tìm thấy đánh giá", 404);
    }

    return ok(serialize(review), "Lấy chi tiết đánh giá thành công");
  } catch (error) {
    console.error("GET /api/admin/reviews/[id] error:", error);
    return fail("Không thể lấy chi tiết đánh giá", 500);
  }
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = requireRole(req, ["ADMIN"]);
  if (!auth.ok) {
    return fail("Không có quyền", 403);
  }

  try {
    const { id } = await context.params;
    const reviewId = Number(id);

    if (!reviewId) {
      return fail("ID đánh giá không hợp lệ", 400);
    }

    const body = await req.json();
    const action = body?.action; // APPROVE | REJECT | HIDE

    const review = await prisma.reviews.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      return fail("Không tìm thấy đánh giá", 404);
    }

    let updateData: any = {};

    switch (action) {
      case "APPROVE":
        updateData = {
          is_public: true,
          moderation_status: "APPROVED",
        };
        break;

      case "REJECT":
        updateData = {
          is_public: false,
          moderation_status: "REJECTED",
        };
        break;

      case "HIDE":
        updateData = {
          is_public: false,
          moderation_status: "HIDDEN",
        };
        break;

      default:
        return fail("Hành động không hợp lệ", 400);
    }

    const updated = await prisma.reviews.update({
      where: { id: reviewId },
      data: updateData,
      include: {
        customers: true,
        tours: true,
      },
    });

    return ok(serialize(updated), "Cập nhật trạng thái đánh giá thành công");
  } catch (error) {
    console.error("PUT review error:", error);
    return fail("Không thể cập nhật đánh giá", 500);
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = requireRole(req, ["ADMIN"]);
  if (!auth.ok) {
    return fail(
      auth.reason === "UNAUTHORIZED" ? "Chưa đăng nhập" : "Không có quyền",
      auth.reason === "UNAUTHORIZED" ? 401 : 403
    );
  }

  try {
    const { id } = await context.params;
    const reviewId = Number(id);

    if (!reviewId) {
      return fail("ID đánh giá không hợp lệ", 400);
    }

    const review = await prisma.reviews.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      return fail("Không tìm thấy đánh giá", 404);
    }

    await prisma.reviews.delete({
      where: { id: reviewId },
    });

    return ok(null, "Xóa đánh giá thành công");
  } catch (error) {
    console.error("DELETE /api/admin/reviews/[id] error:", error);
    return fail("Không thể xóa đánh giá", 500);
  }
}