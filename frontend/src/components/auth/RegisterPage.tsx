"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [showOtpBox, setShowOtpBox] = useState(false);
  const [otp, setOtp] = useState("");
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!fullName.trim()) {
      setErrorMessage("Vui lòng nhập họ và tên.");
      return;
    }

    if (!email.trim()) {
      setErrorMessage("Vui lòng nhập email để nhận mã OTP.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Mật khẩu nhập lại không khớp.");
      return;
    }

    if (!acceptedTerms) {
      setErrorMessage("Vui lòng đồng ý điều khoản dịch vụ.");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      const res = await fetch("/backend-api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setErrorMessage(json.message || "Đăng ký thất bại.");
        return;
      }

      const verifyEmail = json.data?.email || email.trim();

      setRegisteredEmail(verifyEmail);
      setShowOtpBox(true);
      setSuccessMessage(
        "Mã OTP đã được gửi đến email của bạn. Vui lòng kiểm tra và xác nhận."
      );
    } catch (error) {
      console.error("Register error:", error);
      setErrorMessage("Không thể kết nối máy chủ.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    if (!registeredEmail.trim()) {
      setErrorMessage("Không tìm thấy email đăng ký.");
      return;
    }

    if (!otp.trim()) {
      setErrorMessage("Vui lòng nhập mã OTP.");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");

      const res = await fetch("/backend-api/auth/verify-register-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
       body: JSON.stringify({
  fullName: fullName.trim(),
  email: registeredEmail.trim(),
  phone: phone.trim(),
  password,
  otp: otp.trim(),
}),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setErrorMessage(json.message || "Xác thực OTP thất bại.");
        return;
      }

      const token = json.data?.token;
const user = json.data?.user;

localStorage.removeItem("access_token");
localStorage.removeItem("user");
localStorage.removeItem("customerId");
sessionStorage.removeItem("access_token");
sessionStorage.removeItem("user");
sessionStorage.removeItem("customerId");

if (token) {
  localStorage.setItem("access_token", token);
}

if (user) {
  localStorage.setItem("user", JSON.stringify(user));
}

router.push("/");
    } catch (error) {
      console.error("Verify OTP error:", error);
      setErrorMessage("Không thể kết nối máy chủ.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#f9f9fc] text-[#2f3337]">
      <div className="flex min-h-screen flex-1 flex-col md:flex-row">
        <section className="relative hidden overflow-hidden md:flex md:w-1/2">
          <div className="absolute inset-0 z-0">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAoIlnY0-9szBZCaSzZiTPrZCep64awZ2VwKsAIIMINOimMkCjUcpmdVBVRy07ATYsm0d1x1fK_YioSjXuVWgF-WoGtlq8t-2uTvJQXxIMskMibaOfjK5QC1Ko5gdk_61LH7q_ef_hz5R9_OhDnQ8mcbl67jX9nJjzqJjkUAI_TDtbsoMnW9lRPJrKO4fUPiLz-C7tn5sjFhhT3FvhWQdJJdkGHH5u_AicJPayMlMfuwo5TQCjhrIPA7fGXe4Ngvu0mPNULUiYGoTx2"
              alt="Tropical Beach"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-[#00687f]/40 to-transparent" />
          </div>

          <div className="relative z-10 flex h-full flex-col justify-end p-16">
            <div className="max-w-md rounded-[28px] bg-white/70 p-8 backdrop-blur-[20px]">
              <h2 className="mb-4 text-4xl font-extrabold leading-tight tracking-tight text-white">
                Bắt đầu hành trình thư thái của bạn.
              </h2>

              <p className="text-lg font-light leading-relaxed text-white/90">
                Tham gia cùng ChillTrip để khám phá những điểm đến tuyệt vời
                nhất và trải nghiệm kỳ nghỉ theo cách riêng của bạn.
              </p>

              <div className="mt-8 flex items-center gap-4">
                <div className="flex -space-x-3">
                  <AvatarImage src="https://lh3.googleusercontent.com/aida-public/AB6AXuAbpwF1wvXzFxgXbHlkXUUouk6GAPrF0ahANUvV7tjIAI8MkipDQYBSUkYuakUS871_OC49TqQ5xAFL3dZmqd4srZ7SYYF9PJ1ZLz6QGYH7WcEwq5j45rR1BKh7p6hmj0HcbETCSpJNrp1PnBeZizj7nPV1WrRKUClprPbele6tue81tE-VJtsw0ej6UDc5fATNdXYY7UuXUOjWOUGLxTUzK7rGUF1y7R3_odElZDmVjqTScjmHbZ2bPapoEb-68QvrfLiIoMtLyvGp" />
                  <AvatarImage src="https://lh3.googleusercontent.com/aida-public/AB6AXuCFkceVNrlv2SDSmqeDeEOK_eO8jb54WbNEfmTAzgFFYSPnXODXxVYYPnvyOi8LqLtqce6H295VTIQLkeSyGGgqJ5U09jlhA9RH5pwEEpS2-jv9upCQi0Zclzgfh56DZ_eYx7nzGW3QUIvVaX7OpH4_JT9OWZQS9aypsk95Tw4CmiPXPMFVXWAH7QfUOTW4eJe0rgtwmWL4MhY5WWD8xWcce3kQYKGYSTASyNChQz7iT_f9VZS-B_FOLGsndSF9DizLm_tH5PEowgYR" />
                  <AvatarImage src="https://lh3.googleusercontent.com/aida-public/AB6AXuDmXOiFDYwU-DRhz-WPI8fHm0kerq8cyO8wURobP2eFJXUKJhIDUqOBFzXlBv5HYzOPy8KDXn1WPD9n2LgSKCMpGtyEmUMAyBoqXm9fom1J2WN3Q4XYcGZb1PRguJayL5WV-J3tZd73owIYx0hfPAXoD7480k878a5JLfhCE7lGyOd0z1QKS2ZzLfWsc3rbeEO3Px3AV-6FpQh_fxZME299BfhGJg2NBB-9d23QvRVs_v_N_7jXCQAHSUy2fNzl9GjznkXJhMN96lVw" />
                </div>

                <span className="text-sm font-medium text-white">
                  +2,500 người đã tham gia tuần này
                </span>
              </div>
            </div>
          </div>

          <div className="absolute left-12 top-12 z-20">
            <span className="text-3xl font-extrabold tracking-tighter text-white">
              ChillTrip
            </span>
          </div>
        </section>

        <section className="flex w-full items-center justify-center bg-[#f9f9fc] p-8 md:w-1/2 md:p-16">
          <div className="w-full max-w-md">
            <div className="mb-8 text-center md:hidden">
              <span className="text-3xl font-extrabold tracking-tighter text-[#00687f]">
                ChillTrip
              </span>
            </div>

            <div className="mb-10 text-center">
              <h1 className="mb-2 text-3xl font-bold tracking-tight text-[#2f3337]">
                Tạo tài khoản mới
              </h1>
              <p className="font-light text-[#5c5f64]">
                Chào mừng bạn! Hãy điền thông tin bên dưới để bắt đầu.
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleRegister}>
              <Field label="Họ và tên" icon="person">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  disabled={showOtpBox}
                  className="w-full rounded-2xl border-none bg-[#e0e3e7] py-4 pl-12 pr-4 text-[#2f3337] placeholder:text-[#777b7f]/60 focus:bg-white focus:ring-2 focus:ring-[#00687f]/40 disabled:opacity-70"
                />
              </Field>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Field label="Email" icon="mail">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@chilltrip.vn"
                    disabled={showOtpBox}
                    className="w-full rounded-2xl border-none bg-[#e0e3e7] py-4 pl-12 pr-4 text-[#2f3337] placeholder:text-[#777b7f]/60 focus:bg-white focus:ring-2 focus:ring-[#00687f]/40 disabled:opacity-70"
                  />
                </Field>

                <Field label="Số điện thoại" icon="call">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="09xx xxx xxx"
                    disabled={showOtpBox}
                    className="w-full rounded-2xl border-none bg-[#e0e3e7] py-4 pl-12 pr-4 text-[#2f3337] placeholder:text-[#777b7f]/60 focus:bg-white focus:ring-2 focus:ring-[#00687f]/40 disabled:opacity-70"
                  />
                </Field>
              </div>

              <Field label="Mật khẩu" icon="lock">
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={showOtpBox}
                    className="w-full rounded-2xl border-none bg-[#e0e3e7] py-4 pl-12 pr-12 text-[#2f3337] placeholder:text-[#777b7f]/60 focus:bg-white focus:ring-2 focus:ring-[#00687f]/40 disabled:opacity-70"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5c5f64] transition-colors hover:text-[#00687f]"
                  >
                    <span className="material-symbols-outlined">
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </Field>

              <Field label="Nhập lại mật khẩu" icon="shield_lock">
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={showOtpBox}
                  className="w-full rounded-2xl border-none bg-[#e0e3e7] py-4 pl-12 pr-4 text-[#2f3337] placeholder:text-[#777b7f]/60 focus:bg-white focus:ring-2 focus:ring-[#00687f]/40 disabled:opacity-70"
                />
              </Field>

              {errorMessage ? (
                <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                  {errorMessage}
                </div>
              ) : null}

              {successMessage ? (
                <div className="rounded-2xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
                  {successMessage}
                </div>
              ) : null}

              {showOtpBox ? (
                <div className="rounded-[24px] border border-[#00687f]/20 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-extrabold text-[#00687f]">
                    Xác nhận email
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-[#5c5f64]">
                    Nhập mã OTP đã gửi đến email{" "}
                    <b>{registeredEmail}</b>.
                  </p>

                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Nhập mã OTP"
                    className="mt-4 w-full rounded-2xl border-none bg-[#e0e3e7] px-4 py-4 text-center text-xl font-bold tracking-[0.4em] text-[#2f3337] placeholder:text-sm placeholder:tracking-normal focus:bg-white focus:ring-2 focus:ring-[#00687f]/40"
                  />

                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={loading}
                    className="mt-4 w-full rounded-full bg-[#00687f] py-3 text-base font-bold text-white transition-all hover:bg-[#005b70] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? "Đang xác nhận..." : "Xác nhận OTP"}
                  </button>
                </div>
              ) : null}

              <div className="flex items-start gap-3 py-2">
                <input
                  id="terms"
                  type="checkbox"
                  checked={acceptedTerms}
                  disabled={showOtpBox}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-1 rounded border-[#afb2b7] text-[#00687f] focus:ring-[#00687f] disabled:opacity-70"
                />
                <label
                  htmlFor="terms"
                  className="text-xs leading-relaxed text-[#5c5f64]"
                >
                  Tôi đồng ý với{" "}
                  <a
                    href="#"
                    className="font-semibold text-[#00687f] hover:underline"
                  >
                    Điều khoản dịch vụ
                  </a>{" "}
                  và{" "}
                  <a
                    href="#"
                    className="font-semibold text-[#00687f] hover:underline"
                  >
                    Chính sách bảo mật
                  </a>{" "}
                  của ChillTrip.
                </label>
              </div>

              <button
                type="submit"
                disabled={loading || showOtpBox}
                className="mt-4 w-full rounded-full bg-[#00687f] py-4 text-lg font-bold text-[#f1faff] shadow-[0_10px_30px_rgba(0,104,127,0.2)] transition-all hover:bg-[#005b70] hover:shadow-none active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? "Đang đăng ký..."
                  : showOtpBox
                    ? "Đã gửi mã OTP"
                    : "Đăng ký ngay"}
              </button>

              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#e0e3e7]" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-[#f9f9fc] px-4 font-medium uppercase tracking-widest text-[#5c5f64]">
                    Hoặc đăng ký bằng
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  className="flex items-center justify-center gap-2 rounded-2xl border border-[#afb2b7]/30 bg-white px-4 py-3 text-sm font-medium transition-colors hover:bg-[#f3f3f6]"
                >
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAbNmEm80ICvfT1ZQnWNTxDZIGo0UVDw3q9khZ8NzvzjbJ24-shbWOoKMyUKfQ2zDuZS7yrcBhFs_crWpU8KEPam4DaC265SM5M4YIAsftm7CaULTkrMY6u2ScF1LCaYWbJ-841-nU3NG7PAjTz6gLwT_pamryl2bZsWA5Kq4x2gpU6oylCOyQ7gu-1v2v0o7WuDYwwF6RrK7BYGI3n45cNrCKdw47V8E3LwHJLqU-GrBwhYj6PxYh9I0OCO1jhAJ9PBdPEdMWFvIan"
                    alt="Google"
                    className="h-4 w-4"
                  />
                  <span>Google</span>
                </button>

                <button
                  type="button"
                  className="flex items-center justify-center gap-2 rounded-2xl bg-[#1877F2] px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
                >
                  <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  <span>Facebook</span>
                </button>
              </div>

              <p className="mt-8 text-center text-sm text-[#5c5f64]">
                Đã có tài khoản?{" "}
                <Link
                  href="/login"
                  className="font-bold text-[#00687f] underline decoration-2 underline-offset-4 hover:no-underline"
                >
                  Đăng nhập ngay
                </Link>
              </p>
            </form>
          </div>
        </section>
      </div>

      <footer className="flex w-full flex-col items-center justify-between gap-4 bg-slate-50 px-8 py-8 text-xs tracking-wide text-slate-500 md:flex-row">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-cyan-900">ChillTrip</span>
          <span>© 2024. Chuyến đi của sự thư thái.</span>
        </div>

        <div className="flex gap-6">
          <a href="#" className="transition-all hover:text-orange-600">
            Quyền riêng tư
          </a>
          <a href="#" className="transition-all hover:text-orange-600">
            Điều khoản
          </a>
          <a href="#" className="transition-all hover:text-orange-600">
            Hỗ trợ
          </a>
        </div>
      </footer>
    </main>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="ml-1 text-sm font-semibold text-[#2f3337]">
        {label}
      </label>
      <div className="group relative">
        <span className="material-symbols-outlined absolute left-4 top-1/2 z-10 -translate-y-1/2 text-[#5c5f64] transition-colors group-focus-within:text-[#00687f]">
          {icon}
        </span>
        {children}
      </div>
    </div>
  );
}

function AvatarImage({ src }: { src: string }) {
  return (
    <div className="h-10 w-10 overflow-hidden rounded-full border-2 border-white bg-white">
      <img
        src={src}
        alt="Traveler avatar"
        className="h-full w-full object-cover"
      />
    </div>
  );
}