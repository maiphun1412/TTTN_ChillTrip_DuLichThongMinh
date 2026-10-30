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
    const roles = await prisma.roles.findMany({
      include: {
        _count: {
          select: {
            users: true,
            role_permissions: true,
          },
        },
      },
      orderBy: {
        id: "asc",
      },
    });

    return ok(serialize(roles), "Lấy danh sách vai trò thành công");
  } catch (error) {
    console.error("GET /api/admin/roles error:", error);
    return fail("Không thể lấy danh sách vai trò", 500);
  }
}