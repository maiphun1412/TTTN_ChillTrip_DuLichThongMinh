import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function serialize(data: any) {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

function makePromotionCode() {
  return `KM${Date.now()}`;
}

function parseDate(value: any) {
  if (!value) return null;

  const text = String(value).trim();

  if (!text) return null;

  // input type="date": 2026-05-29
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return new Date(`${text}T00:00:00`);
  }

  // input datetime-local: 2026-05-29T10:30
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(text)) {
    return new Date(text);
  }

  const date = new Date(text);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const keyword = searchParams.get("keyword") || "";
    const status = searchParams.get("status") || "";
    const promotionType = searchParams.get("promotionType") || "";

    const promotions = await prisma.$queryRaw`
      SELECT
        p.id,
        p.promotion_code,
        p.promotion_name,
        p.promotion_type,
        p.discount_value,
        p.min_order_amount,
        p.max_discount_amount,
        p.usage_limit,
        p.used_count,
        p.start_at,
        p.end_at,
        p.status,
        p.description,
        COUNT(pt.tour_id) AS tour_count
      FROM promotions p
      LEFT JOIN promotion_tours pt ON pt.promotion_id = p.id
      WHERE
        (${keyword} = '' OR p.promotion_code LIKE ${`%${keyword}%`} OR p.promotion_name LIKE ${`%${keyword}%`})
        AND (${status} = '' OR p.status = ${status})
        AND (${promotionType} = '' OR p.promotion_type = ${promotionType})
      GROUP BY
        p.id,
        p.promotion_code,
        p.promotion_name,
        p.promotion_type,
        p.discount_value,
        p.min_order_amount,
        p.max_discount_amount,
        p.usage_limit,
        p.used_count,
        p.start_at,
        p.end_at,
        p.status,
        p.description
      ORDER BY p.start_at DESC
    `;

    return NextResponse.json({
      success: true,
      data: serialize(promotions),
    });
  } catch (error) {
    console.error("GET_ADMIN_PROMOTIONS_ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Không lấy được danh sách khuyến mãi" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const promotionCode =
      String(body.promotionCode || "").trim() || makePromotionCode();

    const promotionName = String(body.promotionName || "").trim();
    const promotionType = String(body.promotionType || "AMOUNT")
      .trim()
      .toUpperCase();

    const discountValue = Number(body.discountValue || 0);
    const minOrderAmount = Number(body.minOrderAmount || 0);

    const maxDiscountAmount =
      body.maxDiscountAmount === "" ||
      body.maxDiscountAmount === null ||
      body.maxDiscountAmount === undefined
        ? null
        : Number(body.maxDiscountAmount || 0);

    const usageLimit =
      body.usageLimit === "" ||
      body.usageLimit === null ||
      body.usageLimit === undefined
        ? null
        : Number(body.usageLimit || 0);

    const startAt = parseDate(body.startAt || body.start_at);
    const endAt = parseDate(body.endAt || body.end_at);

    const status = String(body.status || "ACTIVE").trim().toUpperCase();

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
        { success: false, message: "Ngày bắt đầu hoặc ngày kết thúc không hợp lệ" },
        { status: 400 }
      );
    }

    if (endAt.getTime() < startAt.getTime()) {
      return NextResponse.json(
        { success: false, message: "Ngày kết thúc phải sau ngày bắt đầu" },
        { status: 400 }
      );
    }

    if (discountValue <= 0) {
      return NextResponse.json(
        { success: false, message: "Giá trị giảm phải lớn hơn 0" },
        { status: 400 }
      );
    }

    if (maxDiscountAmount !== null && Number.isNaN(maxDiscountAmount)) {
      return NextResponse.json(
        { success: false, message: "Giảm tối đa không hợp lệ" },
        { status: 400 }
      );
    }

    if (usageLimit !== null && Number.isNaN(usageLimit)) {
      return NextResponse.json(
        { success: false, message: "Số lượt sử dụng không hợp lệ" },
        { status: 400 }
      );
    }

    const created = await prisma.$queryRaw`
      INSERT INTO promotions (
        promotion_code,
        promotion_name,
        promotion_type,
        discount_value,
        min_order_amount,
        max_discount_amount,
        usage_limit,
        used_count,
        start_at,
        end_at,
        status,
        description
      )
      OUTPUT INSERTED.*
      VALUES (
        ${promotionCode},
        ${promotionName},
        ${promotionType},
        ${discountValue},
        ${minOrderAmount},
        ${maxDiscountAmount},
        ${usageLimit},
        0,
        ${startAt},
        ${endAt},
        ${status},
        ${description}
      )
    `;

    return NextResponse.json({
      success: true,
      message: "Tạo khuyến mãi thành công",
      data: serialize(created),
    });
  } catch (error) {
    console.error("CREATE_ADMIN_PROMOTION_ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Không tạo được khuyến mãi" },
      { status: 500 }
    );
  }
}