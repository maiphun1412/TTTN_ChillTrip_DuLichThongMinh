import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api-response";
import { generateOtp, getOtpExpiresAt } from "@/lib/otp";
import { sendOtpEmail } from "@/lib/mail";
import { z } from "zod";

const schema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(8).optional().or(z.literal("")),
  password: z.string().min(6),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return fail("Dữ liệu không hợp lệ", 422, parsed.error.flatten());
    }

    const email = parsed.data.email.trim();
    const phone = parsed.data.phone?.trim() || null;

    const existed = await prisma.users.findFirst({
      where: {
        OR: [email ? { email } : undefined, phone ? { phone } : undefined].filter(
          Boolean
        ) as any,
      },
    });

    if (existed) {
      return fail("Tài khoản đã tồn tại", 409);
    }

    const otp = generateOtp();

    await prisma.email_otps.create({
      data: {
        user_id: null,
        email,
        otp_code: otp,
        purpose: "REGISTER",
        expires_at: getOtpExpiresAt(5),
      },
    });

    await sendOtpEmail({
      to: email,
      otp,
      purpose: "REGISTER",
    });

    return ok(
      {
        email,
        needOtpVerify: true,
      },
      "Mã OTP đã được gửi đến email. Vui lòng xác nhận để tạo tài khoản."
    );
  } catch (err) {
    console.error("POST /api/auth/register error:", err);
    return fail("Lỗi server", 500);
  }
}