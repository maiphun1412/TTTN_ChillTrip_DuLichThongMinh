import { prisma } from "@/lib/prisma";
import { fail } from "@/lib/api-response";
import { comparePassword, signAccessToken } from "@/lib/auth";
import { z } from "zod";
import { NextResponse } from "next/server";
import { logAudit } from "@/lib/privacy/log";
import {
  LOCK_MINUTES,
  MAX_FAILED_ATTEMPTS,
  accountKey,
  formatUnlockTime,
  getLoginLockState,
  lockedMessage,
} from "@/lib/privacy/login-guard";

function logLogin(
  req: Request,
  action: "LOGIN_SUCCESS" | "LOGIN_FAILED" | "LOGIN_BLOCKED" | "LOGIN_LOCKOUT",
  userId: bigint | null,
  detail: Record<string, unknown>
) {
  return logAudit(req, {
    module: "AUTH",
    action,
    entityName: "users",
    entityId: userId,
    actorUserId: userId,
    newData: detail,
  });
}

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

    // Chống dò mật khẩu: kiểm tra khóa tạm trước khi so mật khẩu
    const key = accountKey((email || phone)!);
    const unknownAccount = user ? {} : { email, phone };
    const lock = await getLoginLockState(key, user?.id ?? null);

    if (lock.locked && lock.lockedUntil) {
      await logLogin(req, "LOGIN_BLOCKED", user?.id ?? null, {
        reason: "TEMP_LOCKED",
        accountKey: key,
        lockedUntil: lock.lockedUntil.toISOString(),
        ...unknownAccount,
      });
      return fail(lockedMessage(lock.lockedUntil), 429);
    }

    const valid = user ? await comparePassword(password, user.password_hash) : false;

    if (!user || !valid) {
      const attempt = lock.failures + 1;
      const attemptsLeft = MAX_FAILED_ATTEMPTS - attempt;

      await logLogin(req, "LOGIN_FAILED", user?.id ?? null, {
        reason: user ? "WRONG_PASSWORD" : "ACCOUNT_NOT_FOUND",
        accountKey: key,
        attempt,
        ...unknownAccount,
      });

      if (attemptsLeft <= 0) {
        const lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
        await logLogin(req, "LOGIN_LOCKOUT", user?.id ?? null, {
          reason: "TOO_MANY_FAILED_ATTEMPTS",
          accountKey: key,
          lockedUntil: lockedUntil.toISOString(),
          ...unknownAccount,
        });
        return fail(
          `Bạn đã nhập sai tên đăng nhập hoặc mật khẩu ${MAX_FAILED_ATTEMPTS} lần. Tài khoản bị tạm khóa ${LOCK_MINUTES} phút, vui lòng thử lại lúc ${formatUnlockTime(lockedUntil)}.`,
          429
        );
      }

      return fail(
        `Sai tên đăng nhập hoặc mật khẩu. Bạn còn ${attemptsLeft} lần thử trước khi tài khoản bị tạm khóa ${LOCK_MINUTES} phút.`,
        401
      );
    }

    if (user.status !== "ACTIVE") {
      await logLogin(req, "LOGIN_BLOCKED", user.id, { reason: "ACCOUNT_LOCKED" });
      return fail("Tài khoản bị khóa", 403);
    }

    await logLogin(req, "LOGIN_SUCCESS", user.id, { role: user.roles.code });

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