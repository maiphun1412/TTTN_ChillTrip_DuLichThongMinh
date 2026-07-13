import { verifyAccessToken, type JwtPayload } from "@/lib/auth";

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

export function requireRole(req: Request, roles: string[]) {
  const auth = requireAuth(req);

  if (!auth) {
    return {
      ok: false as const,
      reason: "UNAUTHORIZED" as const,
    };
  }

  if (!roles.includes(auth.roleCode)) {
    return {
      ok: false as const,
      reason: "FORBIDDEN" as const,
    };
  }

  return {
    ok: true as const,
    user: auth,
  };
}