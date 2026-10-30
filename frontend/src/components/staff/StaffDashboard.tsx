"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Headphones,
  Loader2,
  Map,
  MessageCircle,
  Plane,
  Plus,
  ReceiptText,
  Search,
  Send,
  Sparkles,
  Star,
  UserPlus,
  Users,
} from "lucide-react";
import {
  getStaffDashboardApi,
  getStaffFinanceApi,
  type StaffDashboardData,
  type StaffFinanceData,
} from "@/lib/api/staff.api";
import {
  exportFinanceExcel,
  exportFinancePdf,
} from "@/components/staff/StaffFinance";
import ExportTimeFilter, {
  TimeFilterOptions,
  formatReportTimeLabel,
  formatReportFilenameSuffix,
  filterItemsByTime,
} from "@/components/shared/ExportTimeFilter";
import { Download, FileText, X } from "lucide-react";

function formatMoney(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value || 0) + "đ";
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) return "Chào buổi sáng";
  if (hour >= 12 && hour < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

function getStatusLabel(status: string) {
  switch (status) {
    case "PENDING":
      return "Chờ xác nhận";
    case "CONFIRMED":
      return "Đã xác nhận";
    case "DEPOSITED":
      return "Đặt cọc";
    case "PARTIALLY_PAID":
      return "Thanh toán một phần";
    case "PAID":
      return "Đã thanh toán";
    case "CANCELLED":
      return "Đã hủy";
    case "COMPLETED":
      return "Hoàn thành";
    default:
      return status || "Chưa rõ";
  }
}

function getStatusClass(status: string) {
  switch (status) {
    case "PENDING":
      return "bg-[#ffdbc9] text-[#672c00]";
    case "CONFIRMED":
      return "bg-[#9defff] text-[#001f24]";
    case "PAID":
    case "COMPLETED":
      return "bg-emerald-100 text-emerald-700";
    case "CANCELLED":
      return "bg-red-100 text-red-700";
    case "PARTIALLY_PAID":
    case "DEPOSITED":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default function StaffDashboard() {
  const [data, setData] = useState<StaffDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [showReportFilterModal, setShowReportFilterModal] = useState(false);
  const [timeFilter, setTimeFilter] = useState<TimeFilterOptions>({
    type: "month",
    month: new Date().getMonth() + 1,
    quarter: 1,
    year: new Date().getFullYear(),
  });
  const [exportLoading, setExportLoading] = useState(false);

  const handleFinanceExport = async (format: "excel" | "pdf") => {
    try {
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

      setExportLoading(true);

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

      const financeData = await getStaffFinanceApi({
        startDate: start,
        endDate: end,
      });
      if (!financeData) {
        alert("Không lấy được dữ liệu tài chính.");
        return;
      }

      // Lọc dữ liệu theo thời gian được chọn
      const filteredTransactions = filterItemsByTime(
        financeData.transactions || [],
        (item) => item.paidAt || item.createdAt,
        timeFilter
      );

      const filteredDebts = filterItemsByTime(
        financeData.debts || [],
        (item) => item.bookedAt,
        timeFilter
      );

      const filteredRefunds = filterItemsByTime(
        financeData.refunds || [],
        (item) => item.refundAt || item.createdAt,
        timeFilter
      );

      // Tính toán lại summary
      const paidTrans = filteredTransactions.filter(
        (t) => t.paymentStatus === "PAID"
      );
      const pendingTrans = filteredTransactions.filter(
        (t) => t.paymentStatus === "PENDING"
      );

      const paidAmount = paidTrans.reduce(
        (sum, t) => sum + Number(t.amount || 0),
        0
      );
      const pendingPaymentAmount = pendingTrans.reduce(
        (sum, t) => sum + Number(t.amount || 0),
        0
      );
      const monthRevenue = paidAmount;
      const unpaidDebtAmount = filteredDebts.reduce(
        (sum, d) => sum + Number(d.remainingAmount || 0),
        0
      );
      const refundAmount = filteredRefunds
        .filter((r) => r.refundStatus !== "REJECTED")
        .reduce((sum, r) => sum + Number(r.refundAmount || 0), 0);
      const netRevenue = monthRevenue - refundAmount;

      const filteredSummary = {
        monthRevenue,
        pendingPaymentAmount,
        paidAmount,
        unpaidDebtAmount,
        refundAmount,
        netRevenue,
      };

      const exportData: StaffFinanceData = {
        ...financeData,
        summary: filteredSummary,
        transactions: filteredTransactions,
        debts: filteredDebts,
        refunds: filteredRefunds,
      };

      const timeLabel = formatReportTimeLabel(timeFilter);
      const fileSuffix = formatReportFilenameSuffix(timeFilter);

      if (format === "excel") {
        await exportFinanceExcel(exportData, timeLabel, fileSuffix);
      } else {
        exportFinancePdf(exportData, timeLabel);
      }

      setShowReportFilterModal(false);
    } catch (error) {
      console.error("Export finance error:", error);
      alert("Đã xảy ra lỗi khi xuất báo cáo.");
    } finally {
      setExportLoading(false);
    }
  };

  async function loadDashboard() {
    try {
      setLoading(true);
      setErrorMessage("");

      const result = await getStaffDashboardApi();

      setData(result);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Không tải được dữ liệu dashboard"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const bookings = useMemo(() => data?.bookings || [], [data]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6fafb]">
        <div className="flex items-center gap-3 rounded-[2rem] bg-white px-6 py-4 shadow-sm">
          <Loader2 className="animate-spin text-[#00606c]" size={22} />
          <span className="font-semibold text-[#00606c]">
            Đang tải dữ liệu nhân viên...
          </span>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="min-h-screen bg-[#f6fafb] p-8">
        <div className="rounded-[2rem] border border-red-200 bg-white p-6 text-red-700 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-bold">
            <AlertCircle size={20} />
            Không tải được dữ liệu
          </div>

          <p className="text-sm">{errorMessage}</p>

          <button
            type="button"
            onClick={loadDashboard}
            className="mt-5 rounded-full bg-[#00606c] px-5 py-2 text-sm font-bold text-white"
          >
            Tải lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6fafb] px-6 py-8 text-[#181c1d] lg:px-8">
      {/* HEADER */}
      <section className="mb-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <h1 className="text-3xl font-black tracking-[-0.04em] text-[#00606c] md:text-5xl">
              {getGreeting()}, Công nhân viên
            </h1>

            <p className="mt-2 text-sm text-[#3e494b] md:text-base">
              Dưới đây là tổng quan tình hình vận hành của ChillTrip hôm nay.
            </p>
          </div>

          <div className="relative w-full max-w-md">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6e797b]"
              size={20}
            />
            <input
              className="h-12 w-full rounded-full border-none bg-white pl-12 pr-5 text-sm shadow-sm outline-none ring-1 ring-[#e5e9ea] transition focus:ring-2 focus:ring-[#00606c]"
              placeholder="Tìm kiếm đặt chỗ, khách hàng hoặc tour..."
            />
          </div>
        </div>
      </section>

      {/* STAT CARDS */}
      <section className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <div className="group flex h-44 flex-col justify-between overflow-hidden rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-[#ebeeef] transition hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <Plane className="text-[#00606c]" size={32} />
            <span className="rounded-full bg-[#ddf9ff] px-3 py-1 text-xs font-black text-[#004f59]">
              24h
            </span>
          </div>

          <div>
            <p className="text-4xl font-black text-[#00606c]">
              {data?.summary.upcomingTours || 0}
            </p>
            <p className="mt-1 text-sm font-bold text-[#3e494b]">
              Tour sắp khởi hành
            </p>
          </div>
        </div>

        <div className="group flex h-44 flex-col justify-between overflow-hidden rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-[#ebeeef] transition hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <Clock3 className="text-[#9b4500]" size={32} />
            <span className="rounded-full bg-[#ffdbc9] px-3 py-1 text-xs font-black text-[#672c00]">
              Cần xử lý
            </span>
          </div>

          <div>
            <p className="text-4xl font-black text-[#9b4500]">
              {data?.summary.pendingBookings || 0}
            </p>
            <p className="mt-1 text-sm font-bold text-[#3e494b]">
              Booking chờ xác nhận
            </p>
          </div>
        </div>

        <div className="group flex h-44 flex-col justify-between overflow-hidden rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-[#ebeeef] transition hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <Headphones className="text-[#007a93]" size={32} />
            <span className="rounded-full bg-[#e5f7ff] px-3 py-1 text-xs font-black text-[#004e5f]">
              Hỗ trợ
            </span>
          </div>

          <div>
            <p className="text-4xl font-black text-[#007a93]">
              {data?.summary.supportRequests || 0}
            </p>
            <p className="mt-1 text-sm font-bold text-[#3e494b]">
              Yêu cầu khách hàng
            </p>
          </div>
        </div>

        <div className="group flex h-44 flex-col justify-between overflow-hidden rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-[#ebeeef] transition hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <Map className="text-[#00606c]" size={32} />
            <span className="rounded-full bg-[#ddf9ff] px-3 py-1 text-xs font-black text-[#004f59]">
              Logistics
            </span>
          </div>

          <div>
            <p className="text-4xl font-black text-[#00606c]">
              {data?.summary.preparingOperations || 0}
            </p>
            <p className="mt-1 text-sm font-bold text-[#3e494b]">
              Tour đang chuẩn bị
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
        {/* MAIN COLUMN */}
        <div className="space-y-8 xl:col-span-2">
          {/* BOOKING TABLE */}
          <section>
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="flex items-center gap-3 text-2xl font-black tracking-[-0.03em]">
                <CalendarDays className="text-[#00606c]" />
                Booking mới nhất
              </h2>

              <button className="rounded-full px-4 py-2 text-sm font-bold text-[#00606c] hover:bg-[#ddf9ff]">
                Xem tất cả
              </button>
            </div>

            <div className="overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-[#ebeeef]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left">
                  <thead>
                    <tr className="bg-[#f1f4f5] text-[11px] font-black uppercase tracking-[0.16em] text-[#6e797b]">
                      <th className="px-7 py-5">Tour / Mã</th>
                      <th className="px-5 py-5">Khách hàng</th>
                      <th className="px-5 py-5">Ngày đi</th>
                      <th className="px-5 py-5 text-right">Giá trị</th>
                      <th className="px-7 py-5 text-right">Trạng thái</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#ebeeef]">
                    {bookings.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-7 py-12 text-center text-sm text-[#6e797b]"
                        >
                          Chưa có booking mới.
                        </td>
                      </tr>
                    ) : (
                      bookings.map((booking) => (
                        <tr
                          key={booking.id}
                          className="group cursor-pointer transition hover:bg-[#f6fafb]"
                        >
                          <td className="px-7 py-5">
                            <div className="flex flex-col">
                              <span className="font-black text-[#181c1d] transition group-hover:text-[#00606c]">
                                {booking.tour}
                              </span>
                              <span className="mt-1 text-xs font-semibold text-[#6e797b]">
                                #{booking.bookingCode}
                              </span>
                            </div>
                          </td>

                          <td className="px-5 py-5">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ddf9ff] text-sm font-black text-[#00606c]">
                                {booking.customer?.charAt(0) || "K"}
                              </div>
                              <span className="text-sm font-bold text-[#3e494b]">
                                {booking.customer}
                              </span>
                            </div>
                          </td>

                          <td className="px-5 py-5 text-sm font-semibold text-[#3e494b]">
                            {booking.date || "Chưa có ngày"}
                          </td>

                          <td className="px-5 py-5 text-right text-base font-black text-[#00606c]">
                            {formatMoney(booking.price)}
                          </td>

                          <td className="px-7 py-5 text-right">
                            <span
                              className={`inline-flex rounded-full px-4 py-1.5 text-[11px] font-black uppercase ${getStatusClass(
                                booking.status
                              )}`}
                            >
                              {getStatusLabel(booking.status)}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* HIGHLIGHT */}
          <section className="overflow-hidden rounded-[2rem] bg-[#00606c] p-8 text-white shadow-sm">
            <div className="relative z-10 max-w-xl">
              <span className="inline-flex rounded-full bg-[#fc8a40] px-3 py-1 text-xs font-black uppercase tracking-widest">
                Vận hành hôm nay
              </span>

              <h3 className="mt-5 text-3xl font-black tracking-[-0.04em]">
                Có {data?.summary.urgentTasks || 0} tác vụ cần ưu tiên xử lý
              </h3>

              <p className="mt-3 text-sm leading-6 text-[#ddf9ff]">
                Bao gồm booking chờ xác nhận, yêu cầu hỗ trợ, tour sắp khởi
                hành và các đầu việc điều phối trước ngày đi.
              </p>

              <Link href="/staff/operation" className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-black !text-[#00606c] transition hover:scale-105">
                Xem tác vụ ưu tiên
                <ArrowRight size={18} className="!text-[#00606c]" />
              </Link>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN */}
        <aside className="space-y-6">
          {/* URGENT TASKS */}
          <section className="rounded-[2rem] bg-[#f1f4f5] p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3 border-b border-[#bdc8cb] pb-4">
              <AlertCircle className="text-[#ba1a1a]" size={22} />
              <h3 className="text-lg font-black uppercase tracking-[-0.02em]">
                Nhiệm vụ khẩn cấp
              </h3>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border-l-4 border-[#ba1a1a] bg-white p-5 shadow-sm transition hover:translate-x-1">
                <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-[#6e797b]">
                  Booking chờ xác nhận
                </p>
                <p className="font-black text-[#181c1d]">
                  {data?.summary.pendingBookings || 0} booking cần xử lý
                </p>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="font-semibold text-[#3e494b]">
                    Ưu tiên trong ngày
                  </span>
                  <ArrowRight className="text-[#00606c]" size={18} />
                </div>
              </div>

              <div className="rounded-2xl border-l-4 border-[#9b4500] bg-white p-5 shadow-sm transition hover:translate-x-1">
                <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-[#6e797b]">
                  Điều hành tour
                </p>
                <p className="font-black text-[#181c1d]">
                  {data?.logistics.pendingGuideAssign || 0} tour chờ phân công
                  HDV
                </p>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="font-semibold text-[#3e494b]">
                    Kiểm tra lịch khởi hành
                  </span>
                  <ArrowRight className="text-[#00606c]" size={18} />
                </div>
              </div>

              <div className="rounded-2xl border-l-4 border-[#00606c] bg-white p-5 shadow-sm transition hover:translate-x-1">
                <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-[#6e797b]">
                  Hồ sơ
                </p>
                <p className="font-black text-[#181c1d]">
                  {data?.logistics.missingDocuments || 0} hồ sơ cần bổ sung
                </p>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="font-semibold text-[#3e494b]">
                    Theo dõi giấy tờ khách
                  </span>
                  <ArrowRight className="text-[#00606c]" size={18} />
                </div>
              </div>
            </div>
          </section>

          {/* QUICK ACTIONS */}
          <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-[#ebeeef]">
            <h3 className="mb-5 text-lg font-black">Thao tác nhanh</h3>

            <div className="grid grid-cols-2 gap-4">
              <Link href="/staff/customers" className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-3xl bg-[#f1f4f5] p-4 text-[#3e494b] transition hover:bg-[#ddf9ff] hover:text-[#00606c]">
                <UserPlus size={24} />
                <span className="text-xs font-black">Thêm khách</span>
              </Link>

              <Link href="/staff/finance" className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-3xl bg-[#f1f4f5] p-4 text-[#3e494b] transition hover:bg-[#ddf9ff] hover:text-[#00606c]">
                <ReceiptText size={24} />
                <span className="text-xs font-black">Tạo báo cáo</span>
              </Link>

              <Link href="/staff/requests" className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-3xl bg-[#f1f4f5] p-4 text-[#3e494b] transition hover:bg-[#ddf9ff] hover:text-[#00606c]">
                <Send size={24} />
                <span className="text-xs font-black">Gửi email</span>
              </Link>

              <Link href="/staff/schedule" className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-3xl bg-[#f1f4f5] p-4 text-[#3e494b] transition hover:bg-[#ddf9ff] hover:text-[#00606c]">
                <MessageCircle size={24} />
                <span className="text-xs font-black">Liên hệ HDV</span>
              </Link>
            </div>
          </section>

          {/* FINANCE */}
          <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-[#ebeeef]">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-black">Tài chính hôm nay</h3>
              <Sparkles className="text-[#9b4500]" size={20} />
            </div>

            <p className="text-3xl font-black text-[#00606c]">
              {formatMoney(data?.summary.todayRevenue || 0)}
            </p>

            <div className="mt-5">
              <div className="mb-2 flex justify-between text-sm">
                <span className="font-semibold text-[#3e494b]">
                  Công nợ còn lại
                </span>
                <span className="font-black text-[#181c1d]">
                  {formatMoney(data?.summary.unpaidDebt || 0)}
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-[#dfe3e4]">
                <div className="h-full w-[65%] rounded-full bg-[#00606c]" />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowReportFilterModal(true)}
              className="mt-6 w-full rounded-full bg-[#00606c] py-3 text-sm font-black text-white transition hover:bg-[#004f59]"
            >
              Xuất báo cáo tài chính
            </button>
          </section>

          {/* MAP / STATUS */}
          <section className="relative h-64 overflow-hidden rounded-[2rem] bg-[#00606c] shadow-sm">
            <div className="absolute inset-0 bg-gradient-to-t from-[#00606c] via-[#00606c]/70 to-[#00606c]/20" />

            <div className="absolute right-6 top-6">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#fc8a40] opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-[#fc8a40]" />
              </span>
            </div>

            <div className="absolute bottom-6 left-6 right-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur">
                <Star size={22} />
              </div>
              <p className="text-xl font-black text-white">Bản đồ điều phối</p>
              <p className="mt-1 text-sm font-semibold text-[#ddf9ff]">
                Theo dõi tour, HDV và tình trạng khởi hành trực tuyến.
              </p>
            </div>
          </section>
        </aside>
      </div>
      {showReportFilterModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md overflow-hidden rounded-[2rem] bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between border-b border-[#ebeeef] pb-4">
              <h3 className="text-lg font-black text-[#00606c]">Xuất báo cáo tài chính</h3>
              <button
                type="button"
                onClick={() => setShowReportFilterModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f1f4f5] text-[#3e494b]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="my-6">
              <ExportTimeFilter value={timeFilter} onChange={setTimeFilter} />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowReportFilterModal(false)}
                className="flex-1 rounded-full border border-[#bdc8cb] py-3 text-sm font-black text-[#3e494b]"
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={exportLoading}
                onClick={() => handleFinanceExport("excel")}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-full bg-[#00606c] py-3 text-xs font-black text-white disabled:opacity-50"
              >
                <Download size={14} />
                {exportLoading ? "Đang xuất..." : "Xuất Excel"}
              </button>
              <button
                type="button"
                disabled={exportLoading}
                onClick={() => handleFinanceExport("pdf")}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-full bg-[#9b4500] py-3 text-xs font-black text-white disabled:opacity-50"
              >
                <FileText size={14} />
                {exportLoading ? "Đang xuất..." : "Xuất PDF"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}