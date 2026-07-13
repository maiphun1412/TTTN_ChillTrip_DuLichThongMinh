export type Promotion = {
  id: string;
  promotion_code: string;
  promotion_name: string;
  promotion_type: "PERCENT" | "AMOUNT";
  discount_value: string | number;
  min_order_amount: string | number;
  max_discount_amount?: string | number | null;
  usage_limit?: number | null;
  used_count: number;
  start_at: string;
  end_at: string;
  status: string;
  description?: string | null;
};

export type ApplyPromotionResponse = {
  promotionId: string;
  promotionCode: string;
  promotionName: string;
  discountAmount: number;
  finalAmount: number;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

export async function getPromotions(tourId?: string) {
  const url = tourId
    ? `${API_BASE_URL}/api/promotions?tourId=${tourId}`
    : `${API_BASE_URL}/api/promotions`;

  const response = await fetch(url, {
    cache: "no-store",
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.message || "Không thể lấy danh sách khuyến mãi.");
  }

  return json.data as Promotion[];
}

export async function applyPromotion(params: {
  promotionCode: string;
  tourId: string;
  orderAmount: number;
}) {
  const response = await fetch(`${API_BASE_URL}/api/promotions/apply`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.message || "Không thể áp dụng mã khuyến mãi.");
  }

  return json.data as ApplyPromotionResponse;
}