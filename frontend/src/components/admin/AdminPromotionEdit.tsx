"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  Coins,
  ImageIcon,
  Info,
  PackageOpen,
  RefreshCcw,
  Save,
  Search,
  TicketPercent,
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
  usage_limit?: string | number | null;
  used_count?: string | number | null;
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
  featured_image_url?: string | null;
  tour_image_url?: string | null;
  status?: string | null;
};

type PromotionForm = {
  promotionName: string;
  promotionCode: string;
  promotionType: "PERCENT" | "AMOUNT";
  discountValue: string;
  minOrderAmount: string;
  maxDiscountAmount: string;
  usageLimit: string;
  startAt: string;
  endAt: string;
  status: "ACTIVE" | "INACTIVE";
  description: string;
  tourIds: Array<string | number>;
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

function toDateTimeLocal(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());

  return date.toISOString().slice(0, 16);
}

function normalizeTours(json: any): Tour[] {
  const rawList = Array.isArray(json?.data)
    ? json.data
    : Array.isArray(json?.data?.tours)
    ? json.data.tours
    : Array.isArray(json?.tours)
    ? json.tours
    : Array.isArray(json)
    ? json
    : [];

  return rawList
    .filter((item: any) => item?.id)
    .map((item: any) => ({
      id: item.id,
      tour_code: item.tour_code ?? item.tourCode ?? item.code ?? "",
      tour_name: item.tour_name ?? item.tourName ?? item.name ?? "",
      tour_type: item.tour_type ?? item.tourType ?? "",
      base_price: item.base_price ?? item.basePrice ?? item.price ?? 0,
      featured_image_url:
        item.featured_image_url ?? item.featuredImageUrl ?? null,
      tour_image_url: item.tour_image_url ?? item.tourImageUrl ?? null,
      status: item.status ?? "",
    }))
    .filter((item: Tour) => item.tour_name || item.tour_code);
}

function normalizePromotionTours(list: any[]): Tour[] {
  return (list || []).map((item: any) => ({
    id: item.id,
    tour_code: item.tour_code ?? item.tourCode ?? "",
    tour_name: item.tour_name ?? item.tourName ?? "",
    tour_type: item.tour_type ?? item.tourType ?? "",
    base_price: item.base_price ?? item.basePrice ?? 0,
    featured_image_url:
      item.featured_image_url ?? item.featuredImageUrl ?? null,
    tour_image_url: item.tour_image_url ?? item.tourImageUrl ?? null,
    status: item.status ?? "",
  }));
}

export default function AdminPromotionEdit({
  promotionId,
}: {
  promotionId: string;
}) {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingTours, setLoadingTours] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tourKeyword, setTourKeyword] = useState("");
  const [tourError, setTourError] = useState("");
  const [allTours, setAllTours] = useState<Tour[]>([]);

  const [form, setForm] = useState<PromotionForm>({
    promotionName: "",
    promotionCode: "",
    promotionType: "AMOUNT",
    discountValue: "",
    minOrderAmount: "0",
    maxDiscountAmount: "",
    usageLimit: "",
    startAt: "",
    endAt: "",
    status: "ACTIVE",
    description: "",
    tourIds: [],
  });

  const [usedCount, setUsedCount] = useState(0);

  function safePush(path: string) {
    if (!mounted) return;
    router.push(path);
  }

  async function loadTours() {
    try {
      setLoadingTours(true);
      setTourError("");

      const res = await fetch(`${API_BASE_URL}/admin/tours`, {
        method: "GET",
        headers: getAuthHeaders(),
        cache: "no-store",
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setAllTours([]);
        setTourError(json?.message || "Không lấy được danh sách tour.");
        return;
      }

      const list = normalizeTours(json);
      setAllTours(list);

      if (list.length === 0) {
        setTourError("API đã trả về nhưng chưa có tour phù hợp.");
      }
    } catch (error) {
      console.error("LOAD_TOURS_ERROR:", error);
      setAllTours([]);
      setTourError("Không lấy được danh sách tour.");
    } finally {
      setLoadingTours(false);
    }
  }

  async function loadPromotionDetail() {
    try {
      setLoading(true);

      const res = await fetch(`${API_BASE_URL}/admin/promotions/${promotionId}`, {
        method: "GET",
        headers: getAuthHeaders(),
        cache: "no-store",
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        alert(json?.message || "Không lấy được chi tiết khuyến mãi");
        safePush("/admin/promotions");
        return;
      }

      const promotion: Promotion | undefined = json?.data?.promotion;
      const promotionTours = normalizePromotionTours(json?.data?.tours || []);

      if (!promotion) {
        alert("Không tìm thấy khuyến mãi");
        safePush("/admin/promotions");
        return;
      }

      setUsedCount(Number(promotion.used_count || 0));

      setForm({
        promotionName: promotion.promotion_name || "",
        promotionCode: promotion.promotion_code || "",
        promotionType:
          promotion.promotion_type === "PERCENT" ? "PERCENT" : "AMOUNT",
        discountValue: String(promotion.discount_value ?? ""),
        minOrderAmount: String(promotion.min_order_amount ?? "0"),
        maxDiscountAmount:
          promotion.max_discount_amount === null ||
          promotion.max_discount_amount === undefined
            ? ""
            : String(promotion.max_discount_amount),
        usageLimit:
          promotion.usage_limit === null || promotion.usage_limit === undefined
            ? ""
            : String(promotion.usage_limit),
        startAt: toDateTimeLocal(promotion.start_at),
        endAt: toDateTimeLocal(promotion.end_at),
        status: promotion.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
        description: promotion.description || "",
        tourIds: promotionTours.map((tour) => tour.id),
      });
    } catch (error) {
      console.error("LOAD_PROMOTION_DETAIL_ERROR:", error);
      alert("Không thể tải dữ liệu khuyến mãi");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!form.promotionName.trim()) {
      alert("Vui lòng nhập tên chương trình khuyến mãi");
      return;
    }

    if (!form.discountValue || Number(form.discountValue) <= 0) {
      alert("Vui lòng nhập giá trị giảm hợp lệ");
      return;
    }

    if (!form.startAt || !form.endAt) {
      alert("Vui lòng chọn thời gian áp dụng");
      return;
    }

    if (new Date(form.endAt) < new Date(form.startAt)) {
      alert("Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu");
      return;
    }

    try {
      setSaving(true);

      const res = await fetch(`${API_BASE_URL}/admin/promotions/${promotionId}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          promotionName: form.promotionName,
          promotionType: form.promotionType,
          discountValue: Number(form.discountValue || 0),
          minOrderAmount: Number(form.minOrderAmount || 0),
          maxDiscountAmount: form.maxDiscountAmount,
          usageLimit: form.usageLimit,
          startAt: form.startAt,
          endAt: form.endAt,
          status: form.status,
          description: form.description,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        alert(json?.message || "Cập nhật khuyến mãi thất bại");
        return;
      }

      const tourRes = await fetch(
        `${API_BASE_URL}/admin/promotions/${promotionId}/tours`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            tourIds: form.tourIds,
          }),
        }
      );

      const tourJson = await tourRes.json().catch(() => null);

      if (!tourRes.ok) {
        alert(tourJson?.message || "Đã lưu khuyến mãi nhưng chưa cập nhật được tour áp dụng");
        return;
      }

      alert("Cập nhật khuyến mãi thành công");
      safePush(`/admin/promotions/${promotionId}`);
    } catch (error) {
      console.error("UPDATE_PROMOTION_ERROR:", error);
      alert("Không thể cập nhật khuyến mãi");
    } finally {
      setSaving(false);
    }
  }

  function toggleTour(tourId: string | number) {
    setForm((prev) => {
      const exists = prev.tourIds.some((id) => String(id) === String(tourId));

      return {
        ...prev,
        tourIds: exists
          ? prev.tourIds.filter((id) => String(id) !== String(tourId))
          : [...prev.tourIds, tourId],
      };
    });
  }

  function selectAllTours() {
    setForm((prev) => ({
      ...prev,
      tourIds: allTours.map((tour) => tour.id),
    }));
  }

  useEffect(() => {
    setMounted(true);
    loadPromotionDetail();
    loadTours();
  }, [promotionId]);

  const filteredTours = useMemo(() => {
    const keyword = tourKeyword.trim().toLowerCase();

    if (!keyword) return allTours;

    return allTours.filter((tour) => {
      return (
        String(tour.tour_name || "").toLowerCase().includes(keyword) ||
        String(tour.tour_code || "").toLowerCase().includes(keyword)
      );
    });
  }, [tourKeyword, allTours]);

  const selectedTours = useMemo(() => {
    return allTours.filter((tour) =>
      form.tourIds.some((id) => String(id) === String(tour.id))
    );
  }, [form.tourIds, allTours]);

  const usageLimit = Number(form.usageLimit || 0);
  const usagePercent =
    usageLimit > 0 ? Math.min(Math.round((usedCount / usageLimit) * 100), 100) : 0;

  if (loading) {
    return (
      <div className="rounded-[2rem] bg-white p-10 text-center font-bold text-[#00606c]">
        Đang tải giao diện chỉnh sửa khuyến mãi...
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-24">
      <section className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <button
            type="button"
            onClick={() => safePush(`/admin/promotions/${promotionId}`)}
            className="mb-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-[#00606c] shadow-sm transition hover:bg-[#9defff]/30"
          >
            <ArrowLeft size={17} />
            Quay lại chi tiết khuyến mãi
          </button>

          <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-[#6e797b]">
            Quản lý chiến dịch
          </p>

          <h1 className="text-4xl font-black tracking-tight text-[#00606c]">
            Chỉnh sửa Khuyến mãi: {form.promotionCode || promotionId}
          </h1>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => safePush(`/admin/promotions/${promotionId}`)}
            className="rounded-full border-2 border-[#00606c]/20 px-8 py-3 font-black text-[#00606c] transition hover:bg-[#00606c]/5"
          >
            Hủy bỏ
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#9b4500] to-[#fc8a40] px-8 py-3 font-black text-white shadow-xl shadow-[#9b4500]/20 transition hover:scale-[1.02] disabled:opacity-60"
          >
            {saving ? (
              <RefreshCcw size={18} className="animate-spin" />
            ) : (
              <Save size={18} />
            )}
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </section>

      <div className="grid grid-cols-12 gap-8">
        <section className="col-span-12 rounded-[3rem] border border-[#bdc8cb]/15 bg-white p-8 shadow-sm lg:col-span-7">
          <SectionTitle
            icon={<Info size={22} />}
            title="Thông tin cơ bản"
          />

          <div className="space-y-6">
            <Field label="Tên chương trình">
              <input
                value={form.promotionName}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    promotionName: e.target.value,
                  }))
                }
                placeholder="Nhập tên khuyến mãi"
                className="input-ui"
              />
            </Field>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Field label="Mã khuyến mãi">
                <input
                  value={form.promotionCode}
                  disabled
                  className="input-ui cursor-not-allowed font-black uppercase tracking-widest text-[#00606c] opacity-80"
                />
              </Field>

              <Field label="Trạng thái">
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      status: e.target.value as "ACTIVE" | "INACTIVE",
                    }))
                  }
                  className="input-ui"
                >
                  <option value="ACTIVE">Đang hoạt động</option>
                  <option value="INACTIVE">Tạm dừng</option>
                </select>
              </Field>
            </div>

            <Field label="Mô tả chi tiết">
              <textarea
                rows={4}
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Nhập mô tả cho khách hàng..."
                className="textarea-ui"
              />
            </Field>
          </div>
        </section>

        <section className="relative col-span-12 overflow-hidden rounded-[3rem] border border-[#bdc8cb]/15 bg-white p-8 shadow-sm lg:col-span-5">
          <div className="absolute -right-16 -top-16 h-36 w-36 rounded-bl-full bg-[#00606c]/5" />

          <SectionTitle
            icon={<Coins size={22} />}
            title="Giá trị ưu đãi"
            orange
          />

          <div className="space-y-6">
            <div className="flex rounded-full bg-[#f1f4f5] p-1">
              <button
                type="button"
                onClick={() =>
                  setForm((prev) => ({ ...prev, promotionType: "AMOUNT" }))
                }
                className={`flex-1 rounded-full py-3 text-sm font-black transition ${
                  form.promotionType === "AMOUNT"
                    ? "bg-white text-[#00606c] shadow-sm"
                    : "text-[#6e797b] hover:text-[#00606c]"
                }`}
              >
                Số tiền cố định
              </button>

              <button
                type="button"
                onClick={() =>
                  setForm((prev) => ({ ...prev, promotionType: "PERCENT" }))
                }
                className={`flex-1 rounded-full py-3 text-sm font-black transition ${
                  form.promotionType === "PERCENT"
                    ? "bg-white text-[#00606c] shadow-sm"
                    : "text-[#6e797b] hover:text-[#00606c]"
                }`}
              >
                Phần trăm (%)
              </button>
            </div>

            <Field label="Giá trị giảm giá">
              <div className="relative">
                <input
                  type="number"
                  value={form.discountValue}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      discountValue: e.target.value,
                    }))
                  }
                  className="input-ui pr-16 text-2xl font-black text-[#9b4500]"
                />
                <span className="absolute right-5 top-1/2 -translate-y-1/2 font-black text-[#6e797b]">
                  {form.promotionType === "PERCENT" ? "%" : "VNĐ"}
                </span>
              </div>
            </Field>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Giảm tối đa">
                <input
                  type="number"
                  value={form.maxDiscountAmount}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      maxDiscountAmount: e.target.value,
                    }))
                  }
                  placeholder="Không giới hạn"
                  className="input-ui"
                />
              </Field>

              <Field label="Đơn tối thiểu">
                <input
                  type="number"
                  value={form.minOrderAmount}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      minOrderAmount: e.target.value,
                    }))
                  }
                  className="input-ui"
                />
              </Field>
            </div>
          </div>
        </section>

        <section className="col-span-12 rounded-[3rem] border border-[#bdc8cb]/15 bg-white p-8 shadow-sm lg:col-span-4">
          <SectionTitle
            icon={<CalendarDays size={22} />}
            title="Thời gian & Giới hạn"
            teal
          />

          <div className="space-y-6">
            <Field label="Ngày bắt đầu">
              <input
                type="datetime-local"
                value={form.startAt}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, startAt: e.target.value }))
                }
                className="input-ui"
              />
            </Field>

            <Field label="Ngày kết thúc">
              <input
                type="datetime-local"
                value={form.endAt}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, endAt: e.target.value }))
                }
                className="input-ui"
              />
            </Field>

            <div className="border-t border-[#bdc8cb]/15 pt-4">
              <div className="mb-2 flex justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-[#6e797b]">
                  Số lượng đã dùng
                </span>
                <span className="text-xs font-black text-[#00606c]">
                  {usedCount} / {form.usageLimit || "∞"}
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-[#f1f4f5]">
                <div
                  className="h-full rounded-full bg-[#00606c]"
                  style={{
                    width: usageLimit > 0 ? `${usagePercent}%` : "100%",
                  }}
                />
              </div>
            </div>

            <Field label="Tổng số lượng mã">
              <input
                type="number"
                value={form.usageLimit}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    usageLimit: e.target.value,
                  }))
                }
                placeholder="Không giới hạn"
                className="input-ui"
              />
            </Field>
          </div>
        </section>

        <section className="col-span-12 rounded-[3rem] border border-[#bdc8cb]/15 bg-white p-8 shadow-sm lg:col-span-8">
          <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <SectionTitle
              icon={<PackageOpen size={22} />}
              title="Điều kiện áp dụng"
              noMargin
            />

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={selectAllTours}
                className="inline-flex items-center gap-2 rounded-full bg-[#9defff]/35 px-5 py-2.5 text-sm font-black text-[#00606c] transition hover:bg-[#9defff]/60"
              >
                <CheckCircle2 size={16} />
                Chọn tất cả tour
              </button>

              <div className="flex items-center rounded-full bg-[#f1f4f5] px-4 py-2">
                <Search size={17} className="mr-2 text-[#00606c]" />
                <input
                  value={tourKeyword}
                  onChange={(e) => setTourKeyword(e.target.value)}
                  placeholder="Tìm tour..."
                  className="w-56 bg-transparent text-sm font-semibold outline-none"
                />
              </div>
            </div>
          </div>

          <div className="mb-4 text-sm font-semibold text-[#6e797b]">
            Đã chọn{" "}
            <span className="font-black text-[#00606c]">
              {selectedTours.length}
            </span>{" "}
            / {allTours.length} tour.
            {tourError && (
              <span className="ml-2 font-bold text-[#ba1a1a]">{tourError}</span>
            )}
          </div>

          <div className="max-h-[520px] space-y-4 overflow-y-auto pr-2">
            {loadingTours ? (
              <div className="rounded-2xl bg-[#f1f4f5] p-8 text-center font-bold text-[#00606c]">
                Đang tải danh sách tour...
              </div>
            ) : filteredTours.length === 0 ? (
              <div className="rounded-2xl bg-[#f1f4f5] p-8 text-center font-bold text-[#6e797b]">
                Không có tour phù hợp.
              </div>
            ) : (
              filteredTours.map((tour) => {
                const selected = form.tourIds.some(
                  (id) => String(id) === String(tour.id)
                );

                const image =
                  tour.featured_image_url ||
                  tour.tour_image_url ||
                  "/images/tour-placeholder.jpg";

                return (
                  <button
                    key={tour.id}
                    type="button"
                    onClick={() => toggleTour(tour.id)}
                    className={`group flex w-full items-center gap-4 rounded-2xl p-4 text-left transition ${
                      selected
                        ? "bg-[#e5faff] ring-2 ring-[#00606c]"
                        : "bg-[#f1f4f5] hover:bg-[#e5e9ea]"
                    }`}
                  >
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#dfe3e4]">
                      {image ? (
                        <img
                          src={image}
                          alt={tour.tour_name || "Ảnh tour"}
                          className={`h-full w-full object-cover ${
                            selected ? "" : "grayscale-[0.2]"
                          }`}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[#00606c]">
                          <ImageIcon size={20} />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h4 className="truncate font-black text-[#181c1d]">
                        {tour.tour_name || "Tour chưa đặt tên"}
                      </h4>
                      <p className="text-xs font-semibold text-[#6e797b]">
                        Mã: {tour.tour_code || "NO-CODE"}
                      </p>
                    </div>

                    <div className="hidden text-right md:block">
                      <p
                        className={`text-sm font-black ${
                          selected ? "text-[#00606c]" : "text-[#6e797b]"
                        }`}
                      >
                        {formatMoney(tour.base_price)}
                      </p>
                      <p className="text-[10px] font-black uppercase tracking-wider text-[#6e797b]">
                        Giá gốc
                      </p>
                    </div>

                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${
                        selected
                          ? "border-[#00606c] bg-[#00606c] text-white"
                          : "border-[#bdc8cb] text-transparent"
                      }`}
                    >
                      <Check size={16} />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>
      </div>

      <div className="sticky bottom-4 z-30 flex justify-end gap-4 rounded-[2rem] border border-[#bdc8cb]/20 bg-white/90 p-4 shadow-2xl backdrop-blur-xl">
        <button
          type="button"
          onClick={() => safePush(`/admin/promotions/${promotionId}`)}
          className="rounded-full px-8 py-3 font-black text-[#00606c] transition hover:bg-[#f1f4f5]"
        >
          Hủy bỏ
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#9b4500] to-[#fc8a40] px-10 py-3 font-black text-white shadow-xl shadow-[#9b4500]/20 transition hover:scale-105 disabled:opacity-60"
        >
          {saving ? (
            <RefreshCcw size={18} className="animate-spin" />
          ) : (
            <Save size={18} />
          )}
          {saving ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
      </div>
    </div>
  );
}

function SectionTitle({
  icon,
  title,
  orange,
  teal,
  noMargin,
}: {
  icon: React.ReactNode;
  title: string;
  orange?: boolean;
  teal?: boolean;
  noMargin?: boolean;
}) {
  return (
    <div className={`${noMargin ? "" : "mb-8"} flex items-center gap-3`}>
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
          orange
            ? "bg-[#ffdbc9] text-[#9b4500]"
            : teal
            ? "bg-[#b3ebff] text-[#006074]"
            : "bg-[#9defff]/45 text-[#00606c]"
        }`}
      >
        {icon}
      </div>
      <h2 className="text-xl font-black text-[#181c1d]">{title}</h2>
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
    <div>
      <label className="mb-2 block text-xs font-black uppercase tracking-widest text-[#6e797b]">
        {label}
      </label>
      {children}
    </div>
  );
}