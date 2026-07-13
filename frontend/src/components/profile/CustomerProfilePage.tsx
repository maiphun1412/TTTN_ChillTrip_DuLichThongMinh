"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import HomeHeader from "@/components/home/HomeHeader";
import ProfileSidebar from "@/components/profile/ProfileSidebar";
import { getCurrentUserApi, type CurrentUserResponse } from "@/lib/api/auth.api";
import TravelMapSection from "@/components/profile/TravelMapSection";
import {
  getMyTravelPlaces,
  type TravelPlace,
} from "@/lib/travel-places.api";

type ProfileData = NonNullable<CurrentUserResponse["data"]>;

type AppIconName =
  | "trip"
  | "points"
  | "voucher"
  | "user"
  | "mail"
  | "phone"
  | "calendar"
  | "location";

const suggestions = [
  {
    title: "Vịnh Hạ Long - Du thuyền 5 sao",
    desc: "Khám phá vẻ đẹp kỳ vĩ của di sản thiên nhiên thế giới trên du thuyền sang trọng.",
    price: "4.200k",
    rating: "4.9",
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=900&auto=format&fit=crop",
  },
  {
    title: "Đà Nẵng - Hội An 3N2Đ",
    desc: "Hành trình nghỉ dưỡng biển, tham quan phố cổ và trải nghiệm ẩm thực miền Trung.",
    price: "3.500k",
    rating: "4.8",
    image:
      "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?q=80&w=900&auto=format&fit=crop",
  },
  {
    title: "Phú Quốc - Thiên đường Đảo Ngọc",
    desc: "Tận hưởng kỳ nghỉ tại resort ven biển, biển xanh, cát trắng và không gian thư giãn.",
    price: "5.800k",
    rating: "5.0",
    image:
      "https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?q=80&w=900&auto=format&fit=crop",
  },
];

function formatDate(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("vi-VN");
}

export default function CustomerProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [travelPlaces, setTravelPlaces] = useState<TravelPlace[]>([]);
  const [travelPlaceTotal, setTravelPlaceTotal] = useState(0);
  const [travelPlacesLoading, setTravelPlacesLoading] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        setErrorMessage("");

        const data = await getCurrentUserApi();
        setProfile(data);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Không thể lấy thông tin người dùng";

        setErrorMessage(message);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);
  

  

  useEffect(() => {
    async function loadTravelPlaces() {
      try {
        setTravelPlacesLoading(true);

        const data = await getMyTravelPlaces();
        setTravelPlaces(data.places || []);
        setTravelPlaceTotal(data.total || 0);
          } catch (error) {
        console.error("LOAD_TRAVEL_PLACES_ERROR:", error);
        setTravelPlaces([]);
        setTravelPlaceTotal(0);
      } finally {
        setTravelPlacesLoading(false);
      }
    }

    loadTravelPlaces();
  }, []);

  const displayInfo = useMemo(() => {
    const user = profile?.user;
    const customer = profile?.customer;

    return {
      fullName: customer?.fullName || user?.fullName || "Khách hàng",
      email: customer?.email || user?.email || "",
      phone: customer?.phone || user?.phone || "",
      birthday: formatDate(customer?.dateOfBirth),
      address: customer?.address || "",
      trips: String(profile?.summary?.totalBookings ?? 0),
      points: Number(profile?.summary?.rewardPoints ?? 0).toLocaleString(
        "vi-VN"
      ),
      vouchers: `${profile?.summary?.availablePromotions ?? 0} mã`,
    };
  }, [profile]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f6fafb] text-[#181c1d]">
        <HomeHeader />

        <div className="mx-auto max-w-[1500px] px-4 pb-24 pt-28 md:px-8">
          <div className="rounded-[3rem] bg-white p-10 text-center shadow-sm">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#e5e9ea] border-t-[#00606c]" />
            <p className="mt-5 font-semibold text-slate-600">
              Đang tải thông tin khách hàng...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main className="min-h-screen bg-[#f6fafb] text-[#181c1d]">
        <HomeHeader />

        <div className="mx-auto max-w-[1500px] px-4 pb-24 pt-28 md:px-8">
          <div className="rounded-[3rem] bg-white p-10 text-center shadow-sm">
            <h1 className="text-2xl font-extrabold text-slate-900">
              Không thể hiển thị hồ sơ
            </h1>

            <p className="mt-3 text-slate-500">{errorMessage}</p>

            <Link
              href="/login"
              className="mt-6 inline-flex rounded-full bg-[#00606c] px-8 py-3 font-bold text-white transition hover:scale-105"
            >
              Đăng nhập lại
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6fafb] text-[#181c1d]">
      <HomeHeader />

      <div className="mx-auto max-w-[1500px] px-4 pb-24 pt-28 md:px-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          <ProfileSidebar profile={profile} />

          <div className="min-w-0 flex-1 space-y-8">
            <section className="mb-2">
              <p className="mb-3 text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#9b4500]">
                ChillTrip
              </p>

              <h1 className="mb-3 text-3xl font-extrabold tracking-[-0.03em] text-[#00606c] md:text-4xl">
                Hồ sơ của tôi
              </h1>

              <p className="max-w-2xl text-[16px] leading-8 text-[#3e494b]">
                Quản lý thông tin cá nhân, theo dõi hành trình đã đặt và cập
                nhật các ưu đãi dành riêng cho bạn.
              </p>
            </section>

            <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <StatCard
                icon="trip"
                label="Tour đã đặt"
                value={displayInfo.trips}
              />
              <StatCard
                icon="points"
                label="Điểm thưởng"
                value={displayInfo.points}
              />
              <StatCard
                icon="voucher"
                label="Ưu đãi"
                value={displayInfo.vouchers}
              />
            </section>
<TravelMapSection
  places={travelPlaces}
  total={travelPlaceTotal}
  loading={travelPlacesLoading}
  avatarUrl={profile?.user?.avatarUrl}
/>

            <section className="rounded-[3rem] bg-white p-6 shadow-sm shadow-cyan-900/5 md:p-10">
              <div className="mb-8 flex items-end justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                    Thông tin cá nhân
                  </h1>

                  <p className="mt-2 text-sm text-slate-500">
                    Cập nhật thông tin của bạn để có trải nghiệm tốt nhất.
                  </p>
                </div>

                <div className="hidden text-[#d9f4f8] md:block">
                  <AppIcon name="user" className="h-12 w-12" />
                </div>
              </div>

              <form className="grid grid-cols-1 gap-x-10 gap-y-6 md:grid-cols-2">
                <InputField
                  icon="user"
                  label="Họ và tên"
                  value={displayInfo.fullName}
                />

                <InputField
                  icon="mail"
                  label="Địa chỉ Email"
                  value={displayInfo.email}
                />

                <InputField
                  icon="phone"
                  label="Số điện thoại"
                  value={displayInfo.phone}
                />

                <InputField
                  icon="calendar"
                  label="Ngày sinh"
                  value={displayInfo.birthday}
                />

                <div className="md:col-span-2">
                  <InputField
                    icon="location"
                    label="Địa chỉ thường trú"
                    value={displayInfo.address}
                  />
                </div>

                <div className="pt-2 md:col-span-2">
                  <button
                    type="button"
                    className="rounded-full bg-gradient-to-r from-[#9b4500] to-[#fc8a40] px-10 py-4 text-base font-extrabold text-white shadow-lg transition hover:scale-105 active:scale-95"
                  >
                    Lưu thay đổi
                  </button>
                </div>
              </form>
            </section>

            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-extrabold tracking-tight text-slate-900 md:text-2xl">
                  Gợi ý riêng cho bạn
                </h2>

                <Link
                  href="/tours"
                  className="flex items-center gap-1 font-bold text-[#00606c] hover:underline"
                >
                  Xem tất cả →
                </Link>
              </div>

              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 xl:grid-cols-3">
                {suggestions.map((tour) => (
                  <article
                    key={tour.title}
                    className="group overflow-hidden rounded-[3rem] bg-white shadow-sm shadow-cyan-900/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={tour.image}
                        alt={tour.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />

                      <div className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 text-sm font-extrabold text-[#00606c] shadow-sm backdrop-blur">
                        {tour.rating} ★
                      </div>
                    </div>

                    <div className="p-6">
                      <h3 className="mb-2 text-lg font-extrabold text-slate-900">
                        {tour.title}
                      </h3>

                      <p className="mb-5 line-clamp-2 text-sm leading-6 text-slate-500">
                        {tour.desc}
                      </p>

                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-black text-[#00606c]">
                          {tour.price}
                          <span className="text-xs font-normal text-slate-500">
                            {" "}
                            /khách
                          </span>
                        </span>

                        <button
                          type="button"
                          className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e5e9ea] text-[#00606c] transition group-hover:bg-[#00606c] group-hover:text-white"
                        >
                          →
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: AppIconName;
  label: string;
  value: string;
}) {
  const iconStyle =
    icon === "points"
      ? "bg-[#ffe8dc] text-[#9b4500]"
      : "bg-[#dff8fb] text-[#00606c]";

  return (
    <div className="flex h-[64px] w-full items-center gap-4 rounded-[2rem] bg-white px-7 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
      <div
        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${iconStyle}`}
      >
        <AppIcon name={icon} className="h-[18px] w-[18px]" />
      </div>

      <div className="leading-tight">
        <p className="text-[13px] font-semibold text-slate-500">{label}</p>
        <p className="mt-1 text-sm font-extrabold text-[#00606c]">{value}</p>
      </div>
    </div>
  );
}

function InputField({
  icon,
  label,
  value,
}: {
  icon: AppIconName;
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-2">
      <label className="ml-2 text-xs font-extrabold uppercase tracking-wider text-slate-700">
        {label}
      </label>

      <div className="relative">
        <span className="absolute left-4 top-1/2 flex -translate-y-1/2 text-slate-500">
          <AppIcon name={icon} className="h-4 w-4" />
        </span>

        <input
          value={value}
          readOnly
          className="w-full rounded-full border-none bg-[#eef2f3] py-4 pl-11 pr-5 text-sm font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:ring-2 focus:ring-[#00606c]"
        />
      </div>
    </div>
  );
}

function AppIcon({
  name,
  className = "h-5 w-5",
}: {
  name: AppIconName;
  className?: string;
}) {
  const commonProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
  };

  switch (name) {
    case "user":
      return (
        <svg {...commonProps}>
          <path d="M20 21a8 8 0 0 0-16 0" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );

    case "trip":
      return (
        <svg {...commonProps}>
          <rect x="4" y="7" width="16" height="13" rx="2" />
          <path d="M9 7V5a3 3 0 0 1 6 0v2" />
          <path d="M4 12h16" />
        </svg>
      );

    case "points":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v8" />
          <path d="M9.5 10.5c0-1 1-2 2.5-2s2.5.8 2.5 2-1 1.8-2.5 2-2.5 1-2.5 2 1 2 2.5 2 2.5-1 2.5-2" />
        </svg>
      );

    case "voucher":
      return (
        <svg {...commonProps}>
          <path d="M20 12a2 2 0 0 1-2-2V8a2 2 0 0 0-2-2H8A2 2 0 0 0 6 8v2a2 2 0 0 1-2 2 2 2 0 0 1 2 2v2a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-2a2 2 0 0 1 2-2Z" />
          <path d="M12 8v8" />
        </svg>
      );

    case "mail":
      return (
        <svg {...commonProps}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 7 9 6 9-6" />
        </svg>
      );

    case "phone":
      return (
        <svg {...commonProps}>
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.32 1.77.59 2.61a2 2 0 0 1-.45 2.11L8 9.69a16 16 0 0 0 6.31 6.31l1.25-1.25a2 2 0 0 1 2.11-.45c.84.27 1.71.47 2.61.59A2 2 0 0 1 22 16.92Z" />
        </svg>
      );

    case "calendar":
      return (
        <svg {...commonProps}>
          <path d="M8 2v4" />
          <path d="M16 2v4" />
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M3 10h18" />
        </svg>
      );

    case "location":
      return (
        <svg {...commonProps}>
          <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      );

    default:
      return null;
  }
}