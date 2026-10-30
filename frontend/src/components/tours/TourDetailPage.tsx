"use client";

import { useEffect, useMemo, useState } from "react";
import HomeHeader from "../home/HomeHeader";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useSeatAvailability } from "@/hooks/useSeatAvailability";
import SeatWarningModal from "@/components/shared/SeatWarningModal";

type ApiTourImage = {
  id: string;
  imageUrl: string;
  sortOrder: number;
  isCover: boolean;
};

type ApiDeparture = {
  id: string;
  departureCode: string;
  startDate: string;
  endDate: string;
  maxSeats?: number;
  availableSeats?: number;
  bookedSeats?: number;
  bookingStatus?: string;
  notes?: string | null;
};

type ApiTour = {
  id: string;
  tourCode: string;
  tourName: string;
  slug?: string | null;
  tourType: string;
  durationDays: number;
  durationNights: number;
  transportType?: string | null;
  basePrice: string | number;
  childPrice?: string | number;
  maxCapacity?: number;
  shortDescription?: string | null;
  description?: string | null;
  includedServices?: string | null;
  excludedServices?: string | null;
  imageUrl?: string | null;
  images?: ApiTourImage[];

 destination?: {
  name?: string | null;
  country?: string | null;
  city?: string | null;
  description?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
} | null;

  departure?: ApiDeparture | null;
  departures?: ApiDeparture[];
  itineraryDays?: {
    id: string;
    dayNumber: number;
    title: string;
    description?: string | null;
    overnightLocation?: string | null;
  }[];
  reviews?: {
    id: string;
    rating: number;
    title?: string | null;
    content?: string | null;
    images?: string[];
    createdAt?: string | null;
    customer?: {
      id?: string | null;
      fullName?: string | null;
    } | null;
  }[];
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

const fallbackGalleryImages = [
  "/images/tours/dalat-cover.jpg",
  "/images/tours/phuquoc-cover.jpg",
  "/images/tours/bangkok-cover.jpg",
  "https://images.unsplash.com/photo-1528127269322-539801943592?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop",
];

function formatPrice(price?: string | number | null) {
  return `${Number(price || 0).toLocaleString("vi-VN")}đ`;
}

function formatDate(date?: string | null) {
  if (!date) return "Đang cập nhật";
  return new Date(date).toLocaleDateString("vi-VN");
}
function formatPromotionDiscount(promotion: ApiPromotion) {
  if (promotion.promotion_type === "PERCENT") {
    return `Giảm ${Number(promotion.discount_value)}%`;
  }

  return `Giảm ${Number(promotion.discount_value || 0).toLocaleString(
    "vi-VN"
  )}đ`;
}
function getPromotionLabel(promotion?: ApiPromotion | null) {
  if (!promotion) return null;

  if (promotion.promotion_type === "PERCENT") {
    return `Giảm ${Number(promotion.discount_value)}%`;
  }

  return `Giảm ${Number(promotion.discount_value || 0).toLocaleString(
    "vi-VN"
  )}đ`;
}

function formatWeekday(date?: string | null) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("vi-VN", {
    weekday: "long",
  });
}

function splitText(value?: string | null) {
  if (!value) return [];
  return value
    .split(/\n|,|;/)
    .map((item) => item.trim())
    .filter(Boolean);
}

const HIDE_PAST_DEPARTURES = false;

export function isPastDeparture(startDateStr: string | null | undefined): boolean {
  if (!startDateStr) return true;
  const startDate = new Date(startDateStr);
  startDate.setHours(0, 0, 0, 0);

  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  return startDate.getTime() < currentDate.getTime();
}

function getDepartureList(tour: ApiTour | null) {
  if (!tour) return [];

  const list =
    tour.departures && tour.departures.length > 0
      ? tour.departures
      : tour.departure
      ? [tour.departure]
      : [];

  const sorted = [...list].sort((a, b) => {
    const isPastA = isPastDeparture(a.startDate);
    const isPastB = isPastDeparture(b.startDate);

    // 1. Còn mở xếp trước đã quá ngày
    if (!isPastA && isPastB) return -1;
    if (isPastA && !isPastB) return 1;

    // 2. Nếu cùng trạng thái, so sánh thời gian tăng dần để ngày sát hiện tại nhất lên đầu
    return (
      new Date(a.startDate || "").getTime() -
      new Date(b.startDate || "").getTime()
    );
  });

  if (HIDE_PAST_DEPARTURES) {
    return sorted.filter((d) => !isPastDeparture(d.startDate));
  }
  return sorted;
}
function getTourMapLocation(tour: ApiTour | null) {
  const locationText = [
    tour?.destination?.name,
    tour?.destination?.city,
    tour?.destination?.country,
    tour?.tourName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const locationMap: Record<
    string,
    { lat: number; lng: number; label: string }
  > = {
    nhật: { lat: 35.6762, lng: 139.6503, label: "Tokyo, Nhật Bản" },
    japan: { lat: 35.6762, lng: 139.6503, label: "Tokyo, Nhật Bản" },
    tokyo: { lat: 35.6762, lng: 139.6503, label: "Tokyo, Nhật Bản" },

    hàn: { lat: 37.5665, lng: 126.978, label: "Seoul, Hàn Quốc" },
    korea: { lat: 37.5665, lng: 126.978, label: "Seoul, Hàn Quốc" },
    seoul: { lat: 37.5665, lng: 126.978, label: "Seoul, Hàn Quốc" },

    thái: { lat: 13.7563, lng: 100.5018, label: "Bangkok, Thái Lan" },
    thailand: { lat: 13.7563, lng: 100.5018, label: "Bangkok, Thái Lan" },
    bangkok: { lat: 13.7563, lng: 100.5018, label: "Bangkok, Thái Lan" },

    bali: { lat: -8.4095, lng: 115.1889, label: "Bali, Indonesia" },
    indonesia: { lat: -8.4095, lng: 115.1889, label: "Bali, Indonesia" },

    "đà lạt": { lat: 11.9404, lng: 108.4583, label: "Đà Lạt, Việt Nam" },
    "đà nẵng": { lat: 16.0544, lng: 108.2022, label: "Đà Nẵng, Việt Nam" },
    "hội an": { lat: 15.8801, lng: 108.338, label: "Hội An, Việt Nam" },
    "phú quốc": { lat: 10.2899, lng: 103.984, label: "Phú Quốc, Việt Nam" },
    "hạ long": { lat: 20.9101, lng: 107.1839, label: "Hạ Long, Việt Nam" },
    sapa: { lat: 22.3364, lng: 103.8438, label: "Sapa, Việt Nam" },
    huế: { lat: 16.4637, lng: 107.5909, label: "Huế, Việt Nam" },
  };

  return (
    Object.entries(locationMap).find(([keyword]) =>
      locationText.includes(keyword)
    )?.[1] || {
      lat: 21.0285,
      lng: 105.8542,
      label: "Việt Nam",
    }
  );
}

export default function TourDetailPage() {
  const [showAllImages, setShowAllImages] = useState(false);
  const [showAllDepartures, setShowAllDepartures] = useState(false);
  const [tour, setTour] = useState<ApiTour | null>(null);
const [relatedTours, setRelatedTours] = useState<ApiTour[]>([]);
const [promotions, setPromotions] = useState<ApiPromotion[]>([]);
const [promotionLoading, setPromotionLoading] = useState(false);
const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [isFavorite, setIsFavorite] = useState(false);
  const [guests, setGuests] = useState(2);
  const [selectedDepartureId, setSelectedDepartureId] = useState<string>("");
  const TourLocationMap = dynamic(
  () => import("../common/TourLocationMap"),
  {
    ssr: false,
  }
);

  useEffect(() => {
    async function checkFavorite() {
      try {
        const token = localStorage.getItem("access_token");

        if (!token) {
          setIsFavorite(false);
          return;
        }

        const res = await fetch("/backend-api/favorites", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const json = await res.json();

        if (json.success) {
          const existed = json.data.some(
            (item: any) => String(item.tourId) === String(tour?.id)
          );
          setIsFavorite(existed);
        }
      } catch (err) {
        console.error(err);
      }
    }

    if (tour?.id) checkFavorite();
  }, [tour?.id]);

  useEffect(() => {
    async function loadTourDetail() {
      try {
        const id = window.location.pathname.split("/").filter(Boolean).pop();

        if (!id) {
          throw new Error("Thiếu mã tour");
        }

        const [detailRes, listRes] = await Promise.all([
          fetch(`/backend-api/tours/${id}`, { cache: "no-store" }),
          fetch("/backend-api/tours", { cache: "no-store" }),
        ]);

        if (!detailRes.ok) {
          throw new Error("Không thể lấy chi tiết tour");
        }

        const detailJson = await detailRes.json();
        const listJson = listRes.ok ? await listRes.json() : { data: [] };

        setTour(detailJson.data || null);
        setRelatedTours(
          Array.isArray(listJson.data)
            ? listJson.data
                .filter((item: ApiTour) => String(item.id) !== String(id))
                .slice(0, 3)
            : []
        );
      } catch (error) {
        console.error("Load tour detail error:", error);
        setTour(null);
      } finally {
        setLoading(false);
      }
    }

    loadTourDetail();
  }, []);

  useEffect(() => {
  async function loadTourPromotions() {
    if (!tour?.id) return;

    try {
      setPromotionLoading(true);

      const res = await fetch(`/backend-api/promotions?tourId=${tour.id}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Không thể lấy khuyến mãi của tour");
      }

      const json = await res.json();
      setPromotions(Array.isArray(json.data) ? json.data : []);
    } catch (error) {
      console.error("Load tour promotions error:", error);
      setPromotions([]);
    } finally {
      setPromotionLoading(false);
    }
  }

  loadTourPromotions();
}, [tour?.id]);

  const galleryImages = useMemo(() => {
    const images =
      tour?.images?.map((item) => item.imageUrl).filter(Boolean) || [];

    if (tour?.imageUrl && !images.includes(tour.imageUrl)) {
      images.unshift(tour.imageUrl);
    }

    return images.length > 0 ? images : fallbackGalleryImages;
  }, [tour]);

  const includedItems = splitText(tour?.includedServices);
  const excludedItems = splitText(tour?.excludedServices);
  const itineraryDays = tour?.itineraryDays || [];
  const departureList = getDepartureList(tour);
  const displayedDepartures = showAllDepartures
    ? departureList
    : departureList.slice(0, 2);

  const tourReviews =
    tour?.reviews && tour.reviews.length > 0
      ? tour.reviews.map((review) => ({
          id: review.id,
          name: review.customer?.fullName || "Khách hàng",
          location: review.createdAt
            ? new Date(review.createdAt).toLocaleDateString("vi-VN")
            : "Đã trải nghiệm tour",
          rating: Number(review.rating || 0),
          text:
            review.content ||
            review.title ||
            "Khách hàng hài lòng với chuyến đi.",
          images: Array.isArray(review.images) ? review.images : [],
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(
            review.customer?.fullName || "Khách hàng"
          )}&background=00606c&color=fff`,
        }))
      : [];
  useEffect(() => {
    if (departureList.length > 0) {
      const active = departureList.find((d) => {
        const available =
          d.availableSeats ??
          Number(d.maxSeats || 0) - Number(d.bookedSeats || 0);
        return !isPastDeparture(d.startDate) && available > 0;
      });
      setSelectedDepartureId(String(active?.id || departureList[0]?.id || ""));
    }
  }, [departureList]);

  const selectedDeparture = useMemo(() => {
    return (
      departureList.find((d) => String(d.id) === String(selectedDepartureId)) ||
      departureList[0] ||
      null
    );
  }, [departureList, selectedDepartureId]);

  const availableSeats = useMemo(() => {
    if (!selectedDeparture) return 0;
    const seats =
      selectedDeparture.availableSeats ??
      Number(selectedDeparture.maxSeats || 0) -
        Number(selectedDeparture.bookedSeats || 0);
    return Math.max(seats, 0);
  }, [selectedDeparture]);

const {
  isSeatsInvalid,
  warningInfo,
  showWarningModal,
  closeWarning,
} = useSeatAvailability({
  tourId: tour?.id || "",
  departureId: selectedDeparture?.id || "",
  bookingType: "INDIVIDUAL",
  adultCount: guests,
  childCount: 0,
  expectedGuestCount: 0,
  availableSeats: availableSeats,
  isLoading: loading,
});

const totalPrice = Number(tour?.basePrice || 0) * guests;
const featuredPromotion = promotions[0] || null;

  const averageRating =
    tourReviews.length > 0
      ? tourReviews.reduce((sum, review) => sum + review.rating, 0) /
        tourReviews.length
      : 0;

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f6fafb] text-[#181c1d]">
        <HomeHeader />
        <div className="mx-auto max-w-7xl px-4 py-40 text-center text-xl font-bold text-[#00606c]">
          Đang tải chi tiết tour...
        </div>
      </main>
    );
  }

  if (!tour) {
    return (
      <main className="min-h-screen bg-[#f6fafb] text-[#181c1d]">
        <HomeHeader />
        <div className="mx-auto max-w-7xl px-4 py-40 text-center text-xl font-bold text-[#00606c]">
          Không tìm thấy tour.
        </div>
      </main>
    );
  }



const lat = Number(tour.destination?.latitude || 21.0285);
const lng = Number(tour.destination?.longitude || 105.8542);

const mapLabel =
  [tour.destination?.name, tour.destination?.city, tour.destination?.country]
    .filter(Boolean)
    .join(", ") || tour.tourName;

  return (
    <main className="bg-[#f6fafb] text-[#181c1d]">
      <HomeHeader />

      <button
        type="button"
        onClick={() => router.push("/tours")}
        aria-label="Quay lại"
        className="fixed left-6 top-24 z-[80] flex h-14 w-14 items-center justify-center rounded-full border-4 border-[#12a7b8] bg-white text-[#12a7b8] shadow-lg transition hover:bg-[#12a7b8] hover:text-white active:scale-95"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-7 w-7"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div className="pt-20">
        <section className="mx-auto max-w-[1350px] px-6 py-6 md:px-10">
          <div className="mb-6">
            <h1 className="mb-4 text-3xl font-extrabold tracking-[-0.03em] md:text-4xl">
              {tour.tourName}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-[#3e494b] md:gap-6">
              <div className="flex items-center gap-2">
                <StarFilledIcon className="h-5 w-5 text-[#9b4500]" />
                <span className="font-bold">
                  {averageRating.toFixed(1)} ({tourReviews.length} đánh giá)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <MapPinIcon className="h-5 w-5 text-[#00606c]" />
                <span className="font-medium underline decoration-1 underline-offset-4">
                  {[tour.destination?.name, tour.destination?.country]
                    .filter(Boolean)
                    .join(", ") || "Đang cập nhật"}
                </span>
              </div>

              <div className="flex-grow" />

              <div className="flex items-center gap-3">
                <ActionChip
                  icon={<ShareIcon className="h-4 w-4" />}
                  label="Chia sẻ"
                />

                <button
                  type="button"
                  onClick={async () => {
                    if (!tour?.id) return;

                    const token = localStorage.getItem("access_token");

                    if (!token) {
                      alert("Vui lòng đăng nhập");
                      router.push("/login");
                      return;
                    }

                    try {
                      if (isFavorite) {
                        const res = await fetch(
                          `/backend-api/favorites/${tour.id}`,
                          {
                            method: "DELETE",
                            headers: {
                              Authorization: `Bearer ${token}`,
                            },
                          }
                        );

                        const json = await res.json();

                        if (!res.ok || !json.success) {
                          alert(json.message || "Gỡ thất bại");
                          return;
                        }

                        setIsFavorite(false);
                        window.dispatchEvent(new Event("favorites-changed"));
                        return;
                      }

                      const res = await fetch("/backend-api/favorites", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({ tourId: tour.id }),
                      });

                      const json = await res.json();

                      if (!res.ok || !json.success) {
                        alert(json.message || "Lưu thất bại");
                        return;
                      }

                      setIsFavorite(true);
                      window.dispatchEvent(new Event("favorites-changed"));
                    } catch (err) {
                      console.error(err);
                      alert("Lỗi");
                    }
                  }}
                  className="flex items-center gap-2 text-sm font-medium text-[#3e494b] transition hover:text-red-500"
                >
                  <HeartIcon
                    className="h-5 w-5"
                    filled={isFavorite}
                  />

                  <span>{isFavorite ? "Đã yêu thích" : "Yêu thích"}</span>
                </button>
              </div>
            </div>
          </div>



          <div className="relative grid h-[420px] grid-cols-4 grid-rows-2 gap-3 overflow-hidden rounded-[24px] md:h-[540px]">
            <div className="col-span-4 row-span-1 overflow-hidden md:col-span-2 md:row-span-2">
              <img
                src={galleryImages[0]}
                alt={tour.tourName}
                className="h-full w-full cursor-pointer object-cover transition-transform duration-700 hover:scale-105"
              />
            </div>

            {galleryImages.slice(1, 5).map((image, index) => (
              <div key={index} className="hidden overflow-hidden md:block">
                <img
                  src={image}
                  alt={`${tour.tourName} ${index + 2}`}
                  className="h-full w-full cursor-pointer object-cover transition-transform duration-700 hover:scale-105"
                />
              </div>
            ))}

            <button
              onClick={() => setShowAllImages(true)}
              className="absolute bottom-4 right-4 z-10 flex items-center gap-2 rounded-xl border border-[#181c1d] bg-white px-4 py-2 font-bold shadow-md transition-colors hover:bg-[#f1f4f5]"
            >
              <GridIcon className="h-4 w-4" />
              Hiển thị tất cả ảnh
            </button>
          </div>
        </section>

        <div className="mx-auto grid max-w-[1350px] grid-cols-1 gap-12 px-6 py-8 md:px-10 lg:grid-cols-3">
          <div className="space-y-16 lg:col-span-2">
            <section>
              <div className="mb-6 flex flex-wrap items-center gap-4 md:gap-6">
                <div className="flex items-center gap-2">
                  <ClockIcon className="h-5 w-5 text-[#00606c]" />
                  <span className="text-lg font-medium">
                    {tour.durationDays} Ngày {tour.durationNights} Đêm
                  </span>
                </div>

                <div className="flex items-center gap-2 rounded-full bg-[#9defff]/40 px-3 py-1">
                  <EyeIcon className="h-4 w-4 animate-pulse text-[#00606c]" />
                  <span className="text-sm font-semibold text-[#004f59]">
                    5 người đang xem tour này
                  </span>
                </div>
              </div>

              <h2 className="mb-6 text-2xl font-extrabold tracking-[-0.02em] text-[#00606c]">
                Về chuyến đi này
              </h2>

              <p className="text-lg leading-8 text-[#3e494b]">
                {tour.description ||
                  tour.shortDescription ||
                  "Thông tin mô tả tour đang được cập nhật."}
              </p>
            </section>

            <section className="space-y-6">
              <h2 className="text-2xl font-extrabold tracking-[-0.02em] text-[#00606c]">
                Tiện ích đẳng cấp
              </h2>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <FeatureShowcaseCard
                  title={tour.transportType || "Phương tiện theo chương trình"}
                  subtitle="Di chuyển theo lịch trình tour, đảm bảo thuận tiện cho khách hàng"
                  image={galleryImages[1] || galleryImages[0]}
                />
                <FeatureShowcaseCard
                  title="Dịch vụ theo lịch trình"
                  subtitle="Các dịch vụ được sắp xếp theo chương trình tour"
                  image={galleryImages[2] || galleryImages[0]}
                />
              </div>
            </section>

            <section className="rounded-[24px] border border-[#00606c]/10 bg-[#00606c]/5 p-8">
              <h2 className="mb-8 text-2xl font-extrabold tracking-[-0.02em] text-[#00606c]">
                Chính sách & An tâm tin tưởng
              </h2>

              <div className="grid grid-cols-1 gap-8 text-center md:grid-cols-3">
                <PolicyCard
                  icon={<CalendarOffIcon className="h-8 w-8 text-[#00606c]" />}
                  title="Chính sách hủy"
                  description="Áp dụng theo điều kiện hủy tour của từng chương trình"
                />
                <PolicyCard
                  icon={<ShieldIcon className="h-8 w-8 text-[#00606c]" />}
                  title="Thông tin minh bạch"
                  description="Giá tour, lịch trình và dịch vụ được cập nhật rõ ràng"
                />
                <PolicyCard
                  icon={<HeadsetIcon className="h-8 w-8 text-[#00606c]" />}
                  title="Hỗ trợ 24/7"
                  description="Đội ngũ CSKH luôn sẵn sàng hỗ trợ bạn"
                />
              </div>
            </section>

            <section>
              <div className="mb-8 flex items-center justify-between gap-4">
                <h2 className="text-2xl font-extrabold tracking-[-0.02em] text-[#00606c]">
                  Lịch trình chi tiết
                </h2>

                <button className="flex items-center gap-1 font-semibold text-[#00606c] hover:underline">
                  Mở rộng tất cả
                  <ChevronDownIcon className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4">
                {itineraryDays.length === 0 ? (
                  <div className="rounded-[20px] bg-white p-6 text-center text-[#3e494b]">
                    Chưa có lịch trình cho tour này.
                  </div>
                ) : (
                  itineraryDays.map((item: any) => (
                    <div
                      key={item.id}
                      className="rounded-[20px] border border-[#bdc8cb]/20 bg-white p-8 shadow-sm"
                    >
                      <div className="flex gap-6">
                        <div className="flex-none">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#00606c] font-bold text-white">
                            {item.dayNumber}
                          </div>
                        </div>

                        <div className="flex-grow">
                          <h3 className="mb-3 text-xl font-bold">
                            {item.title || `Ngày ${item.dayNumber}`}
                          </h3>

                          <p className="mb-4 text-[#3e494b]">
                            {item.description || "Đang cập nhật..."}
                          </p>

                          {item.overnightLocation ? (
                            <p className="text-sm font-semibold text-[#00606c]">
                              Nghỉ đêm tại: {item.overnightLocation}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

          <DepartureScheduleSection
  tour={tour}
  guests={guests}
  departures={displayedDepartures}
  totalDepartures={departureList.length}
  showAllDepartures={showAllDepartures}
  onToggleShowAll={() => setShowAllDepartures((prev) => !prev)}
  promotionCode={featuredPromotion?.promotion_code}
/>

            <section className="grid gap-8 md:grid-cols-2">
              <InfoListCard
                title="Bao gồm"
                titleColor="text-[#00606c]"
                bgClass="bg-[#00606c]/5"
                icon={<CheckCircleIcon className="h-6 w-6 text-[#00606c]" />}
                itemIcon={<CheckSmallIcon className="mt-1 h-4 w-4 text-[#00606c]" />}
                items={
                  includedItems.length > 0
                    ? includedItems
                    : [
                        "Dịch vụ theo chương trình",
                        "Hỗ trợ tư vấn trước chuyến đi",
                      ]
                }
              />

              <InfoListCard
                title="Không bao gồm"
                titleColor="text-[#ba1a1a]"
                bgClass="bg-[#ba1a1a]/5"
                icon={<CancelIcon className="h-6 w-6 text-[#ba1a1a]" />}
                itemIcon={<CloseSmallIcon className="mt-1 h-4 w-4 text-[#ba1a1a]" />}
                items={
                  excludedItems.length > 0
                    ? excludedItems
                    : [
                        "Chi phí cá nhân",
                        "Các dịch vụ không ghi trong chương trình",
                      ]
                }
              />
            </section>
<section>
  <div className="mb-6 flex items-end justify-between">
    <div>
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#9b4500]">
        Location
      </p>
      <h2 className="text-2xl font-extrabold tracking-[-0.02em] text-[#00606c]">
        Vị trí điểm đến
      </h2>
    </div>

    <a
      href={`https://www.google.com/maps?q=${lat},${lng}`}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-full bg-[#00606c] px-5 py-2 text-sm font-bold !text-white hover:!text-white"
    >
      Mở Google Maps
    </a>
  </div>

  <div className="relative overflow-hidden rounded-[28px] bg-white p-3 shadow-[0_20px_50px_rgba(0,96,108,0.12)]">
    <TourLocationMap
  lat={lat}
  lng={lng}
  title={mapLabel}
/>

    <div className="pointer-events-none absolute bottom-6 left-6 right-6 rounded-[24px] bg-white/90 p-5 shadow-xl backdrop-blur-md md:left-auto md:w-[360px]">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#9b4500]">
        Điểm đến
      </p>
      <h3 className="mt-1 text-xl font-black text-[#00606c]">
        {mapLabel}
      </h3>
      <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#3e494b]">
        Xem vị trí điểm đến và khu vực tham quan chính của hành trình.
      </p>
    </div>
  </div>
</section>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-28 rounded-[24px] border border-[#bdc8cb]/20 bg-white p-8 shadow-xl shadow-[#00606c]/5">
              <div className="mb-6 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-[#00606c]">
                  {formatPrice(tour.basePrice)}
                </span>
                <span className="text-[#3e494b]">/khách</span>
              </div>
            
            {featuredPromotion ? (
  <div className="mb-5 rounded-[20px] border border-[#f3d6b8] bg-[#fff8ef] p-4 shadow-[0_10px_24px_rgba(155,69,0,0.08)]">
    <div className="mb-3 flex items-center gap-3">
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fc8a40] text-lg shadow-md">
        <span className="absolute h-full w-full animate-ping rounded-full bg-[#fc8a40]/40" />
        <span className="relative">🎁</span>
      </div>

      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#9b4500]">
          Ưu đãi đang áp dụng
        </p>
        <p className="line-clamp-1 text-sm font-extrabold text-[#00606c]">
          {featuredPromotion.promotion_name}
        </p>
      </div>
    </div>

    <div className="mb-3 rounded-2xl bg-white px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-bold text-[#6e797b]">
          Mã ưu đãi
        </span>

        <span className="rounded-full bg-[#00606c] px-3 py-1 text-xs font-black !text-white">
          {featuredPromotion.promotion_code}
        </span>
      </div>

      <p className="mt-2 text-sm font-bold text-[#9b4500]">
        Đặt ngay để được {getPromotionLabel(featuredPromotion)}
      </p>
    </div>

    <p className="text-xs leading-5 text-[#6e797b]">
      Mã sẽ được tự động áp dụng khi bạn bấm đặt tour.
    </p>
  </div>
) : null}
            
              <div className="space-y-6">
                <div>
                  <label className="mb-2 block text-sm font-bold uppercase tracking-[0.14em] text-[#3e494b]">
                    Chọn ngày khởi hành
                  </label>
                  <div className="relative">
                    <select
                      value={selectedDepartureId}
                      onChange={(e) => setSelectedDepartureId(e.target.value)}
                      className="w-full appearance-none rounded-full bg-[#e5e9ea] px-6 py-4 outline-none ring-0 focus:ring-2 focus:ring-[#00606c] text-sm font-semibold"
                    >
                      {departureList.map((departure) => {
                        const isPast = isPastDeparture(departure.startDate);
                        const avSeats =
                          departure.availableSeats ??
                          Number(departure.maxSeats || 0) -
                            Number(departure.bookedSeats || 0);
                        const isSeatsOut = avSeats <= 0;
                        let suffix = "";
                        if (isPast) suffix = " (Đã khởi hành)";
                        else if (isSeatsOut) suffix = " (Hết chỗ)";

                        return (
                          <option
                            key={departure.id}
                            value={departure.id}
                            disabled={isPast || isSeatsOut}
                          >
                            {formatDate(departure.startDate)} -{" "}
                            {formatDate(departure.endDate)}
                            {suffix}
                          </option>
                        );
                      })}

                      {departureList.length === 0 ? (
                        <option value="">Đang cập nhật</option>
                      ) : null}
                    </select>
                    <CalendarIcon className="pointer-events-none absolute right-6 top-1/2 h-5 w-5 -translate-y-1/2 text-[#3e494b]" />
                  </div>
                </div>

                <div className={`flex items-center justify-between rounded-full px-4 py-2 transition ${
                  isSeatsInvalid ? "bg-[#ffdad6] ring-2 ring-[#ba1a1a]/40" : "bg-[#e5e9ea]"
                }`}>
                  <QtyButton
                    icon={<MinusIcon className="h-5 w-5" />}
                    onClick={() => setGuests((prev) => Math.max(1, prev - 1))}
                  />
                  <input
                    type="number"
                    min={1}
                    value={guests}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (val > 0) {
                        setGuests(val);
                      } else if (e.target.value === "") {
                        setGuests("" as any);
                      }
                    }}
                    onBlur={() => {
                      if (!guests || Number(guests) < 1) {
                        setGuests(1);
                      }
                    }}
                    className="w-16 bg-transparent border-none text-center text-xl font-bold text-[#181c1d] outline-none focus:ring-0 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <QtyButton
                    icon={<PlusIcon className="h-5 w-5" />}
                    onClick={() => setGuests((prev) => prev + 1)}
                  />
                </div>

                {isSeatsInvalid && (
                  <p className="mt-2 text-xs font-bold text-[#ba1a1a] text-center animate-pulse">
                    * Vượt số chỗ trống (Còn {availableSeats} chỗ)
                  </p>
                )}

                <div className="border-t border-[#bdc8cb]/20 pt-4">
                  <div className="mb-2 flex justify-between">
                    <span className="text-[#3e494b]">Giá tour (x{guests})</span>
<span className="font-bold">{formatPrice(totalPrice)}</span>
                  </div>

                 <div className="mb-6 flex justify-between">
  <span className="text-[#3e494b]">Ưu đãi khả dụng</span>
  <span className="font-bold text-[#9b4500]">
    {featuredPromotion ? featuredPromotion.promotion_code : "Chưa có"}
  </span>
</div>

                  <div className="mb-8 flex items-center justify-between">
                    <span className="text-lg font-bold">Tổng cộng</span>
                    <span className="text-2xl font-extrabold text-[#00606c]">
                      {formatPrice(totalPrice)}
                    </span>
                  </div>

                  {(() => {
                    const isDeparturePast = isPastDeparture(selectedDeparture?.startDate);
                    const isDepartureSeatsOut = availableSeats <= 0;

                    if (isDeparturePast) {
                      return (
                        <button
                          type="button"
                          disabled
                          className="block w-full rounded-full bg-gray-400 py-5 text-center text-lg font-extrabold text-white cursor-not-allowed opacity-60 uppercase"
                        >
                          Đã khởi hành
                        </button>
                      );
                    }
                    if (isDepartureSeatsOut) {
                      return (
                        <button
                          type="button"
                          disabled
                          className="block w-full rounded-full bg-gray-400 py-5 text-center text-lg font-extrabold text-white cursor-not-allowed opacity-60 uppercase"
                        >
                          Hết chỗ
                        </button>
                      );
                    }
                    if (isSeatsInvalid) {
                      return (
                        <button
                          type="button"
                          disabled
                          className="block w-full rounded-full bg-gray-400 py-5 text-center text-lg font-extrabold text-white cursor-not-allowed opacity-60 uppercase"
                        >
                          CHỖ TRỐNG KHÔNG ĐỦ
                        </button>
                      );
                    }
                    return (
                      <a
                        href={`/booking?tourId=${tour.id}&departureId=${selectedDeparture?.id || ""}&guests=${guests}${
                          featuredPromotion
                            ? `&promotionCode=${encodeURIComponent(
                                featuredPromotion.promotion_code
                              )}`
                            : ""
                        }`}
                        className="block w-full rounded-full bg-[linear-gradient(135deg,#9b4500_0%,#fc8a40_100%)] py-5 text-center text-lg font-extrabold !text-white shadow-lg shadow-[#9b4500]/20 transition-all hover:scale-[1.02] hover:!text-white active:scale-95"
                      >
                        ĐẶT TOUR NGAY
                      </a>
                    );
                  })()}
                </div>
              </div>

              <div className="mt-6 flex items-start gap-3 rounded-[18px] bg-[#00606c]/5 p-4">
                <InfoIcon className="h-5 w-5 text-[#00606c]" />
                <p className="text-xs leading-tight text-[#3e494b]">
                  Còn{" "}
                  <b>
                    {availableSeats} chỗ
                  </b>{" "}
                  cho lịch khởi hành đang chọn.
                </p>
              </div>

              <p className="mt-6 text-center text-xs text-[#3e494b]">
                Chính sách hủy áp dụng theo từng chương trình tour.
              </p>
            </div>

            <SeatWarningModal
              isOpen={showWarningModal}
              onClose={closeWarning}
              selectedCount={warningInfo.selected}
              availableSeats={warningInfo.available}
              excessCount={warningInfo.excess}
            />

          </div>
        </div>

        <section className="mt-16 bg-[#f1f4f5] py-20">
          <div className="mx-auto max-w-[1350px] px-6 md:px-10">
            <div className="mb-12 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
              <div>
                <h2 className="mb-4 text-3xl font-extrabold tracking-[-0.02em] text-[#00606c]">
                  Đánh giá từ khách hàng
                </h2>
                <div className="flex items-center gap-4">
                  <span className="text-6xl font-extrabold text-[#00606c]">
                    {averageRating.toFixed(1)}
                  </span>
                  <div>
                    <div className="flex text-[#fc8a40]">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <StarFilledIcon
                          key={i}
                          className={`h-5 w-5 ${
                            i < Math.round(averageRating) ? "" : "opacity-30"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="font-medium text-[#3e494b]">
                      Dựa trên {tourReviews.length} đánh giá
                    </p>
                  </div>
                </div>
              </div>

              <button className="rounded-full border-2 border-[#00606c] px-8 py-3 font-bold text-[#00606c] transition-all hover:bg-[#00606c] hover:text-white">
                Viết đánh giá của bạn
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {tourReviews.length > 0 ? (
                tourReviews.map((review) => (
                  <div
                    key={review.id}
                    className="rounded-[20px] border border-[#bdc8cb]/10 bg-white p-8 shadow-sm"
                  >
                    <div className="mb-6 flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <img
                          src={review.avatar}
                          alt={review.name}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                        <div>
                          <div className="flex items-center gap-1">
                            <h4 className="font-bold">{review.name}</h4>
                            <VerifiedIcon className="h-4 w-4 text-blue-500" />
                          </div>
                          <span className="text-xs text-[#3e494b]">
                            {review.location}
                          </span>
                        </div>
                      </div>

                      <div className="flex origin-right scale-75 text-[#fc8a40]">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <StarFilledIcon
                            key={i}
                            className={`h-5 w-5 ${
                              i < review.rating ? "" : "opacity-30"
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <p className="italic text-[#3e494b]">"{review.text}"</p>

                    {review.images.length > 0 ? (
                      <div className="mt-5 flex gap-3 overflow-x-auto pb-1">
                        {review.images.map((image: string, index: number) => (
                          <img
                            key={`${image}-${index}`}
                            src={image}
                            alt={`Ảnh đánh giá ${index + 1}`}
                            className="h-20 w-24 shrink-0 rounded-xl object-cover"
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="col-span-full rounded-[20px] bg-white p-8 text-center font-semibold text-[#00606c]">
                  Tour này chưa có đánh giá nào.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1350px] px-6 py-20 md:px-10">
          <h2 className="mb-10 text-3xl font-extrabold tracking-[-0.02em] text-[#00606c]">
            Có thể bạn sẽ thích
          </h2>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {relatedTours.map((item) => (
              <div
                key={item.id}
                className="group overflow-hidden rounded-[24px] border border-[#bdc8cb]/10 bg-white shadow-md transition-shadow hover:shadow-xl"
              >
                <div className="h-48 overflow-hidden">
                  <img
                    src={item.imageUrl || "/images/tours/dalat-cover.jpg"}
                    alt={item.tourName}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </div>

                <div className="p-6">
                  <div className="mb-2 flex items-start justify-between gap-4">
                    <h4 className="text-lg font-bold leading-tight">
                      {item.tourName}
                    </h4>
                    <div className="flex items-center text-sm font-bold text-[#9b4500]">
                      <StarFilledIcon className="h-4 w-4" />
                      4.9
                    </div>
                  </div>

                  <p className="mb-4 font-extrabold text-[#00606c]">
                    {formatPrice(item.basePrice)}
                  </p>

                  <a
                    href={`/tours/${item.id}`}
                    className="block w-full rounded-full border border-[#00606c] py-3 text-center font-bold text-[#00606c] transition-colors hover:bg-[#00606c] hover:text-white"
                  >
                    Xem chi tiết
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>

        <DetailFooter />
      </div>

      {showAllImages ? (
        <div className="fixed inset-0 z-[999] overflow-y-auto bg-black/90 p-4 md:p-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Tất cả ảnh tour</h2>

              <button
                onClick={() => setShowAllImages(false)}
                className="rounded-full bg-white px-5 py-2 font-bold text-[#181c1d]"
              >
                Đóng
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {galleryImages.map((image, index) => (
                <img
                  key={`${image}-${index}`}
                  src={image}
                  alt={`Ảnh tour ${index + 1}`}
                  className="h-auto w-full rounded-2xl object-cover"
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function DepartureScheduleSection({
  tour,
  guests,
  departures,
  totalDepartures,
  showAllDepartures,
  onToggleShowAll,
  promotionCode,
}: {
  tour: ApiTour;
  guests: number;
  departures: ApiDeparture[];
  totalDepartures: number;
  showAllDepartures: boolean;
  onToggleShowAll: () => void;
  promotionCode?: string;
}) {
  if (totalDepartures === 0) return null;
 

  return (
    <section className="overflow-hidden rounded-[24px] bg-white shadow-[0_16px_32px_rgba(0,96,108,0.08)]">
      <div className="flex flex-col justify-between gap-4 border-b border-[#bdc8cb]/20 px-6 py-5 md:flex-row md:items-center">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-[#9b4500]" />
          <h2 className="text-xl font-extrabold text-[#00606c]">
            Ngày khởi hành khác
          </h2>
        </div>

        {totalDepartures > 2 ? (
          <button
            type="button"
            onClick={onToggleShowAll}
            className="w-fit rounded-full bg-[#00606c] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#004f59]"
          >
            {showAllDepartures ? "Thu gọn" : "Xem tất cả"}
          </button>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="bg-[#f1f4f5]/70">
              <th className="px-6 py-4 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#3e494b]">
                STT
              </th>
              <th className="px-6 py-4 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#3e494b]">
                Ngày khởi hành
              </th>
              <th className="px-6 py-4 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#3e494b]">
                Đặc điểm
              </th>
              <th className="px-6 py-4 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#3e494b]">
                Giá từ
              </th>
              <th className="px-6 py-4 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#3e494b]">
                Số chỗ
              </th>
              <th className="px-6 py-4 text-right text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#3e494b]">
                Book tour
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#bdc8cb]/20">
            {departures.map((departure, index) => {
              const availableSeats =
                departure.availableSeats ??
                Number(departure.maxSeats || 0) -
                  Number(departure.bookedSeats || 0);

              const isPast = isPastDeparture(departure.startDate);
              const isSeatsOut = Number(availableSeats || 0) <= 0;

              let rowClass = "transition hover:bg-[#f6fafb]";
              let statusText = `Còn ${availableSeats || 0} chỗ`;
              let btnText = "Đặt ngay";
              let btnClass = "bg-[#D0770B] hover:bg-[#004f58]";
              let isDisabled = false;

              if (isPast) {
                rowClass = "transition hover:bg-gray-100 bg-gray-50/50 opacity-60 text-gray-400 grayscale";
                statusText = "Đã khởi hành";
                btnText = "Đã khởi hành";
                btnClass = "pointer-events-none bg-gray-300 !text-gray-500";
                isDisabled = true;
              } else if (isSeatsOut) {
                statusText = "Hết chỗ";
                btnText = "Hết chỗ";
                btnClass = "pointer-events-none bg-gray-400";
                isDisabled = true;
              }

              return (
                <tr
                  key={departure.id || `${departure.startDate}-${index}`}
                  className={rowClass}
                >
                  <td className="px-6 py-5 text-sm font-semibold text-[#3e494b]">
                    {index + 1}
                  </td>

                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="font-bold text-[#181c1d]">
                        {formatDate(departure.startDate)}
                      </span>
                      <span className="text-xs capitalize text-[#6e797b]">
                        {formatWeekday(departure.startDate)}
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-5 text-sm text-[#3e494b]">
                    {departure.notes ||
                      tour.transportType ||
                      "Lịch khởi hành theo chương trình"}
                  </td>

                  <td className="px-6 py-5 text-sm font-extrabold text-[#181c1d]">
                    {formatPrice(tour.basePrice)}
                  </td>

                  <td className="px-6 py-5 text-sm font-semibold">
                    {statusText}
                  </td>

                  <td className="px-6 py-5 text-right">
                    <a
                      href={`/booking?tourId=${tour.id}&departureId=${departure.id}&guests=${guests}${
                        promotionCode ? `&promotionCode=${encodeURIComponent(promotionCode)}` : ""
                      }`}
                      className={`mr-2 inline-flex rounded-full px-4 py-2 text-xs font-bold !text-white ${btnClass}`}
                      onClick={(e) => {
                        if (isDisabled) e.preventDefault();
                      }}
                    >
                      {btnText}
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!showAllDepartures && totalDepartures > 2 ? (
        <div className="bg-[#f6fafb] px-6 py-4 text-center text-sm text-[#6e797b]">
          Đang hiển thị 2/{totalDepartures} ngày khởi hành. Bấm “Xem tất cả” để
          xem thêm phía dưới.
        </div>
      ) : null}
    </section>
  );
}

function ActionChip({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-lg px-3 py-2 transition-colors hover:bg-[#ebeeef]"
    >
      {icon}
      <span className="text-sm font-semibold">{label}</span>
    </button>
  );
}

function FeatureShowcaseCard({
  title,
  subtitle,
  image,
}: {
  title: string;
  subtitle: string;
  image: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-[20px] shadow-md">
      <img
        src={image}
        alt={title}
        className="h-64 w-full object-cover transition-transform group-hover:scale-105"
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-6">
        <h4 className="text-xl font-bold text-white">{title}</h4>
        <p className="text-sm text-white/80">{subtitle}</p>
      </div>
    </div>
  );
}

function PolicyCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-3">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
        {icon}
      </div>
      <h4 className="font-bold">{title}</h4>
      <p className="text-sm text-[#3e494b]">{description}</p>
    </div>
  );
}

function InfoListCard({
  title,
  titleColor,
  bgClass,
  icon,
  itemIcon,
  items,
}: {
  title: string;
  titleColor: string;
  bgClass: string;
  icon: React.ReactNode;
  itemIcon: React.ReactNode;
  items: string[];
}) {
  return (
    <div className={`${bgClass} rounded-[20px] p-8`}>
      <h3 className={`mb-6 flex items-center gap-2 text-xl font-bold ${titleColor}`}>
        {icon}
        {title}
      </h3>

      <ul className="space-y-4 text-[#3e494b]">
        {items.map((item) => (
          <li key={item} className="flex gap-3">
            {itemIcon}
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function QtyButton({
  icon,
  onClick,
}: {
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick}>
      {icon}
    </button>
  );
}

function DetailFooter() {
  return (
    <footer className="mt-auto w-full bg-slate-100 py-16">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 md:grid-cols-4 md:px-8">
        <div className="md:col-span-2">
          <h3 className="mb-4 text-2xl font-extrabold text-[#00606c]">
            ChillTrip
          </h3>
          <p className="max-w-md text-sm leading-7 text-[#3e494b]">
            Nền tảng du lịch giúp bạn khám phá hành trình phù hợp, đặt tour dễ
            dàng và tận hưởng chuyến đi trọn vẹn.
          </p>
        </div>

        <div>
          <h4 className="mb-4 font-bold text-[#181c1d]">Thông tin</h4>
          <ul className="space-y-2 text-sm text-[#3e494b]">
            <li>Về ChillTrip</li>
            <li>Điều khoản</li>
            <li>Chính sách bảo mật</li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 font-bold text-[#181c1d]">Hỗ trợ</h4>
          <ul className="space-y-2 text-sm text-[#3e494b]">
            <li>Trung tâm trợ giúp</li>
            <li>Liên hệ</li>
            <li>Hướng dẫn đặt tour</li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

function SvgIcon({
  children,
  className = "h-5 w-5",
  fill = "none",
  stroke = "currentColor",
}: {
  children: React.ReactNode;
  className?: string;
  fill?: string;
  stroke?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      viewBox="0 0 24 24"
      fill={fill}
      stroke={stroke}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

function StarFilledIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <SvgIcon className={className} fill="currentColor" stroke="currentColor">
      <path d="m12 2 3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2Z" />
    </SvgIcon>
  );
}

function MapPinIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <SvgIcon className={className}>
      <path d="M12 21s7-4.35 7-11a7 7 0 0 0-14 0c0 6.65 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </SvgIcon>
  );
}
function ChevronDownIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <SvgIcon className={className}>
      <path d="m6 9 6 6 6-6" />
    </SvgIcon>
  );
}

function MapPinFilledIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <SvgIcon className={className} fill="currentColor" stroke="currentColor">
      <path d="M12 21s7-4.35 7-11a7 7 0 0 0-14 0c0 6.65 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" fill="white" stroke="white" />
    </SvgIcon>
  );
}

function ShareIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <SvgIcon className={className}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.6 13.5 6.8 4" />
      <path d="m15.4 6.5-6.8 4" />
    </SvgIcon>
  );
}

function HeartIcon({
  className = "h-5 w-5",
  filled,
}: {
  className?: string;
  filled?: boolean;
}) {
  return (
    <SvgIcon
      className={className}
      fill={filled ? "#ef4444" : "none"}
      stroke={filled ? "#ef4444" : "currentColor"}
    >
      <path d="M20.8 4.6c-1.5-1.4-3.8-1.4-5.3 0L12 8 8.5 4.6c-1.5-1.4-3.8-1.4-5.3 0-1.6 1.5-1.6 3.9 0 5.4L12 21l8.8-11c1.6-1.5 1.6-3.9 0-5.4Z" />
    </SvgIcon>
  );
}

function GridIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <SvgIcon className={className}>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </SvgIcon>
  );
}

function ClockIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <SvgIcon className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </SvgIcon>
  );
}

function EyeIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <SvgIcon className={className}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </SvgIcon>
  );
}

function CalendarOffIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <SvgIcon className={className}>
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <path d="M3 10h18" />
      <path d="M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
      <path d="m9 14 6 4" />
      <path d="m15 14-6 4" />
    </SvgIcon>
  );
}

function ShieldIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <SvgIcon className={className}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-5" />
    </SvgIcon>
  );
}

function HeadsetIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <SvgIcon className={className}>
      <path d="M3 14v-2a9 9 0 0 1 18 0v2" />
      <path d="M21 14v3a2 2 0 0 1-2 2h-2v-7h2a2 2 0 0 1 2 2Z" />
      <path d="M3 14v3a2 2 0 0 0 2 2h2v-7H5a2 2 0 0 0-2 2Z" />
      <path d="M13 19h3" />
    </SvgIcon>
  );
}

function CheckCircleIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <SvgIcon className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="m9 12 2 2 4-5" />
    </SvgIcon>
  );
}

function CheckSmallIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <SvgIcon className={className}>
      <path d="m5 12 4 4L19 6" />
    </SvgIcon>
  );
}

function CancelIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <SvgIcon className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="m15 9-6 6" />
      <path d="m9 9 6 6" />
    </SvgIcon>
  );
}

function CloseSmallIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <SvgIcon className={className}>
      <path d="m18 6-12 12" />
      <path d="m6 6 12 12" />
    </SvgIcon>
  );
}

function CalendarIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <SvgIcon className={className}>
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <path d="M3 10h18" />
      <rect x="3" y="4" width="18" height="18" rx="2" />
    </SvgIcon>
  );
}

function MinusIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <SvgIcon className={className}>
      <path d="M5 12h14" />
    </SvgIcon>
  );
}

function PlusIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <SvgIcon className={className}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </SvgIcon>
  );
}

function InfoIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <SvgIcon className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </SvgIcon>
  );
}

function VerifiedIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <SvgIcon className={className} fill="currentColor" stroke="currentColor">
      <path d="M12 2 9.9 4.2 7 3.7 6.1 6.5 3.3 7.4 3.8 10.3 1.6 12.4 3.8 14.5 3.3 17.4 6.1 18.3 7 21.1 9.9 20.6 12 22.8 14.1 20.6 17 21.1 17.9 18.3 20.7 17.4 20.2 14.5 22.4 12.4 20.2 10.3 20.7 7.4 17.9 6.5 17 3.7 14.1 4.2 12 2Z" />
      <path d="m8.5 12 2.2 2.2 4.8-5" fill="none" stroke="white" />
    </SvgIcon>
  );
}
