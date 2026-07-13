import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api-response";
import { hashPassword } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  otp: z.string().min(4),
  newPassword: z.string().min(6),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return fail("Dữ liệu không hợp lệ", 422, parsed.error.flatten());
    }

    const email = parsed.data.email.trim();
    const otp = parsed.data.otp.trim();
    const newPassword = parsed.data.newPassword;

    const user = await prisma.users.findFirst({
      where: { email },
    });

    if (!user) {
      return fail("Không tìm thấy tài khoản", 404);
    }

    const otpRecord = await prisma.email_otps.findFirst({
      where: {
        user_id: user.id,
        email,
        otp_code: otp,
        purpose: "FORGOT_PASSWORD",
        verified_at: null,
      },
      orderBy: {
        created_at: "desc",
      },
    });

    if (!otpRecord) {
      return fail("Mã OTP không đúng", 400);
    }

    if (otpRecord.expires_at < new Date()) {
      return fail("Mã OTP đã hết hạn", 400);
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.$transaction(async (tx) => {
      await tx.users.update({
        where: { id: user.id },
        data: {
          password_hash: passwordHash,
          updated_at: new Date(),
        },
      });

      await tx.email_otps.update({
        where: { id: otpRecord.id },
        data: {
          verified_at: new Date(),
        },
      });
    });

    return ok(null, "Đặt lại mật khẩu thành công");
  } catch (error) {
    console.error("POST /api/auth/reset-password error:", error);
    return fail("Không thể đặt lại mật khẩu", 500);
  }
}