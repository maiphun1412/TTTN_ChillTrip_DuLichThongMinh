"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { TravelPlace } from "@/lib/travel-places.api";

type MapMode = "vietnam" | "world";

const TravelLeafletMap = dynamic(
  () => import("@/components/profile/TravelLeafletMap"),
  {
    ssr: false,
  }
);

type Props = {
  places: TravelPlace[];
  total: number;
  loading?: boolean;
  avatarUrl?: string | null;
};

export default function TravelMapSection({
  places,
  total,
  loading,
  avatarUrl,
}: Props) {
  const [tab, setTab] = useState<MapMode>("vietnam");

  const filteredPlaces = useMemo(() => {
    if (tab === "vietnam") {
      return places.filter((place) => place.country === "Việt Nam");
    }

    return places;
  }, [places, tab]);

  return (
    <section className="overflow-hidden rounded-[3rem] bg-white shadow-sm shadow-cyan-900/5">
      <div className="bg-gradient-to-r from-[#00606c] to-[#00a5b8] px-6 py-8 text-white md:px-10">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[12px] font-extrabold uppercase tracking-[0.2em] text-white/75">
              Travel Map
            </p>

            <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.03em] md:text-3xl">
              Bản đồ đã đi
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/80">
              Các điểm đến bạn đã hoàn thành sẽ được đánh dấu trực tiếp trên bản
              đồ.
            </p>
          </div>

          <div className="rounded-[2rem] bg-white/15 px-6 py-4 backdrop-blur">
            <p className="text-sm text-white/75">Đã khám phá</p>
            <p className="mt-1 text-3xl font-black">{total}</p>
            <p className="text-sm text-white/75">điểm đến</p>
          </div>
        </div>
      </div>

      <div className="p-6 md:p-10">
        <div className="mb-5 inline-flex rounded-full bg-[#eef6f7] p-1">
          <button
            type="button"
            onClick={() => setTab("vietnam")}
            className={`rounded-full px-5 py-2 text-sm font-extrabold transition ${
              tab === "vietnam"
                ? "bg-[#00606c] text-white shadow"
                : "text-[#00606c]"
            }`}
          >
            Bản đồ Việt Nam
          </button>

          <button
            type="button"
            onClick={() => setTab("world")}
            className={`rounded-full px-5 py-2 text-sm font-extrabold transition ${
              tab === "world"
                ? "bg-[#00606c] text-white shadow"
                : "text-[#00606c]"
            }`}
          >
            Bản đồ thế giới
          </button>
        </div>

        {loading ? (
          <div className="rounded-[2rem] border border-dashed border-slate-200 bg-[#f6fafb] p-8 text-center text-sm font-semibold text-slate-500">
            Đang tải bản đồ đã đi...
          </div>
        ) : places.length > 0 ? (
          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="overflow-hidden rounded-[2.5rem] border border-slate-100 bg-[#f6fafb]">
              <TravelLeafletMap
                {...({
                  mode: tab,
                  places: filteredPlaces,
                  avatarUrl: avatarUrl || undefined,
                } as any)}
              />
            </div>

            <div className="space-y-3">
              {filteredPlaces.length > 0 ? (
                filteredPlaces.map((place) => (
                  <article
                    key={place.id}
                    className="rounded-[2rem] border border-slate-100 bg-[#f6fafb] p-5"
                  >
                    <h3 className="text-base font-extrabold text-slate-900">
                      {place.destinationName}
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      {[place.city, place.country].filter(Boolean).join(", ")}
                    </p>

                    <div className="mt-3 inline-flex rounded-full bg-[#e6fafc] px-4 py-2 text-xs font-extrabold uppercase tracking-[0.12em] text-[#00606c]">
                      Đã hoàn thành
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-[2rem] border border-dashed border-slate-200 bg-[#f6fafb] p-6 text-sm font-semibold text-slate-500">
                  Chưa có điểm đến nào trong tab này.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-[2rem] border border-dashed border-slate-200 bg-[#f6fafb] p-8 text-center">
            <h3 className="text-lg font-extrabold text-slate-900">
              Chưa có điểm đến nào được ghi nhận
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Sau khi hoàn thành một tour, điểm đến sẽ tự động xuất hiện trên
              bản đồ cá nhân.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}