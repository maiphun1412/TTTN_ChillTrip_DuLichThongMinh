import { NextRequest } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api-response";
import { verifyGuideAccess } from "@/lib/guide-auth";
import { recordGuideAuditLog } from "@/lib/guide-privacy";

function getSafeExtension(filename: string) {
  const ext = path.extname(filename || "").toLowerCase();

  if ([".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext)) {
    return ext;
  }

  return ".jpg";
}

export async function POST(req: NextRequest) {
  const authCheck = await verifyGuideAccess(req);

  if (!authCheck.ok) {
    await recordGuideAuditLog(req, {
      module: "GUIDE_PROFILE",
      action: "UPDATE_AVATAR_DENIED",
      entityName: "users",
      newData: { reason: authCheck.reason },
    });
    return fail(authCheck.message, authCheck.status);
  }

  const guideId = BigInt(authCheck.guide.guideId);
  const guideUserId = BigInt(authCheck.guide.userId);

  try {
    const formData = await req.formData();
    const avatar = formData.get("avatar");

    if (!(avatar instanceof File)) {
      return fail("Vui lòng chọn ảnh đại diện", 400);
    }

    if (!avatar.type.startsWith("image/")) {
      return fail("File tải lên phải là hình ảnh", 400);
    }

    const maxSize = 3 * 1024 * 1024;

    if (avatar.size > maxSize) {
      return fail("Ảnh đại diện không được vượt quá 3MB", 400);
    }

    const guideRows: any[] = await prisma.$queryRaw`
      SELECT
        tg.id AS guide_id,
        tg.user_id AS user_id
      FROM tour_guides tg
      WHERE tg.id = ${guideId}
        AND tg.user_id = ${guideUserId}
    `;

    if (!guideRows.length) {
      return fail("Không tìm thấy hồ sơ hướng dẫn viên", 404);
    }

    const bytes = await avatar.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "avatars"
    );

    await mkdir(uploadDir, { recursive: true });

    const ext = getSafeExtension(avatar.name);
    const fileName = `guide-${guideUserId.toString()}-${Date.now()}${ext}`;
    const filePath = path.join(uploadDir, fileName);

    await writeFile(filePath, buffer);

    const avatarUrl = `/uploads/avatars/${fileName}`;

    await prisma.$executeRaw`
      UPDATE users
      SET avatar_url = ${avatarUrl},
          updated_at = GETDATE()
      WHERE id = ${guideUserId}
    `;

    await recordGuideAuditLog(req, {
      actorUserId: guideUserId,
      module: "GUIDE_PROFILE",
      action: "UPDATE_AVATAR",
      entityName: "users",
      entityId: guideUserId,
      newData: { avatarUrl },
    });

    return ok(
      {
        avatarUrl,
      },
      "Cập nhật ảnh đại diện thành công"
    );
  } catch (error) {
    console.error("POST /api/guide/profile/avatar error:", error);
    return fail("Không thể cập nhật ảnh đại diện", 500);
  }
}
