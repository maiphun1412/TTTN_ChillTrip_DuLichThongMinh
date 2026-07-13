"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, Phone } from "lucide-react";

const API_BASE_URL = "/backend-api";

type CustomerDetail = {
  id: string | number;
  customer_code: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  customer_type?: string | null;
  notes?: string | null;
  created_at?: string | null;
  total_spent?: string | number;
  booking_count?: string | number;
};

type CustomerBooking = {
  id: string | number;
  booking_code: string;
  booking_status: string;
  total_payable_amount: string | number;
  booked_at?: string | null;
  tour_name?: string | null;
  start_date?: string | null;
};

type ApiData = {
  customer: CustomerDetail;
  bookings: CustomerBooking[];
};

function formatMoney(value?: string | number | null) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("vi-VN");
}
function getInitials(name?: string | null) {
  if (!name) return "KH";

  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}
function getAvatarColor(name?: string | null) {
  const colors = [
    "bg-cyan-100 text-cyan-700",
    "bg-orange-100 text-orange-700",
    "bg-gray-200 text-gray-700",
    "bg-blue-100 text-blue-700",
    "bg-yellow-100 text-yellow-700",
    "bg-green-100 text-green-700",
    "bg-pink-100 text-pink-700",
  ];

  if (!name) return colors[0];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}
function getGenderLabel(value?: string | null) {
  if (value === "MALE") return "Nam";
  if (value === "FEMALE") return "Nữ";
  if (value === "OTHER") return "Khác";
  return "-";
}

function getStatusLabel(status?: string) {
  switch (status) {
    case "PENDING":
      return "Chờ xử lý";
    case "CONFIRMED":
      return "Đã xác nhận";
    case "PAID":
      return "Đã thanh toán";
    case "COMPLETED":
      return "Hoàn tất";
    case "CANCELLED":
      return "Đã hủy";
    default:
      return status || "-";
  }
}

function getStatusClass(status?: string) {
  switch (status) {
    case "COMPLETED":
    case "PAID":
    case "CONFIRMED":
      return "bg-green-100 text-green-700";
    case "PENDING":
      return "bg-orange-100 text-orange-700";
    case "CANCELLED":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function getTier(totalSpent?: string | number | null) {
  const spent = Number(totalSpent || 0);
  if (spent >= 100_000_000) return "Platinum Member";
  if (spent >= 40_000_000) return "Gold Member";
  return "Silver Member";
}

export default function AdminCustomerDetail({
  customerId,
}: {
  customerId: string;
}) {
  const router = useRouter();
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadCustomerDetail() {
    try {
      setLoading(true);

      const res = await fetch(`${API_BASE_URL}/admin/customers/${customerId}`, {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("LOAD_CUSTOMER_DETAIL_ERROR:", res.status, text);
        setData(null);
        return;
      }

      const json = await res.json();
      setData(json.data || null);
    } catch (error) {
      console.error("LOAD_CUSTOMER_DETAIL_ERROR:", error);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomerDetail();
  }, [customerId]);

  if (loading) {
    return (
      <div className="rounded-3xl bg-white p-10 text-center font-bold text-[#00606c]">
        Đang tải thông tin khách hàng...
      </div>
    );
  }

  if (!data?.customer) {
    return (
      <div className="rounded-3xl bg-white p-10 text-center font-bold text-[#ba1a1a]">
        Không tìm thấy khách hàng.
      </div>
    );
  }

  const customer = data.customer;
  const bookings = data.bookings || [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/admin/customers")}
          className="flex items-center gap-2 text-sm font-bold text-[#00606c]"
        >
          <ArrowLeft size={16} />
          Quay lại
        </button>
      </div>

      <section className="flex items-center justify-between rounded-3xl bg-white p-8 shadow-sm">
        <div className="flex items-center gap-6">
          <div
  className={`flex h-24 w-24 items-center justify-center rounded-full text-2xl font-black ${getAvatarColor(
    customer.full_name
  )}`}
>
  {getInitials(customer.full_name)}
</div>

          <div>
            <h2 className="text-3xl font-black text-[#00606c]">
              {customer.full_name}
            </h2>
            <p className="text-sm text-[#3e494b]">
              {customer.address || "Chưa cập nhật địa chỉ"}
            </p>

            <span className="mt-2 inline-block rounded-full bg-[#9defff]/40 px-3 py-1 text-xs font-bold">
              {getTier(customer.total_spent)}
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <a
            href={customer.email ? `mailto:${customer.email}` : "#"}
            className="flex items-center gap-2 rounded-full bg-[#00606c] px-5 py-2 text-white"
          >
            <Mail size={16} /> Email
          </a>

          <a
            href={customer.phone ? `tel:${customer.phone}` : "#"}
            className="flex items-center gap-2 rounded-full bg-[#f1f4f5] px-5 py-2"
          >
            <Phone size={16} /> Gọi
          </a>
        </div>
      </section>

      <div className="grid grid-cols-3 gap-6">
        <StatBox
          label="Tổng đặt tour"
          value={`${Number(customer.booking_count || 0)} chuyến`}
        />
        <StatBox label="Tổng chi tiêu" value={formatMoney(customer.total_spent)} />
        <StatBox
          label="Điểm tích lũy"
          value={`${Math.floor(Number(customer.total_spent || 0) / 10000).toLocaleString("vi-VN")} điểm`}
        />
      </div>

      <div className="grid grid-cols-3 gap-8">
        <div className="space-y-6">
          <Card title="Thông tin chi tiết">
            <Info label="Mã khách hàng" value={`#${customer.customer_code}`} />
            <Info label="Họ tên" value={customer.full_name} />
            <Info label="Email" value={customer.email || "-"} />
            <Info label="SĐT" value={customer.phone || "-"} />
            <Info label="Giới tính" value={getGenderLabel(customer.gender)} />
            <Info label="Ngày sinh" value={formatDate(customer.date_of_birth)} />
            <Info label="Loại khách" value={customer.customer_type || "-"} />
            <Info label="Địa chỉ" value={customer.address || "-"} />
            <Info label="Ngày tạo" value={formatDate(customer.created_at)} />
          </Card>

          <Card title="Ghi chú">
            <p className="text-sm text-[#3e494b]">
              {customer.notes || "Chưa có ghi chú cho khách hàng này."}
            </p>
          </Card>
        </div>

        <div className="col-span-2">
          <Card title="Lịch sử đặt tour">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase text-[#6e797b]">
                  <th className="py-3 text-left">Mã</th>
                  <th className="text-left">Tour</th>
                  <th className="text-left">Ngày</th>
                  <th className="text-left">Giá</th>
                  <th className="text-left">Trạng thái</th>
                </tr>
              </thead>

              <tbody>
                {bookings.length === 0 ? (
                  <tr className="border-t">
                    <td colSpan={5} className="py-8 text-center text-[#6e797b]">
                      Khách hàng chưa có đơn đặt tour.
                    </td>
                  </tr>
                ) : (
                  bookings.map((booking) => (
                    <tr key={booking.id} className="border-t">
                      <td className="py-4 font-bold text-[#00606c]">
                        #{booking.booking_code}
                      </td>
                      <td>{booking.tour_name || "-"}</td>
                      <td>{formatDate(booking.start_date || booking.booked_at)}</td>
                      <td>{formatMoney(booking.total_payable_amount)}</td>
                      <td>
                        <span
                          className={`rounded px-2 py-1 text-xs font-bold ${getStatusClass(
                            booking.booking_status
                          )}`}
                        >
                          {getStatusLabel(booking.booking_status)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-bold text-[#00606c]">{title}</h3>
      {children}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <span className="font-medium text-[#6e797b]">{label}</span>
      <span className="text-right font-semibold text-[#181c1d]">{value}</span>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <p className="text-xs uppercase text-[#6e797b]">{label}</p>
      <h3 className="mt-1 text-2xl font-black text-[#00606c]">{value}</h3>
    </div>
  );
}