"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import GuideShell from "@/components/guide/GuideShell";
import {
  getGuideMeApi,
  getGuideTripsApi,
  uploadGuideAvatarApi,
  type GuideMe,
  type GuideTrip,
} from "@/lib/api/guide.api";

const COVER_IMAGE =
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1800&auto=format&fit=crop";

function splitList(value?: string | null) {
  if (!value) return [];

  return value
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getInitials(name?: string | null) {
  if (!name) return "HDV";

  return name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function isCompletedTrip(trip: GuideTrip) {
  const status = String(trip.operationStatus || "").toUpperCase();

  if (status === "COMPLETED") return true;

  const endDate = new Date(trip.endDate);
  endDate.setHours(23, 59, 59, 999);

  return !Number.isNaN(endDate.getTime()) && endDate.getTime() < Date.now();
}

export default function GuideProfilePage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [guide, setGuide] = useState<GuideMe | null>(null);
  const [trips, setTrips] = useState<GuideTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setErrorMessage("");

      const [guideData, tripsData] = await Promise.all([
        getGuideMeApi(),
        getGuideTripsApi(),
      ]);

      setGuide(guideData);
      setTrips(Array.isArray(tripsData) ? tripsData : []);
    } catch (error) {
      setGuide(null);
      setTrips([]);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Không thể tải hồ sơ hướng dẫn viên"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const languages = useMemo(() => {
    const items = splitList(guide?.languages);
    return items.length > 0 ? items : [];
  }, [guide?.languages]);

  const regions = useMemo(() => {
    const items = splitList(guide?.region);
    return items.length > 0 ? items : [];
  }, [guide?.region]);

  const summary = useMemo(() => {
    const totalTrips = trips.length;
    const completedTrips = trips.filter(isCompletedTrip).length;

    const totalBookings = trips.reduce(
      (sum, trip) => sum + Number(trip.bookingCount || 0),
      0
    );

    const totalPassengers = trips.reduce(
      (sum, trip) => sum + Number(trip.passengerCount || 0),
      0
    );

    return {
      totalTrips,
      completedTrips,
      totalBookings,
      totalPassengers,
    };
  }, [trips]);

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Vui lòng chọn file hình ảnh.");
      return;
    }

    try {
      setUploadingAvatar(true);

      const result = await uploadGuideAvatarApi(file);

      setGuide((prev) =>
        prev
          ? {
              ...prev,
              avatarUrl: result.avatarUrl,
            }
          : prev
      );

      alert("Đã cập nhật ảnh đại diện.");
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Không thể cập nhật ảnh đại diện"
      );
    } finally {
      setUploadingAvatar(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  if (loading) {
    return (
      <GuideShell guide={guide}>
        <StateBox text="Đang tải hồ sơ hướng dẫn viên..." />
      </GuideShell>
    );
  }

  if (errorMessage) {
    return (
      <GuideShell guide={guide}>
        <StateBox text={errorMessage} danger />
      </GuideShell>
    );
  }

  return (
    <GuideShell guide={guide}>
      <section className="space-y-5 pb-24 xl:pb-0">
        <section className="relative overflow-hidden rounded-[26px] bg-[#00606c] shadow-[0_14px_30px_rgba(0,96,108,0.14)]">
          <div className="relative min-h-[150px] p-5 md:p-6">
            <img
              src={COVER_IMAGE}
              alt="Guide profile cover"
              className="absolute inset-0 h-full w-full object-cover opacity-40"
            />

            <div className="absolute inset-0 bg-gradient-to-r from-[#003f46] via-[#00606c]/80 to-[#00606c]/35" />

            <div className="relative z-10 max-w-2xl">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] !text-[#9defff]">
                Hồ sơ hướng dẫn viên
              </p>

              <h1 className="mt-3 text-[22px] font-black leading-[1.15] tracking-[-0.03em] !text-white md:text-[28px]">
                Thông tin cá nhân & năng lực dẫn đoàn
              </h1>

              <p className="mt-3 max-w-xl text-[12px] font-medium leading-5 !text-white/85">
                Thông tin được lấy theo tài khoản hướng dẫn viên và dữ liệu tour
                được phân công trong hệ thống.
              </p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
          <div className="space-y-5">
            <section className="rounded-[26px] border border-[#dfe8ea] bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-[118px_1fr_auto] lg:items-center">
                <div className="relative w-fit">
                  <div className="h-28 w-28 overflow-hidden rounded-[24px] border-4 border-[#ddf9ff] bg-[#ddf9ff] shadow-md">
                    {guide?.avatarUrl ? (
                      <img
                        src={guide.avatarUrl}
                        alt={guide.fullName || "Avatar"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl font-black text-[#00606c]">
                        {getInitials(guide?.fullName)}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-full bg-[#9b4500] text-white shadow-md transition hover:scale-105 disabled:bg-gray-300"
                    title="Đổi ảnh đại diện"
                  >
                    {uploadingAvatar ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    ) : (
                      <EditIcon />
                    )}
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="break-words text-[23px] font-black tracking-[-0.03em] text-[#172124] md:text-[27px]">
                      {guide?.fullName || "Hướng dẫn viên"}
                    </h2>

                    <span className="rounded-full bg-[#9defff] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#001f24]">
                      {guide?.status || "ACTIVE"}
                    </span>
                  </div>

                  <p className="mt-1 text-sm font-black text-[#00606c]">
                    {guide?.guideCode || "HDV"} • Hướng dẫn viên ChillTrip
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <InfoPill
                      icon={<MailIcon />}
                      text={guide?.email || "Chưa có email"}
                    />
                    <InfoPill
                      icon={<PhoneIcon />}
                      text={guide?.phone || "Chưa có SĐT"}
                    />
                    <InfoPill
                      icon={<LocationIcon />}
                      text={guide?.region || "Chưa cập nhật khu vực"}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                  <button
                    type="button"
                    className="rounded-full bg-[#f1f4f5] px-5 py-2.5 text-xs font-black text-[#172124] transition hover:bg-[#e5e9ea]"
                  >
                    Đổi mật khẩu
                  </button>

                  <button
                    type="button"
                    className="rounded-full bg-gradient-to-r from-[#9b4500] to-[#fc8a40] px-5 py-2.5 text-xs font-black !text-white shadow-[0_10px_20px_rgba(155,69,0,0.18)] transition hover:scale-105"
                  >
                    Chỉnh sửa hồ sơ
                  </button>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <ProfileStat
                label="Tour được giao"
                value={summary.totalTrips.toLocaleString("vi-VN")}
              />
              <ProfileStat
                label="Tour hoàn thành"
                value={summary.completedTrips.toLocaleString("vi-VN")}
              />
              <ProfileStat
                label="Booking phụ trách"
                value={summary.totalBookings.toLocaleString("vi-VN")}
              />
              <ProfileStat
                label="Khách phụ trách"
                value={summary.totalPassengers.toLocaleString("vi-VN")}
                highlight
              />
            </section>

            <section className="rounded-[26px] border border-[#dfe8ea] bg-white p-5 shadow-sm">
              <SectionTitle icon={<UserIcon />} title="Giới thiệu bản thân" />

              <p className="text-[13px] font-medium leading-6 text-[#536163]">
                Đây là hồ sơ hướng dẫn viên trong hệ thống ChillTrip. Các thông
                tin như mã HDV, khu vực, ngôn ngữ và thống kê tour được lấy từ dữ
                liệu tài khoản và tour được phân công. Những phần chưa có dữ liệu
                sẽ hiển thị trạng thái chưa cập nhật.
              </p>

              <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                <InfoSection title="Ngôn ngữ sử dụng">
                  {languages.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {languages.map((language) => (
                        <span
                          key={language}
                          className="rounded-full bg-[#ddf9ff] px-3 py-1.5 text-xs font-black text-[#00606c]"
                        >
                          {language}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <EmptyInline text="Chưa cập nhật ngôn ngữ." />
                  )}
                </InfoSection>

                <InfoSection title="Tuyến điểm / khu vực">
                  {regions.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {regions.map((region) => (
                        <span
                          key={region}
                          className="flex items-center gap-1.5 rounded-full border border-[#dfe8ea] bg-[#f7fbfc] px-3 py-1.5 text-xs font-bold text-[#3e494b]"
                        >
                          <CompassIcon />
                          {region}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <EmptyInline text="Chưa cập nhật khu vực phụ trách." />
                  )}
                </InfoSection>
              </div>
            </section>

            <section className="rounded-[26px] border border-[#dfe8ea] bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
                <SectionTitle
                  icon={<StarIcon />}
                  title="Đánh giá từ khách hàng"
                  noMargin
                />
              </div>

              <EmptyContent
                title="Chưa có dữ liệu đánh giá"
                desc="Hiện hệ thống chưa có API hoặc bảng dữ liệu đánh giá của khách hàng dành cho hướng dẫn viên, nên phần này không hiển thị dữ liệu mẫu."
              />
            </section>
          </div>

          <aside className="space-y-5">
            <section className="rounded-[26px] border border-[#dfe8ea] bg-white p-5 shadow-sm">
              <SectionTitle icon={<ShieldIcon />} title="Bằng cấp & chứng chỉ" />

              <EmptyContent
                title="Chưa có dữ liệu chứng chỉ"
                desc="Hiện chưa có bảng hoặc API chứng chỉ HDV. Khi có dữ liệu chứng chỉ, phần này sẽ hiển thị theo hồ sơ thật."
              />

              <div className="mt-5 border-t border-[#edf2f3] pt-5">
                <p className="mb-3 text-center text-[10px] font-black uppercase tracking-[0.16em] text-[#6e797b]">
                  Trạng thái tài khoản
                </p>

                <div className="flex items-center justify-center gap-2 rounded-full bg-[#e7f8ec] py-2.5 text-xs font-black text-[#166534]">
                  <CheckIcon />
                  {guide?.status || "ACTIVE"}
                </div>
              </div>
            </section>

            <section className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#00606c] to-[#007b8a] p-5 text-white shadow-[0_14px_28px_rgba(0,96,108,0.16)]">
              <div className="relative z-10 text-center">
                <h3 className="text-base font-black !text-white">QR Hồ sơ</h3>

                <p className="mt-2 text-xs font-semibold leading-5 !text-white/80">
                  Chưa có API tạo QR hồ sơ. Đây chỉ là khu vực chờ dữ liệu.
                </p>

                <div className="mx-auto mt-5 flex h-32 w-32 items-center justify-center rounded-[22px] bg-white p-3 shadow-inner">
                  <QrIcon />
                </div>

                <button
                  type="button"
                  disabled
                  className="mt-5 w-full cursor-not-allowed rounded-full border border-white/20 bg-white/10 py-2.5 text-xs font-black !text-white/70"
                >
                  Chưa hỗ trợ tải QR
                </button>
              </div>

              <div className="absolute -bottom-16 -right-16 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
            </section>
          </aside>
        </section>
      </section>
    </GuideShell>
  );
}

function StateBox({ text, danger = false }: { text: string; danger?: boolean }) {
  return (
    <div className="rounded-[26px] border border-[#dfe8ea] bg-white p-9 text-center shadow-sm">
      <p
        className={
          danger
            ? "text-sm font-black text-[#ba1a1a]"
            : "text-sm font-black text-[#00606c]"
        }
      >
        {text}
      </p>
    </div>
  );
}

function ProfileStat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-[24px] border border-[#dfe8ea] bg-white p-5 text-center shadow-sm">
      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#6e797b]">
        {label}
      </p>

      <p
        className={
          highlight
            ? "text-[24px] font-black tracking-[-0.035em] text-[#9b4500]"
            : "text-[24px] font-black tracking-[-0.035em] text-[#00606c]"
        }
      >
        {value}
      </p>
    </div>
  );
}

function SectionTitle({
  icon,
  title,
  noMargin = false,
}: {
  icon: ReactNode;
  title: string;
  noMargin?: boolean;
}) {
  return (
    <h3
      className={`flex items-center gap-2.5 text-base font-black text-[#172124] md:text-lg ${
        noMargin ? "" : "mb-4"
      }`}
    >
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#ddf9ff] text-[#00606c]">
        {icon}
      </span>
      <span>{title}</span>
    </h3>
  );
}

function InfoPill({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex max-w-full items-center gap-2 rounded-full bg-[#f7fbfc] px-3 py-1.5 text-xs font-semibold text-[#536163]">
      <span className="flex-shrink-0 text-[#00606c]">{icon}</span>
      <span className="break-all">{text}</span>
    </div>
  );
}

function InfoSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <h4 className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#6e797b]">
        {title}
      </h4>
      {children}
    </div>
  );
}

function EmptyInline({ text }: { text: string }) {
  return (
    <p className="rounded-[18px] bg-[#f7fbfc] px-4 py-3 text-xs font-semibold text-[#6e797b]">
      {text}
    </p>
  );
}

function EmptyContent({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-[22px] border border-dashed border-[#dfe8ea] bg-[#f7fbfc] p-4">
      <p className="text-sm font-black text-[#00606c]">{title}</p>
      <p className="mt-1 text-xs font-medium leading-5 text-[#6e797b]">
        {desc}
      </p>
    </div>
  );
}

function EditIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"
      />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m3 7 9 6 9-6" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.32 1.77.59 2.61a2 2 0 0 1-.45 2.11L8 9.69a16 16 0 0 0 6.31 6.31l1.25-1.25a2 2 0 0 1 2.11-.45c.84.27 1.71.47 2.61.59A2 2 0 0 1 22 16.92Z"
      />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"
      />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function CompassIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <circle cx="12" cy="12" r="9" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m14.5 9.5-4 1.5-1.5 4 4-1.5 1.5-4Z"
      />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
      <path d="m12 17.27 6.18 3.73-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6l7-3Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
    </svg>
  );
}

function QrIcon() {
  return (
    <svg
      className="h-20 w-20 text-[#00606c]"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 4h6v6H4V4ZM14 4h6v6h-6V4ZM4 14h6v6H4v-6Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14 14h2v2h-2v-2ZM18 14h2v2h-2v-2ZM14 18h2v2h-2v-2ZM18 18h2v2h-2v-2Z"
      />
    </svg>
  );
}