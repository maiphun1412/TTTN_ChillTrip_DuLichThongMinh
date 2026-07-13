import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api-response";
import { requireAuth } from "@/lib/permissions";

function getAuthUserId(auth: unknown) {
  const payload = auth as {
    id?: string | number;
    userId?: string | number;
    sub?: string | number;
  };

  return payload.id || payload.userId || payload.sub;
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ tourId: string }> }
) {
  const auth = requireAuth(req);

  if (!auth) {
    return fail("Chưa đăng nhập", 401);
  }

  const userId = getAuthUserId(auth);

  if (!userId) {
    return fail("Không xác định được người dùng", 401);
  }

  try {
    const { tourId } = await context.params;

    const existed = await prisma.favorites.findFirst({
      where: {
        user_id: BigInt(userId),
        tour_id: BigInt(tourId),
      },
    });

    if (!existed) {
      return fail("Tour chưa có trong danh sách yêu thích", 404);
    }

    await prisma.favorites.delete({
      where: {
        id: existed.id,
      },
    });

    return ok(null, "Đã gỡ tour khỏi yêu thích");
  } catch (error) {
    console.error("DELETE /api/favorites/[tourId] error:", error);
    return fail("Không thể gỡ tour khỏi yêu thích", 500);
  }
}