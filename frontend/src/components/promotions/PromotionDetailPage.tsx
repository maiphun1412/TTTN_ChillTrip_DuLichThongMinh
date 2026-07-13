"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import HomeHeader from "../home/HomeHeader";

type Tour = {
  id: string;
  tour_name: string;
  slug?: string | null;
  tour_type?: string | null;
  duration_days?: number | null;
  duration_nights?: number | null;
  base_price: string | number;
  featured_image_url?: string | null;
  short_description?: string | null;
};

type PromotionDetail = {
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
  status?: string;
  description?: string | null;

  banner_image_url?: string | null;
  thumbnail_image_url?: string | null;
  bannerImageUrl?: string | null;
  imageUrl?: string | null;
  highlight_title?: string | null;
  highlight_subtitle?: string | null;
  terms_conditions?: string | null;
  usage_guide?: string | null;
  theme_color?: string | null;
  is_featured?: boolean;

  tours?: Tour[];
};

const fallbackBanner =
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1600&auto=format&fit=crop";




function formatPrice(value?: string | number | null) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

function formatDate(date?: string) {
  if (!date) return "Đang cập nhật";
  return new Date(date).toLocaleDateString("vi-VN");
}

function getDiscountText(promotion: PromotionDetail) {
  if (promotion.promotion_type === "PERCENT") {
    return `Up to ${Number(promotion.discount_value)}% OFF`;
  }

  return `Giảm ${formatPrice(promotion.discount_value)}`;
}

function getShortDiscountText(promotion: PromotionDetail) {
  if (promotion.promotion_type === "PERCENT") {
    return `-${Number(promotion.discount_value)}%`;
  }

  return `-${formatPrice(promotion.discount_value)}`;
}

function splitText(text?: string | null) {
  if (!text) return [];

  return text
    .split(/[.\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getDiscountedPrice(tourPrice: string | number, promotion: PromotionDetail) {
  const price = Number(tourPrice || 0);
  const discountValue = Number(promotion.discount_value || 0);

  if (promotion.promotion_type === "PERCENT") {
    let discount = (price * discountValue) / 100;

    if (promotion.max_discount_amount) {
      discount = Math.min(discount, Number(promotion.max_discount_amount));
    }

    return Math.max(price - discount, 0);
  }

  return Math.max(price - discountValue, 0);
}

export default function PromotionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id || "");

  const [promotion, setPromotion] = useState<PromotionDetail | null>(null);
  const [relatedPromotions, setRelatedPromotions] = useState<PromotionDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadPromotion() {
      try {
        const res = await fetch(`/backend-api/promotions/${id}`, {
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error("Không thể lấy chi tiết khuyến mãi");
        }

        const json = await res.json();
        setPromotion(json.data || null);
      } catch (error) {
        console.error("Load promotion detail error:", error);
        setPromotion(null);
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadPromotion();
    }
  }, [id]);

  useEffect(() => {
  async function loadRelatedPromotions() {
    try {
      const res = await fetch("/backend-api/promotions", {
        cache: "no-store",
      });

      if (!res.ok) return;

      const json = await res.json();

      const data = Array.isArray(json.data) ? json.data : [];

      setRelatedPromotions(
        data
          .filter((item: PromotionDetail) => String(item.id) !== id)
          .slice(0, 6)
      );
    } catch (error) {
      console.error("Load related promotions error:", error);
      setRelatedPromotions([]);
    }
  }

  if (id) {
    loadRelatedPromotions();
  }
}, [id]);

  function copyCode() {
    if (!promotion) return;

    navigator.clipboard?.writeText(promotion.promotion_code);
    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f6fafb] text-[#181c1d]">
        <HomeHeader />
        <div className="mx-auto max-w-7xl px-6 pt-32 text-center">
          <p className="text-lg font-bold text-[#00606c]">
            Đang tải chi tiết khuyến mãi...
          </p>
        </div>
      </main>
    );
  }

  if (!promotion) {
    return (
      <main className="min-h-screen bg-[#f6fafb] text-[#181c1d]">
        <HomeHeader />
        <div className="mx-auto max-w-7xl px-6 pt-32 text-center">
          <p className="mb-5 text-xl font-bold text-[#00606c]">
            Không tìm thấy khuyến mãi.
          </p>

          <button
            type="button"
            onClick={() => router.push("/promotions")}
            className="rounded-full bg-[#00606c] px-6 py-3 text-sm font-bold text-white"
          >
            Quay lại danh sách
          </button>
        </div>
      </main>
    );
  }

  const bannerImage =
    promotion.bannerImageUrl ||
    promotion.banner_image_url ||
    promotion.imageUrl ||
    promotion.thumbnail_image_url ||
    fallbackBanner;

  const title = promotion.highlight_title || promotion.promotion_name;
  const subtitle =
    promotion.highlight_subtitle ||
    promotion.description ||
    "ChillTrip mang đến cho bạn cơ hội khám phá những hành trình đẹp với mức giá ưu đãi hơn.";

  const terms = splitText(promotion.terms_conditions);
  const guides = splitText(promotion.usage_guide);
  const tours = promotion.tours || [];
  const themeColor = promotion.theme_color || "#00606c";

  return (
    <main className="min-h-screen bg-[#f6fafb] text-[#181c1d]">
      <HomeHeader />

      <div className="mx-auto max-w-7xl px-4 pb-24 pt-28 md:px-8">
        <nav className="mb-8 flex items-center gap-2 text-sm font-medium text-[#3e494b]">
          <Link href="/" className="hover:text-[#00606c]">
            Home
          </Link>
          <span>›</span>
          <Link href="/promotions" className="hover:text-[#00606c]">
            Offers
          </Link>
          <span>›</span>
          <span className="font-bold text-[#00606c]">
            {promotion.promotion_code}
          </span>
        </nav>

        <section className="group relative mb-12 h-[450px] overflow-hidden rounded-[36px] shadow-2xl">
          <div className="absolute inset-0 z-10 bg-gradient-to-r from-[#00606c]/85 to-transparent" />

          <img
            src={bannerImage}
            alt={promotion.promotion_name}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-1000 group-hover:scale-105"
          />

          <div className="relative z-20 flex h-full flex-col justify-center px-8 text-white md:px-20">
            <span className="mb-4 inline-block w-fit rounded-full bg-[#fc8a40] px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-[#331200]">
              {promotion.promotion_code}
            </span>

            <h1 className="mb-4 max-w-4xl text-5xl font-black leading-none tracking-[-0.05em] md:text-7xl">
              {title}
            </h1>

            <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:gap-8">
              <p className="text-4xl font-black text-[#ffdbc9] md:text-6xl">
                {getDiscountText(promotion)}
              </p>

              <div className="flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-4 py-2 text-sm font-semibold text-[#ddf9ff] backdrop-blur-md">
                <CalendarIcon />
                <span>
                  {formatDate(promotion.start_at)} - {formatDate(promotion.end_at)}
                </span>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          <div className="space-y-12 lg:col-span-8">
            <section className="rounded-[36px] bg-[#f1f4f5] p-8 md:p-12">
              <h2 className="mb-6 text-3xl font-black text-[#00606c]">
                Chi tiết chương trình
              </h2>

              <p className="mb-8 text-lg leading-8 text-[#3e494b]">{subtitle}</p>

              <div className="space-y-9">
                <div>
                  <h3 className="mb-4 flex items-center gap-3 text-xl font-black text-[#181c1d]">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#00606c]/10 text-[#00606c]">
                      <ListIcon />
                    </span>
                    Điều khoản & Điều kiện
                  </h3>

                  <ul className="grid grid-cols-1 gap-4 text-[#3e494b] md:grid-cols-2">
                    {(terms.length
                      ? terms
                      : [
                          "Áp dụng cho các tour được chọn.",
                          "Không áp dụng đồng thời với các khuyến mãi khác.",
                          `Đơn hàng tối thiểu ${formatPrice(
                            promotion.min_order_amount
                          )}.`,
                          "Số lượng mã giảm giá có hạn mỗi ngày.",
                        ]
                    ).map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <CheckCircleIcon />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="mb-4 flex items-center gap-3 text-xl font-black text-[#181c1d]">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#00606c]/10 text-[#00606c]">
                      <QuestionIcon />
                    </span>
                    Cách sử dụng
                  </h3>

                  <div className="flex flex-col gap-6 md:flex-row">
                    {(guides.length
                      ? guides.slice(0, 3)
                      : [
                          "Chọn tour yêu thích và điền thông tin khách hàng.",
                          "Nhập mã ưu đãi tại bước thanh toán cuối cùng.",
                          "Giá trị giảm trừ sẽ hiển thị ngay khi áp dụng thành công.",
                        ]
                    ).map((item, index) => (
                      <div
                        key={item}
                        className="flex-1 rounded-[24px] border border-[#bdc8cb]/20 bg-white p-5"
                      >
                        <span className="mb-2 block text-2xl font-black text-[#00606c]">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <p className="text-sm font-medium leading-6 text-[#3e494b]">
                          {item}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section>
              <div className="mb-8 flex items-end justify-between gap-4">
                <h2 className="text-3xl font-black text-[#00606c]">
                  Tour áp dụng khuyến mãi
                </h2>

                <Link
                  href="/tours"
                  className="hidden items-center gap-1 font-bold text-[#00606c] hover:underline md:flex"
                >
                  Xem tất cả →
                </Link>
              </div>

              {tours.length === 0 ? (
                <div className="rounded-[28px] bg-white p-10 text-center font-bold text-[#00606c]">
                  Chưa có tour áp dụng cho khuyến mãi này.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {tours.map((tour, index) => {
                    const discountedPrice = getDiscountedPrice(
                      tour.base_price,
                      promotion
                    );

                    return (
                      <article
                        key={tour.id}
                        className="group overflow-hidden rounded-[32px] border border-[#bdc8cb]/20 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                      >
                        <div className="relative h-48 overflow-hidden">
                          <img
                            src={tour.featured_image_url || "/images/tours/default-tour.jpg"}
                            alt={tour.tour_name}
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                          />

                          <span className="absolute right-4 top-4 rounded-full bg-[#9b4500] px-3 py-1 text-xs font-bold text-white">
                            {getShortDiscountText(promotion)}
                          </span>
                        </div>

                        <div className="p-6">
                          <h4 className="mb-2 line-clamp-1 text-xl font-black text-[#181c1d]">
                            {tour.tour_name}
                          </h4>

                          <div className="mb-4 text-sm font-semibold text-[#6e797b]">
  Tour áp dụng khuyến mãi này
</div>

                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="text-xs text-[#6e797b] line-through">
                                {formatPrice(tour.base_price)}
                              </p>
                              <p className="text-xl font-black text-[#00606c]">
                                {formatPrice(discountedPrice)}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => router.push(`/tours/${tour.id}`)}
                              className="rounded-full bg-[#00606c] px-5 py-2 text-sm font-bold text-white transition hover:scale-105 hover:bg-[#007b8a]"
                            >
                              Đặt ngay
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          <aside className="lg:col-span-4">
            <div className="sticky top-28 space-y-6">
              <section
                className="relative overflow-hidden rounded-[36px] p-8 text-white shadow-lg"
                style={{
                  background: `linear-gradient(135deg, ${themeColor}, #007b8a)`,
                }}
              >
                <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
                <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-[#fc8a40]/20 blur-2xl" />

                <div className="relative z-10 text-center">
                  <p className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-white/80">
                    Mã giảm giá của bạn
                  </p>

                  <div className="mb-6 rounded-[28px] border border-white/20 bg-white/10 p-6 backdrop-blur-md">
                    <div className="mb-4 text-3xl font-black tracking-tight">
                      {promotion.promotion_code}
                    </div>

                    <button
                      type="button"
                      onClick={copyCode}
                      className="flex w-full items-center justify-center gap-2 rounded-full bg-[#9b4500] py-3 font-bold text-white transition hover:scale-105"
                    >
                      {copied ? <CheckIcon /> : <CopyIcon />}
                      <span>{copied ? "Đã sao chép!" : "Sao chép mã"}</span>
                    </button>
                  </div>

                  <p className="text-xs italic text-white/70">
                    *Áp dụng cho thanh toán online qua ứng dụng.
                  </p>
                </div>
              </section>

              <section className="rounded-[32px] border border-[#bdc8cb]/20 bg-white p-6">
                <h4 className="mb-4 font-black text-[#181c1d]">
                  Thông tin ưu đãi
                </h4>

                <div className="space-y-3 text-sm text-[#3e494b]">
                  <InfoRow
                    label="Đơn tối thiểu"
                    value={formatPrice(promotion.min_order_amount)}
                  />
                  <InfoRow
                    label="Giảm tối đa"
                    value={
                      promotion.max_discount_amount
                        ? formatPrice(promotion.max_discount_amount)
                        : "Không giới hạn"
                    }
                  />
                  <InfoRow
                    label="Lượt sử dụng"
                    value={
                      promotion.usage_limit
                        ? `${promotion.used_count || 0}/${promotion.usage_limit}`
                        : "Không giới hạn"
                    }
                  />
                  <InfoRow
                    label="Trạng thái"
                    value={promotion.status || "ACTIVE"}
                  />
                </div>
              </section>

              <section className="rounded-[32px] border border-[#bdc8cb]/20 bg-white p-6">
                <h4 className="mb-5 font-black text-[#181c1d]">
                  Tại sao chọn ChillTrip?
                </h4>

                <div className="space-y-5">
                  <TrustItem
                    title="Thanh toán an toàn"
                    desc="Hỗ trợ đa dạng phương thức"
                    icon={<ShieldIcon />}
                  />
                  <TrustItem
                    title="Hỗ trợ 24/7"
                    desc="Giải đáp mọi thắc mắc nhanh chóng"
                    icon={<SupportIcon />}
                  />
                  <TrustItem
                    title="Đảm bảo giá tốt nhất"
                    desc="Nhiều ưu đãi cập nhật liên tục"
                    icon={<PriceIcon />}
                  />
                </div>
              </section>
            </div>
          </aside>
        </div>
<section className="mt-24">
  <h2 className="mb-8 text-3xl font-black text-[#00606c]">
    Ưu đãi liên quan
  </h2>

  {relatedPromotions.length === 0 ? (
    <div className="rounded-[28px] bg-white p-8 text-center font-bold text-[#00606c]">
      Chưa có ưu đãi liên quan.
    </div>
  ) : (
    <div className="flex snap-x gap-6 overflow-x-auto pb-8">
      {relatedPromotions.map((item) => {
        const image =
  item.bannerImageUrl ||
  item.banner_image_url ||
  item.imageUrl ||
  item.thumbnail_image_url ||
  "/images/promotions/default-promotion.jpg";

        return (
          <Link
            key={item.id}
            href={`/promotions/${item.id}`}
            className="group min-w-[320px] cursor-pointer snap-start md:min-w-[400px]"
          >
            <div className="relative mb-4 h-60 overflow-hidden rounded-[32px]">
              <img
                src={image}
                alt={item.promotion_name}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />

              <div className="absolute inset-0 bg-black/35 transition-colors group-hover:bg-black/15" />

              <div className="absolute left-6 top-6 rounded-full bg-[#fc8a40] px-4 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-[#331200]">
                {item.promotion_code}
              </div>

              <div className="absolute bottom-6 left-6 right-6 text-white">
                <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-white/80">
                  {getShortDiscountText(item)}
                </p>

                <h4 className="line-clamp-2 text-xl font-black">
                  {item.promotion_name}
                </h4>

                <p className="mt-2 text-xs font-semibold text-white/80">
                  Hạn dùng: {formatDate(item.end_at)}
                </p>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  )}
</section>
      </div>
    </main>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#eef2f3] pb-3 last:border-b-0 last:pb-0">
      <span>{label}</span>
      <span className="text-right font-black text-[#00606c]">{value}</span>
    </div>
  );
}

function TrustItem({
  title,
  desc,
  icon,
}: {
  title: string;
  desc: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#00606c]/10 text-[#00606c]">
        {icon}
      </span>

      <div>
        <p className="text-sm font-black text-[#181c1d]">{title}</p>
        <p className="text-xs text-[#6e797b]">{desc}</p>
      </div>
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 2v3M16 2v3M3 9h18M5 5h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}

function QuestionIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.09 9a3 3 0 1 1 5.82 1c0 2-3 2-3 4M12 17h.01" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg className="mt-1 h-4 w-4 shrink-0 text-[#00606c]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg className="h-4 w-4 fill-[#fc8a40] text-[#fc8a40]" viewBox="0 0 24 24">
      <path d="m12 17.27 6.18 3.73-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 8h10v12H8zM6 16H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
    </svg>
  );
}

function SupportIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 13a6 6 0 1 0-12 0v3a2 2 0 0 0 2 2h2M18 16v-3a6 6 0 1 0-12 0M15 18h1a2 2 0 0 0 2-2" />
    </svg>
  );
}

function PriceIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" />
    </svg>
  );
}