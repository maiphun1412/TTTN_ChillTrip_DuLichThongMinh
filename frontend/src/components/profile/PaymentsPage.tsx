"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import HomeHeader from "@/components/home/HomeHeader";
import ProfileSidebar from "@/components/profile/ProfileSidebar";
import { getCurrentUserApi, type CurrentUserResponse } from "@/lib/api/auth.api";

type ProfileData = NonNullable<CurrentUserResponse["data"]>;

type TabKey = "PAYMENTS" | "DEBTS" | "REFUNDS";

type PaymentItem = {
  id: string;
  paymentCode: string;
  paymentMethod: string;
  amount: string | number;
  paymentStatus: string;
  transactionCode?: string | null;
  proofUrl?: string | null;
  paidAt?: string | null;
  createdAt?: string | null;
  bookingId: string;
  bookingCode: string;
  bookingStatus: string;
  tourId: string;
  tourName: string;
  tourCode: string;
    paymentType?: string | null;
  bookingType?: string | null;
};

type DebtItem = {
  id: string;
  totalAmount: string | number;
  paidAmount: string | number;
  remainingAmount: string | number;
  dueDate?: string | null;
  debtStatus: string;
  notes?: string | null;
  updatedAt?: string | null;
  bookingId: string;
  bookingCode: string;
  bookingStatus: string;
  tourId: string;
  tourName: string;
  tourCode: string;
  startDate?: string | null;
  endDate?: string | null;
  cancellationRequestId?: string | null;
  cancellationRequestStatus?: string | null;
  cancellationRequestedAt?: string | null;
    bookingType?: string | null;
};

type RefundItem = {
  cancellationRequestId: string;
  reason?: string | null;
  requestStatus: string;
  requestedAt?: string | null;
  processedAt?: string | null;
  refundId?: string | null;
  refundCode?: string | null;
  refundAmount?: string | number | null;
  cancellationFeeAmount?: string | number | null;
  refundStatus?: string | null;
  refundMethod?: string | null;
  refundAt?: string | null;
  refundNotes?: string | null;
  bookingId: string;
  bookingCode: string;
  bookingStatus: string;
  tourId: string;
  tourName: string;
  tourCode: string;
};

function formatPrice(price?: string | number | null) {
  return `${Number(price || 0).toLocaleString("vi-VN")}đ`;
}

function formatDate(date?: string | null) {
  if (!date) return "Chưa cập nhật";
  return new Date(date).toLocaleDateString("vi-VN");
}

function canCancelBooking(item: DebtItem) {
  if (!item.startDate) return false;
  if (item.cancellationRequestId) return false;
  if (["CANCELLED", "COMPLETED"].includes(item.bookingStatus)) return false;

  const startDate = new Date(item.startDate);
  const now = new Date();

  return startDate.getTime() > now.getTime();
}

function paymentMethodText(method?: string) {
  switch (method) {
    case "BANK_TRANSFER":
      return "Chuyển khoản";
    case "CARD":
      return "Thẻ ngân hàng";
    case "CASH":
      return "Tiền mặt";
    case "PAY_LATER":
      return "Thanh toán sau";
    default:
      return method || "Chưa cập nhật";
  }
}
function paymentTypeText(type?: string | null) {
  switch (type) {
    case "DEPOSIT":
      return "Tiền cọc";
    case "FINAL_PAYMENT":
      return "Thanh toán còn lại";
    case "FULL_PAYMENT":
      return "Thanh toán toàn bộ";
    case "REFUND":
      return "Hoàn tiền";
    default:
      return "Thanh toán";
  }
}

function paymentStatusText(status?: string) {
  switch (status) {
    case "PENDING":
      return "Chờ thanh toán";
    case "PAID":
      return "Đã thanh toán";
    case "FAILED":
      return "Thất bại";
    case "REFUNDED":
      return "Đã hoàn tiền";
    default:
      return status || "Chưa cập nhật";
  }
}

function debtStatusText(status?: string) {
  switch (status) {
    case "UNPAID":
      return "Chưa thanh toán";
    case "PARTIAL":
      return "Thanh toán một phần";
    case "PAID":
      return "Đã thanh toán";
    case "OVERDUE":
      return "Quá hạn";
    default:
      return status || "Chưa cập nhật";
  }
}

function requestStatusText(status?: string) {
  switch (status) {
    case "PENDING":
      return "Chờ xử lý";
    case "APPROVED":
      return "Đã duyệt";
    case "REJECTED":
      return "Từ chối";
    case "CANCELLED":
      return "Đã hủy";
    default:
      return status || "Chưa cập nhật";
  }
}

function cancellationStatusText(status?: string | null) {
  switch (status) {
    case "PENDING":
      return "Đã gửi yêu cầu hủy";
    case "APPROVED":
      return "Yêu cầu hủy đã duyệt";
    case "REJECTED":
      return "Yêu cầu hủy bị từ chối";
    case "CANCELLED":
      return "Yêu cầu hủy đã hủy";
    default:
      return "";
  }
}

function badgeClass(status?: string | null) {
  switch (status) {
    case "PAID":
    case "APPROVED":
      return "bg-[#dff7e8] text-[#14532d]";
    case "PENDING":
    case "UNPAID":
    case "PARTIAL":
      return "bg-[#ffdbc9] text-[#331200]";
    case "FAILED":
    case "REJECTED":
    case "OVERDUE":
      return "bg-[#ffdad6] text-[#93000a]";
    case "REFUNDED":
      return "bg-[#9defff] text-[#001f24]";
    default:
      return "bg-[#ebeeef] text-[#3e494b]";
  }
}

export default function PaymentsPage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [debts, setDebts] = useState<DebtItem[]>([]);
  const [refunds, setRefunds] = useState<RefundItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("PAYMENTS");
  const [payingDebtId, setPayingDebtId] = useState<string | null>(null);
  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null);

  async function loadData() {
    try {
      setLoading(true);

      const token =
        localStorage.getItem("access_token") ||
        sessionStorage.getItem("access_token");

      if (!token) {
        throw new Error("Chưa đăng nhập");
      }

      const [profileData, paymentsRes, debtsRes, refundsRes] =
        await Promise.all([
          getCurrentUserApi(),
          fetch("/backend-api/payments/me", {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          }),
          fetch("/backend-api/debts/me", {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          }),
          fetch("/backend-api/refunds/me", {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          }),
        ]);

      const paymentsJson = await paymentsRes.json();
      const debtsJson = await debtsRes.json();
      const refundsJson = await refundsRes.json();

      if (!paymentsRes.ok || !paymentsJson.success) {
        throw new Error(paymentsJson.message || "Không lấy được thanh toán");
      }

      if (!debtsRes.ok || !debtsJson.success) {
        throw new Error(debtsJson.message || "Không lấy được công nợ");
      }

      if (!refundsRes.ok || !refundsJson.success) {
        throw new Error(refundsJson.message || "Không lấy được hoàn hủy");
      }

      setProfile(profileData);
      setPayments(paymentsJson.data || []);
      setDebts(debtsJson.data || []);
      setRefunds(refundsJson.data || []);
    } catch (error) {
      console.error("Load payments page error:", error);
      setProfile(null);
      setPayments([]);
      setDebts([]);
      setRefunds([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handlePayDebt(item: DebtItem) {
    try {
      const token =
        localStorage.getItem("access_token") ||
        sessionStorage.getItem("access_token");

      if (!token) {
        alert("Vui lòng đăng nhập");
        return;
      }

      const amount = Number(item.remainingAmount || 0);

      if (amount <= 0) {
        alert("Công nợ này đã được thanh toán đủ.");
        return;
      }

      const confirmed = window.confirm(
        `Xác nhận tạo thanh toán cho số tiền còn lại: ${formatPrice(amount)}?`
      );

      if (!confirmed) return;

      setPayingDebtId(item.id);

      const res = await fetch("/backend-api/payments/pay-debt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          debtId: item.id,
          amount,
          paymentMethod: "BANK_TRANSFER",
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        alert(json.message || "Không thể tạo thanh toán");
        return;
      }

      alert(json.message || "Đã tạo yêu cầu thanh toán");
      await loadData();
      setActiveTab("PAYMENTS");
    } catch (error) {
      console.error("Pay debt error:", error);
      alert("Có lỗi khi tạo thanh toán công nợ");
    } finally {
      setPayingDebtId(null);
    }
  }

  async function handleCancelBooking(item: DebtItem) {
    try {
      const token =
        localStorage.getItem("access_token") ||
        sessionStorage.getItem("access_token");

      if (!token) {
        alert("Vui lòng đăng nhập");
        return;
      }

      if (!canCancelBooking(item)) {
        alert("Tour này không đủ điều kiện gửi yêu cầu hủy online.");
        return;
      }

      const reason = window.prompt(
        "Nhập lý do hủy tour:",
        "Tôi muốn hủy tour này"
      );

      if (reason === null) return;

      const confirmed = window.confirm(
        "Xác nhận gửi yêu cầu hủy tour? ChillTrip sẽ kiểm tra chính sách hoàn tiền trước khi xử lý."
      );

      if (!confirmed) return;

      setCancelBookingId(item.bookingId);

      const res = await fetch("/backend-api/cancellation-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bookingId: item.bookingId,
          reason,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        alert(json.message || "Không thể gửi yêu cầu hủy tour");
        return;
      }

      alert(json.message || "Đã gửi yêu cầu hủy tour");
      await loadData();
      setActiveTab("REFUNDS");
    } catch (error) {
      console.error("Cancel booking error:", error);
      alert("Có lỗi khi gửi yêu cầu hủy tour");
    } finally {
      setCancelBookingId(null);
    }
  }

  const summary = useMemo(() => {
    const paidAmount = payments
      .filter((item) => item.paymentStatus === "PAID")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const remainingDebt = debts.reduce(
      (sum, item) => sum + Number(item.remainingAmount || 0),
      0
    );

    const pendingRefunds = refunds.filter(
      (item) => item.requestStatus === "PENDING"
    ).length;

    return {
      paidAmount,
      remainingDebt,
      pendingRefunds,
    };
  }, [payments, debts, refunds]);

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
                Thanh toán
              </h1>

              <p className="max-w-3xl text-[16px] leading-8 text-[#3e494b]">
                Theo dõi lịch sử thanh toán, công nợ còn lại và các yêu cầu hủy
                hoặc hoàn tiền của bạn.
              </p>
            </section>

            <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <SummaryCard
                title="Đã thanh toán"
                value={formatPrice(summary.paidAmount)}
                desc="Tổng tiền đã ghi nhận"
              />
              <SummaryCard
                title="Công nợ còn lại"
                value={formatPrice(summary.remainingDebt)}
                desc="Số tiền cần thanh toán"
              />
              <SummaryCard
                title="Yêu cầu hoàn hủy"
                value={`${summary.pendingRefunds}`}
                desc="Yêu cầu đang chờ xử lý"
              />
            </section>

            <section className="rounded-[3rem] bg-white p-5 shadow-sm shadow-cyan-900/5 md:p-8">
              <div className="mb-8 flex flex-wrap gap-3">
                <TabButton
                  active={activeTab === "PAYMENTS"}
                  onClick={() => setActiveTab("PAYMENTS")}
                >
                  Thanh toán
                </TabButton>

                <TabButton
                  active={activeTab === "DEBTS"}
                  onClick={() => setActiveTab("DEBTS")}
                >
                  Công nợ
                </TabButton>

                <TabButton
                  active={activeTab === "REFUNDS"}
                  onClick={() => setActiveTab("REFUNDS")}
                >
                  Hủy / Hoàn tiền
                </TabButton>
              </div>

              {loading ? (
                <EmptyBox text="Đang tải dữ liệu thanh toán..." />
              ) : activeTab === "PAYMENTS" ? (
                payments.length === 0 ? (
                  <EmptyBox text="Chưa có giao dịch thanh toán nào." />
                ) : (
                  <div className="space-y-5">
                    {payments.map((item) => (
                      <PaymentCard key={item.id} item={item} />
                    ))}
                  </div>
                )
              ) : activeTab === "DEBTS" ? (
                debts.length === 0 ? (
                  <EmptyBox text="Không có công nợ nào." />
                ) : (
                  <div className="space-y-5">
                    {debts.map((item) => (
                      <DebtCard
                        key={item.id}
                        item={item}
                        paying={payingDebtId === item.id}
                        cancelling={cancelBookingId === item.bookingId}
                        onPay={() => handlePayDebt(item)}
                        onCancel={() => handleCancelBooking(item)}
                      />
                    ))}
                  </div>
                )
              ) : refunds.length === 0 ? (
                <EmptyBox text="Chưa có yêu cầu hủy hoặc hoàn tiền nào." />
              ) : (
                <div className="space-y-5">
                  {refunds.map((item) => (
                    <RefundCard
                      key={item.cancellationRequestId}
                      item={item}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

function SummaryCard({
  title,
  value,
  desc,
}: {
  title: string;
  value: string;
  desc: string;
}) {
  return (
    <div className="rounded-[2rem] bg-white px-7 py-6 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
      <p className="text-[13px] font-semibold text-slate-500">{title}</p>
      <p className="mt-2 text-xl font-extrabold text-[#00606c]">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{desc}</p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-7 py-3 transition-all ${
        active
          ? "bg-[#00606c] font-extrabold text-white shadow-md"
          : "bg-[#f1f4f5] font-bold text-[#3e494b] hover:bg-[#e5e9ea]"
      }`}
    >
      {children}
    </button>
  );
}

function PaymentCard({ item }: { item: PaymentItem }) {
  return (
    <article className="rounded-[2rem] border border-[#dfe3e4] bg-[#f9fbfb] p-6">
      <CardHeader
        title={item.tourName}
        code={item.paymentCode}
        status={paymentStatusText(item.paymentStatus)}
        statusClass={badgeClass(item.paymentStatus)}
      />

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
       <InfoBlock
  label="Loại thanh toán"
  value={paymentTypeText(item.paymentType)}
/>
<InfoBlock
  label="Phương thức"
  value={paymentMethodText(item.paymentMethod)}
/>
<InfoBlock label="Số tiền" value={formatPrice(item.amount)} strong />
        <InfoBlock label="Ngày thanh toán" value={formatDate(item.paidAt)} />
        <InfoBlock
          label="Mã giao dịch"
          value={item.transactionCode || "Chưa cập nhật"}
        />
      </div>

      {item.proofUrl ? (
        <Link
          href={item.proofUrl}
          target="_blank"
          className="mt-5 inline-flex rounded-full bg-[#00606c]/10 px-5 py-2.5 text-sm font-bold text-[#00606c] hover:bg-[#00606c] hover:text-white"
        >
          Xem minh chứng
        </Link>
      ) : null}
    </article>
  );
}

function DebtCard({
  item,
  paying,
  cancelling,
  onPay,
  onCancel,
}: {
  item: DebtItem;
  paying: boolean;
  cancelling: boolean;
  onPay: () => void;
  onCancel: () => void;
}) {
  const remainingAmount = Number(item.remainingAmount || 0);
  const totalAmount = Number(item.totalAmount || 0);
  const paidAmount = Number(item.paidAmount || 0);

  const canPay = remainingAmount > 0 && item.debtStatus !== "PAID";
  const cancelable = canCancelBooking(item);
  const cancelStatusLabel = cancellationStatusText(
    item.cancellationRequestStatus
  );

  const percent =
    totalAmount > 0
      ? Math.min(100, Math.round((paidAmount / totalAmount) * 100))
      : 0;

  return (
    <article className="overflow-hidden rounded-[2rem] border border-[#dfe3e4] bg-[#f9fbfb]">
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_310px]">
        <div className="p-6">
          <CardHeader
            title={item.tourName}
            code={item.bookingCode}
            status={
              item.cancellationRequestStatus
                ? cancelStatusLabel
                : debtStatusText(item.debtStatus)
            }
            statusClass={
              item.cancellationRequestStatus
                ? badgeClass(item.cancellationRequestStatus)
                : badgeClass(item.debtStatus)
            }
          />

          {item.bookingType === "GROUP" ? (
  <div className="mt-4 rounded-2xl border border-[#f3d6b8] bg-[#fff8ef] px-5 py-4 text-sm leading-6 text-[#9b4500]">
    Đây là booking tour đoàn. Công nợ có thể bao gồm tiền cọc và phần thanh toán còn lại theo hợp đồng.
  </div>
) : null}

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            <InfoBlock label="Tổng tiền" value={formatPrice(item.totalAmount)} />
            <InfoBlock
              label="Đã thanh toán"
              value={formatPrice(item.paidAmount)}
            />
            <InfoBlock
              label="Còn lại"
              value={formatPrice(item.remainingAmount)}
              strong
            />
            <InfoBlock label="Hạn thanh toán" value={formatDate(item.dueDate)} />
            <InfoBlock label="Khởi hành" value={formatDate(item.startDate)} />
            <InfoBlock label="Cập nhật" value={formatDate(item.updatedAt)} />
          </div>

          {item.cancellationRequestStatus ? (
            <div className="mt-5 rounded-2xl border border-[#ffdbc9] bg-[#fff7f2] px-5 py-4">
              <p className="text-sm font-extrabold text-[#9b4500]">
                {cancelStatusLabel}
              </p>
              <p className="mt-1 text-sm leading-6 text-[#3e494b]">
                Yêu cầu hủy được gửi ngày{" "}
                <b>{formatDate(item.cancellationRequestedAt)}</b>. ChillTrip sẽ
                kiểm tra chính sách hoàn tiền và phản hồi trong thời gian sớm
                nhất.
              </p>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl bg-white px-5 py-4">
              <p className="text-sm font-bold text-[#00606c]">
                Công nợ theo booking
              </p>
              <p className="mt-1 text-sm leading-6 text-[#3e494b]">
                Công nợ được ghi nhận khi booking chưa thanh toán đủ. Bạn có thể
                thanh toán phần còn lại hoặc gửi yêu cầu hủy nếu tour chưa khởi
                hành.
              </p>
            </div>
          )}

          {item.notes ? (
            <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm text-[#3e494b]">
              {item.notes}
            </p>
          ) : null}
        </div>

        <aside className="border-t border-[#e5e9ea] bg-white p-6 xl:border-l xl:border-t-0">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6e797b]">
            Còn phải thanh toán
          </p>

          <p className="mt-2 text-2xl font-black text-[#9b4500]">
            {formatPrice(item.remainingAmount)}
          </p>

          <div className="mt-5 rounded-2xl bg-[#f1f4f5] p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-[#3e494b]">
                Đã thanh toán
              </span>
              <span className="font-bold text-[#00606c]">
                {formatPrice(item.paidAmount)}
              </span>
            </div>

            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="font-semibold text-[#3e494b]">Tổng tiền</span>
              <span className="font-bold text-slate-900">
                {formatPrice(item.totalAmount)}
              </span>
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#dfe3e4]">
              <div
                className="h-full rounded-full bg-[#00606c]"
                style={{ width: `${percent}%` }}
              />
            </div>

            <p className="mt-2 text-xs font-semibold text-slate-500">
              Đã hoàn thành {percent}% thanh toán
            </p>
          </div>

          <div className="mt-5 space-y-3">
            <Link
              href={`/my-bookings/${item.bookingId}`}
              className="block w-full rounded-full bg-[#006875]/10 px-5 py-3 text-center text-sm font-bold text-[#00606c] transition-all hover:bg-[#00606c] hover:text-white"
            >
              Xem booking
            </Link>

            {canPay ? (
              <button
                type="button"
                onClick={onPay}
                disabled={paying || Boolean(item.cancellationRequestStatus)}
                className="w-full rounded-full bg-[#00606c] px-5 py-3 text-sm font-extrabold text-white shadow-md transition hover:bg-[#007b8a] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {paying ? "Đang xử lý..." : "Thanh toán ngay"}
              </button>
            ) : (
              <div className="rounded-full bg-[#dff7e8] px-5 py-3 text-center text-sm font-extrabold text-[#14532d]">
                Đã tất toán
              </div>
            )}

            {item.cancellationRequestStatus ? (
              <div className="rounded-full bg-[#ffdbc9] px-5 py-3 text-center text-sm font-extrabold text-[#331200]">
                {cancelStatusLabel}
              </div>
            ) : cancelable ? (
              <button
                type="button"
                onClick={onCancel}
                disabled={cancelling}
                className="w-full rounded-full border border-red-200 bg-white px-5 py-3 text-sm font-extrabold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {cancelling ? "Đang gửi..." : "Gửi yêu cầu hủy tour"}
              </button>
            ) : (
              <p className="rounded-2xl bg-[#f1f4f5] px-4 py-3 text-center text-xs leading-5 text-slate-500">
                Chỉ có thể gửi yêu cầu hủy khi tour chưa khởi hành và booking còn
                hiệu lực.
              </p>
            )}
          </div>
        </aside>
      </div>
    </article>
  );
}

function RefundCard({ item }: { item: RefundItem }) {
  return (
    <article className="rounded-[2rem] border border-[#dfe3e4] bg-[#f9fbfb] p-6">
      <CardHeader
        title={item.tourName}
        code={item.bookingCode}
        status={requestStatusText(item.requestStatus)}
        statusClass={badgeClass(item.requestStatus)}
      />

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
        <InfoBlock label="Ngày yêu cầu" value={formatDate(item.requestedAt)} />
        <InfoBlock
          label="Tiền hoàn"
          value={formatPrice(item.refundAmount)}
          strong
        />
        <InfoBlock
          label="Phí hủy"
          value={formatPrice(item.cancellationFeeAmount)}
        />
        <InfoBlock
          label="Trạng thái hoàn tiền"
          value={item.refundStatus || "Chưa tạo hoàn tiền"}
        />
        <InfoBlock
          label="Phương thức hoàn"
          value={item.refundMethod || "Chưa cập nhật"}
        />
        <InfoBlock label="Ngày hoàn" value={formatDate(item.refundAt)} />
      </div>

      <p className="mt-5 rounded-2xl bg-white px-4 py-3 text-sm text-[#3e494b]">
        Lý do: {item.reason || "Không có ghi chú"}
      </p>
    </article>
  );
}

function CardHeader({
  title,
  code,
  status,
  statusClass,
}: {
  title: string;
  code: string;
  status: string;
  statusClass: string;
}) {
  return (
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
      <div>
        <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.16em] text-[#9b4500]">
          {code}
        </p>
        <h3 className="text-xl font-extrabold text-slate-900">{title}</h3>
      </div>

      <span
        className={`w-fit rounded-full px-4 py-1.5 text-xs font-extrabold ${statusClass}`}
      >
        {status}
      </span>
    </div>
  );
}

function InfoBlock({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p
        className={`mt-1 text-sm ${
          strong ? "font-black text-[#9b4500]" : "font-bold text-slate-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-[2rem] bg-[#f1f4f5] p-10 text-center">
      <p className="font-bold text-[#00606c]">{text}</p>
    </div>
  );
}