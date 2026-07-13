export type LoyaltyWallet = {
  id?: string;
  customer_id: string;
  point_balance: number;
  total_earned: number;
  total_used: number;
  pending_points?: number;
};

export type LoyaltyTransaction = {
  id: string;
  customer_id: string;
  booking_id?: string | null;
  transaction_type: "EARN" | "REDEEM" | "ADJUST" | string;
  point_status?: "PENDING" | "CONFIRMED" | string;
  points: number;
  description?: string | null;
  created_at: string;
};

export async function getLoyaltyWallet(customerId: string) {
  const res = await fetch(`/backend-api/loyalty/wallet?customerId=${customerId}`, {
    cache: "no-store",
  });

  const json = await res.json();

  if (!res.ok || !json.success) {
    throw new Error(json.message || "Không thể lấy ví điểm");
  }

  return json.data as LoyaltyWallet;
}

export async function getLoyaltyTransactions(customerId: string) {
  const res = await fetch(
    `/backend-api/loyalty/transactions?customerId=${customerId}`,
    {
      cache: "no-store",
    }
  );

  const json = await res.json();

  if (!res.ok || !json.success) {
    throw new Error(json.message || "Không thể lấy lịch sử điểm");
  }

  return json.data as LoyaltyTransaction[];
}