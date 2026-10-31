import { prisma } from "@/lib/prisma";

/** Chụp dữ liệu khách hàng để ghi "trước/sau" vào audit_logs (sẽ được làm sạch khi ghi). */
export async function loadCustomerSnapshot(id: string) {
  return prisma.customers.findUnique({ where: { id: BigInt(id) } });
}

/** Chụp tài khoản nhân sự, không lấy mật khẩu. */
export async function loadUserSnapshot(id: string) {
  const user = await prisma.users.findUnique({
    where: { id: BigInt(id) },
    select: {
      id: true,
      email: true,
      phone: true,
      full_name: true,
      status: true,
      roles: { select: { code: true } },
    },
  });

  if (!user) return null;

  const { roles, ...rest } = user;
  return { ...rest, role: roles?.code ?? null };
}

type UserSnapshot = { role?: string | null; status?: string | null } | null | undefined;

/** Đặt tên thao tác sửa nhân sự: đổi role / khóa / mở khóa được tách riêng để dễ phát hiện. */
export function userUpdateAction(before: unknown, after: unknown) {
  const b = before as UserSnapshot;
  const a = after as UserSnapshot;

  if (b && a && b.role !== a.role) return "CHANGE_ROLE";
  if (b && a && b.status !== a.status) {
    return a.status === "ACTIVE" ? "UNLOCK" : "LOCK";
  }
  return "UPDATE";
}
