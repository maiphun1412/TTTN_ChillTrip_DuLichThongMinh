"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BedDouble,
  Bus,
  CheckCircle2,
  Download,
  Eye,
  Handshake,
  Landmark,
  Mail,
  Plane,
  RefreshCcw,
  Search,
  Send,
  Sparkles,
  TrendingUp,
  User,
  Wallet,
  X,
} from "lucide-react";
import ExportTimeFilter, {
  TimeFilterOptions,
  formatReportTimeLabel,
  formatReportFilenameSuffix,
  filterItemsByTime,
} from "@/components/shared/ExportTimeFilter";

const API_BASE_URL = "/backend-api";

type Overview = {
  revenue?: {
    total_revenue?: string | number;
    total_payments?: string | number;
    paid_payments?: string | number;
    pending_payments?: string | number;
    failed_payments?: string | number;
  };
  debt?: {
    total_debt?: string | number;
    paid_amount?: string | number;
    remaining_amount?: string | number;
    unpaid_count?: string | number;
    partial_count?: string | number;
    paid_count?: string | number;
  };
  refund?: {
    total_refund?: string | number;
    total_refunds?: string | number;
    pending_refunds?: string | number;
    completed_refunds?: string | number;
  };
  service_cost?: {
    flight_cost?: string | number;
    vehicle_cost?: string | number;
    hotel_cost?: string | number;
    total_service_cost?: string | number;
    flight_count?: string | number;
    vehicle_count?: string | number;
    hotel_count?: string | number;
  };
  summary?: {
    net_cash?: string | number;
    estimated_profit?: string | number;
  };
};

type Debt = {
  id: string | number;
  total_amount?: string | number;
  paid_amount?: string | number;
  remaining_amount?: string | number;
  due_date?: string | null;
  debt_status?: string;
  full_name?: string | null;
  booking_code?: string | null;
  phone?: string | null;
  email?: string | null;
  booked_at?: string | null;
};

type Payment = {
  id: string | number;
  payment_code?: string;
  booking_code?: string;
  full_name?: string;
  payment_method?: string;
  amount?: string | number;
  payment_status?: string;
  paid_at?: string | null;
  created_at?: string | null;
};

type Refund = {
  id: string | number;
  refund_code?: string;
  booking_code?: string;
  refund_amount?: string | number;
  refund_status?: string;
  refund_method?: string | null;
  created_at?: string | null;
  refund_at?: string | null;
};

function formatMoney(value?: string | number | null) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("vi-VN");
}

function getDebtLabel(status?: string) {
  switch (status) {
    case "PAID":
      return "Hoàn tất";
    case "PARTIAL":
      return "Thanh toán một phần";
    case "UNPAID":
      return "Chưa thanh toán";
    case "OVERDUE":
      return "Quá hạn";
    default:
      return status || "-";
  }
}

function getDebtClass(status?: string) {
  switch (status) {
    case "PAID":
      return "bg-[#9defff]/30 text-[#00606c]";
    case "PARTIAL":
      return "bg-[#ffdbc9]/40 text-[#9b4500]";
    case "OVERDUE":
    case "UNPAID":
      return "bg-[#ffdad6] text-[#93000a]";
    default:
      return "bg-[#ebeeef] text-[#3e494b]";
  }
}

function getPaymentLabel(status?: string) {
  switch (status) {
    case "PAID":
      return "Đã thanh toán";
    case "PENDING":
      return "Chờ thanh toán";
    case "FAILED":
      return "Thất bại";
    default:
      return status || "-";
  }
}

function getPaymentClass(status?: string) {
  switch (status) {
    case "PAID":
      return "bg-[#9defff]/30 text-[#00606c]";
    case "PENDING":
      return "bg-[#ffdbc9]/40 text-[#9b4500]";
    case "FAILED":
      return "bg-[#ffdad6] text-[#93000a]";
    default:
      return "bg-[#ebeeef] text-[#3e494b]";
  }
}

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

export default function AdminFinance() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);

  const [showReportPreview, setShowReportPreview] = useState(false);
  const [showReminder, setShowReminder] = useState(false);
  const [showAllDebts, setShowAllDebts] = useState(false);
  const [showAllPayments, setShowAllPayments] = useState(false);
  const [showServiceCost, setShowServiceCost] = useState(false);
  const [hoverChart, setHoverChart] = useState<any>(null);

  const [timeFilter, setTimeFilter] = useState<TimeFilterOptions>({
    type: "month",
    month: new Date().getMonth() + 1,
    quarter: 1,
    year: new Date().getFullYear(),
  });

  const timeFilteredPayments = useMemo(() => {
    return filterItemsByTime(payments, (item) => item.created_at, timeFilter);
  }, [payments, timeFilter]);

  const timeFilteredDebts = useMemo(() => {
    return filterItemsByTime(debts, (item) => item.booked_at, timeFilter);
  }, [debts, timeFilter]);

  const timeFilteredRefunds = useMemo(() => {
    return filterItemsByTime(refunds, (item) => item.refund_at || item.created_at, timeFilter);
  }, [refunds, timeFilter]);

  const filteredStats = useMemo(() => {
    const paidPayments = timeFilteredPayments.filter(p => p.payment_status === 'PAID');
    const totalRevenue = paidPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    
    const totalDebt = timeFilteredDebts.reduce((sum, d) => sum + Number(d.total_amount || 0), 0);
    const paidDebt = timeFilteredDebts.reduce((sum, d) => sum + Number(d.paid_amount || 0), 0);
    const remainingDebt = timeFilteredDebts.reduce((sum, d) => sum + Number(d.remaining_amount || 0), 0);

    const totalRefund = timeFilteredRefunds.filter(r => r.refund_status !== 'REJECTED').reduce((sum, r) => sum + Number(r.refund_amount || 0), 0);

    const totalServiceCost = Number(overview?.service_cost?.flight_cost || 0) +
      Number(overview?.service_cost?.vehicle_cost || 0) +
      Number(overview?.service_cost?.hotel_cost || 0);

    const netCash = totalRevenue - totalRefund;
    const estimatedProfit = totalRevenue + paidDebt - totalRefund - totalServiceCost;

    return {
      totalRevenue,
      totalDebt,
      paidDebt,
      remainingDebt,
      totalRefund,
      totalServiceCost,
      netCash,
      estimatedProfit
    };
  }, [timeFilteredPayments, timeFilteredDebts, timeFilteredRefunds, overview]);

  async function loadData(startDate?: string, endDate?: string) {
    try {
      setLoading(true);

      const queryParams = new URLSearchParams();
      if (startDate) queryParams.set("startDate", startDate);
      if (endDate) queryParams.set("endDate", endDate);
      const queryStr = queryParams.toString() ? `?${queryParams.toString()}` : "";

      const [overviewRes, debtsRes, paymentsRes, refundsRes] =
        await Promise.allSettled([
          fetch(`${API_BASE_URL}/admin/finance/overview${queryStr}`, {
            cache: "no-store",
          }),
          fetch(`${API_BASE_URL}/admin/debts${queryStr}`, {
            cache: "no-store",
          }),
          fetch(`${API_BASE_URL}/admin/payments${queryStr}`, {
            cache: "no-store",
          }),
          fetch(`${API_BASE_URL}/admin/refunds${queryStr}`, {
            cache: "no-store",
          }),
        ]);

      if (overviewRes.status === "fulfilled" && overviewRes.value.ok) {
        const json = await overviewRes.value.json();
        setOverview(json.data || null);
      }

      if (debtsRes.status === "fulfilled" && debtsRes.value.ok) {
        const json = await debtsRes.value.json();
        setDebts(json.data || []);
      }

      if (paymentsRes.status === "fulfilled" && paymentsRes.value.ok) {
        const json = await paymentsRes.value.json();
        setPayments(json.data || []);
      }

      if (refundsRes.status === "fulfilled" && refundsRes.value.ok) {
        const json = await refundsRes.value.json();
        setRefunds(json.data || []);
      }
    } catch (error) {
      console.error("LOAD_FINANCE_ERROR:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let start: string | undefined;
    let end: string | undefined;

    if (timeFilter.type === "custom") {
      if (timeFilter.customStartDate && timeFilter.customEndDate) {
        start = timeFilter.customStartDate;
        end = timeFilter.customEndDate;
      } else {
        return;
      }
    } else if (timeFilter.type === "month") {
      start = `${timeFilter.year}-${String(timeFilter.month).padStart(2, "0")}-01`;
      const lastDay = new Date(timeFilter.year, timeFilter.month, 0).getDate();
      end = `${timeFilter.year}-${String(timeFilter.month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    } else if (timeFilter.type === "quarter") {
      const startMonth = (timeFilter.quarter - 1) * 3 + 1;
      const endMonth = timeFilter.quarter * 3;
      start = `${timeFilter.year}-${String(startMonth).padStart(2, "0")}-01`;
      const lastDay = new Date(timeFilter.year, endMonth, 0).getDate();
      end = `${timeFilter.year}-${String(endMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    }

    loadData(start, end);
  }, [timeFilter]);

  const filteredDebts = useMemo(() => {
    const q = keyword.trim().toLowerCase();

    if (!q) return debts;

    return debts.filter((item) => {
      return (
        String(item.full_name || "").toLowerCase().includes(q) ||
        String(item.booking_code || "").toLowerCase().includes(q) ||
        String(item.debt_status || "").toLowerCase().includes(q)
      );
    });
  }, [debts, keyword]);

  const stats = useMemo(() => {
    const totalRevenue = Number(overview?.revenue?.total_revenue || 0);
    const totalDebt = Number(overview?.debt?.total_debt || 0);
    const paidDebt = Number(overview?.debt?.paid_amount || 0);
    const remainingDebt = Number(overview?.debt?.remaining_amount || 0);
    const totalRefund = Number(overview?.refund?.total_refund || 0);
    const totalServiceCost = Number(
      overview?.service_cost?.total_service_cost || 0
    );
    const netCash = Number(overview?.summary?.net_cash || 0);
    const estimatedProfit = Number(overview?.summary?.estimated_profit || 0);

    const pendingDebts =
      Number(overview?.debt?.unpaid_count || 0) +
      Number(overview?.debt?.partial_count || 0);

    const pendingPayments = Number(overview?.revenue?.pending_payments || 0);

    return {
      totalRevenue,
      totalDebt,
      paidDebt,
      remainingDebt,
      totalRefund,
      totalServiceCost,
      netCash,
      estimatedProfit,
      pendingDebts,
      pendingPayments,
    };
  }, [overview]);

  const chart = useMemo(() => {
    const revenueBase = Math.max(stats.totalRevenue, 1);
    const paidBase = Math.max(stats.paidDebt, 1);

    return [0.38, 0.55, 0.7, 1, 0.82, 0.64].map((ratio, index) => {
      const revenue = Math.round(revenueBase * ratio);
      const recovery = Math.round(paidBase * Math.min(ratio + 0.08, 1));

      return {
        month: `Th.${index + 1}`,
        revenue,
        recovery,
        revenueHeight: Math.max(28, Math.round(ratio * 95)),
        recoveryHeight: Math.max(
          20,
          Math.round(Math.min(ratio + 0.08, 0.88) * 82)
        ),
      };
    });
  }, [stats.totalRevenue, stats.paidDebt]);

  const serviceCards = useMemo(
    () => [
      {
        icon: <Plane size={18} />,
        name: "Chi phí hàng không",
        service: `${Number(
          overview?.service_cost?.flight_count || 0
        ).toLocaleString("vi-VN")} dịch vụ chuyến bay`,
        amount: Number(overview?.service_cost?.flight_cost || 0),
        status: "Từ flight_services",
        tone: "primary" as const,
      },
      {
        icon: <Bus size={18} />,
        name: "Chi phí vận chuyển",
        service: `${Number(
          overview?.service_cost?.vehicle_count || 0
        ).toLocaleString("vi-VN")} dịch vụ xe`,
        amount: Number(overview?.service_cost?.vehicle_cost || 0),
        status: "Từ vehicle_services",
        tone: "orange" as const,
      },
      {
        icon: <BedDouble size={18} />,
        name: "Chi phí lưu trú",
        service: `${Number(
          overview?.service_cost?.hotel_count || 0
        ).toLocaleString("vi-VN")} dịch vụ khách sạn`,
        amount: Number(overview?.service_cost?.hotel_cost || 0),
        status: "Từ hotel_services",
        tone: "error" as const,
      },
    ],
    [overview]
  );

  function buildCsvContent(filteredP: Payment[], filteredD: Debt[], statsData: any, timeLabel: string) {
    const rows = [
      [`BÁO CÁO TÀI CHÍNH & CÔNG NỢ - ${timeLabel.toUpperCase()}`],
      [`Ngày lập`, new Date().toLocaleString("vi-VN")],
      [],
      ["Doanh thu thực thu", statsData.totalRevenue],
      ["Tổng công nợ", statsData.totalDebt],
      ["Đã thu công nợ", statsData.paidDebt],
      ["Còn phải thu", statsData.remainingDebt],
      ["Hoàn tiền thực tế", statsData.totalRefund],
      ["Chi phí dịch vụ", statsData.totalServiceCost],
      ["Dòng tiền ròng", statsData.netCash],
      ["Lợi nhuận tạm tính", statsData.estimatedProfit],
      [],
      ["CHI PHÍ DỊCH VỤ"],
      ["Loại chi phí", "Số tiền", "Ghi chú"],
      ["Hàng không", overview?.service_cost?.flight_cost || 0, "flight_services"],
      ["Vận chuyển", overview?.service_cost?.vehicle_cost || 0, "vehicle_services"],
      ["Lưu trú", overview?.service_cost?.hotel_cost || 0, "hotel_services"],
      [],
      ["CÔNG NỢ KHÁCH HÀNG"],
      ["Khách hàng", "Booking", "Tổng tiền", "Đã trả", "Còn lại", "Trạng thái"],
      ...filteredD.map((item) => [
        item.full_name || "",
        item.booking_code || "",
        item.total_amount || 0,
        item.paid_amount || 0,
        item.remaining_amount || 0,
        getDebtLabel(item.debt_status),
      ]),
      [],
      ["THANH TOÁN"],
      [
        "Mã thanh toán",
        "Booking",
        "Khách hàng",
        "Số tiền",
        "Ngày tạo",
        "Trạng thái",
      ],
      ...filteredP.map((item) => [
        item.payment_code || "",
        item.booking_code || "",
        item.full_name || "",
        item.amount || 0,
        formatDate(item.created_at),
        getPaymentLabel(item.payment_status),
      ]),
    ];

    return (
      "\uFEFF" +
      rows
        .map((r) =>
          r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")
        )
        .join("\n")
    );
  }

  function exportCsv(filteredP: Payment[], filteredD: Debt[], statsData: any) {
    if (timeFilter.type === "custom") {
      if (!timeFilter.customStartDate || !timeFilter.customEndDate) {
        alert("Vui lòng chọn đầy đủ ngày bắt đầu và ngày kết thúc.");
        return;
      }
      if (timeFilter.customStartDate > timeFilter.customEndDate) {
        alert("Ngày bắt đầu không được lớn hơn ngày kết thúc.");
        return;
      }
    }
    const timeLabel = formatReportTimeLabel(timeFilter);
    const fileSuffix = formatReportFilenameSuffix(timeFilter);
    downloadFile(
      `bao-cao-tai-chinh-${fileSuffix}.csv`,
      buildCsvContent(filteredP, filteredD, statsData, timeLabel),
      "text/csv;charset=utf-8"
    );
  }

  function exportPdf(filteredP: Payment[], filteredD: Debt[], statsData: any) {
    if (timeFilter.type === "custom") {
      if (!timeFilter.customStartDate || !timeFilter.customEndDate) {
        alert("Vui lòng chọn đầy đủ ngày bắt đầu và ngày kết thúc.");
        return;
      }
      if (timeFilter.customStartDate > timeFilter.customEndDate) {
        alert("Ngày bắt đầu không được lớn hơn ngày kết thúc.");
        return;
      }
    }
    const timeLabel = formatReportTimeLabel(timeFilter);
    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Báo cáo tài chính ${timeLabel}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #181c1d; }
            h1 { text-align: center; color: #00606c; font-size: 24px; margin-bottom: 5px; }
            .subtitle { text-align: center; font-size: 13px; color: #5f6b6d; margin-bottom: 20px; }
            h2 { color: #00606c; margin-top: 28px; font-size: 16px; border-bottom: 1px solid #dfe3e4; padding-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 11px; }
            th, td { border: 1px solid #dfe3e4; padding: 8px; text-align: left; }
            th { background: #f1f4f5; color: #3e494b; }
            .summary { margin-top: 15px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; font-size: 13px; }
            .summary p { margin: 5px 0; }
          </style>
        </head>
        <body>
          <h1>BÁO CÁO TÀI CHÍNH & CÔNG NỢ</h1>
          <div class="subtitle">Báo cáo: ${timeLabel} • Ngày xuất: ${new Date().toLocaleString("vi-VN")}</div>

          <h2>I. Tổng quan</h2>
          <div class="summary">
            <p><b>Doanh thu thực thu:</b> ${formatMoney(statsData.totalRevenue)}</p>
            <p><b>Tổng công nợ:</b> ${formatMoney(statsData.totalDebt)}</p>
            <p><b>Đã thu công nợ:</b> ${formatMoney(statsData.paidDebt)}</p>
            <p><b>Còn phải thu:</b> ${formatMoney(statsData.remainingDebt)}</p>
            <p><b>Hoàn tiền thực tế:</b> ${formatMoney(statsData.totalRefund)}</p>
            <p><b>Chi phí dịch vụ:</b> ${formatMoney(statsData.totalServiceCost)}</p>
            <p><b>Dòng tiền ròng:</b> ${formatMoney(statsData.netCash)}</p>
            <p><b>Lợi nhuận tạm tính:</b> ${formatMoney(statsData.estimatedProfit)}</p>
          </div>

          <h2>II. Chi phí dịch vụ</h2>
          <table>
            <thead>
              <tr>
                <th>Loại chi phí</th>
                <th>Số tiền</th>
                <th>Nguồn dữ liệu</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Hàng không</td>
                <td>${formatMoney(overview?.service_cost?.flight_cost)}</td>
                <td>flight_services</td>
              </tr>
              <tr>
                <td>Vận chuyển</td>
                <td>${formatMoney(overview?.service_cost?.vehicle_cost)}</td>
                <td>vehicle_services</td>
              </tr>
              <tr>
                <td>Lưu trú</td>
                <td>${formatMoney(overview?.service_cost?.hotel_cost)}</td>
                <td>hotel_services</td>
              </tr>
            </tbody>
          </table>

          <h2>III. Công nợ khách hàng</h2>
          <table>
            <thead>
              <tr>
                <th>Khách hàng</th>
                <th>Mã booking</th>
                <th>Tổng tiền</th>
                <th>Đã trả</th>
                <th>Còn lại</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              ${filteredD
                .map(
                  (item) => `
                <tr>
                  <td>${item.full_name || "-"}</td>
                  <td>${item.booking_code || "-"}</td>
                  <td>${formatMoney(item.total_amount)}</td>
                  <td>${formatMoney(item.paid_amount)}</td>
                  <td>${formatMoney(item.remaining_amount)}</td>
                  <td>${getDebtLabel(item.debt_status)}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "width=1000,height=800");

    if (!printWindow) {
      alert("Trình duyệt đang chặn popup. Vui lòng cho phép popup để xuất PDF.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  }

  function handleReminder(item?: Debt) {
    if (item) {
      const subject = encodeURIComponent(
        `Nhắc thanh toán công nợ booking ${item.booking_code || ""}`
      );
      const body = encodeURIComponent(
        `Kính gửi ${item.full_name || "Quý khách"},\n\nHệ thống ghi nhận booking ${
          item.booking_code || ""
        } còn công nợ ${formatMoney(
          item.remaining_amount
        )}. Quý khách vui lòng kiểm tra và thanh toán trong thời gian sớm nhất.\n\nTrân trọng,\nChillTrip.`
      );

      if (item.email) {
        window.location.href = `mailto:${item.email}?subject=${subject}&body=${body}`;
      } else {
        alert(
          `Đã tạo nội dung nhắc nợ cho ${
            item.full_name || "khách hàng"
          }. Khách chưa có email trong dữ liệu.`
        );
      }

      return;
    }

    setShowReminder(true);
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-[#00606c]/70">
            Finance & Debt Management
          </p>

          <h1 className="text-3xl font-black tracking-tight text-[#00606c]">
            Quản lý Tài chính & Công nợ
          </h1>

          <p className="mt-2 max-w-2xl text-[#3e494b]">
            Theo dõi doanh thu thực thu, công nợ khách hàng, hoàn tiền, chi phí
            dịch vụ và lợi nhuận tạm tính.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowReportPreview(true)}
            className="inline-flex items-center gap-2 rounded-full bg-[#f1f4f5] px-6 py-3 font-black text-[#00606c] transition hover:bg-[#dfe3e4]"
          >
            <Eye size={18} />
            Xem trước / xuất báo cáo
          </button>

          <button
            onClick={() => handleReminder()}
            className="inline-flex items-center gap-2 rounded-full bg-[#00606c] px-6 py-3 font-black text-white shadow-lg shadow-[#00606c]/20 transition hover:scale-105"
          >
            <Send size={18} />
            Nhắc nợ
          </button>

          <button
            onClick={() => {
              let start: string | undefined;
              let end: string | undefined;

              if (timeFilter.type === "custom") {
                start = timeFilter.customStartDate;
                end = timeFilter.customEndDate;
              } else if (timeFilter.type === "month") {
                start = `${timeFilter.year}-${String(timeFilter.month).padStart(2, "0")}-01`;
                const lastDay = new Date(timeFilter.year, timeFilter.month, 0).getDate();
                end = `${timeFilter.year}-${String(timeFilter.month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
              } else if (timeFilter.type === "quarter") {
                const startMonth = (timeFilter.quarter - 1) * 3 + 1;
                const endMonth = timeFilter.quarter * 3;
                start = `${timeFilter.year}-${String(startMonth).padStart(2, "0")}-01`;
                const lastDay = new Date(timeFilter.year, endMonth, 0).getDate();
                end = `${timeFilter.year}-${String(endMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
              }
              loadData(start, end);
            }}
            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 font-black text-[#00606c] shadow-sm transition hover:bg-[#9defff]/30 cursor-pointer"
          >
            <RefreshCcw size={18} className={loading ? "animate-spin" : ""} />
            Làm mới
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Doanh thu thực thu"
          value={formatMoney(stats.totalRevenue)}
          desc={`${Number(overview?.revenue?.paid_payments || 0)} giao dịch đã thanh toán`}
          icon={Wallet}
          tone="primary"
        />

        <KpiCard
          title="Còn phải thu"
          value={formatMoney(stats.remainingDebt)}
          desc={`${stats.pendingDebts} khoản công nợ`}
          icon={AlertTriangle}
          tone="secondary"
        />

        <KpiCard
          title="Chi phí dịch vụ"
          value={formatMoney(stats.totalServiceCost)}
          desc="Vé bay, xe, khách sạn"
          icon={Handshake}
          tone="tertiary"
        />

        <KpiCard
          title="Lợi nhuận tạm tính"
          value={formatMoney(stats.estimatedProfit)}
          desc={`Dòng tiền ròng: ${formatMoney(stats.netCash)}`}
          icon={Landmark}
          tone="dark"
        />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-[2.5rem] bg-white p-8 shadow-sm xl:col-span-2">
          <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h3 className="text-xl font-black text-[#00606c]">
                Doanh thu & Thu hồi nợ
              </h3>
              <p className="text-sm text-[#6e797b]">
                Rê chuột vào từng cột để xem doanh thu thực thu và công nợ đã
                thu.
              </p>
            </div>

            <div className="flex gap-4">
              <Legend color="bg-[#00606c]" label="Doanh thu" />
              <Legend color="bg-[#9b4500]" label="Thu hồi nợ" />
            </div>
          </div>

          <div className="relative flex h-72 items-end justify-between gap-5 px-2">
            <div className="absolute inset-0 flex flex-col justify-between py-3 opacity-10">
              <div className="border-b border-[#181c1d]" />
              <div className="border-b border-[#181c1d]" />
              <div className="border-b border-[#181c1d]" />
              <div className="border-b border-[#181c1d]" />
            </div>

            {chart.map((item, index) => (
              <div
                key={item.month}
                onMouseEnter={() => setHoverChart(item)}
                onMouseLeave={() => setHoverChart(null)}
                className="relative z-10 flex h-full flex-1 items-end justify-center gap-1.5"
              >
                <div
                  className={`w-full rounded-t-2xl transition ${
                    index === 3 ? "bg-[#00606c]" : "bg-[#00606c]/25"
                  } hover:bg-[#00606c]`}
                  style={{ height: `${item.revenueHeight}%` }}
                />
                <div
                  className={`w-full rounded-t-2xl transition ${
                    index === 3 ? "bg-[#9b4500]" : "bg-[#9b4500]/25"
                  } hover:bg-[#9b4500]`}
                  style={{ height: `${item.recoveryHeight}%` }}
                />
                <span
                  className={`absolute -bottom-7 text-[11px] font-black ${
                    index === 3 ? "text-[#00606c]" : "text-[#6e797b]"
                  }`}
                >
                  {item.month}
                </span>
              </div>
            ))}

            {hoverChart && (
              <div className="absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-2xl bg-[#181c1d] px-5 py-3 text-xs font-bold text-white shadow-xl">
                <p className="mb-1 text-[#9defff]">{hoverChart.month}</p>
                <p>Doanh thu: {formatMoney(hoverChart.revenue)}</p>
                <p>Thu hồi nợ: {formatMoney(hoverChart.recovery)}</p>
              </div>
            )}
          </div>
        </div>

        <div className="relative flex overflow-hidden rounded-[2.5rem] bg-[#007b8a] p-8 text-white shadow-xl">
          <img
            alt="Financial Planning"
            src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80"
            className="absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-overlay"
          />

          <div className="relative z-10 flex flex-1 flex-col">
            <span className="mb-4 w-fit rounded-full bg-white/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest">
              Gợi ý vận hành
            </span>

            <h3 className="mb-4 text-2xl font-black">Tối ưu lợi nhuận</h3>

            <p className="mb-6 text-sm leading-7 text-white/85">
              Chi phí dịch vụ hiện tại là{" "}
              <span className="font-black text-[#9defff]">
                {formatMoney(stats.totalServiceCost)}
              </span>
              . Nên đối soát chi phí xe, khách sạn và vé bay theo từng đợt
              khởi hành.
            </p>

            <div className="space-y-3">
              <SuggestItem text="Đối soát chi phí dịch vụ theo tour" />
              <SuggestItem text="Ưu tiên thu hồi công nợ còn lại" />
            </div>

            <button
              onClick={() => setShowServiceCost(true)}
              className="mt-auto rounded-full bg-white px-5 py-3 font-black text-[#00606c] transition hover:bg-[#9defff]"
            >
              Xem chi phí dịch vụ
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        <div className="overflow-hidden rounded-[2.5rem] bg-white shadow-sm">
          <TableHeader
            icon={<User size={20} />}
            title="Công nợ khách hàng"
            action="Xem tất cả"
            onAction={() => setShowAllDebts(true)}
          />

          <div className="border-b border-[#bdc8cb]/10 px-6 py-4">
            <div className="flex w-full items-center rounded-full bg-[#f1f4f5] px-4 py-2">
              <Search size={17} className="mr-2 text-[#00606c]" />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Tìm khách hàng, mã booking..."
                className="w-full bg-transparent text-sm font-semibold outline-none"
              />
            </div>
          </div>

          <DebtTable debts={filteredDebts.slice(0, 6)} onReminder={handleReminder} />
        </div>

        <div className="overflow-hidden rounded-[2.5rem] bg-white shadow-sm">
          <TableHeader
            icon={<Wallet size={20} />}
            title="Thanh toán gần đây"
            action="Lịch sử thanh toán"
            onAction={() => setShowAllPayments(true)}
          />

          <PaymentTable payments={payments.slice(0, 6)} />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {serviceCards.map((item) => (
          <ServiceCostCard
            key={item.name}
            {...item}
            onClick={() => setShowServiceCost(true)}
          />
        ))}
      </section>

      {showReportPreview && (
        <Modal
          title="Xem trước báo cáo tài chính"
          onClose={() => setShowReportPreview(false)}
          wide
        >
          <div className="space-y-6 text-[#181c1d]">
            {/* Nhúng bộ chọn thời gian vào đầu modal xem trước */}
            <div className="bg-[#f6fafb] p-5 rounded-2xl ring-1 ring-[#ebeeef]">
              <ExportTimeFilter value={timeFilter} onChange={setTimeFilter} />
            </div>

            <div className="text-center font-bold">
              <h2 className="text-xl font-bold text-[#00606c]">
                BÁO CÁO TÀI CHÍNH & CÔNG NỢ
              </h2>
              <p className="text-xs text-[#5f6b6d] mt-1">Báo cáo: {formatReportTimeLabel(timeFilter)} • Ngày lập: {new Date().toLocaleDateString("vi-VN")}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm font-semibold">
              <ReportLine
                label="Doanh thu thực thu trong kỳ"
                value={formatMoney(filteredStats.totalRevenue)}
              />
              <ReportLine
                label="Tổng công nợ phát sinh"
                value={formatMoney(filteredStats.totalDebt)}
              />
              <ReportLine
                label="Đã thu công nợ"
                value={formatMoney(filteredStats.paidDebt)}
              />
              <ReportLine
                label="Còn phải thu"
                value={formatMoney(filteredStats.remainingDebt)}
              />
              <ReportLine
                label="Hoàn tiền thực tế"
                value={formatMoney(filteredStats.totalRefund)}
              />
              <ReportLine
                label="Chi phí dịch vụ (Tổng quan)"
                value={formatMoney(filteredStats.totalServiceCost)}
              />
              <ReportLine
                label="Dòng tiền ròng"
                value={formatMoney(filteredStats.netCash)}
              />
              <ReportLine
                label="Lợi nhuận tạm tính"
                value={formatMoney(filteredStats.estimatedProfit)}
              />
            </div>

            <div className="flex justify-end gap-3 border-t pt-5">
              <button
                onClick={() => exportCsv(timeFilteredPayments, timeFilteredDebts, filteredStats)}
                className="rounded-full bg-[#f1f4f5] px-6 py-3 font-black text-[#00606c]"
              >
                Xuất CSV
              </button>

              <button
                onClick={() => exportPdf(timeFilteredPayments, timeFilteredDebts, filteredStats)}
                className="rounded-full bg-[#00606c] px-6 py-3 font-black text-white"
              >
                Xuất PDF
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showReminder && (
        <Modal title="Nhắc nợ khách hàng" onClose={() => setShowReminder(false)} wide>
          <DebtTable
            debts={debts.filter((item) =>
              ["UNPAID", "PARTIAL", "OVERDUE"].includes(String(item.debt_status))
            )}
            onReminder={handleReminder}
          />
        </Modal>
      )}

      {showAllDebts && (
        <Modal
          title="Tất cả công nợ khách hàng"
          onClose={() => setShowAllDebts(false)}
          wide
        >
          <DebtTable debts={filteredDebts} onReminder={handleReminder} />
        </Modal>
      )}

      {showAllPayments && (
        <Modal title="Lịch sử thanh toán" onClose={() => setShowAllPayments(false)} wide>
          <PaymentTable payments={payments} />
        </Modal>
      )}

      {showServiceCost && (
        <Modal title="Chi phí dịch vụ thực tế" onClose={() => setShowServiceCost(false)} wide>
          <div className="grid gap-4 md:grid-cols-3">
            {serviceCards.map((item) => (
              <ServiceCostCard key={item.name} {...item} />
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

function DebtTable({
  debts,
  onReminder,
}: {
  debts: Debt[];
  onReminder: (item: Debt) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[780px] text-left">
        <thead className="bg-[#f1f4f5] text-[10px] font-black uppercase tracking-widest text-[#3e494b]">
          <tr>
            <th className="px-6 py-4">Khách hàng</th>
            <th className="px-6 py-4">Booking</th>
            <th className="px-6 py-4">Tổng tiền</th>
            <th className="px-6 py-4">Đã trả</th>
            <th className="px-6 py-4">Còn lại</th>
            <th className="px-6 py-4">Trạng thái</th>
            <th className="px-6 py-4 text-right">Thao tác</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-[#bdc8cb]/10 text-sm">
          {debts.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-6 py-10 text-center font-bold text-[#6e797b]">
                Không có dữ liệu công nợ.
              </td>
            </tr>
          ) : (
            debts.map((item) => (
              <tr key={item.id} className="transition hover:bg-[#f1f4f5]/40">
                <td className="px-6 py-4 font-black">{item.full_name || "-"}</td>
                <td className="px-6 py-4 font-semibold text-[#6e797b]">
                  #{item.booking_code || "-"}
                </td>
                <td className="px-6 py-4">{formatMoney(item.total_amount)}</td>
                <td className="px-6 py-4">{formatMoney(item.paid_amount)}</td>
                <td className="px-6 py-4 font-black text-[#ba1a1a]">
                  {formatMoney(item.remaining_amount)}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${getDebtClass(
                      item.debt_status
                    )}`}
                  >
                    {getDebtLabel(item.debt_status)}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => onReminder(item)}
                    className="inline-flex items-center gap-1 rounded-full bg-[#00606c] px-3 py-2 text-xs font-black text-white"
                  >
                    <Mail size={14} />
                    Nhắc nợ
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function PaymentTable({ payments }: { payments: Payment[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left">
        <thead className="bg-[#f1f4f5] text-[10px] font-black uppercase tracking-widest text-[#3e494b]">
          <tr>
            <th className="px-6 py-4">Mã thanh toán</th>
            <th className="px-6 py-4">Booking</th>
            <th className="px-6 py-4">Khách hàng</th>
            <th className="px-6 py-4">Số tiền</th>
            <th className="px-6 py-4">Ngày tạo</th>
            <th className="px-6 py-4">Trạng thái</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-[#bdc8cb]/10 text-sm">
          {payments.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-6 py-10 text-center font-bold text-[#6e797b]">
                Không có dữ liệu thanh toán.
              </td>
            </tr>
          ) : (
            payments.map((item) => (
              <tr key={item.id} className="transition hover:bg-[#f1f4f5]/40">
                <td className="px-6 py-4 font-mono font-black text-[#00606c]">
                  {item.payment_code || "-"}
                </td>
                <td className="px-6 py-4 font-semibold text-[#6e797b]">
                  #{item.booking_code || "-"}
                </td>
                <td className="px-6 py-4 font-black">{item.full_name || "-"}</td>
                <td className="px-6 py-4 font-black text-[#9b4500]">
                  {formatMoney(item.amount)}
                </td>
                <td className="px-6 py-4">{formatDate(item.created_at)}</td>
                <td className="px-6 py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${getPaymentClass(
                      item.payment_status
                    )}`}
                  >
                    {getPaymentLabel(item.payment_status)}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function KpiCard({
  title,
  value,
  desc,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string;
  desc: string;
  icon: any;
  tone: "primary" | "secondary" | "tertiary" | "dark";
}) {
  const styles = {
    primary: {
      iconWrap: "bg-[#00606c]/10",
      iconColor: "text-[#00606c]",
      title: "text-[#00606c]",
      glow: "bg-[#00606c]/5",
    },
    secondary: {
      iconWrap: "bg-[#ffdbc9]",
      iconColor: "text-[#9b4500]",
      title: "text-[#9b4500]",
      glow: "bg-[#9b4500]/5",
    },
    tertiary: {
      iconWrap: "bg-[#b3ebff]",
      iconColor: "text-[#006074]",
      title: "text-[#006074]",
      glow: "bg-[#006074]/5",
    },
    dark: {
      iconWrap: "bg-white/20",
      iconColor: "text-white",
      title: "text-white",
      glow: "bg-white/10",
    },
  }[tone];

  const dark = tone === "dark";

  return (
    <div
      className={`group relative overflow-hidden rounded-[2.5rem] p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${
        dark ? "bg-[#00606c]" : "bg-white"
      }`}
    >
      <div
        className={`absolute -right-10 -top-10 h-28 w-28 rounded-full transition group-hover:scale-150 ${styles.glow}`}
      />

      <div className="relative z-10 flex min-h-[150px] flex-col justify-between">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${styles.iconWrap}`}
        >
          <Icon size={22} className={styles.iconColor} />
        </div>

        <div>
          <p
            className={`text-xs font-black uppercase tracking-widest ${
              dark ? "text-white/75" : "text-[#6e797b]"
            }`}
          >
            {title}
          </p>
          <h3 className={`mt-1 text-2xl font-black ${styles.title}`}>
            {value}
          </h3>
          <div
            className={`mt-2 flex items-center gap-1 text-xs font-black ${
              dark ? "text-[#9defff]" : "text-green-600"
            }`}
          >
            <TrendingUp size={13} />
            {desc}
          </div>
        </div>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-3 w-3 rounded-full ${color}`} />
      <span className="text-[10px] font-black uppercase text-[#3e494b]">
        {label}
      </span>
    </div>
  );
}

function SuggestItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-3 backdrop-blur-sm">
      <Sparkles size={17} className="text-[#9defff]" />
      <p className="text-xs font-semibold">{text}</p>
    </div>
  );
}

function TableHeader({
  icon,
  title,
  action,
  onAction,
}: {
  icon: React.ReactNode;
  title: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="flex items-center justify-between border-b border-[#bdc8cb]/10 p-6">
      <h3 className="flex items-center gap-2 text-lg font-black text-[#00606c]">
        {icon}
        {title}
      </h3>

      <button
        onClick={onAction}
        className="text-xs font-black uppercase tracking-widest text-[#00606c] hover:underline"
      >
        {action}
      </button>
    </div>
  );
}

function ServiceCostCard({
  icon,
  name,
  service,
  amount,
  status,
  tone,
  onClick,
}: {
  icon: React.ReactNode;
  name: string;
  service: string;
  amount: number;
  status: string;
  tone: "primary" | "orange" | "error";
  onClick?: () => void;
}) {
  const styles = {
    primary: "text-[#00606c]",
    orange: "text-[#9b4500]",
    error: "text-[#ba1a1a]",
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[2rem] bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f1f4f5] text-[#00606c]">
          {icon}
        </div>
        <div>
          <h4 className="font-black text-[#181c1d]">{name}</h4>
          <p className="text-xs font-semibold text-[#6e797b]">{service}</p>
        </div>
      </div>

      <p className={`text-xl font-black ${styles}`}>{formatMoney(amount)}</p>
      <p className={`mt-2 text-xs font-black italic ${styles}`}>{status}</p>
    </button>
  );
}

function ReportLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#bdc8cb] p-3">
      <p className="text-sm font-bold">{label}</p>
      <p className="text-lg font-bold text-[#00606c]">{value}</p>
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
  wide,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div
        className={`max-h-[90vh] overflow-hidden rounded-[2rem] bg-white shadow-2xl ${
          wide ? "w-full max-w-6xl" : "w-full max-w-xl"
        }`}
      >
        <div className="flex items-center justify-between border-b border-[#bdc8cb]/20 px-6 py-5">
          <h3 className="text-xl font-black text-[#00606c]">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-full bg-[#f1f4f5] p-2 text-[#3e494b]"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}