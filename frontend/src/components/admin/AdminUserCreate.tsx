"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  BriefcaseBusiness,
  Eye,
  EyeOff,
  KeyRound,
  MapPinned,
  Save,
  ShieldCheck,
  UserCog,
  UserPlus,
  Users,
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

function emptyForm(): UserForm {
  return {
    fullName: "",
    email: "",
    phone: "",
    password: "",
    roleCode: "STAFF",
    status: "ACTIVE",

    gender: "",
    dateOfBirth: "",
    citizenId: "",
    employeeAddress: "",

    department: "Điều hành",
    positionName: "Nhân viên",
    hireDate: "",

    region: "",
    languages: "",
    experienceYears: "0",
  };
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

export default function AdminUserCreate() {
  const router = useRouter();

  const [form, setForm] = useState<UserForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function updateForm<K extends keyof UserForm>(key: K, value: UserForm[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };

      if (key === "roleCode") {
        if (value === "ADMIN") {
          next.department = "Quản trị hệ thống";
          next.positionName = "Quản trị viên";
        }

        if (value === "STAFF") {
          next.department = "Điều hành";
          next.positionName = "Nhân viên";
        }

        if (value === "GUIDE") {
          next.department = "";
          next.positionName = "";
          next.region = prev.region || "";
          next.languages = prev.languages || "";
          next.experienceYears = prev.experienceYears || "0";
        }
      }

      return next;
    });
  }

  async function handleSave() {
    if (!form.fullName.trim()) {
      alert("Vui lòng nhập họ tên");
      return;
    }

    if (!form.password.trim()) {
      alert("Vui lòng nhập mật khẩu");
      return;
    }

    if (form.password.trim().length < 6) {
      alert("Mật khẩu tối thiểu 6 ký tự");
      return;
    }

    if (!form.email.trim() && !form.phone.trim()) {
      alert("Phải có email hoặc số điện thoại");
      return;
    }

    try {
      setSaving(true);

      const res = await fetch(`${API_BASE_URL}/admin/users`, {
        method: "POST",
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
        alert(json?.message || "Tạo nhân sự thất bại");
        return;
      }

      alert("Tạo nhân sự thành công");
      router.push("/admin/users");
      router.refresh();
    } catch (error) {
      console.error("CREATE_ADMIN_USER_ERROR:", error);
      alert("Không thể tạo nhân sự");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#6e797b]">
            <span>Nhân sự</span>
            <span>/</span>
            <span className="text-[#00606c]">Tạo mới</span>
          </div>

          <h1 className="text-3xl font-black tracking-tight text-[#00606c]">
            Thêm nhân sự mới
          </h1>

          <p className="mt-2 max-w-2xl text-[#3e494b]">
            Tạo tài khoản nội bộ cho quản trị viên, nhân viên hoặc hướng dẫn viên.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => router.push("/admin/users")}
            className="inline-flex items-center gap-2 rounded-full bg-[#f1f4f5] px-6 py-3 font-black text-[#00606c] transition hover:bg-[#dfe3e4]"
          >
            <ArrowLeft size={18} />
            Quay lại
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#9b4500] to-[#fc8a40] px-7 py-3 font-black text-white shadow-lg shadow-[#9b4500]/20 transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save size={18} />
            {saving ? "Đang lưu..." : "Lưu thông tin"}
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-8 xl:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          <div className="rounded-[2.5rem] border border-[#bdc8cb]/10 bg-white p-8 shadow-xl shadow-[#00606c]/5">
            <SectionTitle
              icon={UserPlus}
              title="Thông tin cá nhân"
              desc="Thông tin định danh và liên hệ của nhân sự."
            />

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <InputField
                label="Họ và tên"
                value={form.fullName}
                placeholder="Nhập tên đầy đủ"
                onChange={(value) => updateForm("fullName", value)}
              />

              <InputField
                label="Email công việc"
                type="email"
                value={form.email}
                placeholder="example@chilltrip.com"
                onChange={(value) => updateForm("email", value)}
              />

              <InputField
                label="Số điện thoại"
                value={form.phone}
                placeholder="Nhập số điện thoại"
                onChange={(value) => updateForm("phone", value)}
              />

              <InputField
                label="Ngày sinh"
                type="date"
                value={form.dateOfBirth}
                onChange={(value) => updateForm("dateOfBirth", value)}
              />

              <div>
                <label className="mb-2 ml-4 block text-[11px] font-black uppercase tracking-widest text-[#6e797b]">
                  Giới tính
                </label>
                <select
                  value={form.gender}
                  onChange={(e) => updateForm("gender", e.target.value)}
                  className="h-12 w-full rounded-full border border-[#bdc8cb]/30 bg-[#f1f4f5] px-5 text-sm font-bold text-[#00606c] outline-none focus:ring-4 focus:ring-[#007B8A]/10"
                >
                  <option value="">Chọn giới tính</option>
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>

              <InputField
  label="Ngày vào làm"
  type="date"
  value={form.hireDate}
  onChange={(value) => updateForm("hireDate", value)}
/>

              <InputField
                label="Số CCCD"
                value={form.citizenId}
                placeholder="Nhập số CCCD"
                onChange={(value) => updateForm("citizenId", value)}
              />

              <div>
  <InputField
    label="Địa chỉ thường trú"
    value={form.employeeAddress}
    placeholder="Nhập địa chỉ thường trú"
    onChange={(value) => updateForm("employeeAddress", value)}
  />
</div>
            </div>
          </div>

          <div className="rounded-[2.5rem] border border-[#bdc8cb]/10 bg-white p-8 shadow-xl shadow-[#00606c]/5">
            <SectionTitle
              icon={ShieldCheck}
              title="Vai trò & phân quyền"
              desc="Chọn đúng vai trò để hệ thống tạo hồ sơ phù hợp."
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <RoleCard
                active={form.roleCode === "ADMIN"}
                icon={ShieldCheck}
                title="Admin"
                desc="Quản trị hệ thống"
                onClick={() => updateForm("roleCode", "ADMIN")}
              />

              <RoleCard
                active={form.roleCode === "STAFF"}
                icon={UserCog}
                title="Nhân viên"
                desc="Điều hành nghiệp vụ"
                onClick={() => updateForm("roleCode", "STAFF")}
              />

              <RoleCard
                active={form.roleCode === "GUIDE"}
                icon={MapPinned}
                title="Hướng dẫn viên"
                desc="Phụ trách tour"
                onClick={() => updateForm("roleCode", "GUIDE")}
              />
            </div>

            {(form.roleCode === "ADMIN" || form.roleCode === "STAFF") && (
              <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
                <InputField
                  label="Phòng ban"
                  value={form.department}
                  placeholder="Ví dụ: Điều hành"
                  onChange={(value) => updateForm("department", value)}
                />

                <InputField
                  label="Chức vụ"
                  value={form.positionName}
                  placeholder="Ví dụ: Nhân viên"
                  onChange={(value) => updateForm("positionName", value)}
                />

                
              </div>
            )}

            {form.roleCode === "GUIDE" && (
              <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
                <InputField
                  label="Khu vực phụ trách"
                  value={form.region}
                  placeholder="Ví dụ: Miền Trung"
                  onChange={(value) => updateForm("region", value)}
                />

                <InputField
                  label="Ngôn ngữ"
                  value={form.languages}
                  placeholder="Ví dụ: Việt, Anh"
                  onChange={(value) => updateForm("languages", value)}
                />

                <InputField
                  label="Số năm kinh nghiệm"
                  type="number"
                  value={form.experienceYears}
                  onChange={(value) => updateForm("experienceYears", value)}
                />
              </div>
            )}
          </div>
        </div>

        <div className="space-y-8">
          <div className="rounded-[2.5rem] border border-[#bdc8cb]/10 bg-white p-8 shadow-xl shadow-[#00606c]/5">
            <SectionTitle
              icon={KeyRound}
              title="Tài khoản"
              desc="Thiết lập mật khẩu và trạng thái đăng nhập."
              small
            />

            <div className="space-y-5">
              <div>
                <label className="mb-2 ml-4 block text-[11px] font-black uppercase tracking-widest text-[#6e797b]">
                  Mật khẩu tạm thời
                </label>

                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => updateForm("password", e.target.value)}
                    placeholder="Nhập mật khẩu"
                    className="h-12 w-full rounded-full border border-[#bdc8cb]/30 bg-[#f1f4f5] px-5 pr-12 text-sm font-semibold outline-none focus:ring-4 focus:ring-[#007B8A]/10"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6e797b] transition hover:text-[#00606c]"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 ml-4 block text-[11px] font-black uppercase tracking-widest text-[#6e797b]">
                  Trạng thái
                </label>

                <select
                  value={form.status}
                  onChange={(e) =>
                    updateForm("status", e.target.value as UserForm["status"])
                  }
                  className="h-12 w-full rounded-full border border-[#bdc8cb]/30 bg-[#f1f4f5] px-5 text-sm font-bold text-[#00606c] outline-none focus:ring-4 focus:ring-[#007B8A]/10"
                >
                  <option value="ACTIVE">Hoạt động</option>
                  <option value="LOCKED">Đã khóa</option>
                  <option value="INACTIVE">Ngưng hoạt động</option>
                </select>
              </div>

              <div className="rounded-[1.5rem] bg-[#f1f4f5] p-5">
                <div className="flex items-start gap-3">
                  <BadgeCheck className="mt-0.5 text-teal-600" size={20} />
                  <div>
                    <p className="text-sm font-black text-[#181c1d]">
                      {form.status === "ACTIVE"
                        ? "Cho phép đăng nhập ngay"
                        : "Chưa cho phép đăng nhập"}
                    </p>
                    <p className="mt-1 text-xs font-medium text-[#6e797b]">
                      Tài khoản sẽ được tạo với vai trò{" "}
                      <b>{getRoleLabel(form.roleCode)}</b>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            className="relative aspect-[4/5] overflow-hidden rounded-[2.5rem] bg-[#00606c] p-8 shadow-2xl shadow-[#00606c]/20"
            style={{
              backgroundImage:
                "linear-gradient(180deg, rgba(0,96,108,0.15), rgba(0,96,108,0.92)), url('/images/create-user-bg.jpg')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="relative z-10 flex h-full flex-col justify-end text-white">
              <Users size={48} className="mb-5 text-[#9defff]" />
              <h4 className="mb-3 text-2xl font-black tracking-tight">
                Kiến tạo đội ngũ mới
              </h4>
              <p className="text-sm font-medium leading-relaxed text-[#ddf9ff]">
                Việc thêm nhân sự chính xác giúp hệ thống vận hành mượt mà, rõ
                quyền và bảo mật hơn.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  desc,
  small,
}: {
  icon: any;
  title: string;
  desc: string;
  small?: boolean;
}) {
  return (
    <div className="mb-8 flex items-start gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#9defff] text-[#00606c]">
        <Icon size={small ? 19 : 22} />
      </div>

      <div>
        <h2 className="text-xl font-black text-[#181c1d]">{title}</h2>
        <p className="mt-1 text-sm font-semibold text-[#6e797b]">{desc}</p>
      </div>
    </div>
  );
}

function RoleCard({
  active,
  icon: Icon,
  title,
  desc,
  onClick,
}: {
  active: boolean;
  icon: any;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[2rem] border-2 p-6 text-center transition hover:-translate-y-1 ${
        active
          ? "border-[#00606c] bg-[#9defff]/70 shadow-lg shadow-[#00606c]/10"
          : "border-transparent bg-[#f1f4f5] hover:bg-[#e5e9ea]"
      }`}
    >
      <div
        className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${
          active ? "bg-[#00606c] text-white" : "bg-white text-[#00606c]"
        }`}
      >
        <Icon size={23} />
      </div>

      <p className="text-sm font-black text-[#181c1d]">{title}</p>
      <p className="mt-1 text-xs font-semibold text-[#6e797b]">{desc}</p>
    </button>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-2 ml-4 block text-[11px] font-black uppercase tracking-widest text-[#6e797b]">
        {label}
      </label>

      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full rounded-full border border-[#bdc8cb]/30 bg-[#f1f4f5] px-5 text-sm font-semibold outline-none placeholder:text-[#6e797b]/55 focus:ring-4 focus:ring-[#007B8A]/10"
      />
    </div>
  );
}