import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail } from "@/lib/api-response";
import { requireRole } from "@/lib/permissions";

function serialize(data: any) {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
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
    const customerId = Number(id);

    if (!customerId) {
      return NextResponse.json(
        { success: false, message: "ID khách hàng không hợp lệ" },
        { status: 400 }
      );
    }

    const customer = await prisma.$queryRaw`
      SELECT
        c.*,
        COUNT(b.id) AS booking_count,
        ISNULL(SUM(CAST(b.total_payable_amount AS DECIMAL(18,2))), 0) AS total_spent
      FROM customers c
      LEFT JOIN bookings b ON b.customer_id = c.id
      WHERE c.id = ${customerId}
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
    `;

    if (!Array.isArray(customer) || customer.length === 0) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy khách hàng" },
        { status: 404 }
      );
    }

    const bookings = await prisma.$queryRaw`
      SELECT
        b.id,
        b.booking_code,
        b.booking_status,
        b.total_payable_amount,
        b.booked_at,
        t.tour_name,
        ds.start_date,
        ds.end_date
      FROM bookings b
      LEFT JOIN tours t ON b.tour_id = t.id
      LEFT JOIN departure_schedules ds ON b.departure_id = ds.id
      WHERE b.customer_id = ${customerId}
      ORDER BY b.booked_at DESC
    `;

    return NextResponse.json({
      success: true,
      data: serialize({
        customer: customer[0],
        bookings,
      }),
    });
  } catch (error) {
    console.error("GET_ADMIN_CUSTOMER_DETAIL_ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Không lấy được chi tiết khách hàng" },
      { status: 500 }
    );
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
    const customerId = Number(id);
    const body = await req.json();

    if (!customerId) {
      return NextResponse.json(
        { success: false, message: "ID khách hàng không hợp lệ" },
        { status: 400 }
      );
    }

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

    const exists = await prisma.$queryRaw`
      SELECT TOP 1 id
      FROM customers
      WHERE id = ${customerId}
    `;

    if (!Array.isArray(exists) || exists.length === 0) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy khách hàng" },
        { status: 404 }
      );
    }

    const updated = await prisma.$queryRaw`
      UPDATE customers
      SET
        full_name = ${fullName},
        gender = ${gender},
        date_of_birth = ${dateOfBirth},
        email = ${email},
        phone = ${phone},
        address = ${address},
        customer_type = ${customerType},
        notes = ${notes},
        updated_at = GETDATE()
      OUTPUT INSERTED.*
      WHERE id = ${customerId}
    `;

    return NextResponse.json({
      success: true,
      message: "Cập nhật khách hàng thành công",
      data: serialize(updated),
    });
  } catch (error) {
    console.error("UPDATE_ADMIN_CUSTOMER_ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Không cập nhật được khách hàng" },
      { status: 500 }
    );
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
    const customerId = Number(id);

    if (!customerId) {
      return NextResponse.json(
        { success: false, message: "ID khách hàng không hợp lệ" },
        { status: 400 }
      );
    }

    const hasBookings = await prisma.$queryRaw`
      SELECT TOP 1 id
      FROM bookings
      WHERE customer_id = ${customerId}
    `;

    if (Array.isArray(hasBookings) && hasBookings.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Khách hàng đã có đơn đặt tour, không thể xóa",
        },
        { status: 400 }
      );
    }

    await prisma.$executeRaw`
      DELETE FROM customers
      WHERE id = ${customerId}
    `;

    return NextResponse.json({
      success: true,
      message: "Xóa khách hàng thành công",
    });
  } catch (error) {
    console.error("DELETE_ADMIN_CUSTOMER_ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Không xóa được khách hàng" },
      { status: 500 }
    );
  }
}