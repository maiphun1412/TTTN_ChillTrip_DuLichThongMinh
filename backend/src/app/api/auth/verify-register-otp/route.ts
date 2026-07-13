import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api-response";
import { hashPassword, signAccessToken } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(8).optional().or(z.literal("")),
  password: z.string().min(6),
  otp: z.string().min(4),
});

function serialize<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return fail("Dữ liệu không hợp lệ", 422, parsed.error.flatten());
    }

    const fullName = parsed.data.fullName.trim();
    const email = parsed.data.email.trim();
    const phone = parsed.data.phone?.trim() || null;
    const password = parsed.data.password;
    const otp = parsed.data.otp.trim();

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

    const otpRecord = await prisma.email_otps.findFirst({
      where: {
        email,
        otp_code: otp,
        purpose: "REGISTER",
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

    const role = await prisma.roles.findUnique({
      where: {
        code: "CUSTOMER",
      },
    });

    if (!role) {
      return fail("Thiếu role CUSTOMER", 500);
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.users.create({
        data: {
          role_id: role.id,
          email,
          phone,
          password_hash: passwordHash,
          full_name: fullName,
          status: "ACTIVE",
        },
      });

      await tx.customers.create({
        data: {
          user_id: createdUser.id,
          customer_code: `CUS${Date.now()}`,
          full_name: fullName,
          email,
          phone,
          customer_type: "INDIVIDUAL",
        },
      });

      await tx.email_otps.update({
        where: {
          id: otpRecord.id,
        },
        data: {
          user_id: createdUser.id,
          verified_at: new Date(),
        },
      });

      return createdUser;
    });

    const token = signAccessToken({
      userId: user.id.toString(),
      roleCode: "CUSTOMER",
      email: user.email,
    });

    return ok(
      serialize({
        token,
        user: {
          id: user.id,
          fullName: user.full_name,
          email: user.email,
          phone: user.phone,
          role: "CUSTOMER",
        },
      }),
      "Xác thực OTP và tạo tài khoản thành công"
    );
  } catch (error) {
    console.error("POST /api/auth/verify-register-otp error:", error);
    return fail("Không thể xác thực OTP", 500);
  }
}