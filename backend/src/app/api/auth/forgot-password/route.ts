import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api-response";
import { generateOtp, getOtpExpiresAt } from "@/lib/otp";
import { sendOtpEmail } from "@/lib/mail";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return fail("Email không hợp lệ", 422, parsed.error.flatten());
    }

    const email = parsed.data.email.trim();

    const user = await prisma.users.findFirst({
      where: { email },
    });

    if (!user) {
      return fail("Không tìm thấy tài khoản với email này", 404);
    }

    const otp = generateOtp();

    await prisma.email_otps.create({
      data: {
        user_id: user.id,
        email,
        otp_code: otp,
        purpose: "FORGOT_PASSWORD",
        expires_at: getOtpExpiresAt(5),
      },
    });

    await sendOtpEmail({
      to: email,
      otp,
      purpose: "FORGOT_PASSWORD",
    });

    return ok(
      {
        email,
      },
      "Đã gửi mã OTP đặt lại mật khẩu"
    );
  } catch (error) {
    console.error("POST /api/auth/forgot-password error:", error);
    return fail("Không thể gửi OTP đặt lại mật khẩu", 500);
  }
}