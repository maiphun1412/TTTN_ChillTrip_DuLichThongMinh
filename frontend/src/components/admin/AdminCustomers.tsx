"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  TrendingUp,
  CheckCircle2,
  Users,
  UserPlus,
  RotateCcw,
  Eye,
  MessageCircle,
  Edit,
  ChevronLeft,
  ChevronRight,
  PieChart,
  Search,
  Trash2,
} from "lucide-react";

const API_BASE_URL = "/backend-api";

type Customer = {
  id: string | number;
  user_id?: string | number | null;
  customer_code: string;
  full_name: string;
  gender?: string | null;
  date_of_birth?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  customer_type: string;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  booking_count?: number;
  total_spent?: string | number;
};

function formatMoney(value?: string | number | null) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

function getInitials(name?: string | null) {
  if (!name) return "KH";

  return name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function getCustomerTier(totalSpent?: string | number | null) {
  const spent = Number(totalSpent || 0);

  if (spent >= 100_000_000) return "Platinum";
  if (spent >= 40_000_000) return "Gold";
  return "Silver";
}

function getCustomerStatus(customer: Customer) {
  return customer.user_id ? "Hoạt động" : "Chưa liên kết";
}

function getTierClass(tier: string) {
  if (tier === "Platinum") {
    return "border-[#00606c]/20 bg-[#00606c]/10 text-[#00606c]";
  }

  if (tier === "Gold") {
    return "border-[#fc8a40]/20 bg-[#fc8a40]/10 text-[#fc8a40]";
  }

  return "border-[#3e494b]/20 bg-[#3e494b]/10 text-[#3e494b]";
}

export default function AdminCustomers() {
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [keyword, setKeyword] = useState("");
  const [tierFilter, setTierFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [customerTypeFilter, setCustomerTypeFilter] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadCustomers() {
    try {
      setLoading(true);

      const params = new URLSearchParams();

      if (keyword.trim()) params.set("keyword", keyword.trim());
      if (customerTypeFilter) params.set("customerType", customerTypeFilter);

      const query = params.toString();
      const url = query
        ? `${API_BASE_URL}/admin/customers?${query}`
        : `${API_BASE_URL}/admin/customers`;

      const res = await fetch(url, {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("LOAD_CUSTOMERS_ERROR:", res.status, text);
        setCustomers([]);
        return;
      }

      const json = await res.json();
      setCustomers(json.data || []);
    } catch (error) {
      console.error("LOAD_CUSTOMERS_ERROR:", error);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteCustomer(customer: Customer) {
    const ok = confirm(
      `Bạn có chắc muốn xóa khách hàng ${customer.full_name} không?`
    );

    if (!ok) return;

    try {
      const res = await fetch(`${API_BASE_URL}/admin/customers/${customer.id}`, {
        method: "DELETE",
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        alert(json?.message || "Xóa khách hàng thất bại");
        return;
      }

      await loadCustomers();
    } catch (error) {
      console.error("DELETE_CUSTOMER_ERROR:", error);
      alert("Không thể xóa khách hàng");
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCustomers();
    }, 300);

    return () => clearTimeout(timer);
  }, [keyword, customerTypeFilter]);

  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const tier = getCustomerTier(customer.total_spent);
      const status = getCustomerStatus(customer);

      if (tierFilter && tier !== tierFilter) return false;
      if (statusFilter && status !== statusFilter) return false;

      return true;
    });
  }, [customers, tierFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = customers.length;

    const newThisMonth = customers.filter((customer) => {
      if (!customer.created_at) return false;

      const created = new Date(customer.created_at);
      const now = new Date();

      return (
        created.getMonth() === now.getMonth() &&
        created.getFullYear() === now.getFullYear()
      );
    }).length;

    const returnCustomers = customers.filter(
      (customer) => Number(customer.booking_count || 0) >= 2
    ).length;

    const returnRate =
      total > 0 ? Math.round((returnCustomers / total) * 1000) / 10 : 0;

    const tierCounts = {
      platinum: customers.filter(
        (customer) => getCustomerTier(customer.total_spent) === "Platinum"
      ).length,
      gold: customers.filter(
        (customer) => getCustomerTier(customer.total_spent) === "Gold"
      ).length,
      silver: customers.filter(
        (customer) => getCustomerTier(customer.total_spent) === "Silver"
      ).length,
    };

    return {
      total,
      newThisMonth,
      returnRate,
      tierCounts,
    };
  }, [customers]);

  const platinumPercent =
    stats.total > 0
      ? `${Math.round((stats.tierCounts.platinum / stats.total) * 100)}%`
      : "0%";

  const goldPercent =
    stats.total > 0
      ? `${Math.round((stats.tierCounts.gold / stats.total) * 100)}%`
      : "0%";

  const silverPercent =
    stats.total > 0
      ? `${Math.round((stats.tierCounts.silver / stats.total) * 100)}%`
      : "0%";

  return (
    <div>
      <section className="mb-12">
        <h1 className="mb-8 text-4xl font-extrabold tracking-tighter text-[#00606c]">
          Quản lý Khách hàng
        </h1>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="group relative overflow-hidden rounded-xl border-l-4 border-[#00606c] bg-white p-8 shadow-[0_8px_30px_rgb(0,96,108,0.04)]">
            <div className="relative z-10">
              <p className="mb-2 text-sm font-bold uppercase tracking-widest text-[#3e494b]">
                Tổng khách hàng
              </p>
              <h2 className="text-4xl font-black text-[#00606c]">
                {stats.total}
              </h2>
              <div className="mt-4 flex items-center text-xs font-bold text-[#007b8a]">
                <TrendingUp size={14} className="mr-1" />
                Dữ liệu khách hàng hiện có
              </div>
            </div>
            <Users className="absolute -bottom-4 -right-4 h-28 w-28 text-[#00606c]/5 transition group-hover:scale-110" />
          </div>

          <div className="group relative overflow-hidden rounded-xl border-l-4 border-[#fc8a40] bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
            <div className="relative z-10">
              <p className="mb-2 text-sm font-bold uppercase tracking-widest text-[#3e494b]">
                Khách hàng mới
              </p>
              <h2 className="text-4xl font-black text-[#fc8a40]">
                {stats.newThisMonth}
              </h2>
              <p className="mt-4 text-xs text-[#3e494b]">Trong tháng này</p>
            </div>
            <UserPlus className="absolute -bottom-4 -right-4 h-28 w-28 text-[#fc8a40]/5 transition group-hover:scale-110" />
          </div>

          <div className="group relative overflow-hidden rounded-xl border-l-4 border-[#007a93] bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
            <div className="relative z-10">
              <p className="mb-2 text-sm font-bold uppercase tracking-widest text-[#3e494b]">
                Tỷ lệ quay lại
              </p>
              <h2 className="text-4xl font-black text-[#007a93]">
                {stats.returnRate}%
              </h2>
              <div className="mt-4 flex items-center text-xs font-bold text-[#007a93]">
                <CheckCircle2 size={14} className="mr-1" />
                Khách có từ 2 đơn trở lên
              </div>
            </div>
            <RotateCcw className="absolute -bottom-4 -right-4 h-28 w-28 text-[#007a93]/5 transition group-hover:scale-110" />
          </div>
        </div>
      </section>

      <section className="rounded-xl bg-[#f1f4f5] p-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center rounded-full bg-white px-4 py-3 shadow-sm">
              <Search size={17} className="mr-2 text-[#00606c]" />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Tìm tên, email, SĐT..."
                className="w-56 bg-transparent text-sm font-semibold outline-none"
              />
            </div>

            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="rounded-full bg-white px-5 py-3 text-sm font-bold text-[#3e494b] shadow-sm outline-none"
            >
              <option value="">Hạng thành viên: Tất cả</option>
              <option value="Platinum">Platinum</option>
              <option value="Gold">Gold</option>
              <option value="Silver">Silver</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-full bg-white px-5 py-3 text-sm font-bold text-[#3e494b] shadow-sm outline-none"
            >
              <option value="">Trạng thái: Tất cả</option>
              <option value="Hoạt động">Hoạt động</option>
              <option value="Chưa liên kết">Chưa liên kết</option>
            </select>

            <select
              value={customerTypeFilter}
              onChange={(e) => setCustomerTypeFilter(e.target.value)}
              className="rounded-full bg-white px-5 py-3 text-sm font-bold text-[#3e494b] shadow-sm outline-none"
            >
              <option value="">Loại khách: Tất cả</option>
              <option value="INDIVIDUAL">Cá nhân</option>
              <option value="COMPANY">Doanh nghiệp</option>
              <option value="GROUP">Nhóm</option>
            </select>
          </div>

          <button
            onClick={() => router.push("/admin/customers/create")}
            className="flex items-center rounded-full bg-gradient-to-r from-[#9b4500] to-[#fc8a40] px-8 py-3 font-bold text-white shadow-lg shadow-[#9b4500]/20 transition hover:scale-105"
          >
            <UserPlus size={18} className="mr-2" />
            Thêm khách hàng mới
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-y-4 text-left">
            <thead>
              <tr className="text-[11px] font-black uppercase tracking-[0.2em] text-[#3e494b]">
                <th className="px-6 pb-2">Khách hàng</th>
                <th className="px-6 pb-2">Liên hệ</th>
                <th className="px-6 pb-2">Hạng thẻ</th>
                <th className="px-6 pb-2">Tổng chi tiêu</th>
                <th className="px-6 pb-2 text-center">Trạng thái</th>
                <th className="px-6 pb-2 text-right">Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="rounded-xl bg-white px-6 py-10 text-center text-sm font-bold text-[#00606c]"
                  >
                    Đang tải danh sách khách hàng...
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="rounded-xl bg-white px-6 py-10 text-center text-sm font-bold text-[#3e494b]"
                  >
                    Không có khách hàng phù hợp.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer, index) => {
                  const tier = getCustomerTier(customer.total_spent);
                  const status = getCustomerStatus(customer);

                  return (
                    <tr
                      key={customer.id}
                      className="group bg-white transition-shadow duration-300 hover:shadow-xl"
                    >
                      <td className="rounded-l-xl px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div
                            className={`flex h-12 w-12 items-center justify-center rounded-full text-sm font-black ${
                              index === 0
                                ? "bg-[#9defff] text-[#00606c]"
                                : index === 1
                                ? "bg-[#ffdbc9] text-[#9b4500]"
                                : "bg-[#dfe3e4] text-[#3e494b]"
                            }`}
                          >
                            {getInitials(customer.full_name)}
                          </div>

                          <div>
                            <p className="font-bold tracking-tight text-[#181c1d]">
                              {customer.full_name}
                            </p>
                            <p className="text-[11px] font-medium text-[#3e494b]">
                              ID: #{customer.customer_code}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <p className="text-sm font-medium text-[#181c1d]">
                          {customer.email || "-"}
                        </p>
                        <p className="text-xs text-[#3e494b]">
                          {customer.phone || "-"}
                        </p>
                      </td>

                      <td className="px-6 py-5">
                        <span
                          className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${getTierClass(
                            tier
                          )}`}
                        >
                          {tier}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <p className="text-sm font-black text-[#00606c]">
                          {formatMoney(customer.total_spent)}
                        </p>
                        <p className="mt-1 text-[10px] text-[#6e797b]">
                          {Number(customer.booking_count || 0)} đơn đặt tour
                        </p>
                      </td>

                      <td className="px-6 py-5 text-center">
                        <span
                          className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-tighter ${
                            status === "Hoạt động"
                              ? "bg-emerald-500/10 text-emerald-600"
                              : "bg-[#ffdbc9] text-[#763300]"
                          }`}
                        >
                          {status}
                        </span>
                      </td>

                      <td className="rounded-r-xl px-6 py-5 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() =>
                              router.push(`/admin/customers/${customer.id}`)
                            }
                            className="rounded-full p-2 text-[#00606c] transition hover:bg-[#00606c]/10"
                            title="Xem chi tiết"
                          >
                            <Eye size={18} />
                          </button>

                          <button
                            onClick={() =>
                              router.push(
                                `/admin/customers/${customer.id}/messages`
                              )
                            }
                            className="rounded-full p-2 text-[#00606c] transition hover:bg-[#00606c]/10"
                            title="Nhắn tin"
                          >
                            <MessageCircle size={18} />
                          </button>

                          <button
                            onClick={() =>
                              router.push(`/admin/customers/${customer.id}/edit`)
                            }
                            className="rounded-full p-2 text-[#00606c] transition hover:bg-[#00606c]/10"
                            title="Chỉnh sửa"
                          >
                            <Edit size={18} />
                          </button>

                          <button
                            onClick={() => handleDeleteCustomer(customer)}
                            className="rounded-full p-2 text-[#ba1a1a] transition hover:bg-[#ba1a1a]/10"
                            title="Xóa"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-8 flex items-center justify-between">
          <p className="text-xs font-medium text-[#3e494b]">
            Đang hiển thị {filteredCustomers.length} trên tổng số{" "}
            {customers.length} khách hàng
          </p>

          <div className="flex gap-2">
            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f6fafb] transition hover:bg-[#00606c]/10">
              <ChevronLeft size={18} className="text-[#3e494b]" />
            </button>
            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00606c] text-xs font-bold text-white">
              1
            </button>
            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f6fafb] transition hover:bg-[#00606c]/10">
              <ChevronRight size={18} className="text-[#3e494b]" />
            </button>
          </div>
        </div>
      </section>

      <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2">
        <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl bg-[#001f24] p-10 text-white">
          <div className="relative z-10">
            <h3 className="mb-4 text-2xl font-black">
              Chiến dịch Loyalty Tháng này
            </h3>
            <p className="mb-8 max-w-xs text-sm leading-relaxed text-[#ddf9ff]/70">
              Đề xuất nâng hạng Gold cho các khách hàng có chi tiêu trên 40
              triệu VNĐ để thúc đẩy doanh thu.
            </p>

            <button
              onClick={() => setTierFilter("Gold")}
              className="rounded-full bg-[#9defff] px-6 py-2 text-sm font-bold text-[#001f24] transition hover:scale-105"
            >
              Xem danh sách đề xuất
            </button>
          </div>

          <div className="absolute -right-10 top-0 h-full w-64 bg-gradient-to-br from-[#007b8a]/30 to-[#9defff]/10 opacity-70 transition group-hover:scale-110" />
        </div>

        <div className="rounded-xl border border-[#bdc8cb]/10 bg-[#e5e9ea] p-10">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-xl font-bold text-[#00606c]">
              Phân bổ khách hàng
            </h3>
            <PieChart size={22} className="text-[#3e494b]" />
          </div>

          <div className="space-y-4">
            <CustomerProgress
              label="Platinum"
              value={platinumPercent}
              color="bg-[#00606c]"
            />
            <CustomerProgress
              label="Gold"
              value={goldPercent}
              color="bg-[#fc8a40]"
            />
            <CustomerProgress
              label="Silver"
              value={silverPercent}
              color="bg-[#007a93]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomerProgress({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-bold text-[#181c1d]">
        <span>{label}</span>
        <span>{value}</span>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-[#ebeeef]">
        <div className={`h-full ${color}`} style={{ width: value }} />
      </div>
    </div>
  );
}