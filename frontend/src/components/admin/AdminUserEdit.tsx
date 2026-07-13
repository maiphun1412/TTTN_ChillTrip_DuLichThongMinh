"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Eye,
  EyeOff,
  KeyRound,
  Save,
  UserRound,
} from "lucide-react";

const API_BASE_URL = "/backend-api";

type RoleCode = "ADMIN" | "STAFF" | "GUIDE";

type UserForm = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  roleCode: RoleCode;
  status: "ACTIVE" | "LOCKED" | "INACTIVE";

  gender: string;
  dateOfBirth: string;
  citizenId: string;
  employeeAddress: string;

  department: string;
  positionName: string;
  hireDate: string;

  region: string;
  languages: string;
  experienceYears: string;
};

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

function getEmployeeCode(user: any) {
  if (user?.employees?.employee_code) return user.employees.employee_code;
  if (user?.tour_guides?.guide_code) return user.tour_guides.guide_code;
  return user?.id ? `USR-${user.id}` : "-";
}

export default function AdminUserEdit() {
  const router = useRouter();
  const params = useParams();
  const id = String(params?.id || "");

  const [form, setForm] = useState<UserForm | null>(null);
  const [employeeCode, setEmployeeCode] = useState("-");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function updateForm<K extends keyof UserForm>(key: K, value: UserForm[K]) {
    setForm((prev) => {
      if (!prev) return prev;

      const next = { ...prev, [key]: value };

      if (key === "roleCode") {
        if (value === "ADMIN") {
          next.department = "Quản trị hệ thống";
          next.positionName = "Quản trị viên";
          next.region = "";
          next.languages = "";
          next.experienceYears = "0";
        }

        if (value === "STAFF") {
          next.department = "Điều hành";
          next.positionName = "Nhân viên";
          next.region = "";
          next.languages = "";
          next.experienceYears = "0";
        }

        if (value === "GUIDE") {
          next.department = "";
          next.positionName = "";
          next.hireDate = "";
        }
      }

      return next;
    });
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

      const user = json?.data;

      setEmployeeCode(getEmployeeCode(user));

      setForm({
        fullName: user?.full_name || "",
        email: user?.email || "",
        phone: user?.phone || "",
        password: "",
        roleCode: (user?.roles?.code || "STAFF") as RoleCode,
        status: user?.status || "ACTIVE",

        gender: user?.employees?.gender || "",
        dateOfBirth: formatDateInput(user?.employees?.date_of_birth),
        citizenId: user?.employees?.citizen_id || "",
        employeeAddress: user?.employees?.address || "",

        department: user?.employees?.department || "",
        positionName: user?.employees?.position_name || "",
        hireDate: formatDateInput(user?.employees?.hire_date),

        region: user?.tour_guides?.region || "",
        languages: user?.tour_guides?.languages || "",
        experienceYears: String(user?.tour_guides?.experience_years || 0),
      });
    } catch (error) {
      console.error("LOAD_ADMIN_USER_EDIT_ERROR:", error);
      alert("Không thể lấy chi tiết nhân sự");
      router.push("/admin/users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDetail();
  }, [id]);

  async function handleSave() {
    if (!form) return;

    if (!form.fullName.trim()) {
      alert("Vui lòng nhập họ tên");
      return;
    }

    if (!form.email.trim() && !form.phone.trim()) {
      alert("Phải có email hoặc số điện thoại");
      return;
    }

    if (form.password.trim() && form.password.trim().length < 6) {
      alert("Mật khẩu tối thiểu 6 ký tự");
      return;
    }

    try {
      setSaving(true);

      const res = await fetch(`${API_BASE_URL}/admin/users/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          password: form.password,
          roleCode: form.roleCode,
          status: form.status,

          gender: form.gender,
          dateOfBirth: form.dateOfBirth,
          citizenId: form.citizenId,
          employeeAddress: form.employeeAddress,

          department: form.department,
          positionName: form.positionName,
          hireDate: form.hireDate,

          region: form.region,
          languages: form.languages,
          experienceYears: form.experienceYears,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || json?.success === false) {
        alert(json?.message || "Cập nhật nhân sự thất bại");
        return;
      }

      alert("Cập nhật nhân sự thành công");
      router.push(`/admin/users/${id}`);
      router.refresh();
    } catch (error) {
      console.error("UPDATE_ADMIN_USER_ERROR:", error);
      alert("Không thể cập nhật nhân sự");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !form) {
    return (
      <div className="rounded-[2.5rem] bg-white p-12 text-center shadow-xl shadow-[#00606c]/5">
        <p className="text-sm font-black text-[#00606c]">
          Đang tải thông tin chỉnh sửa...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-28">
      <section className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#6e797b]">
            <span>Nhân sự</span>
            <span>/</span>
            <span className="text-[#00606c]">Chỉnh sửa</span>
          </div>

          <h1 className="text-3xl font-black tracking-tight text-[#00606c]">
            Chỉnh sửa thông tin nhân sự
          </h1>

          <p className="mt-2 max-w-2xl text-[#3e494b]">
            Cập nhật hồ sơ, vai trò và trạng thái tài khoản nhân sự.
          </p>
        </div>

        <button
          onClick={() => router.push(`/admin/users/${id}`)}
          className="inline-flex w-fit items-center gap-2 rounded-full bg-[#f1f4f5] px-6 py-3 font-black text-[#00606c] transition hover:bg-[#dfe3e4]"
        >
          <ArrowLeft size={18} />
          Quay lại
        </button>
      </section>

      <section className="grid grid-cols-1 gap-8 xl:grid-cols-[1fr_380px]">
        <div className="space-y-8">
          <FormCard icon={UserRound} title="Thông tin cá nhân">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <InputField
                  label="Họ và tên"
                  value={form.fullName}
                  onChange={(value) => updateForm("fullName", value)}
                />
              </div>

              <InputField
                label="Email công việc"
                type="email"
                value={form.email}
                onChange={(value) => updateForm("email", value)}
              />

              <InputField
                label="Số điện thoại"
                value={form.phone}
                onChange={(value) => updateForm("phone", value)}
              />

              <InputField
                label="Ngày sinh"
                type="date"
                value={form.dateOfBirth}
                onChange={(value) => updateForm("dateOfBirth", value)}
              />

              <div>
                <label className="mb-2 block text-[11px] font-extrabold uppercase tracking-widest text-[#6e797b]">
                  Giới tính
                </label>
                <select
                  value={form.gender}
                  onChange={(e) => updateForm("gender", e.target.value)}
                  className="h-12 w-full rounded-2xl border-none bg-[#f1f4f5] px-5 text-sm font-semibold text-[#181c1d] outline-none focus:ring-2 focus:ring-[#00606c]"
                >
                  <option value="">Chọn giới tính</option>
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>

              <InputField
                label="Số CCCD / Hộ chiếu"
                value={form.citizenId}
                onChange={(value) => updateForm("citizenId", value)}
              />

              <InputField
                label="Địa chỉ thường trú"
                value={form.employeeAddress}
                onChange={(value) => updateForm("employeeAddress", value)}
              />
            </div>
          </FormCard>

          <FormCard icon={BriefcaseBusiness} title="Chi tiết công việc">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <InputField
                label="Mã nhân sự"
                value={employeeCode}
                readOnly
                onChange={() => {}}
              />

              <div>
                <label className="mb-2 block text-[11px] font-extrabold uppercase tracking-widest text-[#6e797b]">
                  Vai trò
                </label>
                <select
                  value={form.roleCode}
                  onChange={(e) =>
                    updateForm("roleCode", e.target.value as RoleCode)
                  }
                  className="h-12 w-full rounded-2xl border-none bg-[#f1f4f5] px-5 text-sm font-semibold text-[#181c1d] outline-none focus:ring-2 focus:ring-[#00606c]"
                >
                  <option value="ADMIN">Admin</option>
                  <option value="STAFF">Nhân viên</option>
                  <option value="GUIDE">Hướng dẫn viên</option>
                </select>
              </div>

              {(form.roleCode === "ADMIN" || form.roleCode === "STAFF") && (
                <>
                  <InputField
                    label="Phòng ban"
                    value={form.department}
                    onChange={(value) => updateForm("department", value)}
                  />

                  <InputField
                    label="Chức vụ"
                    value={form.positionName}
                    onChange={(value) => updateForm("positionName", value)}
                  />

                  <InputField
                    label="Ngày vào làm"
                    type="date"
                    value={form.hireDate}
                    onChange={(value) => updateForm("hireDate", value)}
                  />
                </>
              )}

              {form.roleCode === "GUIDE" && (
                <>
                  <InputField
                    label="Khu vực phụ trách"
                    value={form.region}
                    onChange={(value) => updateForm("region", value)}
                  />

                  <InputField
                    label="Ngôn ngữ"
                    value={form.languages}
                    onChange={(value) => updateForm("languages", value)}
                  />

                  <InputField
                    label="Số năm kinh nghiệm"
                    type="number"
                    value={form.experienceYears}
                    onChange={(value) => updateForm("experienceYears", value)}
                  />
                </>
              )}
            </div>
          </FormCard>
        </div>

        <aside className="space-y-8 xl:sticky xl:top-28">
          <FormCard icon={KeyRound} title="Tài khoản & bảo mật">
            <div className="space-y-5">
              <div className="flex items-center justify-between rounded-2xl bg-[#f1f4f5] p-4">
                <div>
                  <p className="text-sm font-black text-[#181c1d]">
                    Trạng thái tài khoản
                  </p>
                  <p className="text-[10px] font-semibold text-[#6e797b]">
                    Kích hoạt / khóa tài khoản
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    updateForm(
                      "status",
                      form.status === "ACTIVE" ? "LOCKED" : "ACTIVE"
                    )
                  }
                  className={`relative h-6 w-11 rounded-full transition ${
                    form.status === "ACTIVE" ? "bg-[#00606c]" : "bg-[#bdc8cb]"
                  }`}
                >
                  <span
                    className={`absolute top-[2px] h-5 w-5 rounded-full bg-white transition ${
                      form.status === "ACTIVE"
                        ? "left-[22px]"
                        : "left-[2px]"
                    }`}
                  />
                </button>
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-extrabold uppercase tracking-widest text-[#6e797b]">
                  Đặt lại mật khẩu tạm thời
                </label>

                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => updateForm("password", e.target.value)}
                    placeholder="Bỏ trống nếu không đổi"
                    className="h-12 w-full rounded-2xl border-none bg-[#f1f4f5] px-5 pr-12 text-sm font-semibold text-[#181c1d] outline-none focus:ring-2 focus:ring-[#00606c]"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6e797b] hover:text-[#00606c]"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <p className="mt-2 text-[10px] font-semibold text-[#6e797b]">
                  Chỉ nhập khi cần đổi mật khẩu cho nhân sự.
                </p>
              </div>
            </div>
          </FormCard>

          <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#00606c] to-[#007b8a] p-8 text-white shadow-2xl shadow-[#00606c]/20">
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full border-4 border-white/20 bg-white/15 text-3xl font-black text-white">
                {getInitials(form.fullName)}
              </div>

              <h3 className="text-lg font-black">
                {form.fullName || "Nhân sự"}
              </h3>
              <p className="mt-1 text-xs font-semibold text-white/75">
                ID: {employeeCode} • {getRoleLabel(form.roleCode)}
              </p>

              <div className="my-6 h-px w-full bg-white/15" />

              <div className="grid w-full grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-[10px] font-black uppercase tracking-wider text-white/55">
                    Trạng thái
                  </p>
                  <p className="mt-1 text-sm font-black">
                    {form.status === "ACTIVE"
                      ? "Hoạt động"
                      : form.status === "LOCKED"
                      ? "Đã khóa"
                      : "Ngưng"}
                  </p>
                </div>

                <div className="text-center">
                  <p className="text-[10px] font-black uppercase tracking-wider text-white/55">
                    Vai trò
                  </p>
                  <p className="mt-1 text-sm font-black">
                    {getRoleLabel(form.roleCode)}
                  </p>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-white/5 blur-2xl" />
            <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-[#fc8a40]/10 blur-2xl" />
          </div>
        </aside>
      </section>

      <footer className="fixed bottom-0 right-0 z-40 flex w-full items-center justify-end gap-4 border-t border-[#bdc8cb]/20 bg-white/80 px-10 py-5 backdrop-blur-xl xl:w-[calc(100%-18rem)]">
        <button
          onClick={() => router.push(`/admin/users/${id}`)}
          className="rounded-full px-8 py-3.5 font-black text-[#3e494b] transition hover:bg-[#f1f4f5]"
        >
          Hủy bỏ
        </button>

        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#9b4500] to-[#fc8a40] px-10 py-3.5 font-black text-white shadow-lg shadow-[#9b4500]/20 transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save size={18} />
          {saving ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
      </footer>
    </div>
  );
}

function FormCard({
  icon: Icon,
  title,
  children,
}: {
  icon: any;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2.5rem] bg-white p-8 shadow-sm">
      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e5f7ff] text-[#00606c]">
          <Icon size={23} />
        </div>
        <h2 className="text-xl font-black text-[#181c1d]">{title}</h2>
      </div>

      {children}
    </section>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
  readOnly,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  readOnly?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-[11px] font-extrabold uppercase tracking-widest text-[#6e797b]">
        {label}
      </label>

      <input
        type={type}
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value)}
        className={`h-12 w-full rounded-2xl border-none px-5 text-sm font-semibold outline-none transition focus:ring-2 focus:ring-[#00606c] ${
          readOnly
            ? "cursor-not-allowed bg-[#dfe3e4] text-[#6e797b]"
            : "bg-[#f1f4f5] text-[#181c1d]"
        }`}
      />
    </div>
  );
}