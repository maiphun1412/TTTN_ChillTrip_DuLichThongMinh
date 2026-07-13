"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Info,
  FileText,
  Settings,
  Car,
  Wallet,
  ImagePlus,
  UploadCloud,
  AlertCircle,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  CalendarDays,
} from "lucide-react";

const API_BASE_URL = "/backend-api";

type TourType = "DOMESTIC" | "INTERNATIONAL";
type TourStatus = "DRAFT" | "PUBLISHED" | "STOPPED";
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

type FormErrors = Partial<Record<keyof TourForm, string>>;

function getAuthHeaders() {
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

function generateSlug(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function inputClass(error?: string, extra = "") {
  return `w-full rounded-full border bg-[#f1f4f5] px-6 py-4 outline-none transition focus:ring-2 ${
    error
      ? "border-red-400 bg-red-50 text-red-700 focus:ring-red-200"
      : "border-transparent focus:ring-[#007B8A]/20"
  } ${extra}`;
}

function textareaClass(error?: string) {
  return `w-full rounded-3xl border bg-[#f1f4f5] px-6 py-4 outline-none transition focus:ring-2 ${
    error
      ? "border-red-400 bg-red-50 text-red-700 focus:ring-red-200"
      : "border-transparent focus:ring-[#007B8A]/20"
  }`;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;

  return (
    <p className="ml-2 mt-2 flex items-center gap-1 text-xs font-semibold text-red-600">
      <AlertCircle size={13} />
      {message}
    </p>
  );
}

function FieldHint({ children }: { children: string }) {
  return <p className="ml-2 mt-1 text-[11px] text-[#6e797b]">{children}</p>;
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

export default function AdminTourCreate() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const [form, setForm] = useState<TourForm>({
    tourCode: "",
    tourName: "",
    slug: "",
    tourType: "DOMESTIC",
    durationDays: 3,
    durationNights: 2,
    basePrice: 0,
    childPrice: 0,
    maxCapacity: 25,
    shortDescription: "",
    description: "",
    featuredImageUrl: "",
    galleryImages: [],
    itineraryDays: [],
    departures: [],
    includedItems: ["Dịch vụ theo chương trình"],
    excludedItems: ["Chi phí cá nhân"],
    status: "PUBLISHED",
    isFeatured: false,
  });

  function updateField<K extends keyof TourForm>(key: K, value: TourForm[K]) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [key]: undefined,
    }));
  }

  function validateForm() {
    const nextErrors: FormErrors = {};

    if (!form.tourName.trim()) {
      nextErrors.tourName = "Vui lòng nhập tên tour.";
    }

    if (!form.tourCode.trim()) {
      nextErrors.tourCode = "Vui lòng nhập mã tour.";
    } else if (form.tourCode.trim().length < 2) {
      nextErrors.tourCode = "Mã tour phải có ít nhất 2 ký tự.";
    }

    if (form.slug.trim() && form.slug.trim().length < 2) {
      nextErrors.slug = "Slug phải có ít nhất 2 ký tự.";
    }

    if (Number(form.durationDays) < 1) {
      nextErrors.durationDays = "Số ngày phải lớn hơn hoặc bằng 1.";
    }

    if (Number(form.durationNights) < 0) {
      nextErrors.durationNights = "Số đêm không được âm.";
    }

    if (Number(form.basePrice) < 0) {
      nextErrors.basePrice = "Giá cơ bản không được âm.";
    }

    if (Number(form.childPrice) < 0) {
      nextErrors.childPrice = "Giá trẻ em không được âm.";
    }

    if (Number(form.maxCapacity) < 1) {
      nextErrors.maxCapacity = "Sức chứa phải lớn hơn hoặc bằng 1.";
    }

    const invalidDeparture = form.departures.find(
      (item) =>
        !item.startDate ||
        !item.endDate ||
        Number(item.maxSeats) < 1 ||
        Number(item.availableSeats) < 0
    );

    if (invalidDeparture) {
      nextErrors.departures =
        "Ngày khởi hành cần có ngày đi, ngày về và số chỗ hợp lệ.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleImageUpload(file?: File) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({
        ...prev,
        featuredImageUrl: "Vui lòng chọn đúng file hình ảnh.",
      }));
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
      setErrors((prev) => ({
        ...prev,
        galleryImages: "Vui lòng chọn đúng file hình ảnh.",
      }));
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setForm((prev) => ({
        ...prev,
        galleryImages: [...prev.galleryImages, String(reader.result || "")],
      }));

      setErrors((prev) => ({
        ...prev,
        galleryImages: undefined,
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

    setErrors((prev) => ({
      ...prev,
      departures: undefined,
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

  async function handleCreate(status?: TourStatus) {
    if (!validateForm()) return;

    try {
      setSaving(true);

      const payload = {
        tourCode: form.tourCode.trim(),
        tourName: form.tourName.trim(),
        slug: form.slug.trim() || generateSlug(form.tourName),
        tourType: form.tourType,
        durationDays: Number(form.durationDays),
        durationNights: Number(form.durationNights),
        basePrice: Number(form.basePrice),
        childPrice: Number(form.childPrice),
        maxCapacity: Number(form.maxCapacity),
        shortDescription: form.shortDescription || undefined,
        description: form.description || undefined,
        featuredImageUrl: form.featuredImageUrl || undefined,
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

      const res = await fetch(`${API_BASE_URL}/admin/tours`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        alert(json?.message || "Tạo tour thất bại");
        return;
      }

      sessionStorage.setItem(
        "tour_updated",
        JSON.stringify({
          id: Number(json?.data?.id),
          name: payload.tourName,
        })
      );

      router.push("/admin/tours");
    } catch (error) {
      console.error("create tour error:", error);
      alert("Không thể tạo tour");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <button
            onClick={() => router.push("/admin/tours")}
            className="mb-5 flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-[#00606c] shadow-sm hover:bg-[#f1f4f5]"
          >
            <ArrowLeft size={16} />
            Quay lại danh sách
          </button>

          <h1 className="mb-2 text-4xl font-extrabold tracking-tight text-[#00606c]">
            Thêm Tour Mới
          </h1>
          <p className="font-medium text-[#3e494b]">
            Kiến tạo những hành trình đáng nhớ cho khách hàng của ChillTrip.
          </p>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => router.push("/admin/tours")}
            className="rounded-full bg-[#006875]/10 px-8 py-3 font-bold text-[#00606c] transition hover:bg-[#006875]/20"
          >
            Hủy bỏ
          </button>

          <button
            onClick={() => handleCreate("PUBLISHED")}
            disabled={saving}
            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#9b4500] to-[#fc8a40] px-10 py-3 font-bold text-white shadow-[0_16px_32px_rgba(155,69,0,0.2)] transition hover:scale-[1.02] disabled:opacity-60"
          >
            <Save size={18} />
            {saving ? "Đang lưu..." : "Lưu Tour"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="space-y-8 lg:col-span-8">
          <section className="rounded-[3rem] border border-[#bdc8cb]/10 bg-white p-8 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <Info className="text-[#00606c]" size={22} />
              <h2 className="text-xl font-bold text-[#181c1d]">
                Thông tin cơ bản
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 ml-2 block text-xs font-bold uppercase tracking-widest text-[#3e494b]">
                  Tên Tour
                </label>
                <input
                  value={form.tourName}
                  onChange={(e) => {
                    const name = e.target.value;
                    updateField("tourName", name);
                    if (!form.slug) updateField("slug", generateSlug(name));
                  }}
                  placeholder="Ví dụ: Bình minh trên đỉnh Fansipan 3N2Đ"
                  className={inputClass(errors.tourName)}
                />
                <FieldHint>
                  Tên tour hiển thị cho khách hàng ở trang danh sách và chi tiết
                  tour.
                </FieldHint>
                <FieldError message={errors.tourName} />
              </div>

              <div>
                <label className="mb-2 ml-2 block text-xs font-bold uppercase tracking-widest text-[#3e494b]">
                  Mã Tour
                </label>
                <input
                  value={form.tourCode}
                  onChange={(e) => updateField("tourCode", e.target.value)}
                  placeholder="CT-FANSIPAN-001"
                  className={inputClass(errors.tourCode)}
                />
                <FieldHint>Mã dùng để quản lý nội bộ và đối soát booking.</FieldHint>
                <FieldError message={errors.tourCode} />
              </div>

              <div>
                <label className="mb-2 ml-2 block text-xs font-bold uppercase tracking-widest text-[#3e494b]">
                  Slug
                </label>
                <input
                  value={form.slug}
                  onChange={(e) => updateField("slug", e.target.value)}
                  placeholder="binh-minh-fansipan-3n2d"
                  className={inputClass(errors.slug)}
                />
                <FieldHint>
                  Đường dẫn tĩnh của tour, ví dụ: /tours/binh-minh-fansipan-3n2d.
                </FieldHint>
                <FieldError message={errors.slug} />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 ml-2 block text-xs font-bold uppercase tracking-widest text-[#3e494b]">
                  Loại Tour
                </label>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => updateField("tourType", "DOMESTIC")}
                    className={`rounded-full border-2 px-6 py-2 font-bold ${
                      form.tourType === "DOMESTIC"
                        ? "border-[#00606c] bg-[#9defff] text-[#001f24]"
                        : "border-[#bdc8cb] text-[#3e494b]"
                    }`}
                  >
                    Trong nước
                  </button>

                  <button
                    type="button"
                    onClick={() => updateField("tourType", "INTERNATIONAL")}
                    className={`rounded-full border-2 px-6 py-2 font-bold ${
                      form.tourType === "INTERNATIONAL"
                        ? "border-[#00606c] bg-[#9defff] text-[#001f24]"
                        : "border-[#bdc8cb] text-[#3e494b]"
                    }`}
                  >
                    Quốc tế
                  </button>
                </div>
                <FieldHint>
                  Chọn nhóm tour để hệ thống lọc và hiển thị đúng danh mục.
                </FieldHint>
              </div>
            </div>
          </section>

          <section className="rounded-[3rem] border border-[#bdc8cb]/10 bg-white p-8 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <FileText className="text-[#00606c]" size={22} />
              <h2 className="text-xl font-bold text-[#181c1d]">
                Nội dung chi tiết
              </h2>
            </div>

            <div className="space-y-6">
              <div>
                <label className="mb-2 ml-2 block text-xs font-bold uppercase tracking-widest text-[#3e494b]">
                  Mô tả ngắn
                </label>
                <textarea
                  value={form.shortDescription}
                  onChange={(e) =>
                    updateField("shortDescription", e.target.value)
                  }
                  rows={3}
                  placeholder="Tóm tắt những điểm đặc sắc nhất của hành trình..."
                  className={textareaClass(errors.shortDescription)}
                />
                <FieldHint>
                  Đoạn mô tả ngắn xuất hiện ở card tour và phần giới thiệu đầu
                  trang.
                </FieldHint>
              </div>

              <div>
                <label className="mb-2 ml-2 block text-xs font-bold uppercase tracking-widest text-[#3e494b]">
                  Mô tả chi tiết
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  rows={10}
                  placeholder="Viết lịch trình chi tiết từng ngày tại đây..."
                  className={textareaClass(errors.description)}
                />
                <FieldHint>
                  Có thể nhập lịch trình từng ngày, điểm tham quan, dịch vụ bao
                  gồm và ghi chú.
                </FieldHint>
              </div>
            </div>
          </section>

          <section className="rounded-[3rem] border border-[#bdc8cb]/10 bg-white p-8 shadow-sm">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-[#181c1d]">
                  Ngày khởi hành
                </h2>
                <p className="mt-1 text-sm text-[#6e797b]">
                  Quản lý các ngày mở bán và số chỗ cho tour.
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

            {errors.departures && <FieldError message={errors.departures} />}

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

          <section className="rounded-[3rem] border border-[#bdc8cb]/10 bg-white p-8 shadow-sm">
            <h2 className="mb-6 text-xl font-bold text-[#181c1d]">
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

            <FieldHint>
              Các dòng này sẽ được lưu vào included_services và
              excluded_services trong bảng tours.
            </FieldHint>
          </section>

          <section className="rounded-[3rem] border border-[#bdc8cb]/10 bg-white p-8 shadow-sm">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-[#181c1d]">
                  Lịch trình tour
                </h2>
                <p className="mt-1 text-sm text-[#6e797b]">
                  Thêm từng ngày và các hoạt động trong ngày cho tour.
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
                Chưa có lịch trình. Nhấn “Thêm ngày” để bắt đầu.
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

        <div className="space-y-8 lg:col-span-4">
          <section className="rounded-[3rem] border-2 border-[#007B8A]/10 bg-[#007B8A]/10 p-8">
            <div className="mb-6 flex items-center gap-3">
              <Settings className="text-[#00606c]" size={22} />
              <h2 className="text-xl font-bold text-[#00606c]">
                Cấu hình & Trạng thái
              </h2>
            </div>

            <div className="space-y-6">
              <label className="flex items-center justify-between rounded-3xl bg-white/70 p-4">
                <span>
                  <span className="block font-bold text-[#3e494b]">
                    Tour nổi bật
                  </span>
                  <span className="text-xs text-[#6e797b]">
                    Bật để ưu tiên hiển thị ở trang chủ.
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={form.isFeatured}
                  onChange={(e) => updateField("isFeatured", e.target.checked)}
                  className="h-5 w-5 rounded border-[#bdc8cb] text-[#007B8A] focus:ring-[#007B8A]"
                />
              </label>

              <div>
                <label className="mb-2 ml-2 block text-xs font-bold uppercase tracking-widest text-[#3e494b]">
                  Trạng thái
                </label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    updateField("status", e.target.value as TourStatus)
                  }
                  className="w-full rounded-full border-none bg-white px-6 py-4 font-bold text-[#00606c] outline-none focus:ring-2 focus:ring-[#007B8A]/20"
                >
                  <option value="DRAFT">Bản nháp</option>
                  <option value="PUBLISHED">Công khai</option>
                  <option value="STOPPED">Tạm ngưng</option>
                </select>
                <FieldHint>
                  Bản nháp không hiển thị cho khách, công khai sẽ cho phép đặt
                  tour.
                </FieldHint>
              </div>
            </div>
          </section>

          <section className="rounded-[3rem] border border-[#bdc8cb]/10 bg-white p-8 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <Car className="text-[#00606c]" size={22} />
              <h2 className="text-lg font-bold text-[#181c1d]">
                Vận chuyển & Thời lượng
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 ml-2 block text-[10px] font-bold uppercase tracking-widest text-[#3e494b]">
                  Số ngày
                </label>
                <input
                  type="number"
                  value={form.durationDays}
                  onChange={(e) =>
                    updateField("durationDays", Number(e.target.value))
                  }
                  className={inputClass(errors.durationDays, "px-4 py-3")}
                />
                <FieldHint>Số ngày tour diễn ra.</FieldHint>
                <FieldError message={errors.durationDays} />
              </div>

              <div>
                <label className="mb-2 ml-2 block text-[10px] font-bold uppercase tracking-widest text-[#3e494b]">
                  Số đêm
                </label>
                <input
                  type="number"
                  value={form.durationNights}
                  onChange={(e) =>
                    updateField("durationNights", Number(e.target.value))
                  }
                  className={inputClass(errors.durationNights, "px-4 py-3")}
                />
                <FieldHint>Số đêm lưu trú trong tour.</FieldHint>
                <FieldError message={errors.durationNights} />
              </div>
            </div>
          </section>

          <section className="rounded-[3rem] border border-[#bdc8cb]/10 bg-white p-8 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <Wallet className="text-[#00606c]" size={22} />
              <h2 className="text-lg font-bold text-[#181c1d]">
                Chi phí & Sức chứa
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 ml-2 block text-[10px] font-bold uppercase tracking-widest text-[#3e494b]">
                  Giá cơ bản
                </label>
                <input
                  type="number"
                  value={form.basePrice}
                  onChange={(e) =>
                    updateField("basePrice", Number(e.target.value))
                  }
                  placeholder="Giá người lớn"
                  className={inputClass(
                    errors.basePrice,
                    "py-3 font-bold text-[#9b4500]"
                  )}
                />
                <FieldHint>Giá bán cho một khách người lớn, đơn vị VNĐ.</FieldHint>
                <FieldError message={errors.basePrice} />
              </div>

              <div>
                <label className="mb-2 ml-2 block text-[10px] font-bold uppercase tracking-widest text-[#3e494b]">
                  Giá trẻ em
                </label>
                <input
                  type="number"
                  value={form.childPrice}
                  onChange={(e) =>
                    updateField("childPrice", Number(e.target.value))
                  }
                  placeholder="Giá trẻ em"
                  className={inputClass(errors.childPrice, "py-3")}
                />
                <FieldHint>Giá áp dụng cho khách trẻ em, đơn vị VNĐ.</FieldHint>
                <FieldError message={errors.childPrice} />
              </div>

              <div>
                <label className="mb-2 ml-2 block text-[10px] font-bold uppercase tracking-widest text-[#3e494b]">
                  Sức chứa tối đa
                </label>
                <input
                  type="number"
                  value={form.maxCapacity}
                  onChange={(e) =>
                    updateField("maxCapacity", Number(e.target.value))
                  }
                  placeholder="Sức chứa tối đa"
                  className={inputClass(errors.maxCapacity, "py-3")}
                />
                <FieldHint>Số lượng khách tối đa có thể tham gia tour.</FieldHint>
                <FieldError message={errors.maxCapacity} />
              </div>
            </div>
          </section>

          <section className="rounded-[3rem] border border-[#bdc8cb]/10 bg-white p-8 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <ImagePlus className="text-[#00606c]" size={22} />
              <h2 className="text-lg font-bold text-[#181c1d]">Hình ảnh Tour</h2>
            </div>

            <div className="mb-5">
              <p className="mb-2 ml-2 text-[10px] font-bold uppercase tracking-widest text-[#3e494b]">
                Ảnh đại diện
              </p>

              <label
                className={`flex aspect-video cursor-pointer overflow-hidden rounded-3xl border-2 border-dashed bg-[#f1f4f5] transition hover:bg-[#e5e9ea] ${
                  errors.featuredImageUrl
                    ? "border-red-400 bg-red-50"
                    : "border-[#bdc8cb]"
                }`}
              >
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
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center text-[#6e797b]">
                    <UploadCloud size={36} />
                    <p className="mt-2 text-xs font-semibold">
                      Kéo thả hoặc click để tải lên
                    </p>
                    <p className="mt-1 text-[11px]">
                      Ảnh này hiển thị ở card tour.
                    </p>
                  </div>
                )}
              </label>

              <input
                value={form.featuredImageUrl}
                onChange={(e) => updateField("featuredImageUrl", e.target.value)}
                placeholder="Hoặc dán URL ảnh đại diện..."
                className={inputClass(errors.featuredImageUrl, "mt-3 py-3")}
              />

              <FieldError message={errors.featuredImageUrl} />
            </div>

            <div>
              <p className="mb-3 ml-2 text-[10px] font-bold uppercase tracking-widest text-[#3e494b]">
                Bộ sưu tập Gallery
              </p>

              <div className="grid grid-cols-3 gap-2">
                <label className="flex aspect-square cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-[#bdc8cb] bg-[#f1f4f5] text-[#6e797b] transition hover:border-[#007B8A] hover:text-[#007B8A]">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleGalleryUpload(e.target.files?.[0])}
                  />
                  <span className="text-2xl">+</span>
                </label>

                {form.galleryImages.map((image, index) => (
                  <div
                    key={`${image}-${index}`}
                    className="relative aspect-square overflow-hidden rounded-2xl bg-[#f1f4f5]"
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

              <FieldHint>
                Gallery dùng để hiển thị nhiều hình ảnh chi tiết của tour.
              </FieldHint>
              <FieldError message={errors.galleryImages} />
            </div>
          </section>
        </div>
      </div>

      <div className="mt-12 flex flex-col justify-between gap-6 border-t border-[#bdc8cb]/20 pt-8 md:flex-row md:items-center">
        <p className="text-xs italic text-[#6e797b]">
          Tour sẽ được lưu vào hệ thống quản trị ChillTrip.
        </p>

        <div className="flex w-full gap-4 md:w-auto">
          <button
            onClick={() => handleCreate("DRAFT")}
            disabled={saving}
            className="flex-1 rounded-full border-2 border-[#007B8A]/20 px-8 py-3 font-bold text-[#00606c] transition hover:bg-[#007B8A]/5 disabled:opacity-60 md:flex-none"
          >
            Lưu bản nháp
          </button>

          <button
            onClick={() => handleCreate("PUBLISHED")}
            disabled={saving}
            className="flex-1 rounded-full bg-[#007B8A] px-12 py-3 font-bold text-white shadow-[0_16px_32px_rgba(0,96,108,0.2)] transition hover:bg-[#00606c] disabled:opacity-60 md:flex-none"
          >
            Lưu và Đăng
          </button>
        </div>
      </div>
    </div>
  );
}
