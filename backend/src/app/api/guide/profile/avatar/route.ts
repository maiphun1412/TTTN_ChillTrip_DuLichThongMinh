import { NextRequest } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api-response";
import { requireGuide } from "@/lib/guide-auth";

function getSafeExtension(filename: string) {
  const ext = path.extname(filename || "").toLowerCase();

  if ([".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext)) {
    return ext;
  }

  return ".jpg";
}

export async function POST(req: NextRequest) {
  const guideAuth = await requireGuide(req);

  if (!guideAuth) {
    return fail("Bạn không có quyền truy cập khu vực hướng dẫn viên", 403);
  }

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

    const guideRows: any[] = await prisma.$queryRawUnsafe(
      `
        SELECT
          tg.id AS guide_id,
          tg.user_id AS user_id
        FROM tour_guides tg
        WHERE tg.id = @P1
          AND tg.user_id = @P2
      `,
      Number(guideAuth.guideId),
      Number(guideAuth.userId)
    );

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
    const fileName = `guide-${guideAuth.userId}-${Date.now()}${ext}`;
    const filePath = path.join(uploadDir, fileName);

    await writeFile(filePath, buffer);

    const avatarUrl = `/uploads/avatars/${fileName}`;

    await prisma.$executeRawUnsafe(
      `
        UPDATE users
        SET avatar_url = @P1,
            updated_at = GETDATE()
        WHERE id = @P2
      `,
      avatarUrl,
      Number(guideAuth.userId)
    );

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