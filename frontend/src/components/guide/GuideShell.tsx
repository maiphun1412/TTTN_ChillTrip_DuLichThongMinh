"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getGuideMeApi, type GuideMe } from "@/lib/api/guide.api";

type GuideShellProps = {
  guide?: GuideMe | null;
  children: React.ReactNode;
};

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

function normalizeStatus(status?: string | null) {
  if (!status) return "Chưa cập nhật";
  return String(status).toUpperCase();
}

export default function GuideShell({ guide, children }: GuideShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [shellGuide, setShellGuide] = useState<GuideMe | null>(guide || null);

  useEffect(() => {
    if (guide) {
      setShellGuide(guide);
      return;
    }

    let mounted = true;

    async function loadGuide() {
      try {
        const data = await getGuideMeApi();

        if (mounted) {
          setShellGuide(data);
        }
      } catch {
        if (mounted) {
          setShellGuide(null);
        }
      }
    }

    loadGuide();

    return () => {
      mounted = false;
    };
  }, [guide]);

  const displayGuide = shellGuide || guide || null;

  const guideSubtitle = useMemo(() => {
    const code = displayGuide?.guideCode || "Chưa có mã HDV";
    const region = displayGuide?.region || "Chưa cập nhật khu vực";

    return `${code} • ${region}`;
  }, [displayGuide?.guideCode, displayGuide?.region]);

  function handleLogout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("user");
    router.push("/login");
  }

  return (
    <main className="min-h-screen bg-[#f5f8fa] text-[#172124]">
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[292px] border-r border-[#dde8eb] bg-white xl:block">
        <div className="flex h-full flex-col">
          <div className="px-7 pb-5 pt-7">
            <Link href="/guide" className="block">
              <p className="text-2xl font-black tracking-tight text-[#00606c]">
                ChillTrip
              </p>
              <p className="mt-1 text-xs font-black uppercase tracking-[0.24em] text-[#9b4500]">
                Guide Center
              </p>
            </Link>
          </div>

          <div className="mx-5 rounded-[28px] border border-[#e1ebee] bg-[#f7fbfc] p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-[22px] bg-[#ddf9ff] text-lg font-black text-[#00606c] shadow-sm">
                {displayGuide?.avatarUrl ? (
                  <img
                    src={displayGuide.avatarUrl}
                    alt={displayGuide.fullName || "Hướng dẫn viên"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  getInitials(displayGuide?.fullName)
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-black text-[#172124]">
                  {displayGuide?.fullName || "Hướng dẫn viên"}
                </p>

                <p className="mt-1 truncate text-xs font-bold text-[#6e797b]">
                  {guideSubtitle}
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-[18px] bg-white p-3 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#6e797b]">
                  Kinh nghiệm
                </p>

                <p className="mt-1 text-sm font-black text-[#00606c]">
                  {typeof displayGuide?.experienceYears === "number"
                    ? `${displayGuide.experienceYears} năm`
                    : "Chưa cập nhật"}
                </p>
              </div>

              <div className="rounded-[18px] bg-white p-3 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#6e797b]">
                  Trạng thái
                </p>

                <p className="mt-1 text-sm font-black text-[#00606c]">
                  {normalizeStatus(displayGuide?.status)}
                </p>
              </div>
            </div>
          </div>

          <nav className="mt-7 flex-1 space-y-1 overflow-y-auto px-5">
            <GuideNavItem
              href="/guide"
              active={pathname === "/guide"}
              icon={<DashboardIcon />}
              label="Bảng điều khiển"
            />

            <GuideNavItem
              href="/guide/schedule"
              active={pathname.startsWith("/guide/schedule")}
              icon={<CalendarIcon />}
              label="Lịch trình"
            />

            <GuideNavItem
              href="/guide/passengers"
              active={pathname.startsWith("/guide/passengers")}
              icon={<GuestIcon />}
              label="Khách & điểm đón"
            />

            <GuideNavItem
              href="/guide/reports"
              active={pathname.startsWith("/guide/reports")}
              icon={<ReportIcon />}
              label="Báo cáo kết thúc"
            />

            <GuideNavItem
              href="/guide/profile"
              active={pathname.startsWith("/guide/profile")}
              icon={<ProfileIcon />}
              label="Hồ sơ cá nhân"
            />
          </nav>

          <div className="px-5 pb-6">
            <div className="mb-4 rounded-[24px] bg-[#00606c] p-5 shadow-[0_18px_35px_rgba(0,96,108,0.18)]">
              <p className="text-sm font-black !text-white">
                Nhắc việc hôm nay
              </p>

              <p className="mt-2 text-xs leading-5 !text-white/80">
                Kiểm tra điểm đón, danh sách khách, lịch trình và báo cáo sau
                khi kết thúc chuyến đi.
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-[18px] border border-[#ffd8d4] bg-[#fff5f4] px-5 py-3 text-sm font-black text-[#ba1a1a] transition hover:bg-[#ffe6e3]"
            >
              <LogoutIcon />
              Đăng xuất
            </button>
          </div>
        </div>
      </aside>

      <section className="min-h-screen xl:pl-[292px]">
        <header className="sticky top-0 z-30 border-b border-[#dde8eb] bg-[#f5f8fa]/92 backdrop-blur-xl">
          <div className="flex h-20 items-center justify-between gap-4 px-4 md:px-7 xl:px-8">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#9b4500]">
                Hướng dẫn viên
              </p>

              <h1 className="mt-1 truncate text-xl font-black text-[#00606c] md:text-2xl">
                Trung tâm điều phối tour
              </h1>
            </div>

            <div className="hidden h-12 w-[380px] items-center rounded-[18px] border border-[#dfe8ea] bg-white px-4 shadow-sm lg:flex">
              <SearchIcon />
              <input
                placeholder="Tìm mã tour, tên tour, điểm đến..."
                className="ml-3 w-full border-none bg-transparent text-sm font-semibold text-[#172124] outline-none placeholder:text-[#91a0a4] focus:ring-0"
              />
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/guide/reports"
                className="relative flex h-11 w-11 items-center justify-center rounded-[18px] border border-[#dfe8ea] bg-white text-[#00606c] shadow-sm transition hover:bg-[#edf7f9]"
                title="Báo cáo kết thúc"
              >
                <BellIcon />
                <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[#fc8a40]" />
              </Link>

              <Link
                href="/guide/profile"
                className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-[18px] border border-[#dfe8ea] bg-[#ddf9ff] text-sm font-black text-[#00606c] shadow-sm"
                title="Hồ sơ cá nhân"
              >
                {displayGuide?.avatarUrl ? (
                  <img
                    src={displayGuide.avatarUrl}
                    alt={displayGuide.fullName || "Avatar"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  getInitials(displayGuide?.fullName)
                )}
              </Link>
            </div>
          </div>
        </header>

        <div className="px-4 py-6 md:px-7 md:py-7 xl:px-8 xl:py-8">
          {children}
        </div>
      </section>

      <nav className="fixed bottom-0 left-0 z-50 grid h-[74px] w-full grid-cols-4 border-t border-[#dfe8ea] bg-white/95 px-2 shadow-[0_-12px_34px_rgba(15,23,42,0.08)] backdrop-blur-xl xl:hidden">
        <MobileNavItem
          href="/guide"
          active={pathname === "/guide"}
          icon={<DashboardIcon />}
          label="Tổng quan"
        />

        <MobileNavItem
          href="/guide/schedule"
          active={pathname.startsWith("/guide/schedule")}
          icon={<CalendarIcon />}
          label="Lịch"
        />

        <MobileNavItem
          href="/guide/passengers"
          active={pathname.startsWith("/guide/passengers")}
          icon={<GuestIcon />}
          label="Khách"
        />

        <MobileNavItem
          href="/guide/profile"
          active={pathname.startsWith("/guide/profile")}
          icon={<ProfileIcon />}
          label="Hồ sơ"
        />
      </nav>
    </main>
  );
}

function GuideNavItem({
  href,
  active,
  icon,
  label,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-[18px] px-4 py-3 text-sm font-black transition ${
        active
          ? "bg-[#00606c] !text-white shadow-[0_14px_30px_rgba(0,96,108,0.22)]"
          : "text-[#172124] hover:bg-[#f1f4f5] hover:text-[#00606c]"
      }`}
    >
      <span
        className={`flex h-5 w-5 items-center justify-center ${
          active ? "!text-white" : "text-[#172124]"
        }`}
      >
        {icon}
      </span>

      <span className={active ? "!text-white" : ""}>{label}</span>
    </Link>
  );
}

function MobileNavItem({
  href,
  icon,
  label,
  active = false,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center gap-1 rounded-[20px] text-[11px] font-black ${
        active ? "text-[#00606c]" : "text-[#6e797b]"
      }`}
    >
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-full ${
          active ? "bg-[#ddf9ff]" : ""
        }`}
      >
        {icon}
      </span>
      <span>{label}</span>
    </Link>
  );
}

function DashboardIcon() {
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
        d="M4 13h7V4H4v9ZM13 20h7V4h-7v16ZM4 20h7v-5H4v5Z"
      />
    </svg>
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
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 2v4M16 2v4" />
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18" />
    </svg>
  );
}

function GuestIcon() {
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
        d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"
      />
      <circle cx="9.5" cy="7.5" r="3.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 8v6M17 11h6" />
    </svg>
  );
}

function ReportIcon() {
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
        d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 3v6h5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6M9 17h6" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg
      className="h-5 w-5"
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

function SearchIcon() {
  return (
    <svg
      className="h-5 w-5 text-[#6e797b]"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <circle cx="11" cy="11" r="7" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m20 20-3.5-3.5" />
    </svg>
  );
}

function BellIcon() {
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
        d="M15 17H5l1.4-1.4A2 2 0 0 0 7 14.2V11a5 5 0 1 1 10 0v3.2a2 2 0 0 0 .6 1.4L19 17h-4"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  );
}

function LogoutIcon() {
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
        d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 17l5-5-5-5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H3" />
    </svg>
  );
}