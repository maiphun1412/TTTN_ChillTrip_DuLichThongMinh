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

const updateSupplierSchema = z.object({
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

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = requireRole(req, ["ADMIN"]);
  if (!auth.ok) {
    return fail(
      auth.reason === "UNAUTHORIZED" ? "Chưa đăng nhập" : "Không có quyền",
      auth.reason === "UNAUTHORIZED" ? 401 : 403
    );
  }

  try {
    const { id } = await context.params;
    const supplierId = Number(id);

    if (!supplierId) {
      return fail("ID nhà cung cấp không hợp lệ", 400);
    }

    const supplier = await prisma.suppliers.findUnique({
      where: { id: supplierId },
    });

    if (!supplier) {
      return fail("Không tìm thấy nhà cung cấp", 404);
    }

    return ok(serialize(supplier), "Lấy chi tiết nhà cung cấp thành công");
  } catch (error) {
    console.error("GET /api/admin/suppliers/[id] error:", error);
    return fail("Không thể lấy chi tiết nhà cung cấp", 500);
  }
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = requireRole(req, ["ADMIN"]);
  if (!auth.ok) {
    return fail(
      auth.reason === "UNAUTHORIZED" ? "Chưa đăng nhập" : "Không có quyền",
      auth.reason === "UNAUTHORIZED" ? 401 : 403
    );
  }

  try {
    const { id } = await context.params;
    const supplierId = Number(id);

    if (!supplierId) {
      return fail("ID nhà cung cấp không hợp lệ", 400);
    }

    const body = await req.json();
    const parsed = updateSupplierSchema.safeParse(body);

    if (!parsed.success) {
      return fail("Dữ liệu không hợp lệ", 422, parsed.error.flatten());
    }

    const data = parsed.data;

    const current = await prisma.suppliers.findUnique({
      where: { id: supplierId },
    });

    if (!current) {
      return fail("Không tìm thấy nhà cung cấp", 404);
    }

    const duplicated = await prisma.suppliers.findFirst({
      where: {
        id: { not: supplierId },
        OR: [
          data.email ? { email: data.email } : undefined,
          data.phone ? { phone: data.phone } : undefined,
          data.taxCode ? { tax_code: data.taxCode } : undefined,
        ].filter(Boolean) as any,
      },
    });

    if (duplicated) {
      return fail("Email, số điện thoại hoặc mã số thuế đã tồn tại", 409);
    }

    const updated = await prisma.suppliers.update({
      where: { id: supplierId },
      data: {
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

    return ok(serialize(updated), "Cập nhật nhà cung cấp thành công");
  } catch (error) {
    console.error("PUT /api/admin/suppliers/[id] error:", error);
    return fail("Không thể cập nhật nhà cung cấp", 500);
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = requireRole(req, ["ADMIN"]);
  if (!auth.ok) {
    return fail(
      auth.reason === "UNAUTHORIZED" ? "Chưa đăng nhập" : "Không có quyền",
      auth.reason === "UNAUTHORIZED" ? 401 : 403
    );
  }

  try {
    const { id } = await context.params;
    const supplierId = Number(id);

    if (!supplierId) {
      return fail("ID nhà cung cấp không hợp lệ", 400);
    }

    const supplier = await prisma.suppliers.findUnique({
      where: { id: supplierId },
    });

    if (!supplier) {
      return fail("Không tìm thấy nhà cung cấp", 404);
    }

    await prisma.suppliers.update({
      where: { id: supplierId },
      data: {
        is_active: false,
      },
    });

    return ok(null, "Xóa nhà cung cấp thành công");
  } catch (error) {
    console.error("DELETE /api/admin/suppliers/[id] error:", error);
    return fail(
      "Không thể xóa nhà cung cấp. Nhà cung cấp có thể đang liên kết dữ liệu khác.",
      500
    );
  }
}