import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/permissions";

export type GuideAuth = {
  userId: string;
  guideId: string;
};

export async function requireGuide(req: Request): Promise<GuideAuth | null> {
  const auth = requireAuth(req);

  if (!auth) {
    return null;
  }

  const rows: any[] = await prisma.$queryRawUnsafe(
    `
      SELECT
        u.id AS userId,
        tg.id AS guideId
      FROM users u
      INNER JOIN roles r ON u.role_id = r.id
      INNER JOIN tour_guides tg ON tg.user_id = u.id
      WHERE u.id = @P1
        AND u.status = 'ACTIVE'
        AND r.code = 'GUIDE'
        AND tg.status = 'ACTIVE'
    `,
    BigInt(auth.userId)
  );

  if (!rows.length) {
    return null;
  }

  return {
    userId: String(rows[0].userId),
    guideId: String(rows[0].guideId),
  };
}