import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const keyword = escapeSql(searchParams.get("keyword") || "");
    const supplierType = escapeSql(searchParams.get("supplierType") || "");

    const suppliers = await prisma.$queryRawUnsafe(`
      SELECT
        id,
        supplier_code AS partner_code,
        supplier_name AS partner_name,
        supplier_type AS partner_type,
        contact_name,
        phone,
        email,
        address,
        NULL AS image_url,
        CASE WHEN is_active = 1 THEN 'ACTIVE' ELSE 'INACTIVE' END AS status,
        notes,
        created_at
      FROM suppliers
      WHERE
        (
          '${keyword}' = ''
          OR supplier_code LIKE '%${keyword}%'
          OR supplier_name LIKE N'%${keyword}%'
          OR phone LIKE '%${keyword}%'
        )
        AND ('${supplierType}' = '' OR supplier_type = '${supplierType}')
      ORDER BY created_at DESC, id DESC
    `);

    return NextResponse.json({
      success: true,
      data: serialize(suppliers),
    });
  } catch (error) {
    console.error("GET_OPERATION_SUPPLIERS_ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Không lấy được danh sách nhà cung cấp" },
      { status: 500 }
    );
  }
}