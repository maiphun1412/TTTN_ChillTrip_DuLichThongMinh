"use client";

import { ReactNode, useEffect, useState } from "react";
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
  ShieldCheck,
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

  { label: "Nhật ký hoạt động", icon: ShieldCheck, href: "/admin/privacy-logs" },
];

type AdminProfile = {
  fullName: string;
  roleName: string;
};

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "AD";
  const first = words[0][0] ?? "";
  const last = words.length > 1 ? words[words.length - 1][0] ?? "" : "";
  return (first + last).toUpperCase();
}

export default function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<AdminProfile | null>(null);

  // Hỏi backend người đang đăng nhập thật sự là ai (role lấy từ database),
  // không dựa vào "user" lưu trong localStorage vì ai cũng sửa được.
  useEffect(() => {
    let cancelled = false;

    async function checkAdmin() {
      const token =
        localStorage.getItem("access_token") ||
        sessionStorage.getItem("access_token");

      try {
        const res = await fetch("/backend-api/auth/me", {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          cache: "no-store",
        });

        if (cancelled) return;

        if (res.status === 401) {
          router.replace("/login");
          return;
        }

        const json = await res.json();
        const user = json?.data?.user;

        if (
          !res.ok ||
          !user ||
          user.status !== "ACTIVE" ||
          user.role?.code !== "ADMIN"
        ) {
          router.replace("/");
          return;
        }

        setProfile({
          fullName: user.fullName || "Quản trị viên",
          roleName: user.role?.name || "Quản trị hệ thống",
        });
      } catch {
        if (!cancelled) router.replace("/login");
      }
    }

    checkAdmin();

    return () => {
      cancelled = true;
    };
  }, [router]);

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

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6fafb] text-sm text-[#3e494b]">
        Đang kiểm tra quyền truy cập…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6fafb] text-[#181c1d]">
      <div className="flex">
        <aside className="fixed left-0 top-0 z-40 hidden h-full w-72 flex-col overflow-y-auto rounded-r-[3rem] bg-gradient-to-b from-[#006875] to-[#004a54] px-4 py-8 font-sans tracking-tight shadow-[8px_0_32px_rgba(0,74,84,0.25)] lg:flex">
          <div className="mb-8 flex items-center gap-3 px-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-lg">
              <Plane size={20} className="text-[#007b8a]" />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                ChillTrip
              </h1>
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#9fe0e6]">
                Management Portal
              </p>
            </div>
          </div>

          <nav className="flex-1 space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <a
                  key={item.label}
                  href={item.href}
                  className={`flex w-full items-center gap-4 rounded-full px-5 py-3 text-left text-[15px] transition-all duration-200 ${
                    isActive
                      ? "bg-white font-bold text-[#006875] shadow-lg shadow-black/15"
                      : "font-medium text-[#e2f5f7] hover:bg-white/12 hover:text-white"
                  }`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </a>
              );
            })}
          </nav>

          <div className="mt-6 space-y-1.5 border-t border-white/15 pt-6">
            <button className="flex w-full items-center gap-4 rounded-full px-5 py-3 text-left text-[15px] font-medium text-[#e2f5f7] transition-all duration-200 hover:bg-white/12 hover:text-white">
              <Settings size={20} />
              <span>Cài đặt</span>
            </button>

            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-4 rounded-full px-5 py-3 text-left text-[15px] font-medium text-[#ffd9c2] transition-all duration-200 hover:bg-white/12 hover:text-white"
            >
              <LogOut size={20} />
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
                  <p className="text-xs font-bold text-[#181c1d]">
                    {profile.fullName}
                  </p>
                  <p className="text-[10px] text-[#3e494b]">
                    {profile.roleName}
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#007b8a] bg-white text-xs font-bold text-[#007B8A]">
                  {getInitials(profile.fullName)}
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