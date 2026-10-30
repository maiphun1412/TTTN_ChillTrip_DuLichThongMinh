import { Suspense } from "react";
import ResetPasswordPage from "@/components/auth/ResetPasswordPage";

export default function ResetPasswordRoute() {
  return (
    <Suspense fallback={
      <div className="mx-auto max-w-7xl px-4 py-40 text-center text-xl font-bold text-[#00606c]">
        Đang tải trang đặt lại mật khẩu...
      </div>
    }>
      <ResetPasswordPage />
    </Suspense>
  );
}