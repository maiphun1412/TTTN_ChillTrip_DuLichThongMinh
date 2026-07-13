"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import GuideShell from "@/components/guide/GuideShell";
import {
  createGuideScheduleNoteApi,
  getGuideMeApi,
  getGuideScheduleApi,
  type GuideMe,
  type GuideScheduleDay,
  type GuideScheduleTrip,
} from "@/lib/api/guide.api";

type FilterKey = "ALL" | "TODAY" | "UPCOMING" | "ACTIVE";

function formatDate(value?: string | null) {
  if (!value) return "Đang cập nhật";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Đang cập nhật";

  return date.toLocaleDateString("vi-VN");
}

function isTodayInTrip(trip: GuideScheduleTrip) {
  const today = new Date();
  const start = new Date(trip.startDate);
  const end = new Date(trip.endDate);

  today.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return start <= today && end >= today;
}

function isUpcoming(trip: GuideScheduleTrip) {
  const today = new Date();
  const start = new Date(trip.startDate);

  today.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);

  return start > today;
}

function destinationText(trip: GuideScheduleTrip) {
  return [trip.destinationName, trip.destinationCity, trip.destinationCountry]
    .filter(Boolean)
    .join(" • ");
}

export default function GuideSchedulePage() {
    const router = useRouter();
  const [guide, setGuide] = useState<GuideMe | null>(null);
  const [trips, setTrips] = useState<GuideScheduleTrip[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [activeDayId, setActiveDayId] = useState("");
  const [filter, setFilter] = useState<FilterKey>("ALL");
  const [keyword, setKeyword] = useState("");
  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setErrorMessage("");

      const [guideData, scheduleData] = await Promise.all([
        getGuideMeApi(),
        getGuideScheduleApi(),
      ]);

      setGuide(guideData);
      setTrips(scheduleData);

      const firstTrip = scheduleData[0];

      if (firstTrip) {
        setSelectedId((prev) => prev || firstTrip.assignmentId);
        setActiveDayId((prev) => prev || firstTrip.itineraryDays[0]?.id || "");
      }
    } catch (error) {
      setGuide(null);
      setTrips([]);
      setErrorMessage(
        error instanceof Error ? error.message : "Không thể tải lịch trình"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredTrips = useMemo(() => {
    const search = keyword.trim().toLowerCase();
    

    return trips.filter((trip) => {
      if (filter === "TODAY" && !isTodayInTrip(trip)) return false;
      if (filter === "UPCOMING" && !isUpcoming(trip)) return false;
      if (filter === "ACTIVE" && trip.operationStatus === "COMPLETED") {
        return false;
      }

      if (!search) return true;

      const text = [
        trip.tourName,
        trip.tourCode,
        trip.departureCode,
        trip.destinationName,
        trip.destinationCity,
        trip.destinationCountry,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return text.includes(search);
    });
  }, [trips, filter, keyword]);

  const selectedTrip =
    filteredTrips.find((trip) => trip.assignmentId === selectedId) ||
    filteredTrips[0] ||
    null;

  const activeDay =
    selectedTrip?.itineraryDays.find((day) => day.id === activeDayId) ||
    selectedTrip?.itineraryDays[0] ||
    null;

  const summary = useMemo(() => {
    const totalDays = trips.reduce(
      (sum, trip) => sum + trip.itineraryDays.length,
      0
    );

    const totalActivities = trips.reduce(
      (sum, trip) =>
        sum +
        trip.itineraryDays.reduce(
          (daySum, day) => daySum + day.activities.length,
          0
        ),
      0
    );

    return {
      trips: trips.length,
      today: trips.filter(isTodayInTrip).length,
      days: totalDays,
      activities: totalActivities,
    };
  }, [trips]);

  async function handleSaveNote() {
    if (!selectedTrip || !activeDay) return;

    try {
      setSavingNote(true);

      await createGuideScheduleNoteApi({
        departureId: selectedTrip.departureId,
        dayNo: activeDay.dayNo,
        content: note.trim(),
      });

      setNote("");
      alert("Đã lưu ghi chú lịch trình.");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Không thể lưu ghi chú.");
    } finally {
      setSavingNote(false);
    }
  }
   function handleOpenTripDetail() {
    if (!selectedTrip?.assignmentId) {
      alert("Không tìm thấy ID phân công của chuyến này.");
      return;
    }

    router.push(`/guide/trips/${selectedTrip.assignmentId}`);
    <button
  type="button"
  onClick={() =>
    router.push(`/guide/reports?assignmentId=${selectedTrip.assignmentId}`)
  }
  className="rounded-full bg-[#9b4500] px-6 py-3 text-sm font-black !text-white"
>
  Viết báo cáo sau chuyến
</button>
  }

  return (
    <GuideShell guide={guide}>
      <section className="space-y-7 pb-24 xl:pb-0">
        <section className="rounded-[34px] bg-white p-7 shadow-sm md:p-8">
          <div className="grid grid-cols-1 gap-7 xl:grid-cols-[1fr_430px]">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#9b4500]">
                Guide Schedule
              </p>

              <h1 className="mt-3 text-2xl font-black tracking-[-0.04em] text-[#00606c] md:text-4xl">
                Lịch trình dẫn đoàn
              </h1>

              <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-[#6e797b] md:text-base">
                Theo dõi từng ngày trong hành trình, xem hoạt động theo giờ và
                ghi chú nhanh những điểm cần lưu ý khi dẫn đoàn.
              </p>

              <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatCard label="Tour" value={String(summary.trips)} />
                <StatCard label="Hôm nay" value={String(summary.today)} />
                <StatCard label="Số ngày" value={String(summary.days)} />
                <StatCard label="Hoạt động" value={String(summary.activities)} />
              </div>
            </div>

            <div className="rounded-[30px] bg-[#00606c] p-6 text-white">
              <p className="text-xs font-black uppercase tracking-[0.22em] !text-[#9defff]">
                Trọng tâm lịch trình
              </p>

              <h2 className="mt-4 text-2xl font-black !text-white">
                {selectedTrip?.tourName || "Chưa có tour"}
              </h2>

              <p className="mt-3 text-sm font-semibold leading-6 !text-white/75">
                {selectedTrip
                  ? `${formatDate(selectedTrip.startDate)} - ${formatDate(
                      selectedTrip.endDate
                    )}`
                  : "Chưa có lịch trình để hiển thị."}
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <DarkMetric
                  label="Ngày"
                  value={String(selectedTrip?.itineraryDays.length || 0)}
                />
                <DarkMetric
                  label="Khách"
                  value={String(selectedTrip?.passengerCount || 0)}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[30px] border border-[#dfe8ea] bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              <FilterButton active={filter === "ALL"} onClick={() => setFilter("ALL")}>
                Tất cả
              </FilterButton>

              <FilterButton
                active={filter === "TODAY"}
                onClick={() => setFilter("TODAY")}
              >
                Hôm nay
              </FilterButton>

              <FilterButton
                active={filter === "UPCOMING"}
                onClick={() => setFilter("UPCOMING")}
              >
                Sắp khởi hành
              </FilterButton>

              <FilterButton
                active={filter === "ACTIVE"}
                onClick={() => setFilter("ACTIVE")}
              >
                Đang theo dõi
              </FilterButton>
            </div>

            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Tìm theo tour, mã tour, điểm đến..."
              className="w-full rounded-full border border-[#dfe8ea] bg-[#f7fbfc] px-5 py-3 text-sm font-semibold outline-none focus:border-[#00606c] xl:w-[360px]"
            />
          </div>
        </section>

        {loading ? (
          <EmptyBox text="Đang tải lịch trình..." />
        ) : errorMessage ? (
          <EmptyBox text={errorMessage} danger />
        ) : filteredTrips.length === 0 ? (
          <EmptyBox text="Không có lịch trình phù hợp." />
        ) : (
          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[390px_1fr]">
            <aside className="space-y-4">
              {filteredTrips.map((trip) => (
                <button
                  key={trip.assignmentId}
                  type="button"
                  onClick={() => {
                    setSelectedId(trip.assignmentId);
                    setActiveDayId(trip.itineraryDays[0]?.id || "");
                    setNote("");
                  }}
                  className={`w-full rounded-[28px] border p-4 text-left transition ${
                    selectedTrip?.assignmentId === trip.assignmentId
                      ? "border-[#00606c] bg-[#effbfc] shadow-md"
                      : "border-[#dfe8ea] bg-white hover:bg-[#f7fbfc]"
                  }`}
                >
                  <div className="flex gap-4">
                    <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-[22px] bg-[#e5e9ea]">
                      <img
                        src={
                          trip.featuredImageUrl || "/images/tours/dalat-cover.jpg"
                        }
                        alt={trip.tourName}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#9b4500]">
                        {trip.departureCode}
                      </p>

                      <h3 className="mt-1 line-clamp-2 text-base font-black text-[#172124]">
                        {trip.tourName}
                      </h3>

                      <p className="mt-2 text-xs font-semibold text-[#6e797b]">
                        {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
                      </p>

                      <p className="mt-1 line-clamp-1 text-xs font-semibold text-[#6e797b]">
                        {destinationText(trip) || "Đang cập nhật điểm đến"}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </aside>

            <main className="rounded-[34px] border border-[#dfe8ea] bg-white p-6 shadow-sm md:p-7">
              {!selectedTrip ? (
                <EmptyBox text="Chọn một tour để xem lịch trình." />
              ) : (
                <div className="space-y-7">
                  <section className="overflow-hidden rounded-[28px] bg-[#f7fbfc]">
                    <div className="relative h-56 overflow-hidden">
                      <img
                        src={
                          selectedTrip.featuredImageUrl ||
                          "/images/tours/dalat-cover.jpg"
                        }
                        alt={selectedTrip.tourName}
                        className="h-full w-full object-cover"
                      />

                      <div className="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent" />

                      <div className="absolute bottom-5 left-5 right-5">
                        <p className="text-xs font-black uppercase tracking-[0.18em] !text-[#9defff]">
                          {selectedTrip.tourCode}
                        </p>

                        <h2 className="mt-2 text-2xl font-black !text-white md:text-3xl">
                          {selectedTrip.tourName}
                        </h2>

                        <p className="mt-2 text-sm font-semibold !text-white/80">
                          {formatDate(selectedTrip.startDate)} -{" "}
                          {formatDate(selectedTrip.endDate)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-4">
                      <InfoBox label="Số ngày" value={`${selectedTrip.durationDays}N`} />
                      <InfoBox label="Số đêm" value={`${selectedTrip.durationNights}Đ`} />
                      <InfoBox label="Khách" value={String(selectedTrip.passengerCount)} />
                      <InfoBox label="Booking" value={String(selectedTrip.bookingCount)} />
                    </div>

                    
                  </section>

                  <section>
                    <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
  <div className="flex flex-wrap gap-2">
    {selectedTrip.itineraryDays.map((day) => (
      <button
        key={day.id}
        type="button"
        onClick={() => {
          setActiveDayId(day.id);
          setNote("");
        }}
        className={
          activeDay?.id === day.id
            ? "rounded-full bg-[#00606c] px-5 py-3 text-sm font-black !text-white"
            : "rounded-full bg-[#f1f4f5] px-5 py-3 text-sm font-black text-[#3e494b] hover:bg-[#e5e9ea]"
        }
      >
        Ngày {day.dayNo}
      </button>
    ))}
  </div>

  <button
    type="button"
    onClick={handleOpenTripDetail}
    className="w-fit rounded-full bg-[#00606c] px-6 py-3 text-sm font-black !text-white shadow-[0_12px_24px_rgba(0,96,108,0.18)] transition hover:bg-[#007b8a] active:scale-95"
  >
    Xem chi tiết tour
  </button>
</div>

                    {activeDay ? (
                      <DayTimeline day={activeDay} />
                    ) : (
                      <EmptyBox text="Tour này chưa có lịch trình ngày." />
                    )}
                  </section>

                  {activeDay ? (
                    <section className="rounded-[28px] bg-[#fff7ed] p-5">
                      <h3 className="text-lg font-black text-[#9b4500]">
                        Ghi chú cho ngày {activeDay.dayNo}
                      </h3>

                      <p className="mt-2 text-sm font-semibold text-[#6e797b]">
                        Dùng để lưu các lưu ý thực tế như trễ giờ, đổi điểm tham
                        quan, khách có yêu cầu đặc biệt.
                      </p>

                      <textarea
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        rows={4}
                        placeholder="Nhập ghi chú lịch trình..."
                        className="mt-4 w-full rounded-[20px] border border-[#f4d0aa] bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-[#9b4500]"
                      />

                      <button
                        type="button"
                        onClick={handleSaveNote}
                        disabled={savingNote || !note.trim()}
                        className="mt-4 rounded-full bg-[#9b4500] px-7 py-3 text-sm font-black !text-white disabled:cursor-not-allowed disabled:bg-gray-300"
                      >
                        {savingNote ? "Đang lưu..." : "Lưu ghi chú"}
                      </button>
                    </section>
                  ) : null}
                </div>
              )}
            </main>
          </section>
        )}
      </section>
    </GuideShell>
  );
}

function DayTimeline({ day }: { day: GuideScheduleDay }) {
  return (
    <section className="rounded-[28px] bg-[#f7fbfc] p-6">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#9b4500]">
        Ngày {day.dayNo}
      </p>

      <h2 className="mt-2 text-2xl font-black text-[#172124]">
        {day.title || `Ngày ${day.dayNo}`}
      </h2>

      {day.description ? (
        <p className="mt-3 whitespace-pre-line text-sm font-semibold leading-7 text-[#6e797b]">
          {day.description}
        </p>
      ) : null}

      {day.overnightLocation ? (
        <p className="mt-3 rounded-full bg-white px-4 py-2 text-sm font-black text-[#00606c]">
          Nghỉ đêm: {day.overnightLocation}
        </p>
      ) : null}

      <div className="relative mt-7 space-y-5 before:absolute before:bottom-2 before:left-5 before:top-2 before:w-0.5 before:bg-[#cfe7eb]">
        {day.activities.length === 0 ? (
          <p className="rounded-2xl bg-white p-4 text-sm font-bold text-[#6e797b]">
            Chưa có hoạt động chi tiết.
          </p>
        ) : (
          day.activities.map((activity, index) => (
            <div key={activity.id} className="relative pl-14">
              <div className="absolute left-0 top-1 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-[#00606c] text-sm font-black !text-white">
                {index + 1}
              </div>

              <div className="rounded-[22px] bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[#9b4500]">
                      {activity.activityTime || "Chưa có giờ"}
                    </p>

                    <h3 className="mt-1 text-lg font-black text-[#172124]">
                      {activity.activityTitle || "Hoạt động"}
                    </h3>
                  </div>

                  {activity.locationName ? (
                    <span className="w-fit rounded-full bg-[#ddf9ff] px-3 py-1 text-xs font-black text-[#00606c]">
                      {activity.locationName}
                    </span>
                  ) : null}
                </div>

                {activity.description ? (
                  <p className="mt-3 text-sm font-semibold leading-7 text-[#6e797b]">
                    {activity.description}
                  </p>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] bg-[#f7fbfc] p-5">
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#91a0a4]">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black text-[#00606c]">{value}</p>
    </div>
  );
}

function DarkMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] bg-white/12 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] !text-white/60">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black !text-white">{value}</p>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] bg-white p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#91a0a4]">
        {label}
      </p>
      <p className="mt-1 text-base font-black text-[#172124]">{value}</p>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-full bg-[#00606c] px-6 py-3 text-sm font-black !text-white"
          : "rounded-full bg-[#f1f4f5] px-6 py-3 text-sm font-bold text-[#3e494b] hover:bg-[#e5e9ea]"
      }
    >
      {children}
    </button>
  );
}

function EmptyBox({ text, danger = false }: { text: string; danger?: boolean }) {
  return (
    <div className="rounded-[28px] border border-[#dfe8ea] bg-white p-10 text-center shadow-sm">
      <p className={danger ? "font-black text-red-600" : "font-black text-[#00606c]"}>
        {text}
      </p>
    </div>
  );
}