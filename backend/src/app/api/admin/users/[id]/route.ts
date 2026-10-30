import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api-response";
import { requireRole } from "@/lib/permissions";
import { hashPassword } from "@/lib/auth";
import { z } from "zod";

function serialize<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

const updateUserSchema = z.object({
  fullName: z.string().min(2, "Họ tên tối thiểu 2 ký tự"),
  email: z.string().email("Email không hợp lệ").optional().or(z.literal("")),
  phone: z
    .string()
    .min(8, "Số điện thoại không hợp lệ")
    .optional()
    .or(z.literal("")),
  password: z.string().optional().or(z.literal("")),

  roleCode: z.enum(["ADMIN", "STAFF", "GUIDE"]),
  status: z.enum(["ACTIVE", "LOCKED", "INACTIVE"]).default("ACTIVE"),

  department: z.string().optional(),
  positionName: z.string().optional(),
  hireDate: z.string().optional(),

  gender: z.string().optional(),
  dateOfBirth: z.string().optional(),
  citizenId: z.string().optional(),
  employeeAddress: z.string().optional(),

  region: z.string().optional(),
  languages: z.string().optional(),
  experienceYears: z.coerce.number().min(0).optional(),
});

function makeCode(prefix: string) {
  return `${prefix}${Date.now()}`;
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(req, ["ADMIN"]);
  if (!auth.ok) {
    return fail(
      auth.reason === "UNAUTHORIZED" ? "Chưa đăng nhập" : "Không có quyền",
      auth.reason === "UNAUTHORIZED" ? 401 : 403
    );
  }

  try {
    const { id } = await context.params;
    const userId = Number(id);

    if (!userId) {
      return fail("ID người dùng không hợp lệ", 400);
    }

    const user = await prisma.users.findUnique({
      where: { id: userId },
      include: {
        roles: true,
        employees: true,
        tour_guides: true,
      },
    });

    if (!user) {
      return fail("Không tìm thấy người dùng", 404);
    }

    if (user.roles?.code === "CUSTOMER") {
      return fail("Không thể xem khách hàng ở màn quản lý nhân sự", 403);
    }

    return ok(serialize(user), "Lấy chi tiết nhân sự thành công");
  } catch (error) {
    console.error("GET /api/admin/users/[id] error:", error);
    return fail("Không thể lấy chi tiết nhân sự", 500);
  }
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(req, ["ADMIN"]);
  if (!auth.ok) {
    return fail(
      auth.reason === "UNAUTHORIZED" ? "Chưa đăng nhập" : "Không có quyền",
      auth.reason === "UNAUTHORIZED" ? 401 : 403
    );
  }

  try {
    const { id } = await context.params;
    const userId = Number(id);

    if (!userId) {
      return fail("ID người dùng không hợp lệ", 400);
    }

    const body = await req.json();
    const parsed = updateUserSchema.safeParse(body);

    if (!parsed.success) {
      return fail("Dữ liệu không hợp lệ", 422, parsed.error.flatten());
    }

    const data = parsed.data;

    if (!data.email && !data.phone) {
      return fail("Phải có email hoặc số điện thoại", 422);
    }

    const currentUser = await prisma.users.findUnique({
      where: { id: userId },
      include: {
        roles: true,
        employees: true,
        tour_guides: true,
      },
    });

    if (!currentUser) {
      return fail("Không tìm thấy người dùng", 404);
    }

    if (currentUser.roles?.code === "CUSTOMER") {
      return fail("Không thể sửa khách hàng ở màn quản lý nhân sự", 403);
    }

    const duplicated = await prisma.users.findFirst({
      where: {
        id: { not: userId },
        OR: [
          data.email ? { email: data.email } : undefined,
          data.phone ? { phone: data.phone } : undefined,
        ].filter(Boolean) as any,
      },
    });

    if (duplicated) {
      return fail("Email hoặc số điện thoại đã tồn tại", 409);
    }

    const role = await prisma.roles.findUnique({
      where: { code: data.roleCode },
    });

    if (!role) {
      return fail("Không tìm thấy role", 404);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.users.update({
        where: { id: userId },
        data: {
          role_id: role.id,
          email: data.email || null,
          phone: data.phone || null,
          full_name: data.fullName,
          status: data.status,
          updated_at: new Date(),
          ...(data.password
            ? { password_hash: await hashPassword(data.password) }
            : {}),
        },
      });

      if (data.roleCode === "ADMIN" || data.roleCode === "STAFF") {
        if (currentUser.employees) {
          await tx.employees.update({
            where: { user_id: userId },
            data: {
              department:
                data.department ||
                (data.roleCode === "ADMIN" ? "Quản trị hệ thống" : "Điều hành"),
              position_name:
                data.positionName ||
                (data.roleCode === "ADMIN" ? "Quản trị viên" : "Nhân viên"),
              hire_date: data.hireDate ? new Date(data.hireDate) : null,

              gender: data.gender || null,
              date_of_birth: data.dateOfBirth
                ? new Date(data.dateOfBirth)
                : null,
              citizen_id: data.citizenId || null,
              address: data.employeeAddress || null,

              status: data.status,
              updated_at: new Date(),
            },
          });
        } else {
          await tx.employees.create({
            data: {
              user_id: userId,
              employee_code:
                data.roleCode === "ADMIN" ? makeCode("ADM") : makeCode("EMP"),
              department:
                data.department ||
                (data.roleCode === "ADMIN" ? "Quản trị hệ thống" : "Điều hành"),
              position_name:
                data.positionName ||
                (data.roleCode === "ADMIN" ? "Quản trị viên" : "Nhân viên"),
              hire_date: data.hireDate ? new Date(data.hireDate) : null,

              gender: data.gender || null,
              date_of_birth: data.dateOfBirth
                ? new Date(data.dateOfBirth)
                : null,
              citizen_id: data.citizenId || null,
              address: data.employeeAddress || null,

              status: data.status,
            },
          });
        }
      }

      if (data.roleCode === "GUIDE") {
        if (currentUser.tour_guides) {
          await tx.tour_guides.update({
            where: { user_id: userId },
            data: {
              region: data.region || null,
              languages: data.languages || null,
              experience_years: Number(data.experienceYears || 0),
              status: data.status,
              updated_at: new Date(),
            },
          });
        } else {
          await tx.tour_guides.create({
            data: {
              user_id: userId,
              guide_code: makeCode("GD"),
              region: data.region || null,
              languages: data.languages || null,
              experience_years: Number(data.experienceYears || 0),
              status: data.status,
            },
          });
        }
      }

      return tx.users.findUnique({
        where: { id: user.id },
        include: {
          roles: true,
          employees: true,
          tour_guides: true,
        },
      });
    });

    return ok(serialize(updated), "Cập nhật nhân sự thành công");
  } catch (error) {
    console.error("PUT /api/admin/users/[id] error:", error);
    return fail("Không thể cập nhật nhân sự", 500);
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(req, ["ADMIN"]);
  if (!auth.ok) {
    return fail(
      auth.reason === "UNAUTHORIZED" ? "Chưa đăng nhập" : "Không có quyền",
      auth.reason === "UNAUTHORIZED" ? 401 : 403
    );
  }

  try {
    const { id } = await context.params;
    const userId = Number(id);

    if (!userId) {
      return fail("ID người dùng không hợp lệ", 400);
    }

    const user = await prisma.users.findUnique({
      where: { id: userId },
      include: {
        roles: true,
      },
    });

    if (!user) {
      return fail("Không tìm thấy người dùng", 404);
    }

    if (user.roles?.code === "CUSTOMER") {
      return fail("Không thể xóa khách hàng ở màn quản lý nhân sự", 403);
    }

    await prisma.users.delete({
      where: { id: userId },
    });

    return ok(null, "Xóa nhân sự thành công");
  } catch (error) {
    console.error("DELETE /api/admin/users/[id] error:", error);
    return fail(
      "Không thể xóa nhân sự. Tài khoản có thể đang liên kết dữ liệu khác.",
      500
    );
  }
}