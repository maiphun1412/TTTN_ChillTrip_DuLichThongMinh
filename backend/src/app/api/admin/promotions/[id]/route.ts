import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
  try {
    const { id } = await context.params;
    const promotionId = Number(id);

    if (!promotionId) {
      return NextResponse.json(
        { success: false, message: "ID khuyến mãi không hợp lệ" },
        { status: 400 }
      );
    }

    const promotion = await prisma.$queryRaw`
      SELECT *
      FROM promotions
      WHERE id = ${promotionId}
    `;

    if (!Array.isArray(promotion) || promotion.length === 0) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy khuyến mãi" },
        { status: 404 }
      );
    }

    const tours = await prisma.$queryRaw`
      SELECT
        t.id,
        t.tour_code,
        t.tour_name,
        t.tour_type,
        t.base_price,
        t.status
      FROM promotion_tours pt
      INNER JOIN tours t ON t.id = pt.tour_id
      WHERE pt.promotion_id = ${promotionId}
      ORDER BY t.tour_name ASC
    `;

    return NextResponse.json({
      success: true,
      data: serialize({
        promotion: promotion[0],
        tours,
      }),
    });
  } catch (error) {
    console.error("GET_ADMIN_PROMOTION_DETAIL_ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Không lấy được chi tiết khuyến mãi" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const promotionId = Number(id);
    const body = await req.json();

    if (!promotionId) {
      return NextResponse.json(
        { success: false, message: "ID khuyến mãi không hợp lệ" },
        { status: 400 }
      );
    }

    const promotionName = String(body.promotionName || "").trim();
    const promotionType = String(body.promotionType || "AMOUNT").trim();
    const discountValue = Number(body.discountValue || 0);
    const minOrderAmount = Number(body.minOrderAmount || 0);
    const maxDiscountAmount =
      body.maxDiscountAmount === "" || body.maxDiscountAmount === null
        ? null
        : Number(body.maxDiscountAmount || 0);
    const usageLimit =
      body.usageLimit === "" || body.usageLimit === null
        ? null
        : Number(body.usageLimit || 0);
    const startAt = String(body.startAt || "").trim();
    const endAt = String(body.endAt || "").trim();
    const status = String(body.status || "ACTIVE").trim();
    const description = body.description
      ? String(body.description).trim()
      : null;

    if (!promotionName) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập tên khuyến mãi" },
        { status: 400 }
      );
    }

    if (!startAt || !endAt) {
      return NextResponse.json(
        { success: false, message: "Vui lòng chọn thời gian áp dụng" },
        { status: 400 }
      );
    }

    const updated = await prisma.$queryRaw`
      UPDATE promotions
      SET
        promotion_name = ${promotionName},
        promotion_type = ${promotionType},
        discount_value = ${discountValue},
        min_order_amount = ${minOrderAmount},
        max_discount_amount = ${maxDiscountAmount},
        usage_limit = ${usageLimit},
        start_at = ${startAt},
        end_at = ${endAt},
        status = ${status},
        description = ${description}
      OUTPUT INSERTED.*
      WHERE id = ${promotionId}
    `;

    return NextResponse.json({
      success: true,
      message: "Cập nhật khuyến mãi thành công",
      data: serialize(updated),
    });
  } catch (error) {
    console.error("UPDATE_ADMIN_PROMOTION_ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Không cập nhật được khuyến mãi" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const promotionId = Number(id);

    if (!promotionId) {
      return NextResponse.json(
        { success: false, message: "ID khuyến mãi không hợp lệ" },
        { status: 400 }
      );
    }

    const used = await prisma.$queryRaw`
      SELECT TOP 1 id
      FROM booking_promotions
      WHERE promotion_id = ${promotionId}
    `;

    if (Array.isArray(used) && used.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Khuyến mãi đã được sử dụng, không thể xóa",
        },
        { status: 400 }
      );
    }

    await prisma.$executeRaw`
      DELETE FROM promotion_tours
      WHERE promotion_id = ${promotionId}
    `;

    await prisma.$executeRaw`
      DELETE FROM promotions
      WHERE id = ${promotionId}
    `;

    return NextResponse.json({
      success: true,
      message: "Xóa khuyến mãi thành công",
    });
  } catch (error) {
    console.error("DELETE_ADMIN_PROMOTION_ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Không xóa được khuyến mãi" },
      { status: 500 }
    );
  }
}