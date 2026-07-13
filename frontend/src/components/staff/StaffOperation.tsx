"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bus,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileText,
  Headphones,
  Hotel,
  Loader2,
  Mail,
  Plane,
  RefreshCcw,
  Send,
  X,
} from "lucide-react";
import {
  completeStaffOperationTaskApi,
  getStaffOperationApi,
  sendStaffOperationNoticeApi,
  type StaffOperationData,
  type StaffOperationIncident,
  type StaffOperationTask,
  type StaffUpcomingDeparture,
} from "@/lib/api/staff.api";

type NoticeForm = {
  title: string;
  content: string;
  targetRole: "ALL" | "STAFF" | "GUIDE" | "ADMIN";
};

function emptyNoticeForm(): NoticeForm {
  return {
    title: "",
    content: "",
    targetRole: "ALL",
  };
}

function getTaskIcon(icon: StaffOperationTask["icon"]) {
  if (icon === "BUS") return Bus;
  if (icon === "HOTEL") return Hotel;
  if (icon === "MAIL") return Mail;
  if (icon === "DOC") return FileText;
  if (icon === "BOOKING") return ClipboardCheck;
  return ClipboardCheck;
}

function getTaskColor(icon: StaffOperationTask["icon"]) {
  if (icon === "MAIL") return "bg-[#b3ebff]/40 text-[#006074]";
  if (icon === "DOC") return "bg-[#ffdad6]/50 text-[#ba1a1a]";
  if (icon === "BOOKING") return "bg-[#ffdbc9]/50 text-[#9b4500]";
  return "bg-[#9defff]/40 text-[#00606c]";
}

function getOperationStatusLabel(status: string | null) {
  if (!status) return "Chưa tạo vận hành";
  if (status === "PREPARING") return "Đang chuẩn bị";
  if (status === "PROCESSING") return "Đang xử lý";
  if (status === "READY") return "Sẵn sàng";
  if (status === "COMPLETED") return "Hoàn tất";
  return status;
}

export default function StaffOperation() {
  const [data, setData] = useState<StaffOperationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [showAllTasks, setShowAllTasks] = useState(false);
  const [openNotice, setOpenNotice] = useState(false);
  const [noticeForm, setNoticeForm] = useState<NoticeForm>(emptyNoticeForm());

  const tasksToShow = useMemo(() => {
    if (!data) return [];
    return showAllTasks ? data.tasks : data.tasks.slice(0, 5);
  }, [data, showAllTasks]);

  async function loadOperation() {
    try {
      setLoading(true);
      setErrorMessage("");

      const result = await getStaffOperationApi();
      setData(result);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Không tải được vận hành tour"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOperation();
  }, []);

  function updateNotice<K extends keyof NoticeForm>(
    key: K,
    value: NoticeForm[K]
  ) {
    setNoticeForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function handleCompleteTask(task: StaffOperationTask) {
    const ok = confirm(`Xử lý tác vụ: ${task.title}?`);
    if (!ok) return;

    try {
      setActionLoading(true);

      await completeStaffOperationTaskApi({
        taskType: task.taskType,
        refId: task.refId,
      });

      alert("Đã xử lý tác vụ.");
      await loadOperation();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Không xử lý được tác vụ.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSendNotice(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setActionLoading(true);

      await sendStaffOperationNoticeApi(noticeForm);

      alert("Đã tạo thông báo khẩn.");
      setOpenNotice(false);
      setNoticeForm(emptyNoticeForm());
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Không tạo được thông báo khẩn."
      );
    } finally {
      setActionLoading(false);
    }
  }

  if (loading && !data) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="flex items-center gap-3 rounded-[2rem] bg-white px-6 py-4 shadow-sm">
          <Loader2 className="animate-spin text-[#00606c]" size={22} />
          <span className="font-semibold text-[#00606c]">
            Đang tải dữ liệu vận hành...
          </span>
        </div>
      </div>
    );
  }

  if (errorMessage && !data) {
    return (
      <div className="rounded-2xl border border-red-200 bg-white p-6 text-red-700">
        <p className="font-black">Không tải được dữ liệu</p>
        <p className="mt-2 text-sm">{errorMessage}</p>
        <button
          type="button"
          onClick={loadOperation}
          className="mt-4 rounded-full bg-[#00606c] px-5 py-2 text-sm font-black text-white"
        >
          Tải lại
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="w-full space-y-8 pb-12">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-[#00606c]">
            Cổng nhân viên
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight text-[#181c1d]">
            Vận hành tour
          </h1>
          <p className="mt-2 max-w-2xl text-[#3e494b]">
            Theo dõi công việc điều hành, xử lý yêu cầu phát sinh, phối hợp hướng
            dẫn viên và chuẩn bị tour trước ngày khởi hành.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={loadOperation}
            className="flex w-fit items-center gap-2 rounded-full bg-white px-6 py-3 text-xs font-bold text-[#00606c] shadow-sm transition hover:scale-105"
          >
            <RefreshCcw size={18} />
            Làm mới
          </button>

          <button
            type="button"
            onClick={() => setOpenNotice(true)}
            className="flex w-fit items-center gap-2 rounded-full bg-gradient-to-r from-[#9b4500] to-[#fc8a40] px-6 py-3 text-xs font-bold text-white shadow-lg shadow-[#9b4500]/20 transition hover:scale-105"
          >
            <Send size={18} />
            Tạo thông báo khẩn
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <StatCard
          title="Tác vụ hôm nay"
          value={String(data.summary.todayTasks)}
          note={`${data.summary.urgentTasks} tác vụ ưu tiên`}
          icon={<ClipboardCheck size={22} />}
          iconClass="bg-[#9defff]/40 text-[#00606c]"
        />

        <StatCard
          title="Tour sắp khởi hành"
          value={String(data.summary.upcomingTours)}
          note="Trong 24h tới"
          icon={<Plane size={22} />}
          iconClass="bg-[#ffdbc9]/50 text-[#9b4500]"
        />

        <StatCard
          title="Yêu cầu hỗ trợ"
          value={String(data.summary.supportRequests)}
          note="Hủy tour / phát sinh"
          icon={<Headphones size={22} />}
          iconClass="bg-[#ffdad6]/50 text-[#ba1a1a]"
        />

        <StatCard
          title="Email cần gửi lại"
          value={String(data.summary.pendingEmails)}
          note="Booking + thông báo tour"
          icon={<Mail size={22} />}
          iconClass="bg-[#b3ebff]/40 text-[#006074]"
        />
      </section>

      <section className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-[#181c1d]">
                  Công việc vận hành cần xử lý
                </h2>
                <p className="text-sm text-[#3e494b]">
                  Ưu tiên các tác vụ ảnh hưởng đến tour sắp khởi hành.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAllTasks((prev) => !prev)}
                className="rounded-full bg-[#f1f4f5] px-4 py-2 text-xs font-bold text-[#00606c]"
              >
                {showAllTasks ? "Thu gọn" : "Xem tất cả"}
              </button>
            </div>

            <div className="space-y-4">
              {tasksToShow.length === 0 ? (
                <div className="rounded-2xl bg-[#f1f4f5] p-6 text-sm font-semibold text-[#6e797b]">
                  Hiện không có tác vụ vận hành cần xử lý.
                </div>
              ) : (
                tasksToShow.map((task) => (
                  <TaskCard
                    key={`${task.taskType}-${task.refId}`}
                    task={task}
                    loading={actionLoading}
                    onComplete={() => handleCompleteTask(task)}
                  />
                ))
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl bg-white shadow-sm">
            <div className="border-b border-[#ebeeef] p-6">
              <h2 className="text-xl font-bold text-[#181c1d]">
                Tour sắp khởi hành
              </h2>
              <p className="text-sm text-[#3e494b]">
                Kiểm tra checklist trước khi tour bắt đầu.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[920px] w-full text-left">
                <thead>
                  <tr className="bg-[#f1f4f5]/60">
                    <TableHead>Mã lịch</TableHead>
                    <TableHead>Tên tour</TableHead>
                    <TableHead>Khởi hành</TableHead>
                    <TableHead>HDV</TableHead>
                    <TableHead>Khách</TableHead>
                    <TableHead>Tiến độ</TableHead>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#ebeeef]">
                  {data.upcomingTours.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-10 text-center text-sm font-semibold text-[#6e797b]"
                      >
                        Chưa có tour sắp khởi hành.
                      </td>
                    </tr>
                  ) : (
                    data.upcomingTours.map((tour) => (
                      <UpcomingTourRow key={tour.id} tour={tour} />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <IncidentsBox incidents={data.incidents} />

          <ChecklistBox tours={data.upcomingTours} />

          <div className="rounded-xl bg-[#f1f4f5] p-6">
            <h2 className="mb-3 text-sm font-bold">Lưu ý vận hành</h2>
            <ul className="list-disc space-y-2 pl-4 text-[11px] leading-relaxed text-[#3e494b]">
              <li>
                Cập nhật dữ liệu tour ngay khi lịch trình hoặc dịch vụ thay đổi.
              </li>
              <li>Booking chờ xác nhận quá 24h cần liên hệ lại khách hàng.</li>
              <li>
                Mọi yêu cầu hoàn tiền phải đối chiếu với trạng thái thanh toán.
              </li>
              <li>Trước ngày khởi hành cần rà soát email, HDV và logistics.</li>
            </ul>
          </div>
        </aside>
      </section>

      {openNotice && (
        <NoticeModal
          form={noticeForm}
          loading={actionLoading}
          updateForm={updateNotice}
          onClose={() => setOpenNotice(false)}
          onSubmit={handleSendNotice}
        />
      )}
    </div>
  );
}

function TaskCard({
  task,
  loading,
  onComplete,
}: {
  task: StaffOperationTask;
  loading: boolean;
  onComplete: () => void;
}) {
  const Icon = getTaskIcon(task.icon);
  const colorClass = getTaskColor(task.icon);

  return (
    <div className="group flex items-center gap-4 rounded-2xl border border-[#bdc8cb]/10 p-4 transition hover:bg-[#f1f4f5]/60">
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${colorClass}`}
      >
        <Icon size={22} />
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="font-bold text-[#181c1d]">{task.title}</h3>
        <p className="text-sm text-[#3e494b]">
          {task.tourName || task.customerName || "Tác vụ vận hành"}
        </p>
        {task.customerName && (
          <p className="text-xs font-semibold text-[#00606c]">
            Khách: {task.customerName}
          </p>
        )}
      </div>

      <div className="text-right">
        <p className="text-xs font-bold text-[#9b4500]">{task.status}</p>
        <p className="text-[11px] text-[#3e494b]">
          {task.deadline ? `Hạn: ${task.deadline}` : "Chưa có hạn"}
        </p>
      </div>

      <button
        type="button"
        disabled={loading}
        onClick={onComplete}
        className="rounded-full bg-[#00606c] px-4 py-2 text-xs font-bold text-white opacity-100 transition disabled:opacity-60 lg:opacity-0 lg:group-hover:opacity-100"
      >
        Xử lý
      </button>
    </div>
  );
}

function UpcomingTourRow({ tour }: { tour: StaffUpcomingDeparture }) {
  return (
    <tr className="transition hover:bg-[#f1f4f5]/40">
      <td className="px-6 py-4 font-mono text-xs font-bold text-[#00606c]">
        {tour.departureCode}
      </td>

      <td className="px-6 py-4 text-sm font-bold text-[#181c1d]">
        {tour.tourName}
      </td>

      <td className="px-6 py-4 text-xs text-[#3e494b]">
        {tour.startDate || "Chưa có"} - {tour.endDate || "Chưa có"}
      </td>

      <td className="px-6 py-4 text-xs font-bold">
        {tour.guideName || "Chưa phân công"}
      </td>

      <td className="px-6 py-4 text-xs text-[#3e494b]">
        {tour.bookedSeats}/{tour.maxSeats}
      </td>

      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="h-2 w-24 overflow-hidden rounded-full bg-[#ebeeef]">
            <div
              className="h-full rounded-full bg-[#00606c]"
              style={{ width: `${tour.readyPercent}%` }}
            />
          </div>
          <span className="text-xs font-bold text-[#00606c]">
            {tour.readyPercent}%
          </span>
        </div>
        <p className="mt-1 text-[10px] font-semibold text-[#6e797b]">
          {getOperationStatusLabel(tour.operationStatus)}
        </p>
      </td>
    </tr>
  );
}

function IncidentsBox({
  incidents,
}: {
  incidents: StaffOperationIncident[];
}) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#181c1d]">Yêu cầu phát sinh</h2>
        <AlertTriangle size={22} className="text-[#9b4500]" />
      </div>

      <div className="space-y-4">
        {incidents.length === 0 ? (
          <div className="rounded-xl bg-[#f1f4f5] p-4 text-sm font-semibold text-[#6e797b]">
            Không có yêu cầu phát sinh.
          </div>
        ) : (
          incidents.slice(0, 6).map((item) => (
            <div
              key={`${item.type}-${item.id}`}
              className="rounded-xl bg-[#f1f4f5] p-4 transition hover:bg-[#ebeeef]"
            >
              <span className="mb-2 inline-block rounded-full bg-white px-3 py-1 text-[10px] font-bold uppercase text-[#00606c]">
                {item.type}
              </span>
              <h3 className="text-sm font-bold text-[#181c1d]">{item.title}</h3>
              <p className="mt-1 text-xs text-[#3e494b]">{item.desc}</p>
              <p className="mt-2 text-[10px] font-semibold text-[#6e797b]">
                {item.createdAt || ""}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ChecklistBox({ tours }: { tours: StaffUpcomingDeparture[] }) {
  const firstTour = tours[0];

  return (
    <div className="rounded-xl bg-[#00606c] p-6 text-white">
      <h2 className="mb-2 text-lg font-bold">Checklist trước khởi hành</h2>
      <p className="mb-5 text-xs text-[#ddf9ff]">
        Dựa trên tour sắp khởi hành gần nhất.
      </p>

      {!firstTour ? (
        <div className="rounded-xl bg-white/10 p-3 text-sm font-semibold">
          Chưa có tour sắp khởi hành để rà soát.
        </div>
      ) : (
        <div className="space-y-3">
          <ChecklistItem
            done={firstTour.bookedSeats > 0}
            label="Xác nhận danh sách khách"
          />
          <ChecklistItem
            done={firstTour.readyPercent >= 60}
            label="Kiểm tra thanh toán/công nợ"
          />
          <ChecklistItem
            done={!!firstTour.guideName}
            label="Phân công hướng dẫn viên"
          />
          <ChecklistItem
            done={firstTour.pickupCount > 0}
            label="Xác nhận điểm đón/trả"
          />
          <ChecklistItem
            done={firstTour.operationStatus === "READY"}
            label="Hoàn tất logistics cuối cùng"
          />
        </div>
      )}
    </div>
  );
}

function NoticeModal({
  form,
  loading,
  updateForm,
  onClose,
  onSubmit,
}: {
  form: NoticeForm;
  loading: boolean;
  updateForm: <K extends keyof NoticeForm>(key: K, value: NoticeForm[K]) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-6 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-[#00606c] px-7 py-5 text-white">
          <div>
            <h2 className="text-2xl font-black">Tạo thông báo khẩn</h2>
            <p className="mt-1 text-sm font-semibold text-[#ddf9ff]">
              Gửi thông báo cho nhân viên, quản lý hoặc hướng dẫn viên.
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

        <form onSubmit={onSubmit} className="space-y-5 p-7">
          <Input
            label="Tiêu đề"
            value={form.title}
            onChange={(value) => updateForm("title", value)}
            required
          />

          <label className="block">
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-[#00606c]">
              Đối tượng nhận
            </span>

            <select
              value={form.targetRole}
              onChange={(event) =>
                updateForm("targetRole", event.target.value as NoticeForm["targetRole"])
              }
              className="h-12 w-full rounded-2xl border border-[#dfe3e4] bg-[#f6fafb] px-4 text-sm font-semibold outline-none"
            >
              <option value="ALL">Tất cả vận hành</option>
              <option value="STAFF">Nhân viên</option>
              <option value="GUIDE">Hướng dẫn viên</option>
              <option value="ADMIN">Quản lý</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-[#00606c]">
              Nội dung
            </span>

            <textarea
              value={form.content}
              required
              onChange={(event) => updateForm("content", event.target.value)}
              rows={6}
              className="w-full resize-none rounded-2xl border border-[#dfe3e4] bg-[#f6fafb] px-4 py-3 text-sm font-semibold outline-none"
              placeholder="Ví dụ: Tour Đà Nẵng ngày mai đổi giờ đón khách..."
            />
          </label>

          <div className="flex justify-end gap-3 border-t border-[#ebeeef] pt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[#bdc8cb] px-6 py-3 text-sm font-black text-[#3e494b]"
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-full bg-[#00606c] px-7 py-3 text-sm font-black text-white disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={17} />
              ) : (
                <Send size={17} />
              )}
              Gửi thông báo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  note,
  icon,
  iconClass,
}: {
  title: string;
  value: string;
  note: string;
  icon: React.ReactNode;
  iconClass: string;
}) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-start justify-between">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-full ${iconClass}`}
        >
          {icon}
        </div>
        <Clock3 size={18} className="text-[#6e797b]" />
      </div>

      <p className="text-[11px] font-bold uppercase tracking-wider text-[#3e494b]">
        {title}
      </p>
      <h3 className="mt-1 text-3xl font-black text-[#181c1d]">{value}</h3>
      <p className="mt-2 text-xs text-[#3e494b]">{note}</p>
    </div>
  );
}

function TableHead({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#3e494b]">
      {children}
    </th>
  );
}

function ChecklistItem({ label, done }: { label: string; done?: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/10 p-3">
      {done ? (
        <CheckCircle2 size={18} className="text-[#9defff]" />
      ) : (
        <Clock3 size={18} className="text-white/70" />
      )}
      <span className="text-sm font-semibold">{label}</span>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
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
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-2xl border border-[#dfe3e4] bg-[#f6fafb] px-4 text-sm font-semibold outline-none"
      />
    </label>
  );
}