"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getCurrentUserApi } from "@/lib/api/auth.api";
import { getNotificationsApi } from "@/lib/api/notification.api";

type HeaderUser = {
  fullName: string;
  avatarUrl: string | null;
};

export default function HomeHeader() {
  const pathname = usePathname();
  const router = useRouter();

  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [currentUser, setCurrentUser] = useState<HeaderUser | null>(null);
  const [searchKeyword, setSearchKeyword] = useState("");

  useEffect(() => {
    async function loadHeaderData() {
      try {
        const token =
          localStorage.getItem("access_token") ||
          sessionStorage.getItem("access_token");

        if (!token) {
          setCurrentUser(null);
          setUnreadNotifications(0);
          return;
        }

        const userData = await getCurrentUserApi();

        setCurrentUser({
          fullName:
            userData.customer?.fullName || userData.user.fullName || "Tài khoản",
          avatarUrl: userData.user.avatarUrl || null,
        });

        const notificationData = await getNotificationsApi();
        setUnreadNotifications(notificationData.unreadCount);
      } catch {
        setCurrentUser(null);
        setUnreadNotifications(0);
      }
    }

    loadHeaderData();

    function handleNotificationsChanged() {
      loadHeaderData();
    }

    window.addEventListener("notifications-changed", handleNotificationsChanged);

    return () => {
      window.removeEventListener(
        "notifications-changed",
        handleNotificationsChanged
      );
    };
  }, []);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const keyword = searchKeyword.trim();

    if (!keyword) {
      router.push("/tours");
      return;
    }

    router.push(`/tours?keyword=${encodeURIComponent(keyword)}`);
  }

  const navClass = (href: string) =>
    pathname === href
      ? "border-b-2 border-cyan-700 pb-1 text-cyan-700 transition-colors duration-200"
      : "text-slate-600 transition-colors duration-200 hover:text-cyan-600";

  return (
    <header className="fixed top-0 z-50 flex h-20 w-full items-center justify-between bg-white/70 px-4 shadow-sm backdrop-blur-md md:px-8">
      <Link href="/" className="flex items-center gap-2">
        <img
          src="/images/logo.png"
          alt="ChillTrip"
          className="h-20 w-20 rounded-xl object-contain"
        />
      </Link>

      <nav className="hidden items-center gap-8 md:flex">
        <Link href="/" className={navClass("/")}>
          Khám phá
        </Link>

        <Link href="/tours" className={navClass("/tours")}>
          Tour
        </Link>

        <Link href="/blog" className={navClass("/blog")}>
          Blog
        </Link>

        <Link href="/about" className={navClass("/about")}>
          Về chúng tôi
        </Link>
      </nav>

      <div className="flex items-center gap-3 md:gap-5">
        <form
          onSubmit={handleSearch}
          className="hidden items-center rounded-full bg-[#ebeeef] px-4 py-2 transition focus-within:bg-white focus-within:ring-2 focus-within:ring-[#00606c]/20 lg:flex"
        >
          <button type="submit" aria-label="Tìm kiếm tour">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="mr-2 h-4 w-4 text-[#6e797b]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 21-4.35-4.35m1.85-5.15a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
              />
            </svg>
          </button>

          <input
            type="text"
            value={searchKeyword}
            onChange={(event) => setSearchKeyword(event.target.value)}
            placeholder="Tìm chuyến đi..."
            className="w-40 bg-transparent text-sm outline-none xl:w-48"
          />
        </form>

        <div className="group relative">
          <Link
            href="/notifications"
            className={`relative flex h-10 w-10 items-center justify-center rounded-full border bg-white transition-all hover:scale-105 hover:border-cyan-600 ${
              pathname === "/notifications"
                ? "border-cyan-700 text-cyan-700"
                : "border-[#e3e7e8] text-[#6e797b]"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 17H5l1.4-1.4A2 2 0 0 0 7 14.2V11a5 5 0 1 1 10 0v3.2a2 2 0 0 0 .6 1.4L19 17h-4"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 20a2 2 0 0 0 4 0"
              />
            </svg>

            {unreadNotifications > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#fc8a40] px-1 text-[10px] font-bold text-white">
                {unreadNotifications > 9 ? "9+" : unreadNotifications}
              </span>
            ) : null}
          </Link>

          <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-black px-3 py-1 text-xs text-white opacity-0 shadow-md transition-all duration-200 group-hover:opacity-100">
            Thông báo
          </span>
        </div>

        <div className="group relative">
          <Link
            href="/favorites"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e3e7e8] bg-white transition-all hover:scale-105 hover:border-cyan-600"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-[#6e797b] transition-colors group-hover:text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z"
              />
            </svg>

            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
              2
            </span>
          </Link>

          <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-black px-3 py-1 text-xs text-white opacity-0 shadow-md transition-all duration-200 group-hover:opacity-100">
            Yêu thích
          </span>
        </div>

        {currentUser ? (
          <Link
            href="/profile"
            className="flex items-center gap-2 rounded-full border border-[#e3e7e8] bg-white px-2 py-1.5 transition-all hover:scale-105 hover:border-cyan-600"
          >
            {currentUser.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.fullName}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e5f7fa] text-sm font-extrabold text-[#00606c]">
                {currentUser.fullName.charAt(0).toUpperCase()}
              </div>
            )}

            <span className="hidden max-w-[120px] truncate pr-2 text-sm font-semibold text-slate-700 lg:block">
              {currentUser.fullName}
            </span>
          </Link>
        ) : (
          <Link
            href="/login"
            className="rounded-full bg-[#00606c] px-6 py-2.5 font-semibold !text-white transition-transform duration-200 hover:scale-105 active:scale-95"
          >
            Đăng nhập
          </Link>
        )}
      </div>
    </header>
  );
}