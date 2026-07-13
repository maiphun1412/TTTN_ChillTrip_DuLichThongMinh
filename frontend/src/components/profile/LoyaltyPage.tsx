"use client";

import { useEffect, useMemo, useState } from "react";
import HomeHeader from "../home/HomeHeader";
import {
  getLoyaltyTransactions,
  getLoyaltyWallet,
  type LoyaltyTransaction,
  type LoyaltyWallet,
} from "@/lib/loyalty.api";

const POINT_RATE_AMOUNT = 10000;
const POINT_RATE_POINT = 1;

function formatDate(date?: string) {
  if (!date) return "Đang cập nhật";

  return new Date(date).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatPrice(value: number) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

function getTransactionLabel(type: string) {
  if (type === "EARN") return "Tích điểm";
  if (type === "REDEEM") return "Đổi điểm";
  return "Điều chỉnh";
}

function getTransactionSign(type: string) {
  return type === "EARN" ? "+" : "-";
}

export default function LoyaltyPage() {
  const [wallet, setWallet] = useState<LoyaltyWallet | null>(null);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [loading, setLoading] = useState(true);

useEffect(() => {
  async function loadLoyalty() {
    try {
      setLoading(true);

      const token =
        localStorage.getItem("access_token") ||
        sessionStorage.getItem("access_token");

      if (!token) {
        setWallet(null);
        setTransactions([]);
        return;
      }

      const meRes = await fetch("/backend-api/auth/me", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const meJson = await meRes.json();

      if (!meRes.ok || !meJson.success) {
        setWallet(null);
        setTransactions([]);
        return;
      }

      const customerId = meJson.data?.customer?.id;

      if (!customerId) {
        setWallet(null);
        setTransactions([]);
        return;
      }

      const [walletData, transactionData] = await Promise.all([
        getLoyaltyWallet(String(customerId)),
        getLoyaltyTransactions(String(customerId)),
      ]);

      setWallet(walletData);
      setTransactions(transactionData);
    } catch (error) {
      console.error("Load loyalty error:", error);
      setWallet(null);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }

  loadLoyalty();
}, []);

  const currentPoints = Number(wallet?.point_balance || 0);
  const totalEarned = Number(wallet?.total_earned || 0);
  const totalUsed = Number(wallet?.total_used || 0);
  const pendingPoints = Number(wallet?.pending_points || 0);

  const memberTier = useMemo(() => {
    if (totalEarned >= 5000) return "Platinum";
    if (totalEarned >= 2000) return "Gold";
    if (totalEarned >= 500) return "Silver";
    return "Starter";
  }, [totalEarned]);

  const nextTier = useMemo(() => {
    if (totalEarned < 500) return { name: "Silver", target: 500 };
    if (totalEarned < 2000) return { name: "Gold", target: 2000 };
    if (totalEarned < 5000) return { name: "Platinum", target: 5000 };
    return null;
  }, [totalEarned]);

  const progressPercent = nextTier
    ? Math.min(Math.round((totalEarned / nextTier.target) * 100), 100)
    : 100;

  const estimatedValue = currentPoints * POINT_RATE_AMOUNT;

  return (
    <main className="min-h-screen bg-[#f6fafb] text-[#181c1d]">
      <HomeHeader />

      <div className="mx-auto max-w-7xl px-4 pb-24 pt-28 md:px-8">
        <div className="mb-8">
          <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-[#9b4500]">
            ChillTrip Rewards
          </p>
          <h1 className="text-4xl font-black tracking-[-0.04em] text-[#00606c] md:text-5xl">
            Điểm thưởng của tôi
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5f7378]">
            Tích điểm sau mỗi booking thành công và dùng điểm cho những ưu đãi
            trong các chuyến đi tiếp theo.
          </p>
        </div>

        {loading ? (
          <div className="rounded-[32px] bg-white p-12 text-center text-lg font-bold text-[#00606c] shadow-sm">
            Đang tải điểm thưởng...
          </div>
        ) : (
          <>
            <section className="mb-10 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
              <div className="relative overflow-hidden rounded-[36px] bg-[linear-gradient(135deg,#00545f_0%,#008292_100%)] p-8 text-white shadow-[0_22px_60px_rgba(0,96,108,0.22)] md:p-10">
                <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#9defff]/20 blur-3xl" />
                <div className="absolute -bottom-20 left-8 h-56 w-56 rounded-full bg-[#fc8a40]/20 blur-3xl" />

                <div className="relative z-10">
                  <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-start">
                    <div>
                      <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#ddf9ff]">
                        Số điểm hiện có
                      </p>

                      <div className="mt-4 flex items-end gap-3">
                        <span className="text-6xl font-black tracking-[-0.06em] md:text-7xl">
                          {currentPoints.toLocaleString("vi-VN")}
                        </span>
                        <span className="mb-3 text-lg font-bold text-[#ddf9ff]">
                          điểm
                        </span>
                      </div>
                    </div>

                    <div className="w-fit rounded-2xl border border-white/20 bg-white/15 px-5 py-3 backdrop-blur-md">
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#ddf9ff]">
                        Hạng thành viên
                      </p>
                      <p className="mt-1 text-2xl font-black">{memberTier}</p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <RewardMiniCard
                      label="Tổng đã tích"
                      value={totalEarned.toLocaleString("vi-VN")}
                    />
                    <RewardMiniCard
                      label="Đã sử dụng"
                      value={totalUsed.toLocaleString("vi-VN")}
                    />
                   <RewardMiniCard
  label="Điểm chờ xác nhận"
  value={pendingPoints.toLocaleString("vi-VN")}
/>
                  </div>

                  <div className="mt-8 rounded-3xl bg-white/12 p-5 backdrop-blur-md">
                    <div className="mb-3 flex items-center justify-between gap-4">
                      <p className="text-sm font-bold text-[#ddf9ff]">
                        {nextTier
                          ? `Còn ${Math.max(
                              nextTier.target - totalEarned,
                              0
                            ).toLocaleString("vi-VN")} điểm để lên ${
                              nextTier.name
                            }`
                          : "Bạn đã đạt hạng cao nhất"}
                      </p>

                      <p className="text-sm font-black">{progressPercent}%</p>
                    </div>

                    <div className="h-3 overflow-hidden rounded-full bg-white/20">
                      <div
                        className="h-full rounded-full bg-[#fc8a40] transition-all"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[36px] border border-[#e7ecee] bg-white p-8 shadow-sm">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fff3e8] text-2xl">
                  🎁
                </div>

                <h2 className="mb-3 text-2xl font-black text-[#00606c]">
                  Cách tính điểm
                </h2>

                <div className="space-y-4 text-sm text-[#3e494b]">
                  <RuleRow
                    title={`${formatPrice(POINT_RATE_AMOUNT)} = ${POINT_RATE_POINT} điểm`}
                    desc="Điểm được cộng sau khi booking thanh toán thành công."
                  />
                  <RuleRow
                    title="Không cộng trùng booking"
                    desc="Mỗi booking chỉ được tích điểm một lần."
                  />
                  <RuleRow
                    title="Dùng cho ưu đãi sau"
                    desc="Điểm có thể dùng để đổi voucher trong các phiên bản tiếp theo."
                  />
                </div>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
              <div className="rounded-[32px] bg-white p-7 shadow-sm">
                <h2 className="mb-6 text-2xl font-black text-[#00606c]">
                  Quyền lợi hạng thành viên
                </h2>

                <div className="space-y-4">
                  <TierCard
                    active={memberTier === "Starter"}
                    title="Starter"
                    point="0+ điểm"
                    benefits="Bắt đầu tích điểm cho mỗi chuyến đi."
                  />
                  <TierCard
                    active={memberTier === "Silver"}
                    title="Silver"
                    point="500+ điểm"
                    benefits="Ưu tiên nhận thông báo deal mới."
                  />
                  <TierCard
                    active={memberTier === "Gold"}
                    title="Gold"
                    point="2.000+ điểm"
                    benefits="Ưu đãi riêng cho một số tour chọn lọc."
                  />
                  <TierCard
                    active={memberTier === "Platinum"}
                    title="Platinum"
                    point="5.000+ điểm"
                    benefits="Quyền lợi cao nhất cho khách hàng thân thiết."
                  />
                </div>
              </div>

              <div className="rounded-[32px] bg-white p-7 shadow-sm">
                <div className="mb-6 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black text-[#00606c]">
                      Lịch sử điểm
                    </h2>
                    <p className="mt-1 text-sm text-[#6e797b]">
                      Theo dõi toàn bộ điểm đã cộng hoặc đã sử dụng.
                    </p>
                  </div>
                </div>

                {transactions.length === 0 ? (
                  <div className="rounded-3xl bg-[#f6fafb] p-10 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white text-3xl shadow-sm">
                      ✈️
                    </div>
                    <p className="font-black text-[#00606c]">
                      Chưa có giao dịch điểm nào
                    </p>
                    <p className="mt-2 text-sm text-[#6e797b]">
                      Sau khi booking thanh toán thành công, điểm sẽ hiển thị ở
                      đây.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {transactions.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-4 rounded-3xl border border-[#e7ecee] p-5 transition hover:bg-[#f6fafb]"
                      >
                        <div className="flex items-start gap-4">
                          <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xl ${
                              item.transaction_type === "EARN"
                                ? "bg-[#eaf8fa]"
                                : "bg-[#fff1f1]"
                            }`}
                          >
                            {item.transaction_type === "EARN" ? "＋" : "−"}
                          </div>

                          <div>
                            <p className="font-black text-[#181c1d]">
                              {getTransactionLabel(item.transaction_type)}
                            </p>
                            <p className="mt-1 text-sm text-[#6e797b]">
                              {item.description || "Giao dịch điểm thưởng"}
                            </p>

                            {item.point_status ? (
  <span
    className={`mt-2 inline-flex rounded-full px-3 py-1 text-[11px] font-black ${
      item.point_status === "CONFIRMED"
        ? "bg-[#eaf8fa] text-[#00606c]"
        : "bg-[#fff3e8] text-[#9b4500]"
    }`}
  >
    {item.point_status === "CONFIRMED"
      ? "Đã cộng vào ví"
      : "Chờ xác nhận sau chuyến đi"}
  </span>
) : null}
                            <p className="mt-1 text-xs text-[#9ca3af]">
                              {formatDate(item.created_at)}
                            </p>
                          </div>
                        </div>

                        <p
                          className={`shrink-0 text-2xl font-black ${
                            item.transaction_type === "EARN"
                              ? "text-[#00606c]"
                              : "text-[#ba1a1a]"
                          }`}
                        >
                          {getTransactionSign(item.transaction_type)}
                          {Math.abs(Number(item.points || 0)).toLocaleString(
                            "vi-VN"
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function RewardMiniCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-white/15 p-5 backdrop-blur-md">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#ddf9ff]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function RuleRow({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl bg-[#f6fafb] p-4">
      <p className="font-black text-[#181c1d]">{title}</p>
      <p className="mt-1 leading-6 text-[#6e797b]">{desc}</p>
    </div>
  );
}

function TierCard({
  active,
  title,
  point,
  benefits,
}: {
  active: boolean;
  title: string;
  point: string;
  benefits: string;
}) {
  return (
    <div
      className={`rounded-3xl border p-5 ${
        active
          ? "border-[#00606c] bg-[#eaf8fa]"
          : "border-[#e7ecee] bg-white"
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-lg font-black text-[#00606c]">{title}</p>
        <span
          className={`rounded-full px-3 py-1 text-xs font-black ${
            active ? "bg-[#00606c] text-white" : "bg-[#f1f4f5] text-[#6e797b]"
          }`}
        >
          {point}
        </span>
      </div>
      <p className="text-sm leading-6 text-[#6e797b]">{benefits}</p>
    </div>
  );
}