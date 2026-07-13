"use client";

import { useEffect, useMemo, useState } from "react";
import HomeHeader from "@/components/home/HomeHeader";
import { HomeFooter } from "@/components/home/HomeSections";
import { useSearchParams } from "next/navigation";

type ApiTour = {
  id: string;
  tourName: string;
  durationDays: number;
  durationNights: number;
  basePrice: string | number;
  imageUrl?: string | null;
  destination?: {
    name?: string | null;
    country?: string | null;
  } | null;
};

const themeChips = [
  { id: "3", title: "Tour Gia đình", icon: "family_restroom" },
  { id: "6", title: "Khám phá mạo hiểm", icon: "hiking" },
  { id: "1", title: "Du lịch nghỉ dưỡng", icon: "spa" },
  { id: "4", title: "Tour quốc tế", icon: "public" },
  { id: "5", title: "Mua sắm", icon: "shopping_bag" },
  { id: "2", title: "Biển đảo", icon: "beach_access" },
];

export default function ThemeToursPage() {
  const searchParams = useSearchParams();
  const tagId = searchParams.get("tagId") || "";
  const title = searchParams.get("title") || "Tour theo chủ đề";

  const [activeTagId, setActiveTagId] = useState(tagId);
  const [tours, setTours] = useState<ApiTour[]>([]);
  const [loading, setLoading] = useState(true);

  const activeTitle = useMemo(() => {
    return (
      themeChips.find((item) => item.id === activeTagId)?.title ||
      title ||
      "Tour theo chủ đề"
    );
  }, [activeTagId, title]);

  useEffect(() => {
    async function loadTours() {
      try {
        setLoading(true);

        const url = activeTagId
          ? `/backend-api/tours?tagId=${activeTagId}`
          : "/backend-api/tours";

        const res = await fetch(url, { cache: "no-store" });
        const json = await res.json();

        setTours(Array.isArray(json.data) ? json.data : []);
      } catch (error) {
        console.error("Load theme tours error:", error);
        setTours([]);
      } finally {
        setLoading(false);
      }
    }

    loadTours();
  }, [activeTagId]);

  return (
    <main className="min-h-screen bg-[#f9f9fc] text-[#2f3337]">
      <HomeHeader />

      <div className="mx-auto max-w-7xl px-6 pb-24 pt-28">
        <section className="relative mb-12 h-[380px] overflow-hidden rounded-[3rem]">
          <img
            src="https://cafefcdn.com/203337114487263232/2022/8/31/photo-32-16619513558121898374048.jpeg"
            alt="Khám phá tour theo chủ đề"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />

          <div className="absolute bottom-12 left-1/2 w-full max-w-3xl -translate-x-1/2 px-6 text-center">
            <h1 className="mb-4 text-4xl font-extrabold tracking-[-0.03em] text-white md:text-6xl">
              {activeTitle}
            </h1>
            <p className="mx-auto max-w-2xl text-base leading-7 text-white/90">
              Tìm thấy hành trình phù hợp với phong cách du lịch của bạn.
            </p>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 text-2xl font-extrabold text-[#181c1d]">
            Chọn cảm hứng cho chuyến đi
          </h2>

          <div className="flex gap-4 overflow-x-auto pb-3">
            {themeChips.map((item) => {
              const active = String(activeTagId) === String(item.id);

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTagId(item.id)}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-full px-6 py-3 text-sm font-bold transition ${
                    active
                      ? "bg-[#00606c] text-white"
                      : "bg-white text-[#5c5f64] hover:bg-[#e6e8ec]"
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {item.icon}
                  </span>
                  {item.title}
                </button>
              );
            })}
          </div>
        </section>

        {loading ? (
          <div className="rounded-[2rem] bg-white p-10 text-center font-bold text-[#00606c]">
            Đang tải danh sách tour...
          </div>
        ) : tours.length === 0 ? (
          <div className="rounded-[2rem] bg-white p-10 text-center font-bold text-[#00606c]">
            Chưa có tour nào trong chủ đề này.
          </div>
        ) : (
          <section className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {tours.map((tour) => (
              <article
                key={tour.id}
                className="group flex flex-col overflow-hidden rounded-[2rem] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.07)] transition-all hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="relative m-2 h-72 overflow-hidden rounded-[1.75rem]">
                  <img
                    src={tour.imageUrl || "/images/tours/dalat-cover.jpg"}
                    alt={tour.tourName}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />

                  <div className="absolute left-4 top-4 rounded-full bg-white/90 px-4 py-1.5 text-sm font-bold text-[#00606c] backdrop-blur-md">
                    {activeTitle}
                  </div>
                </div>

                <div className="flex flex-grow flex-col p-6">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-[#fc8a40]">★</span>
                    <span className="text-sm font-bold">4.9</span>
                  </div>

                  <h3 className="mb-2 text-xl font-extrabold leading-snug text-[#181c1d]">
                    {tour.tourName}
                  </h3>

                  <p className="mb-2 text-sm text-[#5c5f64]">
                    {tour.destination?.name || "Đang cập nhật"}
                    {tour.destination?.country
                      ? `, ${tour.destination.country}`
                      : ""}
                  </p>

                  <p className="mb-6 text-sm text-[#5c5f64]">
                    {tour.durationDays} ngày {tour.durationNights} đêm
                  </p>

                  <div className="mt-auto flex items-end justify-between">
                    <div>
                      <span className="block text-xs font-bold uppercase tracking-widest text-[#777b7f]">
                        Giá từ
                      </span>
                      <span className="text-2xl font-black text-[#00606c]">
                        {Number(tour.basePrice).toLocaleString("vi-VN")}đ
                      </span>
                    </div>

                    <a
                      href={`/tours/${tour.id}`}
                      className="flex h-12 w-12 items-center justify-center rounded-full bg-[#5bd8fe] text-[#00485a] transition hover:bg-[#00606c] hover:text-white"
                    >
                      →
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>

      <HomeFooter />
    </main>
  );
}