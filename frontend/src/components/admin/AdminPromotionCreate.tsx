"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgePercent,
  CalendarDays,
  CheckCircle2,
  Coins,
  Gift,
  RefreshCcw,
  Save,
  Search,
  TicketPercent,
} from "lucide-react";

const API_BASE_URL = "/backend-api";

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

type Tour = {
  id: string | number;
  tour_code?: string | null;
  tour_name?: string | null;
  tour_type?: string | null;
  base_price?: string | number | null;
  status?: string | null;
};

type PromotionForm = {
  promotionCode: string;
  promotionName: string;
  promotionType: "PERCENT" | "AMOUNT";
  discountValue: string;
  minOrderAmount: string;
  maxDiscountAmount: string;
  usageLimit: string;
  startAt: string;
  endAt: string;
  status: "ACTIVE" | "INACTIVE";
  description: string;
  applyAllTours: boolean;
  tourIds: Array<string | number>;
};

function makeCode() {
  const random = Math.floor(1000 + Math.random() * 9000);
  return `KM${new Date().getFullYear()}${random}`;
}

function formatMoney(value?: string | number | null) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

function toDateTimeLocal(date: Date) {
  const cloned = new Date(date);
  cloned.setMinutes(cloned.getMinutes() - cloned.getTimezoneOffset());
  return cloned.toISOString().slice(0, 16);
}

function getInitialForm(): PromotionForm {
  return {
    promotionCode: "",
    promotionName: "",
    promotionType: "PERCENT",
    discountValue: "",
    minOrderAmount: "0",
    maxDiscountAmount: "",
    usageLimit: "",
    startAt: "",
    endAt: "",
    status: "ACTIVE",
    description: "",
    applyAllTours: true,
    tourIds: [],
  };
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
      status: item.status ?? "",
    }))
    .filter((item: Tour) => item.tour_name || item.tour_code);
}

export default function AdminPromotionCreate() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingTours, setLoadingTours] = useState(false);
  const [tourKeyword, setTourKeyword] = useState("");
  const [tours, setTours] = useState<Tour[]>([]);
  const [tourError, setTourError] = useState("");

  const [form, setForm] = useState<PromotionForm>(getInitialForm());

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
      console.error("LOAD_TOURS_API_ERROR:", res.status, json);
      setTours([]);
      setTourError(json?.message || "Không lấy được danh sách tour.");
      return;
    }

    const list = normalizeTours(json);
    setTours(list);

    if (list.length === 0) {
      setTourError("API đã trả về nhưng không có tour phù hợp.");
    }
  } catch (error) {
    console.error("LOAD_TOURS_ERROR:", error);
    setTours([]);
    setTourError("Không lấy được danh sách tour.");
  } finally {
    setLoadingTours(false);
  }
}

  async function handleSubmit() {
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

      const res = await fetch(`${API_BASE_URL}/admin/promotions`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          promotionCode: form.promotionCode,
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
        alert(json?.message || "Tạo khuyến mãi thất bại");
        return;
      }

      const created = Array.isArray(json?.data) ? json.data[0] : json?.data;
      const promotionId = created?.id;

      if (promotionId && !form.applyAllTours && form.tourIds.length > 0) {
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

        if (!tourRes.ok) {
          alert("Đã tạo khuyến mãi, nhưng chưa gán được danh sách tour.");
        }
      }

      alert("Tạo khuyến mãi thành công");
      safePush("/admin/promotions");
    } catch (error) {
      console.error("CREATE_PROMOTION_ERROR:", error);
      alert("Không thể tạo khuyến mãi");
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

  useEffect(() => {
    setMounted(true);

    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 7);

    setForm((prev) => ({
      ...prev,
      promotionCode: makeCode(),
      startAt: toDateTimeLocal(start),
      endAt: toDateTimeLocal(end),
    }));

    loadTours();
  }, []);

  const filteredTours = useMemo(() => {
    const keyword = tourKeyword.trim().toLowerCase();

    if (!keyword) return tours;

    return tours.filter((tour) => {
      return (
        String(tour.tour_name || "").toLowerCase().includes(keyword) ||
        String(tour.tour_code || "").toLowerCase().includes(keyword)
      );
    });
  }, [tourKeyword, tours]);

  const selectedTours = useMemo(() => {
    return tours.filter((tour) =>
      form.tourIds.some((id) => String(id) === String(tour.id))
    );
  }, [form.tourIds, tours]);

  return (
    <div className="space-y-8 pb-24">
      <section className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <button
            type="button"
            onClick={() => safePush("/admin/promotions")}
            className="mb-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-[#00606c] shadow-sm transition hover:bg-[#9defff]/30"
          >
            <ArrowLeft size={17} />
            Quay lại danh sách khuyến mãi
          </button>

          <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-[#00606c]/70">
            Promotion Management
          </p>

          <h1 className="text-4xl font-black tracking-tight text-[#00606c]">
            Tạo khuyến mãi mới
          </h1>

          <p className="mt-2 max-w-2xl text-[#3e494b]">
            Thiết lập chương trình ưu đãi, thời gian áp dụng, giới hạn sử dụng
            và phạm vi tour được áp dụng.
          </p>
        </div>

        <div className="rounded-[2rem] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ffdbc9] text-[#9b4500]">
              <Gift size={23} />
            </div>
            <div>
              <p className="text-xs font-black uppercase text-[#6e797b]">
                Trạng thái
              </p>
              <p className="font-black text-[#00606c]">Đang tạo chiến dịch</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
        <div className="space-y-8 xl:col-span-8">
          <section className="rounded-[3rem] bg-white p-8 shadow-sm">
            <SectionTitle
              icon={<TicketPercent size={22} />}
              title="Thông tin cơ bản"
              desc="Tên chương trình, mã khuyến mãi và mô tả hiển thị."
            />

            <div className="space-y-5">
              <Field label="Tên chương trình">
                <input
                  value={form.promotionName}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      promotionName: e.target.value,
                    }))
                  }
                  placeholder="VD: Siêu hội du lịch hè 2026"
                  className="w-full rounded-2xl bg-[#f1f4f5] px-5 py-4 text-sm font-bold text-[#181c1d] outline-none transition focus:bg-white focus:ring-4 focus:ring-[#00606c]/10"
                />
              </Field>

              <Field label="Mã khuyến mãi">
                <div className="flex gap-3">
                  <input
                    value={form.promotionCode}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        promotionCode: e.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="SUMMER26"
                    className="w-full rounded-2xl bg-[#f1f4f5] px-5 py-4 text-sm font-black uppercase tracking-widest text-[#181c1d] outline-none transition focus:bg-white focus:ring-4 focus:ring-[#00606c]/10"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        promotionCode: makeCode(),
                      }))
                    }
                    className="shrink-0 rounded-2xl bg-[#00606c] px-5 text-xs font-black uppercase tracking-widest text-white transition hover:scale-105"
                  >
                    Tự động tạo
                  </button>
                </div>
              </Field>

              <Field label="Mô tả ngắn">
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Nhập tóm tắt ưu đãi hiển thị cho khách hàng..."
                  className="w-full resize-none rounded-2xl bg-[#f1f4f5] px-5 py-4 text-sm font-semibold text-[#181c1d] outline-none transition focus:bg-white focus:ring-4 focus:ring-[#00606c]/10"
                />
              </Field>
            </div>
          </section>

          <section className="rounded-[3rem] bg-white p-8 shadow-sm">
            <SectionTitle
              icon={<Coins size={22} />}
              title="Hình thức ưu đãi"
              desc="Chọn kiểu giảm giá và điều kiện giá trị đơn hàng."
              orange
            />

            <div className="mb-7 grid grid-cols-1 gap-4 md:grid-cols-2">
              <DiscountTypeCard
                active={form.promotionType === "PERCENT"}
                title="Giảm theo phần trăm (%)"
                desc="Phù hợp chiến dịch lớn, nên có giới hạn giảm tối đa."
                onClick={() =>
                  setForm((prev) => ({ ...prev, promotionType: "PERCENT" }))
                }
              />

              <DiscountTypeCard
                active={form.promotionType === "AMOUNT"}
                title="Giảm tiền cố định (VNĐ)"
                desc="Dễ hiểu, kích thích khách hàng đặt tour nhanh."
                onClick={() =>
                  setForm((prev) => ({ ...prev, promotionType: "AMOUNT" }))
                }
              />
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <Field label="Giá trị giảm">
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
                    placeholder="0"
                    className="w-full rounded-2xl bg-[#f1f4f5] px-5 py-4 pr-16 text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-[#00606c]/10"
                  />
                  <span className="absolute right-5 top-1/2 -translate-y-1/2 text-xs font-black text-[#6e797b]">
                    {form.promotionType === "PERCENT" ? "%" : "VNĐ"}
                  </span>
                </div>
              </Field>

              <Field label="Giảm tối đa">
                <div className="relative">
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
                    className="w-full rounded-2xl bg-[#f1f4f5] px-5 py-4 pr-16 text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-[#00606c]/10"
                  />
                  <span className="absolute right-5 top-1/2 -translate-y-1/2 text-xs font-black text-[#6e797b]">
                    VNĐ
                  </span>
                </div>
              </Field>

              <Field label="Đơn hàng tối thiểu">
                <div className="relative">
                  <input
                    type="number"
                    value={form.minOrderAmount}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        minOrderAmount: e.target.value,
                      }))
                    }
                    placeholder="0"
                    className="w-full rounded-2xl bg-[#f1f4f5] px-5 py-4 pr-16 text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-[#00606c]/10"
                  />
                  <span className="absolute right-5 top-1/2 -translate-y-1/2 text-xs font-black text-[#6e797b]">
                    VNĐ
                  </span>
                </div>
              </Field>
            </div>
          </section>

          <section className="rounded-[3rem] bg-white p-8 shadow-sm">
            <SectionTitle
              icon={<CheckCircle2 size={22} />}
              title="Điều kiện áp dụng"
              desc="Chọn áp dụng cho toàn bộ tour hoặc chỉ một số tour cụ thể."
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <ScopeCard
                active={form.applyAllTours}
                title="Áp dụng cho tất cả Tour"
                desc="Khuyến mãi có thể dùng cho mọi tour đang bán."
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    applyAllTours: true,
                    tourIds: [],
                  }))
                }
              />

              <ScopeCard
                active={!form.applyAllTours}
                title="Chọn Tour cụ thể"
                desc="Chỉ các tour được chọn mới áp dụng mã này."
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    applyAllTours: false,
                  }))
                }
              />
            </div>

            {!form.applyAllTours && (
              <div className="mt-6 rounded-[2rem] border border-dashed border-[#bdc8cb] bg-[#f8fbfc] p-5">
                <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
                  <div>
                    <h4 className="font-black text-[#00606c]">
                      Danh sách tour áp dụng
                    </h4>
                    <p className="text-sm text-[#6e797b]">
                      Đã chọn {selectedTours.length} tour. Tổng dữ liệu:{" "}
                      {tours.length} tour.
                    </p>
                    {tourError && (
                      <p className="mt-1 text-xs font-bold text-[#ba1a1a]">
                        {tourError}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center rounded-full bg-white px-4 py-2 shadow-sm">
                    <Search size={17} className="mr-2 text-[#00606c]" />
                    <input
                      value={tourKeyword}
                      onChange={(e) => setTourKeyword(e.target.value)}
                      placeholder="Tìm tour..."
                      className="w-56 bg-transparent text-sm font-semibold outline-none"
                    />
                  </div>
                </div>

                <div className="max-h-80 space-y-3 overflow-y-auto pr-2">
                  {loadingTours ? (
                    <div className="rounded-2xl bg-white p-5 text-center text-sm font-bold text-[#00606c]">
                      Đang tải danh sách tour...
                    </div>
                  ) : filteredTours.length === 0 ? (
                    <div className="rounded-2xl bg-white p-5 text-center text-sm font-bold text-[#6e797b]">
                      Không có tour phù hợp.
                    </div>
                  ) : (
                    filteredTours.map((tour) => {
                      const checked = form.tourIds.some(
                        (id) => String(id) === String(tour.id)
                      );

                      return (
                        <button
                          key={tour.id}
                          type="button"
                          onClick={() => toggleTour(tour.id)}
                          className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition ${
                            checked
                              ? "border-[#00606c] bg-[#e5faff]"
                              : "border-transparent bg-white hover:border-[#9defff]"
                          }`}
                        >
                          <div>
                            <p className="font-black text-[#181c1d]">
                              {tour.tour_name || "Tour chưa đặt tên"}
                            </p>
                            <p className="text-xs font-semibold text-[#6e797b]">
                              {tour.tour_code || "NO-CODE"} •{" "}
                              {formatMoney(tour.base_price)} •{" "}
                              {tour.status || "-"}
                            </p>
                          </div>

                          <div
                            className={`flex h-7 w-7 items-center justify-center rounded-full border-2 ${
                              checked
                                ? "border-[#00606c] bg-[#00606c] text-white"
                                : "border-[#bdc8cb] text-transparent"
                            }`}
                          >
                            <CheckCircle2 size={16} />
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-8 xl:col-span-4">
          <section className="rounded-[3rem] bg-white p-8 shadow-sm">
            <SectionTitle
              icon={<CalendarDays size={22} />}
              title="Thời gian & giới hạn"
              desc="Khoảng thời gian hiệu lực và số lượng mã."
              small
            />

            <div className="space-y-5">
              <Field label="Ngày giờ bắt đầu">
                <input
                  type="datetime-local"
                  value={form.startAt}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, startAt: e.target.value }))
                  }
                  className="w-full rounded-2xl bg-[#f1f4f5] px-5 py-4 text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-[#00606c]/10"
                />
              </Field>

              <Field label="Ngày giờ kết thúc">
                <input
                  type="datetime-local"
                  value={form.endAt}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, endAt: e.target.value }))
                  }
                  className="w-full rounded-2xl bg-[#f1f4f5] px-5 py-4 text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-[#00606c]/10"
                />
              </Field>

              <div className="h-px bg-[#bdc8cb]/20" />

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
                  className="w-full rounded-2xl bg-[#f1f4f5] px-5 py-4 text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-[#00606c]/10"
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
                  className="w-full rounded-2xl bg-[#f1f4f5] px-5 py-4 text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-[#00606c]/10"
                >
                  <option value="ACTIVE">Kích hoạt ngay</option>
                  <option value="INACTIVE">Lưu tạm / chưa kích hoạt</option>
                </select>
              </Field>
            </div>
          </section>

          <section className="relative overflow-hidden rounded-[3rem] bg-[#00606c] p-8 text-white shadow-xl">
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
            <BadgePercent className="absolute bottom-4 right-4 h-28 w-28 text-white/10" />

            <div className="relative z-10">
              <p className="mb-2 text-xs font-black uppercase tracking-widest text-[#9defff]">
                Xem trước
              </p>

              <h3 className="mb-4 text-3xl font-black">
                {form.promotionName || "Tên chương trình"}
              </h3>

              <div className="mb-5 inline-flex rounded-full bg-white px-4 py-2 font-black text-[#00606c]">
                {form.promotionCode || "CODE"}
              </div>

              <div className="space-y-3 text-sm text-[#ddf9ff]">
                <p>
                  Giảm:{" "}
                  <span className="font-black text-white">
                    {form.discountValue || 0}
                    {form.promotionType === "PERCENT" ? "%" : "đ"}
                  </span>
                </p>
                <p>
                  Đơn tối thiểu:{" "}
                  <span className="font-black text-white">
                    {formatMoney(form.minOrderAmount)}
                  </span>
                </p>
                <p>
                  Phạm vi:{" "}
                  <span className="font-black text-white">
                    {form.applyAllTours
                      ? "Tất cả tour"
                      : `${selectedTours.length} tour`}
                  </span>
                </p>
              </div>
            </div>
          </section>
        </aside>
      </div>

      <div className="sticky bottom-4 z-30 flex justify-end gap-4 rounded-[2rem] border border-[#bdc8cb]/20 bg-white/90 p-4 shadow-2xl backdrop-blur-xl">
        <button
          type="button"
          onClick={() => safePush("/admin/promotions")}
          className="rounded-full px-8 py-3 font-black text-[#6e797b] transition hover:bg-[#f1f4f5]"
        >
          Hủy bỏ
        </button>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#9b4500] to-[#fc8a40] px-10 py-3 font-black text-white shadow-xl shadow-[#9b4500]/20 transition hover:scale-105 disabled:opacity-60"
        >
          {saving ? (
            <RefreshCcw size={18} className="animate-spin" />
          ) : (
            <Save size={18} />
          )}
          {saving ? "Đang tạo..." : "Tạo khuyến mãi"}
        </button>
      </div>
    </div>
  );
}

function SectionTitle({
  icon,
  title,
  desc,
  orange,
  small,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  orange?: boolean;
  small?: boolean;
}) {
  return (
    <div className="mb-7 flex items-center gap-4">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
          orange
            ? "bg-[#ffdbc9] text-[#9b4500]"
            : "bg-[#9defff]/45 text-[#00606c]"
        }`}
      >
        {icon}
      </div>
      <div>
        <h2
          className={`${small ? "text-lg" : "text-xl"} font-black text-[#181c1d]`}
        >
          {title}
        </h2>
        <p className="text-sm text-[#6e797b]">{desc}</p>
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
    <div>
      <label className="mb-2 block px-1 text-xs font-black uppercase tracking-[0.16em] text-[#6e797b]">
        {label}
      </label>
      {children}
    </div>
  );
}

function DiscountTypeCard({
  active,
  title,
  desc,
  onClick,
}: {
  active: boolean;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-start gap-4 rounded-2xl border-2 p-5 text-left transition ${
        active
          ? "border-[#00606c] bg-[#e5faff] shadow-sm"
          : "border-transparent bg-[#f1f4f5] hover:border-[#9defff]"
      }`}
    >
      <span
        className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
          active ? "border-[#00606c]" : "border-[#bdc8cb]"
        }`}
      >
        {active && <span className="h-2.5 w-2.5 rounded-full bg-[#00606c]" />}
      </span>

      <span>
        <span className="block font-black text-[#181c1d]">{title}</span>
        <span className="mt-1 block text-xs font-semibold leading-5 text-[#6e797b]">
          {desc}
        </span>
      </span>
    </button>
  );
}

function ScopeCard({
  active,
  title,
  desc,
  onClick,
}: {
  active: boolean;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border-2 p-5 text-left transition ${
        active
          ? "border-[#00606c] bg-[#e5faff]"
          : "border-transparent bg-[#f1f4f5] hover:border-[#9defff]"
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h4 className="font-black text-[#181c1d]">{title}</h4>
        <div
          className={`flex h-7 w-7 items-center justify-center rounded-full ${
            active ? "bg-[#00606c] text-white" : "bg-white text-[#bdc8cb]"
          }`}
        >
          <CheckCircle2 size={16} />
        </div>
      </div>
      <p className="text-sm leading-6 text-[#6e797b]">{desc}</p>
    </button>
  );
}