"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import GuideShell from "@/components/guide/GuideShell";
import {
  getGuideMeApi,
  getGuideTripsApi,
  type GuideMe,
  type GuideTrip,
} from "@/lib/api/guide.api";

function formatDate(value?: string | null) {
  if (!value) return "Đang cập nhật";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Đang cập nhật";

  return date.toLocaleDateString("vi-VN");
}

function formatTime(value?: string | null) {
  if (!value) return "Đang cập nhật";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Đang cập nhật";

  return date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTripId(trip: GuideTrip) {
  const id = trip.assignmentId;

  if (!id || String(id) === "0") return "";

  return String(id);
}

function todayStart() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function isRunningTrip(trip: GuideTrip) {
  const status = String(trip.operationStatus || "").toUpperCase();

  if (["PICKING_UP", "ON_TOUR", "IN_PROGRESS"].includes(status)) {
    return true;
  }

  const today = todayStart();
  const start = new Date(trip.startDate);
  const end = new Date(trip.endDate);

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return false;
  }

  return start <= today && end >= today;
}

function isUpcomingTrip(trip: GuideTrip) {
  const status = String(trip.operationStatus || "").toUpperCase();

  if (["COMPLETED", "CANCELLED"].includes(status)) return false;

  const today = todayStart();
  const start = new Date(trip.startDate);

  start.setHours(0, 0, 0, 0);

  if (Number.isNaN(start.getTime())) return false;

  return start > today;
}

function isCompletedTrip(trip: GuideTrip) {
  const status = String(trip.operationStatus || "").toUpperCase();

  if (status === "COMPLETED") return true;

  const today = todayStart();
  const end = new Date(trip.endDate);

  end.setHours(23, 59, 59, 999);

  if (Number.isNaN(end.getTime())) return false;

  return end < today;
}

function operationText(status?: string | null) {
  switch (String(status || "").toUpperCase()) {
    case "PREPARING":
      return "Đang chuẩn bị";
    case "CONFIRMED":
      return "Đã xác nhận";
    case "PICKING_UP":
      return "Đang đón khách";
    case "ON_TOUR":
    case "IN_PROGRESS":
      return "Đang đi tour";
    case "COMPLETED":
      return "Hoàn thành";
    case "CANCELLED":
      return "Đã hủy";
    default:
      return "Chưa cập nhật";
  }
}

function destinationText(trip?: GuideTrip | null) {
  if (!trip) return "";

  return [trip.destinationName, trip.destinationCity, trip.destinationCountry]
    .filter(Boolean)
    .join(" • ");
}

function getCurrentDayText(trip?: GuideTrip | null) {
  if (!trip) return "Chưa có chuyến";

  const start = new Date(trip.startDate);
  const today = todayStart();

  if (Number.isNaN(start.getTime())) {
    return `${trip.durationDays || 0} ngày`;
  }

  start.setHours(0, 0, 0, 0);

  const diff = Math.floor(
    (today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diff < 0) return "Sắp khởi hành";

  const currentDay = Math.min(diff + 1, Number(trip.durationDays || 1));

  return `Ngày ${currentDay} của ${trip.durationDays || currentDay}`;
}

function greetingText() {
  const hour = new Date().getHours();

  if (hour < 11) return "Chào buổi sáng";
  if (hour < 14) return "Chào buổi trưa";
  if (hour < 18) return "Chào buổi chiều";

  return "Chào buổi tối";
}

export default function GuideTripsPage() {
  const router = useRouter();

  const [guide, setGuide] = useState<GuideMe | null>(null);
  const [trips, setTrips] = useState<GuideTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setErrorMessage("");

      const [guideData, tripData] = await Promise.all([
        getGuideMeApi(),
        getGuideTripsApi(),
      ]);

      setGuide(guideData);
      setTrips(Array.isArray(tripData) ? tripData : []);
    } catch (error) {
      console.error("Load guide dashboard error:", error);

      setGuide(null);
      setTrips([]);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Không thể tải bảng điều khiển hướng dẫn viên"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const runningTrips = useMemo(() => trips.filter(isRunningTrip), [trips]);

  const upcomingTrips = useMemo(() => {
    return trips
      .filter(isUpcomingTrip)
      .sort(
        (a, b) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      );
  }, [trips]);

  const completedTrips = useMemo(() => trips.filter(isCompletedTrip), [trips]);

  const summary = useMemo(() => {
    const passengers = trips.reduce(
      (sum, trip) => sum + Number(trip.passengerCount || 0),
      0
    );

    const bookings = trips.reduce(
      (sum, trip) => sum + Number(trip.bookingCount || 0),
      0
    );

    return {
      completed: completedTrips.length,
      running: runningTrips.length,
      upcoming: upcomingTrips.length,
      passengers,
      bookings,
    };
  }, [trips, runningTrips.length, upcomingTrips.length, completedTrips.length]);

  const focusTrip = runningTrips[0] || upcomingTrips[0] || trips[0] || null;

  function openTripDetail(trip?: GuideTrip | null) {
    if (!trip) return;

    const id = getTripId(trip);

    if (!id) {
      alert("API chưa trả assignmentId cho chuyến này.");
      return;
    }

    router.push(`/guide/trips/${id}`);
  }

  return (
    <GuideShell guide={guide}>
      <section className="space-y-7 pb-24 xl:pb-0">
        <section>
          <h1 className="text-3xl font-black tracking-[-0.04em] text-[#00606c] md:text-4xl">
            {greetingText()}, {guide?.fullName || "hướng dẫn viên"}!
          </h1>

          <p className="mt-2 max-w-3xl text-[12px] font-semibold leading-7 text-[#3e494b]">
            Theo dõi nhanh các chuyến được phân công, số khách cần phục vụ và
            những việc quan trọng trước khi khởi hành.
          </p>
        </section>

        {loading ? (
          <StateBox text="Đang tải bảng điều khiển hướng dẫn viên..." />
        ) : errorMessage ? (
          <StateBox text={errorMessage} danger />
        ) : trips.length === 0 ? (
          <StateBox text="Bạn chưa được phân công chuyến đi nào." />
        ) : (
          <div className="grid grid-cols-12 gap-7">
            <div className="col-span-12 space-y-7 2xl:col-span-8">
              <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
                <KpiCard
                  icon={<TourIcon />}
                  label="Chuyến hoàn tất"
                  value={String(summary.completed)}
                  badge={`${summary.running} đang đi`}
                />

                <KpiCard
                  icon={<StarIcon />}
                  label="Booking phụ trách"
                  value={String(summary.bookings)}
                  sub={`${summary.upcoming} chuyến sắp khởi hành`}
                />

                <KpiCard
                  icon={<GroupIcon />}
                  label="Du khách phục vụ"
                  value={String(summary.passengers)}
                  sub="Tổng khách trong các chuyến được giao"
                />
              </section>

              <section>
                <h2 className="mb-5 px-1 text-xl font-black text-[#172124]">
                  Hành trình hôm nay
                </h2>

                <div className="overflow-hidden rounded-[32px] border border-[#dfe8ea] bg-white shadow-[0_16px_32px_rgba(0,96,108,0.08)]">
                  {focusTrip ? (
                    <div className="grid grid-cols-1 xl:grid-cols-[42%_1fr]">
                      <div className="relative min-h-[360px] overflow-hidden bg-[#e5e9ea]">
                        <img
                          src={
                            focusTrip.featuredImageUrl ||
                            "/images/tours/dalat-cover.jpg"
                          }
                          alt={focusTrip.tourName}
                          className="h-full w-full object-cover"
                        />

                        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />

                        <div className="absolute left-6 top-6 rounded-full bg-[#9defff] px-4 py-2 text-sm font-black text-[#001f24]">
                          {getCurrentDayText(focusTrip)}
                        </div>

                        <div className="absolute bottom-6 left-6 right-6">
                          <p className="text-xs font-black uppercase tracking-[0.18em] !text-[#9defff]">
                            {focusTrip.departureCode}
                          </p>

                          <p className="mt-2 text-sm font-bold !text-white/90">
                            {destinationText(focusTrip) ||
                              "Đang cập nhật điểm đến"}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-6 p-7 md:p-8">
                        <div>
                          <h3 className="text-2xl font-black leading-tight tracking-[-0.03em] text-[#00606c] md:text-3xl">
                            {focusTrip.tourName}
                          </h3>

                          <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold text-[#3e494b]">
                            <InfoPill
                              icon={<ClockIcon />}
                              text={`${formatDate(
                                focusTrip.startDate
                              )} - ${formatDate(focusTrip.endDate)}`}
                            />

                            <InfoPill
                              icon={<LocationIcon />}
                              text={
                                destinationText(focusTrip) ||
                                "Đang cập nhật địa điểm"
                              }
                            />
                          </div>
                        </div>

                        <div className="space-y-3">
                          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#6e797b]">
                            Mốc cần kiểm tra
                          </p>

                          <TimelineLine
                            active
                            time="Trước giờ đi"
                            title="Kiểm tra danh sách khách và booking"
                          />

                          <TimelineLine
                            active={isRunningTrip(focusTrip)}
                            time="Khi đón khách"
                            title="Xác nhận điểm đón và số khách thực tế"
                          />

                          <TimelineLine
                            time="Trong chuyến"
                            title="Cập nhật tình trạng tour nếu có thay đổi"
                          />
                        </div>

                        <div className="rounded-[24px] bg-[#f1f4f5] p-5">
                          <p className="mb-2 flex items-center gap-2 text-sm font-black text-[#ba1a1a]">
                            <AlertIcon />
                            Lưu ý đặc biệt
                          </p>

                          <ul className="list-inside list-disc space-y-1 text-sm font-semibold leading-6 text-[#3e494b]">
                            <li>
                              {focusTrip.passengerCount || 0} khách trong đoàn,
                              cần rà soát trước khi khởi hành.
                            </li>
                            <li>
                              {focusTrip.availableSeats || 0} ghế còn trống,
                              trạng thái booking:{" "}
                              {focusTrip.bookingStatus || "Đang cập nhật"}.
                            </li>
                            {focusTrip.assignmentNotes ? (
                              <li>{focusTrip.assignmentNotes}</li>
                            ) : null}
                          </ul>
                        </div>

                        <div className="flex flex-wrap gap-3 pt-1">
                          <button
                            type="button"
                            onClick={() => openTripDetail(focusTrip)}
                            className="flex items-center gap-2 rounded-full bg-[#00606c] px-7 py-3 text-sm font-black !text-white shadow-[0_16px_32px_rgba(0,96,108,0.18)] transition hover:scale-105 active:scale-95"
                          >
                            Cập nhật tình hình
                            <SyncIcon />
                          </button>

                          <button
                            type="button"
                            onClick={() => router.push("/guide/schedule")}
                            className="rounded-full bg-[#f1f4f5] px-7 py-3 text-sm font-black text-[#00606c] transition hover:bg-[#e5e9ea]"
                          >
                            Xem lịch trình
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-10 text-center font-black text-[#00606c]">
                      Chưa có hành trình để hiển thị.
                    </div>
                  )}
                </div>
              </section>
            </div>

            <aside className="col-span-12 space-y-7 2xl:col-span-4">
              <section className="rounded-[32px] border-l-4 border-[#ba1a1a] bg-white p-6 shadow-[0_16px_32px_rgba(0,96,108,0.08)]">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="text-lg font-black text-[#172124]">
                    Thông báo quan trọng
                  </h2>

                  <CampaignIcon />
                </div>

                <div className="space-y-4">
                  {runningTrips.length > 0 ? (
                    <NoticeBox
                      danger
                      title="Đang có tour diễn ra"
                      desc={`${runningTrips.length} chuyến đang trong thời gian vận hành. Cần kiểm tra trạng thái thường xuyên.`}
                    />
                  ) : (
                    <NoticeBox
                      title="Không có tour đang chạy"
                      desc="Hiện chưa có chuyến nào đang diễn ra trong ngày hôm nay."
                    />
                  )}

                  {upcomingTrips[0] ? (
                    <NoticeBox
                      title="Chuyến sắp khởi hành"
                      desc={`${upcomingTrips[0].tourName} bắt đầu ngày ${formatDate(
                        upcomingTrips[0].startDate
                      )}.`}
                    />
                  ) : (
                    <NoticeBox
                      title="Chưa có chuyến sắp đi"
                      desc="Không có chuyến sắp khởi hành trong danh sách phân công."
                    />
                  )}
                </div>
              </section>

              <section className="rounded-[32px] bg-white p-6 shadow-[0_16px_32px_rgba(0,96,108,0.08)]">
                <h2 className="mb-5 text-lg font-black text-[#172124]">
                  Hoạt động sắp tới
                </h2>

                {upcomingTrips.length === 0 ? (
                  <p className="rounded-2xl bg-[#f1f4f5] p-4 text-sm font-semibold text-[#6e797b]">
                    Chưa có hoạt động sắp tới.
                  </p>
                ) : (
                  <div className="relative space-y-6 before:absolute before:bottom-2 before:left-3 before:top-2 before:w-0.5 before:bg-[#ebeeef]">
                    {upcomingTrips.slice(0, 4).map((trip, index) => (
                      <UpcomingItem
                        key={getTripId(trip) || `${trip.departureId}-${index}`}
                        trip={trip}
                        active={index === 0}
                        onClick={() => openTripDetail(trip)}
                      />
                    ))}
                  </div>
                )}
              </section>

              <section className="relative overflow-hidden rounded-[32px] bg-[#00606c] p-6 text-white shadow-[0_16px_32px_rgba(0,96,108,0.12)]">
                <div className="relative z-10">
                  <h2 className="text-lg font-black !text-white">
                    Trung tâm trợ giúp
                  </h2>

                  <p className="mt-2 text-sm font-semibold leading-6 !text-white/85">
                    Cần hỗ trợ về vận hành hoặc tình huống khẩn cấp? Mở chi
                    tiết chuyến để báo cáo phát sinh.
                  </p>

                  <button
                    type="button"
                    onClick={() => openTripDetail(focusTrip)}
                    className="mt-6 w-full rounded-full bg-white py-3 text-sm font-black text-[#00606c] transition hover:bg-[#ddf9ff]"
                  >
                    Liên hệ hỗ trợ 24/7
                  </button>
                </div>

                <div className="absolute -bottom-12 -right-12 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
                <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-[#fc8a40]/20 blur-2xl" />
              </section>
            </aside>
          </div>
        )}

        {trips.length > 0 ? (
          <button
            type="button"
            onClick={() => openTripDetail(focusTrip)}
            className="fixed bottom-8 right-8 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-[#9b4500] text-white shadow-2xl transition hover:scale-110 active:scale-95"
            title="Báo cáo nhanh"
          >
            <CameraIcon />
          </button>
        ) : null}
      </section>
    </GuideShell>
  );
}

function KpiCard({
  icon,
  label,
  value,
  badge,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  badge?: string;
  sub?: string;
}) {
  return (
    <div className="group rounded-[32px] border border-[#dfe8ea]/70 bg-white p-6 shadow-[0_16px_32px_rgba(0,96,108,0.08)] transition hover:scale-[1.02]">
      <div className="mb-5 flex items-start justify-between">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#9defff] text-[#00606c]">
          {icon}
        </span>

        {badge ? (
          <span className="rounded-full bg-[#ffdbc9] px-3 py-1 text-xs font-black text-[#763300]">
            {badge}
          </span>
        ) : null}

        {sub ? (
          <span className="max-w-[140px] text-right text-xs font-bold leading-5 text-[#6e797b]">
            {sub}
          </span>
        ) : null}
      </div>

      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6e797b]">
        {label}
      </p>

      <h3 className="mt-2 text-4xl font-black text-[#172124]">{value}</h3>
    </div>
  );
}

function InfoPill({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 text-[#3e494b]">
      <span className="text-[#00606c]">{icon}</span>
      <span>{text}</span>
    </div>
  );
}

function TimelineLine({
  time,
  title,
  active = false,
}: {
  time: string;
  title: string;
  active?: boolean;
}) {
  return (
    <div
      className={`ml-2 flex items-center gap-4 border-l-2 py-1 pl-4 text-sm ${
        active ? "border-[#9defff]" : "border-[#bdc8cb]/40 opacity-60"
      }`}
    >
      <span className={active ? "font-black text-[#00606c]" : "font-bold"}>
        {time}
      </span>
      <span className="font-semibold text-[#172124]">{title}</span>
    </div>
  );
}

function NoticeBox({
  title,
  desc,
  danger = false,
}: {
  title: string;
  desc: string;
  danger?: boolean;
}) {
  return (
    <div
      className={
        danger
          ? "rounded-[20px] bg-[#ffdad6]/50 p-4"
          : "rounded-[20px] bg-[#f1f4f5] p-4"
      }
    >
      <p
        className={
          danger
            ? "text-sm font-black text-[#93000a]"
            : "text-sm font-black text-[#172124]"
        }
      >
        {title}
      </p>

      <p className="mt-1 text-sm font-semibold leading-6 text-[#3e494b]">
        {desc}
      </p>
    </div>
  );
}

function UpcomingItem({
  trip,
  active,
  onClick,
}: {
  trip: GuideTrip;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={active ? "relative block w-full pl-10 text-left" : "relative block w-full pl-10 text-left opacity-70"}
    >
      <div
        className={
          active
            ? "absolute left-0 top-1 h-6 w-6 rounded-full border-4 border-white bg-[#007b8a]"
            : "absolute left-0 top-1 h-6 w-6 rounded-full border-4 border-white bg-[#dfe3e4]"
        }
      />

      <p
        className={
          active
            ? "text-xs font-black text-[#00606c]"
            : "text-xs font-black text-[#6e797b]"
        }
      >
        {formatDate(trip.startDate)}
      </p>

      <p className="mt-1 line-clamp-1 text-sm font-black text-[#172124]">
        {trip.tourName}
      </p>

      <p className="mt-1 text-xs font-semibold text-[#6e797b]">
        Khởi hành: {formatTime(trip.startDate)}
      </p>
    </button>
  );
}

function StateBox({ text, danger = false }: { text: string; danger?: boolean }) {
  return (
    <div className="rounded-[32px] border border-[#dfe8ea] bg-white p-10 text-center shadow-sm">
      <p
        className={
          danger ? "text-lg font-black text-red-600" : "text-lg font-black text-[#00606c]"
        }
      >
        {text}
      </p>
    </div>
  );
}

function TourIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 7V5a3 3 0 0 1 6 0v2M4 12h16" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="m12 17.27 6.18 3.73-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
  );
}

function GroupIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9.5 11A3.5 3.5 0 1 0 9.5 4a3.5 3.5 0 0 0 0 7ZM20 8v6M17 11h6" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4M12 17h.01M10.3 4.3 2.7 17.5A2 2 0 0 0 4.4 20h15.2a2 2 0 0 0 1.7-2.5L13.7 4.3a2 2 0 0 0-3.4 0Z" />
    </svg>
  );
}

function SyncIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v6h6M20 20v-6h-6M20 9a8 8 0 0 0-13.7-4.9L4 6M4 15a8 8 0 0 0 13.7 4.9L20 18" />
    </svg>
  );
}

function CampaignIcon() {
  return (
    <svg className="h-6 w-6 text-[#ba1a1a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 11v2a2 2 0 0 0 2 2h2l5 4V5L8 9H6a2 2 0 0 0-2 2ZM16 9a3 3 0 0 1 0 6M19 7a6 6 0 0 1 0 10" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h4l2-2h4l2 2h4v12H4V7Z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}