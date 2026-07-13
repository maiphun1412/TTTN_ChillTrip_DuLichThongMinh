import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api-response";
import { requireGuide } from "@/lib/guide-auth";

function serialize<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

export async function GET(req: NextRequest) {
  const guideAuth = await requireGuide(req);

  if (!guideAuth) {
    return fail("Bạn không có quyền truy cập khu vực hướng dẫn viên", 403);
  }

  try {
    const rows: any[] = await prisma.$queryRawUnsafe(
      `
        SELECT
          u.id AS userId,
          u.full_name AS fullName,
          u.email,
          u.phone,
          u.avatar_url AS avatarUrl,

          tg.id AS guideId,
          tg.guide_code AS guideCode,
          tg.region,
          tg.languages,
          tg.experience_years AS experienceYears,
          tg.status
        FROM tour_guides tg
        INNER JOIN users u ON tg.user_id = u.id
        WHERE tg.id = @P1
      `,
      BigInt(guideAuth.guideId)
    );

    if (!rows.length) {
      return fail("Không tìm thấy thông tin hướng dẫn viên", 404);
    }

    return ok(serialize(rows[0]), "Lấy thông tin hướng dẫn viên thành công");
  } catch (error) {
    console.error("GET /api/guide/me error:", error);
    return fail("Không thể lấy thông tin hướng dẫn viên", 500);
  }
}