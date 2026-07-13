"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CreditCard,
  Download,
  Loader2,
  Plus,
  RefreshCcw,
  RotateCcw,
  Search,
  Send,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import {
  getStaffFinanceApi,
  recordStaffPaymentApi,
  remindStaffDebtApi,
  type StaffFinanceBookingOption,
  type StaffFinanceData,
  type StaffFinanceDebt,
  type StaffFinanceTransaction,
  type StaffPaymentRecordPayload,
} from "@/lib/api/staff.api";

type PaymentForm = {
  bookingId: string;
  paymentMethod: string;
  amount: string;
  transactionCode: string;
  paidAt: string;
  proofUrl: string;
  note: string;
};

function emptyPaymentForm(): PaymentForm {
  return {
    bookingId: "",
    paymentMethod: "BANK_TRANSFER",
    amount: "",
    transactionCode: "",
    paidAt: new Date().toISOString().slice(0, 10),
    proofUrl: "",
    note: "",
  };
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value || 0) + "đ";
}

function getPaymentStatusLabel(status: string) {
  switch (status) {
    case "PAID":
      return "Đã thanh toán";
    case "PENDING":
      return "Chờ xử lý";
    case "PARTIALLY_PAID":
      return "Một phần";
    case "REFUNDED":
      return "Hoàn tiền";
    default:
      return status || "Chưa rõ";
  }
}

function getPaymentStatusClass(status: string) {
  switch (status) {
    case "PAID":
      return "bg-green-100 text-green-700";
    case "PENDING":
      return "bg-yellow-100 text-yellow-700";
    case "PARTIALLY_PAID":
      return "bg-blue-100 text-blue-700";
    case "REFUNDED":
      return "bg-red-100 text-red-700";
    default:
      return "bg-[#f1f4f5] text-[#3e494b]";
  }
}

export default function StaffFinance() {
  const [data, setData] = useState<StaffFinanceData | null>(null);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("ALL");

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [openPayment, setOpenPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState<PaymentForm>(
    emptyPaymentForm()
  );

  const [showAllDebts, setShowAllDebts] = useState(false);
  const [showRefunds, setShowRefunds] = useState(false);
  const [openExportPreview, setOpenExportPreview] = useState(false);

  const maxRevenue = useMemo(() => {
    if (!data?.revenueTrend.length) return 1;
    return Math.max(...data.revenueTrend.map((item) => item.revenue), 1);
  }, [data]);

  async function loadFinance(options?: {
    nextKeyword?: string;
    nextStatus?: string;
  }) {
    try {
      setLoading(true);
      setErrorMessage("");

      const result = await getStaffFinanceApi({
        keyword: options?.nextKeyword ?? keyword,
        status: options?.nextStatus ?? status,
      });

      setData(result);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Không tải được dữ liệu"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFinance({ nextStatus: status });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadFinance({ nextKeyword: keyword });
    }, 350);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword]);

  function updatePaymentForm<K extends keyof PaymentForm>(
    key: K,
    value: PaymentForm[K]
  ) {
    setPaymentForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function openRecordPaymentModal(booking?: StaffFinanceBookingOption) {
    setPaymentForm({
      ...emptyPaymentForm(),
      bookingId: booking?.id || "",
      amount: booking?.remainingAmount ? String(booking.remainingAmount) : "",
    });
    setOpenPayment(true);
  }

  async function handleRecordPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setActionLoading(true);

      const payload: StaffPaymentRecordPayload = {
        bookingId: paymentForm.bookingId,
        paymentMethod: paymentForm.paymentMethod,
        amount: Number(paymentForm.amount),
        transactionCode: paymentForm.transactionCode.trim(),
        proofUrl: paymentForm.proofUrl.trim(),
        paidAt: paymentForm.paidAt,
        note: paymentForm.note.trim(),
      };

      await recordStaffPaymentApi(payload);

      alert("Ghi nhận thanh toán thành công.");
      setOpenPayment(false);
      setPaymentForm(emptyPaymentForm());
      await loadFinance();
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Không ghi nhận được thanh toán."
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRemindDebt(debt: StaffFinanceDebt) {
    const ok = confirm(`Gửi nhắc nợ cho ${debt.customerName}?`);
    if (!ok) return;

    try {
      setActionLoading(true);
      await remindStaffDebtApi(debt.id);
      alert("Đã tạo thông báo/email nhắc nợ.");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Không nhắc nợ được.");
    } finally {
      setActionLoading(false);
    }
  }

  function exportFinanceCsv() {
    if (!data) return;

    const headers = [
      "Mã thanh toán",
      "Booking",
      "Khách hàng",
      "Tour",
      "Số tiền",
      "Phương thức",
      "Trạng thái",
      "Ngày",
    ];

    const rows = data.transactions.map((item) => [
      item.paymentCode,
      item.bookingCode,
      item.customerName,
      item.tourName,
      item.amount,
      item.paymentMethod,
      getPaymentStatusLabel(item.paymentStatus),
      item.paidAt || item.createdAt || "",
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `chilltrip-tai-chinh-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (loading && !data) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="flex items-center gap-3 rounded-[2rem] bg-white px-6 py-4 shadow-sm">
          <Loader2 className="animate-spin text-[#00606c]" size={22} />
          <span className="font-semibold text-[#00606c]">
            Đang tải dữ liệu tài chính...
          </span>
        </div>
      </div>
    );
  }

  if (errorMessage && !data) {
    return (
      <div className="rounded-2xl border border-red-200 bg-white p-6 text-red-700">
        <p className="font-black">Không tải được dữ liệu</p>
        <p className="mt-2 text-sm">{errorMessage}</p>
        <button
          type="button"
          onClick={() => loadFinance()}
          className="mt-4 rounded-full bg-[#00606c] px-5 py-2 text-sm font-black text-white"
        >
          Tải lại
        </button>
      </div>
    );
  }

  if (!data) return null;

  const debtsToShow = showAllDebts ? data.debts : data.debts.slice(0, 5);

  return (
    <div className="w-full space-y-8 pb-12">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-[#00606c]">
            Tổng quan vận hành
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight text-[#181c1d]">
            Quản lý tài chính
          </h1>
          <p className="mt-2 text-[#3e494b]">
            Theo dõi thanh toán, công nợ, hoàn tiền và các giao dịch phát sinh
            bằng dữ liệu thật.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
  type="button"
  onClick={() => setOpenExportPreview(true)}
  className="flex items-center gap-2 rounded-full bg-white px-6 py-3 text-xs font-bold text-[#3e494b] shadow-sm transition hover:scale-105"
>
  <Download size={18} />
  Xuất báo cáo
</button>

          <button
            type="button"
            onClick={() => openRecordPaymentModal()}
            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#9b4500] to-[#fc8a40] px-6 py-3 text-xs font-bold text-white shadow-lg shadow-[#9b4500]/20 transition hover:scale-105"
          >
            <Plus size={18} />
            Ghi nhận thanh toán
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <StatCard
          title="Doanh thu tháng"
          value={formatMoney(data.summary.monthRevenue)}
          change="+ dữ liệu thật"
          icon={<CreditCard size={22} />}
          iconClass="bg-[#9defff]/30 text-[#00606c]"
        />

        <StatCard
          title="Thanh toán chờ xử lý"
          value={formatMoney(data.summary.pendingPaymentAmount)}
          icon={<AlertTriangle size={22} />}
          iconClass="bg-[#ffdbc9]/40 text-[#9b4500]"
        />

        <StatCard
          title="Doanh thu ròng"
          value={formatMoney(data.summary.netRevenue)}
          icon={<Wallet size={22} />}
          iconClass="bg-[#b3ebff]/40 text-[#006074]"
        />

        <StatCard
          title="Yêu cầu hoàn tiền"
          value={formatMoney(data.summary.refundAmount)}
          icon={<RotateCcw size={22} />}
          iconClass="bg-[#ffdad6]/50 text-[#ba1a1a]"
        />
      </section>

      <section className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="flex flex-col gap-8 lg:col-span-2">
          <div className="relative overflow-hidden rounded-xl bg-white p-8">
            <div className="mb-8 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#181c1d]">
                Xu hướng doanh thu
              </h3>

              <button
                type="button"
                onClick={() => loadFinance()}
                className="flex items-center gap-2 rounded-full bg-[#f6fafb] px-4 py-2 text-xs font-bold text-[#00606c]"
              >
                <RefreshCcw size={15} />
                Làm mới
              </button>
            </div>

            <div className="flex h-64 w-full items-end justify-between gap-3">
              {data.revenueTrend.map((item, index) => {
                const height = Math.max(8, (item.revenue / maxRevenue) * 100);

                return (
                  <div
                    key={item.label}
                    className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                  >
                    <div
                      className={`group relative w-full rounded-t-lg ${
                        index === data.revenueTrend.length - 1
                          ? "bg-gradient-to-t from-[#00606c] to-[#007b8a]"
                          : "bg-[#00606c]/30"
                      }`}
                      style={{ height: `${height}%` }}
                    >
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-[#181c1d] px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                        {formatMoney(item.revenue)}
                      </div>
                    </div>

                    <span className="text-[10px] font-bold text-[#3e494b]">
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#ebeeef] p-6">
              <h3 className="text-lg font-bold text-[#181c1d]">
                Giao dịch gần đây
              </h3>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-72">
                  <Search
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6e797b]"
                  />
                  <input
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    className="h-10 w-full rounded-full bg-[#f6fafb] pl-9 pr-4 text-xs font-semibold outline-none ring-1 ring-[#ebeeef]"
                    placeholder="Tìm mã GD, khách, tour..."
                  />
                </div>

                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="h-10 rounded-full bg-[#f6fafb] px-4 text-xs font-bold outline-none ring-1 ring-[#ebeeef]"
                >
                  <option value="ALL">Tất cả</option>
                  <option value="PAID">Đã thanh toán</option>
                  <option value="PENDING">Chờ xử lý</option>
                  <option value="PARTIALLY_PAID">Một phần</option>
                  <option value="REFUNDED">Hoàn tiền</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[920px] w-full text-left">
                <thead>
                  <tr className="bg-[#f1f4f5]/50">
                    <TableHead>Mã GĐ</TableHead>
                    <TableHead>Khách hàng</TableHead>
                    <TableHead>Tour</TableHead>
                    <TableHead>Số tiền</TableHead>
                    <TableHead>Ngày</TableHead>
                    <TableHead>Trạng thái</TableHead>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#ebeeef]">
                  {data.transactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-sm font-semibold text-[#6e797b]">
                        Không có giao dịch phù hợp.
                      </td>
                    </tr>
                  ) : (
                    data.transactions.map((item) => (
                      <TransactionRow key={item.id} item={item} />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <aside className="flex flex-col gap-6">
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#181c1d]">
                Công nợ khách hàng
              </h3>
              <AlertTriangle size={22} className="text-[#9b4500]" />
            </div>

            <div className="space-y-4">
              {debtsToShow.length === 0 ? (
                <div className="rounded-xl bg-[#f1f4f5] p-4 text-sm font-semibold text-[#6e797b]">
                  Không có công nợ chưa thanh toán.
                </div>
              ) : (
                debtsToShow.map((item) => (
                  <DebtCard
                    key={item.id}
                    debt={item}
                    loading={actionLoading}
                    onRemind={() => handleRemindDebt(item)}
                    onRecordPayment={() =>
                      openRecordPaymentModal({
                        id: item.bookingId,
                        bookingCode: item.bookingCode,
                        customerName: item.customerName,
                        tourName: "",
                        totalPayableAmount: item.totalAmount,
                        remainingAmount: item.remainingAmount,
                      })
                    }
                  />
                ))
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowAllDebts((prev) => !prev)}
              className="mt-6 w-full rounded-full border border-[#bdc8cb]/30 py-3 text-[11px] font-bold uppercase tracking-widest text-[#3e494b] transition hover:bg-[#f1f4f5]"
            >
              {showAllDebts ? "Thu gọn công nợ" : "Xem tất cả công nợ"}
            </button>
          </div>

          <div className="group relative overflow-hidden rounded-xl bg-[#00606c] p-6 text-white">
            <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-white/10 blur-2xl transition group-hover:scale-150" />

            <div className="relative z-10">
              <h4 className="mb-2 font-bold">Hỗ trợ hoàn tiền nhanh</h4>
              <p className="mb-4 text-xs text-[#ddf9ff]/80">
                Xem các yêu cầu hoàn tiền cho khách hàng hủy tour theo chính sách ChillTrip.
              </p>
              <button
                type="button"
                onClick={() => setShowRefunds(true)}
                className="w-full rounded-full bg-white py-3 text-xs font-bold text-[#00606c] shadow-lg"
              >
                Xử lý hoàn tiền
              </button>
            </div>
          </div>

          <div className="rounded-xl bg-[#f1f4f5] p-6">
            <h4 className="mb-3 text-sm font-bold">Lưu ý nghiệp vụ</h4>
            <ul className="list-disc space-y-2 pl-4 text-[11px] leading-relaxed text-[#3e494b]">
              <li>Kiểm tra sao kê ngân hàng trước khi xác nhận thanh toán chuyển khoản.</li>
              <li>Giao dịch hoàn tiền trên 50 triệu cần phê duyệt quản lý.</li>
              <li>Booking có công nợ cần được nhắc trước ngày khởi hành.</li>
            </ul>
          </div>
        </aside>
      </section>

      {openPayment && (
        <PaymentModal
          form={paymentForm}
          bookings={data.bookingOptions}
          loading={actionLoading}
          updateForm={updatePaymentForm}
          onClose={() => setOpenPayment(false)}
          onSubmit={handleRecordPayment}
        />
      )}

      {showRefunds && (
        <RefundModal
          refunds={data.refunds}
          onClose={() => setShowRefunds(false)}
        />
      )}
      {openExportPreview && (
  <FinanceExportPreviewModal
    data={data}
    onClose={() => setOpenExportPreview(false)}
  />
)}
    </div>
  );
}
function buildFinanceReportHtml(data: StaffFinanceData) {
  const rows = data.transactions
    .map(
      (item) => `
        <tr>
          <td>${item.paymentCode}</td>
          <td>${item.bookingCode}</td>
          <td>${item.customerName}</td>
          <td>${item.tourName}</td>
          <td>${formatMoney(item.amount)}</td>
          <td>${item.paymentMethod}</td>
          <td>${getPaymentStatusLabel(item.paymentStatus)}</td>
          <td>${item.paidAt || item.createdAt || ""}</td>
        </tr>
      `
    )
    .join("");

  const debtRows = data.debts
    .map(
      (item) => `
        <tr>
          <td>${item.bookingCode}</td>
          <td>${item.customerName}</td>
          <td>${formatMoney(item.totalAmount)}</td>
          <td>${formatMoney(item.paidAmount)}</td>
          <td>${formatMoney(item.remainingAmount)}</td>
          <td>${item.dueDate || ""}</td>
          <td>${item.debtStatus}</td>
        </tr>
      `
    )
    .join("");

  return `
    <!doctype html>
    <html lang="vi">
      <head>
        <meta charset="utf-8" />
        <title>Báo cáo tài chính ChillTrip</title>
        <style>
          * {
            box-sizing: border-box;
          }

          body {
            font-family: Arial, sans-serif;
            padding: 28px;
            color: #181c1d;
          }

          h1 {
            color: #00606c;
            margin: 0 0 6px;
            font-size: 28px;
          }

          h2 {
            color: #00606c;
            margin-top: 28px;
            font-size: 18px;
          }

          .muted {
            color: #5f6b6d;
            font-size: 13px;
            margin-bottom: 22px;
          }

          .summary {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            margin: 20px 0;
          }

          .card {
            border: 1px solid #dfe3e4;
            border-radius: 14px;
            padding: 14px;
            background: #f6fafb;
          }

          .card p {
            margin: 0;
            color: #5f6b6d;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
          }

          .card strong {
            display: block;
            margin-top: 8px;
            color: #00606c;
            font-size: 18px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
            font-size: 12px;
          }

          th {
            background: #00606c;
            color: white;
            text-align: left;
            padding: 9px;
          }

          td {
            border: 1px solid #dfe3e4;
            padding: 8px;
            vertical-align: top;
          }

          tr:nth-child(even) td {
            background: #f6fafb;
          }

          @media print {
            body {
              padding: 12px;
            }

            button {
              display: none;
            }
          }
        </style>
      </head>

      <body>
        <h1>Báo cáo tài chính ChillTrip</h1>
        <div class="muted">
          Ngày xuất: ${new Date().toLocaleDateString("vi-VN")} • Dữ liệu lấy từ hệ thống
        </div>

        <div class="summary">
          <div class="card">
            <p>Doanh thu tháng</p>
            <strong>${formatMoney(data.summary.monthRevenue)}</strong>
          </div>
          <div class="card">
            <p>Thanh toán chờ xử lý</p>
            <strong>${formatMoney(data.summary.pendingPaymentAmount)}</strong>
          </div>
          <div class="card">
            <p>Doanh thu ròng</p>
            <strong>${formatMoney(data.summary.netRevenue)}</strong>
          </div>
          <div class="card">
            <p>Công nợ chưa thu</p>
            <strong>${formatMoney(data.summary.unpaidDebtAmount)}</strong>
          </div>
          <div class="card">
            <p>Hoàn tiền</p>
            <strong>${formatMoney(data.summary.refundAmount)}</strong>
          </div>
          <div class="card">
            <p>Tổng đã thanh toán</p>
            <strong>${formatMoney(data.summary.paidAmount)}</strong>
          </div>
        </div>

        <h2>Giao dịch thanh toán</h2>
        <table>
          <thead>
            <tr>
              <th>Mã thanh toán</th>
              <th>Booking</th>
              <th>Khách hàng</th>
              <th>Tour</th>
              <th>Số tiền</th>
              <th>Phương thức</th>
              <th>Trạng thái</th>
              <th>Ngày</th>
            </tr>
          </thead>
          <tbody>
            ${rows || `<tr><td colspan="8">Không có giao dịch</td></tr>`}
          </tbody>
        </table>

        <h2>Công nợ khách hàng</h2>
        <table>
          <thead>
            <tr>
              <th>Booking</th>
              <th>Khách hàng</th>
              <th>Tổng tiền</th>
              <th>Đã trả</th>
              <th>Còn lại</th>
              <th>Hạn thanh toán</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            ${debtRows || `<tr><td colspan="7">Không có công nợ</td></tr>`}
          </tbody>
        </table>
      </body>
    </html>
  `;
}

function exportFinancePdf(data: StaffFinanceData) {
  const html = buildFinanceReportHtml(data);
  const win = window.open("", "_blank");

  if (!win) {
    alert("Trình duyệt đang chặn popup. Vui lòng cho phép popup để xuất PDF.");
    return;
  }

  win.document.open();
  win.document.write(html);
  win.document.close();

  setTimeout(() => {
    win.focus();
    win.print();
  }, 500);
}

function exportFinanceExcel(data: StaffFinanceData) {
  const html = buildFinanceReportHtml(data);

  const blob = new Blob(["\uFEFF" + html], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `bao-cao-tai-chinh-chilltrip-${new Date()
    .toISOString()
    .slice(0, 10)}.xls`;

  link.click();
  URL.revokeObjectURL(url);
}
function FinanceExportPreviewModal({
  data,
  onClose,
}: {
  data: StaffFinanceData;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/40 p-6 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-[#00606c] px-7 py-5 text-white">
          <div>
            <h2 className="text-2xl font-black">Xem trước báo cáo tài chính</h2>
            <p className="mt-1 text-sm font-semibold text-[#ddf9ff]">
              Kiểm tra nội dung trước khi xuất PDF hoặc Excel.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[76vh] overflow-y-auto p-7">
          <section className="grid gap-4 md:grid-cols-3">
            <PreviewCard
              label="Doanh thu tháng"
              value={formatMoney(data.summary.monthRevenue)}
            />
            <PreviewCard
              label="Thanh toán chờ xử lý"
              value={formatMoney(data.summary.pendingPaymentAmount)}
            />
            <PreviewCard
              label="Doanh thu ròng"
              value={formatMoney(data.summary.netRevenue)}
            />
            <PreviewCard
              label="Công nợ chưa thu"
              value={formatMoney(data.summary.unpaidDebtAmount)}
            />
            <PreviewCard
              label="Hoàn tiền"
              value={formatMoney(data.summary.refundAmount)}
            />
            <PreviewCard
              label="Tổng đã thanh toán"
              value={formatMoney(data.summary.paidAmount)}
            />
          </section>

          <section className="mt-7 overflow-hidden rounded-2xl border border-[#ebeeef]">
            <div className="border-b border-[#ebeeef] bg-[#f6fafb] px-5 py-4">
              <h3 className="font-black text-[#00606c]">Giao dịch thanh toán</h3>
              <p className="mt-1 text-xs font-semibold text-[#6e797b]">
                Hiển thị tối đa 10 giao dịch đầu tiên trong phần xem trước.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[920px] w-full text-left">
                <thead>
                  <tr className="bg-[#00606c] text-white">
                    <TableHeadPreview>Mã thanh toán</TableHeadPreview>
                    <TableHeadPreview>Booking</TableHeadPreview>
                    <TableHeadPreview>Khách hàng</TableHeadPreview>
                    <TableHeadPreview>Tour</TableHeadPreview>
                    <TableHeadPreview>Số tiền</TableHeadPreview>
                    <TableHeadPreview>Trạng thái</TableHeadPreview>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#ebeeef]">
                  {data.transactions.slice(0, 10).map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 text-xs font-bold text-[#00606c]">
                        {item.paymentCode}
                      </td>
                      <td className="px-4 py-3 text-xs">{item.bookingCode}</td>
                      <td className="px-4 py-3 text-xs font-semibold">
                        {item.customerName}
                      </td>
                      <td className="px-4 py-3 text-xs">{item.tourName}</td>
                      <td className="px-4 py-3 text-xs font-bold">
                        {formatMoney(item.amount)}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {getPaymentStatusLabel(item.paymentStatus)}
                      </td>
                    </tr>
                  ))}

                  {data.transactions.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-sm font-semibold text-[#6e797b]"
                      >
                        Không có giao dịch.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-7 overflow-hidden rounded-2xl border border-[#ebeeef]">
            <div className="border-b border-[#ebeeef] bg-[#f6fafb] px-5 py-4">
              <h3 className="font-black text-[#00606c]">Công nợ khách hàng</h3>
              <p className="mt-1 text-xs font-semibold text-[#6e797b]">
                Hiển thị tối đa 10 khoản công nợ đầu tiên trong phần xem trước.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[860px] w-full text-left">
                <thead>
                  <tr className="bg-[#00606c] text-white">
                    <TableHeadPreview>Booking</TableHeadPreview>
                    <TableHeadPreview>Khách hàng</TableHeadPreview>
                    <TableHeadPreview>Tổng tiền</TableHeadPreview>
                    <TableHeadPreview>Đã trả</TableHeadPreview>
                    <TableHeadPreview>Còn lại</TableHeadPreview>
                    <TableHeadPreview>Trạng thái</TableHeadPreview>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#ebeeef]">
                  {data.debts.slice(0, 10).map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 text-xs font-bold text-[#00606c]">
                        {item.bookingCode}
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold">
                        {item.customerName}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {formatMoney(item.totalAmount)}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {formatMoney(item.paidAmount)}
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-[#9b4500]">
                        {formatMoney(item.remainingAmount)}
                      </td>
                      <td className="px-4 py-3 text-xs">{item.debtStatus}</td>
                    </tr>
                  ))}

                  {data.debts.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-sm font-semibold text-[#6e797b]"
                      >
                        Không có công nợ.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <div className="mt-7 flex flex-wrap justify-end gap-3 border-t border-[#ebeeef] pt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[#bdc8cb] px-6 py-3 text-sm font-black text-[#3e494b]"
            >
              Đóng
            </button>

            <button
              type="button"
              onClick={() => exportFinanceExcel(data)}
              className="flex items-center gap-2 rounded-full bg-[#9b4500] px-6 py-3 text-sm font-black text-white"
            >
              <Download size={17} />
              Xuất Excel
            </button>

            <button
              type="button"
              onClick={() => exportFinancePdf(data)}
              className="flex items-center gap-2 rounded-full bg-[#00606c] px-6 py-3 text-sm font-black text-white"
            >
              <Download size={17} />
              Xuất PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#f6fafb] p-4 ring-1 ring-[#ebeeef]">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#6e797b]">
        {label}
      </p>
      <p className="mt-2 text-xl font-black text-[#00606c]">{value}</p>
    </div>
  );
}

function TableHeadPreview({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest">
      {children}
    </th>
  );
}

function TransactionRow({ item }: { item: StaffFinanceTransaction }) {
  return (
    <tr className="transition-colors hover:bg-[#f1f4f5]/50">
      <td className="px-6 py-4 font-mono text-xs font-bold text-[#00606c]">
        {item.paymentCode}
      </td>

      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#dfe3e4] text-[10px] font-black">
            {item.customerName.slice(0, 1)}
          </div>
          <div>
            <span className="text-xs font-bold">{item.customerName}</span>
            <p className="text-[10px] text-[#6e797b]">{item.bookingCode}</p>
          </div>
        </div>
      </td>

      <td className="px-6 py-4 text-xs text-[#3e494b]">
        {item.tourName}
      </td>

      <td className="px-6 py-4 text-xs font-bold">
        {formatMoney(item.amount)}
      </td>

      <td className="px-6 py-4 text-xs text-[#3e494b]">
        {item.paidAt || item.createdAt || "Chưa có"}
      </td>

      <td className="px-6 py-4">
        <span
          className={`rounded-full px-3 py-1 text-[10px] font-bold ${getPaymentStatusClass(
            item.paymentStatus
          )}`}
        >
          {getPaymentStatusLabel(item.paymentStatus)}
        </span>
      </td>
    </tr>
  );
}

function DebtCard({
  debt,
  loading,
  onRemind,
  onRecordPayment,
}: {
  debt: StaffFinanceDebt;
  loading: boolean;
  onRemind: () => void;
  onRecordPayment: () => void;
}) {
  return (
    <div className="rounded-xl bg-[#f1f4f5] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#dfe3e4] text-[10px] font-black">
            {debt.customerName.slice(0, 1)}
          </div>
          <div>
            <p className="text-xs font-bold">{debt.customerName}</p>
            <p className="text-[10px] text-[#3e494b]">
              {debt.overdueDays > 0
                ? `Quá hạn: ${debt.overdueDays} ngày`
                : `Hạn: ${debt.dueDate || "Chưa có"}`}
            </p>
            <p className="text-[10px] font-bold text-[#00606c]">
              {debt.bookingCode}
            </p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-xs font-black text-[#9b4500]">
            {formatMoney(debt.remainingAmount)}
          </p>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={onRemind}
          className="flex flex-1 items-center justify-center gap-1 rounded-full bg-white px-3 py-2 text-[10px] font-black uppercase tracking-tighter text-[#00606c] disabled:opacity-60"
        >
          <Send size={12} />
          Nhắc nợ
        </button>

        <button
          type="button"
          onClick={onRecordPayment}
          className="flex-1 rounded-full bg-[#00606c] px-3 py-2 text-[10px] font-black uppercase tracking-tighter text-white"
        >
          Thu tiền
        </button>
      </div>
    </div>
  );
}

function PaymentModal({
  form,
  bookings,
  loading,
  updateForm,
  onClose,
  onSubmit,
}: {
  form: PaymentForm;
  bookings: StaffFinanceBookingOption[];
  loading: boolean;
  updateForm: <K extends keyof PaymentForm>(
    key: K,
    value: PaymentForm[K]
  ) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const selectedBooking = bookings.find((item) => item.id === form.bookingId);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-6 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-[#00606c] px-7 py-5 text-white">
          <div>
            <h2 className="text-2xl font-black">Ghi nhận thanh toán</h2>
            <p className="mt-1 text-sm font-semibold text-[#ddf9ff]">
              Chọn booking và nhập số tiền khách đã thanh toán.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="max-h-[76vh] overflow-y-auto p-7">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-[#00606c]">
                Booking
              </span>

              <select
                value={form.bookingId}
                required
                onChange={(event) => updateForm("bookingId", event.target.value)}
                className="h-12 w-full rounded-2xl border border-[#dfe3e4] bg-[#f6fafb] px-4 text-sm font-semibold outline-none"
              >
                <option value="">Chọn booking cần thu tiền</option>
                {bookings.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.bookingCode} - {item.customerName} - còn{" "}
                    {formatMoney(item.remainingAmount)}
                  </option>
                ))}
              </select>
            </label>

            {selectedBooking && (
              <div className="rounded-2xl bg-[#f6fafb] p-4 md:col-span-2">
                <p className="text-sm font-black text-[#00606c]">
                  {selectedBooking.tourName}
                </p>
                <p className="mt-1 text-xs font-semibold text-[#6e797b]">
                  Tổng tiền: {formatMoney(selectedBooking.totalPayableAmount)} •
                  Còn lại: {formatMoney(selectedBooking.remainingAmount)}
                </p>
              </div>
            )}

            <Input
              label="Số tiền"
              type="number"
              value={form.amount}
              onChange={(value) => updateForm("amount", value)}
              required
            />

            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-[#00606c]">
                Phương thức
              </span>

              <select
                value={form.paymentMethod}
                onChange={(event) =>
                  updateForm("paymentMethod", event.target.value)
                }
                className="h-12 w-full rounded-2xl border border-[#dfe3e4] bg-[#f6fafb] px-4 text-sm font-semibold outline-none"
              >
                <option value="BANK_TRANSFER">Chuyển khoản</option>
                <option value="CASH">Tiền mặt</option>
                <option value="CARD">Thẻ</option>
                <option value="MOMO">Momo</option>
                <option value="VNPAY">VNPay</option>
              </select>
            </label>

            <Input
              label="Mã giao dịch"
              value={form.transactionCode}
              onChange={(value) => updateForm("transactionCode", value)}
            />

            <Input
              label="Ngày thanh toán"
              type="date"
              value={form.paidAt}
              onChange={(value) => updateForm("paidAt", value)}
            />

            <Input
              label="Link chứng từ"
              value={form.proofUrl}
              onChange={(value) => updateForm("proofUrl", value)}
            />

            <label className="block md:col-span-2">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-[#00606c]">
                Ghi chú
              </span>
              <textarea
                value={form.note}
                onChange={(event) => updateForm("note", event.target.value)}
                rows={3}
                className="w-full resize-none rounded-2xl border border-[#dfe3e4] bg-[#f6fafb] px-4 py-3 text-sm font-semibold outline-none"
              />
            </label>
          </div>

          <div className="mt-7 flex justify-end gap-3 border-t border-[#ebeeef] pt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[#bdc8cb] px-6 py-3 text-sm font-black text-[#3e494b]"
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-full bg-[#00606c] px-7 py-3 text-sm font-black text-white disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={17} />
              ) : (
                <Plus size={17} />
              )}
              Ghi nhận
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RefundModal({
  refunds,
  onClose,
}: {
  refunds: StaffFinanceData["refunds"];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-6 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-[#00606c] px-7 py-5 text-white">
          <div>
            <h2 className="text-2xl font-black">Yêu cầu hoàn tiền</h2>
            <p className="mt-1 text-sm font-semibold text-[#ddf9ff]">
              Danh sách yêu cầu hoàn tiền trong hệ thống.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[76vh] overflow-y-auto p-6">
          {refunds.length === 0 ? (
            <div className="rounded-2xl bg-[#f6fafb] p-8 text-center text-sm font-semibold text-[#6e797b]">
              Chưa có yêu cầu hoàn tiền.
            </div>
          ) : (
            <div className="space-y-3">
              {refunds.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl bg-[#f6fafb] p-4 ring-1 ring-[#ebeeef]"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-black text-[#00606c]">
                        {item.refundCode}
                      </p>
                      <p className="mt-1 text-sm font-bold">
                        {item.customerName} • {item.bookingCode}
                      </p>
                      <p className="mt-1 text-xs text-[#6e797b]">
                        Phí hủy: {formatMoney(item.cancellationFeeAmount)}
                      </p>
                    </div>

                    <div className="md:text-right">
                      <p className="font-black text-[#ba1a1a]">
                        {formatMoney(item.refundAmount)}
                      </p>
                      <p className="mt-1 text-xs font-bold text-[#6e797b]">
                        {item.refundStatus} • {item.refundMethod || "Chưa rõ"}
                      </p>
                      <p className="text-xs text-[#6e797b]">
                        {item.refundAt || "Chưa hoàn"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  change,
  icon,
  iconClass,
}: {
  title: string;
  value: string;
  change?: string;
  icon: React.ReactNode;
  iconClass: string;
}) {
  return (
    <div className="flex flex-col justify-between rounded-xl bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-start justify-between">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-full ${iconClass}`}
        >
          {icon}
        </div>

        {change && (
          <span className="rounded-full bg-green-50 px-2 py-1 text-[10px] font-bold text-green-600">
            {change}
          </span>
        )}
      </div>

      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#3e494b]">
          {title}
        </p>
        <h3 className="mt-1 text-2xl font-black text-[#181c1d]">{value}</h3>
      </div>
    </div>
  );
}

function TableHead({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#3e494b]">
      {children}
    </th>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-[#00606c]">
        {label}
      </span>

      <input
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-2xl border border-[#dfe3e4] bg-[#f6fafb] px-4 text-sm font-semibold outline-none"
      />
    </label>
  );
}