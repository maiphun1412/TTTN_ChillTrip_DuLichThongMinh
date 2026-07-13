"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!email.trim()) {
      setErrorMessage("Vui lòng nhập email.");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");

      const res = await fetch("/backend-api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setErrorMessage(json.message || "Không thể gửi mã OTP.");
        return;
      }

      router.push(`/reset-password?email=${encodeURIComponent(email.trim())}`);
    } catch (error) {
      console.error("Forgot password error:", error);
      setErrorMessage("Không thể kết nối máy chủ.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f9f9fc] px-4 text-[#2f3337]">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-[28px] bg-white p-8 shadow-[0_18px_45px_rgba(15,23,42,0.08)]"
      >
        <h1 className="text-3xl font-extrabold text-[#00687f]">
          Quên mật khẩu
        </h1>

        <p className="mt-3 text-sm leading-6 text-[#5c5f64]">
          Nhập email đã đăng ký. ChillTrip sẽ gửi mã OTP để bạn đặt lại mật
          khẩu.
        </p>

        <div className="mt-6">
          <label className="mb-2 block text-sm font-semibold text-[#2f3337]">
            Email
          </label>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@chilltrip.vn"
            className="w-full rounded-2xl border-none bg-[#e0e3e7] px-4 py-4 text-[#2f3337] placeholder:text-[#777b7f]/60 focus:bg-white focus:ring-2 focus:ring-[#00687f]/40"
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
          {loading ? "Đang gửi mã..." : "Gửi mã OTP"}
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