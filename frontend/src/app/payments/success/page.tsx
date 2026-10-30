"use client";

import { useSearchParams, useRouter } from "next/navigation";
import HomeHeader from "@/components/home/HomeHeader";
import { Suspense } from "react";

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#f6fafb] text-[#181c1d]">
        <HomeHeader />
        <div className="mx-auto max-w-7xl px-4 py-40 text-center text-xl font-bold text-[#00606c]">
          Đang tải thông tin thanh toán...
        </div>
      </main>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const responseCode = searchParams.get("vnp_ResponseCode");
  const txnRef = searchParams.get("vnp_TxnRef");
  const amount = searchParams.get("vnp_Amount");
  const transactionNo = searchParams.get("vnp_TransactionNo");

  const isSuccess = responseCode === "00";

  const displayAmount = amount
    ? `${(Number(amount) / 100).toLocaleString("vi-VN")}đ`
    : "Đang cập nhật";

  return (
    <main className="min-h-screen bg-[#f6fafb] text-[#181c1d]">
      <HomeHeader />

      <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4 pt-20">
        <div className="w-full rounded-[28px] border border-[#dfe3e4] bg-white p-8 text-center shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
          <div
            className={`mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full text-4xl ${
              isSuccess
                ? "bg-green-100 text-green-600"
                : "bg-red-100 text-red-600"
            }`}
          >
            {isSuccess ? "✓" : "!"}
          </div>

          <h1 className="text-3xl font-extrabold text-[#00606c]">
            {isSuccess ? "Thanh toán thành công" : "Thanh toán thất bại"}
          </h1>

          <p className="mt-3 text-[15px] leading-7 text-[#3e494b]">
            {isSuccess
              ? "Cảm ơn bạn đã thanh toán tour qua VNPay. ChillTrip sẽ xác nhận đơn đặt của bạn trong thời gian sớm nhất."
              : "Giao dịch chưa hoàn tất hoặc đã bị hủy. Vui lòng thử lại hoặc chọn phương thức thanh toán khác."}
          </p>

          <div className="mt-8 rounded-[20px] bg-[#f6fafb] p-5 text-left text-sm">
            <InfoRow label="Mã thanh toán" value={txnRef || "Không có"} />
            <InfoRow label="Số tiền" value={displayAmount} />
            <InfoRow
              label="Mã giao dịch VNPay"
              value={transactionNo || "Không có"}
            />
            <InfoRow
              label="Trạng thái"
              value={isSuccess ? "Thành công" : "Không thành công"}
            />
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => router.push("/my-bookings")}
              className="flex-1 rounded-full bg-[#00606c] px-5 py-3 font-extrabold text-white transition hover:bg-[#007b8a]"
            >
              Xem đơn đặt tour
            </button>

            <button
              type="button"
              onClick={() => router.push("/tours")}
              className="flex-1 rounded-full border border-[#cfd8da] px-5 py-3 font-extrabold text-[#3e494b] transition hover:bg-[#f1f4f5]"
            >
              Tiếp tục xem tour
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[#e5ecee] py-3 last:border-b-0">
      <span className="text-[#3e494b]">{label}</span>
      <span className="font-bold text-[#181c1d]">{value}</span>
    </div>
  );
}