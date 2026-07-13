"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Eye,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  TrendingUp,
  Wallet,
  Clock3,
} from "lucide-react";

const API_BASE_URL = "/backend-api";

type BookingStatus = "ALL" | "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";

type AdminBooking = {
  id: string | number;
  booking_code: string;
  booking_status: string;
  contact_name: string;
  contact_phone?: string | null;
  contact_email?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  tour_name?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  adult_count?: number;
  child_count?: number;
  total_payable_amount: string | number;
};

const quickStats = [
  {
    icon: TrendingUp,
    label: "Tỷ lệ hoàn thành",
    value: "92%",
    wrap: "bg-[#9defff]/30",
    iconColor: "text-[#007B8A]",
    valueColor: "text-[#007B8A]",
  },
  {
    icon: Wallet,
    label: "Doanh thu tháng",
    value: "1.2B đ",
    wrap: "bg-[#ffdbc9]/30",
    iconColor: "text-[#9b4500]",
    valueColor: "text-[#9b4500]",
  },
  {
    icon: Clock3,
    label: "Thời gian xử lý",
    value: "1.5h",
    wrap: "bg-[#b3ebff]/30",
    iconColor: "text-[#006074]",
    valueColor: "text-[#006074]",
  },
];

function getAuthHeaders() {
  if (typeof window === "undefined") {
    return {
      "Content-Type": "application/json",
    };
  }

  const token =
    localStorage.getItem("access_token") ||
    sessionStorage.getItem("access_token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("adminToken") ||
    "";

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function formatMoney(value: string | number) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("vi-VN");
}

function getStatusLabel(status: string) {
  switch (status) {
    case "PENDING":
      return "Chờ xác nhận";
    case "CONFIRMED":
      return "Đã xác nhận";
    case "PAID":
      return "Đã thanh toán";
    case "COMPLETED":
      return "Hoàn thành";
    case "CANCELLED":
      return "Đã hủy";
    default:
      return status || "-";
  }
}

function getStatusClass(status: string) {
  switch (status) {
    case "PENDING":
      return "bg-[#ffdbc9] text-[#763300]";
    case "CONFIRMED":
    case "PAID":
    case "COMPLETED":
      return "bg-[#9defff] text-[#004f59]";
    case "CANCELLED":
      return "bg-[#ffdad6] text-[#93000a]";
    default:
      return "bg-[#ebeeef] text-[#3e494b]";
  }
}

export default function AdminBookings() {
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<BookingStatus>("ALL");
  const [page, setPage] = useState(1);

  const [total, setTotal] = useState(0);
  const limit = 10;

  async function loadBookings() {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));

      if (status !== "ALL") {
        params.set("status", status);
      }

      const res = await fetch(
        `${API_BASE_URL}/admin/bookings?${params.toString()}`,
        {
          method: "GET",
          headers: getAuthHeaders(),
        }
      );

      if (!res.ok) {
        const text = await res.text();
        console.error("API lỗi:", res.status, text);
        return;
      }

      const json = await res.json();

      setBookings(json.data || []);
      setTotal(Number(json.pagination?.total || json.data?.length || 0));
    } catch (error) {
      console.error("LOAD_ADMIN_BOOKINGS_ERROR:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(id: string | number) {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/bookings/${id}/confirm`, {
        method: "PUT",
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        alert(json?.message || "Xác nhận đặt chỗ thất bại");
        return;
      }

      await loadBookings();
    } catch (error) {
      console.error("CONFIRM_BOOKING_ERROR:", error);
      alert("Không thể xác nhận đặt chỗ.");
    }
  }

  async function handleCancel(id: string | number) {
    const confirmCancel = confirm("Bạn có chắc muốn hủy đặt chỗ này không?");
    if (!confirmCancel) return;

    try {
      const res = await fetch(`${API_BASE_URL}/admin/bookings/${id}/cancel`, {
        method: "PUT",
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        alert(json?.message || "Hủy đặt chỗ thất bại");
        return;
      }

      await loadBookings();
    } catch (error) {
      console.error("CANCEL_BOOKING_ERROR:", error);
      alert("Không thể hủy đặt chỗ.");
    }
  }

  useEffect(() => {
    loadBookings();
  }, [page, status]);

  const filters = useMemo(
    () => [
      { label: `Tất cả (${total})`, value: "ALL" as BookingStatus },
      {
        label: `Chờ xác nhận (${
          bookings.filter((item) => item.booking_status === "PENDING").length
        })`,
        value: "PENDING" as BookingStatus,
      },
      {
        label: `Đã xác nhận (${
          bookings.filter(
            (item) =>
              item.booking_status === "CONFIRMED" ||
              item.booking_status === "PAID" ||
              item.booking_status === "COMPLETED"
          ).length
        })`,
        value: "CONFIRMED" as BookingStatus,
      },
      {
        label: `Đã hủy (${
          bookings.filter((item) => item.booking_status === "CANCELLED").length
        })`,
        value: "CANCELLED" as BookingStatus,
      },
    ],
    [bookings, total]
  );

  const pendingCount = bookings.filter(
    (item) => item.booking_status === "PENDING"
  ).length;

  const totalPages = Math.max(Math.ceil(total / limit), 1);
  const startItem = total === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  return (
    <div>
      <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <h2 className="mb-2 text-4xl font-extrabold tracking-tight text-[#007B8A]">
            Danh sách Đặt chỗ
          </h2>
          <p className="max-w-lg leading-relaxed text-[#3e494b]">
            Quản lý và xử lý các yêu cầu đặt tour từ khách hàng một cách tối ưu
            và nhanh chóng.
          </p>
        </div>

        <button className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#9b4500] to-[#fc8a40] px-8 py-4 font-bold text-white shadow-lg shadow-[#9b4500]/20 transition-transform hover:scale-[1.02]">
          <Plus size={18} />
          Tạo đặt chỗ mới
        </button>
      </div>

      <div className="mb-8 flex w-fit items-center gap-2 rounded-full bg-[#f1f4f5] p-1.5">
        {filters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => {
              setStatus(filter.value);
              setPage(1);
            }}
            className={`rounded-full px-6 py-2.5 text-sm transition-colors ${
              status === filter.value
                ? "bg-[#007B8A] font-bold text-white shadow-md"
                : "font-semibold text-[#3e494b] hover:bg-[#dfe3e4]"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-[#bdc8cb]/10 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-[#f1f4f5]/50">
                <th className="px-8 py-5 text-[11px] font-bold uppercase tracking-widest text-[#3e494b]">
                  Mã đơn hàng
                </th>
                <th className="px-8 py-5 text-[11px] font-bold uppercase tracking-widest text-[#3e494b]">
                  Khách hàng
                </th>
                <th className="px-8 py-5 text-[11px] font-bold uppercase tracking-widest text-[#3e494b]">
                  Tour
                </th>
                <th className="px-8 py-5 text-[11px] font-bold uppercase tracking-widest text-[#3e494b]">
                  Ngày khởi hành
                </th>
                <th className="px-8 py-5 text-[11px] font-bold uppercase tracking-widest text-[#3e494b]">
                  Trạng thái
                </th>
                <th className="px-8 py-5 text-[11px] font-bold uppercase tracking-widest text-[#3e494b]">
                  Tổng cộng
                </th>
                <th className="px-8 py-5 text-center text-[11px] font-bold uppercase tracking-widest text-[#3e494b]">
                  Hành động
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#bdc8cb]/10">
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-8 py-12 text-center text-sm font-semibold text-[#3e494b]"
                  >
                    Đang tải danh sách đặt chỗ...
                  </td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-8 py-12 text-center text-sm font-semibold text-[#3e494b]"
                  >
                    Chưa có dữ liệu đặt chỗ.
                  </td>
                </tr>
              ) : (
                bookings.map((booking) => (
                  <tr
                    key={booking.id}
                    className="group transition-colors hover:bg-[#f6fafb]"
                  >
                    <td className="px-8 py-5">
                      <span className="text-sm font-bold text-[#007B8A]">
                        #{booking.booking_code}
                      </span>
                    </td>

                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full border border-[#bdc8cb]/30 bg-[#ebeeef]" />
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-[#181c1d]">
                            {booking.contact_name ||
                              booking.customer_name ||
                              "Không rõ"}
                          </span>
                          <span className="text-[11px] text-[#3e494b]">
                            {booking.contact_email ||
                              booking.customer_email ||
                              "-"}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-8 py-5">
                      <span className="block max-w-[200px] truncate text-sm font-medium text-[#181c1d]">
                        {booking.tour_name || "-"}
                      </span>
                    </td>

                    <td className="px-8 py-5">
                      <span className="text-sm text-[#3e494b]">
                        {formatDate(booking.start_date)}
                      </span>
                    </td>

                    <td className="px-8 py-5">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-tighter ${getStatusClass(
                          booking.booking_status
                        )}`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {getStatusLabel(booking.booking_status)}
                      </span>
                    </td>

                    <td className="px-8 py-5">
                      <span className="text-sm font-extrabold text-[#181c1d]">
                        {formatMoney(booking.total_payable_amount)}
                      </span>
                    </td>

                    <td className="px-8 py-5">
                      <div className="flex items-center justify-center gap-2">
                        {booking.booking_status === "PENDING" && (
                          <button
                            onClick={() => handleConfirm(booking.id)}
                            className="rounded-full bg-[#007B8A] px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#00606c]"
                          >
                            Xác nhận
                          </button>
                        )}

                        <button className="rounded-full p-2 text-[#3e494b] transition-all hover:bg-[#007B8A]/10 hover:text-[#007B8A]">
                          <Eye size={18} />
                        </button>

                        {(booking.booking_status === "PENDING" ||
                          booking.booking_status === "CONFIRMED") && (
                          <button
                            onClick={() => handleCancel(booking.id)}
                            className="rounded-full p-2 text-[#3e494b] transition-all hover:bg-[#ba1a1a]/10 hover:text-[#ba1a1a]"
                          >
                            <XCircle size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-[#bdc8cb]/10 bg-[#f1f4f5]/30 px-8 py-6">
          <span className="text-sm font-medium text-[#3e494b]">
            Hiển thị {startItem} - {endItem} của {total} đơn hàng
          </span>

          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#bdc8cb]/30 bg-white text-[#3e494b] transition-colors hover:bg-[#007B8A]/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="flex items-center gap-1">
              <button className="flex h-10 w-10 items-center justify-center rounded-full bg-[#007B8A] text-sm font-bold text-white">
                {page}
              </button>
              <span className="px-2 text-[#3e494b] opacity-50">/</span>
              <button className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-[#3e494b]">
                {totalPages}
              </button>
            </div>

            <button
              disabled={page >= totalPages}
              onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#bdc8cb]/30 bg-white text-[#3e494b] transition-colors hover:bg-[#007B8A]/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-16 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="relative flex min-h-[320px] flex-col justify-between overflow-hidden rounded-[2rem] bg-[#007B8A] p-10 shadow-xl lg:col-span-2">
          <div className="pointer-events-none absolute inset-0 opacity-10">
            <div className="h-full w-full bg-[radial-gradient(circle_at_top_left,_white_0,_transparent_35%),radial-gradient(circle_at_bottom_right,_white_0,_transparent_30%)]" />
          </div>

          <div className="relative z-10">
            <span className="mb-6 inline-block rounded-full border border-white/20 bg-white/20 px-4 py-1.5 text-[10px] font-extrabold uppercase tracking-widest text-white backdrop-blur-md">
              Yêu cầu ưu tiên
            </span>

            <h3 className="mb-4 text-3xl font-extrabold leading-tight text-white">
              Cần xử lý gấp {pendingCount} đơn hàng
              <br />
              chờ xác nhận
            </h3>

            <p className="mb-8 max-w-sm font-medium leading-relaxed text-[#ddf9ff]">
              Đảm bảo trải nghiệm khách hàng bằng cách phản hồi nhanh các yêu
              cầu đặt tour muộn.
            </p>
          </div>

          <div className="relative z-10">
            <button
              onClick={() => {
                setStatus("PENDING");
                setPage(1);
              }}
              className="rounded-full bg-white px-8 py-4 font-extrabold text-[#007B8A] shadow-xl transition-all hover:scale-105 active:scale-95"
            >
              Xử lý ngay
            </button>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-[2rem] border border-[#bdc8cb]/10 bg-white p-8 shadow-sm">
          <div>
            <h4 className="mb-8 text-lg font-bold text-[#181c1d]">
              Thống kê nhanh
            </h4>

            <div className="space-y-6">
              {quickStats.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.label}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-full ${item.wrap} ${item.iconColor}`}
                      >
                        <Icon size={18} />
                      </div>
                      <span className="text-sm font-semibold text-[#3e494b]">
                        {item.label}
                      </span>
                    </div>

                    <span className={`text-lg font-black ${item.valueColor}`}>
                      {item.value}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-8 border-t border-[#bdc8cb]/10 pt-6">
            <a
              href="#"
              className="group flex items-center gap-2 text-sm font-bold text-[#007B8A] transition-all hover:gap-3"
            >
              Xem báo cáo chi tiết
              <ArrowRight size={16} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}