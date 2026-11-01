import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api-response";
import { verifyGuideAccess } from "@/lib/guide-auth";

function serialize<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

export async function GET(req: NextRequest) {
  const authCheck = await verifyGuideAccess(req);

  if (!authCheck.ok) {
    return fail(authCheck.message, authCheck.status);
  }

  try {
    const guideId = BigInt(authCheck.guide.guideId);

    const rows: any[] = await prisma.$queryRaw`
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
      WHERE tg.id = ${guideId}
    `;

    if (!rows.length) {
      return fail("Không tìm thấy thông tin hướng dẫn viên", 404);
    }

    const row = rows[0];
    return ok(
      serialize({
        userId: row.userId,
        fullName: row.fullName,
        email: row.email,
        phone: row.phone,
        avatarUrl: row.avatarUrl,
        guideId: row.guideId,
        guideCode: row.guideCode,
        region: row.region,
        languages: row.languages,
        experienceYears: row.experienceYears,
        status: row.status,
      }),
      "Lấy thông tin hướng dẫn viên thành công"
    );
  } catch (error) {
    console.error("GET /api/guide/me error:", error);
    return fail("Không thể lấy thông tin hướng dẫn viên", 500);
  }
}
