"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { CurrentUserResponse } from "@/lib/api/auth.api";
import { uploadAvatarApi } from "@/lib/api/auth.api";

type ProfileData = NonNullable<CurrentUserResponse["data"]>;

type AppIconName =
  | "user"
  | "trip"
  | "bell"
  | "shield"
  | "card"
  | "points"
  | "edit"
  | "logout"
  | "gift";

const DEFAULT_AVATAR =
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=500&auto=format&fit=crop";

type ProfileSidebarProps = {
  profile: ProfileData | null;
};

export default function ProfileSidebar({ profile }: ProfileSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | null>(null);

  const user = profile?.user;
  const customer = profile?.customer;

  const fullName = customer?.fullName || user?.fullName || "Khách hàng";

  const avatarUrl = localAvatarUrl || user?.avatarUrl || DEFAULT_AVATAR;
  const hasAvatar = Boolean(localAvatarUrl || user?.avatarUrl);

  const rank =
  customer?.customerType === "VIP" ? "Hội viên VIP" : "Hội viên thường";

  useEffect(() => {
    setLocalAvatarUrl(user?.avatarUrl || null);
  }, [user?.avatarUrl]);

  async function handleAvatarChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      setUploadingAvatar(true);

      const result = await uploadAvatarApi(file);

      setLocalAvatarUrl(result.avatarUrl);

      window.dispatchEvent(new Event("profile-changed"));

      alert("Cập nhật avatar thành công.");
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Không cập nhật được avatar."
      );
    } finally {
      setUploadingAvatar(false);

      if (event.target) {
        event.target.value = "";
      }
    }
  }

  function handleLogout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");

    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("user");

    router.push("/login");
  }

  return (
    <aside className="w-full flex-shrink-0 lg:sticky lg:top-28 lg:h-fit lg:w-80">
      <div className="space-y-6">
        <div className="rounded-[3rem] bg-white p-8 text-center shadow-sm shadow-cyan-900/5">
          <div className="relative mx-auto mb-4 w-fit">
            <div className="h-32 w-32 overflow-hidden rounded-full border-4 border-[#9defff] shadow-lg">
              {hasAvatar ? (
                <img
                  src={avatarUrl}
                  alt={fullName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[#e5f7fa] text-4xl font-extrabold text-[#00606c]">
                  {fullName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />

            <button
              type="button"
              disabled={uploadingAvatar}
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-1 right-1 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-md transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60"
              title="Đổi ảnh đại diện"
            >
              {uploadingAvatar ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#00606c] border-t-transparent" />
              ) : (
                <AppIcon name="edit" className="h-4 w-4" />
              )}
            </button>
          </div>

          <h2 className="text-2xl font-extrabold text-slate-900">
            {fullName}
          </h2>

          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#9defff] px-4 py-1.5 text-xs font-extrabold uppercase tracking-wider text-[#001f24]">
            <AppIcon name="points" className="h-4 w-4" />
            {rank}
          </div>
        </div>

        <nav className="flex flex-col gap-1 rounded-[2rem] bg-[#f1f4f5] p-2">
          <ProfileNavItem
            active={pathname === "/profile"}
            icon="user"
            label="Thông tin cá nhân"
            href="/profile"
          />

          <ProfileNavItem
            active={pathname === "/my-bookings"}
            icon="trip"
            label="Tour đã đặt"
            href="/my-bookings"
          />

          <ProfileNavItem
            active={pathname === "/payments"}
            icon="card"
            label="Thanh toán"
            href="/payments"
          />

          <ProfileNavItem
            active={pathname === "/security"}
            icon="shield"
            label="Bảo mật"
            href="/security"
          />
          
<ProfileNavItem
  active={pathname === "/loyalty"}
  icon="gift"
  label="Điểm thưởng"
  href="/loyalty"
/>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-2 flex w-full items-center gap-4 rounded-full px-6 py-4 font-medium text-red-600 transition-all hover:bg-red-50"
          >
            <span className="flex h-5 w-5 items-center justify-center text-red-500">
              <AppIcon name="logout" className="h-[18px] w-[18px]" />
            </span>

            <span>Đăng xuất</span>
          </button>
        </nav>

        <div className="rounded-[3rem] bg-[#006f78] p-6 text-white shadow-sm">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-white/70">
            Upgrade to Pro
          </p>

          <h3 className="mb-5 text-xl font-extrabold">
            Mở khóa đặc quyền cao cấp
          </h3>

          <button
            type="button"
            className="w-full rounded-full bg-white py-3 font-bold text-[#00606c] transition hover:scale-105"
          >
            Nâng cấp ngay
          </button>
        </div>
      </div>
    </aside>
  );
}

function ProfileNavItem({
  active,
  icon,
  label,
  href,
}: {
  active?: boolean;
  icon: AppIconName;
  label: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "flex items-center gap-4 rounded-full bg-[#9defff] px-6 py-4 font-bold text-[#001f24] transition-all"
          : "flex items-center gap-4 rounded-full px-6 py-4 font-medium text-slate-700 transition-all hover:bg-[#e5e9ea]"
      }
    >
      <span className="flex h-5 w-5 items-center justify-center text-slate-700">
        <AppIcon name={icon} className="h-[18px] w-[18px]" />
      </span>

      <span>{label}</span>
    </Link>
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

    case "bell":
      return (
        <svg {...commonProps}>
          <path d="M15 17H5l1.4-1.4A2 2 0 0 0 7 14.2V11a5 5 0 1 1 10 0v3.2a2 2 0 0 0 .6 1.4L19 17h-4" />
          <path d="M10 20a2 2 0 0 0 4 0" />
        </svg>
      );

    case "shield":
      return (
        <svg {...commonProps}>
          <path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6l7-3Z" />
        </svg>
      );

    case "card":
      return (
        <svg {...commonProps}>
          <rect x="3" y="6" width="18" height="12" rx="2" />
          <path d="M3 10h18" />
          <path d="M7 14h3" />
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

    case "edit":
      return (
        <svg {...commonProps}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
        </svg>
      );
     case "gift":
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
        d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7m16 0H4m16 0V8a2 2 0 0 0-2-2h-3.17M4 12V8a2 2 0 0 1 2-2h3.17m0 0A2.83 2.83 0 1 1 12 3a2.83 2.83 0 0 1 2.83 3m-5.66 0h5.66"
      />
    </svg>
  );
      

    case "logout":
      return (
        <svg {...commonProps}>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <path d="M16 17l5-5-5-5" />
          <path d="M21 12H9" />
        </svg>
      );

    default:
      return null;
  }
}