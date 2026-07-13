import { prisma } from "@/lib/prisma";
import { comparePassword, hashPassword, signAccessToken } from "@/lib/auth";

export const authService = {
  async register(input: {
    fullName: string;
    email?: string;
    phone?: string;
    password: string;
  }) {
    const { fullName, email, phone, password } = input;

    if (!email && !phone) {
      throw new Error("EMAIL_OR_PHONE_REQUIRED");
    }

    const existed = await prisma.user.findFirst({
      where: {
        OR: [
          email ? { email } : undefined,
          phone ? { phone } : undefined,
        ].filter(Boolean) as any,
      },
    });

    if (existed) {
      throw new Error("USER_ALREADY_EXISTS");
    }

    const role = await prisma.role.findUnique({
      where: { code: "CUSTOMER" },
    });

    if (!role) {
      throw new Error("ROLE_CUSTOMER_NOT_FOUND");
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.$transaction(async (tx: any) => {
      const createdUser = await tx.user.create({
        data: {
          roleId: role.id,
          email: email || null,
          phone: phone || null,
          passwordHash,
          fullName,
          status: "ACTIVE",
        },
      });

      await tx.customer.create({
        data: {
          userId: createdUser.id,
          customerCode: `CUS${Date.now()}`,
          fullName,
          email: email || null,
          phone: phone || null,
          customerType: "INDIVIDUAL",
        },
      });

      return createdUser;
    });

    const token = signAccessToken({
      userId: user.id.toString(),
      roleCode: "CUSTOMER",
      email: user.email,
    });

    return { user, token };
  },

  async login(input: {
    email?: string;
    phone?: string;
    password: string;
  }) {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          input.email ? { email: input.email } : undefined,
          input.phone ? { phone: input.phone } : undefined,
        ].filter(Boolean) as any,
      },
      include: {
        role: true,
      },
    });

    if (!user) {
      throw new Error("INVALID_CREDENTIALS");
    }

    const valid = await comparePassword(input.password, user.passwordHash);

    if (!valid) {
      throw new Error("INVALID_CREDENTIALS");
    }

    if (user.status !== "ACTIVE") {
      throw new Error("ACCOUNT_INACTIVE");
    }

    const token = signAccessToken({
      userId: user.id.toString(),
      roleCode: user.role.code,
      email: user.email,
    });

    return { user, token };
  },

  async me(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: BigInt(userId) },
      include: {
        role: true,
        customer: true,
      },
    });

    if (!user) {
      throw new Error("USER_NOT_FOUND");
    }

    return user;
  },
};