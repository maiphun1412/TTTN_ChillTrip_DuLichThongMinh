"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Edit,
  FileUp,
  Languages,
  Lock,
  LockOpen,
  MapPinned,
  RefreshCcw,
  ShieldCheck,
  Star,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";

const API_BASE_URL = "/backend-api";

type Role = {
  id: string | number;
  code: string;
  name: string;
  description?: string | null;
};

type AdminUser = {
  id: string | number;
  role_id: string | number;
  email?: string | null;
  phone?: string | null;
  full_name: string;
  avatar_url?: string | null;
  status: string;
  last_login_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  roles?: Role;
  employees?: any;
  tour_guides?: any;
};

type ScheduleItem = {
  id: string | number;
  departureCode?: string;
  title: string;
  tourCode?: string;
  startDate: string;
  endDate: string;
  bookingStatus?: string;
  notes?: string | null;
  type: "TOUR";
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("vi-VN");
}

function formatDateInput(value?: string | null) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function getInitials(name?: string | null) {
  if (!name) return "US";

  return name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function getRoleLabel(code?: string) {
  switch (code) {
    case "ADMIN":
      return "Quản trị viên";
    case "STAFF":
      return "Nhân viên";
    case "GUIDE":
      return "Hướng dẫn viên";
    default:
      return code || "-";
  }
}

function getStatusLabel(status?: string) {
  switch (status) {
    case "ACTIVE":
      return "Đang làm việc";
    case "LOCKED":
      return "Đã khóa";
    case "INACTIVE":
      return "Ngưng hoạt động";
    default:
      return status || "-";
  }
}

function getStatusClass(status?: string) {
  switch (status) {
    case "ACTIVE":
      return "bg-[#9defff] text-[#001f24]";
    case "LOCKED":
      return "bg-[#ffdad6] text-[#ba1a1a]";
    case "INACTIVE":
      return "bg-[#dfe3e4] text-[#3e494b]";
    default:
      return "bg-[#dfe3e4] text-[#3e494b]";
  }
}

function getEmployeeCode(user?: AdminUser | null) {
  if (!user) return "-";
  if (user.employees?.employee_code) return user.employees.employee_code;
  if (user.tour_guides?.guide_code) return user.tour_guides.guide_code;
  return `USR-${user.id}`;
}

function getDepartment(user?: AdminUser | null) {
  if (!user) return "-";
  if (user.employees?.department) return user.employees.department;
  if (user.tour_guides?.region) return `Khu vực ${user.tour_guides.region}`;
  return getRoleLabel(user.roles?.code);
}

function getPosition(user?: AdminUser | null) {
  if (!user) return "-";
  if (user.employees?.position_name) return user.employees.position_name;
  if (user.tour_guides) return "Hướng dẫn viên";
  return getRoleLabel(user.roles?.code);
}

function getRoleIcon(code?: string) {
  switch (code) {
    case "ADMIN":
      return ShieldCheck;
    case "STAFF":
      return BriefcaseBusiness;
    case "GUIDE":
      return MapPinned;
    default:
      return UserRound;
  }
}

export default function AdminUserDetail() {
  const router = useRouter();
  const params = useParams();

  const id = String(params?.id || "");

  const [user, setUser] = useState<AdminUser | null>(null);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);

  const roleCode = user?.roles?.code;
  const RoleIcon = getRoleIcon(roleCode);

  const guideSchedules = useMemo(() => {
    if (roleCode !== "GUIDE") return [];
    return schedules;
  }, [roleCode, schedules]);

  async function loadSchedules(userId: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/schedules`, {
        cache: "no-store",
        credentials: "include",
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || json?.success === false) {
        setSchedules([]);
        return;
      }

      setSchedules(json?.data || []);
    } catch (error) {
      console.error("LOAD_GUIDE_SCHEDULES_ERROR:", error);
      setSchedules([]);
    }
  }

  async function loadDetail() {
    if (!id) return;

    try {
      setLoading(true);

      const res = await fetch(`${API_BASE_URL}/admin/users/${id}`, {
        cache: "no-store",
        credentials: "include",
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || json?.success === false) {
        alert(json?.message || "Không thể lấy chi tiết nhân sự");
        router.push("/admin/users");
        return;
      }

      const nextUser = json?.data || null;
      setUser(nextUser);

      if (nextUser?.roles?.code === "GUIDE") {
        await loadSchedules(id);
      } else {
        setSchedules([]);
      }
    } catch (error) {
      console.error("LOAD_ADMIN_USER_DETAIL_ERROR:", error);
      alert("Không thể lấy chi tiết nhân sự");
      router.push("/admin/users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDetail();
  }, [id]);

  async function handleChangeStatus(nextStatus: string) {
    if (!user) return;

    const ok = confirm(
      `Bạn có chắc muốn ${
        nextStatus === "LOCKED" ? "khóa" : "mở khóa"
      } tài khoản ${user.full_name}?`
    );

    if (!ok) return;

    try {
      const res = await fetch(`${API_BASE_URL}/admin/users/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          fullName: user.full_name,
          email: user.email || "",
          phone: user.phone || "",
          password: "",
          roleCode: user.roles?.code || "STAFF",
          status: nextStatus,

          gender: user.employees?.gender || "",
          dateOfBirth: formatDateInput(user.employees?.date_of_birth),
          citizenId: user.employees?.citizen_id || "",
          employeeAddress: user.employees?.address || "",

          department: user.employees?.department || "",
          positionName: user.employees?.position_name || "",
          hireDate: formatDateInput(user.employees?.hire_date),

          region: user.tour_guides?.region || "",
          languages: user.tour_guides?.languages || "",
          experienceYears: String(user.tour_guides?.experience_years || 0),
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || json?.success === false) {
        alert(json?.message || "Cập nhật trạng thái thất bại");
        return;
      }

      await loadDetail();
    } catch (error) {
      console.error("CHANGE_USER_STATUS_ERROR:", error);
      alert("Không thể cập nhật trạng thái");
    }
  }

  async function handleDelete() {
    if (!user) return;

    const ok = confirm(`Bạn có chắc muốn xóa tài khoản ${user.full_name}?`);

    if (!ok) return;

    try {
      const res = await fetch(`${API_BASE_URL}/admin/users/${user.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || json?.success === false) {
        alert(json?.message || "Xóa tài khoản thất bại");
        return;
      }

      router.push("/admin/users");
      router.refresh();
    } catch (error) {
      console.error("DELETE_ADMIN_USER_ERROR:", error);
      alert("Không thể xóa tài khoản");
    }
  }

  if (loading) {
    return (
      <div className="rounded-[2.5rem] bg-white p-12 text-center shadow-xl shadow-[#00606c]/5">
        <RefreshCcw className="mx-auto mb-4 animate-spin text-[#00606c]" />
        <p className="text-sm font-black text-[#00606c]">
          Đang tải chi tiết nhân sự...
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-[2.5rem] bg-white p-12 text-center shadow-xl shadow-[#00606c]/5">
        <p className="text-sm font-black text-[#6e797b]">
          Không tìm thấy nhân sự.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#6e797b]">
            <span>Nhân sự</span>
            <span>/</span>
            <span className="text-[#00606c]">Chi tiết</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-[#9defff] text-2xl font-black text-[#00606c]">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.full_name}
                  className="h-full w-full rounded-[1.5rem] object-cover"
                />
              ) : (
                getInitials(user.full_name)
              )}
            </div>

            <div>
              <h1 className="text-4xl font-black tracking-tight text-[#00606c]">
                {user.full_name}
              </h1>
              <p className="mt-1 text-sm font-semibold text-[#3e494b]">
                Mã nhân sự:{" "}
                <span className="font-black text-[#00606c]">
                  {getEmployeeCode(user)}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-black ${getStatusClass(
              user.status
            )}`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                user.status === "ACTIVE"
                  ? "bg-teal-600"
                  : user.status === "LOCKED"
                  ? "bg-[#ba1a1a]"
                  : "bg-[#6e797b]"
              }`}
            />
            {getStatusLabel(user.status)}
          </span>

          <button
            onClick={() => router.push("/admin/users")}
            className="inline-flex items-center gap-2 rounded-full bg-[#f1f4f5] px-5 py-3 font-black text-[#00606c] transition hover:bg-[#dfe3e4]"
          >
            <ArrowLeft size={18} />
            Quay lại
          </button>

          <button
            onClick={() => router.push(`/admin/users/${user.id}/edit`)}
            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 font-black text-[#00606c] shadow-sm transition hover:bg-[#9defff]/30"
          >
            <Edit size={18} />
            Chỉnh sửa
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <StatCard
          title={roleCode === "GUIDE" ? "Tour sắp phụ trách" : "Vai trò"}
          value={roleCode === "GUIDE" ? guideSchedules.length : getRoleLabel(roleCode)}
          desc={
            roleCode === "GUIDE"
              ? "Lịch phân công thực tế"
              : "Nhóm quyền hiện tại"
          }
          icon={RoleIcon}
          tone="primary"
        />

        <StatCard
          title="Trạng thái"
          value={getStatusLabel(user.status)}
          desc="Tình trạng tài khoản"
          icon={BadgeCheck}
          tone="secondary"
        />

        <StatCard
          title="Đăng nhập cuối"
          value={formatDate(user.last_login_at)}
          desc="Lịch sử truy cập"
          icon={CheckCircle2}
          tone="tertiary"
        />
      </section>

      <section className="grid grid-cols-1 gap-8 xl:grid-cols-[1fr_380px]">
        <div className="space-y-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <InfoCard
              title="Thông tin cá nhân"
              icon={UserRound}
              items={[
                { label: "Họ tên", value: user.full_name },
                { label: "Email", value: user.email || "-" },
                { label: "Số điện thoại", value: user.phone || "-" },
                { label: "Ngày sinh", value: formatDate(user.employees?.date_of_birth) },
                { label: "Giới tính", value: user.employees?.gender || "-" },
                { label: "CCCD", value: user.employees?.citizen_id || "-" },
                {
                  label: "Địa chỉ thường trú",
                  value: user.employees?.address || "-",
                },
                { label: "Ngày tạo", value: formatDate(user.created_at) },
                { label: "Cập nhật cuối", value: formatDate(user.updated_at) },
              ]}
            />

            <InfoCard
              title="Chi tiết công việc"
              icon={BriefcaseBusiness}
              items={[
                { label: "Mã nhân sự", value: getEmployeeCode(user) },
                { label: "Vai trò", value: getRoleLabel(roleCode) },
                { label: "Phòng ban / Khu vực", value: getDepartment(user) },
                { label: "Chức vụ", value: getPosition(user) },
                {
                  label: "Ngày vào làm",
                  value: formatDate(user.employees?.hire_date),
                },
                ...(roleCode === "GUIDE"
                  ? [
                      {
                        label: "Kinh nghiệm",
                        value: `${user.tour_guides?.experience_years || 0} năm`,
                      },
                    ]
                  : []),
              ]}
            />
          </div>

          {roleCode === "GUIDE" && (
            <GuideProfileSection user={user} schedules={guideSchedules} />
          )}

          {roleCode === "ADMIN" && <AdminPermissionSection />}

          {roleCode === "STAFF" && <StaffOperationSection user={user} />}
        </div>

        <aside className="space-y-8">
          <SchedulePanel roleCode={roleCode} schedules={guideSchedules} />

          <ActionPanel
            user={user}
            onEdit={() => router.push(`/admin/users/${user.id}/edit`)}
            onDelete={handleDelete}
            onChangeStatus={handleChangeStatus}
          />
        </aside>
      </section>
    </div>
  );
}

function GuideProfileSection({
  user,
  schedules,
}: {
  user: AdminUser;
  schedules: ScheduleItem[];
}) {
  const languages = String(user.tour_guides?.languages || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return (
    <section className="rounded-[2.5rem] border border-[#bdc8cb]/10 bg-white p-8 shadow-xl shadow-[#00606c]/5">
      <SectionHeading
        icon={Languages}
        title="Năng lực hướng dẫn viên"
        desc="Thông tin chuyên môn và lịch tour được phân công thực tế."
      />

      <div className="flex flex-wrap gap-3">
        {(languages.length ? languages : ["Tiếng Việt"]).map((item) => (
          <span
            key={item}
            className="inline-flex items-center gap-2 rounded-full bg-[#007b8a] px-4 py-2 text-sm font-bold text-white"
          >
            <Languages size={16} />
            {item}
          </span>
        ))}

        <span className="inline-flex items-center gap-2 rounded-full bg-[#f1f4f5] px-4 py-2 text-sm font-bold text-[#3e494b]">
          <Star size={16} />
          {user.tour_guides?.experience_years || 0} năm kinh nghiệm
        </span>

        <span className="inline-flex items-center gap-2 rounded-full bg-[#f1f4f5] px-4 py-2 text-sm font-bold text-[#3e494b]">
          <MapPinned size={16} />
          {user.tour_guides?.region || "Chưa cập nhật khu vực"}
        </span>
      </div>

      <div className="mt-8 grid gap-4">
        {schedules.length === 0 ? (
          <div className="rounded-[1.5rem] bg-[#f6fafb] p-5 text-sm font-bold text-[#6e797b]">
            Hướng dẫn viên chưa có lịch tour được phân công.
          </div>
        ) : (
          schedules.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-4 rounded-[1.5rem] bg-[#f6fafb] p-5"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#9defff] text-[#00606c]">
                <CalendarDays size={20} />
              </div>

              <div>
                <p className="font-black text-[#181c1d]">{item.title}</p>
                <p className="mt-1 text-sm font-semibold text-[#3e494b]">
                  {formatDate(item.startDate)} - {formatDate(item.endDate)}
                </p>
                <p className="mt-1 text-xs font-medium text-[#6e797b]">
                  {item.departureCode || item.tourCode || "Chưa có mã"} •{" "}
                  {item.bookingStatus || "OPEN"}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function AdminPermissionSection() {
  return (
    <section className="rounded-[2.5rem] border border-[#bdc8cb]/10 bg-white p-8 shadow-xl shadow-[#00606c]/5">
      <SectionHeading
        icon={ShieldCheck}
        title="Quyền quản trị"
        desc="Tài khoản admin có quyền cấu hình, quản lý nhân sự và kiểm soát hệ thống."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <PermissionBox title="Quản lý nhân sự" />
        <PermissionBox title="Quản lý tour" />
        <PermissionBox title="Quản lý đặt chỗ" />
        <PermissionBox title="Báo cáo hệ thống" />
        <PermissionBox title="Cấu hình phân quyền" />
        <PermissionBox title="Theo dõi vận hành" />
      </div>
    </section>
  );
}

function StaffOperationSection({ user }: { user: AdminUser }) {
  return (
    <section className="rounded-[2.5rem] border border-[#bdc8cb]/10 bg-white p-8 shadow-xl shadow-[#00606c]/5">
      <SectionHeading
        icon={Users}
        title="Thông tin vận hành"
        desc="Tài khoản nhân viên dùng cho các nghiệp vụ điều hành và hỗ trợ khách hàng."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <InfoMiniBox label="Phòng ban" value={user.employees?.department || "-"} />
        <InfoMiniBox
          label="Chức vụ"
          value={user.employees?.position_name || "Nhân viên"}
        />
        <InfoMiniBox
          label="Ngày vào làm"
          value={formatDate(user.employees?.hire_date)}
        />
        <InfoMiniBox label="Trạng thái hồ sơ" value="Đang theo dõi" />
      </div>
    </section>
  );
}

function SchedulePanel({
  roleCode,
  schedules,
}: {
  roleCode?: string;
  schedules: ScheduleItem[];
}) {
  const days = Array.from({ length: 31 }, (_, index) => index + 1);

  const activeDays = schedules.flatMap((item) => {
    const start = new Date(item.startDate);
    const end = new Date(item.endDate);
    const result: number[] = [];

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return result;
    }

    const current = new Date(start);

    while (current <= end) {
      result.push(current.getDate());
      current.setDate(current.getDate() + 1);
    }

    return result;
  });

  return (
    <section className="rounded-[2.5rem] border border-[#bdc8cb]/10 bg-white p-7 shadow-xl shadow-[#00606c]/5">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-xl font-black text-[#00606c]">
          <CalendarDays size={22} />
          Lịch làm việc
        </h3>
      </div>

      {roleCode === "GUIDE" ? (
        <>
          <p className="mb-5 text-center text-sm font-black text-[#3e494b]">
            Lịch tour được phân công
          </p>

          <div className="grid grid-cols-7 gap-2 text-center">
            {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day) => (
              <div
                key={day}
                className="text-[10px] font-black uppercase text-[#6e797b]"
              >
                {day}
              </div>
            ))}

            {days.map((day) => {
              const active = activeDays.includes(day);

              return (
                <div
                  key={day}
                  className={`relative flex aspect-square items-center justify-center rounded-full text-xs font-bold ${
                    active
                      ? "bg-[#00606c] text-white"
                      : "text-[#3e494b] hover:bg-[#f1f4f5]"
                  }`}
                >
                  {day}
                  {active && (
                    <span className="absolute bottom-1 h-1 w-1 rounded-full bg-[#9defff]" />
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-6 space-y-3 border-t border-[#bdc8cb]/20 pt-5">
            <Legend color="bg-[#00606c]" label="Ngày có lịch tour" />
            <Legend color="bg-[#6e797b]" label="Ngày trống lịch" />
          </div>
        </>
      ) : (
        <div className="rounded-[1.75rem] bg-[#f6fafb] p-6 text-center">
          <CalendarDays className="mx-auto mb-3 text-[#00606c]" size={34} />
          <p className="text-sm font-black text-[#181c1d]">
            Chưa áp dụng lịch riêng
          </p>
          <p className="mt-2 text-xs font-semibold leading-relaxed text-[#6e797b]">
            Lịch làm việc chi tiết hiện chỉ dùng cho hướng dẫn viên theo lịch
            phân công tour. Admin và nhân viên được quản lý theo phòng ban/chức
            vụ.
          </p>
        </div>
      )}
    </section>
  );
}

function ActionPanel({
  user,
  onEdit,
  onDelete,
  onChangeStatus,
}: {
  user: AdminUser;
  onEdit: () => void;
  onDelete: () => void;
  onChangeStatus: (nextStatus: string) => void;
}) {
  return (
    <section className="rounded-[2.5rem] border-2 border-dashed border-[#00606c]/20 bg-[#00606c]/5 p-7">
      <FileUp className="mx-auto mb-4 text-[#00606c]" size={38} />

      <h4 className="text-center text-lg font-black text-[#00606c]">
        Thao tác hồ sơ
      </h4>

      <p className="mt-2 text-center text-xs font-semibold leading-relaxed text-[#6e797b]">
        Cập nhật thông tin, khóa tài khoản hoặc xóa hồ sơ nhân sự khỏi hệ thống.
      </p>

      <div className="mt-6 grid gap-3">
        <button
          onClick={onEdit}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#00606c] px-5 py-3 text-sm font-black text-white"
        >
          <Edit size={17} />
          Chỉnh sửa hồ sơ
        </button>

        {user.status === "LOCKED" ? (
          <button
            onClick={() => onChangeStatus("ACTIVE")}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black text-[#00606c]"
          >
            <LockOpen size={17} />
            Mở khóa tài khoản
          </button>
        ) : (
          <button
            onClick={() => onChangeStatus("LOCKED")}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#ffdad6] px-5 py-3 text-sm font-black text-[#ba1a1a]"
          >
            <Lock size={17} />
            Khóa tài khoản
          </button>
        )}

        <button
          onClick={onDelete}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#ba1a1a] px-5 py-3 text-sm font-black text-white"
        >
          <Trash2 size={17} />
          Xóa tài khoản
        </button>
      </div>
    </section>
  );
}

function StatCard({
  title,
  value,
  desc,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string | number;
  desc: string;
  icon: any;
  tone: "primary" | "secondary" | "tertiary";
}) {
  const styles = {
    primary: "bg-[#9defff]/40 text-[#00606c]",
    secondary: "bg-[#ffdbc9]/50 text-[#9b4500]",
    tertiary: "bg-[#b3ebff]/50 text-[#006074]",
  }[tone];

  return (
    <div className="flex items-center gap-5 rounded-[2rem] border border-[#bdc8cb]/10 bg-white p-6 shadow-sm">
      <div
        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${styles}`}
      >
        <Icon size={26} />
      </div>

      <div>
        <p className="text-xs font-black uppercase tracking-widest text-[#6e797b]">
          {title}
        </p>
        <p className="mt-1 text-2xl font-black text-[#00606c]">{value}</p>
        <p className="text-xs font-semibold text-[#6e797b]">{desc}</p>
      </div>
    </div>
  );
}

function InfoCard({
  title,
  icon: Icon,
  items,
}: {
  title: string;
  icon: any;
  items: { label: string; value: string }[];
}) {
  return (
    <section className="relative overflow-hidden rounded-[2.5rem] border border-[#bdc8cb]/10 bg-white p-8 shadow-xl shadow-[#00606c]/5">
      <div className="absolute right-[-44px] top-[-44px] h-32 w-32 rounded-full bg-[#00606c]/5" />

      <h3 className="relative z-10 mb-6 flex items-center gap-2 text-xl font-black text-[#00606c]">
        <Icon size={22} />
        {title}
      </h3>

      <div className="relative z-10 grid gap-4">
        {items.map((item) => (
          <InfoRow key={item.label} label={item.label} value={item.value} />
        ))}
      </div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-wider text-[#6e797b]">
        {label}
      </p>
      <p className="mt-1 font-bold text-[#181c1d]">{value}</p>
    </div>
  );
}

function SectionHeading({
  icon: Icon,
  title,
  desc,
}: {
  icon: any;
  title: string;
  desc: string;
}) {
  return (
    <div className="mb-6 flex items-start gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#9defff] text-[#00606c]">
        <Icon size={21} />
      </div>

      <div>
        <h3 className="text-xl font-black text-[#00606c]">{title}</h3>
        <p className="mt-1 text-sm font-semibold text-[#6e797b]">{desc}</p>
      </div>
    </div>
  );
}

function PermissionBox({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 rounded-[1.5rem] bg-[#f6fafb] p-4">
      <CheckCircle2 className="text-teal-600" size={19} />
      <span className="text-sm font-black text-[#181c1d]">{title}</span>
    </div>
  );
}

function InfoMiniBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] bg-[#f6fafb] p-5">
      <p className="text-xs font-black uppercase tracking-wider text-[#6e797b]">
        {label}
      </p>
      <p className="mt-1 font-black text-[#181c1d]">{value}</p>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-3 text-xs font-black uppercase tracking-wider text-[#3e494b]">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      {label}
    </div>
  );
}