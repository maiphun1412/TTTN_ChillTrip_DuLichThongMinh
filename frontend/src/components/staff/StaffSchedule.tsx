"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Edit3,
  Loader2,
  PauseCircle,
  Plane,
  Plus,
  RefreshCcw,
  Search,
  Ticket,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import {
  deleteStaffScheduleApi,
  getStaffSchedulesApi,
  saveStaffScheduleApi,
  updateStaffScheduleStatusApi,
  type StaffScheduleItem,
  type StaffScheduleOption,
  type StaffSchedulePayload,
} from "@/lib/api/staff.api";

const statusOptions = [
  { label: "Tất cả", value: "ALL" },
  { label: "Đang mở", value: "OPEN" },
  { label: "Đã đầy", value: "FULL" },
  { label: "Đã đóng", value: "CLOSED" },
  { label: "Đã hủy", value: "CANCELLED" },
];

type FormState = {
  id?: string;
  tourId: string;
  departureCode: string;
  startDate: string;
  endDate: string;
  maxSeats: string;
  availableSeats: string;
  bookedSeats: string;
  bookingStatus: string;
  guideId: string;
  notes: string;
};

type ScheduleGroup = {
  tourId: string;
  tourCode: string;
  tourName: string;
  tourImage: string | null;
  schedules: StaffScheduleItem[];
  totalMaxSeats: number;
  totalBookedSeats: number;
  totalAvailableSeats: number;
};

const fallbackTourImage =
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=900&auto=format&fit=crop";

function emptyForm(tourId = ""): FormState {
  return {
    tourId,
    departureCode: "",
    startDate: "",
    endDate: "",
    maxSeats: "20",
    availableSeats: "20",
    bookedSeats: "0",
    bookingStatus: "OPEN",
    guideId: "",
    notes: "",
  };
}

function formFromSchedule(item: StaffScheduleItem): FormState {
  return {
    id: item.id,
    tourId: item.tourId,
    departureCode: item.departureCode,
    startDate: item.startDate,
    endDate: item.endDate,
    maxSeats: String(item.maxSeats),
    availableSeats: String(item.availableSeats),
    bookedSeats: String(item.bookedSeats),
    bookingStatus: item.bookingStatus,
    guideId: item.guideId || "",
    notes: item.notes || "",
  };
}

function getStatusLabel(status: string) {
  switch (status) {
    case "OPEN":
      return "Đang mở";
    case "FULL":
      return "Đã đầy";
    case "CLOSED":
      return "Đã đóng";
    case "CANCELLED":
      return "Đã hủy";
    default:
      return status || "Chưa rõ";
  }
}

function getStatusClass(status: string) {
  switch (status) {
    case "OPEN":
      return "bg-emerald-100 text-emerald-700";
    case "FULL":
      return "bg-amber-100 text-amber-700";
    case "CLOSED":
      return "bg-slate-100 text-slate-700";
    case "CANCELLED":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getFillRate(booked: number, max: number) {
  if (max <= 0) return 0;
  return Math.round((booked / max) * 1000) / 10;
}

function getFillColor(fillRate: number) {
  if (fillRate >= 90) return "bg-red-600";
  if (fillRate >= 60) return "bg-[#fc8a40]";
  return "bg-[#00606c]";
}

export default function StaffSchedule() {
  const [schedules, setSchedules] = useState<StaffScheduleItem[]>([]);
  const [tours, setTours] = useState<StaffScheduleOption[]>([]);
  const [guides, setGuides] = useState<StaffScheduleOption[]>([]);
  const [summary, setSummary] = useState({
    totalSchedules: 0,
    openSchedules: 0,
    fullSchedules: 0,
    cancelledSchedules: 0,
  });

  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [selectedGroup, setSelectedGroup] = useState<ScheduleGroup | null>(null);
  const [openDetail, setOpenDetail] = useState(false);

  const [openForm, setOpenForm] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState<FormState>(emptyForm());

  const groupedSchedules = useMemo(() => {
    const map = new Map<string, ScheduleGroup>();

    schedules.forEach((item) => {
      if (!map.has(item.tourId)) {
        map.set(item.tourId, {
          tourId: item.tourId,
          tourCode: item.tourCode,
          tourName: item.tourName,
          tourImage: item.tourImage,
          schedules: [],
          totalMaxSeats: 0,
          totalBookedSeats: 0,
          totalAvailableSeats: 0,
        });
      }

      const group = map.get(item.tourId)!;
      group.schedules.push(item);
      group.totalMaxSeats += item.maxSeats;
      group.totalBookedSeats += item.bookedSeats;
      group.totalAvailableSeats += item.availableSeats;
    });

    return Array.from(map.values());
  }, [schedules]);

  const selectedStatusText = useMemo(() => {
    return statusOptions.find((item) => item.value === status)?.label || "Tất cả";
  }, [status]);

  async function loadSchedules(options?: {
    nextKeyword?: string;
    nextStatus?: string;
  }) {
    try {
      setLoading(true);
      setErrorMessage("");

      const result = await getStaffSchedulesApi({
        keyword: options?.nextKeyword ?? keyword,
        status: options?.nextStatus ?? status,
      });

      setSchedules(result.schedules);
      setTours(result.tours);
      setGuides(result.guides);
      setSummary(result.summary);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Không tải được lịch khởi hành"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSchedules({ nextStatus: status });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadSchedules({ nextKeyword: keyword });
    }, 350);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword]);

  useEffect(() => {
    if (!selectedGroup) return;

    const freshGroup = groupedSchedules.find(
      (item) => item.tourId === selectedGroup.tourId
    );

    if (freshGroup) {
      setSelectedGroup(freshGroup);
    }
  }, [groupedSchedules, selectedGroup]);

  function openGroupDetail(group: ScheduleGroup) {
    setSelectedGroup(group);
    setOpenDetail(true);
  }

  function openCreateModal(tourId = "") {
    setFormMode("create");
    setForm(emptyForm(tourId));
    setOpenForm(true);
  }

  function openEditModal(item: StaffScheduleItem) {
    setFormMode("edit");
    setForm(formFromSchedule(item));
    setOpenForm(true);
  }

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setActionLoading(true);

      const payload: StaffSchedulePayload = {
        id: form.id,
        tourId: form.tourId,
        departureCode: form.departureCode.trim(),
        startDate: form.startDate,
        endDate: form.endDate,
        maxSeats: Number(form.maxSeats),
        availableSeats: Number(form.availableSeats),
        bookedSeats: Number(form.bookedSeats),
        bookingStatus: form.bookingStatus,
        guideId: form.guideId || undefined,
        notes: form.notes.trim(),
      };

      await saveStaffScheduleApi(payload);

      alert(
        formMode === "create"
          ? "Tạo lịch khởi hành thành công."
          : "Cập nhật lịch khởi hành thành công."
      );

      setOpenForm(false);
      setForm(emptyForm());
      await loadSchedules();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Không lưu được lịch.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleChangeStatus(item: StaffScheduleItem, nextStatus: string) {
    const ok = confirm(
      `Cập nhật lịch ${item.departureCode} thành "${getStatusLabel(nextStatus)}"?`
    );

    if (!ok) return;

    try {
      setActionLoading(true);
      await updateStaffScheduleStatusApi(item.id, nextStatus);
      alert("Cập nhật trạng thái lịch thành công.");
      await loadSchedules();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Không cập nhật được trạng thái lịch."
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete(item: StaffScheduleItem) {
    const ok = confirm(`Xóa lịch khởi hành ${item.departureCode}?`);
    if (!ok) return;

    try {
      setActionLoading(true);
      await deleteStaffScheduleApi(item.id);
      alert("Xóa lịch khởi hành thành công.");
      await loadSchedules();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Không xóa được lịch.");
    } finally {
      setActionLoading(false);
    }
  }

  function resetFilters() {
    setKeyword("");
    setStatus("ALL");
    loadSchedules({
      nextKeyword: "",
      nextStatus: "ALL",
    });
  }

  if (loading && schedules.length === 0) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="flex items-center gap-3 rounded-[2rem] bg-white px-6 py-4 shadow-sm">
          <Loader2 className="animate-spin text-[#00606c]" size={22} />
          <span className="font-semibold text-[#00606c]">
            Đang tải lịch khởi hành...
          </span>
        </div>
      </div>
    );
  }

  if (errorMessage && schedules.length === 0) {
    return (
      <div className="rounded-[2rem] border border-red-200 bg-white p-6 text-red-700 shadow-sm">
        <div className="mb-2 flex items-center gap-2 font-bold">
          <AlertCircle size={20} />
          Không tải được dữ liệu
        </div>

        <p className="text-sm">{errorMessage}</p>

        <button
          type="button"
          onClick={() => loadSchedules()}
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

        <div className="relative z-10 flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#ddf9ff]">
              <CalendarDays size={13} />
              ChillTrip Schedule
            </span>

            <h1 className="mt-3 text-3xl font-black tracking-[-0.045em] md:text-4xl">
              Lịch khởi hành
            </h1>

            <p className="mt-2 max-w-2xl text-xs font-semibold leading-5 text-[#ddf9ff] md:text-sm">
              Mỗi tour là một ô riêng. Nhấn vào tour để xem, thêm, sửa hoặc xóa lịch khởi hành.
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
              onClick={() => openCreateModal()}
              className="flex items-center gap-2 rounded-full bg-[#fc8a40] px-5 py-2.5 text-xs font-black text-white shadow-md transition hover:scale-105"
            >
              <Plus size={16} />
              Tạo lịch mới
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<CalendarDays size={23} />}
          label="Tổng lịch"
          value={summary.totalSchedules}
          note="Trong hệ thống"
        />
        <StatCard
          icon={<CheckCircle2 size={23} />}
          label="Đang mở"
          value={summary.openSchedules}
          note="Có thể đặt"
        />
        <StatCard
          icon={<Ticket size={23} />}
          label="Đã đầy"
          value={summary.fullSchedules}
          note="Hết chỗ"
        />
        <StatCard
          icon={<Plane size={23} />}
          label="Đã hủy"
          value={summary.cancelledSchedules}
          note="Không chạy"
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
              placeholder="Tìm mã khởi hành, tên tour, HDV..."
            />
          </div>

          <div className="flex items-center gap-2 rounded-full bg-[#f6fafb] px-4 py-2 text-xs font-black text-[#00606c]">
            Trạng thái: {selectedStatusText}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {statusOptions.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setStatus(item.value)}
              className={`rounded-full px-3.5 py-2 text-xs font-black transition ${
                status === item.value
                  ? "bg-[#00606c] text-white shadow-sm"
                  : "bg-[#f1f4f5] text-[#3e494b] hover:bg-[#ddf9ff] hover:text-[#00606c]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {groupedSchedules.length === 0 ? (
          <div className="rounded-[1.6rem] bg-white p-10 text-center shadow-sm ring-1 ring-[#ebeeef] md:col-span-2 xl:col-span-3">
            <CalendarDays className="mx-auto mb-4 text-[#6e797b]" size={38} />
            <p className="font-black text-[#181c1d]">Không tìm thấy lịch</p>
            <p className="mt-2 text-sm text-[#6e797b]">
              Thử đổi bộ lọc hoặc tạo lịch khởi hành mới.
            </p>
          </div>
        ) : (
          groupedSchedules.map((group) => (
            <TourScheduleCard
              key={group.tourId}
              group={group}
              onView={() => openGroupDetail(group)}
              onAdd={() => openCreateModal(group.tourId)}
            />
          ))
        )}
      </section>

      {openDetail && selectedGroup && (
        <ScheduleDetailModal
          group={selectedGroup}
          actionLoading={actionLoading}
          onClose={() => setOpenDetail(false)}
          onAdd={() => openCreateModal(selectedGroup.tourId)}
          onEdit={openEditModal}
          onDelete={handleDelete}
          onOpen={(item) => handleChangeStatus(item, "OPEN")}
          onCloseSchedule={(item) => handleChangeStatus(item, "CLOSED")}
          onCancel={(item) => handleChangeStatus(item, "CANCELLED")}
        />
      )}

      {openForm && (
        <ScheduleFormModal
          mode={formMode}
          form={form}
          tours={tours}
          guides={guides}
          actionLoading={actionLoading}
          onClose={() => {
            if (!actionLoading) setOpenForm(false);
          }}
          onSubmit={handleSave}
          updateForm={updateForm}
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
    <div className="rounded-[1.4rem] bg-white p-4 shadow-sm ring-1 ring-[#ebeeef]">
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

function TourScheduleCard({
  group,
  onView,
  onAdd,
}: {
  group: ScheduleGroup;
  onView: () => void;
  onAdd: () => void;
}) {
  const fillRate = getFillRate(group.totalBookedSeats, group.totalMaxSeats);

  return (
    <article className="overflow-hidden rounded-[1.5rem] bg-white shadow-sm ring-1 ring-[#ebeeef] transition hover:-translate-y-0.5 hover:shadow-md">
      <button type="button" onClick={onView} className="block w-full text-left">
        <div className="relative h-36 overflow-hidden bg-[#dfe3e4]">
          <img
            src={group.tourImage || fallbackTourImage}
            alt={group.tourName}
            className="h-full w-full object-cover transition duration-500 hover:scale-105"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

          <div className="absolute bottom-4 left-4 right-4 text-white">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/75">
              {group.tourCode}
            </p>
            <h3 className="mt-1 line-clamp-2 text-lg font-black leading-tight">
              {group.tourName}
            </h3>
          </div>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-3 gap-2">
            <MiniInfo label="Lịch" value={group.schedules.length} />
            <MiniInfo label="Đã đặt" value={group.totalBookedSeats} />
            <MiniInfo label="Còn trống" value={group.totalAvailableSeats} />
          </div>

          <div className="mt-4">
            <div className="mb-2 flex justify-between text-xs font-bold text-[#6e797b]">
              <span>Lấp đầy</span>
              <span>{fillRate}%</span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-[#dfe3e4]">
              <div
                className={`h-full rounded-full ${getFillColor(fillRate)}`}
                style={{ width: `${Math.min(fillRate, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </button>

      <div className="flex gap-2 border-t border-[#ebeeef] bg-[#f6fafb] p-3">
        <button
          type="button"
          onClick={onView}
          className="flex-1 rounded-full bg-[#00606c] px-3 py-2 text-xs font-black text-white"
        >
          Xem lịch
        </button>

        <button
          type="button"
          onClick={onAdd}
          className="flex-1 rounded-full bg-[#fc8a40] px-3 py-2 text-xs font-black text-white"
        >
          Thêm lịch
        </button>
      </div>
    </article>
  );
}

function ScheduleDetailModal({
  group,
  actionLoading,
  onClose,
  onAdd,
  onEdit,
  onDelete,
  onOpen,
  onCloseSchedule,
  onCancel,
}: {
  group: ScheduleGroup;
  actionLoading: boolean;
  onClose: () => void;
  onAdd: () => void;
  onEdit: (item: StaffScheduleItem) => void;
  onDelete: (item: StaffScheduleItem) => void;
  onOpen: (item: StaffScheduleItem) => void;
  onCloseSchedule: (item: StaffScheduleItem) => void;
  onCancel: (item: StaffScheduleItem) => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-6 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <div className="flex flex-col gap-4 border-b border-[#ebeeef] bg-[#00606c] px-7 py-5 text-white md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#ddf9ff]">
              {group.tourCode}
            </p>

            <h2 className="mt-1 text-2xl font-black">{group.tourName}</h2>

            <p className="mt-1 text-sm font-semibold text-[#ddf9ff]">
              {group.schedules.length} lịch khởi hành • {group.totalBookedSeats}
              /{group.totalMaxSeats} chỗ đã đặt
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onAdd}
              className="flex items-center gap-2 rounded-full bg-[#fc8a40] px-5 py-2.5 text-xs font-black text-white"
            >
              <Plus size={15} />
              Thêm lịch
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="max-h-[74vh] overflow-y-auto p-5">
          <div className="grid gap-3">
            {group.schedules.map((item) => (
              <ScheduleLine
                key={item.id}
                item={item}
                actionLoading={actionLoading}
                onEdit={() => onEdit(item)}
                onDelete={() => onDelete(item)}
                onOpen={() => onOpen(item)}
                onCloseSchedule={() => onCloseSchedule(item)}
                onCancel={() => onCancel(item)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ScheduleLine({
  item,
  actionLoading,
  onEdit,
  onDelete,
  onOpen,
  onCloseSchedule,
  onCancel,
}: {
  item: StaffScheduleItem;
  actionLoading: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onOpen: () => void;
  onCloseSchedule: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="rounded-[1.3rem] border border-[#ebeeef] bg-white p-4">
      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr_1fr_auto] xl:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-black text-[#00606c]">{item.departureCode}</p>

            <span
              className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${getStatusClass(
                item.bookingStatus
              )}`}
            >
              {getStatusLabel(item.bookingStatus)}
            </span>
          </div>

          <p className="mt-1 text-sm font-semibold text-[#6e797b]">
            {item.startDate} - {item.endDate}
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-[#f6fafb] p-3">
          <UserRound size={18} className="text-[#00606c]" />

          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#6e797b]">
              Hướng dẫn viên
            </p>

            <p className="text-sm font-black text-[#181c1d]">
              {item.guideName || "Chưa phân công"}
            </p>
          </div>
        </div>

        <div>
          <div className="mb-2 flex justify-between text-xs font-bold text-[#6e797b]">
            <span>
              {item.bookedSeats}/{item.maxSeats} chỗ
            </span>
            <span>{item.fillRate}%</span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-[#dfe3e4]">
            <div
              className={`h-full rounded-full ${getFillColor(item.fillRate)}`}
              style={{ width: `${Math.min(item.fillRate, 100)}%` }}
            />
          </div>

          <p className="mt-1 text-xs font-semibold text-[#6e797b]">
            Còn trống: {item.availableSeats}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 xl:justify-end">
          <button
            type="button"
            onClick={onEdit}
            className="flex items-center gap-2 rounded-full border border-[#bdc8cb] bg-white px-3.5 py-2 text-xs font-black text-[#3e494b] transition hover:border-[#00606c] hover:bg-[#00606c] hover:text-white"
          >
            <Edit3 size={15} />
            Sửa
          </button>

          <button
            type="button"
            disabled={actionLoading}
            onClick={onOpen}
            className="rounded-full bg-[#ddf9ff] px-3.5 py-2 text-xs font-black text-[#00606c] disabled:opacity-60"
          >
            Mở
          </button>

          <button
            type="button"
            disabled={actionLoading}
            onClick={onCloseSchedule}
            className="rounded-full bg-[#f1f4f5] px-3.5 py-2 text-xs font-black text-[#3e494b] disabled:opacity-60"
          >
            Đóng
          </button>

          <button
            type="button"
            disabled={actionLoading}
            onClick={onCancel}
            className="rounded-full bg-[#ffdad6] px-3.5 py-2 text-xs font-black text-[#ba1a1a] disabled:opacity-60"
          >
            Hủy
          </button>

          <button
            type="button"
            disabled={actionLoading}
            onClick={onDelete}
            className="flex items-center gap-2 rounded-full bg-red-600 px-3.5 py-2 text-xs font-black text-white disabled:opacity-60"
          >
            <Trash2 size={14} />
            Xóa
          </button>
        </div>
      </div>
    </div>
  );
}

function MiniInfo({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-[#f6fafb] p-3">
      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#6e797b]">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-[#181c1d]">{value}</p>
    </div>
  );
}

function ScheduleFormModal({
  mode,
  form,
  tours,
  guides,
  actionLoading,
  onClose,
  onSubmit,
  updateForm,
}: {
  mode: "create" | "edit";
  form: FormState;
  tours: StaffScheduleOption[];
  guides: StaffScheduleOption[];
  actionLoading: boolean;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  updateForm: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-6 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#ebeeef] bg-[#00606c] px-7 py-5 text-white">
          <div>
            <h2 className="text-2xl font-black">
              {mode === "create" ? "Thêm lịch khởi hành" : "Sửa lịch khởi hành"}
            </h2>

            <p className="mt-1 text-sm font-semibold text-[#ddf9ff]">
              Chọn tour, ngày đi, số chỗ và hướng dẫn viên phụ trách.
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
            <label className="block md:col-span-2">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-[#00606c]">
                Tour
              </span>

              <select
                value={form.tourId}
                onChange={(event) => updateForm("tourId", event.target.value)}
                required
                className="h-12 w-full rounded-2xl border border-[#dfe3e4] bg-[#f6fafb] px-4 text-sm font-semibold outline-none focus:ring-2 focus:ring-[#00606c]/30"
              >
                <option value="">Chọn tour</option>
                {tours.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <Input
              label="Mã khởi hành"
              value={form.departureCode}
              onChange={(value) => updateForm("departureCode", value)}
              required
              placeholder="VD: DEP2026001"
            />

            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-[#00606c]">
                Hướng dẫn viên
              </span>

              <select
                value={form.guideId}
                onChange={(event) => updateForm("guideId", event.target.value)}
                className="h-12 w-full rounded-2xl border border-[#dfe3e4] bg-[#f6fafb] px-4 text-sm font-semibold outline-none focus:ring-2 focus:ring-[#00606c]/30"
              >
                <option value="">Chưa phân công</option>
                {guides.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <Input
              label="Ngày khởi hành"
              type="date"
              value={form.startDate}
              onChange={(value) => updateForm("startDate", value)}
              required
            />

            <Input
              label="Ngày kết thúc"
              type="date"
              value={form.endDate}
              onChange={(value) => updateForm("endDate", value)}
              required
            />

            <Input
              label="Số chỗ tối đa"
              type="number"
              value={form.maxSeats}
              onChange={(value) => updateForm("maxSeats", value)}
              required
            />

            <Input
              label="Đã đặt"
              type="number"
              value={form.bookedSeats}
              onChange={(value) => updateForm("bookedSeats", value)}
              required
            />

            <Input
              label="Còn trống"
              type="number"
              value={form.availableSeats}
              onChange={(value) => updateForm("availableSeats", value)}
              required
            />

            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-[#00606c]">
                Trạng thái
              </span>

              <select
                value={form.bookingStatus}
                onChange={(event) =>
                  updateForm("bookingStatus", event.target.value)
                }
                className="h-12 w-full rounded-2xl border border-[#dfe3e4] bg-[#f6fafb] px-4 text-sm font-semibold outline-none focus:ring-2 focus:ring-[#00606c]/30"
              >
                <option value="OPEN">Đang mở</option>
                <option value="FULL">Đã đầy</option>
                <option value="CLOSED">Đã đóng</option>
                <option value="CANCELLED">Đã hủy</option>
              </select>
            </label>

            <label className="block md:col-span-2">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-[#00606c]">
                Ghi chú
              </span>

              <textarea
                value={form.notes}
                onChange={(event) => updateForm("notes", event.target.value)}
                rows={4}
                className="w-full resize-none rounded-2xl border border-[#dfe3e4] bg-[#f6fafb] px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-[#00606c]/30"
              />
            </label>
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
                <Plus size={17} />
              )}
              {mode === "create" ? "Thêm lịch" : "Lưu thay đổi"}
            </button>
          </div>
        </form>
      </div>
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