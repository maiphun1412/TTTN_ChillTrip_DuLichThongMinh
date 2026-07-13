"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  TicketPercent,
  Zap,
  Gift,
  Wallet,
  Edit,
  Trash2,
  Pause,
  Play,
  Eye,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
} from "lucide-react";

const API_BASE_URL = "/backend-api";

type Promotion = {
  id: string | number;
  promotion_code: string;
  promotion_name: string;
  promotion_type: string;
  discount_value: string | number;
  min_order_amount: string | number;
  max_discount_amount?: string | number | null;
  usage_limit?: number | null;
  used_count: number;
  start_at: string;
  end_at: string;
  status: string;
  description?: string | null;
  tour_count?: number;
};

function formatMoney(value?: string | number | null) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("vi-VN");
}

function getPromotionTypeLabel(type: string) {
  if (type === "PERCENT") return "Giảm phần trăm";
  if (type === "AMOUNT") return "Giảm tiền mặt";
  return type || "-";
}

function getDiscountText(item: Promotion) {
  if (item.promotion_type === "PERCENT") {
    return `${Number(item.discount_value || 0)}%`;
  }

  return formatMoney(item.discount_value);
}

function getRealStatus(item: Promotion) {
  const now = new Date();
  const start = new Date(item.start_at);
  const end = new Date(item.end_at);

  if (item.status === "INACTIVE") return "INACTIVE";
  if (now < start) return "UPCOMING";
  if (now > end) return "ENDED";

  return item.status || "ACTIVE";
}

function getStatusLabel(status: string) {
  switch (status) {
    case "ACTIVE":
      return "Đang chạy";
    case "UPCOMING":
      return "Sắp diễn ra";
    case "ENDED":
      return "Đã kết thúc";
    case "INACTIVE":
      return "Tạm dừng";
    default:
      return status || "-";
  }
}

function getStatusClass(status: string) {
  switch (status) {
    case "ACTIVE":
      return "bg-green-100 text-green-700";
    case "UPCOMING":
      return "bg-blue-100 text-blue-700";
    case "ENDED":
      return "bg-slate-100 text-slate-500";
    case "INACTIVE":
      return "bg-orange-100 text-orange-700";
    default:
      return "bg-[#ebeeef] text-[#3e494b]";
  }
}

export default function AdminPromotions() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("");
  const [promotionType, setPromotionType] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadPromotions() {
    try {
      setLoading(true);

      const params = new URLSearchParams();

      if (keyword.trim()) params.set("keyword", keyword.trim());
      if (status) params.set("status", status);
      if (promotionType) params.set("promotionType", promotionType);

      const query = params.toString();
      const url = query
        ? `${API_BASE_URL}/admin/promotions?${query}`
        : `${API_BASE_URL}/admin/promotions`;

      const res = await fetch(url, {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("LOAD_PROMOTIONS_ERROR:", res.status, text);
        setPromotions([]);
        return;
      }

      const json = await res.json();
      setPromotions(json.data || []);
    } catch (error) {
      console.error("LOAD_PROMOTIONS_ERROR:", error);
      setPromotions([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(item: Promotion) {
    const ok = confirm(
      `Bạn có chắc muốn xóa khuyến mãi "${item.promotion_name}" không?`
    );

    if (!ok) return;

    try {
      const res = await fetch(`${API_BASE_URL}/admin/promotions/${item.id}`, {
        method: "DELETE",
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        alert(json?.message || "Xóa khuyến mãi thất bại");
        return;
      }

      await loadPromotions();
    } catch (error) {
      console.error("DELETE_PROMOTION_ERROR:", error);
      alert("Không thể xóa khuyến mãi");
    }
  }

  async function handleToggleStatus(item: Promotion) {
    try {
      const nextStatus = item.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

      const res = await fetch(`${API_BASE_URL}/admin/promotions/${item.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          promotionName: item.promotion_name,
          promotionType: item.promotion_type,
          discountValue: item.discount_value,
          minOrderAmount: item.min_order_amount,
          maxDiscountAmount: item.max_discount_amount,
          usageLimit: item.usage_limit,
          startAt: item.start_at,
          endAt: item.end_at,
          status: nextStatus,
          description: item.description,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        alert(json?.message || "Cập nhật trạng thái thất bại");
        return;
      }

      await loadPromotions();
    } catch (error) {
      console.error("TOGGLE_PROMOTION_STATUS_ERROR:", error);
      alert("Không thể cập nhật trạng thái khuyến mãi");
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadPromotions();
    }, 300);

    return () => clearTimeout(timer);
  }, [keyword, status, promotionType]);

  const stats = useMemo(() => {
    const activeCount = promotions.filter(
      (item) => getRealStatus(item) === "ACTIVE"
    ).length;

    const totalUsed = promotions.reduce(
      (sum, item) => sum + Number(item.used_count || 0),
      0
    );

    const totalDiscount = promotions.reduce((sum, item) => {
      if (item.promotion_type === "AMOUNT") {
        return sum + Number(item.discount_value || 0) * Number(item.used_count || 0);
      }

      return sum;
    }, 0);

    return {
      total: promotions.length,
      activeCount,
      totalUsed,
      totalDiscount,
    };
  }, [promotions]);

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#00606c]">
            Quản lý Khuyến mãi
          </h1>
          <p className="mt-1 text-[#3e494b]">
            Tạo và tối ưu hóa các chiến dịch ưu đãi cho khách hàng.
          </p>
        </div>

        <Link
  href="/admin/promotions/create"
  className="flex w-fit items-center gap-2 rounded-full bg-gradient-to-r from-[#9b4500] to-[#fc8a40] px-8 py-3 font-bold text-white !text-white shadow-xl shadow-[#9b4500]/20 transition hover:scale-105 hover:text-white"
>
  <Plus size={18} className="text-white" />
  <span className="text-white">Tạo khuyến mãi mới</span>
</Link>
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Tổng số mã"
          value={String(stats.total)}
          desc="Tổng chương trình khuyến mãi"
          icon={TicketPercent}
          iconWrap="bg-[#9defff]"
          iconColor="text-[#00606c]"
          hover="hover:bg-[#00606c]"
        />

        <KpiCard
          title="Đang hoạt động"
          value={String(stats.activeCount)}
          desc="Đang áp dụng cho khách hàng"
          icon={Zap}
          iconWrap="bg-[#b3ebff]"
          iconColor="text-[#006074]"
          hover="hover:bg-[#007a93]"
        />

        <KpiCard
          title="Lượt đã dùng"
          value={stats.totalUsed.toLocaleString("vi-VN")}
          desc="Tổng lượt áp dụng mã"
          icon={Gift}
          iconWrap="bg-[#ffdbc9]"
          iconColor="text-[#9b4500]"
          hover="hover:bg-[#9b4500]"
        />

        <KpiCard
          title="Tổng giảm giá"
          value={formatMoney(stats.totalDiscount)}
          desc="Tính trên mã giảm tiền mặt"
          icon={Wallet}
          iconWrap="bg-[#e5e9ea]"
          iconColor="text-[#181c1d]"
          hover="hover:bg-[#181c1d]"
        />
      </section>

      <section className="overflow-hidden rounded-[3rem] bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-[#bdc8cb]/10 p-6 md:flex-row md:items-center">
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center rounded-full bg-[#ebeeef] px-4 py-2">
              <Search size={17} className="mr-2 text-[#00606c]" />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Tìm mã hoặc tên khuyến mãi..."
                className="w-64 bg-transparent text-sm font-semibold outline-none placeholder:text-[#6e797b]/60"
              />
            </div>

            <div className="flex items-center gap-2 rounded-full bg-[#ebeeef] px-4 py-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#3e494b]">
                Trạng thái:
              </span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="border-none bg-transparent p-0 text-sm font-bold text-[#00606c] outline-none focus:ring-0"
              >
                <option value="">Tất cả</option>
                <option value="ACTIVE">Đang chạy</option>
                <option value="INACTIVE">Tạm dừng</option>
              </select>
            </div>

            <div className="flex items-center gap-2 rounded-full bg-[#ebeeef] px-4 py-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#3e494b]">
                Loại:
              </span>
              <select
                value={promotionType}
                onChange={(e) => setPromotionType(e.target.value)}
                className="border-none bg-transparent p-0 text-sm font-bold text-[#00606c] outline-none focus:ring-0"
              >
                <option value="">Tất cả</option>
                <option value="PERCENT">Giảm %</option>
                <option value="AMOUNT">Giảm tiền mặt</option>
              </select>
            </div>
          </div>

          <div className="text-xs font-bold text-[#6e797b]">
            Hiển thị {promotions.length} khuyến mãi
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] border-collapse text-left">
            <thead>
              <tr className="bg-[#f1f4f5]">
                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-[0.1em] text-slate-500">
                  Tên chương trình / Mã
                </th>
                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-[0.1em] text-slate-500">
                  Loại ưu đãi
                </th>
                <th className="px-6 py-4 text-center text-[11px] font-black uppercase tracking-[0.1em] text-slate-500">
                  Giá trị
                </th>
                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-[0.1em] text-slate-500">
                  Thời gian
                </th>
                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-[0.1em] text-slate-500">
                  Số lượng
                </th>
                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-[0.1em] text-slate-500">
                  Trạng thái
                </th>
                <th className="px-6 py-4 text-right text-[11px] font-black uppercase tracking-[0.1em] text-slate-500">
                  Hành động
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#bdc8cb]/10">
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-sm font-bold text-[#00606c]"
                  >
                    Đang tải danh sách khuyến mãi...
                  </td>
                </tr>
              ) : promotions.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-sm font-bold text-[#6e797b]"
                  >
                    Chưa có khuyến mãi phù hợp.
                  </td>
                </tr>
              ) : (
                promotions.map((item) => {
                  const realStatus = getRealStatus(item);
                  const percent =
                    item.usage_limit && item.usage_limit > 0
                      ? Math.min(
                          (Number(item.used_count || 0) /
                            Number(item.usage_limit || 1)) *
                            100,
                          100
                        )
                      : 0;

                  return (
                    <tr
                      key={item.id}
                      className={`transition hover:bg-[#f8fbfc] ${
                        realStatus === "ENDED" ? "opacity-70" : ""
                      }`}
                    >
                      <td className="px-6 py-5">
                        <p className="font-bold text-cyan-900">
                          {item.promotion_name}
                        </p>
                        <code className="rounded bg-[#9defff]/30 px-2 py-0.5 font-mono text-[10px] font-bold text-[#001f24]">
                          {item.promotion_code}
                        </code>
                      </td>

                      <td className="px-6 py-5">
                        <span className="text-sm font-medium text-[#3e494b]">
                          {getPromotionTypeLabel(item.promotion_type)}
                        </span>
                      </td>

                      <td className="px-6 py-5 text-center">
                        <span className="text-lg font-black text-[#00606c]">
                          {getDiscountText(item)}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <div className="space-y-0.5 text-xs">
                          <p className="text-slate-400">
                            <span className="font-bold text-slate-600">
                              BĐ:
                            </span>{" "}
                            {formatDate(item.start_at)}
                          </p>
                          <p className="text-slate-400">
                            <span className="font-bold text-slate-600">
                              KT:
                            </span>{" "}
                            {formatDate(item.end_at)}
                          </p>
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <div className="w-full max-w-[140px] space-y-1.5">
                          <div className="flex justify-between text-[10px] font-bold">
                            <span>{Number(item.used_count || 0)}</span>
                            <span className="text-slate-400">
                              / {item.usage_limit || "∞"}
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full ${
                                realStatus === "ENDED"
                                  ? "bg-slate-400"
                                  : "bg-[#00606c]"
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${getStatusClass(
                            realStatus
                          )}`}
                        >
                          {realStatus === "ACTIVE" && (
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
                          )}
                          {getStatusLabel(realStatus)}
                        </span>
                      </td>

                      <td className="px-6 py-5 text-right">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/admin/promotions/${item.id}`}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-[#9defff]/20 hover:text-[#00606c]"
                            title="Xem chi tiết"
                          >
                            <Eye size={17} />
                          </Link>

                          <Link
                            href={`/admin/promotions/${item.id}/edit`}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-[#9defff]/20 hover:text-[#00606c]"
                            title="Chỉnh sửa"
                          >
                            <Edit size={17} />
                          </Link>

                          <button
                            onClick={() => handleToggleStatus(item)}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-[#ffdbc9]/30 hover:text-[#9b4500]"
                            title={
                              item.status === "ACTIVE"
                                ? "Tạm dừng"
                                : "Kích hoạt"
                            }
                          >
                            {item.status === "ACTIVE" ? (
                              <Pause size={17} />
                            ) : (
                              <Play size={17} />
                            )}
                          </button>

                          <button
                            onClick={() => handleDelete(item)}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-[#ffdad6]/40 hover:text-[#ba1a1a]"
                            title="Xóa"
                          >
                            <Trash2 size={17} />
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

        <div className="flex items-center justify-between bg-slate-50/50 p-6">
          <div className="flex gap-2">
            <button className="flex h-10 w-10 items-center justify-center rounded-full border border-[#bdc8cb]/30 text-slate-400">
              <ChevronLeft size={18} />
            </button>
            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00606c] font-bold text-white shadow-lg shadow-[#00606c]/20">
              1
            </button>
            <button className="flex h-10 w-10 items-center justify-center rounded-full border border-transparent font-bold text-slate-600">
              2
            </button>
            <button className="flex h-10 w-10 items-center justify-center rounded-full border border-[#bdc8cb]/30 text-slate-400">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>

      <section className="relative h-64 overflow-hidden rounded-[3rem]">
  {/* Ảnh nền */}
  <img
    src="/images/promotion-banner.jpg" // đổi path nếu cần
    alt="Chiến dịch khuyến mãi"
    className="absolute inset-0 h-full w-full object-cover"
  />

  {/* Overlay cho chữ dễ đọc */}
  <div className="absolute inset-0 bg-gradient-to-r from-cyan-950/90 via-cyan-900/60 to-transparent" />

  {/* Nội dung */}
  <div className="relative z-10 flex h-full items-center px-10">
    <div className="max-w-xl text-white">
      <h3 className="mb-4 text-4xl font-black tracking-tight">
        Chiến dịch cuối năm rực rỡ
      </h3>

      <p className="mb-6 text-sm leading-6 text-cyan-100">
        Chuẩn bị các mã khuyến mãi đặc biệt cho mùa cao điểm để tăng
        trưởng đặt tour và giữ chân khách hàng thân thiết.
      </p>

      <Link
        href="/admin/promotions/create"
        className="rounded-full bg-white px-6 py-3 text-sm font-black uppercase tracking-widest text-cyan-900 transition hover:bg-[#9defff]"
      >
        Tạo chiến dịch ngay
      </Link>
    </div>
  </div>
</section>
    </div>
  );
}

function KpiCard({
  title,
  value,
  desc,
  icon: Icon,
  iconWrap,
  iconColor,
  hover,
}: {
  title: string;
  value: string;
  desc: string;
  icon: any;
  iconWrap: string;
  iconColor: string;
  hover: string;
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-[2rem] border border-[#bdc8cb]/20 bg-white px-5 py-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${hover}`}
    >
      <div className="relative flex flex-col gap-3">
        
        {/* Hàng trên */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-[46px] w-[46px] items-center justify-center rounded-xl ${iconWrap} transition group-hover:bg-white/20`}
            >
              <Icon
                size={22}
                className={`${iconColor} transition group-hover:text-white`}
              />
            </div>

            <h3 className="text-3xl font-black leading-none text-[#181c1d] transition group-hover:text-white">
              {value}
            </h3>
          </div>

          <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[#6e797b] transition group-hover:text-white/80">
            {title}
          </span>
        </div>

        {/* Divider */}
        <div className="h-[3px] w-10 rounded-full bg-[#fc8a40] transition group-hover:bg-white/80" />

        {/* Mô tả */}
        <p className="text-sm font-semibold text-[#3e494b] transition group-hover:text-white/85">
          {desc}
        </p>
      </div>
    </div>
  );
}