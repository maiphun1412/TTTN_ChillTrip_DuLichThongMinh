"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import HomeHeader from "@/components/home/HomeHeader";
import ProfileSidebar from "@/components/profile/ProfileSidebar";
import { getCurrentUserApi, type CurrentUserResponse } from "@/lib/api/auth.api";

type ProfileData = NonNullable<CurrentUserResponse["data"]>;

type MyBooking = {
  id: string;
  bookingCode: string;
  bookingStatus: string;
  adultCount: number;
  childCount: number;
  totalPayableAmount: string | number;
  bookedAt: string;
  tourId: string;
  tourName: string;
  tourCode: string;
  durationDays: number;
  durationNights: number;
  featuredImageUrl?: string | null;
  startDate?: string | null;
  endDate?: string | null;
};

type TabKey = "UPCOMING" | "COMPLETED" | "CANCELLED";

function formatPrice(price?: string | number | null) {
  return `${Number(price || 0).toLocaleString("vi-VN")}đ`;
}

function formatDate(date?: string | null) {
  if (!date) return "Đang cập nhật";
  return new Date(date).toLocaleDateString("vi-VN");
}

function statusText(status?: string) {
  switch (status) {
    case "PENDING":
      return "Chờ thanh toán";
    case "RESERVED":
      return "Đã giữ chỗ";
    case "CONFIRMED":
      return "Đã xác nhận";
    case "PARTIALLY_PAID":
      return "Đã thanh toán một phần";
    case "PAID":
      return "Đã thanh toán";
    case "CANCELLED":
      return "Đã hủy";
    case "COMPLETED":
      return "Đã hoàn thành";
    default:
      return status || "Đang cập nhật";
  }
}

function statusClass(status?: string) {
  switch (status) {
    case "CONFIRMED":
    case "PAID":
      return "bg-[#9defff] text-[#001f24]";
    case "PENDING":
    case "RESERVED":
    case "PARTIALLY_PAID":
      return "bg-[#ffdbc9] text-[#331200]";
    case "CANCELLED":
      return "bg-[#ffdad6] text-[#93000a]";
    case "COMPLETED":
      return "bg-[#dff7e8] text-[#14532d]";
    default:
      return "bg-[#ebeeef] text-[#3e494b]";
  }
}

export default function MyBookingsPage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [bookings, setBookings] = useState<MyBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("UPCOMING");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        const token =
          localStorage.getItem("access_token") ||
          sessionStorage.getItem("access_token");

        if (!token) {
          throw new Error("Chưa đăng nhập");
        }

        const [profileData, bookingRes] = await Promise.all([
          getCurrentUserApi(),
          fetch("/backend-api/bookings", {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          }),
        ]);

        const bookingJson = await bookingRes.json();

        if (!bookingRes.ok || !bookingJson.success) {
          throw new Error(bookingJson.message || "Không lấy được tour đã đặt");
        }

        setProfile(profileData);
        setBookings(bookingJson.data || []);
      } catch (error) {
        console.error("Load my bookings error:", error);
        setProfile(null);
        setBookings([]);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const filteredBookings = useMemo(() => {
    if (activeTab === "COMPLETED") {
      return bookings.filter((item) => item.bookingStatus === "COMPLETED");
    }

    if (activeTab === "CANCELLED") {
      return bookings.filter((item) => item.bookingStatus === "CANCELLED");
    }

    return bookings.filter(
      (item) =>
        item.bookingStatus !== "COMPLETED" &&
        item.bookingStatus !== "CANCELLED"
    );
  }, [bookings, activeTab]);

  return (
    <main className="min-h-screen bg-[#f6fafb] text-[#181c1d]">
      <HomeHeader />

      <div className="mx-auto max-w-[1500px] px-4 pb-24 pt-28 md:px-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          <ProfileSidebar profile={profile} />

          <div className="min-w-0 flex-1">
            <section className="mb-10">
              <p className="mb-3 text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#9b4500]">
                ChillTrip
              </p>

             <h1 className="mb-3 text-3xl font-extrabold tracking-[-0.03em] text-[#00606c] md:text-4xl">
  Tour đã đặt
</h1>

              <p className="max-w-2xl text-[16px] leading-8 text-[#3e494b]">
                Theo dõi các tour bạn đã đặt, trạng thái xác nhận và thông tin
                thanh toán.
              </p>
            </section>

            <div className="mb-8 flex flex-wrap gap-3">
              <TabButton
                active={activeTab === "UPCOMING"}
                onClick={() => setActiveTab("UPCOMING")}
              >
                Sắp diễn ra
              </TabButton>

              <TabButton
                active={activeTab === "COMPLETED"}
                onClick={() => setActiveTab("COMPLETED")}
              >
                Đã hoàn thành
              </TabButton>

              <TabButton
                active={activeTab === "CANCELLED"}
                onClick={() => setActiveTab("CANCELLED")}
              >
                Đã hủy
              </TabButton>
            </div>

            {loading ? (
              <EmptyBox text="Đang tải danh sách tour đã đặt..." />
            ) : filteredBookings.length === 0 ? (
              <EmptyBox text="Chưa có tour nào trong mục này." />
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {filteredBookings.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function BookingCard({ booking }: { booking: MyBooking }) {
  const guests =
    Number(booking.adultCount || 0) + Number(booking.childCount || 0);

  const image = booking.featuredImageUrl || "/images/tours/dalat-cover.jpg";

  return (
    <article className="grid min-h-[260px] overflow-hidden rounded-[28px] border border-[#dfe3e4] bg-white shadow-[0_16px_36px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-0.5 hover:shadow-[0_24px_48px_rgba(15,23,42,0.09)] md:grid-cols-[300px_1fr]">
      <div className="h-64 overflow-hidden md:h-full">
        <img
          src={image}
          alt={booking.tourName}
          className="h-full w-full object-cover"
        />
      </div>

      <div className="flex min-h-[260px] flex-col justify-between p-6 md:p-8">
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <span
              className={`rounded-full px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] ${statusClass(
                booking.bookingStatus
              )}`}
            >
              {statusText(booking.bookingStatus)}
            </span>

            <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#6e797b]">
              Mã: {booking.bookingCode}
            </span>
          </div>

          <h2 className="line-clamp-2 text-2xl font-extrabold leading-tight text-[#181c1d]">
            {booking.tourName}
          </h2>

          <div className="mt-5 flex flex-wrap gap-x-7 gap-y-3 text-[15px] text-[#3e494b]">
            <InfoIcon
              icon={<CalendarIcon />}
              value={`${formatDate(booking.startDate)} - ${formatDate(
                booking.endDate
              )}`}
            />

            <InfoIcon
              icon={<ClockIcon />}
              value={`${booking.durationDays} ngày ${booking.durationNights} đêm`}
            />

            <InfoIcon icon={<UsersIcon />} value={`${guests} khách`} />
          </div>
        </div>

        <div className="mt-7 flex flex-col gap-5 border-t border-[#ebeeef] pt-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mb-1 text-xs font-extrabold uppercase tracking-[0.16em] text-[#6e797b]">
              Tổng thanh toán
            </p>

            <p className="text-2xl font-black text-[#9b4500]">
              {formatPrice(booking.totalPayableAmount)}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-full bg-[#006875]/10 px-6 py-3 font-bold text-[#00606c] transition-all hover:bg-[#00606c] hover:text-white active:scale-95"
            >
              Hỗ trợ
            </button>

            <Link
              href={`/my-bookings/${booking.id}`}
              className="rounded-full bg-gradient-to-r from-[#9b4500] to-[#fc8a40] px-8 py-3 font-bold text-white shadow-lg shadow-[#9b4500]/20 transition-all hover:scale-105 active:scale-95"
            >
              Xem chi tiết
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

function TabButton({
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
      className={`rounded-full px-7 py-3 transition-all ${
        active
          ? "bg-[#00606c] font-extrabold text-white shadow-md"
          : "bg-[#f1f4f5] font-bold text-[#3e494b] hover:bg-[#e5e9ea]"
      }`}
    >
      {children}
    </button>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-[28px] border border-[#dfe3e4] bg-white p-12 text-center shadow-sm">
      <p className="text-lg font-bold text-[#00606c]">{text}</p>

      <Link
        href="/tours"
        className="mt-6 inline-block rounded-full bg-[#00606c] px-7 py-3 font-bold text-white transition-all hover:scale-105"
      >
        Xem tour ngay
      </Link>
    </div>
  );
}

function InfoIcon({
  icon,
  value,
}: {
  icon: React.ReactNode;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[#00606c]">{icon}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 2v3M16 2v3M3 9h18M5 5h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6l4 2M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"
      />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9.5 11A3.5 3.5 0 1 0 9.5 4a3.5 3.5 0 0 0 0 7ZM20 8v6M17 11h6"
      />
    </svg>
  );
}