import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api-response";
import { requireAuth } from "@/lib/permissions";

type ChangePasswordBody = {
  currentPassword?: string;
  newPassword?: string;
};

function isStrongPassword(password: string) {
  return password.length >= 6;
}

export async function PATCH(req: NextRequest) {
  const auth = requireAuth(req);

  if (!auth) {
    return fail("Chưa đăng nhập", 401);
  }

  try {
    const body = (await req.json()) as ChangePasswordBody;

    const currentPassword = body.currentPassword?.trim() || "";
    const newPassword = body.newPassword?.trim() || "";

    if (!currentPassword) {
      return fail("Vui lòng nhập mật khẩu hiện tại", 400);
    }

    if (!newPassword) {
      return fail("Vui lòng nhập mật khẩu mới", 400);
    }

    if (!isStrongPassword(newPassword)) {
      return fail("Mật khẩu mới phải có ít nhất 6 ký tự", 400);
    }

    if (currentPassword === newPassword) {
      return fail("Mật khẩu mới không được trùng mật khẩu hiện tại", 400);
    }

    const user = await prisma.users.findUnique({
      where: {
        id: BigInt(auth.userId),
      },
      select: {
        id: true,
        password_hash: true,
      },
    });

    if (!user) {
      return fail("Không tìm thấy người dùng", 404);
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);

    if (!isMatch) {
      return fail("Mật khẩu hiện tại không đúng", 400);
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    await prisma.users.update({
      where: {
        id: user.id,
      },
      data: {
        password_hash: newPasswordHash,
        updated_at: new Date(),
      },
    });

    return ok(null, "Đổi mật khẩu thành công");
  } catch (error) {
    console.error("PATCH /api/auth/change-password error:", error);
    return fail("Không thể đổi mật khẩu", 500);
  }
}