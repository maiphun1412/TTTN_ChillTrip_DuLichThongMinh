import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail } from "@/lib/api-response";
import { requireRole } from "@/lib/permissions";
import { withPrivacyAccessLog, withAuditLog } from "@/lib/privacy/log";
import { loadCustomerSnapshot } from "@/lib/privacy/snapshots";

function serialize(data: any) {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

function escapeSql(value: string) {
  return value.replace(/'/g, "''");
}

async function getHandler(req: NextRequest) {
  const auth = await requireRole(req, ["ADMIN"]);
  if (!auth.ok) {
    return fail(
      auth.reason === "UNAUTHORIZED" ? "Chưa đăng nhập" : "Không có quyền",
      auth.reason === "UNAUTHORIZED" ? 401 : 403
    );
  }

  try {
    const { searchParams } = new URL(req.url);

    const keyword = searchParams.get("keyword")?.trim();
    const customerType = searchParams.get("customerType")?.trim();

    let whereSql = "WHERE 1 = 1";

    if (keyword) {
      const safeKeyword = escapeSql(keyword);
      whereSql += `
        AND (
          c.customer_code LIKE N'%${safeKeyword}%'
          OR c.full_name LIKE N'%${safeKeyword}%'
          OR c.email LIKE N'%${safeKeyword}%'
          OR c.phone LIKE N'%${safeKeyword}%'
        )
      `;
    }

    if (customerType) {
      whereSql += ` AND c.customer_type = '${escapeSql(customerType)}'`;
    }

    const customers = await prisma.$queryRawUnsafe(`
      SELECT
        c.id,
        c.user_id,
        c.customer_code,
        c.full_name,
        c.gender,
        c.date_of_birth,
        c.email,
        c.phone,
        c.address,
        c.customer_type,
        c.notes,
        c.created_at,
        c.updated_at,

        COUNT(b.id) AS booking_count,
        ISNULL(SUM(CAST(b.total_payable_amount AS DECIMAL(18,2))), 0) AS total_spent
      FROM customers c
      LEFT JOIN bookings b ON b.customer_id = c.id
      ${whereSql}
      GROUP BY
        c.id,
        c.user_id,
        c.customer_code,
        c.full_name,
        c.gender,
        c.date_of_birth,
        c.email,
        c.phone,
        c.address,
        c.customer_type,
        c.notes,
        c.created_at,
        c.updated_at
      ORDER BY c.created_at DESC
    `);

    return NextResponse.json({
      success: true,
      data: serialize(customers),
    });
  } catch (error) {
    console.error("GET_ADMIN_CUSTOMERS_ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Không lấy được danh sách khách hàng" },
      { status: 500 }
    );
  }
}

async function postHandler(req: Request) {
  const auth = await requireRole(req, ["ADMIN"]);
  if (!auth.ok) {
    return fail(
      auth.reason === "UNAUTHORIZED" ? "Chưa đăng nhập" : "Không có quyền",
      auth.reason === "UNAUTHORIZED" ? 401 : 403
    );
  }

  try {
    const body = await req.json();

    const fullName = String(body.fullName || "").trim();
    const gender = body.gender ? String(body.gender).trim() : null;
    const dateOfBirth = body.dateOfBirth ? String(body.dateOfBirth) : null;
    const email = body.email ? String(body.email).trim() : null;
    const phone = body.phone ? String(body.phone).trim() : null;
    const address = body.address ? String(body.address).trim() : null;
    const customerType = String(body.customerType || "INDIVIDUAL").trim();
    const notes = body.notes ? String(body.notes).trim() : null;

    if (!fullName) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập tên khách hàng" },
        { status: 400 }
      );
    }

    const customerCode = `CUS${Date.now()}`;

    const created = await prisma.$queryRawUnsafe(`
      INSERT INTO customers (
        customer_code,
        full_name,
        gender,
        date_of_birth,
        email,
        phone,
        address,
        customer_type,
        notes,
        created_at,
        updated_at
      )
      OUTPUT INSERTED.*
      VALUES (
        '${customerCode}',
        N'${escapeSql(fullName)}',
        ${gender ? `N'${escapeSql(gender)}'` : "NULL"},
        ${dateOfBirth ? `'${escapeSql(dateOfBirth)}'` : "NULL"},
        ${email ? `'${escapeSql(email)}'` : "NULL"},
        ${phone ? `'${escapeSql(phone)}'` : "NULL"},
        ${address ? `N'${escapeSql(address)}'` : "NULL"},
        '${escapeSql(customerType)}',
        ${notes ? `N'${escapeSql(notes)}'` : "NULL"},
        GETDATE(),
        GETDATE()
      )
    `);

    return NextResponse.json({
      success: true,
      message: "Thêm khách hàng thành công",
      data: serialize(created),
    });
  } catch (error) {
    console.error("CREATE_ADMIN_CUSTOMER_ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Không thêm được khách hàng" },
      { status: 500 }
    );
  }
}

export const GET = withPrivacyAccessLog(getHandler, { dataType: "CUSTOMER_LIST", purpose: "ADMINISTRATION", listOwners: "customer" });
export const POST = withAuditLog(postHandler, { module: "CUSTOMER_MANAGEMENT", entityName: "customers", action: "CREATE", load: loadCustomerSnapshot });
