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

const createUserSchema = z.object({
  fullName: z.string().min(2, "Họ tên tối thiểu 2 ký tự"),
  email: z.string().email("Email không hợp lệ").optional().or(z.literal("")),
  phone: z
    .string()
    .min(8, "Số điện thoại không hợp lệ")
    .optional()
    .or(z.literal("")),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
  roleCode: z.enum(["ADMIN", "STAFF", "GUIDE", "CUSTOMER"]),
  status: z.enum(["ACTIVE", "LOCKED", "INACTIVE"]).default("ACTIVE"),

  address: z.string().optional(),

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

export async function GET(req: Request) {
  const auth = requireRole(req, ["ADMIN"]);
  if (!auth.ok) {
    return fail(
      auth.reason === "UNAUTHORIZED" ? "Chưa đăng nhập" : "Không có quyền",
      auth.reason === "UNAUTHORIZED" ? 401 : 403
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const keyword = searchParams.get("keyword")?.trim() || "";
    const roleCode = searchParams.get("roleCode")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "";

    const allowedStaffRoles = ["ADMIN", "STAFF", "GUIDE"];

    const users = await prisma.users.findMany({
      where: {
        roles: {
          code:
            roleCode && allowedStaffRoles.includes(roleCode)
              ? roleCode
              : { in: allowedStaffRoles },
        },

        ...(keyword
          ? {
              OR: [
                { full_name: { contains: keyword } },
                { email: { contains: keyword } },
                { phone: { contains: keyword } },
                { roles: { name: { contains: keyword } } },
                { roles: { code: { contains: keyword } } },
              ],
            }
          : {}),

        ...(status ? { status } : {}),
      },
      include: {
        roles: true,
        customers: true,
        employees: true,
        tour_guides: true,
      },
      orderBy: {
        created_at: "desc",
      },
    });

    return ok(serialize(users), "Lấy danh sách nhân sự thành công");
  } catch (error) {
    console.error("GET /api/admin/users error:", error);
    return fail("Không thể lấy danh sách nhân sự", 500);
  }
}

export async function POST(req: Request) {
  const auth = requireRole(req, ["ADMIN"]);
  if (!auth.ok) {
    return fail(
      auth.reason === "UNAUTHORIZED" ? "Chưa đăng nhập" : "Không có quyền",
      auth.reason === "UNAUTHORIZED" ? 401 : 403
    );
  }

  try {
    const body = await req.json();
    const parsed = createUserSchema.safeParse(body);

    if (!parsed.success) {
      return fail("Dữ liệu không hợp lệ", 422, parsed.error.flatten());
    }

    const data = parsed.data;

    if (!data.email && !data.phone) {
      return fail("Phải có email hoặc số điện thoại", 422);
    }

    const existed = await prisma.users.findFirst({
      where: {
        OR: [
          data.email ? { email: data.email } : undefined,
          data.phone ? { phone: data.phone } : undefined,
        ].filter(Boolean) as any,
      },
    });

    if (existed) {
      return fail("Email hoặc số điện thoại đã tồn tại", 409);
    }

    const role = await prisma.roles.findUnique({
      where: { code: data.roleCode },
    });

    if (!role) {
      return fail("Không tìm thấy role", 404);
    }

    const passwordHash = await hashPassword(data.password);

    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.users.create({
        data: {
          role_id: role.id,
          email: data.email || null,
          phone: data.phone || null,
          password_hash: passwordHash,
          full_name: data.fullName,
          status: data.status,
        },
        include: {
          roles: true,
        },
      });

      if (data.roleCode === "CUSTOMER") {
        await tx.customers.create({
          data: {
            user_id: user.id,
            customer_code: makeCode("CUS"),
            full_name: data.fullName,
            email: data.email || null,
            phone: data.phone || null,
            address: data.address || null,
            customer_type: "INDIVIDUAL",
          },
        });
      }

      if (data.roleCode === "STAFF" || data.roleCode === "ADMIN") {
        await tx.employees.create({
          data: {
            user_id: user.id,
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

            status: "ACTIVE",
          },
        });
      }

      if (data.roleCode === "GUIDE") {
        await tx.tour_guides.create({
          data: {
            user_id: user.id,
            guide_code: makeCode("GD"),
            region: data.region || null,
            languages: data.languages || null,
            experience_years: Number(data.experienceYears || 0),
            status: "ACTIVE",
          },
        });
      }

      const fullUser = await tx.users.findUnique({
        where: { id: user.id },
        include: {
          roles: true,
          customers: true,
          employees: true,
          tour_guides: true,
        },
      });

      return fullUser;
    });

    return ok(serialize(created), "Tạo tài khoản thành công", 201);
  } catch (error) {
    console.error("POST /api/admin/users error:", error);
    return fail("Không thể tạo tài khoản", 500);
  }
}