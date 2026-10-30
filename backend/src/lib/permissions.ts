import { verifyAccessToken, type JwtPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export function getTokenFromRequest(req: Request) {
  const authHeader = req.headers.get("authorization");

  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.replace("Bearer ", "").trim();
  }

  const cookie = req.headers.get("cookie") || "";

  const tokenFromCookie = cookie
    .split(";")
    .map((item) => item.trim())
    .find(
      (item) =>
        item.startsWith("access_token=") ||
        item.startsWith("token=") ||
        item.startsWith("auth_token=")
    )
    ?.split("=")[1];

  return tokenFromCookie ? decodeURIComponent(tokenFromCookie) : null;
}

export function requireAuth(req: Request): JwtPayload | null {
  const token = getTokenFromRequest(req);

  if (!token) return null;

  return verifyAccessToken(token);
}

// Token chỉ dùng để biết "ai đang gọi". Role và trạng thái tài khoản
// luôn lấy lại từ database, vì token có hạn 7 ngày và có thể đã cũ
// (bị hạ quyền, bị khóa, bị xóa sau khi đăng nhập).
export async function requireRole(req: Request, roles: string[]) {
  const auth = requireAuth(req);

  if (!auth) {
    return {
      ok: false as const,
      reason: "UNAUTHORIZED" as const,
    };
  }

  let userId: bigint;

  try {
    userId = BigInt(auth.userId);
  } catch {
    return {
      ok: false as const,
      reason: "UNAUTHORIZED" as const,
    };
  }

  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: { status: true, roles: { select: { code: true } } },
  });

  if (!user || user.status !== "ACTIVE") {
    return {
      ok: false as const,
      reason: "UNAUTHORIZED" as const,
    };
  }

  const roleCode = user.roles?.code ?? "";

  if (!roles.includes(roleCode)) {
    return {
      ok: false as const,
      reason: "FORBIDDEN" as const,
    };
  }

  return {
    ok: true as const,
    user: { ...auth, roleCode },
  };
}