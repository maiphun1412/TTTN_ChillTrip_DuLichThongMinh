"use client";

import { useEffect, useState } from "react";
import HomeHeader from "../home/HomeHeader";

type FavoriteTour = {
  id: string;
  tourId: string;
  tourName: string;
  durationDays: number;
  durationNights: number;
  basePrice: string | number;
  shortDescription?: string | null;
  imageUrl?: string | null;
  destination?: {
    name?: string | null;
    country?: string | null;
    city?: string | null;
  } | null;
};

export default function FavoritesPage() {
  const [favoriteTours, setFavoriteTours] = useState<FavoriteTour[]>([]);
  const [loading, setLoading] = useState(true);

useEffect(() => {
  async function loadFavorites() {
    try {
      const token = localStorage.getItem("access_token");

      if (!token) {
        setFavoriteTours([]);
        setLoading(false);
        return;
      }

      const res = await fetch("/backend-api/favorites", {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        if (res.status === 401) {
          localStorage.removeItem("access_token");
        }
        console.warn("Load favorites failed:", json?.message || "Unknown error");
        setFavoriteTours([]);
        return;
      }

      setFavoriteTours(Array.isArray(json.data) ? json.data : []);
    } catch (error) {
      console.error("Load favorites error:", error);
      setFavoriteTours([]);
    } finally {
      setLoading(false);
    }
  }

  loadFavorites();
}, []);

  async function removeFavorite(tourId: string) {
  const token = localStorage.getItem("access_token");

  if (!token) {
    alert("Vui lòng đăng nhập");
    return;
  }

  const res = await fetch(`/backend-api/favorites/${tourId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const json = await res.json();

  if (!res.ok || !json.success) {
    alert(json.message || "Gỡ yêu thích thất bại");
    return;
  }

  setFavoriteTours((prev) =>
    prev.filter((item) => String(item.tourId) !== String(tourId))
  );
  window.dispatchEvent(new Event("favorites-changed"));
}

  return (
    <main className="min-h-screen bg-[#f6fafb] text-[#181c1d] antialiased">
      <HomeHeader />

      <div className="mx-auto max-w-7xl px-4 py-12 pt-28 md:px-6 md:py-16">
        <header className="mb-12">
          <h1 className="mb-3 text-4xl font-extrabold tracking-[-0.03em] text-[#181c1d] md:text-5xl">
            Tour Yêu Thích
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-[#3e494b]">
            Khám phá lại những hành trình mơ ước bạn đã lưu lại cho chuyến đi
            tiếp theo của mình.
          </p>
        </header>

        {loading ? (
          <div className="rounded-[24px] bg-white p-10 text-center font-bold text-[#00606c]">
            Đang tải danh sách yêu thích...
          </div>
        ) : favoriteTours.length === 0 ? (
          <div className="rounded-[24px] bg-white p-10 text-center font-bold text-[#00606c]">
            Bạn chưa lưu tour yêu thích nào.
          </div>
        ) : (
          <div className="space-y-6">
            {favoriteTours.map((tour) => (
              <article
                key={tour.id}
                className="group flex flex-col overflow-hidden rounded-[24px] border border-[#bdc8cb]/50 bg-white transition-all duration-300 hover:border-[#00606c]/30 hover:shadow-xl md:flex-row"
              >
                <div className="relative h-60 w-full shrink-0 overflow-hidden rounded-[16px] md:w-72">
                  <img
                    src={tour.imageUrl || "/images/tours/dalat-cover.jpg"}
                    alt={tour.tourName}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>

                <div className="flex flex-1 flex-col p-6 md:p-8">
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="mb-2 flex items-center gap-3">
                        <div className="flex items-center text-[#9b4500]">
                          <StarFilledIcon className="h-4 w-4" />
                          <span className="ml-1 text-sm font-bold">4.9</span>
                        </div>
                      </div>

                      <h2 className="text-2xl font-bold text-[#181c1d]">
                        {tour.tourName}
                      </h2>

                      <p className="mt-2 max-w-xl line-clamp-2 text-[#3e494b]">
                        {tour.shortDescription ||
                          "Thông tin tour đang được cập nhật."}
                      </p>
                    </div>

                    <div className="shrink-0 text-left md:text-right">
                      <span className="mb-1 block text-xs font-bold uppercase tracking-[0.16em] text-[#3e494b]">
                        Giá từ
                      </span>
                      <span className="text-2xl font-black text-[#00606c]">
                        {Number(tour.basePrice).toLocaleString("vi-VN")}đ
                      </span>
                    </div>
                  </div>

                  <div className="mt-auto flex flex-col items-center gap-4 border-t border-[#bdc8cb]/30 pt-6 sm:flex-row">
                    <div className="mr-auto flex items-center gap-6 text-sm font-medium text-[#3e494b]">
                      <span className="flex items-center gap-1.5">
                        <ClockIcon className="h-4 w-4" />
                        {tour.durationDays} Ngày {tour.durationNights} Đêm
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPinIcon className="h-4 w-4" />
                        {tour.destination?.name || "Đang cập nhật"}
                      </span>
                    </div>

                    <div className="flex w-full gap-3 sm:w-auto">
                      <button
                        onClick={() => removeFavorite(tour.tourId)}
                        className="flex-1 rounded-full border border-[#6e797b] px-6 py-2.5 text-sm font-semibold text-[#181c1d] transition-colors hover:bg-[#f1f4f5] sm:flex-none"
                      >
                        Gỡ bỏ
                      </button>

                      <a
                        href={`/booking?tourId=${tour.tourId}`}
                        className="rounded-full bg-[#0f766e] px-5 py-2 text-sm font-bold !text-white shadow-sm hover:bg-[#115e59]"
                      >
                        Đặt ngay
                      </a>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function StarFilledIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className ?? "h-5 w-5"}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="m12 17.27 6.18 3.73-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className ?? "h-5 w-5"}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 2" />
    </svg>
  );
}

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className ?? "h-5 w-5"}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 21s7-4.35 7-11a7 7 0 1 0-14 0c0 6.65 7 11 7 11Z"
      />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}