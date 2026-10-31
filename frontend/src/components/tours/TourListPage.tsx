"use client";

import { useEffect, useState } from "react";
import HomeHeader from "../home/HomeHeader";
import { useRouter, useSearchParams } from "next/navigation";

type ApiTour = {
  id: string;
  tourCode: string;
  tourName: string;
  slug: string;
  tourType: string;
  durationDays: number;
  durationNights: number;
  basePrice: string | number;
  shortDescription?: string | null;
  imageUrl?: string | null;
  destination?: {
    name?: string;
    country?: string;
    city?: string;
  } | null;
};
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
};

const trendingSearches = [
  { label: "Phú Quốc 2024", active: true },
  { label: "Tour trekking Sapa", active: false },
  { label: "Du thuyền Hạ Long", active: false },
  { label: "Cố đô Huế", active: false },
  { label: "Đà Lạt mùa mây", active: false },
];

function formatPrice(price: string | number) {
  return `${Number(price || 0).toLocaleString("vi-VN")}đ`;
}

function formatPromotionDiscount(promotion: ApiPromotion) {
  if (promotion.promotion_type === "PERCENT") {
    return `Giảm ${Number(promotion.discount_value)}%`;
  }

  return `Giảm ${Number(promotion.discount_value || 0).toLocaleString(
    "vi-VN"
  )}đ`;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("vi-VN");
}

export default function TourListPage() {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [mainTours, setMainTours] = useState<ApiTour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const searchParams = useSearchParams();

  const destination = searchParams.get("destination")?.trim() || "";
  const keyword = searchParams.get("keyword")?.trim().toLowerCase() || "";
  const departureDate = searchParams.get("departureDate") || "";

const [promotions, setPromotions] = useState<ApiPromotion[]>([]);
const [promotionLoading, setPromotionLoading] = useState(true);
  const [filters, setFilters] = useState({
    
    region: "",
    days: "",
    price: 50000000,
    types: [] as string[],
  });
async function toggleFavorite(tourId: string) {
  const token = localStorage.getItem("access_token");

  if (!token) {
    alert("Vui lòng đăng nhập");
    return;
  }

  const isFavorite = favoriteIds.includes(String(tourId));

  if (isFavorite) {
    await fetch(`/backend-api/favorites/${tourId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    setFavoriteIds((prev) =>
      prev.filter((id) => id !== String(tourId))
    );
  } else {
    await fetch("/backend-api/favorites", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ tourId }),
    });

    setFavoriteIds((prev) => [...prev, String(tourId)]);
  }
  window.dispatchEvent(new Event("favorites-changed"));
}
  useEffect(() => {
    async function loadTours() {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (destination) {
          params.set("destination", destination);
        }
        if (keyword) {
          params.set("keyword", keyword);
        }
        if (departureDate) {
          params.set("departureDate", departureDate);
        }

        const queryString = params.toString();
        const res = await fetch(
          queryString ? `/backend-api/tours?${queryString}` : "/backend-api/tours"
        );

        if (!res.ok) {
          throw new Error("Không thể lấy danh sách tour");
        }

        const json = await res.json();
        setMainTours(Array.isArray(json.data) ? json.data : []);
      } catch (err) {
        console.error("Load tours error:", err);
        setError("Đã xảy ra lỗi khi tải danh sách tour. Vui lòng thử lại sau.");
        setMainTours([]);
      } finally {
        setLoading(false);
      }
    }

    loadTours();
  }, [destination, keyword, departureDate]);
useEffect(() => {
  async function loadPromotions() {
    try {
      const res = await fetch("/backend-api/promotions");

      if (!res.ok) {
        throw new Error("Không thể lấy danh sách khuyến mãi");
      }

      const json = await res.json();
      setPromotions(Array.isArray(json.data) ? json.data : []);
    } catch (error) {
      console.error("Load promotions error:", error);
      setPromotions([]);
    } finally {
      setPromotionLoading(false);
    }
  }

  loadPromotions();
}, []);

  useEffect(() => {
  async function loadFavorites() {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    const res = await fetch("/backend-api/favorites", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const json = await res.json();

    if (json.success) {
      const ids = json.data.map((item: any) =>
        String(item.tourId)
      );
      setFavoriteIds(ids);
    }
  }

  loadFavorites();
}, []);

  const filteredTours = mainTours.filter((tour) => {
    const price = Number(tour.basePrice || 0);
    const searchText = [
  tour.tourName,
  tour.tourCode,
  tour.tourType,
  tour.shortDescription,
  tour.destination?.name,
  tour.destination?.city,
  tour.destination?.country,
]
  .filter(Boolean)
  .join(" ")
  .toLowerCase();

if (keyword && !searchText.includes(keyword)) return false;

    if (price > filters.price) return false;

    if (
      filters.days === "1-3" &&
      (tour.durationDays < 1 || tour.durationDays > 3)
    ) {
      return false;
    }

    if (
      filters.days === "3-5" &&
      (tour.durationDays < 3 || tour.durationDays > 5)
    ) {
      return false;
    }

    if (
      filters.days === "5-7" &&
      (tour.durationDays < 5 || tour.durationDays > 7)
    ) {
      return false;
    }

    if (filters.days === "7+" && tour.durationDays < 7) {
      return false;
    }

    if (filters.types.length > 0) {
      if (!filters.types.includes(tour.tourType)) return false;
    }

    if (filters.region) {
      const text = `${tour.destination?.name || ""} ${
        tour.destination?.city || ""
      } ${tour.destination?.country || ""}`;

      const regionMap: Record<string, string[]> = {
        "Miền Bắc": ["Hạ Long", "Sapa", "Hà Nội", "Quảng Ninh", "Lào Cai"],
        "Miền Trung": ["Đà Nẵng", "Hội An", "Huế", "Đà Lạt", "Lâm Đồng"],
        "Miền Nam": ["Phú Quốc", "Kiên Giang", "TP. Hồ Chí Minh"],
        "Tây Nguyên": ["Đà Lạt", "Lâm Đồng"],
        "Miền Tây": ["Cần Thơ", "Mekong"],
      };

      const keywords = regionMap[filters.region] || [];
      if (!keywords.some((keyword) => text.includes(keyword))) return false;
    }

    return true;
  });

  const recentTours = mainTours.slice(0, 4);
  const featuredPromotion = promotions[0];

  const toggleType = (type: string, checked: boolean) => {
    setFilters((prev) => ({
      ...prev,
      types: checked
        ? [...prev.types, type]
        : prev.types.filter((item) => item !== type),
    }));
  };

  const resetFilters = () => {
    setFilters({
      region: "",
      days: "",
      price: 50000000,
      types: [],
    });
  };

  return (
    <main className="min-h-screen bg-[#f6fafb] text-[#181c1d] leading-relaxed">
      <HomeHeader />

      <div className="mx-auto max-w-[1500px] px-4 pb-32 pt-24 md:px-8">
        <section className="mb-12">
          <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-[#00606c] md:text-5xl">
            Danh sách Tour
          </h1>
          {(destination || keyword || departureDate) && (
            <div className="mb-6 rounded-2xl border border-[#d6e0e3] bg-white px-5 py-4 text-sm font-semibold text-[#3e494b]">
              Đang tìm kiếm
              {destination ? (
                <>
                  {" "}điểm đến:{" "}
                  <span className="font-extrabold text-[#00606c]">{destination}</span>
                </>
              ) : null}
              {keyword ? (
                <>
                  {" "}theo từ khóa:{" "}
                  <span className="font-extrabold text-[#00606c]">{keyword}</span>
                </>
              ) : null}
              {departureDate ? (
                <>
                  {" "}ngày đi:{" "}
                  <span className="font-extrabold text-[#00606c]">
                    {new Date(departureDate).toLocaleDateString("vi-VN")}
                  </span>
                </>
              ) : null}
            </div>
          )}

          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <TrendingUpIcon />
              <span className="text-sm font-bold uppercase tracking-[0.18em] text-[#3e494b]">
                Xu hướng tìm kiếm:
              </span>
            </div>

            <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
              {trendingSearches.map((item) => (
                <button
                  key={item.label}
                  className={`flex-none rounded-full px-6 py-2 text-sm font-semibold transition-all ${
                    item.active
                      ? "bg-[#9defff] text-[#001f24]"
                      : "bg-[#e5e9ea] text-[#3e494b] hover:bg-[#9defff]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-10 lg:flex-row">
          <aside className="w-full flex-none space-y-8 lg:w-72">
            <div className="rounded-[28px] border border-[#e7ecee] bg-white p-8 shadow-sm">
              <h3 className="mb-8 text-xl font-extrabold text-[#00606c]">
                Bộ lọc tìm kiếm
              </h3>

              <div className="space-y-5">
                <div>
                  <label className="mb-3 block text-sm font-bold uppercase tracking-[0.14em] text-[#3e494b]">
                    Khu vực
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    {[
                      "Miền Bắc",
                      "Miền Trung",
                      "Miền Nam",
                      "Tây Nguyên",
                      "Miền Tây",
                    ].map((region) => (
                      <FilterTag
                        key={region}
                        label={region}
                        active={filters.region === region}
                        onClick={() =>
                          setFilters((prev) => ({
                            ...prev,
                            region: prev.region === region ? "" : region,
                          }))
                        }
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-3 block text-sm font-bold uppercase tracking-[0.14em] text-[#3e494b]">
                    Số ngày
                  </label>

                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "1-3 ngày", value: "1-3" },
                      { label: "3-5 ngày", value: "3-5" },
                      { label: "5-7 ngày", value: "5-7" },
                      { label: "7+ ngày", value: "7+" },
                    ].map((item) => (
                      <FilterTag
                        key={item.value}
                        label={item.label}
                        active={filters.days === item.value}
                        onClick={() =>
                          setFilters((prev) => ({
                            ...prev,
                            days: prev.days === item.value ? "" : item.value,
                          }))
                        }
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-3 block text-sm font-bold uppercase tracking-[0.14em] text-[#3e494b]">
                    Mức giá
                  </label>

                  <input
                    type="range"
                    min={0}
                    max={50000000}
                    step={1000000}
                    value={filters.price}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        price: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-[#00606c]"
                  />

                  <div className="mt-3 flex justify-between text-xs font-semibold text-[#6e797b]">
                    <span>0đ</span>
                    <span>{formatPrice(filters.price)}</span>
                  </div>
                </div>

                <div>
                  <label className="mb-3 block text-sm font-bold uppercase tracking-[0.14em] text-[#3e494b]">
                    Loại tour
                  </label>

                  <div className="space-y-3">
                    <FilterCheck
                      label="Tour trong nước"
                      checked={filters.types.includes("DOMESTIC")}
                      onChange={(checked) => toggleType("DOMESTIC", checked)}
                    />
                    <FilterCheck
                      label="Tour nước ngoài"
                      checked={filters.types.includes("INTERNATIONAL")}
                      onChange={(checked) =>
                        toggleType("INTERNATIONAL", checked)
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-3 block text-sm font-bold uppercase tracking-[0.14em] text-[#3e494b]">
                    Khởi hành từ
                  </label>

                  <select className="w-full rounded-xl border border-[#d6e0e3] px-4 py-2 text-sm outline-none focus:border-[#00606c]">
                    <option>TP. Hồ Chí Minh</option>
                    <option>Hà Nội</option>
                    <option>Đà Nẵng</option>
                    <option>Cần Thơ</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="flex-1 rounded-full border border-[#c9d4d7] py-3 text-sm font-bold text-[#3e494b] hover:bg-[#f2f6f7]"
                  >
                    Đặt lại
                  </button>

                  <button
                    type="button"
                    className="flex-1 rounded-full bg-[#00606c] py-3 text-sm font-bold text-white shadow-md hover:bg-[#007b8a]"
                  >
                    Áp dụng
                  </button>
                </div>
              </div>
            </div>

           <div className="overflow-hidden rounded-[24px] border border-[#f3d6b8] bg-white shadow-sm">
  <div className="relative min-h-64 overflow-hidden bg-[#00606c]">
    <img
      src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop"
      alt="Ưu đãi du lịch ChillTrip"
      className="absolute inset-0 h-full w-full object-cover opacity-60 transition-transform duration-700 hover:scale-110"
    />

    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

    <div className="relative z-10 flex min-h-64 flex-col justify-end p-6">
      {promotionLoading ? (
        <>
          <p className="mb-2 text-lg font-bold text-white">
            Đang tải ưu đãi...
          </p>
          <p className="text-sm text-white/80">
            ChillTrip đang cập nhật các chương trình khuyến mãi mới nhất.
          </p>
        </>
      ) : featuredPromotion ? (
        <>
          <div className="mb-3 w-fit rounded-full bg-[#9defff] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#001f24]">
            {featuredPromotion.promotion_code}
          </div>

          <p className="mb-2 text-xl font-extrabold leading-tight text-white">
            {featuredPromotion.promotion_name}
          </p>

          <p className="mb-3 text-3xl font-black text-[#9defff]">
            {formatPromotionDiscount(featuredPromotion)}
          </p>

          <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-white/85">
            {featuredPromotion.description ||
              "Ưu đãi đặc biệt dành cho các tour đang mở bán trên ChillTrip."}
          </p>

          <div className="mb-4 rounded-2xl bg-white/15 p-3 text-xs text-white/90 backdrop-blur-md">
            <p>
              Đơn tối thiểu:{" "}
              <span className="font-bold">
                {formatPrice(featuredPromotion.min_order_amount)}
              </span>
            </p>

            {featuredPromotion.max_discount_amount && (
              <p className="mt-1">
                Giảm tối đa:{" "}
                <span className="font-bold">
                  {formatPrice(featuredPromotion.max_discount_amount)}
                </span>
              </p>
            )}

            <p className="mt-1">
              Hạn dùng:{" "}
              <span className="font-bold">
                {formatDate(featuredPromotion.end_at)}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
  <button
    type="button"
    onClick={() => {
      navigator.clipboard?.writeText(featuredPromotion.promotion_code);
      alert(`Đã copy mã ${featuredPromotion.promotion_code}`);
    }}
    className="rounded-full bg-[#9b4500] px-5 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white transition hover:bg-[#7a3500]"
  >
    Copy mã
  </button>

  <button
    type="button"
    onClick={() => router.push("/promotions")}
    className="rounded-full border border-white/30 bg-white/10 px-5 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white backdrop-blur-md transition hover:bg-white hover:text-[#00606c]"
  >
    Xem ưu đãi
  </button>
</div>
        </>
      ) : (
        <>
          <p className="mb-2 text-lg font-bold text-white">
            Ưu đãi sắp ra mắt
          </p>
          <p className="mb-4 text-sm text-white/80">
            Hiện chưa có khuyến mãi đang hoạt động. ChillTrip sẽ cập nhật ưu đãi
            mới trong thời gian tới.
          </p>
          <button
            type="button"
            className="w-fit rounded-full bg-[#9b4500] px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white"
          >
            Theo dõi ngay
          </button>
        </>
      )}
    </div>
  </div>

  {promotions.length > 1 && (
    <div className="space-y-3 p-5">
      <div className="flex items-center justify-between">
  <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-[#00606c]">
    Ưu đãi khác
  </p>

  <button
    type="button"
    onClick={() => router.push("/promotions")}
    className="text-xs font-bold uppercase tracking-[0.14em] text-[#00606c] transition hover:text-[#0097a7]"
  >
    Xem tất cả →
  </button>
</div>

      {promotions.slice(1, 3).map((promotion) => (
        <div
          key={promotion.id}
          className="rounded-2xl border border-[#e7ecee] bg-[#f6fafb] p-4"
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="line-clamp-1 text-sm font-bold text-[#00606c]">
              {promotion.promotion_name}
            </p>

            <span className="shrink-0 rounded-full bg-[#00606c] px-2.5 py-1 text-[10px] font-bold text-white">
              {promotion.promotion_code}
            </span>
          </div>

          <p className="text-sm font-extrabold text-[#9b4500]">
            {formatPromotionDiscount(promotion)}
          </p>

          <p className="mt-1 text-xs text-[#6e797b]">
            Hạn dùng: {formatDate(promotion.end_at)}
          </p>
        </div>
      ))}
    </div>
  )}
</div>
          </aside>

          <div className="flex-1 space-y-12">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
              {loading ? (
                <div className="col-span-full rounded-[24px] bg-white p-10 text-center font-bold text-[#00606c]">
                  Đang tải danh sách tour...
                </div>
              ) : error ? (
                <div className="col-span-full rounded-[24px] bg-white border border-red-200 p-10 text-center font-bold text-red-600">
                  {error}
                </div>
              ) : filteredTours.length === 0 ? (
                <div className="col-span-full rounded-[24px] bg-white p-10 text-center font-bold text-[#00606c]">
                  Không tìm thấy tour phù hợp.
                </div>
              ) : (
                filteredTours.map((tour) => (
                  <article
  key={tour.id}
  onClick={() => router.push(`/tours/${tour.id}`)}
  className="group cursor-pointer overflow-hidden rounded-[24px] bg-white shadow-sm transition-all hover:shadow-xl"

                  >
                    <div className="relative h-64 overflow-hidden">
                      <img
                        src={tour.imageUrl || "/images/tours/dalat-cover.jpg"}
                        alt={tour.tourName}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />

                      <div className="absolute left-4 top-4 flex flex-col gap-2">
                        <span
                          className={`rounded-full px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white shadow-lg ${
                            tour.tourType === "INTERNATIONAL"
                              ? "bg-[#9b4500]"
                              : "bg-[#00606c]"
                          }`}
                        >
                          {tour.tourType === "INTERNATIONAL"
                            ? "Quốc tế"
                            : "Trong nước"}
                        </span>
                      </div>
                    </div>

                    <div className="p-8">
                      <div className="mb-4 flex items-start justify-between gap-4">
                        <h3 className="text-2xl font-bold text-[#00606c] transition-colors group-hover:text-[#007b8a]">
                          {tour.tourName}
                        </h3>

                        <div className="flex items-center gap-1 text-[#9b4500]">
                          <StarFilledIcon />
                          <span className="text-sm font-bold">4.9</span>
                        </div>
                      </div>

                      <p className="mb-6 line-clamp-2 text-[#3e494b]">
                        {tour.shortDescription ||
                          "Thông tin tour đang được cập nhật."}
                      </p>

                      <div className="flex items-center justify-between border-t border-[#ebeeef] pt-6">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#3e494b]">
                            Giá từ
                          </p>
                          <p className="text-2xl font-extrabold text-[#00606c]">
                            {formatPrice(tour.basePrice)}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
  {/* Chi tiết */}
<a
  href={`/tours/${tour.id}`}
  onClick={(e) => e.stopPropagation()}
  className="rounded-full bg-[#0f766e] px-5 py-2 text-sm font-bold !text-white hover:bg-[#115e59]"
>
  Chi tiết
</a>

  {/* Tim */}
  <button
  type="button"
  onClick={(e) => {
    e.stopPropagation();
    toggleFavorite(tour.id);
  }}
  className="transition hover:scale-110"
>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill={
        favoriteIds.includes(String(tour.id))
          ? "#ef4444"
          : "none"
      }
      stroke="#ef4444"
      strokeWidth="2"
      className="h-6 w-6"
    >
      <path d="M20.8 4.6c-1.5-1.4-3.8-1.4-5.3 0L12 8l-3.5-3.4c-1.5-1.4-3.8-1.4-5.3 0-1.6 1.5-1.6 3.9 0 5.4L12 21l8.8-11c1.6-1.5 1.6-3.9 0-5.4z" />
    </svg>
  </button>
</div>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>

        <section className="mt-24 border-t border-[#ebeeef] pt-12">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <h2 className="mb-2 text-3xl font-bold text-[#00606c]">
                Tour bạn đã xem gần đây
              </h2>
              <p className="text-[#3e494b]">
                Tiếp tục hành trình khám phá những điểm đến bạn quan tâm.
              </p>
            </div>

            <button className="hidden items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-[#00606c] transition-all hover:gap-3 md:flex">
              Xem tất cả
              <ArrowRightIcon />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {recentTours.map((tour) => (
              <div
                key={tour.id}
                className="group cursor-pointer rounded-[18px] bg-white p-3 transition-all hover:shadow-lg"
              >
                <div className="relative mb-3 h-32 overflow-hidden rounded-[14px]">
                  <img
                    src={tour.imageUrl || "/images/tours/dalat-cover.jpg"}
                    alt={tour.tourName}
                    className="h-full w-full object-cover"
                  />
                </div>
                <h4 className="mb-1 line-clamp-1 text-sm font-bold text-[#00606c]">
                  {tour.tourName}
                </h4>
                <p className="text-xs font-extrabold text-[#9b4500]">
                  {formatPrice(tour.basePrice)}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <MobileBottomNav />
      <TourFooter />
    </main>
  );
}

function FilterCheck({
  label,
  checked = false,
  onChange,
}: {
  label: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
}) {
  return (
    <label className="group flex cursor-pointer items-center gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange?.(e.target.checked)}
        className="h-5 w-5 rounded border-[#bdc8cb] text-[#00606c] focus:ring-[#00606c]"
      />
      <span className="transition-colors group-hover:text-[#00606c]">
        {label}
      </span>
    </label>
  );
}

function FilterTag({
  label,
  active = false,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-sm transition-colors ${
        active
          ? "bg-[#00606c] text-white"
          : "border border-[#bdc8cb] hover:bg-[#9defff]"
      }`}
    >
      {label}
    </button>
  );
}



function MobileBottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 z-50 flex w-full items-center justify-around rounded-t-[3rem] bg-white/80 px-4 pb-6 pt-3 shadow-[0_-16px_32px_rgba(0,96,108,0.08)] backdrop-blur-2xl md:hidden">
      <a
        href="/tours"
        className="flex flex-col items-center justify-center rounded-full bg-[#007b8a]/10 px-5 py-2 text-[#00606c]"
      >
        <ExploreIcon filled />
        <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em]">
          Khám phá
        </span>
      </a>

      <a
        href="#"
        className="flex flex-col items-center justify-center px-5 py-2 text-[#3e494b]"
      >
        <TravelExploreIcon />
        <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em]">
          Chuyến đi
        </span>
      </a>

      <a
        href="#"
        className="flex flex-col items-center justify-center px-5 py-2 text-[#3e494b]"
      >
        <HeartOutlineIcon />
        <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em]">
          Yêu thích
        </span>
      </a>

      <a
        href="#"
        className="flex flex-col items-center justify-center px-5 py-2 text-[#3e494b]"
      >
        <ChatBubbleIcon />
        <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em]">
          Hỗ trợ
        </span>
      </a>
    </nav>
  );
}

function TourFooter() {
  return (
    <footer className="mt-12 bg-[#e5e9ea] px-6 py-16">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 md:grid-cols-4">
        <div className="space-y-6">
          <p className="text-xl font-bold tracking-tight text-[#00606c]">
            Ethereal Traveler
          </p>
          <p className="text-sm text-[#3e494b]">
            Kiến tạo những hành trình diệu kỳ, đưa bạn chạm tới những đường chân
            trời xa xôi.
          </p>
        </div>

        <div>
          <h4 className="mb-6 font-bold text-[#00606c]">Liên kết</h4>
          <ul className="space-y-4 text-sm text-[#3e494b]">
            <li>
              <a href="#" className="transition-colors hover:text-[#00606c]">
                Về chúng tôi
              </a>
            </li>
            <li>
              <a href="#" className="transition-colors hover:text-[#00606c]">
                Chính sách bảo mật
              </a>
            </li>
            <li>
              <a href="#" className="transition-colors hover:text-[#00606c]">
                Điều khoản dịch vụ
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="mb-6 font-bold text-[#00606c]">Điểm đến</h4>
          <ul className="space-y-4 text-sm text-[#3e494b]">
            <li>
              <a href="#" className="transition-colors hover:text-[#00606c]">
                Miền Bắc
              </a>
            </li>
            <li>
              <a href="#" className="transition-colors hover:text-[#00606c]">
                Miền Trung
              </a>
            </li>
            <li>
              <a href="#" className="transition-colors hover:text-[#00606c]">
                Miền Nam
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="mb-6 font-bold text-[#00606c]">Bản tin</h4>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="Email của bạn"
              className="w-full rounded-full bg-white px-4 py-2 text-sm outline-none ring-0 focus:ring-2 focus:ring-[#00606c]"
            />
            <button className="rounded-full bg-[#00606c] p-2 text-white">
              <SendIcon />
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-16 max-w-7xl border-t border-[#bdc8cb]/40 pt-8 text-center text-xs uppercase tracking-[0.14em] text-[#3e494b]">
        © 2024 Ethereal Traveler. All rights reserved.
      </div>
    </footer>
  );
}

function TrendingUpIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5 text-[#9b4500]"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 17 9 11l4 4 7-8" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 7h6v6" />
    </svg>
  );
}

function StarFilledIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4 fill-current"
      viewBox="0 0 24 24"
    >
      <path d="m12 17.27 6.18 3.73-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6 6 6-6 6" />
    </svg>
  );
}

function SupportAgentIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5 text-[#00606c]"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 13a6 6 0 1 0-12 0v3a2 2 0 0 0 2 2h2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 16v-3a6 6 0 1 0-12 0" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 18h1a2 2 0 0 0 2-2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6" />
    </svg>
  );
}

function ChatBubbleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-8 w-8"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h8M8 14h5M5 19l-1-4V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H8l-3 2Z" />
    </svg>
  );
}

function QuestionAnswerIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-8 w-8"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8h.01M7 8h.01M7 12h10M5 20l2.5-2H18a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h.5L5 20Z" />
    </svg>
  );
}

function ExploreIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-6 w-6"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 2}
    >
      {filled ? (
        <path d="m12 2 8 3v6c0 5.25-3.438 9.938-8 11-4.562-1.062-8-5.75-8-11V5l8-3Zm3.5 6.5-5.75 2.25L7.5 16.5l5.75-2.25L15.5 8.5Z" />
      ) : (
        <>
          <path strokeLinecap="round" strokeLinejoin="round" d="m12 2 8 3v6c0 5.25-3.438 9.938-8 11-4.562-1.062-8-5.75-8-11V5l8-3Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="m15.5 8.5-5.75 2.25L7.5 16.5l5.75-2.25L15.5 8.5Z" />
        </>
      )}
    </svg>
  );
}

function TravelExploreIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h13l5 5-5 5H3V7Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 12h.01" />
    </svg>
  );
}

function HeartOutlineIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-6.716-4.35-9.193-8.228C.328 8.893 2.094 4 6.615 4c2.036 0 3.443 1.08 4.294 2.327C11.76 5.08 13.167 4 15.203 4c4.52 0 6.287 4.893 3.808 8.772C18.716 16.65 12 21 12 21Z" />
    </svg>
  );
}


function SendIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M22 2 11 13" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M22 2 15 22l-4-9-9-4 20-7Z" />
    </svg>
  );
}
