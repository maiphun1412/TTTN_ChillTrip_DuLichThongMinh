"use client";

import { useEffect, useState } from "react";
import HomeHeader from "@/components/home/HomeHeader";
import ProfileSidebar from "@/components/profile/ProfileSidebar";
import { getCurrentUserApi, type CurrentUserResponse } from "@/lib/api/auth.api";

type ProfileData = NonNullable<CurrentUserResponse["data"]>;

export default function SecurityPage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        const data = await getCurrentUserApi();
        setProfile(data);
      } catch (error) {
        console.error("Load security profile error:", error);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  async function handleChangePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setMessage("");
    setMessageType("");

    if (!currentPassword.trim()) {
      setMessage("Vui lòng nhập mật khẩu hiện tại.");
      setMessageType("error");
      return;
    }

    if (newPassword.length < 6) {
      setMessage("Mật khẩu mới phải có ít nhất 6 ký tự.");
      setMessageType("error");
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage("Mật khẩu xác nhận không khớp.");
      setMessageType("error");
      return;
    }

    try {
      setSubmitting(true);

      const token =
        localStorage.getItem("access_token") ||
        sessionStorage.getItem("access_token");

      if (!token) {
        throw new Error("Chưa đăng nhập");
      }

      const res = await fetch("/backend-api/auth/change-password", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Đổi mật khẩu thất bại");
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setMessage("Đổi mật khẩu thành công.");
      setMessageType("success");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Không thể đổi mật khẩu";

      setMessage(errorMessage);
      setMessageType("error");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f6fafb] text-[#181c1d]">
        <HomeHeader />

        <div className="mx-auto max-w-[1500px] px-4 pb-24 pt-28 md:px-8">
          <div className="rounded-[3rem] bg-white p-10 text-center shadow-sm">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#e5e9ea] border-t-[#00606c]" />
            <p className="mt-5 font-semibold text-slate-600">
              Đang tải trang bảo mật...
            </p>
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
                Bảo mật tài khoản
              </h1>

              <p className="max-w-2xl text-[16px] leading-8 text-[#3e494b]">
                Quản lý mật khẩu, kiểm tra trạng thái tài khoản và tăng cường
                bảo vệ thông tin cá nhân của bạn.
              </p>
            </section>

            <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <SecurityStatCard
                title="Trạng thái"
                value={profile?.user?.status || "ACTIVE"}
                desc="Tài khoản đang hoạt động"
                icon="shield"
              />

              <SecurityStatCard
                title="Vai trò"
                value={profile?.user?.role?.name || "Khách hàng"}
                desc="Quyền truy cập hiện tại"
                icon="user"
              />

              <SecurityStatCard
                title="Đăng nhập gần nhất"
                value={
                  profile?.user?.lastLoginAt
                    ? new Date(profile.user.lastLoginAt).toLocaleDateString(
                        "vi-VN"
                      )
                    : "Chưa cập nhật"
                }
                desc="Theo dõi hoạt động tài khoản"
                icon="clock"
              />
            </section>

            <section className="rounded-[3rem] bg-white p-6 shadow-sm shadow-cyan-900/5 md:p-10">
              <div className="mb-8 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
                    Đổi mật khẩu
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">
                    Để bảo vệ tài khoản, hãy sử dụng mật khẩu đủ mạnh và không
                    chia sẻ mật khẩu với người khác.
                  </p>
                </div>

                <div className="hidden rounded-full bg-[#dff8fb] p-4 text-[#00606c] md:block">
                  <ShieldIcon />
                </div>
              </div>

              {message ? (
                <div
                  className={`mb-6 rounded-2xl px-5 py-4 text-sm font-bold ${
                    messageType === "success"
                      ? "bg-green-50 text-green-700"
                      : "bg-red-50 text-red-600"
                  }`}
                >
                  {message}
                </div>
              ) : null}

              <form className="space-y-6" onSubmit={handleChangePassword}>
                <PasswordField
                  label="Mật khẩu hiện tại"
                  value={currentPassword}
                  onChange={setCurrentPassword}
                  show={showCurrent}
                  onToggleShow={() => setShowCurrent((prev) => !prev)}
                  placeholder="Nhập mật khẩu hiện tại"
                />

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <PasswordField
                    label="Mật khẩu mới"
                    value={newPassword}
                    onChange={setNewPassword}
                    show={showNew}
                    onToggleShow={() => setShowNew((prev) => !prev)}
                    placeholder="Nhập mật khẩu mới"
                  />

                  <PasswordField
                    label="Xác nhận mật khẩu mới"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    show={showConfirm}
                    onToggleShow={() => setShowConfirm((prev) => !prev)}
                    placeholder="Nhập lại mật khẩu mới"
                  />
                </div>

                <PasswordHint />

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-full bg-gradient-to-r from-[#9b4500] to-[#fc8a40] px-10 py-4 text-base font-extrabold text-white shadow-lg transition hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
                  </button>
                </div>
              </form>
            </section>

            <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <SecurityOptionCard
                title="Xác thực hai lớp"
                desc="Tăng cường bảo mật khi đăng nhập bằng mã xác minh bổ sung."
                status="Chưa bật"
              />

              <SecurityOptionCard
                title="Thiết bị đăng nhập"
                desc="Kiểm tra và quản lý các thiết bị đã từng đăng nhập tài khoản."
                status="Đang theo dõi"
              />
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  show,
  onToggleShow,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggleShow: () => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-2">
      <label className="ml-2 text-xs font-extrabold uppercase tracking-wider text-slate-700">
        {label}
      </label>

      <div className="relative">
        <span className="absolute left-4 top-1/2 flex -translate-y-1/2 text-slate-500">
          <LockIcon />
        </span>

        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-full border-none bg-[#eef2f3] py-4 pl-11 pr-14 text-sm font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:ring-2 focus:ring-[#00606c]"
        />

        <button
          type="button"
          onClick={onToggleShow}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-[#00606c]"
        >
          {show ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </div>
  );
}

function PasswordHint() {
  return (
    <div className="rounded-[2rem] bg-[#f1f4f5] p-5">
      <p className="mb-3 text-sm font-extrabold text-[#00606c]">
        Gợi ý mật khẩu an toàn
      </p>

      <ul className="space-y-2 text-sm leading-6 text-[#3e494b]">
        <li>• Tối thiểu 6 ký tự, nên có chữ hoa, chữ thường và số.</li>
        <li>• Không dùng ngày sinh, số điện thoại hoặc tên cá nhân.</li>
        <li>• Không chia sẻ mật khẩu qua tin nhắn hoặc email.</li>
      </ul>
    </div>
  );
}

function SecurityStatCard({
  title,
  value,
  desc,
  icon,
}: {
  title: string;
  value: string;
  desc: string;
  icon: "shield" | "user" | "clock";
}) {
  return (
    <div className="flex min-h-[92px] items-center gap-4 rounded-[2rem] bg-white px-6 py-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#dff8fb] text-[#00606c]">
        {icon === "shield" ? (
          <ShieldIcon />
        ) : icon === "user" ? (
          <UserIcon />
        ) : (
          <ClockSmallIcon />
        )}
      </div>

      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-slate-500">{title}</p>
        <p className="mt-1 truncate text-sm font-extrabold text-[#00606c]">
          {value}
        </p>
        <p className="mt-1 text-xs text-slate-500">{desc}</p>
      </div>
    </div>
  );
}

function SecurityOptionCard({
  title,
  desc,
  status,
}: {
  title: string;
  desc: string;
  status: string;
}) {
  return (
    <div className="rounded-[3rem] bg-white p-7 shadow-sm shadow-cyan-900/5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-extrabold text-slate-900">{title}</h3>
          <p className="mt-2 text-sm leading-7 text-slate-500">{desc}</p>
        </div>

        <span className="shrink-0 rounded-full bg-[#9defff] px-4 py-1.5 text-xs font-extrabold text-[#001f24]">
          {status}
        </span>
      </div>

      <button
        type="button"
        className="rounded-full bg-[#00606c]/10 px-6 py-3 text-sm font-bold text-[#00606c] transition hover:bg-[#00606c] hover:text-white"
      >
        Quản lý
      </button>
    </div>
  );
}

function LockIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6A2 2 0 0 0 12 14a2 2 0 0 0 1.4-.6" />
      <path d="M9.9 4.2A9.8 9.8 0 0 1 12 4c6.5 0 10 8 10 8a18.5 18.5 0 0 1-3.2 4.5" />
      <path d="M6.6 6.6C3.6 8.6 2 12 2 12s3.5 8 10 8a9.8 9.8 0 0 0 4.1-.9" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      className="h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6l7-3Z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function ClockSmallIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}