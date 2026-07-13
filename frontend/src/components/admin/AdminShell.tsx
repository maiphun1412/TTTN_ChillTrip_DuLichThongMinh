"use client";

import { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Ticket,
  CalendarDays,
  Users,
  Settings,
  LogOut,
  Search,
  Bell,
  CircleHelp,
  Plane,
  DollarSign,
  Percent,
  Building2,
  Star,
  FileText,
  User,
} from "lucide-react";

type AdminShellProps = {
  children: ReactNode;
};

const menuItems = [
  { label: "Tổng quan", icon: LayoutDashboard, href: "/admin" },

  { label: "Nhân sự", icon: User, href: "/admin/users" },

  { label: "Tour", icon: Plane, href: "/admin/tours" },

  { label: "Đặt chỗ", icon: Ticket, href: "/admin/booking" },

  { label: "Lịch trình", icon: CalendarDays, href: "/admin/schedule" },

  { label: "Khách hàng", icon: Users, href: "/admin/customers" },

  { label: "Tài chính & Công nợ", icon: DollarSign, href: "/admin/finance" },

  { label: "Khuyến mãi", icon: Percent, href: "/admin/promotions" },

  { label: "Vận hành", icon: Settings, href: "/admin/operations" },

  { label: "Nhà cung cấp", icon: Building2, href: "/admin/suppliers" },

  { label: "Đánh giá", icon: Star, href: "/admin/reviews" },

  { label: "Quản lý blog", icon: FileText, href: "/admin/articles" },
];

export default function AdminShell({ children }: AdminShellProps) {
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
      <div className="flex">
        <aside className="fixed left-0 top-0 z-40 hidden h-full w-72 flex-col rounded-r-[3rem] bg-[#f1f4f5] px-4 py-8 tracking-tight lg:flex">
          <div className="mb-10 flex items-center gap-3 px-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#007b8a] shadow-lg">
              <Plane size={18} className="text-white" />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tighter text-[#007B8A]">
                ChillTrip
              </h1>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#3e494b]">
                Management Portal
              </p>
            </div>
          </div>

          <nav className="flex-1 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <a
                  key={item.label}
                  href={item.href}
                  className={`flex w-full items-center gap-4 px-6 py-3 text-left text-sm transition-all duration-300 ${
                    isActive
                      ? "rounded-full bg-[#007B8A] font-bold text-white shadow-lg shadow-cyan-900/10"
                      : "text-[#3e494b] hover:scale-[1.02] hover:text-[#007B8A]"
                  }`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </a>
              );
            })}
          </nav>

          <div className="mt-auto space-y-2 border-t border-[#bdc8cb]/20 pt-6">
            <button className="flex w-full items-center gap-4 px-6 py-3 text-left text-sm text-[#3e494b] transition-all duration-300 hover:scale-[1.02] hover:text-[#007B8A]">
              <Settings size={18} />
              <span>Cài đặt</span>
            </button>

            <button 
              onClick={handleLogout}
              className="flex w-full items-center gap-4 px-6 py-3 text-left text-sm text-[#3e494b] transition-all duration-300 hover:scale-[1.02] hover:text-[#007B8A]"
            >
              <LogOut size={18} />
              <span>Đăng xuất</span>
            </button>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col lg:ml-72">
          <header className="sticky top-0 z-50 mx-6 mt-4 flex w-[calc(100%-3rem)] items-center justify-between rounded-full bg-white/70 px-8 py-3 shadow-[0_16px_32px_rgba(0,96,108,0.08)] backdrop-blur-[20px]">
            <div className="flex max-w-xl flex-1 items-center rounded-full bg-[#f1f4f5] px-4 py-2 transition-all focus-within:ring-2 focus-within:ring-[#007B8A]">
              <Search size={18} className="mr-3 text-[#3e494b]" />
              <input
                type="text"
                placeholder="Tìm kiếm tour, khách hàng hoặc mã đặt chỗ..."
                className="w-full bg-transparent text-sm text-[#181c1d] outline-none placeholder:text-[#3e494b]"
              />
            </div>

            <div className="ml-8 flex items-center gap-4">
              <button className="relative flex h-10 w-10 items-center justify-center rounded-full text-[#3e494b] transition-colors hover:bg-[#f1f4f5]">
                <Bell size={18} />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#9b4500]" />
              </button>

              <button className="flex h-10 w-10 items-center justify-center rounded-full text-[#3e494b] transition-colors hover:bg-[#f1f4f5]">
                <CircleHelp size={18} />
              </button>

              <div className="flex items-center gap-3 border-l border-[#6e797b]/30 pl-4">
                <div className="hidden text-right sm:block">
                  <p className="text-xs font-bold text-[#181c1d]">Admin User</p>
                  <p className="text-[10px] text-[#3e494b]">
                    Quản trị hệ thống
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#007b8a] bg-white text-xs font-bold text-[#007B8A]">
                  AD
                </div>
              </div>
            </div>
          </header>

          <main className="p-8 pt-6">{children}</main>
        </div>
      </div>
    </div>
  );
}