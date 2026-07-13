import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api-response";
import { requireAuth } from "@/lib/permissions";

function serialize<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

export async function GET(req: Request) {
  const auth = requireAuth(req);

  if (!auth) {
    return fail("Chưa đăng nhập", 401);
  }

  try {
    const userId = BigInt(auth.userId);

    const user = await prisma.users.findUnique({
      where: {
        id: userId,
      },
      include: {
        roles: true,
        customers: true,
      },
    });

    if (!user) {
      return fail("Không tìm thấy người dùng", 404);
    }

    const customer = user.customers?.[0] ?? null;

    let totalBookings = 0;
    let availablePromotions = 0;
    const rewardPoints = 0;

    if (customer) {
      totalBookings = await prisma.bookings.count({
        where: {
          customer_id: customer.id,
        },
      });
    }

    availablePromotions = await prisma.promotions.count({
      where: {
        status: "ACTIVE",
      },
    });

    return ok(
      serialize({
        user: {
          id: user.id,
          fullName: user.full_name,
          email: user.email,
          phone: user.phone,
          avatarUrl: user.avatar_url,
          status: user.status,
          lastLoginAt: user.last_login_at,
          role: user.roles
            ? {
                id: user.roles.id,
                code: user.roles.code,
                name: user.roles.name,
                description: user.roles.description,
              }
            : null,
        },
        summary: {
          totalBookings,
          rewardPoints,
          availablePromotions,
        },
        customer: customer
          ? {
              id: customer.id,
              userId: customer.user_id,
              customerCode: customer.customer_code,
              fullName: customer.full_name,
              gender: customer.gender,
              dateOfBirth: customer.date_of_birth,
              email: customer.email,
              phone: customer.phone,
              address: customer.address,
              customerType: customer.customer_type,
              notes: customer.notes,
              createdAt: customer.created_at,
              updatedAt: customer.updated_at,
            }
          : null,
      }),
      "Lấy thông tin người dùng thành công"
    );
  } catch (error) {
    console.error("GET /api/auth/me error:", error);
    return fail("Không thể lấy thông tin người dùng", 500);
  }
}