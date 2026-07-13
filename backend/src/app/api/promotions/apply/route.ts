import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type ApplyPromotionBody = {
  promotionCode: string;
  tourId: string;
  orderAmount: number;
};

function calculateDiscount(params: {
  promotionType: string;
  discountValue: number;
  maxDiscountAmount: number | null;
  orderAmount: number;
}) {
  const {
    promotionType,
    discountValue,
    maxDiscountAmount,
    orderAmount,
  } = params;

  let discountAmount = 0;

  if (promotionType === "PERCENT") {
    discountAmount = (orderAmount * discountValue) / 100;

    if (maxDiscountAmount !== null) {
      discountAmount = Math.min(discountAmount, maxDiscountAmount);
    }
  }

  if (promotionType === "AMOUNT") {
    discountAmount = discountValue;
  }

  discountAmount = Math.min(discountAmount, orderAmount);

  return discountAmount;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ApplyPromotionBody;

    const promotionCode = body.promotionCode?.trim().toUpperCase();
    const tourId = body.tourId;
    const orderAmount = Number(body.orderAmount || 0);

    if (!promotionCode) {
      return NextResponse.json(
        {
          success: false,
          message: "Vui lòng nhập mã khuyến mãi.",
        },
        { status: 400 }
      );
    }

    if (!tourId) {
      return NextResponse.json(
        {
          success: false,
          message: "Thiếu thông tin tour.",
        },
        { status: 400 }
      );
    }

    if (orderAmount <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Tổng tiền đơn hàng không hợp lệ.",
        },
        { status: 400 }
      );
    }

    const now = new Date();

    const promotion = await prisma.promotions.findFirst({
      where: {
        promotion_code: promotionCode,
        status: "ACTIVE",
        start_at: {
          lte: now,
        },
        end_at: {
          gte: now,
        },
        promotion_tours: {
          some: {
            tour_id: BigInt(tourId),
          },
        },
      },
      select: {
        id: true,
        promotion_code: true,
        promotion_name: true,
        promotion_type: true,
        discount_value: true,
        min_order_amount: true,
        max_discount_amount: true,
        usage_limit: true,
        used_count: true,
      },
    });

    if (!promotion) {
      return NextResponse.json(
        {
          success: false,
          message: "Mã khuyến mãi không tồn tại hoặc không áp dụng cho tour này.",
        },
        { status: 400 }
      );
    }

    if (
      promotion.usage_limit !== null &&
      promotion.used_count >= promotion.usage_limit
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Mã khuyến mãi đã hết lượt sử dụng.",
        },
        { status: 400 }
      );
    }

    const minOrderAmount = Number(promotion.min_order_amount);

    if (orderAmount < minOrderAmount) {
      return NextResponse.json(
        {
          success: false,
          message: `Đơn hàng cần tối thiểu ${minOrderAmount.toLocaleString(
            "vi-VN"
          )}đ để áp dụng mã này.`,
        },
        { status: 400 }
      );
    }

    const discountAmount = calculateDiscount({
      promotionType: promotion.promotion_type,
      discountValue: Number(promotion.discount_value),
      maxDiscountAmount:
        promotion.max_discount_amount === null
          ? null
          : Number(promotion.max_discount_amount),
      orderAmount,
    });

    const finalAmount = orderAmount - discountAmount;

    return NextResponse.json({
      success: true,
      data: {
        promotionId: promotion.id.toString(),
        promotionCode: promotion.promotion_code,
        promotionName: promotion.promotion_name,
        discountAmount,
        finalAmount,
      },
      message: "Áp dụng mã khuyến mãi thành công.",
    });
  } catch (error) {
    console.error("Apply promotion error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Không thể áp dụng mã khuyến mãi.",
      },
      { status: 500 }
    );
  }
}