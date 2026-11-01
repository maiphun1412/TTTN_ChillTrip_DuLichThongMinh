import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";

export type GuideAuth = {
  userId: string;
  guideId: string;
};

export type GuideAuthCheckResult =
  | {
      ok: true;
      guide: GuideAuth;
    }
  | {
      ok: false;
      status: 401 | 403;
      reason: "UNAUTHENTICATED" | "ROLE_NOT_ALLOWED";
      message: string;
    };

/**
 * Xác thực HDV chặt chẽ từ Database:
 * - Chưa đăng nhập, token sai/hết hạn, hoặc user không ACTIVE -> 401 UNAUTHENTICATED
 * - Đã đăng nhập nhưng role không phải GUIDE hoặc hồ sơ tour_guides không ACTIVE -> 403 ROLE_NOT_ALLOWED
 */
export async function verifyGuideAccess(
  req: Request
): Promise<GuideAuthCheckResult> {
  const roleCheck = await requireRole(req, ["GUIDE"]);

  if (!roleCheck.ok) {
    if (roleCheck.reason === "UNAUTHORIZED") {
      return {
        ok: false,
        status: 401,
        reason: "UNAUTHENTICATED",
        message: "Vui lòng đăng nhập để tiếp tục",
      };
    }

    return {
      ok: false,
      status: 403,
      reason: "ROLE_NOT_ALLOWED",
      message: "Bạn không có quyền truy cập khu vực hướng dẫn viên",
    };
  }

  let userIdBigInt: bigint;
  try {
    userIdBigInt = BigInt(roleCheck.user.userId);
  } catch {
    return {
      ok: false,
      status: 401,
      reason: "UNAUTHENTICATED",
      message: "Phiên đăng nhập không hợp lệ",
    };
  }

  const guide = await prisma.tour_guides.findUnique({
    where: { user_id: userIdBigInt },
    select: { id: true, status: true },
  });

  if (!guide || guide.status !== "ACTIVE") {
    return {
      ok: false,
      status: 403,
      reason: "ROLE_NOT_ALLOWED",
      message: "Hồ sơ hướng dẫn viên chưa được kích hoạt hoặc đã bị khóa",
    };
  }

  return {
    ok: true,
    guide: {
      userId: userIdBigInt.toString(),
      guideId: guide.id.toString(),
    },
  };
}

export async function requireGuide(req: Request): Promise<GuideAuth | null> {
  const check = await verifyGuideAccess(req);
  if (!check.ok) {
    return null;
  }
  return check.guide;
}
