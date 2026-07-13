"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Eye,
  Bell,
  Info,
  Edit3,
  ImagePlus,
  UploadCloud,
  Lightbulb,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  CalendarDays,
} from "lucide-react";

const API_BASE_URL = "/backend-api";

type TourStatus = "DRAFT" | "PUBLISHED" | "STOPPED";
type TourType = "DOMESTIC" | "INTERNATIONAL";
type BookingStatus = "OPEN" | "CLOSED" | "FULL";

type TourActivity = {
  activityTime: string;
  activityTitle: string;
  locationName: string;
  description: string;
  sortOrder: number;
};

type TourItineraryDay = {
  dayNo: number;
  title: string;
  description: string;
  overnightLocation: string;
  activities: TourActivity[];
};

type TourDeparture = {
  departureCode: string;
  startDate: string;
  endDate: string;
  maxSeats: number;
  availableSeats: number;
  bookingStatus: BookingStatus;
  guideId: number | null;
  notes: string;
};

type TourForm = {
  tourCode: string;
  tourName: string;
  slug: string;
  tourType: TourType;
  durationDays: number;
  durationNights: number;
  basePrice: number;
  childPrice: number;
  maxCapacity: number;
  shortDescription: string;
  description: string;
  featuredImageUrl: string;
  galleryImages: string[];
  itineraryDays: TourItineraryDay[];
  departures: TourDeparture[];
  includedItems: string[];
  excludedItems: string[];
  status: TourStatus;
  isFeatured: boolean;
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

function toNumber(value: unknown) {
  return Number(value || 0);
}

function toDateInputValue(value: unknown) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function splitServiceText(value: unknown) {
  if (!value) return [];

  return String(value)
    .split(/;|\n/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function mapTourToForm(data: any): TourForm {
  return {
    tourCode: data?.tour_code || "",
    tourName: data?.tour_name || "",
    slug: data?.slug || "",
    tourType: data?.tour_type || "DOMESTIC",
    durationDays: toNumber(data?.duration_days) || 1,
    durationNights: toNumber(data?.duration_nights),
    basePrice: toNumber(data?.base_price),
    childPrice: toNumber(data?.child_price),
    maxCapacity: toNumber(data?.max_capacity) || 1,
    shortDescription: data?.short_description || "",
    description: data?.description || "",
    featuredImageUrl: data?.featured_image_url || "",
    galleryImages:
      data?.tour_images
        ?.filter((item: any) => !item.is_cover)
        ?.map((item: any) => item.image_url) || [],
    itineraryDays:
      data?.itineraries?.[0]?.itinerary_days?.map((day: any) => ({
        dayNo: Number(day.day_no || 1),
        title: day.title || "",
        description: day.description || "",
        overnightLocation: day.overnight_location || "",
        activities:
          day.itinerary_activities?.map((activity: any) => ({
            activityTime: activity.activity_time || "",
            activityTitle: activity.activity_title || "",
            locationName: activity.location_name || "",
            description: activity.description || "",
            sortOrder: Number(activity.sort_order || 1),
          })) || [],
      })) || [],
    departures:
      data?.departure_schedules?.map((item: any) => ({
        departureCode: item.departure_code || "",
        startDate: toDateInputValue(item.start_date),
        endDate: toDateInputValue(item.end_date),
        maxSeats: Number(item.max_seats || 1),
        availableSeats: Number(item.available_seats || item.max_seats || 1),
        bookingStatus: item.booking_status || "OPEN",
        guideId: item.guide_id || null,
        notes: item.notes || "",
      })) || [],
    includedItems: splitServiceText(data?.included_services),
    excludedItems: splitServiceText(data?.excluded_services),
    status: data?.status || "DRAFT",
    isFeatured: Boolean(data?.is_featured),
  };
}

function ServiceList({
  title,
  icon,
  items,
  placeholder,
  onAdd,
  onChange,
  onRemove,
}: {
  title: string;
  icon: "included" | "excluded";
  items: string[];
  placeholder: string;
  onAdd: () => void;
  onChange: (index: number, value: string) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="rounded-[2rem] bg-[#f6fafb] p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {icon === "included" ? (
            <CheckCircle2 size={18} className="text-[#007B8A]" />
          ) : (
            <XCircle size={18} className="text-[#ba1a1a]" />
          )}

          <h3 className="font-bold text-[#181c1d]">{title}</h3>
        </div>

        <button
          type="button"
          onClick={onAdd}
          className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#00606c] shadow-sm hover:bg-[#e5e9ea]"
        >
          + Thêm
        </button>
      </div>

      <div className="space-y-3">
        {items.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[#bdc8cb] bg-white p-4 text-center text-xs text-[#6e797b]">
            Chưa có dòng nào.
          </p>
        ) : (
          items.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                value={item}
                onChange={(e) => onChange(index, e.target.value)}
                placeholder={placeholder}
                className="w-full rounded-full border-none bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#007B8A]/20"
              />

              <button
                type="button"
                onClick={() => onRemove(index)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ffdad6] text-[#93000a] hover:bg-[#ffc7c0]"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function AdminTourEdit() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const tourId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [form, setForm] = useState<TourForm>({
    tourCode: "",
    tourName: "",
    slug: "",
    tourType: "DOMESTIC",
    durationDays: 1,
    durationNights: 0,
    basePrice: 0,
    childPrice: 0,
    maxCapacity: 1,
    shortDescription: "",
    description: "",
    featuredImageUrl: "",
    galleryImages: [],
    itineraryDays: [],
    departures: [],
    includedItems: ["Dịch vụ theo chương trình"],
    excludedItems: ["Chi phí cá nhân"],
    status: "DRAFT",
    isFeatured: false,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function fetchTourDetail() {
    try {
      setLoading(true);

      const res = await fetch(`${API_BASE_URL}/admin/tours/${tourId}`, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("GET tour detail error:", res.status, text);
        alert("Không thể lấy chi tiết tour");
        return;
      }

      const json = await res.json();
      setForm(mapTourToForm(json.data));
    } catch (error) {
      console.error("fetchTourDetail error:", error);
      alert("Không thể kết nối tới backend");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!tourId || tourId === "undefined") return;

    fetchTourDetail();
  }, [tourId]);

  function updateField<K extends keyof TourForm>(key: K, value: TourForm[K]) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function handleImageUpload(file?: File) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Vui lòng chọn đúng file hình ảnh");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      updateField("featuredImageUrl", String(reader.result || ""));
    };

    reader.readAsDataURL(file);
  }

  function handleGalleryUpload(file?: File) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Vui lòng chọn đúng file hình ảnh");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setForm((prev) => ({
        ...prev,
        galleryImages: [...prev.galleryImages, String(reader.result || "")],
      }));
    };

    reader.readAsDataURL(file);
  }

  function removeGalleryImage(index: number) {
    setForm((prev) => ({
      ...prev,
      galleryImages: prev.galleryImages.filter((_, i) => i !== index),
    }));
  }

  function addItineraryDay() {
    setForm((prev) => ({
      ...prev,
      itineraryDays: [
        ...prev.itineraryDays,
        {
          dayNo: prev.itineraryDays.length + 1,
          title: `Ngày ${prev.itineraryDays.length + 1}`,
          description: "",
          overnightLocation: "",
          activities: [],
        },
      ],
    }));
  }

  function removeItineraryDay(index: number) {
    setForm((prev) => ({
      ...prev,
      itineraryDays: prev.itineraryDays
        .filter((_, i) => i !== index)
        .map((day, i) => ({
          ...day,
          dayNo: i + 1,
        })),
    }));
  }

  function updateItineraryDay(
    index: number,
    key: keyof TourItineraryDay,
    value: string | number | TourActivity[]
  ) {
    setForm((prev) => ({
      ...prev,
      itineraryDays: prev.itineraryDays.map((day, i) =>
        i === index ? { ...day, [key]: value } : day
      ),
    }));
  }

  function addActivity(dayIndex: number) {
    setForm((prev) => ({
      ...prev,
      itineraryDays: prev.itineraryDays.map((day, i) =>
        i === dayIndex
          ? {
              ...day,
              activities: [
                ...day.activities,
                {
                  activityTime: "",
                  activityTitle: "",
                  locationName: "",
                  description: "",
                  sortOrder: day.activities.length + 1,
                },
              ],
            }
          : day
      ),
    }));
  }

  function updateActivity(
    dayIndex: number,
    activityIndex: number,
    key: keyof TourActivity,
    value: string | number
  ) {
    setForm((prev) => ({
      ...prev,
      itineraryDays: prev.itineraryDays.map((day, i) =>
        i === dayIndex
          ? {
              ...day,
              activities: day.activities.map((activity, j) =>
                j === activityIndex ? { ...activity, [key]: value } : activity
              ),
            }
          : day
      ),
    }));
  }

  function removeActivity(dayIndex: number, activityIndex: number) {
    setForm((prev) => ({
      ...prev,
      itineraryDays: prev.itineraryDays.map((day, i) =>
        i === dayIndex
          ? {
              ...day,
              activities: day.activities
                .filter((_, j) => j !== activityIndex)
                .map((activity, j) => ({
                  ...activity,
                  sortOrder: j + 1,
                })),
            }
          : day
      ),
    }));
  }

  function addDeparture() {
    setForm((prev) => ({
      ...prev,
      departures: [
        ...prev.departures,
        {
          departureCode: "",
          startDate: "",
          endDate: "",
          maxSeats: prev.maxCapacity || 1,
          availableSeats: prev.maxCapacity || 1,
          bookingStatus: "OPEN",
          guideId: null,
          notes: "",
        },
      ],
    }));
  }

  function updateDeparture<K extends keyof TourDeparture>(
    index: number,
    key: K,
    value: TourDeparture[K]
  ) {
    setForm((prev) => ({
      ...prev,
      departures: prev.departures.map((item, i) =>
        i === index ? { ...item, [key]: value } : item
      ),
    }));
  }

  function removeDeparture(index: number) {
    setForm((prev) => ({
      ...prev,
      departures: prev.departures.filter((_, i) => i !== index),
    }));
  }

  function addServiceItem(key: "includedItems" | "excludedItems") {
    setForm((prev) => ({
      ...prev,
      [key]: [...prev[key], ""],
    }));
  }

  function updateServiceItem(
    key: "includedItems" | "excludedItems",
    index: number,
    value: string
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].map((item, i) => (i === index ? value : item)),
    }));
  }

  function removeServiceItem(
    key: "includedItems" | "excludedItems",
    index: number
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].filter((_, i) => i !== index),
    }));
  }

  async function handleSave(status?: TourStatus) {
    try {
      setSaving(true);

      const payload = {
        tourCode: form.tourCode,
        tourName: form.tourName,
        slug: form.slug || null,
        tourType: form.tourType,
        durationDays: Number(form.durationDays),
        durationNights: Number(form.durationNights),
        basePrice: Number(form.basePrice),
        childPrice: Number(form.childPrice),
        maxCapacity: Number(form.maxCapacity),
        shortDescription: form.shortDescription || null,
        description: form.description || null,
        featuredImageUrl: form.featuredImageUrl || null,
        galleryImages: form.galleryImages,
        itineraryDays: form.itineraryDays,
        departures: form.departures,
        includedItems: form.includedItems
          .map((item) => item.trim())
          .filter(Boolean),
        excludedItems: form.excludedItems
          .map((item) => item.trim())
          .filter(Boolean),
        status: status || form.status,
        isFeatured: form.isFeatured,
      };

      const res = await fetch(`${API_BASE_URL}/admin/tours/${tourId}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        alert(json?.message || "Cập nhật tour thất bại");
        return;
      }

      sessionStorage.setItem(
        "tour_updated",
        JSON.stringify({
          id: tourId,
          name: form.tourName,
        })
      );

      router.push("/admin/tours");
    } catch (error) {
      console.error("update tour error:", error);
      alert("Không thể cập nhật tour");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-[3rem] bg-white p-10 text-center text-sm text-[#6e797b]">
        Đang tải thông tin tour...
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col justify-between gap-5 rounded-[3rem] bg-white/70 px-8 py-5 shadow-[0_16px_32px_rgba(0,96,108,0.08)] backdrop-blur-xl xl:flex-row xl:items-center">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/admin/tours")}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f1f4f5] text-[#3e494b] transition hover:bg-[#dfe3e4]"
          >
            <ArrowLeft size={18} />
          </button>

          <div>
            <div className="flex items-center gap-2 text-sm text-[#6e797b]">
              <span>Tour Editor</span>
              <span>/</span>
              <span>Chỉnh sửa Tour</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#00606c]">
              {form.tourName || "Chỉnh sửa tour"}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => handleSave("DRAFT")}
            disabled={saving}
            className="rounded-full border border-[#bdc8cb] px-6 py-2 text-sm font-semibold text-[#3e494b] transition hover:bg-[#f1f4f5] disabled:opacity-60"
          >
            Lưu nháp
          </button>

          <button
            onClick={() => handleSave("PUBLISHED")}
            disabled={saving}
            className="flex items-center gap-2 rounded-full bg-[#007B8A] px-6 py-2 text-sm font-bold text-white shadow-lg shadow-cyan-900/10 transition hover:bg-[#00606c] disabled:opacity-60"
          >
            <Save size={16} />
            Lưu Tour
          </button>

          <div className="ml-0 flex items-center gap-2 border-[#bdc8cb]/50 xl:ml-3 xl:border-l xl:pl-4">
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full text-[#3e494b] transition hover:bg-[#f1f4f5]"
            >
              <Eye size={18} />
            </button>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full text-[#3e494b] transition hover:bg-[#f1f4f5]"
            >
              <Bell size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
        <div className="space-y-8 xl:col-span-2">
          <section className="space-y-6 rounded-[3rem] bg-white p-8 shadow-sm">
            <div className="mb-2 flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#9defff] text-[#00606c]">
                <Info size={16} />
              </span>
              <h2 className="text-xl font-bold tracking-tight text-[#181c1d]">
                Thông tin cơ bản
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="ml-1 text-xs font-bold uppercase tracking-wider text-[#3e494b]/80">
                  Mã Tour
                </label>
                <input
                  value={form.tourCode}
                  onChange={(e) => updateField("tourCode", e.target.value)}
                  className="w-full rounded-full border-none bg-[#ebeeef] px-6 py-3 font-medium text-[#3e494b] outline-none focus:ring-2 focus:ring-[#007B8A]/20"
                />
              </div>

              <div className="space-y-2">
                <label className="ml-1 text-xs font-bold uppercase tracking-wider text-[#3e494b]/80">
                  Loại Tour
                </label>
                <select
                  value={form.tourType}
                  onChange={(e) =>
                    updateField("tourType", e.target.value as TourType)
                  }
                  className="w-full rounded-full border-none bg-[#f1f4f5] px-6 py-3 text-[#181c1d] outline-none focus:ring-2 focus:ring-[#007B8A]/20"
                >
                  <option value="DOMESTIC">Trong nước</option>
                  <option value="INTERNATIONAL">Quốc tế</option>
                </select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="ml-1 text-xs font-bold uppercase tracking-wider text-[#3e494b]/80">
                  Tên Tour
                </label>
                <input
                  value={form.tourName}
                  onChange={(e) => updateField("tourName", e.target.value)}
                  placeholder="Nhập tên tour du lịch..."
                  className="w-full rounded-full border-none bg-[#f1f4f5] px-6 py-3 text-[#181c1d] outline-none focus:ring-2 focus:ring-[#007B8A]/20"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="ml-1 text-xs font-bold uppercase tracking-wider text-[#3e494b]/80">
                  Slug
                </label>
                <div className="flex items-center rounded-full bg-[#f1f4f5] px-6 py-3">
                  <span className="text-sm text-[#6e797b]">
                    chilltrip.vn/tour/
                  </span>
                  <input
                    value={form.slug}
                    onChange={(e) => updateField("slug", e.target.value)}
                    className="ml-1 flex-1 border-none bg-transparent p-0 text-[#181c1d] outline-none focus:ring-0"
                  />
                </div>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <section className="space-y-6 rounded-[3rem] bg-white p-8 shadow-sm">
              <h3 className="text-lg font-bold">Hành trình & Vận chuyển</h3>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="ml-1 text-xs font-bold uppercase tracking-wider text-[#3e494b]/80">
                      Số ngày
                    </label>
                    <input
                      type="number"
                      value={form.durationDays}
                      onChange={(e) =>
                        updateField("durationDays", Number(e.target.value))
                      }
                      className="w-full rounded-full border-none bg-[#f1f4f5] px-6 py-3 outline-none focus:ring-2 focus:ring-[#007B8A]/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="ml-1 text-xs font-bold uppercase tracking-wider text-[#3e494b]/80">
                      Số đêm
                    </label>
                    <input
                      type="number"
                      value={form.durationNights}
                      onChange={(e) =>
                        updateField("durationNights", Number(e.target.value))
                      }
                      className="w-full rounded-full border-none bg-[#f1f4f5] px-6 py-3 outline-none focus:ring-2 focus:ring-[#007B8A]/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="ml-1 text-xs font-bold uppercase tracking-wider text-[#3e494b]/80">
                    Sức chứa tối đa
                  </label>
                  <input
                    type="number"
                    value={form.maxCapacity}
                    onChange={(e) =>
                      updateField("maxCapacity", Number(e.target.value))
                    }
                    className="w-full rounded-full border-none bg-[#f1f4f5] px-6 py-3 outline-none focus:ring-2 focus:ring-[#007B8A]/20"
                  />
                </div>
              </div>
            </section>

            <section className="space-y-6 rounded-[3rem] border-t-4 border-[#9b4500]/20 bg-white p-8 shadow-sm">
              <h3 className="text-lg font-bold text-[#9b4500]">
                Chi phí & Chính sách
              </h3>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="ml-1 text-xs font-bold uppercase tracking-wider text-[#3e494b]/80">
                    Giá cơ bản
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={form.basePrice}
                      onChange={(e) =>
                        updateField("basePrice", Number(e.target.value))
                      }
                      className="w-full rounded-full border-none bg-[#f1f4f5] px-6 py-3 pr-16 font-bold text-[#00606c] outline-none focus:ring-2 focus:ring-[#007B8A]/20"
                    />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-xs font-bold text-[#3e494b]">
                      VNĐ
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="ml-1 text-xs font-bold uppercase tracking-wider text-[#3e494b]/80">
                    Giá trẻ em
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={form.childPrice}
                      onChange={(e) =>
                        updateField("childPrice", Number(e.target.value))
                      }
                      className="w-full rounded-full border-none bg-[#f1f4f5] px-6 py-3 pr-16 font-bold text-[#00606c] outline-none focus:ring-2 focus:ring-[#007B8A]/20"
                    />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-xs font-bold text-[#3e494b]">
                      VNĐ
                    </span>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <section className="space-y-6 rounded-[3rem] bg-white p-8 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-[#181c1d]">
                  Ngày khởi hành
                </h2>
                <p className="mt-1 text-sm text-[#6e797b]">
                  Quản lý ngày đi, ngày về và số chỗ mở bán.
                </p>
              </div>

              <button
                type="button"
                onClick={addDeparture}
                className="flex items-center gap-2 rounded-full bg-[#007B8A] px-5 py-2 text-sm font-bold text-white hover:bg-[#00606c]"
              >
                <CalendarDays size={16} />
                Thêm ngày
              </button>
            </div>

            {form.departures.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-[#bdc8cb] bg-[#f1f4f5] p-8 text-center text-sm text-[#6e797b]">
                Chưa có ngày khởi hành. Nhấn “Thêm ngày” để tạo lịch mở bán.
              </div>
            ) : (
              <div className="space-y-4">
                {form.departures.map((item, index) => (
                  <div
                    key={index}
                    className="rounded-[2rem] border border-[#bdc8cb]/40 bg-[#f6fafb] p-5"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="font-bold text-[#00606c]">
                        Khởi hành {index + 1}
                      </h3>

                      <button
                        type="button"
                        onClick={() => removeDeparture(index)}
                        className="rounded-full bg-[#ffdad6] px-3 py-1 text-xs font-bold text-[#93000a]"
                      >
                        Xóa
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <input
                        value={item.departureCode}
                        onChange={(e) =>
                          updateDeparture(
                            index,
                            "departureCode",
                            e.target.value
                          )
                        }
                        placeholder="Mã khởi hành, ví dụ: DEP-HL-001"
                        className="rounded-full border-none bg-white px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-[#007B8A]/20 md:col-span-2"
                      />

                      <div>
                        <label className="mb-2 ml-2 block text-[10px] font-bold uppercase tracking-widest text-[#3e494b]">
                          Ngày đi
                        </label>
                        <input
                          type="date"
                          value={item.startDate}
                          onChange={(e) =>
                            updateDeparture(index, "startDate", e.target.value)
                          }
                          className="w-full rounded-full border-none bg-white px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-[#007B8A]/20"
                        />
                      </div>

                      <div>
                        <label className="mb-2 ml-2 block text-[10px] font-bold uppercase tracking-widest text-[#3e494b]">
                          Ngày về
                        </label>
                        <input
                          type="date"
                          value={item.endDate}
                          onChange={(e) =>
                            updateDeparture(index, "endDate", e.target.value)
                          }
                          className="w-full rounded-full border-none bg-white px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-[#007B8A]/20"
                        />
                      </div>

                      <input
                        type="number"
                        value={item.maxSeats}
                        onChange={(e) => {
                          const nextMaxSeats = Number(e.target.value);
                          updateDeparture(index, "maxSeats", nextMaxSeats);
                          updateDeparture(
                            index,
                            "availableSeats",
                            nextMaxSeats
                          );
                        }}
                        placeholder="Tổng số chỗ"
                        className="rounded-full border-none bg-white px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-[#007B8A]/20"
                      />

                      <select
                        value={item.bookingStatus}
                        onChange={(e) =>
                          updateDeparture(
                            index,
                            "bookingStatus",
                            e.target.value as BookingStatus
                          )
                        }
                        className="rounded-full border-none bg-white px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-[#007B8A]/20"
                      >
                        <option value="OPEN">Đang mở bán</option>
                        <option value="CLOSED">Đã đóng</option>
                        <option value="FULL">Đã đủ chỗ</option>
                      </select>

                      <input
                        value={item.notes}
                        onChange={(e) =>
                          updateDeparture(index, "notes", e.target.value)
                        }
                        placeholder="Ghi chú ngày khởi hành"
                        className="rounded-full border-none bg-white px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-[#007B8A]/20 md:col-span-2"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-6 rounded-[3rem] bg-white p-8 shadow-sm">
            <h2 className="text-xl font-bold tracking-tight text-[#181c1d]">
              Dịch vụ bao gồm / Không bao gồm
            </h2>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <ServiceList
                title="Bao gồm"
                icon="included"
                items={form.includedItems}
                placeholder="Ví dụ: Xe đưa đón, vé tham quan..."
                onAdd={() => addServiceItem("includedItems")}
                onChange={(index, value) =>
                  updateServiceItem("includedItems", index, value)
                }
                onRemove={(index) => removeServiceItem("includedItems", index)}
              />

              <ServiceList
                title="Không bao gồm"
                icon="excluded"
                items={form.excludedItems}
                placeholder="Ví dụ: Chi phí cá nhân, VAT..."
                onAdd={() => addServiceItem("excludedItems")}
                onChange={(index, value) =>
                  updateServiceItem("excludedItems", index, value)
                }
                onRemove={(index) => removeServiceItem("excludedItems", index)}
              />
            </div>
          </section>

          <section className="space-y-8 rounded-[3rem] bg-white p-8 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#b3ebff] text-[#006074]">
                <Edit3 size={16} />
              </span>
              <h2 className="text-xl font-bold tracking-tight text-[#181c1d]">
                Biên tập nội dung
              </h2>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="ml-1 text-xs font-bold uppercase tracking-wider text-[#3e494b]/80">
                  Mô tả ngắn
                </label>
                <textarea
                  value={form.shortDescription}
                  onChange={(e) =>
                    updateField("shortDescription", e.target.value)
                  }
                  rows={3}
                  className="w-full rounded-3xl border-none bg-[#f1f4f5] px-6 py-4 leading-relaxed text-[#181c1d] outline-none focus:ring-2 focus:ring-[#007B8A]/20"
                />
              </div>

              <div className="space-y-2">
                <label className="ml-1 text-xs font-bold uppercase tracking-wider text-[#3e494b]/80">
                  Mô tả chi tiết
                </label>

                <div className="overflow-hidden rounded-3xl border border-[#bdc8cb]/30">
                  <div className="flex gap-3 border-b border-[#bdc8cb]/30 bg-[#e5e9ea] px-4 py-2">
                    <button
                      type="button"
                      className="rounded p-1 hover:bg-[#dfe3e4]"
                    >
                      B
                    </button>
                    <button
                      type="button"
                      className="rounded p-1 italic hover:bg-[#dfe3e4]"
                    >
                      I
                    </button>
                    <button
                      type="button"
                      className="rounded p-1 hover:bg-[#dfe3e4]"
                    >
                      • List
                    </button>
                    <button
                      type="button"
                      className="ml-auto rounded p-1 hover:bg-[#dfe3e4]"
                    >
                      Image
                    </button>
                  </div>

                  <textarea
                    value={form.description}
                    onChange={(e) => updateField("description", e.target.value)}
                    rows={9}
                    className="w-full border-none bg-transparent px-6 py-4 leading-relaxed text-[#181c1d] outline-none focus:ring-0"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-6 rounded-[3rem] bg-white p-8 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-[#181c1d]">
                  Lịch trình tour
                </h2>
                <p className="mt-1 text-sm text-[#6e797b]">
                  Quản lý từng ngày và các hoạt động trong lịch trình.
                </p>
              </div>

              <button
                type="button"
                onClick={addItineraryDay}
                className="flex items-center gap-2 rounded-full bg-[#007B8A] px-5 py-2 text-sm font-bold text-white hover:bg-[#00606c]"
              >
                <Plus size={16} />
                Thêm ngày
              </button>
            </div>

            {form.itineraryDays.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-[#bdc8cb] bg-[#f1f4f5] p-8 text-center text-sm text-[#6e797b]">
                Chưa có lịch trình. Nhấn “Thêm ngày” để bắt đầu tạo lịch trình.
              </div>
            ) : (
              <div className="space-y-5">
                {form.itineraryDays.map((day, dayIndex) => (
                  <div
                    key={dayIndex}
                    className="rounded-[2rem] border border-[#bdc8cb]/40 bg-[#f6fafb] p-5"
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <h3 className="font-bold text-[#00606c]">
                        Ngày {day.dayNo}
                      </h3>

                      <button
                        type="button"
                        onClick={() => removeItineraryDay(dayIndex)}
                        className="rounded-full bg-[#ffdad6] px-3 py-1 text-xs font-bold text-[#93000a]"
                      >
                        Xóa ngày
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <input
                        value={day.title}
                        onChange={(e) =>
                          updateItineraryDay(dayIndex, "title", e.target.value)
                        }
                        placeholder="Tiêu đề ngày, ví dụ: Ngày 1: TP.HCM - Đà Lạt"
                        className="rounded-full border-none bg-white px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-[#007B8A]/20 md:col-span-2"
                      />

                      <input
                        value={day.overnightLocation}
                        onChange={(e) =>
                          updateItineraryDay(
                            dayIndex,
                            "overnightLocation",
                            e.target.value
                          )
                        }
                        placeholder="Nơi lưu trú qua đêm"
                        className="rounded-full border-none bg-white px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-[#007B8A]/20 md:col-span-2"
                      />

                      <textarea
                        value={day.description}
                        onChange={(e) =>
                          updateItineraryDay(
                            dayIndex,
                            "description",
                            e.target.value
                          )
                        }
                        placeholder="Mô tả tổng quan trong ngày..."
                        rows={3}
                        className="rounded-3xl border-none bg-white px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-[#007B8A]/20 md:col-span-2"
                      />
                    </div>

                    <div className="mt-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold uppercase tracking-widest text-[#3e494b]">
                          Hoạt động trong ngày
                        </p>

                        <button
                          type="button"
                          onClick={() => addActivity(dayIndex)}
                          className="rounded-full bg-[#006875]/10 px-4 py-2 text-xs font-bold text-[#00606c]"
                        >
                          + Thêm hoạt động
                        </button>
                      </div>

                      {day.activities.map((activity, activityIndex) => (
                        <div
                          key={activityIndex}
                          className="rounded-3xl bg-white p-4 shadow-sm"
                        >
                          <div className="mb-3 flex justify-end">
                            <button
                              type="button"
                              onClick={() =>
                                removeActivity(dayIndex, activityIndex)
                              }
                              className="flex items-center gap-1 rounded-full bg-[#ffdad6] px-3 py-1 text-xs font-bold text-[#93000a]"
                            >
                              <Trash2 size={12} />
                              Xóa hoạt động
                            </button>
                          </div>

                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <input
                              value={activity.activityTime}
                              onChange={(e) =>
                                updateActivity(
                                  dayIndex,
                                  activityIndex,
                                  "activityTime",
                                  e.target.value
                                )
                              }
                              placeholder="Thời gian, ví dụ: 08:00"
                              className="rounded-full border-none bg-[#f1f4f5] px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-[#007B8A]/20"
                            />

                            <input
                              value={activity.activityTitle}
                              onChange={(e) =>
                                updateActivity(
                                  dayIndex,
                                  activityIndex,
                                  "activityTitle",
                                  e.target.value
                                )
                              }
                              placeholder="Tên hoạt động"
                              className="rounded-full border-none bg-[#f1f4f5] px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-[#007B8A]/20"
                            />

                            <input
                              value={activity.locationName}
                              onChange={(e) =>
                                updateActivity(
                                  dayIndex,
                                  activityIndex,
                                  "locationName",
                                  e.target.value
                                )
                              }
                              placeholder="Địa điểm"
                              className="rounded-full border-none bg-[#f1f4f5] px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-[#007B8A]/20"
                            />

                            <input
                              value={activity.description}
                              onChange={(e) =>
                                updateActivity(
                                  dayIndex,
                                  activityIndex,
                                  "description",
                                  e.target.value
                                )
                              }
                              placeholder="Mô tả hoạt động"
                              className="rounded-full border-none bg-[#f1f4f5] px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-[#007B8A]/20"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-8">
          <section className="space-y-6 rounded-[3rem] bg-white p-8 shadow-sm">
            <div>
              <label className="mb-4 block text-xs font-bold uppercase tracking-wider text-[#3e494b]/80">
                Trạng thái Tour
              </label>

              <div className="flex rounded-full bg-[#ebeeef] p-1">
                <button
                  type="button"
                  onClick={() => updateField("status", "DRAFT")}
                  className={`flex-1 rounded-full py-2 text-sm font-bold transition-all ${
                    form.status === "DRAFT"
                      ? "bg-white text-[#181c1d] shadow-sm"
                      : "text-[#3e494b]"
                  }`}
                >
                  Ẩn
                </button>

                <button
                  type="button"
                  onClick={() => updateField("status", "PUBLISHED")}
                  className={`flex-1 rounded-full py-2 text-sm font-bold transition-all ${
                    form.status === "PUBLISHED"
                      ? "bg-white text-[#181c1d] shadow-sm"
                      : "text-[#3e494b]"
                  }`}
                >
                  Mở
                </button>
              </div>
            </div>

            <label className="flex items-center justify-between rounded-3xl bg-[#f1f4f5] px-5 py-4 text-sm font-semibold text-[#3e494b]">
              Tour nổi bật
              <input
                type="checkbox"
                checked={form.isFeatured}
                onChange={(e) => updateField("isFeatured", e.target.checked)}
                className="h-5 w-5 rounded border-[#bdc8cb] text-[#007B8A] focus:ring-[#007B8A]"
              />
            </label>

            <div className="space-y-3 pt-4">
              <button
                onClick={() => handleSave()}
                disabled={saving}
                className="w-full rounded-full bg-gradient-to-r from-[#9b4500] to-[#fc8a40] py-4 text-lg font-extrabold text-white shadow-xl shadow-orange-900/10 transition hover:scale-[1.02] disabled:opacity-60"
              >
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </button>

              <button
                onClick={() => router.push("/admin/tours")}
                className="w-full rounded-full bg-[#006875]/10 py-4 font-bold text-[#00606c] transition hover:bg-[#006875]/20"
              >
                Hủy bỏ
              </button>
            </div>
          </section>

          <section className="space-y-6 rounded-[3rem] bg-white p-8 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-lg font-bold">Hình ảnh Tour</h3>
              <span className="text-xs font-bold uppercase tracking-tight text-[#00606c]">
                Ảnh & Gallery
              </span>
            </div>

            <label className="group relative flex aspect-[4/3] cursor-pointer overflow-hidden rounded-3xl border-2 border-dashed border-[#bdc8cb] bg-[#f1f4f5] shadow-inner">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImageUpload(e.target.files?.[0])}
              />

              {form.featuredImageUrl ? (
                <img
                  src={form.featuredImageUrl}
                  alt={form.tourName}
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
                />
              ) : (
                <div className="flex h-full w-full flex-1 flex-col items-center justify-center text-[#007B8A]">
                  <UploadCloud size={42} />
                  <p className="mt-2 text-xs font-bold text-[#6e797b]">
                    Click để tải ảnh đại diện
                  </p>
                </div>
              )}
            </label>

            <input
              value={form.featuredImageUrl}
              onChange={(e) => updateField("featuredImageUrl", e.target.value)}
              placeholder="Hoặc dán URL ảnh đại diện..."
              className="w-full rounded-full border-none bg-[#f1f4f5] px-6 py-3 text-sm outline-none focus:ring-2 focus:ring-[#007B8A]/20"
            />

            <div>
              <p className="mb-3 ml-1 text-xs font-bold uppercase tracking-wider text-[#3e494b]/80">
                Bộ sưu tập Gallery
              </p>

              <div className="grid grid-cols-3 gap-2">
                <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-[#bdc8cb] text-[#3e494b] transition hover:border-[#007B8A] hover:text-[#007B8A]">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleGalleryUpload(e.target.files?.[0])}
                  />
                  <ImagePlus size={18} />
                  <span className="text-[10px] font-bold uppercase">Thêm</span>
                </label>

                {form.galleryImages.map((image, index) => (
                  <div
                    key={`${image}-${index}`}
                    className="relative aspect-square overflow-hidden rounded-2xl bg-[#ebeeef]"
                  >
                    <img src={image} alt="" className="h-full w-full object-cover" />

                    <button
                      type="button"
                      onClick={() => removeGalleryImage(index)}
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#ba1a1a] text-xs font-bold text-white"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <div className="flex gap-4 rounded-[3rem] bg-[#007B8A] p-6 text-[#ddf9ff]">
            <Lightbulb size={22} className="shrink-0" />
            <div>
              <p className="mb-1 text-sm font-bold">Mẹo nhỏ cho SEO</p>
              <p className="text-xs leading-relaxed opacity-90">
                Hãy đảm bảo slug chứa từ khóa chính và không quá dài để đạt
                hiệu quả tìm kiếm tốt hơn.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
