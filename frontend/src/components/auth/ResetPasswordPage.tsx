"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialEmail = searchParams.get("email") || "";

  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!email.trim()) {
      setErrorMessage("Vui lòng nhập email.");
      return;
    }

    if (!otp.trim()) {
      setErrorMessage("Vui lòng nhập mã OTP.");
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Mật khẩu nhập lại không khớp.");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");

      const res = await fetch("/backend-api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          otp: otp.trim(),
          newPassword,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setErrorMessage(json.message || "Đặt lại mật khẩu thất bại.");
        return;
      }

      alert("Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.");
      router.push("/login");
    } catch (error) {
      console.error("Reset password error:", error);
      setErrorMessage("Không thể kết nối máy chủ.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f9f9fc] px-4 text-[#2f3337]">
      <form
        onSubmit={handleReset}
        className="w-full max-w-md rounded-[28px] bg-white p-8 shadow-[0_18px_45px_rgba(15,23,42,0.08)]"
      >
        <h1 className="text-3xl font-extrabold text-[#00687f]">
          Đặt lại mật khẩu
        </h1>

        <p className="mt-3 text-sm leading-6 text-[#5c5f64]">
          Nhập mã OTP đã gửi qua email và tạo mật khẩu mới.
        </p>

        <div className="mt-6 space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="example@chilltrip.vn"
          />

          <Input
            label="Mã OTP"
            value={otp}
            onChange={setOtp}
            placeholder="Nhập mã OTP"
          />

          <Input
            label="Mật khẩu mới"
            type="password"
            value={newPassword}
            onChange={setNewPassword}
            placeholder="••••••••"
          />

          <Input
            label="Nhập lại mật khẩu"
            type="password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="••••••••"
          />
        </div>

        {errorMessage ? (
          <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            {errorMessage}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-full bg-[#00687f] py-4 text-lg font-bold text-white shadow-[0_10px_30px_rgba(0,104,127,0.2)] transition-all hover:bg-[#005b70] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Đang đặt lại..." : "Đặt lại mật khẩu"}
        </button>

        <Link
          href="/login"
          className="mt-5 block text-center text-sm font-semibold text-[#00687f] hover:underline"
        >
          Quay lại đăng nhập
        </Link>
      </form>
    </main>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-[#2f3337]">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border-none bg-[#e0e3e7] px-4 py-4 text-[#2f3337] placeholder:text-[#777b7f]/60 focus:bg-white focus:ring-2 focus:ring-[#00687f]/40"
      />
    </div>
  );
}