"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import HomeHeader from "../home/HomeHeader";

type ApiPromotion = {
  id: string;
  promotion_code: string;
  promotion_name: string;
  promotion_type: "PERCENT" | "AMOUNT" | string;
  discount_value: string | number;
  min_order_amount: string | number;
  max_discount_amount?: string | number | null;
  usage_limit?: number | null;
  used_count?: number;
  start_at: string;
  end_at: string;
  status: string;
  description?: string | null;
  imageUrl?: string | null;
  destination?: string | null;
  originalPrice?: number | null;
  discountedPrice?: number | null;
  category?: string | null;
};

const promoImages = [
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1527631746610-bca00a040d60?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1493558103817-58b2924bce98?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1519046904884-53103b34b206?q=80&w=1200&auto=format&fit=crop",
];

const categories = [
  "Tất cả ưu đãi",
  "Flash Deals",
  "Last Minute",
  "Member Exclusives",
  "Vé Máy Bay",
  "Khách Sạn",
];

function formatPrice(price?: string | number | null) {
  return `${Number(price || 0).toLocaleString("vi-VN")}đ`;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("vi-VN");
}

function getCountdown(endAt?: string | null) {
  if (!endAt) return "Đang cập nhật";

  const diff = new Date(endAt).getTime() - Date.now();

  if (diff <= 0) return "Đã kết thúc";

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (num: number) => String(num).padStart(2, "0");

  if (days > 0) {
    return `${days} ngày ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function getDiscountText(promotion: ApiPromotion) {
  if (promotion.promotion_type === "PERCENT") {
    return `-${promotion.discount_value}%`;
  }

  return `-${Number(promotion.discount_value).toLocaleString("vi-VN")}đ`;
}

function calculateOriginalPrice(promotion: ApiPromotion, index: number) {
  if (promotion.originalPrice) return Number(promotion.originalPrice);

  const minOrderAmount = Number(promotion.min_order_amount || 0);

  if (minOrderAmount > 0) {
    return minOrderAmount + 5000000;
  }

  return 10000000 + index * 2500000;
}

function calculateDiscountedPrice(
  promotion: ApiPromotion,
  originalPrice: number
) {
  if (promotion.discountedPrice) return Number(promotion.discountedPrice);

  if (promotion.promotion_type === "PERCENT") {
    const discountAmount =
      (originalPrice * Number(promotion.discount_value || 0)) / 100;

    const maxDiscount = promotion.max_discount_amount
      ? Number(promotion.max_discount_amount)
      : discountAmount;

    return Math.max(originalPrice - Math.min(discountAmount, maxDiscount), 0);
  }

  return Math.max(originalPrice - Number(promotion.discount_value || 0), 0);
}

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<ApiPromotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("Tất cả ưu đãi");
  const [copiedCode, setCopiedCode] = useState("");
  const [nowTick, setNowTick] = useState(Date.now());

  useEffect(() => {
    async function loadPromotions() {
      try {
        const res = await fetch("/backend-api/promotions");

        if (!res.ok) {
          throw new Error("Không thể lấy danh sách khuyến mãi");
        }

        const json = await res.json();

        const mapped = Array.isArray(json.data)
          ? json.data.map((item: ApiPromotion, index: number) => ({
              ...item,
              imageUrl: item.imageUrl || promoImages[index % promoImages.length],
              destination:
                item.destination ||
                [
                  "Bali, Indonesia",
                  "Phuket, Thái Lan",
                  "Tokyo, Nhật Bản",
                  "Santorini, Hy Lạp",
                  "Paris, Pháp",
                ][index % 5],
            }))
          : [];

        setPromotions(mapped);
      } catch (error) {
        console.error("Load promotions error:", error);
        setPromotions([]);
      } finally {
        setLoading(false);
      }
    }

    loadPromotions();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowTick(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const cards = document.querySelectorAll(".promo-image");

      cards.forEach((card) => {
        const rect = card.getBoundingClientRect();

        if (rect.top < window.innerHeight && rect.bottom > 0) {
          const speed = 0.03;
          const yOffset = (window.innerHeight - rect.top) * speed;

          (card as HTMLElement).style.transform = `scale(1.08) translateY(${yOffset}px)`;
        }
      });
    };

    window.addEventListener("scroll", handleScroll);

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const filteredPromotions = useMemo(() => {
    if (selectedCategory === "Tất cả ưu đãi") {
      return promotions;
    }

    return promotions;
  }, [promotions, selectedCategory]);

  const endingSoonPromotion = useMemo(() => {
    const activePromotions = promotions
      .filter((promotion) => new Date(promotion.end_at).getTime() > nowTick)
      .sort(
        (a, b) =>
          new Date(a.end_at).getTime() - new Date(b.end_at).getTime()
      );

    return activePromotions[0] || null;
  }, [promotions, nowTick]);

  function copyCode(code: string) {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);

    setTimeout(() => {
      setCopiedCode("");
    }, 2000);
  }

  return (
    <main className="min-h-screen bg-[#f6fafb] text-[#181c1d]">
      <HomeHeader />

      <div className="pt-24 pb-20">
        <section className="mx-auto mb-16 max-w-7xl px-4 md:px-8">
          <div className="group relative h-[500px] overflow-hidden rounded-[40px]">
            <img
              src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1600&auto=format&fit=crop"
              alt="Summer Sale"
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />

            <div className="absolute inset-0 bg-gradient-to-r from-[#00606c]/85 to-transparent" />

            <div className="absolute inset-0 flex items-center p-8 md:p-20">
              <div className="max-w-2xl text-white">
                <span className="mb-6 inline-flex rounded-full bg-[#fc8a40] px-5 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#331200]">
                  Mùa hè rực rỡ 2024
                </span>

                <h1 className="mb-6 text-5xl font-black leading-none tracking-[-0.05em] md:text-7xl">
                  Ưu đãi lên đến{" "}
                  <span className="text-[#ffb68d]">50%</span>
                </h1>

                <p className="mb-8 max-w-xl text-lg leading-8 text-[#d8fbff]">
                  Khám phá những chân trời mới với chi phí tiết kiệm nhất cùng
                  ChillTrip.
                </p>

                <a
                  href="#flash-deals"
                  className="inline-flex items-center gap-3 rounded-full bg-[#9b4500] px-8 py-4 text-lg font-black !text-white transition hover:scale-105 hover:!text-white"
                >
                  Xem các ưu đãi
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto mb-14 max-w-7xl px-4 md:px-8">
          <div className="hide-scrollbar flex gap-4 overflow-x-auto py-2">
            {categories.map((item) => (
              <button
                key={item}
                onClick={() => setSelectedCategory(item)}
                className={`whitespace-nowrap rounded-full px-6 py-3 text-sm font-bold transition-all ${
                  selectedCategory === item
                    ? "bg-[#9defff] text-[#001f24]"
                    : "bg-[#e5e9ea] text-[#3e494b] hover:bg-[#bff6ff]"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </section>

        <section id="flash-deals" className="mx-auto mb-20 max-w-7xl px-4 md:px-8">
          <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <h2 className="text-4xl font-black tracking-[-0.03em] text-[#00606c]">
                Flash Deals
              </h2>

              <p className="mt-2 text-[#3e494b]">
                Săn ngay trước khi hết hạn.
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-full bg-[#ffdad6] px-5 py-3 text-sm font-black text-[#93000a]">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ba1a1a] opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#ba1a1a]" />
              </span>

              {endingSoonPromotion
                ? `Kết thúc sau: ${getCountdown(endingSoonPromotion.end_at)}`
                : "Chưa có ưu đãi đang chạy"}
            </div>
          </div>

          {loading ? (
            <div className="rounded-[32px] bg-white p-14 text-center text-lg font-bold text-[#00606c]">
              Đang tải ưu đãi...
            </div>
          ) : filteredPromotions.length === 0 ? (
            <div className="rounded-[32px] bg-white p-14 text-center text-lg font-bold text-[#00606c]">
              Chưa có ưu đãi nào.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
              {filteredPromotions.map((promotion, index) => {
                const originalPrice = calculateOriginalPrice(promotion, index);
                const discountedPrice = calculateDiscountedPrice(
                  promotion,
                  originalPrice
                );

                return (
                  <Link
                    href={`/promotions/${promotion.id}`}
                    key={promotion.id}
                    className="group overflow-hidden rounded-[32px] bg-white shadow-[0_16px_32px_rgba(0,96,108,0.08)] transition-all duration-300 hover:-translate-y-2"
                  >
                    <div className="relative h-64 overflow-hidden">
                      <img
                        src={
                          promotion.imageUrl ||
                          promoImages[index % promoImages.length]
                        }
                        alt={promotion.promotion_name}
                        className="promo-image h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />

                      <div className="absolute top-4 left-4 rounded-full bg-[#9b4500] px-4 py-1.5 text-sm font-black text-white">
                        {getDiscountText(promotion)}
                      </div>

                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                      <div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-white/80 p-3 backdrop-blur-md">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-black text-[#00606c]">
                            {promotion.destination}
                          </p>

                          <div className="text-xs font-bold text-[#3e494b]">
                            {getCountdown(promotion.end_at)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-6">
                      <h3 className="mb-3 text-2xl font-black leading-tight text-[#00606c] transition group-hover:text-[#007b8a]">
                        {promotion.promotion_name}
                      </h3>

                      <p className="mb-6 line-clamp-2 text-sm leading-6 text-[#3e494b]">
                        {promotion.description ||
                          "Ưu đãi đặc biệt dành cho khách hàng ChillTrip."}
                      </p>

                      <div className="flex items-center justify-between gap-4">
                        <div className="flex flex-col">
                          <span className="text-sm text-[#9ca3af] line-through">
                            {formatPrice(originalPrice)}
                          </span>

                          <span className="text-2xl font-black text-[#00606c]">
                            {formatPrice(discountedPrice)}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            copyCode(promotion.promotion_code);
                          }}
                          className={`flex items-center gap-2 rounded-full px-5 py-2 text-xs font-black transition-all ${
                            copiedCode === promotion.promotion_code
                              ? "bg-[#00606c] text-white"
                              : "bg-[#e5e9ea] text-[#00606c] hover:bg-[#9defff]"
                          }`}
                        >
                          {copiedCode === promotion.promotion_code
                            ? "Đã sao chép!"
                            : promotion.promotion_code}
                        </button>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section className="mx-auto mb-20 max-w-7xl px-4 md:px-8">
          <h2 className="mb-8 text-4xl font-black tracking-[-0.03em] text-[#00606c]">
            Đặc quyền thành viên
          </h2>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
            <div className="relative overflow-hidden rounded-[32px] bg-[#00606c] p-10 text-white md:col-span-2 md:row-span-2">
              <div className="relative z-10">
                <h3 className="mb-4 text-4xl font-black">
                  ChillTrip Platinum
                </h3>

                <p className="mb-8 max-w-sm text-lg text-[#c7f8ff]">
                  Giảm thêm 10% cho mọi dịch vụ và ưu tiên check-in.
                </p>

                <button className="rounded-full bg-white px-7 py-3 font-black text-[#00606c] transition hover:scale-105">
                  Nâng cấp ngay
                </button>
              </div>

              <div className="absolute right-0 bottom-0 h-72 w-72 translate-x-1/4 translate-y-1/4 rounded-full bg-[#7ad4e4]/20 blur-3xl" />
            </div>

            <div className="rounded-[32px] bg-[#ffdbc9] p-8 md:col-span-2">
              <h3 className="mb-3 text-2xl font-black text-[#331200]">
                Đổi điểm thưởng
              </h3>

              <p className="mb-6 text-sm leading-7 text-[#763300]">
                Sử dụng ChillPoints để đổi voucher du lịch và quà tặng.
              </p>

              <button className="font-black text-[#331200] underline underline-offset-4">
                Khám phá →
              </button>
            </div>

            <div className="rounded-[32px] bg-white p-8 text-center">
              <h4 className="mb-2 text-xl font-black text-[#00606c]">
                Hỗ trợ 24/7
              </h4>

              <p className="text-sm text-[#6e797b]">
                Ưu tiên cho thành viên Gold trở lên
              </p>
            </div>

            <div className="rounded-[32px] bg-white p-8 text-center">
              <h4 className="mb-2 text-xl font-black text-[#00606c]">
                Xe đưa đón
              </h4>

              <p className="text-sm text-[#6e797b]">
                Miễn phí sân bay tại nhiều quốc gia
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="relative overflow-hidden rounded-[40px] bg-[#e5e9ea] p-10 text-center md:p-16">
            <div className="relative z-10 mx-auto max-w-3xl">
              <h2 className="mb-4 text-4xl font-black tracking-[-0.03em] text-[#00606c]">
                Đừng bỏ lỡ bất kỳ ưu đãi nào!
              </h2>

              <p className="mb-10 text-lg leading-8 text-[#3e494b]">
                Đăng ký nhận tin để trở thành người đầu tiên biết về Flash Sale
                mới nhất.
              </p>

              <div className="mx-auto flex max-w-xl flex-col gap-4 md:flex-row">
                <input
                  type="email"
                  placeholder="Email của bạn..."
                  className="flex-1 rounded-full border-none bg-white px-7 py-4 outline-none ring-0 focus:ring-2 focus:ring-[#00606c]"
                />

                <button className="rounded-full bg-[#00606c] px-8 py-4 font-black text-white transition hover:scale-105">
                  Đăng ký
                </button>
              </div>
            </div>

            <div className="absolute top-0 left-0 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#7ad4e4]/20 blur-3xl" />

            <div className="absolute right-0 bottom-0 h-52 w-52 translate-x-1/3 translate-y-1/3 rounded-full bg-[#fc8a40]/10 blur-3xl" />
          </div>
        </section>
      </div>
    </main>
  );
}