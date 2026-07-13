"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  Filter,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  Search,
  UserRound,
  X,
} from "lucide-react";
import {
  confirmStaffBookingApi,
  createStaffRefundApi,
  getStaffBookingsApi,
  type StaffBookingItem,
} from "@/lib/api/staff.api";
import {
  exportStaffBookingsToExcel,
  exportStaffBookingsToPdf,
} from "@/lib/export/staffBookingExport";

const tabs = [
  { label: "Tất cả", value: "ALL" },
  { label: "Chờ xác nhận", value: "PENDING" },
  { label: "Đã xác nhận", value: "CONFIRMED" },
  { label: "Đã thanh toán", value: "PAID" },
  { label: "Đã hủy", value: "CANCELLED" },
];

const fallbackTourImage =
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop";

function formatMoney(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value || 0) + "đ";
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

function getStatusLabel(status: string) {
  switch (status) {
    case "PENDING":
      return "Chờ xác nhận";
    case "CONFIRMED":
      return "Đã xác nhận";
    case "PAID":
      return "Đã thanh toán";
    case "PARTIALLY_PAID":
      return "Thanh toán một phần";
    case "DEPOSITED":
      return "Đặt cọc";
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
    case "PARTIALLY_PAID":
    case "DEPOSITED":
      return "bg-amber-100 text-amber-700";
    case "CANCELLED":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function callPhone(phone: string) {
  if (!phone) {
    alert("Booking này chưa có số điện thoại.");
    return;
  }

  window.location.href = `tel:${phone}`;
}

function sendEmail(email: string, bookingCode: string) {
  if (!email) {
    alert("Booking này chưa có email.");
    return;
  }

  const subject = encodeURIComponent(
    `ChillTrip - Thông tin đặt chỗ ${bookingCode}`
  );
  const body = encodeURIComponent(
    `Xin chào,\n\nChillTrip liên hệ về đặt chỗ ${bookingCode} của Quý khách.\n\nTrân trọng,\nChillTrip`
  );

  window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
}

export default function StaffBooking() {
  const router = useRouter();

  const [bookings, setBookings] = useState<StaffBookingItem[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [keyword, setKeyword] = useState("");
  const [activeTab, setActiveTab] = useState("ALL");
  const [paymentStatus, setPaymentStatus] = useState("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [openFilter, setOpenFilter] = useState(false);
  const [openExportMenu, setOpenExportMenu] = useState(false);
  const [openContactBox, setOpenContactBox] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const selectedBooking = useMemo(() => {
    return bookings.find((item) => item.id === selectedId) || bookings[0] || null;
  }, [bookings, selectedId]);

  async function loadBookings(options?: {
    status?: string;
    search?: string;
    nextPaymentStatus?: string;
    nextFromDate?: string;
    nextToDate?: string;
  }) {
    try {
      setLoading(true);
      setErrorMessage("");

      const result = await getStaffBookingsApi({
        status: options?.status ?? activeTab,
        keyword: options?.search ?? keyword,
        paymentStatus: options?.nextPaymentStatus ?? paymentStatus,
        fromDate: options?.nextFromDate ?? fromDate,
        toDate: options?.nextToDate ?? toDate,
      });

      setBookings(result.bookings);

      if (result.bookings.length > 0) {
        setSelectedId((prev) => {
          const existed = result.bookings.some((item) => item.id === prev);
          return existed ? prev : result.bookings[0].id;
        });
      } else {
        setSelectedId("");
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Không tải được danh sách đặt chỗ"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBookings({ status: activeTab });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadBookings({ search: keyword });
    }, 350);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword]);

  async function handleConfirmBooking() {
    if (!selectedBooking) return;

    if (selectedBooking.bookingStatus === "CONFIRMED") {
      alert("Booking này đã được xác nhận.");
      return;
    }

    const ok = confirm(`Xác nhận đặt chỗ #${selectedBooking.bookingCode}?`);
    if (!ok) return;

    try {
      setActionLoading(true);
      await confirmStaffBookingApi(selectedBooking.id);
      alert("Xác nhận đặt chỗ thành công.");
      await loadBookings();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Không xác nhận được booking.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRefundBooking() {
    if (!selectedBooking) return;

    const ok = confirm(
      `Tạo yêu cầu hoàn tiền cho booking #${selectedBooking.bookingCode}?`
    );
    if (!ok) return;

    try {
      setActionLoading(true);
      const result = await createStaffRefundApi(selectedBooking.id);
      alert(`Đã tạo yêu cầu hoàn tiền: ${result.refundCode}`);
      await loadBookings();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Không tạo được hoàn tiền.");
    } finally {
      setActionLoading(false);
    }
  }

  function handleOpenGroupContracts() {
    router.push("/staff/group-contracts");
  }

  function handleCreateGroupContractFromBooking() {
    if (!selectedBooking?.id) {
      alert("Chưa chọn booking.");
      return;
    }

    router.push(`/staff/group-contracts?bookingId=${selectedBooking.id}`);
  }

  function applyFilter() {
    setOpenFilter(false);
    loadBookings({
      nextPaymentStatus: paymentStatus,
      nextFromDate: fromDate,
      nextToDate: toDate,
    });
  }

  function clearFilter() {
    setPaymentStatus("ALL");
    setFromDate("");
    setToDate("");
    setOpenFilter(false);

    loadBookings({
      nextPaymentStatus: "ALL",
      nextFromDate: "",
      nextToDate: "",
    });
  }

  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="flex items-center gap-3 rounded-[2rem] bg-white px-6 py-4 shadow-sm">
          <Loader2 className="animate-spin text-[#00606c]" size={22} />
          <span className="font-semibold text-[#00606c]">
            Đang tải danh sách đặt chỗ...
          </span>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="rounded-[2rem] border border-red-200 bg-white p-6 text-red-700 shadow-sm">
        <div className="mb-2 flex items-center gap-2 font-bold">
          <AlertCircle size={20} />
          Không tải được dữ liệu
        </div>

        <p className="text-sm">{errorMessage}</p>

        <button
          type="button"
          onClick={() => loadBookings()}
          className="mt-5 rounded-full bg-[#00606c] px-5 py-2 text-sm font-bold text-white"
        >
          Tải lại
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-[720px] gap-6 overflow-hidden">
      <section className="flex min-w-0 flex-1 flex-col gap-6">
        <div className="flex items-end justify-between gap-5">
          <div>
            <h1 className="text-4xl font-black tracking-[-0.04em] text-[#00606c]">
              Quản lý đặt chỗ
            </h1>
            <p className="mt-2 text-sm text-[#3e494b]">
              Tìm kiếm tự động, xác nhận booking, gọi khách, gửi email, tạo yêu
              cầu hoàn tiền và xử lý hợp đồng tour đoàn.
            </p>
          </div>

          <div className="flex shrink-0 gap-3">
            <button
              type="button"
              onClick={handleOpenGroupContracts}
              className="flex items-center gap-2 rounded-full bg-[#fc8a40] px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-95"
            >
              <FileText size={17} />
              Xử lý tour đoàn
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenFilter((prev) => !prev)}
                className="flex items-center gap-2 rounded-full border border-[#bdc8cb] px-5 py-2.5 text-sm font-bold text-[#3e494b] transition hover:bg-white"
              >
                <Filter size={17} />
                Bộ lọc
              </button>

              {openFilter && (
                <div className="absolute right-0 top-12 z-50 w-80 rounded-3xl border border-[#dfe3e4] bg-white p-5 shadow-xl">
                  <p className="mb-4 text-sm font-black text-[#181c1d]">
                    Lọc danh sách đặt chỗ
                  </p>

                  <div className="space-y-4">
                    <label className="block">
                      <span className="mb-1 block text-xs font-bold text-[#3e494b]">
                        Thanh toán
                      </span>
                      <select
                        value={paymentStatus}
                        onChange={(event) => setPaymentStatus(event.target.value)}
                        className="w-full rounded-2xl border border-[#dfe3e4] bg-[#f6fafb] px-3 py-2 text-sm outline-none"
                      >
                        <option value="ALL">Tất cả</option>
                        <option value="UNPAID">Chưa thanh toán</option>
                        <option value="PARTIAL">Thanh toán một phần</option>
                        <option value="PAID">Đã thanh toán đủ</option>
                      </select>
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      <label className="block">
                        <span className="mb-1 block text-xs font-bold text-[#3e494b]">
                          Từ ngày đi
                        </span>
                        <input
                          type="date"
                          value={fromDate}
                          onChange={(event) => setFromDate(event.target.value)}
                          className="w-full rounded-2xl border border-[#dfe3e4] bg-[#f6fafb] px-3 py-2 text-sm outline-none"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1 block text-xs font-bold text-[#3e494b]">
                          Đến ngày đi
                        </span>
                        <input
                          type="date"
                          value={toDate}
                          onChange={(event) => setToDate(event.target.value)}
                          className="w-full rounded-2xl border border-[#dfe3e4] bg-[#f6fafb] px-3 py-2 text-sm outline-none"
                        />
                      </label>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={clearFilter}
                        className="flex-1 rounded-full border border-[#bdc8cb] py-2 text-sm font-bold text-[#3e494b]"
                      >
                        Xóa lọc
                      </button>

                      <button
                        type="button"
                        onClick={applyFilter}
                        className="flex-1 rounded-full bg-[#00606c] py-2 text-sm font-bold text-white"
                      >
                        Áp dụng
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenExportMenu((prev) => !prev)}
                className="flex items-center gap-2 rounded-full bg-[#9defff] px-5 py-2.5 text-sm font-bold text-[#001f24] transition hover:brightness-95"
              >
                <Download size={17} />
                Xuất báo cáo
                <ChevronDown
                  size={16}
                  className={`transition ${openExportMenu ? "rotate-180" : ""}`}
                />
              </button>

              {openExportMenu && (
                <div className="absolute right-0 top-12 z-50 w-44 overflow-hidden rounded-2xl border border-[#dfe3e4] bg-white shadow-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setOpenExportMenu(false);
                      exportStaffBookingsToPdf(bookings);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-bold text-[#3e494b] transition hover:bg-[#f1f4f5] hover:text-[#00606c]"
                  >
                    <Download size={16} />
                    Xuất PDF
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setOpenExportMenu(false);
                      exportStaffBookingsToExcel(bookings);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-bold text-[#3e494b] transition hover:bg-[#f1f4f5] hover:text-[#00606c]"
                  >
                    <Download size={16} />
                    Xuất Excel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="relative max-w-xl">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6e797b]"
          />

          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            className="h-12 w-full rounded-full border-none bg-white pl-12 pr-5 text-sm text-[#181c1d] shadow-sm outline-none ring-1 ring-[#ebeeef] placeholder:text-[#6e797b] focus:ring-2 focus:ring-[#00606c]/30"
            placeholder="Gõ đến đâu lọc đến đó: mã đơn, khách hàng, số điện thoại hoặc tour..."
          />
        </div>

        <div className="flex gap-3 overflow-x-auto border-b border-[#dfe3e4] pb-4">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.value;

            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-black transition ${
                  isActive
                    ? "bg-[#00606c] text-white shadow-md"
                    : "text-[#3e494b] hover:bg-white"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-[#ebeeef]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] border-separate border-spacing-0 text-left">
              <thead>
                <tr className="bg-[#f1f4f5] text-[10px] font-black uppercase tracking-[0.18em] text-[#6e797b]">
                  <th className="px-6 py-5">Mã đơn</th>
                  <th className="px-6 py-5">Khách hàng</th>
                  <th className="px-6 py-5">Tour</th>
                  <th className="px-6 py-5 text-center">Pax</th>
                  <th className="px-6 py-5 text-right">Tổng tiền</th>
                  <th className="px-6 py-5">Trạng thái</th>
                  <th className="px-6 py-5" />
                </tr>
              </thead>

              <tbody className="divide-y divide-[#ebeeef]">
                {bookings.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-14 text-center text-sm font-semibold text-[#6e797b]"
                    >
                      Không tìm thấy booking phù hợp.
                    </td>
                  </tr>
                ) : (
                  bookings.map((booking) => {
                    const isSelected = selectedBooking?.id === booking.id;

                    return (
                      <tr
                        key={booking.id}
                        onClick={() => setSelectedId(booking.id)}
                        className={`group cursor-pointer transition ${
                          isSelected ? "bg-[#ddf9ff]/60" : "hover:bg-[#f6fafb]"
                        }`}
                      >
                        <td className="px-6 py-5 font-black text-[#00606c]">
                          #{booking.bookingCode}
                        </td>

                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#007a93] text-xs font-black text-white">
                              {getInitials(booking.customerName)}
                            </div>

                            <div>
                              <p className="font-black text-[#181c1d]">
                                {booking.customerName}
                              </p>
                              <p className="mt-0.5 text-xs font-semibold text-[#6e797b]">
                                {booking.customerPhone || "Chưa có SĐT"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <p className="max-w-[240px] truncate font-bold text-[#3e494b]">
                            {booking.tourName}
                          </p>
                          <p className="mt-0.5 text-xs font-semibold text-[#6e797b]">
                            {booking.startDate || "Chưa có ngày"} -{" "}
                            {booking.endDate || "Chưa có ngày"}
                          </p>
                        </td>

                        <td className="px-6 py-5 text-center font-black">
                          {booking.pax}
                        </td>

                        <td className="px-6 py-5 text-right font-black text-[#181c1d]">
                          {formatMoney(booking.payableAmount)}
                        </td>

                        <td className="px-6 py-5">
                          <span
                            className={`inline-flex rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${getStatusClass(
                              booking.bookingStatus
                            )}`}
                          >
                            {getStatusLabel(booking.bookingStatus)}
                          </span>
                        </td>

                        <td className="px-6 py-5 text-right">
                          <ChevronRight
                            size={20}
                            className={`transition ${
                              isSelected
                                ? "text-[#00606c]"
                                : "text-[#6e797b] group-hover:text-[#00606c]"
                            }`}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-auto flex items-center justify-between bg-[#f6fafb] px-6 py-4">
            <p className="text-xs font-semibold text-[#6e797b]">
              Hiển thị {bookings.length} đơn đặt chỗ
            </p>
          </div>
        </div>
      </section>

      <aside className="flex w-[420px] shrink-0 flex-col overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-[#ebeeef]">
        {selectedBooking ? (
          <>
            <div className="flex items-center justify-between border-b border-[#ebeeef] bg-[#f6fafb] px-6 py-5">
              <div>
                <h2 className="text-lg font-black text-[#00606c]">
                  Chi tiết đặt chỗ
                </h2>
                <p className="mt-0.5 text-xs font-semibold text-[#6e797b]">
                  #{selectedBooking.bookingCode}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedId("")}
                className="flex h-9 w-9 items-center justify-center rounded-full text-[#6e797b] hover:bg-[#ffdad6] hover:text-[#ba1a1a]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <section className="mb-8">
                <p className="mb-4 text-[10px] font-black uppercase tracking-[0.18em] text-[#6e797b]">
                  Thông tin khách hàng
                </p>

                <div className="rounded-[1.5rem] bg-[#f1f4f5] p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#007a93] text-base font-black text-white">
                      {getInitials(selectedBooking.customerName)}
                    </div>

                    <div>
                      <h3 className="font-black text-[#181c1d]">
                        {selectedBooking.customerName}
                      </h3>
                      <p className="mt-1 text-xs font-semibold text-[#6e797b]">
                        {selectedBooking.customerEmail || "Chưa có email"}
                      </p>
                      <p className="text-xs font-semibold text-[#6e797b]">
                        {selectedBooking.customerPhone || "Chưa có SĐT"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => callPhone(selectedBooking.customerPhone)}
                      className="flex items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black text-[#00606c]"
                    >
                      <Phone size={15} />
                      Gọi
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        sendEmail(
                          selectedBooking.customerEmail,
                          selectedBooking.bookingCode
                        )
                      }
                      className="flex items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black text-[#00606c]"
                    >
                      <Mail size={15} />
                      Email
                    </button>
                  </div>
                </div>
              </section>

              <section className="mb-8">
                <p className="mb-4 text-[10px] font-black uppercase tracking-[0.18em] text-[#6e797b]">
                  Dịch vụ đã chọn
                </p>

                <div className="overflow-hidden rounded-[1.5rem] bg-[#f1f4f5]">
                  <div className="relative aspect-video overflow-hidden">
                    <img
                      src={selectedBooking.tourImage || fallbackTourImage}
                      alt={selectedBooking.tourName}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />

                    <div className="absolute bottom-4 left-4 right-4">
                      <p className="text-lg font-black leading-tight text-white">
                        {selectedBooking.tourName}
                      </p>
                      <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-white/80">
                        <CalendarDays size={15} />
                        {selectedBooking.startDate || "Chưa có ngày"} -{" "}
                        {selectedBooking.endDate || "Chưa có ngày"}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 p-4">
                    <div className="rounded-2xl bg-white p-3 text-center">
                      <p className="text-[10px] font-black uppercase text-[#6e797b]">
                        Hành khách
                      </p>
                      <p className="mt-1 text-2xl font-black text-[#00606c]">
                        {selectedBooking.pax}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white p-3 text-center">
                      <p className="text-[10px] font-black uppercase text-[#6e797b]">
                        Người lớn / Trẻ em
                      </p>
                      <p className="mt-1 text-sm font-black text-[#181c1d]">
                        {selectedBooking.adultCount} /{" "}
                        {selectedBooking.childCount}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="mb-8">
                <p className="mb-4 text-[10px] font-black uppercase tracking-[0.18em] text-[#6e797b]">
                  Thanh toán & trạng thái
                </p>

                <div className="space-y-3 rounded-[1.5rem] bg-[#f6fafb] p-4">
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold text-[#3e494b]">
                      Tổng tiền
                    </span>
                    <span className="font-black">
                      {formatMoney(selectedBooking.totalAmount)}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="font-semibold text-[#3e494b]">
                      Giảm giá
                    </span>
                    <span className="font-black">
                      {formatMoney(selectedBooking.discountAmount)}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="font-semibold text-[#3e494b]">
                      Đã thanh toán
                    </span>
                    <span className="font-black text-[#00606c]">
                      {formatMoney(selectedBooking.paidAmount)}
                    </span>
                  </div>

                  <div className="border-t border-[#dfe3e4] pt-3">
                    <div className="flex items-end justify-between">
                      <span className="font-black text-[#3e494b]">Còn lại</span>
                      <span className="text-2xl font-black text-[#00606c]">
                        {formatMoney(selectedBooking.remainingAmount)}
                      </span>
                    </div>
                  </div>

                  <div
                    className={`mt-4 inline-flex rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${getStatusClass(
                      selectedBooking.bookingStatus
                    )}`}
                  >
                    {getStatusLabel(selectedBooking.bookingStatus)}
                  </div>
                </div>
              </section>

              <section>
                <p className="mb-4 text-[10px] font-black uppercase tracking-[0.18em] text-[#6e797b]">
                  Ghi chú xử lý
                </p>

                <div className="rounded-[1.5rem] bg-[#ffdbc9]/50 p-4 text-sm font-semibold leading-6 text-[#672c00]">
                  {selectedBooking.specialNotes ||
                    "Chưa có ghi chú đặc biệt cho booking này."}
                </div>
              </section>
            </div>

            {openContactBox && (
              <div className="mx-6 mb-3 rounded-2xl border border-[#dfe3e4] bg-white p-4 shadow-sm">
                <p className="mb-3 text-sm font-black text-[#181c1d]">
                  Chọn cách liên hệ
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => callPhone(selectedBooking.customerPhone)}
                    className="rounded-full bg-[#ddf9ff] py-2 text-xs font-black text-[#00606c]"
                  >
                    Gọi khách
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      sendEmail(
                        selectedBooking.customerEmail,
                        selectedBooking.bookingCode
                      )
                    }
                    className="rounded-full bg-[#ddf9ff] py-2 text-xs font-black text-[#00606c]"
                  >
                    Gửi email
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 bg-[#f1f4f5] p-6">
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmBooking}
                className="col-span-2 rounded-full bg-[#00606c] py-4 text-sm font-black uppercase tracking-widest text-white shadow-md transition hover:scale-[1.02] disabled:opacity-60"
              >
                {actionLoading ? "Đang xử lý..." : "Xác nhận đặt chỗ"}
              </button>

              <button
                type="button"
                onClick={() => setOpenContactBox((prev) => !prev)}
                className="flex items-center justify-center gap-2 rounded-full border-2 border-[#00606c] py-3 text-sm font-black text-[#00606c] transition hover:bg-[#ddf9ff]"
              >
                <MessageCircle size={17} />
                Liên hệ
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={handleRefundBooking}
                className="rounded-full border-2 border-[#bdc8cb] py-3 text-sm font-black text-[#3e494b] transition hover:bg-white disabled:opacity-60"
              >
                Hoàn tiền
              </button>

              <button
                type="button"
                onClick={handleCreateGroupContractFromBooking}
                className="col-span-2 flex items-center justify-center gap-2 rounded-full bg-[#9b4500] py-3 text-sm font-black text-white transition hover:brightness-95"
              >
                <FileText size={17} />
                Xử lý hợp đồng tour đoàn
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!selectedBooking?.id) {
                    alert("Chưa chọn booking.");
                    return;
                  }

                  router.push(`/staff/booking/${selectedBooking.id}`);
                }}
                className="col-span-2 rounded-full bg-[#fc8a40] py-3 text-sm font-black text-white transition hover:brightness-95"
              >
                Xem chi tiết đặt chỗ
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            <UserRound className="mb-4 text-[#6e797b]" size={42} />
            <p className="font-black text-[#181c1d]">Chưa chọn booking</p>
            <p className="mt-2 text-sm text-[#6e797b]">
              Chọn một đơn đặt chỗ ở bảng bên trái để xem chi tiết.
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}