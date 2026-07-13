import { prisma } from "@/lib/prisma";
import { fail } from "@/lib/api-response";
import { comparePassword, signAccessToken } from "@/lib/auth";
import { z } from "zod";
import { NextResponse } from "next/server";

const schema = z.object({
  email: z.string().optional(),
  phone: z.string().optional(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return fail("Dữ liệu không hợp lệ", 422, parsed.error.flatten());
    }

    const { email, phone, password } = parsed.data;

    if (!email && !phone) {
      return fail("Vui lòng nhập email hoặc số điện thoại", 422);
    }

    const user = await prisma.users.findFirst({
      where: {
        OR: [
          email ? { email } : undefined,
          phone ? { phone } : undefined,
        ].filter(Boolean) as any,
      },
      include: {
        roles: true,
      },
    });

    if (!user) {
      return fail("Sai tài khoản hoặc mật khẩu", 401);
    }

    const valid = await comparePassword(password, user.password_hash);

    if (!valid) {
      return fail("Sai tài khoản hoặc mật khẩu", 401);
    }

    if (user.status !== "ACTIVE") {
      return fail("Tài khoản bị khóa", 403);
    }

    const token = signAccessToken({
      userId: user.id.toString(),
      roleCode: user.roles.code,
      email: user.email,
    });

    const response = NextResponse.json(
      {
        success: true,
        message: "Đăng nhập thành công",
        data: {
          token,
          user: {
            id: user.id.toString(),
            fullName: user.full_name,
            email: user.email,
            phone: user.phone,
            role: user.roles.code,
          },
        },
        errors: null,
      },
      { status: 200 }
    );

    response.cookies.set("access_token", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (err) {
    console.error("POST /api/auth/login error:", err);
    return fail("Lỗi server", 500);
  }
}