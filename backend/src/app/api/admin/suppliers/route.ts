import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api-response";
import { requireRole } from "@/lib/permissions";
import { z } from "zod";

function serialize<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

const supplierSchema = z.object({
  supplierName: z.string().min(2, "Tên nhà cung cấp tối thiểu 2 ký tự"),
  supplierType: z.string().min(1, "Vui lòng chọn loại nhà cung cấp"),
  contactName: z.string().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  email: z.string().email("Email không hợp lệ").optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  taxCode: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});

function makeCode() {
  return `SUP${Date.now()}`;
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
    const supplierType = searchParams.get("supplierType")?.trim() || "";
    const isActive = searchParams.get("isActive");

    const suppliers = await prisma.suppliers.findMany({
      where: {
        ...(keyword
          ? {
              OR: [
                { supplier_code: { contains: keyword } },
                { supplier_name: { contains: keyword } },
                { contact_name: { contains: keyword } },
                { phone: { contains: keyword } },
                { email: { contains: keyword } },
              ],
            }
          : {}),

        ...(supplierType ? { supplier_type: supplierType } : {}),

        ...(isActive === "true"
          ? { is_active: true }
          : isActive === "false"
          ? { is_active: false }
          : {}),
      },
      orderBy: {
        created_at: "desc",
      },
    });

    return ok(serialize(suppliers), "Lấy danh sách nhà cung cấp thành công");
  } catch (error) {
    console.error("GET /api/admin/suppliers error:", error);
    return fail("Không thể lấy danh sách nhà cung cấp", 500);
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
    const parsed = supplierSchema.safeParse(body);

    if (!parsed.success) {
      return fail("Dữ liệu không hợp lệ", 422, parsed.error.flatten());
    }

    const data = parsed.data;

    const existed = await prisma.suppliers.findFirst({
      where: {
        OR: [
          data.email ? { email: data.email } : undefined,
          data.phone ? { phone: data.phone } : undefined,
          data.taxCode ? { tax_code: data.taxCode } : undefined,
        ].filter(Boolean) as any,
      },
    });

    if (existed) {
      return fail("Email, số điện thoại hoặc mã số thuế đã tồn tại", 409);
    }

    const created = await prisma.suppliers.create({
      data: {
        supplier_code: makeCode(),
        supplier_name: data.supplierName,
        supplier_type: data.supplierType,
        contact_name: data.contactName || null,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        tax_code: data.taxCode || null,
        notes: data.notes || null,
        is_active: data.isActive,
      },
    });

    return ok(serialize(created), "Tạo nhà cung cấp thành công", 201);
  } catch (error) {
    console.error("POST /api/admin/suppliers error:", error);
    return fail("Không thể tạo nhà cung cấp", 500);
  }
}