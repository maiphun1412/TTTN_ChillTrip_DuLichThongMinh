"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Edit,
  Info,
  MoreVertical,
  Share2,
  TicketPercent,
  TrendingUp,
  Users,
  Wallet,
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
};

type Tour = {
  id: string | number;
  tour_code?: string | null;
  tour_name?: string | null;
  tour_type?: string | null;
  base_price?: string | number | null;
  status?: string | null;
};

type ApiData = {
  promotion: Promotion;
  tours: Tour[];
};

function getAuthHeaders() {
  if (typeof window === "undefined") {
    return { "Content-Type": "application/json" };
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

function formatMoney(value?: string | number | null) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("vi-VN");
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("vi-VN");
}

function getPromotionTypeLabel(type?: string) {
  if (type === "PERCENT") return "Phần trăm (%)";
  if (type === "AMOUNT") return "Tiền cố định";
  return type || "-";
}

function getDiscountText(promotion: Promotion) {
  if (promotion.promotion_type === "PERCENT") {
    return `${Number(promotion.discount_value || 0)}%`;
  }

  return formatMoney(promotion.discount_value);
}

function getRealStatus(promotion: Promotion) {
  const now = new Date();
  const start = new Date(promotion.start_at);
  const end = new Date(promotion.end_at);

  if (promotion.status === "INACTIVE") return "INACTIVE";
  if (now < start) return "UPCOMING";
  if (now > end) return "ENDED";

  return promotion.status || "ACTIVE";
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
      return "bg-[#9defff] text-[#001f24]";
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

export default function AdminPromotionDetail({
  promotionId,
}: {
  promotionId: string;
}) {
  const router = useRouter();

  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadDetail() {
    try {
      setLoading(true);

      const res = await fetch(`${API_BASE_URL}/admin/promotions/${promotionId}`, {
        method: "GET",
        headers: getAuthHeaders(),
        cache: "no-store",
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        console.error("LOAD_PROMOTION_DETAIL_ERROR:", res.status, json);
        setData(null);
        return;
      }

      const json = await res.json();
      setData(json.data || null);
    } catch (error) {
      console.error("LOAD_PROMOTION_DETAIL_ERROR:", error);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDetail();
  }, [promotionId]);

  const chartValues = useMemo(() => {
    const used = Number(data?.promotion?.used_count || 0);

    return [
      Math.max(18, used * 4 + 30),
      Math.max(24, used * 3 + 20),
      Math.max(35, used * 5 + 38),
      Math.max(28, used * 4 + 46),
      Math.max(22, used * 3 + 34),
      Math.max(40, used * 5 + 50),
      Math.max(32, used * 4 + 42),
    ].map((item) => Math.min(item, 96));
  }, [data]);

  if (loading) {
    return (
      <div className="rounded-[2rem] bg-white p-10 text-center font-bold text-[#00606c]">
        Đang tải chi tiết khuyến mãi...
      </div>
    );
  }

  if (!data?.promotion) {
    return (
      <div className="rounded-[2rem] bg-white p-10 text-center font-bold text-[#ba1a1a]">
        Không tìm thấy khuyến mãi.
      </div>
    );
  }

  const promotion = data.promotion;
  const tours = data.tours || [];
  const status = getRealStatus(promotion);
  const usageLimit = Number(promotion.usage_limit || 0);
  const usedCount = Number(promotion.used_count || 0);
  const usagePercent =
    usageLimit > 0 ? Math.min(Math.round((usedCount / usageLimit) * 100), 100) : 0;

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#6e797b]">
          <Link href="/admin/promotions" className="hover:text-[#00606c]">
            Quản lý Khuyến mãi
          </Link>
          <span>/</span>
          <span className="font-black text-[#00606c]">Chi tiết</span>
        </div>

        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <button
              onClick={() => router.push("/admin/promotions")}
              className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-[#00606c] shadow-sm transition hover:bg-[#9defff]/30"
            >
              <ArrowLeft size={17} />
              Quay lại danh sách khuyến mãi
            </button>

            <h1 className="text-4xl font-black tracking-tight text-[#00606c]">
              Chi tiết Khuyến mãi
            </h1>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/admin/promotions/${promotion.id}/edit`}
              className="inline-flex items-center gap-2 rounded-full bg-[#e5e9ea] px-6 py-3 font-black text-[#181c1d] transition hover:bg-[#dfe3e4]"
            >
              <Edit size={18} />
              Chỉnh sửa
            </Link>

            <button
              onClick={() => navigator.clipboard?.writeText(promotion.promotion_code)}
              className="inline-flex items-center gap-2 rounded-full bg-[#00606c] px-6 py-3 font-black text-white shadow-lg shadow-[#00606c]/20 transition hover:scale-105"
            >
              <Share2 size={18} />
              Sao chép mã
            </button>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-[#00606c] to-[#007b8a] p-8 shadow-xl lg:col-span-2">
          <div className="relative z-10">
            <div className="mb-8 flex items-start justify-between gap-4">
              <span className="rounded-full border border-white/30 bg-white/20 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-white backdrop-blur">
                Mã ưu đãi
              </span>

              <span
                className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-black uppercase ${getStatusClass(
                  status
                )}`}
              >
                {status === "ACTIVE" && (
                  <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                )}
                {getStatusLabel(status)}
              </span>
            </div>

            <h2 className="mb-3 break-all text-5xl font-black tracking-tight text-white md:text-6xl">
              {promotion.promotion_code}
            </h2>

            <p className="max-w-xl text-lg font-semibold text-[#ddf9ff]">
              {promotion.promotion_name}
            </p>
          </div>

          <TicketPercent className="absolute -bottom-10 -right-10 h-60 w-60 rotate-12 text-white/10" />
        </div>

        <SummaryCard
          icon={<Users size={23} />}
          label="Lượt sử dụng"
          value={usedCount.toLocaleString("vi-VN")}
          desc={usageLimit > 0 ? `Giới hạn ${usageLimit} lượt` : "Không giới hạn"}
          tone="cyan"
        />

        <SummaryCard
          icon={<Wallet size={23} />}
          label="Giá trị ưu đãi"
          value={getDiscountText(promotion)}
          desc={getPromotionTypeLabel(promotion.promotion_type)}
          tone="orange"
        />
      </section>

      <section className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="rounded-[3rem] bg-white p-8 shadow-sm">
          <SectionTitle
            icon={<Info size={22} />}
            title="Thông tin chi tiết"
            desc="Điều kiện và thời gian áp dụng chương trình."
          />

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <InfoBox label="Loại hình" value={getPromotionTypeLabel(promotion.promotion_type)} />
            <InfoBox label="Giá trị giảm" value={getDiscountText(promotion)} />
            <InfoBox label="Đơn hàng tối thiểu" value={formatMoney(promotion.min_order_amount)} />
            <InfoBox
              label="Giảm tối đa"
              value={
                promotion.max_discount_amount
                  ? formatMoney(promotion.max_discount_amount)
                  : "Không giới hạn"
              }
            />
            <InfoBox label="Ngày bắt đầu" value={formatDateTime(promotion.start_at)} />
            <InfoBox label="Ngày kết thúc" value={formatDateTime(promotion.end_at)} />
          </div>

          <div className="mt-8 border-t border-[#bdc8cb]/20 pt-6">
            <p className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#6e797b]">
              Mô tả chiến dịch
            </p>
            <p className="leading-7 text-[#3e494b]">
              {promotion.description || "Chưa có mô tả cho chương trình khuyến mãi này."}
            </p>
          </div>
        </div>

        <div className="rounded-[3rem] bg-white p-8 shadow-sm">
          <div className="mb-8 flex items-center justify-between gap-4">
            <SectionTitle
              icon={<BarChart3 size={22} />}
              title="Hiệu quả chiến dịch"
              desc="Biểu đồ mô phỏng dựa trên lượt sử dụng hiện tại."
              orange
              noMargin
            />

            <span className="rounded-full bg-[#f1f4f5] px-4 py-2 text-xs font-black uppercase text-[#3e494b]">
              7 ngày qua
            </span>
          </div>

          <div className="flex min-h-[280px] items-end justify-between gap-4">
            {chartValues.map((height, index) => (
              <div key={index} className="group flex w-full flex-col items-center gap-3">
                <div className="relative h-56 w-full overflow-hidden rounded-full bg-[#f1f4f5]">
                  <div
                    className={`absolute bottom-0 w-full rounded-full transition-all duration-500 group-hover:brightness-110 ${
                      index === 2 ? "bg-[#9b4500]" : "bg-[#00606c]"
                    }`}
                    style={{ height: `${height}%` }}
                  />
                </div>
                <span className="text-xs font-black text-[#6e797b]">
                  {["T2", "T3", "T4", "T5", "T6", "T7", "CN"][index]}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-[2rem] bg-[#f8fbfc] p-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-black text-[#181c1d]">
                Tiến độ sử dụng mã
              </span>
              <span className="text-sm font-black text-[#00606c]">
                {usageLimit > 0 ? `${usagePercent}%` : "∞"}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-[#dfe3e4]">
              <div
                className="h-full rounded-full bg-[#00606c]"
                style={{ width: usageLimit > 0 ? `${usagePercent}%` : "100%" }}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[3rem] bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-[#bdc8cb]/10 p-8 md:flex-row md:items-center">
          <div>
            <h3 className="text-2xl font-black text-[#181c1d]">
              Tour áp dụng khuyến mãi
            </h3>
            <p className="mt-1 text-sm font-semibold text-[#6e797b]">
              {tours.length > 0
                ? `${tours.length} tour được gán cho mã này`
                : "Nếu không chọn tour cụ thể, mã có thể áp dụng theo logic toàn hệ thống."}
            </p>
          </div>

          <Link
            href={`/admin/promotions/${promotion.id}/edit`}
            className="rounded-full bg-[#f1f4f5] px-5 py-3 text-sm font-black text-[#00606c] transition hover:bg-[#9defff]/40"
          >
            Quản lý tour áp dụng
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead className="bg-[#f1f4f5]">
              <tr>
                <th className="px-8 py-5 text-[11px] font-black uppercase tracking-[0.18em] text-[#6e797b]">
                  Tour du lịch
                </th>
                <th className="px-8 py-5 text-[11px] font-black uppercase tracking-[0.18em] text-[#6e797b]">
                  Mã tour
                </th>
                <th className="px-8 py-5 text-[11px] font-black uppercase tracking-[0.18em] text-[#6e797b]">
                  Giá gốc
                </th>
                <th className="px-8 py-5 text-[11px] font-black uppercase tracking-[0.18em] text-[#6e797b]">
                  Trạng thái
                </th>
                <th className="px-8 py-5"></th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#bdc8cb]/10">
              {tours.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-8 py-12 text-center text-sm font-bold text-[#6e797b]"
                  >
                    Chưa gán tour cụ thể cho khuyến mãi này.
                  </td>
                </tr>
              ) : (
                tours.map((tour) => (
                  <tr key={tour.id} className="transition hover:bg-[#f8fbfc]">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#9defff]/45 text-[#00606c]">
                          <TicketPercent size={18} />
                        </div>
                        <div>
                          <p className="font-black text-[#181c1d]">
                            {tour.tour_name || "Tour chưa đặt tên"}
                          </p>
                          <p className="text-xs font-semibold text-[#6e797b]">
                            {tour.tour_type || "Tour du lịch"}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-8 py-5 font-mono text-sm font-black text-[#00606c]">
                      {tour.tour_code || "NO-CODE"}
                    </td>

                    <td className="px-8 py-5 font-black text-[#9b4500]">
                      {formatMoney(tour.base_price)}
                    </td>

                    <td className="px-8 py-5">
                      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">
                        {tour.status || "PUBLISHED"}
                      </span>
                    </td>

                    <td className="px-8 py-5 text-right">
                      <button className="rounded-full p-2 transition hover:bg-[#f1f4f5]">
                        <MoreVertical size={18} className="text-[#6e797b]" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  desc,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  desc: string;
  tone: "cyan" | "orange";
}) {
  return (
    <div className="rounded-[3rem] bg-white p-8 shadow-sm">
      <div
        className={`mb-5 flex h-13 w-13 items-center justify-center rounded-2xl ${
          tone === "cyan" ? "bg-[#9defff] text-[#00606c]" : "bg-[#ffdbc9] text-[#9b4500]"
        }`}
      >
        {icon}
      </div>
      <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-[#6e797b]">
        {label}
      </p>
      <p
        className={`text-4xl font-black tracking-tight ${
          tone === "cyan" ? "text-[#00606c]" : "text-[#9b4500]"
        }`}
      >
        {value}
      </p>
      <p className="mt-2 text-sm font-semibold text-[#6e797b]">{desc}</p>
    </div>
  );
}

function SectionTitle({
  icon,
  title,
  desc,
  orange,
  noMargin,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  orange?: boolean;
  noMargin?: boolean;
}) {
  return (
    <div className={`${noMargin ? "" : "mb-8"} flex items-center gap-4`}>
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
          orange ? "bg-[#ffdbc9] text-[#9b4500]" : "bg-[#9defff]/45 text-[#00606c]"
        }`}
      >
        {icon}
      </div>

      <div>
        <h2 className="text-xl font-black text-[#181c1d]">{title}</h2>
        <p className="text-sm text-[#6e797b]">{desc}</p>
      </div>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#6e797b]">
        {label}
      </p>
      <p className="text-lg font-black text-[#181c1d]">{value}</p>
    </div>
  );
}