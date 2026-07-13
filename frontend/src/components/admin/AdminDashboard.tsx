"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  UserPlus,
  FilePenLine,
  TriangleAlert,
  MoreVertical,
  CreditCard,
  BookOpenCheck,
  Percent,
  Star,
  SunMedium,
  Plane,
  Users,
  CalendarDays,
  MessageCircle,
  RefreshCcw,
} from "lucide-react";

const API_BASE_URL = "/backend-api";

type Tour = {
  id: string | number;
  tour_name: string;
  tour_code?: string;
  status?: string;
  max_capacity?: number;
};

type Booking = {
  id: string | number;
  booking_code: string;
  booking_status: string;
  total_payable_amount?: string | number;
  booked_at?: string | null;
  tour_name?: string | null;
  customer_name?: string | null;
};

type Customer = {
  id: string | number;
  full_name: string;
  customer_code: string;
  created_at?: string | null;
};

type Schedule = {
  id: string | number;
  tour_name?: string | null;
  departure_code?: string | null;
  start_date?: string | null;
  booked_seats?: number;
  max_seats?: number;
  booking_status?: string;
};

function formatMoney(value: string | number) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("vi-VN");
}

function isThisMonth(value?: string | null) {
  if (!value) return false;

  const date = new Date(value);
  const now = new Date();

  return (
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
}

function getStatusLabel(status?: string) {
  switch (status) {
    case "PENDING":
      return "Chờ xác nhận";
    case "CONFIRMED":
      return "Đã xác nhận";
    case "PAID":
      return "Đã thanh toán";
    case "COMPLETED":
      return "Hoàn tất";
    case "CANCELLED":
      return "Đã hủy";
    case "PUBLISHED":
      return "Đang bán";
    case "DRAFT":
      return "Bản nháp";
    case "STOPPED":
      return "Tạm ngưng";
    default:
      return status || "-";
  }
}

function getStatusClass(status?: string) {
  switch (status) {
    case "CONFIRMED":
    case "PAID":
    case "COMPLETED":
    case "PUBLISHED":
      return "bg-green-100 text-green-700";
    case "PENDING":
    case "DRAFT":
      return "bg-orange-100 text-orange-700";
    case "CANCELLED":
    case "STOPPED":
      return "bg-red-100 text-red-700";
    default:
      return "bg-[#e5e9ea] text-[#3e494b]";
  }
}

export default function AdminDashboard() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadDashboard() {
    try {
      setLoading(true);

      const [tourRes, bookingRes, customerRes, scheduleRes] =
        await Promise.allSettled([
          fetch(`${API_BASE_URL}/admin/tours`, { cache: "no-store" }),
          fetch(`${API_BASE_URL}/admin/bookings?limit=100`, {
            cache: "no-store",
          }),
          fetch(`${API_BASE_URL}/admin/customers`, { cache: "no-store" }),
          fetch(`${API_BASE_URL}/admin/schedules/today`, {
            cache: "no-store",
          }),
        ]);

      if (tourRes.status === "fulfilled" && tourRes.value.ok) {
        const json = await tourRes.value.json();
        setTours(json.data || []);
      }

      if (bookingRes.status === "fulfilled" && bookingRes.value.ok) {
        const json = await bookingRes.value.json();
        setBookings(json.data || []);
      }

      if (customerRes.status === "fulfilled" && customerRes.value.ok) {
        const json = await customerRes.value.json();
        setCustomers(json.data || []);
      }

      if (scheduleRes.status === "fulfilled" && scheduleRes.value.ok) {
        const json = await scheduleRes.value.json();
        setSchedules(json.data || []);
      }
    } catch (error) {
      console.error("LOAD_DASHBOARD_ERROR:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const stats = useMemo(() => {
    const revenue = bookings
      .filter((item) => item.booking_status !== "CANCELLED")
      .reduce((sum, item) => sum + Number(item.total_payable_amount || 0), 0);

    const newBookings = bookings.filter((item) =>
      isThisMonth(item.booked_at)
    ).length;

    const totalSeats = schedules.reduce(
      (sum, item) => sum + Number(item.max_seats || 0),
      0
    );

    const bookedSeats = schedules.reduce(
      (sum, item) => sum + Number(item.booked_seats || 0),
      0
    );

    const occupancy =
      totalSeats > 0 ? Math.round((bookedSeats / totalSeats) * 1000) / 10 : 0;

    const newCustomers = customers.filter((item) =>
      isThisMonth(item.created_at)
    ).length;

    return {
      revenue,
      newBookings,
      occupancy,
      newCustomers,
      totalTours: tours.length,
      pendingBookings: bookings.filter(
        (item) => item.booking_status === "PENDING"
      ).length,
    };
  }, [bookings, customers, schedules, tours]);

  const revenueChart = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, index) => ({
      month: `T${index + 1}`,
      revenue: 0,
    }));

    bookings
      .filter((item) => item.booking_status !== "CANCELLED")
      .forEach((item) => {
        if (!item.booked_at) return;

        const date = new Date(item.booked_at);
        const monthIndex = date.getMonth();

        if (monthIndex >= 0 && monthIndex < 12) {
          months[monthIndex].revenue += Number(item.total_payable_amount || 0);
        }
      });

    const maxRevenue = Math.max(...months.map((item) => item.revenue), 1);

    return months.map((item) => ({
      ...item,
      height:
        item.revenue > 0 ? Math.max((item.revenue / maxRevenue) * 100, 8) : 0,
    }));
  }, [bookings]);

  const topTours = useMemo(() => {
    const map = new Map<
      string,
      { name: string; bookings: number; revenue: number; status?: string }
    >();

    bookings.forEach((booking) => {
      const name = booking.tour_name || "Tour chưa xác định";
      const current = map.get(name) || {
        name,
        bookings: 0,
        revenue: 0,
        status: "PUBLISHED",
      };

      current.bookings += 1;
      current.revenue += Number(booking.total_payable_amount || 0);

      map.set(name, current);
    });

    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [bookings]);

  const recentActivities = useMemo(() => {
    const bookingActivities = bookings.slice(0, 4).map((booking) => ({
      title: `Đơn ${booking.booking_code}`,
      desc: `${booking.customer_name || "Khách hàng"} đặt ${
        booking.tour_name || "tour"
      }`,
      time: formatDate(booking.booked_at),
      icon: CheckCircle2,
      wrap: "bg-green-100",
      iconColor: "text-green-600",
    }));

    const customerActivities = customers.slice(0, 2).map((customer) => ({
      title: "Khách hàng mới",
      desc: `${customer.full_name} vừa được tạo hồ sơ`,
      time: formatDate(customer.created_at),
      icon: UserPlus,
      wrap: "bg-[#ffdbc9]",
      iconColor: "text-[#9b4500]",
    }));

    return [...bookingActivities, ...customerActivities].slice(0, 5);
  }, [bookings, customers]);

  const urgentItems = useMemo(() => {
    return bookings
      .filter((item) => item.booking_status === "PENDING")
      .slice(0, 4);
  }, [bookings]);

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#00606c] via-[#007b8a] to-[#0097a7] p-10 text-white shadow-xl">
        <div className="relative z-10 flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-black uppercase tracking-widest backdrop-blur">
              <SunMedium size={16} />
              ChillTrip Management Portal
            </div>

            <h2 className="mb-3 text-4xl font-black tracking-tight">
              Tổng quan hệ thống
            </h2>

            <p className="max-w-2xl font-medium leading-7 text-[#ddf9ff]">
              Theo dõi doanh thu, đặt chỗ, khách hàng và lịch trình vận hành
              trong cùng một màn hình quản trị.
            </p>
          </div>

          <button
            onClick={loadDashboard}
            className="flex w-fit items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-black text-[#00606c] shadow-xl transition hover:scale-105"
          >
            <RefreshCcw size={17} />
            {loading ? "Đang tải..." : "Làm mới dữ liệu"}
          </button>
        </div>

        <SunMedium className="absolute right-14 top-1/2 h-40 w-40 -translate-y-1/2 opacity-10" />
        <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Tổng doanh thu"
          value={formatMoney(stats.revenue)}
          change={`${bookings.length} đơn`}
          icon={CreditCard}
          iconWrap="bg-[#9defff]"
          iconColor="text-[#001f24]"
          barMain="bg-[#00606c]"
          barSub="bg-[#00606c]/20"
        />

        <StatCard
          title="Booking tháng này"
          value={String(stats.newBookings)}
          change={`${stats.pendingBookings} chờ xử lý`}
          icon={BookOpenCheck}
          iconWrap="bg-[#ffdbc9]"
          iconColor="text-[#331200]"
          barMain="bg-[#9b4500]"
          barSub="bg-[#9b4500]/20"
          href="/admin/booking"
        />

        <StatCard
          title="Tỷ lệ lấp đầy"
          value={`${stats.occupancy}%`}
          change={`${schedules.length} lịch hôm nay`}
          icon={Percent}
          iconWrap="bg-[#b3ebff]"
          iconColor="text-[#001f27]"
          barMain="bg-[#006074]"
          barSub="bg-[#006074]/20"
        />

        <StatCard
          title="Khách hàng mới"
          value={String(stats.newCustomers)}
          change={`${customers.length} tổng khách`}
          icon={Users}
          iconWrap="bg-[#7ad4e4]"
          iconColor="text-[#00606c]"
          barMain="bg-[#7ad4e4]"
          barSub="bg-[#7ad4e4]/30"
        />
      </section>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
        <section className="rounded-[2.5rem] bg-[#f1f4f5] p-8 xl:col-span-2">
          <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h4 className="text-2xl font-black text-[#181c1d]">
                Doanh thu theo dữ liệu booking
              </h4>
              <p className="text-sm text-[#3e494b]">
                Biểu đồ nhanh dựa trên các đơn đặt tour hiện có.
              </p>
            </div>

            <Link
              href="/admin/booking"
              className="flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black text-[#00606c] shadow-sm"
            >
              Xem đặt chỗ
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className="flex h-72 items-end justify-between gap-4 px-2">
            {revenueChart.map((item) => (
              <div key={item.month} className="flex flex-1 flex-col items-center gap-3">
                <div
                  title={formatMoney(item.revenue)}
                  className={`w-full rounded-t-2xl ${
                    item.revenue > 0
                      ? "bg-[#fc8a40] shadow-lg shadow-[#9b4500]/20"
                      : "bg-[#00606c]/20"
                  }`}
                  style={{ height: `${item.height}%` }}
                />
                <span className="text-[11px] font-black text-[#3e494b]">
                  {item.month}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[2.5rem] bg-white p-8 shadow-sm">
          <h4 className="mb-6 text-2xl font-black text-[#181c1d]">
            Hoạt động gần đây
          </h4>

          <div className="space-y-6">
            {recentActivities.length === 0 ? (
              <EmptyBox text="Chưa có hoạt động gần đây." />
            ) : (
              recentActivities.map((item, index) => {
                const Icon = item.icon;

                return (
                  <div key={`${item.title}-${index}`} className="relative flex gap-4">
                    {index !== recentActivities.length - 1 && (
                      <div className="absolute bottom-0 left-[1.125rem] top-10 w-0.5 bg-[#bdc8cb]/30" />
                    )}

                    <div
                      className={`z-10 flex h-9 w-9 items-center justify-center rounded-full border-4 border-white ${item.wrap}`}
                    >
                      <Icon size={14} className={item.iconColor} />
                    </div>

                    <div>
                      <p className="text-sm font-black text-[#181c1d]">
                        {item.title}
                      </p>
                      <p className="text-xs leading-5 text-[#3e494b]">
                        {item.desc}
                      </p>
                      <span className="mt-1 block text-[10px] font-bold text-[#6e797b]">
                        {item.time}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
        <section className="rounded-[2.5rem] bg-white p-8 shadow-sm xl:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <h4 className="text-2xl font-black text-[#181c1d]">
              Tour có doanh thu cao
            </h4>

            <Link
              href="/admin/tours"
              className="flex items-center gap-1 text-sm font-black text-[#00606c]"
            >
              Xem tất cả tour
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className="overflow-hidden rounded-[1.5rem] border border-[#ebeeef]">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="bg-[#f1f4f5] text-[11px] uppercase tracking-widest text-[#3e494b]">
                  <th className="px-6 py-4 font-black">Tên Tour</th>
                  <th className="px-6 py-4 font-black">Số đơn</th>
                  <th className="px-6 py-4 font-black">Doanh thu</th>
                  <th className="px-6 py-4 font-black">Trạng thái</th>
                  <th className="px-6 py-4 font-black"></th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#bdc8cb]/10">
                {topTours.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center">
                      <EmptyBox text="Chưa có dữ liệu booking để xếp hạng tour." />
                    </td>
                  </tr>
                ) : (
                  topTours.map((tour) => (
                    <tr key={tour.name} className="hover:bg-[#f8fbfc]">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#9defff]/50 text-[#00606c]">
                            <Plane size={20} />
                          </div>
                          <p className="text-sm font-black text-[#181c1d]">
                            {tour.name}
                          </p>
                        </div>
                      </td>

                      <td className="px-6 py-5 text-sm font-bold">
                        {tour.bookings} lượt
                      </td>

                      <td className="px-6 py-5 text-sm font-black text-[#9b4500]">
                        {formatMoney(tour.revenue)}
                      </td>

                      <td className="px-6 py-5">
                        <span className="rounded-full bg-green-100 px-3 py-1 text-[10px] font-black text-green-700">
                          Đang kinh doanh
                        </span>
                      </td>

                      <td className="px-6 py-5 text-right">
                        <button className="rounded-full p-2 hover:bg-[#ebeeef]">
                          <MoreVertical size={16} className="text-[#3e494b]" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-[2.5rem] bg-[#f1f4f5] p-8">
          <div className="mb-6 flex items-center justify-between">
            <h4 className="text-2xl font-black text-[#181c1d]">
              Cần xử lý
            </h4>
            <span className="rounded-full bg-[#ba1a1a] px-3 py-1 text-[10px] font-black text-white">
              {urgentItems.length} đơn
            </span>
          </div>

          <div className="space-y-4">
            {urgentItems.length === 0 ? (
              <EmptyBox text="Không có đơn chờ xử lý." />
            ) : (
              urgentItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border-l-4 border-[#9b4500] bg-white p-5 shadow-sm"
                >
                  <div className="mb-2 flex items-start justify-between">
                    <p className="text-xs font-black uppercase text-[#9b4500]">
                      #{item.booking_code}
                    </p>
                    <span className="text-[10px] text-[#3e494b]">
                      {formatDate(item.booked_at)}
                    </span>
                  </div>

                  <h5 className="mb-1 text-sm font-black text-[#181c1d]">
                    {item.customer_name || "Khách hàng"}
                  </h5>
                  <p className="mb-4 line-clamp-2 text-xs text-[#3e494b]">
                    Đang chờ xác nhận cho {item.tour_name || "tour"}.
                  </p>

                  <div className="flex items-center justify-between">
                    <span
                      className={`rounded-full px-3 py-1 text-[10px] font-black ${getStatusClass(
                        item.booking_status
                      )}`}
                    >
                      {getStatusLabel(item.booking_status)}
                    </span>

                    <Link
                      href={`/admin/booking/${item.id}`}
                      className="rounded-full bg-[#00606c] px-4 py-2 text-[10px] font-black text-white"
                    >
                      Xử lý ngay
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  change,
  icon: Icon,
  iconWrap,
  iconColor,
  barMain,
  barSub,
  href,
}: {
  title: string;
  value: string;
  change: string;
  icon: any;
  iconWrap: string;
  iconColor: string;
  barMain: string;
  barSub: string;
  href?: string;
}) {
  const content = (
    <div className="rounded-[2rem] bg-white p-6 shadow-sm transition-transform hover:scale-[1.02]">
      <div className="mb-4 flex items-start justify-between">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconWrap}`}
        >
          <Icon size={20} className={iconColor} />
        </div>

        <span className="rounded-full bg-[#f1f4f5] px-3 py-1 text-xs font-black text-[#00606c]">
          {change}
        </span>
      </div>

      <p className="mb-1 text-sm font-black uppercase tracking-wider text-[#3e494b]">
        {title}
      </p>
      <h3 className="text-2xl font-black text-[#181c1d]">{value}</h3>

      <div className="mt-5 flex h-12 w-full items-end gap-1">
        <div className={`h-1/2 w-full rounded-t-sm ${barSub}`} />
        <div className={`h-3/4 w-full rounded-t-sm ${barSub}`} />
        <div className={`h-2/3 w-full rounded-t-sm ${barSub}`} />
        <div className={`h-full w-full rounded-t-sm ${barMain}`} />
        <div className={`h-4/5 w-full rounded-t-sm ${barSub}`} />
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-2xl bg-white/70 px-5 py-8 text-center text-sm font-bold text-[#6e797b]">
      {text}
    </div>
  );
}