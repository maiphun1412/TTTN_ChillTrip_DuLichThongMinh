"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Plane,
  Ticket,
  Users,
  Wallet,
  Settings,
  Search,
  Bell,
  LogOut,
  ChevronDown,
  CalendarDays,
  FileCheck2,
  MailQuestion,
} from "lucide-react";

type StaffShellProps = {
  children: ReactNode;
};

const menuItems = [
  { label: "Tổng quan", icon: LayoutDashboard, href: "/staff" },
  { label: "Tour", icon: Plane, href: "/staff/tours" },
  { label: "Đặt chỗ", icon: Ticket, href: "/staff/booking" },
  { label: "Lịch trình", icon: CalendarDays, href: "/staff/schedule" },
  { label: "Khách hàng", icon: Users, href: "/staff/customers" },
  { label: "Tài chính & Công nợ", icon: Wallet, href: "/staff/finance" },
  { label: "Vận hành", icon: Settings, href: "/staff/operation" },
  { label: "Email & Yêu cầu", icon: MailQuestion, href: "/staff/requests" },
];

export default function StaffShell({ children }: StaffShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    const ok = window.confirm("Bạn có chắc muốn đăng xuất không?");
    if (!ok) return;

    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    localStorage.removeItem("current_user");
    localStorage.removeItem("role");

    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("current_user");
    sessionStorage.removeItem("role");

    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#f6fafb] text-[#181c1d]">
      <aside className="fixed left-0 top-0 z-50 flex h-full w-72 flex-col rounded-r-[2rem] bg-[#f1f4f5] py-7">
        <div className="mb-9 flex items-center gap-3 px-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#007b8a] shadow-md">
            <Plane size={20} className="text-white" />
          </div>

          <div>
            <h1 className="text-2xl font-black leading-none text-[#00606c]">
              ChillTrip
            </h1>
            <p className="mt-1 text-[11px] font-black uppercase tracking-[0.18em] text-[#3e494b]">
              Nhân viên
            </p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-4">
          {menuItems.map((item) => {
            const Icon = item.icon;

            const isActive =
              item.href === "/staff"
                ? pathname === "/staff"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`mb-2 flex w-full items-center gap-4 rounded-full px-6 py-3.5 text-sm font-semibold transition ${
                  isActive
                    ? "bg-[#007b8a] text-white shadow-md"
                    : "text-[#3e494b] hover:bg-white hover:text-[#00606c]"
                }`}
              >
                <Icon size={20} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mx-4 mt-auto border-t border-[#dfe3e4] pt-4">
          <Link
            href="/staff/settings"
            className="mb-2 flex w-full items-center gap-4 rounded-full px-6 py-3.5 text-sm font-semibold text-[#3e494b] transition hover:bg-white hover:text-[#00606c]"
          >
            <Settings size={20} />
            Cài đặt
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-4 rounded-full px-6 py-3.5 text-sm font-semibold text-[#3e494b] transition hover:bg-[#ffdad6] hover:text-[#ba1a1a]"
          >
            <LogOut size={20} />
            Đăng xuất
          </button>
        </div>
      </aside>

      <header className="fixed left-72 right-0 top-0 z-40 flex h-16 items-center justify-between bg-white/75 px-8 shadow-sm backdrop-blur-md">
        <div className="relative w-96">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6e797b]"
          />

          <input
            className="w-full rounded-full border-none bg-[#f1f4f5] py-2.5 pl-10 pr-4 text-sm text-[#181c1d] outline-none placeholder:text-[#6e797b] focus:ring-2 focus:ring-[#00606c]/20"
            placeholder="Tìm kiếm đặt chỗ, khách hàng hoặc tour..."
          />
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            className="relative flex h-10 w-10 items-center justify-center rounded-full text-[#3e494b] transition hover:bg-[#f1f4f5]"
          >
            <Bell size={18} />
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[#fc8a40]" />
          </button>

          <div className="h-6 w-px bg-[#bdc8cb]/40" />

          <button
            type="button"
            className="flex items-center gap-2 rounded-full bg-[#f1f4f5] px-4 py-2 text-sm font-bold text-[#00606c] transition hover:bg-[#e5e9ea]"
          >
            Cổng nhân viên
            <ChevronDown size={16} />
          </button>
        </div>
      </header>

      <main className="ml-72 mt-16 min-h-screen p-8">{children}</main>
    </div>
  );
}