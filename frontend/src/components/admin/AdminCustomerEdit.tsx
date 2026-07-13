"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  CalendarDays,
  CheckCircle2,
  History,
  Save,
  Settings,
  Star,
  Trash2,
  User,
} from "lucide-react";

const API_BASE_URL = "/backend-api";

type CustomerBooking = {
  id: string | number;
  booking_code: string;
  booking_status: string;
  total_payable_amount: string | number;
  booked_at?: string | null;
  tour_name?: string | null;
  start_date?: string | null;
};

type CustomerForm = {
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  customerType: string;
  notes: string;
  totalSpent: number;
  bookingCount: number;
  createdAt: string;
};

type ActiveTab = "personal" | "account" | "history";

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
  ];

  if (!name) return colors[0];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}

function formatMoney(value: string | number) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("vi-VN");
}

function getTier(totalSpent: number) {
  if (totalSpent >= 100_000_000) return "Bạch Kim";
  if (totalSpent >= 40_000_000) return "Vàng";
  if (totalSpent >= 10_000_000) return "Bạc";
  return "Đồng";
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

export default function AdminCustomerEdit({
  customerId,
}: {
  customerId: string;
}) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<ActiveTab>("personal");
  const [bookings, setBookings] = useState<CustomerBooking[]>([]);
  const [form, setForm] = useState<CustomerForm>({
    fullName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    address: "",
    customerType: "INDIVIDUAL",
    notes: "",
    totalSpent: 0,
    bookingCount: 0,
    createdAt: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const tier = useMemo(() => getTier(form.totalSpent), [form.totalSpent]);

  async function loadCustomer() {
    try {
      setLoading(true);

      const res = await fetch(`${API_BASE_URL}/admin/customers/${customerId}`, {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        alert("Không lấy được thông tin khách hàng");
        return;
      }

      const json = await res.json();
      const customer = json.data?.customer;

      if (!customer) {
        alert("Không tìm thấy khách hàng");
        return;
      }

      setBookings(json.data?.bookings || []);

      setForm({
        fullName: customer.full_name || "",
        email: customer.email || "",
        phone: customer.phone || "",
        dateOfBirth: customer.date_of_birth
          ? String(customer.date_of_birth).slice(0, 10)
          : "",
        gender: customer.gender || "",
        address: customer.address || "",
        customerType: customer.customer_type || "INDIVIDUAL",
        notes: customer.notes || "",
        totalSpent: Number(customer.total_spent || 0),
        bookingCount: Number(customer.booking_count || 0),
        createdAt: customer.created_at || "",
      });
    } catch (error) {
      console.error("LOAD_CUSTOMER_EDIT_ERROR:", error);
      alert("Không thể tải dữ liệu khách hàng");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!form.fullName.trim()) {
      alert("Vui lòng nhập họ tên khách hàng");
      return;
    }

    try {
      setSaving(true);

      const res = await fetch(`${API_BASE_URL}/admin/customers/${customerId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          dateOfBirth: form.dateOfBirth,
          gender: form.gender,
          address: form.address,
          customerType: form.customerType,
          notes: form.notes,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        alert(json?.message || "Cập nhật khách hàng thất bại");
        return;
      }

      alert("Cập nhật khách hàng thành công");
      router.push(`/admin/customers/${customerId}`);
    } catch (error) {
      console.error("UPDATE_CUSTOMER_ERROR:", error);
      alert("Không thể cập nhật khách hàng");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const ok = confirm(`Bạn có chắc muốn xóa khách hàng ${form.fullName}?`);
    if (!ok) return;

    try {
      const res = await fetch(`${API_BASE_URL}/admin/customers/${customerId}`, {
        method: "DELETE",
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        alert(json?.message || "Xóa khách hàng thất bại");
        return;
      }

      alert("Xóa khách hàng thành công");
      router.push("/admin/customers");
    } catch (error) {
      console.error("DELETE_CUSTOMER_ERROR:", error);
      alert("Không thể xóa khách hàng");
    }
  }

  useEffect(() => {
    loadCustomer();
  }, [customerId]);

  if (loading) {
    return (
      <div className="rounded-[2rem] bg-white p-10 text-center font-bold text-[#00606c]">
        Đang tải thông tin khách hàng...
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 px-2 xl:px-0">
      <section className="relative overflow-hidden rounded-[2rem] border border-[#ebeeef] bg-white p-8 shadow-sm">
        <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-[#00606c]/5 blur-3xl" />

        <div className="relative flex flex-col items-center gap-8 md:flex-row md:items-start">
          <div className="relative">
            <div
              className={`flex h-32 w-32 items-center justify-center rounded-[2rem] text-4xl font-black shadow-xl ring-4 ring-[#dfe3e4] ${getAvatarColor(
                form.fullName
              )}`}
            >
              {getInitials(form.fullName)}
            </div>

            <button className="absolute -bottom-2 -right-2 rounded-xl bg-[#00606c] p-2 text-white shadow-lg transition hover:scale-110">
              <User size={16} />
            </button>
          </div>

          <div className="flex-1 text-center md:text-left">
            <div className="mb-2 flex flex-col gap-3 md:flex-row md:items-center">
              <h1 className="text-3xl font-extrabold text-[#00606c]">
                {form.fullName || "Khách hàng"}
              </h1>

              <span className="inline-flex items-center self-center rounded-full bg-[#9defff] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#001f24] md:self-auto">
                <Star size={14} className="mr-1 fill-[#00606c] text-[#00606c]" />
                {tier}
              </span>
            </div>

            <p className="mb-6 flex items-center justify-center gap-2 text-sm text-[#3e494b] md:justify-start">
              <CalendarDays size={17} />
              Thành viên từ {formatDate(form.createdAt)} • {form.bookingCount}{" "}
              chuyến đi đã thực hiện
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              <Stat label="Tổng chi tiêu" value={formatMoney(form.totalSpent)} />
              <Stat
                label="Điểm tích lũy"
                value={`${Math.floor(form.totalSpent / 10000).toLocaleString(
                  "vi-VN"
                )} pts`}
                orange
              />
              <Stat label="Số chuyến" value={`${form.bookingCount} chuyến`} />
            </div>
          </div>
        </div>
      </section>

      <div className="flex gap-8 overflow-x-auto border-b border-[#dfe3e4] px-2">
        <TabButton
          active={activeTab === "personal"}
          icon={<User size={18} />}
          label="Thông tin cá nhân"
          onClick={() => setActiveTab("personal")}
        />
        <TabButton
          active={activeTab === "account"}
          icon={<Settings size={18} />}
          label="Cài đặt tài khoản"
          onClick={() => setActiveTab("account")}
        />
        <TabButton
          active={activeTab === "history"}
          icon={<History size={18} />}
          label="Lịch sử đặt chỗ"
          onClick={() => setActiveTab("history")}
        />
      </div>

      {activeTab === "personal" && (
        <section className="rounded-[2rem] border border-[#ebeeef] bg-white p-8 shadow-sm">
          <SectionTitle
            icon={<Badge size={21} />}
            title="Thông tin cơ bản"
            desc="Thông tin nhận dạng và liên lạc chính thức của khách hàng"
          />

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Field label="Họ và tên">
              <input
                value={form.fullName}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, fullName: e.target.value }))
                }
                className="input-edit"
              />
            </Field>

            <Field label="Địa chỉ Email">
              <input
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, email: e.target.value }))
                }
                className="input-edit"
              />
            </Field>

            <Field label="Số điện thoại">
              <input
                value={form.phone}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, phone: e.target.value }))
                }
                className="input-edit"
              />
            </Field>

            <Field label="Ngày sinh">
              <input
                type="date"
                value={form.dateOfBirth}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    dateOfBirth: e.target.value,
                  }))
                }
                className="input-edit"
              />
            </Field>
          </div>

          <div className="mt-8 space-y-4">
            <label className="px-1 text-[10px] font-bold uppercase tracking-widest text-[#6e797b]">
              Giới tính
            </label>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {[
                { label: "Nam", value: "MALE" },
                { label: "Nữ", value: "FEMALE" },
                { label: "Khác", value: "OTHER" },
              ].map((item) => {
                const active = form.gender === item.value;

                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({ ...prev, gender: item.value }))
                    }
                    className={`flex items-center justify-center gap-3 rounded-2xl border p-4 transition ${
                      active
                        ? "border-[#00606c] bg-[#00606c]/5 text-[#00606c]"
                        : "border-[#ebeeef] bg-[#f1f4f5] text-[#6e797b] hover:text-[#00606c]"
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                        active ? "border-[#00606c]" : "border-[#bdc8cb]"
                      }`}
                    >
                      {active && (
                        <span className="h-2.5 w-2.5 rounded-full bg-[#00606c]" />
                      )}
                    </span>
                    <span className="text-sm font-bold">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-8">
            <Field label="Địa chỉ thường trú">
              <textarea
                rows={3}
                value={form.address}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, address: e.target.value }))
                }
                className="input-edit resize-none rounded-2xl py-4"
              />
            </Field>
          </div>
        </section>
      )}

      {activeTab === "account" && (
        <section className="rounded-[2rem] border border-[#ebeeef] bg-white p-8 shadow-sm">
          <SectionTitle
            icon={<CheckCircle2 size={21} />}
            title="Cài đặt tài khoản"
            desc="Phân loại khách hàng và trạng thái hồ sơ"
            orange
          />

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <Field label="Loại khách hàng">
              <select
                value={form.customerType}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    customerType: e.target.value,
                  }))
                }
                className="input-edit"
              >
                <option value="INDIVIDUAL">Cá nhân</option>
                <option value="COMPANY">Doanh nghiệp</option>
                <option value="GROUP">Nhóm</option>
              </select>
            </Field>

            <div className="flex items-center justify-between rounded-2xl border border-[#ebeeef] bg-[#f1f4f5]/70 px-6 py-4">
              <div>
                <p className="text-sm font-bold text-[#181c1d]">
                  Trạng thái hoạt động
                </p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#00606c]">
                  Đang hoạt động
                </p>
              </div>
              <CheckCircle2 className="text-[#00606c]" />
            </div>
          </div>

          <div className="mt-8">
            <Field label="Ghi chú">
              <textarea
                rows={5}
                value={form.notes}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, notes: e.target.value }))
                }
                className="input-edit resize-none rounded-2xl py-4"
              />
            </Field>
          </div>
        </section>
      )}

      {activeTab === "history" && (
        <section className="rounded-[2rem] border border-[#ebeeef] bg-white p-8 shadow-sm">
          <SectionTitle
            icon={<History size={21} />}
            title="Lịch sử đặt chỗ"
            desc="Các đơn đặt tour đã phát sinh của khách hàng"
          />

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-[#ebeeef] text-[11px] font-black uppercase tracking-widest text-[#6e797b]">
                  <th className="py-4">Mã đơn</th>
                  <th>Tour</th>
                  <th>Ngày khởi hành</th>
                  <th>Giá trị</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>

              <tbody>
                {bookings.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-10 text-center font-semibold text-[#6e797b]"
                    >
                      Khách hàng chưa có lịch sử đặt chỗ.
                    </td>
                  </tr>
                ) : (
                  bookings.map((booking) => (
                    <tr key={booking.id} className="border-b border-[#ebeeef]">
                      <td className="py-5 font-bold text-[#00606c]">
                        #{booking.booking_code}
                      </td>
                      <td className="font-semibold text-[#181c1d]">
                        {booking.tour_name || "-"}
                      </td>
                      <td>{formatDate(booking.start_date)}</td>
                      <td className="font-bold text-[#9b4500]">
                        {formatMoney(booking.total_payable_amount)}
                      </td>
                      <td>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusClass(
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
          </div>
        </section>
      )}

      <div className="flex items-center justify-between rounded-[2rem] border border-[#dfe3e4] bg-white/80 p-4 shadow-lg backdrop-blur-sm">
        <button
          onClick={handleDelete}
          className="flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold text-[#ba1a1a] transition hover:bg-[#ba1a1a]/5"
        >
          <Trash2 size={18} />
          Xóa khách hàng
        </button>

        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(`/admin/customers/${customerId}`)}
            className="rounded-2xl px-8 py-3 text-sm font-bold text-[#6e797b] transition hover:bg-[#f1f4f5]"
          >
            Hủy bỏ
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-2xl bg-[#00606c] px-10 py-3 text-sm font-bold text-white shadow-xl shadow-[#00606c]/20 transition hover:scale-105 disabled:opacity-60"
          >
            <Save size={18} />
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  orange,
}: {
  label: string;
  value: string;
  orange?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[#ebeeef] bg-[#f1f4f5] p-4 text-center md:text-left">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[#6e797b]">
        {label}
      </p>
      <p className={`text-lg font-bold ${orange ? "text-[#9b4500]" : "text-[#00606c]"}`}>
        {value}
      </p>
    </div>
  );
}

function TabButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex shrink-0 items-center gap-2 border-b-2 pb-4 text-sm transition ${
        active
          ? "border-[#00606c] font-bold text-[#00606c]"
          : "border-transparent font-medium text-[#6e797b] hover:text-[#00606c]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function SectionTitle({
  icon,
  title,
  desc,
  orange,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  orange?: boolean;
}) {
  return (
    <div className="mb-8 flex items-center gap-3">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
          orange
            ? "bg-[#9b4500]/10 text-[#9b4500]"
            : "bg-[#00606c]/10 text-[#00606c]"
        }`}
      >
        {icon}
      </div>

      <div>
        <h2 className="font-bold text-[#181c1d]">{title}</h2>
        <p className="text-xs text-[#6e797b]">{desc}</p>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="px-1 text-[10px] font-bold uppercase tracking-widest text-[#6e797b]">
        {label}
      </label>
      {children}
    </div>
  );
}