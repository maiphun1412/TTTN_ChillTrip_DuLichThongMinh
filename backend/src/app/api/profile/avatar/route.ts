import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { verifyAccessToken } from "@/lib/auth";

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.replace("Bearer ", "");
}

function getFileExtension(fileName: string) {
  const ext = path.extname(fileName || "").toLowerCase();

  if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
    return ext;
  }

  return ".jpg";
}

export async function POST(request: NextRequest) {
  try {
    const token = getBearerToken(request);

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Chưa đăng nhập" },
        { status: 401 }
      );
    }

    const payload = verifyAccessToken(token);

    if (!payload?.userId) {
      return NextResponse.json(
        { success: false, message: "Token không hợp lệ" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("avatar");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: "Vui lòng chọn ảnh avatar" },
        { status: 400 }
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { success: false, message: "File tải lên phải là hình ảnh" },
        { status: 400 }
      );
    }

    const maxSize = 3 * 1024 * 1024;

    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, message: "Ảnh không được vượt quá 3MB" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = path.join(process.cwd(), "public", "uploads", "avatars");
    await mkdir(uploadDir, { recursive: true });

    const ext = getFileExtension(file.name);
    const fileName = `user-${payload.userId}-${Date.now()}${ext}`;
    const filePath = path.join(uploadDir, fileName);

    await writeFile(filePath, buffer);

    const avatarUrl = `/uploads/avatars/${fileName}`;

    await prisma.$executeRaw`
      UPDATE users
      SET avatar_url = ${avatarUrl},
          updated_at = GETDATE()
      WHERE id = ${BigInt(payload.userId)}
    `;

    return NextResponse.json({
      success: true,
      message: "Cập nhật avatar thành công",
      data: {
        avatarUrl,
      },
    });
  } catch (error) {
    console.error("POST /api/profile/avatar error:", error);

    return NextResponse.json(
      { success: false, message: "Không cập nhật được avatar" },
      { status: 500 }
    );
  }
}