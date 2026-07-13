"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Eye,
  Filter,
  Loader2,
  MapPinned,
  PauseCircle,
  Plane,
  Plus,
  RefreshCcw,
  Route,
  Save,
  Search,
  Settings,
  Sparkles,
  Ticket,
  X,
} from "lucide-react";
import {
  getStaffTourDetailApi,
  getStaffToursApi,
  saveStaffTourApi,
  updateStaffTourStatusApi,
  type StaffTourDetailData,
  type StaffTourItem,
  type StaffTourPayload,
} from "@/lib/api/staffTour.api";

const PAGE_SIZE = 8;

const fallbackTourImage =
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=900&auto=format&fit=crop";

const regionOptions = [
  { label: "Tất cả", value: "ALL" },
  { label: "Miền Bắc", value: "NORTH" },
  { label: "Miền Trung", value: "CENTRAL" },
  { label: "Miền Nam", value: "SOUTH" },
];

const statusOptions = [
  { label: "Tất cả", value: "ALL" },
  { label: "Đang bán", value: "ACTIVE" },
  { label: "Nháp", value: "DRAFT" },
  { label: "Tạm dừng", value: "INACTIVE" },
  { label: "Đã kết thúc", value: "COMPLETED" },
];

const tourTypeOptions = [
  { label: "Tất cả loại hình", value: "ALL" },
  { label: "Tour trong nước", value: "DOMESTIC" },
  { label: "Tour quốc tế", value: "INTERNATIONAL" },
  { label: "Tour nghỉ dưỡng", value: "RESORT" },
  { label: "Tour khám phá", value: "ADVENTURE" },
];

type TourFormState = {
  id?: string;
  tourCode: string;
  tourName: string;
  tourType: string;
  durationDays: string;
  durationNights: string;
  transportType: string;
  basePrice: string;
  childPrice: string;
  maxCapacity: string;
  shortDescription: string;
  description: string;
  featuredImageUrl: string;
  includedServices: string;
  excludedServices: string;
  status: string;
  isFeatured: boolean;
};

function emptyForm(): TourFormState {
  return {
    tourCode: "",
    tourName: "",
    tourType: "DOMESTIC",
    durationDays: "3",
    durationNights: "2",
    transportType: "",
    basePrice: "0",
    childPrice: "0",
    maxCapacity: "20",
    shortDescription: "",
    description: "",
    featuredImageUrl: "",
    includedServices: "",
    excludedServices: "",
    status: "DRAFT",
    isFeatured: false,
  };
}

function formFromTour(tour: StaffTourItem): TourFormState {
  return {
    id: tour.id,
    tourCode: tour.tourCode || "",
    tourName: tour.tourName || "",
    tourType: tour.tourType || "DOMESTIC",
    durationDays: String(tour.durationDays || 1),
    durationNights: String(tour.durationNights || 0),
    transportType: tour.transportType || "",
    basePrice: String(tour.basePrice || 0),
    childPrice: String(tour.childPrice || 0),
    maxCapacity: String(tour.maxCapacity || 1),
    shortDescription: tour.shortDescription || "",
    description: tour.description || "",
    featuredImageUrl: tour.featuredImageUrl || "",
    includedServices: tour.includedServices || "",
    excludedServices: tour.excludedServices || "",
    status: tour.status || "DRAFT",
    isFeatured: Boolean(tour.isFeatured),
  };
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value || 0) + "đ";
}

function getStatusLabel(status: string) {
  switch (status) {
    case "ACTIVE":
      return "Đang bán";
    case "DRAFT":
      return "Nháp";
    case "INACTIVE":
      return "Tạm dừng";
    case "COMPLETED":
      return "Đã kết thúc";
    default:
      return status || "Chưa rõ";
  }
}

function getStatusClass(status: string) {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-100 text-emerald-700";
    case "DRAFT":
      return "bg-slate-100 text-slate-700";
    case "INACTIVE":
      return "bg-amber-100 text-amber-700";
    case "COMPLETED":
      return "bg-[#dfe3e4] text-[#3e494b]";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getFillColor(fillRate: number) {
  if (fillRate >= 85) return "bg-[#ba1a1a]";
  if (fillRate >= 55) return "bg-[#fc8a40]";
  return "bg-[#00606c]";
}

export default function StaffTours() {
  const router = useRouter();

  const [tours, setTours] = useState<StaffTourItem[]>([]);
  const [summary, setSummary] = useState({
    totalTours: 0,
    activeTours: 0,
    todayDepartures: 0,
    totalAvailableSeats: 0,
    averageFillRate: 0,
  });

  const [keyword, setKeyword] = useState("");
  const [region, setRegion] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [tourType, setTourType] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [openForm, setOpenForm] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState<TourFormState>(emptyForm());

  const [openDetail, setOpenDetail] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<StaffTourDetailData | null>(null);

  const selectedFilterText = useMemo(() => {
    const regionLabel =
      regionOptions.find((item) => item.value === region)?.label || "Tất cả";
    const statusLabel =
      statusOptions.find((item) => item.value === status)?.label || "Tất cả";
    const typeLabel =
      tourTypeOptions.find((item) => item.value === tourType)?.label ||
      "Tất cả loại hình";

    return `${regionLabel} • ${typeLabel} • ${statusLabel}`;
  }, [region, status, tourType]);

  async function loadTours(options?: {
    nextPage?: number;
    nextKeyword?: string;
    nextRegion?: string;
    nextStatus?: string;
    nextTourType?: string;
  }) {
    try {
      setLoading(true);
      setErrorMessage("");

      const result = await getStaffToursApi({
        keyword: options?.nextKeyword ?? keyword,
        region: options?.nextRegion ?? region,
        status: options?.nextStatus ?? status,
        tourType: options?.nextTourType ?? tourType,
        page: options?.nextPage ?? page,
        pageSize: PAGE_SIZE,
      });

      setTours(result.tours);
      setSummary(result.summary);
      setTotal(result.total);
      setPage(result.page);
      setTotalPages(result.totalPages);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Không tải được danh sách tour"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTours({ nextPage: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region, status, tourType]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadTours({ nextPage: 1, nextKeyword: keyword });
    }, 350);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword]);

  function openCreateModal() {
    setFormMode("create");
    setForm(emptyForm());
    setOpenForm(true);
  }

  function openEditModal(tour: StaffTourItem) {
    setFormMode("edit");
    setForm(formFromTour(tour));
    setOpenForm(true);
  }

  function updateForm<K extends keyof TourFormState>(
    key: K,
    value: TourFormState[K]
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function handleSaveTour(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setActionLoading(true);

      const payload: StaffTourPayload = {
        id: form.id,
        tourCode: form.tourCode.trim(),
        tourName: form.tourName.trim(),
        tourType: form.tourType,
        durationDays: Number(form.durationDays),
        durationNights: Number(form.durationNights),
        transportType: form.transportType.trim(),
        basePrice: Number(form.basePrice),
        childPrice: Number(form.childPrice),
        maxCapacity: Number(form.maxCapacity),
        shortDescription: form.shortDescription.trim(),
        description: form.description.trim(),
        featuredImageUrl: form.featuredImageUrl.trim(),
        includedServices: form.includedServices.trim(),
        excludedServices: form.excludedServices.trim(),
        status: form.status,
        isFeatured: form.isFeatured,
      };

      await saveStaffTourApi(payload);

      alert(
        formMode === "create"
          ? "Tạo tour thành công."
          : "Cập nhật tour thành công."
      );

      setOpenForm(false);
      setForm(emptyForm());
      await loadTours();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Không lưu được tour.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleViewDetail(tour: StaffTourItem) {
    try {
      setDetailLoading(true);
      setOpenDetail(true);
      setDetail(null);

      const result = await getStaffTourDetailApi(tour.id);
      setDetail(result);
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Không tải được chi tiết tour."
      );
      setOpenDetail(false);
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleChangeStatus(tour: StaffTourItem) {
    const nextStatus = tour.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const ok = confirm(
      nextStatus === "ACTIVE"
        ? `Bật bán tour "${tour.tourName}"?`
        : `Tạm dừng bán tour "${tour.tourName}"?`
    );

    if (!ok) return;

    try {
      setActionLoading(true);
      await updateStaffTourStatusApi(tour.id, nextStatus);
      alert("Cập nhật trạng thái tour thành công.");
      await loadTours();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Không cập nhật được tour.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleMarkCompleted(tour: StaffTourItem) {
    const ok = confirm(`Chuyển tour "${tour.tourName}" sang đã kết thúc?`);
    if (!ok) return;

    try {
      setActionLoading(true);
      await updateStaffTourStatusApi(tour.id, "COMPLETED");
      alert("Đã cập nhật trạng thái tour.");
      await loadTours();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Không cập nhật được tour.");
    } finally {
      setActionLoading(false);
    }
  }

  function resetFilters() {
    setKeyword("");
    setRegion("ALL");
    setStatus("ALL");
    setTourType("ALL");
    setPage(1);

    loadTours({
      nextPage: 1,
      nextKeyword: "",
      nextRegion: "ALL",
      nextStatus: "ALL",
      nextTourType: "ALL",
    });
  }

  function goToOperation(tour: StaffTourItem) {
    router.push(`/staff/operation?tourId=${tour.id}`);
  }

  async function goToPage(nextPage: number) {
    if (nextPage < 1 || nextPage > totalPages || nextPage === page) return;
    await loadTours({ nextPage });
  }

  if (loading && tours.length === 0) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="flex items-center gap-3 rounded-[2rem] bg-white px-6 py-4 shadow-sm">
          <Loader2 className="animate-spin text-[#00606c]" size={22} />
          <span className="font-semibold text-[#00606c]">
            Đang tải danh sách tour...
          </span>
        </div>
      </div>
    );
  }

  if (errorMessage && tours.length === 0) {
    return (
      <div className="rounded-[2rem] border border-red-200 bg-white p-6 text-red-700 shadow-sm">
        <div className="mb-2 flex items-center gap-2 font-bold">
          <AlertCircle size={20} />
          Không tải được dữ liệu
        </div>

        <p className="text-sm">{errorMessage}</p>

        <button
          type="button"
          onClick={() => loadTours()}
          className="mt-5 rounded-full bg-[#00606c] px-5 py-2 text-sm font-bold text-white"
        >
          Tải lại
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[1.6rem] bg-[#00606c] px-6 py-5 text-white shadow-sm">
        <div className="absolute -right-24 -top-28 h-56 w-56 rounded-full bg-[#9defff]/15 blur-3xl" />
        <div className="absolute -bottom-28 right-44 h-40 w-40 rounded-full bg-[#fc8a40]/15 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#ddf9ff]">
              <Sparkles size={13} />
              ChillTrip Tour Operation
            </span>

            <h1 className="mt-3 text-3xl font-black tracking-[-0.045em] md:text-4xl">
              Quản lý tour
            </h1>

            <p className="mt-2 max-w-2xl text-xs font-semibold leading-5 text-[#ddf9ff] md:text-sm">
              Theo dõi danh sách tour, số chỗ, lịch khởi hành, trạng thái bán
              và điều phối tour từ dữ liệu thật.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={resetFilters}
              className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2.5 text-xs font-black text-white backdrop-blur transition hover:bg-white/25"
            >
              <RefreshCcw size={15} />
              Làm mới
            </button>

            <button
              type="button"
              onClick={openCreateModal}
              className="flex items-center gap-2 rounded-full bg-[#fc8a40] px-5 py-2.5 text-xs font-black text-white shadow-md transition hover:scale-105"
            >
              <Plus size={16} />
              Tạo tour mới
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<MapPinned size={23} />}
          label="Tổng tour"
          value={summary.totalTours}
          note="Trong hệ thống"
        />
        <StatCard
          icon={<CheckCircle2 size={23} />}
          label="Tour đang bán"
          value={summary.activeTours}
          note="Đang hoạt động"
        />
        <StatCard
          icon={<CalendarDays size={23} />}
          label="Khởi hành hôm nay"
          value={summary.todayDepartures}
          note="Theo lịch đi"
        />
        <StatCard
          icon={<Ticket size={23} />}
          label="Chỗ còn trống"
          value={summary.totalAvailableSeats}
          note={`Lấp đầy ${summary.averageFillRate}%`}
        />
      </section>

      <section className="rounded-[1.6rem] bg-white p-4 shadow-sm ring-1 ring-[#ebeeef]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative w-full max-w-xl">
            <Search
              size={17}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6e797b]"
            />

            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              className="h-11 w-full rounded-full border-none bg-[#f6fafb] pl-11 pr-5 text-sm font-semibold text-[#181c1d] outline-none ring-1 ring-[#ebeeef] placeholder:text-[#6e797b] focus:ring-2 focus:ring-[#00606c]/30"
              placeholder="Gõ để tìm mã tour, tên tour, điểm đến..."
            />
          </div>

          <div className="flex items-center gap-2 rounded-full bg-[#f6fafb] px-4 py-2 text-xs font-black text-[#00606c]">
            <Filter size={15} />
            {selectedFilterText}
          </div>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_1fr_1.4fr]">
          <FilterGroup label="Vùng miền">
            {regionOptions.map((item) => (
              <FilterButton
                key={item.value}
                active={region === item.value}
                onClick={() => {
                  setRegion(item.value);
                  setPage(1);
                }}
              >
                {item.label}
              </FilterButton>
            ))}
          </FilterGroup>

          <label>
            <span className="mb-2 block pl-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#00606c]">
              Loại tour
            </span>

            <select
              value={tourType}
              onChange={(event) => {
                setTourType(event.target.value);
                setPage(1);
              }}
              className="h-10 w-full rounded-full border-none bg-[#f1f4f5] px-4 text-xs font-bold text-[#3e494b] outline-none focus:ring-2 focus:ring-[#00606c]/30"
            >
              {tourTypeOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <FilterGroup label="Trạng thái">
            {statusOptions.map((item) => (
              <FilterButton
                key={item.value}
                active={status === item.value}
                onClick={() => {
                  setStatus(item.value);
                  setPage(1);
                }}
              >
                {item.label}
              </FilterButton>
            ))}
          </FilterGroup>
        </div>
      </section>

      <section className="space-y-3">
        {tours.length === 0 ? (
          <div className="rounded-[1.6rem] bg-white p-10 text-center shadow-sm ring-1 ring-[#ebeeef]">
            <Plane className="mx-auto mb-4 text-[#6e797b]" size={38} />
            <p className="font-black text-[#181c1d]">Không tìm thấy tour</p>
            <p className="mt-2 text-sm text-[#6e797b]">
              Thử đổi bộ lọc hoặc tạo tour mới.
            </p>
          </div>
        ) : (
          tours.map((tour) => (
            <TourCard
              key={tour.id}
              tour={tour}
              onView={() => handleViewDetail(tour)}
              onEdit={() => openEditModal(tour)}
              onOperation={() => goToOperation(tour)}
              onToggleStatus={() => handleChangeStatus(tour)}
              onComplete={() => handleMarkCompleted(tour)}
              actionLoading={actionLoading}
            />
          ))
        )}
      </section>

      <section className="flex flex-col gap-4 rounded-[1.6rem] bg-white px-5 py-4 shadow-sm ring-1 ring-[#ebeeef] md:flex-row md:items-center md:justify-between">
        <p className="text-sm font-semibold text-[#6e797b]">
          Hiển thị {tours.length} trong số {total} tour
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => goToPage(page - 1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#bdc8cb] bg-white text-[#3e494b] disabled:opacity-40"
          >
            <ChevronLeft size={17} />
          </button>

          <span className="rounded-full bg-[#00606c] px-4 py-2 text-xs font-black text-white">
            {page}/{totalPages}
          </span>

          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => goToPage(page + 1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#bdc8cb] bg-white text-[#3e494b] disabled:opacity-40"
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </section>

      {openForm && (
        <TourFormModal
          mode={formMode}
          form={form}
          actionLoading={actionLoading}
          onClose={() => {
            if (!actionLoading) setOpenForm(false);
          }}
          onSubmit={handleSaveTour}
          updateForm={updateForm}
        />
      )}

      {openDetail && (
        <TourDetailModal
          detail={detail}
          loading={detailLoading}
          onClose={() => setOpenDetail(false)}
          onEdit={() => {
            if (!detail) return;
            setOpenDetail(false);
            openEditModal(detail.tour);
          }}
          onOperation={() => {
            if (!detail) return;
            goToOperation(detail.tour);
          }}
        />
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  note,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  note: string;
}) {
  return (
    <div className="rounded-[1.4rem] bg-white p-4 shadow-sm ring-1 ring-[#ebeeef] transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#ddf9ff] text-[#00606c]">
          {icon}
        </div>

        <span className="rounded-full bg-[#f1f4f5] px-3 py-1 text-[9px] font-black uppercase tracking-wider text-[#6e797b]">
          {note}
        </span>
      </div>

      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#6e797b]">
        {label}
      </p>

      <p className="mt-1 text-3xl font-black leading-none text-[#00606c]">
        {value}
      </p>
    </div>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 pl-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#00606c]">
        {label}
      </p>

      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3.5 py-2 text-xs font-black transition ${
        active
          ? "bg-[#00606c] text-white shadow-sm"
          : "bg-[#f1f4f5] text-[#3e494b] hover:bg-[#ddf9ff] hover:text-[#00606c]"
      }`}
    >
      {children}
    </button>
  );
}

function TourCard({
  tour,
  onView,
  onEdit,
  onOperation,
  onToggleStatus,
  onComplete,
  actionLoading,
}: {
  tour: StaffTourItem;
  onView: () => void;
  onEdit: () => void;
  onOperation: () => void;
  onToggleStatus: () => void;
  onComplete: () => void;
  actionLoading: boolean;
}) {
  const maxSeats = tour.totalMaxSeats || tour.maxCapacity || 0;
  const bookedSeats = tour.totalBookedSeats || 0;

  return (
    <article className="overflow-hidden rounded-[1.5rem] bg-white shadow-sm ring-1 ring-[#ebeeef] transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="grid gap-0 xl:grid-cols-[210px_1fr]">
        <div className="relative h-[165px] overflow-hidden bg-[#dfe3e4] xl:h-auto">
          <img
            src={tour.featuredImageUrl || fallbackTourImage}
            alt={tour.tourName}
            className="h-full w-full object-cover transition duration-500 hover:scale-105"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent" />

          <div className="absolute left-4 top-4">
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${getStatusClass(
                tour.status
              )}`}
            >
              {getStatusLabel(tour.status)}
            </span>
          </div>

          {tour.isFeatured && (
            <div className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-[#fc8a40] text-white shadow-md">
              <Sparkles size={15} />
            </div>
          )}

          <div className="absolute bottom-4 left-4 right-4 text-white">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/75">
              {tour.tourCode}
            </p>
            <p className="mt-1 line-clamp-2 text-base font-black leading-tight">
              {tour.tourName}
            </p>
          </div>
        </div>

        <div className="p-5">
          <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-start 2xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap gap-2">
                <Badge>{tour.destinationName || "Chưa có điểm đến"}</Badge>
                <Badge>
                  {tour.durationDays} ngày {tour.durationNights} đêm
                </Badge>
                <Badge>{tour.transportType || "Chưa có phương tiện"}</Badge>
              </div>

              <p className="mt-3 line-clamp-2 text-sm font-semibold leading-6 text-[#3e494b]">
                {tour.shortDescription ||
                  tour.description ||
                  "Tour chưa có mô tả."}
              </p>
            </div>

            <div className="shrink-0 rounded-[1.25rem] bg-[#f6fafb] px-4 py-3 text-right">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#6e797b]">
                Giá từ
              </p>
              <p className="mt-1 text-xl font-black text-[#9b4500]">
                {formatMoney(tour.basePrice)}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <MiniInfo
              label="Khởi hành gần nhất"
              value={tour.nextDepartureDate || "Chưa có lịch"}
            />
            <MiniInfo label="Lịch khởi hành" value={tour.totalDepartures} />
            <MiniInfo
              label="Chỗ đã đặt"
              value={`${bookedSeats}/${maxSeats || tour.maxCapacity}`}
            />
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-xs font-bold text-[#6e797b]">
              <span>Tỷ lệ lấp đầy</span>
              <span>{tour.fillRate}%</span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-[#dfe3e4]">
              <div
                className={`h-full rounded-full ${getFillColor(tour.fillRate)}`}
                style={{ width: `${Math.min(tour.fillRate, 100)}%` }}
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2.5">
            <ActionButton icon={<Eye size={15} />} onClick={onView}>
              Xem
            </ActionButton>

            <ActionButton icon={<Edit3 size={15} />} onClick={onEdit}>
              Sửa
            </ActionButton>

            <ActionButton icon={<Settings size={15} />} onClick={onOperation}>
              Điều phối
            </ActionButton>

            <button
              type="button"
              disabled={actionLoading}
              onClick={onToggleStatus}
              className="flex items-center gap-2 rounded-full bg-[#ddf9ff] px-3.5 py-2 text-xs font-black text-[#00606c] transition hover:brightness-95 disabled:opacity-60"
            >
              {tour.status === "ACTIVE" ? (
                <>
                  <PauseCircle size={15} />
                  Tạm dừng
                </>
              ) : (
                <>
                  <CheckCircle2 size={15} />
                  Bật bán
                </>
              )}
            </button>

            <button
              type="button"
              disabled={actionLoading}
              onClick={onComplete}
              className="rounded-full bg-[#ffdad6] px-3.5 py-2 text-xs font-black text-[#ba1a1a] transition hover:brightness-95 disabled:opacity-60"
            >
              Kết thúc
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-[#f1f4f5] px-3 py-1 text-[11px] font-black text-[#3e494b]">
      {children}
    </span>
  );
}

function MiniInfo({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl bg-[#f6fafb] p-3">
      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#6e797b]">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-[#181c1d]">{value}</p>
    </div>
  );
}

function ActionButton({
  icon,
  onClick,
  children,
}: {
  icon: ReactNode;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-full border border-[#bdc8cb] bg-white px-3.5 py-2 text-xs font-black text-[#3e494b] transition hover:border-[#00606c] hover:bg-[#00606c] hover:text-white"
    >
      {icon}
      {children}
    </button>
  );
}

function TourFormModal({
  mode,
  form,
  actionLoading,
  onClose,
  onSubmit,
  updateForm,
}: {
  mode: "create" | "edit";
  form: TourFormState;
  actionLoading: boolean;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  updateForm: <K extends keyof TourFormState>(
    key: K,
    value: TourFormState[K]
  ) => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-6 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#ebeeef] bg-[#00606c] px-7 py-5 text-white">
          <div>
            <h2 className="text-2xl font-black">
              {mode === "create" ? "Tạo tour mới" : "Chỉnh sửa tour"}
            </h2>
            <p className="mt-1 text-sm font-semibold text-[#ddf9ff]">
              Cập nhật thông tin bán tour, giá, ảnh và dịch vụ.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="max-h-[76vh] overflow-y-auto p-7">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Input
              label="Mã tour"
              value={form.tourCode}
              onChange={(value) => updateForm("tourCode", value)}
              placeholder="Để trống sẽ tự tạo khi thêm mới"
            />

            <Input
              label="Tên tour"
              value={form.tourName}
              onChange={(value) => updateForm("tourName", value)}
              required
            />

            <SelectInput
              label="Loại tour"
              value={form.tourType}
              onChange={(value) => updateForm("tourType", value)}
              options={tourTypeOptions.filter((item) => item.value !== "ALL")}
            />

            <SelectInput
              label="Trạng thái"
              value={form.status}
              onChange={(value) => updateForm("status", value)}
              options={statusOptions.filter((item) => item.value !== "ALL")}
            />

            <Input
              label="Số ngày"
              type="number"
              value={form.durationDays}
              onChange={(value) => updateForm("durationDays", value)}
              required
            />

            <Input
              label="Số đêm"
              type="number"
              value={form.durationNights}
              onChange={(value) => updateForm("durationNights", value)}
            />

            <Input
              label="Phương tiện"
              value={form.transportType}
              onChange={(value) => updateForm("transportType", value)}
              placeholder="Máy bay, xe du lịch, tàu..."
            />

            <Input
              label="Sức chứa tối đa"
              type="number"
              value={form.maxCapacity}
              onChange={(value) => updateForm("maxCapacity", value)}
              required
            />

            <Input
              label="Giá người lớn"
              type="number"
              value={form.basePrice}
              onChange={(value) => updateForm("basePrice", value)}
              required
            />

            <Input
              label="Giá trẻ em"
              type="number"
              value={form.childPrice}
              onChange={(value) => updateForm("childPrice", value)}
            />

            <Input
              label="Ảnh đại diện tour"
              value={form.featuredImageUrl}
              onChange={(value) => updateForm("featuredImageUrl", value)}
              placeholder="https://..."
            />

            <label className="flex items-center gap-3 rounded-2xl bg-[#f6fafb] px-4 py-4">
              <input
                type="checkbox"
                checked={form.isFeatured}
                onChange={(event) =>
                  updateForm("isFeatured", event.target.checked)
                }
                className="h-5 w-5 rounded border-[#bdc8cb] text-[#00606c]"
              />
              <span className="text-sm font-black text-[#3e494b]">
                Đánh dấu tour nổi bật
              </span>
            </label>

            <Textarea
              label="Mô tả ngắn"
              value={form.shortDescription}
              onChange={(value) => updateForm("shortDescription", value)}
            />

            <Textarea
              label="Mô tả chi tiết"
              value={form.description}
              onChange={(value) => updateForm("description", value)}
            />

            <Textarea
              label="Dịch vụ bao gồm"
              value={form.includedServices}
              onChange={(value) => updateForm("includedServices", value)}
            />

            <Textarea
              label="Dịch vụ chưa bao gồm"
              value={form.excludedServices}
              onChange={(value) => updateForm("excludedServices", value)}
            />
          </div>

          <div className="mt-7 flex justify-end gap-3 border-t border-[#ebeeef] pt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[#bdc8cb] px-6 py-3 text-sm font-black text-[#3e494b]"
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={actionLoading}
              className="flex items-center gap-2 rounded-full bg-[#00606c] px-7 py-3 text-sm font-black text-white shadow-md disabled:opacity-60"
            >
              {actionLoading ? (
                <Loader2 className="animate-spin" size={17} />
              ) : (
                <Save size={17} />
              )}
              {mode === "create" ? "Tạo tour" : "Lưu thay đổi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TourDetailModal({
  detail,
  loading,
  onClose,
  onEdit,
  onOperation,
}: {
  detail: StaffTourDetailData | null;
  loading: boolean;
  onClose: () => void;
  onEdit: () => void;
  onOperation: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-6 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#ebeeef] bg-[#f6fafb] px-7 py-5">
          <div>
            <h2 className="text-2xl font-black text-[#00606c]">
              Chi tiết tour
            </h2>
            <p className="mt-1 text-sm font-semibold text-[#6e797b]">
              Lịch khởi hành, số chỗ, điều phối và lịch trình.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-[#ffdad6] hover:text-[#ba1a1a]"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[76vh] overflow-y-auto p-7">
          {loading || !detail ? (
            <div className="flex min-h-[360px] items-center justify-center">
              <Loader2 className="animate-spin text-[#00606c]" size={28} />
            </div>
          ) : (
            <TourDetailContent
              detail={detail}
              onEdit={onEdit}
              onOperation={onOperation}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function TourDetailContent({
  detail,
  onEdit,
  onOperation,
}: {
  detail: StaffTourDetailData;
  onEdit: () => void;
  onOperation: () => void;
}) {
  const { tour, departures, itineraryDays } = detail;

  return (
    <div className="space-y-7">
      <section className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="overflow-hidden rounded-[1.6rem] bg-[#f1f4f5]">
          <div className="aspect-[4/3] overflow-hidden">
            <img
              src={tour.featuredImageUrl || fallbackTourImage}
              alt={tour.tourName}
              className="h-full w-full object-cover"
            />
          </div>

          <div className="p-5">
            <span
              className={`inline-flex rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${getStatusClass(
                tour.status
              )}`}
            >
              {getStatusLabel(tour.status)}
            </span>

            <h3 className="mt-3 text-xl font-black text-[#00606c]">
              {tour.tourName}
            </h3>

            <p className="mt-2 text-sm font-semibold leading-6 text-[#6e797b]">
              {tour.shortDescription || "Chưa có mô tả ngắn."}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <InfoBox label="Mã tour" value={tour.tourCode} />
          <InfoBox label="Loại tour" value={tour.tourType} />
          <InfoBox
            label="Thời lượng"
            value={`${tour.durationDays} ngày ${tour.durationNights} đêm`}
          />
          <InfoBox label="Phương tiện" value={tour.transportType || "Chưa có"} />
          <InfoBox label="Điểm đến" value={tour.destinationName || "Chưa có"} />
          <InfoBox
            label="Khởi hành gần nhất"
            value={tour.nextDepartureDate || "Chưa có lịch"}
          />
          <InfoBox label="Giá người lớn" value={formatMoney(tour.basePrice)} />
          <InfoBox label="Giá trẻ em" value={formatMoney(tour.childPrice)} />
          <InfoBox
            label="Chỗ đã đặt"
            value={`${tour.totalBookedSeats}/${
              tour.totalMaxSeats || tour.maxCapacity
            }`}
          />
          <InfoBox label="Tỷ lệ lấp đầy" value={`${tour.fillRate}%`} />
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center gap-2 rounded-full bg-[#00606c] px-5 py-3 text-sm font-black text-white"
        >
          <Edit3 size={17} />
          Chỉnh sửa tour
        </button>

        <button
          type="button"
          onClick={onOperation}
          className="flex items-center gap-2 rounded-full bg-[#fc8a40] px-5 py-3 text-sm font-black text-white"
        >
          <Settings size={17} />
          Điều phối tour
        </button>
      </div>

      <section className="rounded-[1.6rem] bg-[#f6fafb] p-5">
        <h4 className="mb-4 flex items-center gap-2 text-lg font-black text-[#00606c]">
          <CalendarDays size={20} />
          Lịch khởi hành
        </h4>

        <div className="space-y-3">
          {departures.length === 0 ? (
            <div className="rounded-2xl bg-white p-5 text-sm font-semibold text-[#6e797b]">
              Chưa có lịch khởi hành.
            </div>
          ) : (
            departures.map((item) => (
              <div
                key={item.id}
                className="grid gap-3 rounded-2xl bg-white p-4 text-sm md:grid-cols-5"
              >
                <b className="text-[#00606c]">{item.departureCode}</b>
                <span>{item.startDate || "Chưa có ngày"}</span>
                <span>{item.endDate || "Chưa có ngày"}</span>
                <span className="font-black">
                  {item.bookedSeats}/{item.maxSeats} chỗ
                </span>
                <span>{item.guideName || "Chưa phân công HDV"}</span>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-[1.6rem] bg-[#f6fafb] p-5">
        <h4 className="mb-4 flex items-center gap-2 text-lg font-black text-[#00606c]">
          <Route size={20} />
          Lịch trình tour
        </h4>

        <div className="space-y-3">
          {itineraryDays.length === 0 ? (
            <div className="rounded-2xl bg-white p-5 text-sm font-semibold text-[#6e797b]">
              Chưa có lịch trình chi tiết.
            </div>
          ) : (
            itineraryDays.map((day) => (
              <div key={day.id} className="rounded-2xl bg-white p-5">
                <p className="text-sm font-black text-[#00606c]">
                  Ngày {day.dayNo}: {day.title || "Chưa có tiêu đề"}
                </p>

                <p className="mt-2 text-sm leading-6 text-[#3e494b]">
                  {day.description || "Chưa có mô tả."}
                </p>

                {day.overnightLocation && (
                  <p className="mt-2 text-xs font-bold text-[#9b4500]">
                    Nghỉ đêm: {day.overnightLocation}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-[#00606c]">
        {label}
      </span>

      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-2xl border border-[#dfe3e4] bg-[#f6fafb] px-4 text-sm font-semibold outline-none focus:ring-2 focus:ring-[#00606c]/30"
      />
    </label>
  );
}

function SelectInput({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-[#00606c]">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-2xl border border-[#dfe3e4] bg-[#f6fafb] px-4 text-sm font-semibold outline-none focus:ring-2 focus:ring-[#00606c]/30"
      >
        {options.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Textarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-[#00606c]">
        {label}
      </span>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="w-full resize-none rounded-2xl border border-[#dfe3e4] bg-[#f6fafb] px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-[#00606c]/30"
      />
    </label>
  );
}

function InfoBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-[#f6fafb] p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#6e797b]">
        {label}
      </p>

      <p className="mt-1 text-sm font-black text-[#181c1d]">{value}</p>
    </div>
  );
}