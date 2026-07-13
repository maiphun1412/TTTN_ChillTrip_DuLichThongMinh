"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Download,
  Edit,
  Eye,
  FileText,
  KeyRound,
  Lock,
  LockOpen,
  Plus,
  RefreshCcw,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
  X,
} from "lucide-react";

const API_BASE_URL = "/backend-api";

type Role = {
  id: string | number;
  code: string;
  name: string;
  description?: string | null;
  _count?: {
    users?: number;
    role_permissions?: number;
  };
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
  customers?: any;
  employees?: any;
  tour_guides?: any;
};

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

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("vi-VN");
}

function formatDateInput(value?: string | null) {
  if (!value) return "";
  return String(value).slice(0, 10);
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
      return "Hoạt động";
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
      return "bg-teal-500/10 text-teal-600";
    case "LOCKED":
      return "bg-[#ffdad6] text-[#ba1a1a]";
    case "INACTIVE":
      return "bg-[#dfe3e4] text-[#3e494b]";
    default:
      return "bg-[#dfe3e4] text-[#3e494b]";
  }
}

function getRoleClass(code?: string) {
  switch (code) {
    case "ADMIN":
      return "bg-[#00606c]/10 text-[#00606c]";
    case "STAFF":
      return "bg-[#9b4500]/10 text-[#9b4500]";
    case "GUIDE":
      return "bg-[#006074]/10 text-[#006074]";
    default:
      return "bg-[#dfe3e4] text-[#3e494b]";
  }
}

function getDepartment(user: AdminUser) {
  if (user.employees?.department) return user.employees.department;
  if (user.tour_guides?.region) return `Khu vực ${user.tour_guides.region}`;
  return user.roles?.name || "-";
}

function getPosition(user: AdminUser) {
  if (user.employees?.position_name) return user.employees.position_name;
  if (user.tour_guides) return "Hướng dẫn viên";
  return getRoleLabel(user.roles?.code);
}

export default function AdminUsers() {
  const router = useRouter();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [keyword, setKeyword] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [showExportPreview, setShowExportPreview] = useState(false);

  async function loadData() {
    try {
      setLoading(true);

      const params = new URLSearchParams();

      if (keyword.trim()) params.set("keyword", keyword.trim());
      if (roleFilter) params.set("roleCode", roleFilter);
      if (statusFilter) params.set("status", statusFilter);

      const query = params.toString();

      const [usersRes, rolesRes] = await Promise.all([
        fetch(
          query
            ? `${API_BASE_URL}/admin/users?${query}`
            : `${API_BASE_URL}/admin/users`,
          {
            cache: "no-store",
            credentials: "include",
          }
        ),
        fetch(`${API_BASE_URL}/admin/roles`, {
          cache: "no-store",
          credentials: "include",
        }),
      ]);

      const usersJson = await usersRes.json().catch(() => null);
      const rolesJson = await rolesRes.json().catch(() => null);

      const staffUsers = (usersJson?.data || []).filter((user: AdminUser) =>
        ["ADMIN", "STAFF", "GUIDE"].includes(user.roles?.code || "")
      );

      const staffRoles = (rolesJson?.data || []).filter((role: Role) =>
        ["ADMIN", "STAFF", "GUIDE"].includes(role.code)
      );

      setUsers(staffUsers);
      setRoles(staffRoles);
    } catch (error) {
      console.error("LOAD_ADMIN_USERS_ERROR:", error);
      setUsers([]);
      setRoles([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 300);

    return () => clearTimeout(timer);
  }, [keyword, roleFilter, statusFilter]);

  const stats = useMemo(() => {
    const admin = users.filter((item) => item.roles?.code === "ADMIN").length;
    const staff = users.filter((item) => item.roles?.code === "STAFF").length;
    const guide = users.filter((item) => item.roles?.code === "GUIDE").length;
    const active = users.filter((item) => item.status === "ACTIVE").length;
    const total = users.length;
    const activeRate = total > 0 ? Math.round((active / total) * 100) : 0;

    return {
      admin,
      staff,
      guide,
      activeRate,
      total,
    };
  }, [users]);

  function openCreate() {
    router.push("/admin/users/create");
  }

  function openEdit(user: AdminUser) {
    router.push(`/admin/users/${user.id}/edit`);
  }

  function openDetail(user: AdminUser) {
    router.push(`/admin/users/${user.id}`);
  }

  async function handleChangeStatus(user: AdminUser, nextStatus: string) {
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

      await loadData();
    } catch (error) {
      console.error("CHANGE_USER_STATUS_ERROR:", error);
      alert("Không thể cập nhật trạng thái");
    }
  }

  async function handleDelete(user: AdminUser) {
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

      await loadData();
    } catch (error) {
      console.error("DELETE_ADMIN_USER_ERROR:", error);
      alert("Không thể xóa tài khoản");
    }
  }

  function exportCsv() {
    const rows = [
      [
        "Họ tên",
        "Email",
        "Số điện thoại",
        "Vai trò",
        "Phòng ban / Đội",
        "Chức vụ",
        "Ngày tạo",
        "Đăng nhập cuối",
        "Trạng thái",
      ],
      ...users.map((item) => [
        item.full_name,
        item.email || "",
        item.phone || "",
        getRoleLabel(item.roles?.code),
        getDepartment(item),
        getPosition(item),
        formatDate(item.created_at),
        formatDate(item.last_login_at),
        getStatusLabel(item.status),
      ]),
    ];

    const content =
      "\uFEFF" +
      rows
        .map((row) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
        )
        .join("\n");

    const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `danh-sach-nhan-su-${Date.now()}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  }

  function exportPdf() {
    const rows = users
      .map(
        (item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${item.full_name || ""}</td>
            <td>${item.email || ""}</td>
            <td>${item.phone || ""}</td>
            <td>${getRoleLabel(item.roles?.code)}</td>
            <td>${getDepartment(item)}</td>
            <td>${getPosition(item)}</td>
            <td>${formatDate(item.created_at)}</td>
            <td>${formatDate(item.last_login_at)}</td>
            <td>${getStatusLabel(item.status)}</td>
          </tr>
        `
      )
      .join("");

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Danh sách nhân sự</title>
          <style>
            * {
              box-sizing: border-box;
            }

            body {
              font-family: "Times New Roman", Times, serif;
              color: #000;
              padding: 28px;
            }

            h1 {
              text-align: center;
              font-size: 22px;
              margin: 0 0 8px;
              text-transform: uppercase;
            }

            .sub {
              text-align: center;
              font-size: 14px;
              margin-bottom: 24px;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 13px;
            }

            th,
            td {
              border: 1px solid #000;
              padding: 7px 8px;
              vertical-align: top;
            }

            th {
              text-align: center;
              font-weight: bold;
              background: #f2f2f2;
            }

            .footer {
              margin-top: 24px;
              display: flex;
              justify-content: flex-end;
              font-size: 14px;
            }

            @media print {
              body {
                padding: 18px;
              }
            }
          </style>
        </head>
        <body>
          <h1>Danh sách nhân sự</h1>
          <div class="sub">Ngày xuất: ${new Date().toLocaleDateString(
            "vi-VN"
          )}</div>

          <table>
            <thead>
              <tr>
                <th>STT</th>
                <th>Họ tên</th>
                <th>Email</th>
                <th>Số điện thoại</th>
                <th>Vai trò</th>
                <th>Phòng ban / Đội</th>
                <th>Chức vụ</th>
                <th>Ngày tạo</th>
                <th>Đăng nhập cuối</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>

          <div class="footer">
            <div>
              Người lập danh sách<br /><br /><br />
              ..............................
            </div>
          </div>

          <script>
            window.onload = function () {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      alert("Trình duyệt đang chặn cửa sổ in PDF");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

  if (showExportPreview) {
    return (
      <div className="space-y-8">
        <section className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-[#00606c]/70">
              Export Preview
            </p>
            <h1 className="text-3xl font-black tracking-tight text-[#00606c]">
              Xem trước dữ liệu xuất
            </h1>
            <p className="mt-2 max-w-2xl text-[#3e494b]">
              Kiểm tra danh sách nhân sự trước khi xuất file CSV hoặc PDF.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowExportPreview(false)}
              className="inline-flex items-center gap-2 rounded-full bg-[#f1f4f5] px-6 py-3 font-black text-[#00606c] transition hover:bg-[#dfe3e4]"
            >
              <X size={18} />
              Quay lại
            </button>

            <button
              onClick={exportCsv}
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-black text-[#00606c] shadow-sm transition hover:bg-[#9defff]/30"
            >
              <Download size={18} />
              Xuất CSV
            </button>

            <button
              onClick={exportPdf}
              className="inline-flex items-center gap-2 rounded-full bg-[#00606c] px-6 py-3 font-black text-white shadow-lg shadow-[#00606c]/20 transition hover:scale-105"
            >
              <FileText size={18} />
              Xuất PDF
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-[2.5rem] border border-[#bdc8cb]/10 bg-white shadow-xl shadow-[#00606c]/5">
          <div className="border-b border-[#bdc8cb]/10 p-6">
            <h2 className="text-xl font-black text-[#00606c]">
              Danh sách chuẩn bị xuất
            </h2>
            <p className="mt-1 text-sm font-semibold text-[#6e797b]">
              Tổng cộng {users.length} tài khoản nhân sự.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1150px] text-left">
              <thead>
                <tr className="bg-[#f1f4f5]/70 text-[10px] font-black uppercase tracking-widest text-[#3e494b]">
                  <th className="px-6 py-4">STT</th>
                  <th className="px-6 py-4">Họ tên</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Số điện thoại</th>
                  <th className="px-6 py-4">Vai trò</th>
                  <th className="px-6 py-4">Phòng ban / Đội</th>
                  <th className="px-6 py-4">Chức vụ</th>
                  <th className="px-6 py-4">Ngày tạo</th>
                  <th className="px-6 py-4">Đăng nhập cuối</th>
                  <th className="px-6 py-4">Trạng thái</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#bdc8cb]/10">
                {users.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-6 py-12 text-center text-sm font-bold text-[#6e797b]"
                    >
                      Không có dữ liệu để xuất.
                    </td>
                  </tr>
                ) : (
                  users.map((user, index) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 text-sm font-bold">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 text-sm font-black text-[#181c1d]">
                        {user.full_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#3e494b]">
                        {user.email || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#3e494b]">
                        {user.phone || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold">
                        {getRoleLabel(user.roles?.code)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {getDepartment(user)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {getPosition(user)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {formatDate(user.last_login_at)}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold">
                        {getStatusLabel(user.status)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-[#00606c]/70">
            Staff & Permission Management
          </p>
          <h1 className="text-3xl font-black tracking-tight text-[#00606c]">
            Quản lý nhân sự
          </h1>
          <p className="mt-2 max-w-2xl text-[#3e494b]">
            Theo dõi tài khoản quản trị viên, nhân viên và hướng dẫn viên trong
            hệ thống.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 font-black text-[#00606c] shadow-sm transition hover:bg-[#9defff]/30"
          >
            <RefreshCcw size={18} className={loading ? "animate-spin" : ""} />
            Làm mới
          </button>

          <button
            onClick={() => setShowExportPreview(true)}
            className="inline-flex items-center gap-2 rounded-full bg-[#f1f4f5] px-6 py-3 font-black text-[#00606c] transition hover:bg-[#dfe3e4]"
          >
            <Download size={18} />
            Xuất dữ liệu
          </button>

          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#9b4500] to-[#fc8a40] px-6 py-3 font-black text-white shadow-lg shadow-[#9b4500]/20 transition hover:scale-105"
          >
            <Plus size={18} />
            Thêm nhân sự
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Quản trị viên"
          value={stats.admin}
          desc="Toàn quyền hệ thống"
          icon={ShieldCheck}
          tone="primary"
        />
        <MetricCard
          title="Nhân viên"
          value={stats.staff}
          desc="Điều hành nghiệp vụ"
          icon={KeyRound}
          tone="secondary"
        />
        <MetricCard
          title="Hướng dẫn viên"
          value={stats.guide}
          desc="Phụ trách tour"
          icon={UserCheck}
          tone="tertiary"
        />
        <MetricCard
          title="Tỷ lệ hoạt động"
          value={`${stats.activeRate}%`}
          desc={`${stats.total} tài khoản`}
          icon={Users}
          tone="active"
        />
      </section>

      <section className="overflow-hidden rounded-[2.5rem] border border-[#bdc8cb]/10 bg-white shadow-xl shadow-[#00606c]/5">
        <div className="space-y-4 border-b border-[#bdc8cb]/10 p-6">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div className="flex max-w-md flex-1 items-center rounded-2xl bg-[#f1f4f5] px-4 py-3">
              <Search size={18} className="mr-2 text-[#00606c]" />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Tìm theo tên, email, số điện thoại..."
                className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-[#6e797b]/60"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <SelectFilter
                label="Vai trò"
                value={roleFilter}
                onChange={setRoleFilter}
                options={[
                  { label: "Tất cả", value: "" },
                  { label: "Admin", value: "ADMIN" },
                  { label: "Nhân viên", value: "STAFF" },
                  { label: "HDV", value: "GUIDE" },
                ]}
              />

              <SelectFilter
                label="Trạng thái"
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { label: "Tất cả", value: "" },
                  { label: "Hoạt động", value: "ACTIVE" },
                  { label: "Đã khóa", value: "LOCKED" },
                  { label: "Ngưng hoạt động", value: "INACTIVE" },
                ]}
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left">
            <thead>
              <tr className="bg-[#f1f4f5]/70 text-[10px] font-black uppercase tracking-widest text-[#3e494b]">
                <th className="px-6 py-4">Nhân sự</th>
                <th className="px-6 py-4">Vai trò</th>
                <th className="px-6 py-4">Phòng ban / Đội</th>
                <th className="px-6 py-4">Ngày tạo</th>
                <th className="px-6 py-4">Đăng nhập cuối</th>
                <th className="px-6 py-4">Trạng thái</th>
                <th className="px-6 py-4 text-right">Thao tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#bdc8cb]/10">
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-sm font-bold text-[#00606c]"
                  >
                    Đang tải danh sách nhân sự...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-sm font-bold text-[#6e797b]"
                  >
                    Không có nhân sự phù hợp.
                  </td>
                </tr>
              ) : (
                users.map((user, index) => (
                  <tr
                    key={user.id}
                    className="transition hover:bg-[#00606c]/[0.02]"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={user.full_name}
                            className="h-11 w-11 rounded-xl object-cover shadow-sm ring-2 ring-[#9defff]"
                          />
                        ) : (
                          <div
                            className={`flex h-11 w-11 items-center justify-center rounded-xl text-sm font-black shadow-sm ${
                              index % 3 === 0
                                ? "bg-[#9defff] text-[#00606c]"
                                : index % 3 === 1
                                ? "bg-[#ffdbc9] text-[#9b4500]"
                                : "bg-[#dfe3e4] text-[#3e494b]"
                            }`}
                          >
                            {getInitials(user.full_name)}
                          </div>
                        )}

                        <div>
                          <p className="text-sm font-black text-[#181c1d]">
                            {user.full_name}
                          </p>
                          <p className="text-[11px] text-[#3e494b]">
                            {user.email || user.phone || "Chưa cập nhật"}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-black ${getRoleClass(
                          user.roles?.code
                        )}`}
                      >
                        {getRoleLabel(user.roles?.code)}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-[#181c1d]">
                        {getDepartment(user)}
                      </p>
                      <p className="text-[11px] text-[#6e797b]">
                        {getPosition(user)}
                      </p>
                    </td>

                    <td className="px-6 py-4 text-sm font-semibold text-[#3e494b]">
                      {formatDate(user.created_at)}
                    </td>

                    <td className="px-6 py-4 text-[11px] text-[#3e494b]">
                      <p className="font-bold">
                        {user.last_login_at ? "Đã đăng nhập" : "Chưa đăng nhập"}
                      </p>
                      <p className="opacity-60">
                        {formatDate(user.last_login_at)}
                      </p>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${getStatusClass(
                          user.status
                        )}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            user.status === "ACTIVE"
                              ? "bg-teal-500"
                              : user.status === "LOCKED"
                              ? "bg-[#ba1a1a]"
                              : "bg-[#6e797b]"
                          }`}
                        />
                        {getStatusLabel(user.status)}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-1">
                        <IconButton
                          title="Xem hồ sơ"
                          onClick={() => openDetail(user)}
                          icon={<Eye size={17} />}
                        />
                        <IconButton
                          title="Chỉnh sửa"
                          onClick={() => openEdit(user)}
                          icon={<Edit size={17} />}
                        />
                        {user.status === "LOCKED" ? (
                          <IconButton
                            title="Mở khóa"
                            onClick={() => handleChangeStatus(user, "ACTIVE")}
                            icon={<LockOpen size={17} />}
                          />
                        ) : (
                          <IconButton
                            title="Khóa tài khoản"
                            danger
                            onClick={() => handleChangeStatus(user, "LOCKED")}
                            icon={<Lock size={17} />}
                          />
                        )}
                        <IconButton
                          title="Xóa"
                          danger
                          onClick={() => handleDelete(user)}
                          icon={<Trash2 size={17} />}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-[#bdc8cb]/10 bg-[#f1f4f5]/30 px-8 py-6">
          <span className="text-xs font-bold uppercase tracking-wider text-[#3e494b]">
            Hiển thị {users.length} tài khoản nhân sự
          </span>

          <div className="flex items-center gap-2">
            <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#bdc8cb]/30 text-[#3e494b] transition hover:bg-[#dfe3e4]">
              1
            </button>
          </div>
        </div>
      </section>

      <div
        className="relative mt-12 h-56 overflow-hidden rounded-[2.5rem] bg-[#00606c] p-10 shadow-2xl shadow-[#00606c]/20"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(0,96,108,0.96), rgba(0,96,108,0.72), rgba(0,96,108,0.18)), url('/images/admin/team-bg.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="relative z-10 flex h-full flex-col justify-center">
          <h4 className="mb-3 max-w-md text-3xl font-black leading-tight tracking-tight text-white">
            Xây dựng đội ngũ vận hành chuyên nghiệp.
          </h4>
          <p className="max-w-sm text-sm font-medium text-[#9defff]">
            Quản lý tài khoản, vai trò và trạng thái nhân sự giúp hệ thống vận
            hành an toàn, rõ quyền và dễ kiểm soát.
          </p>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
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
  tone: "primary" | "secondary" | "tertiary" | "active";
}) {
  const styles = {
    primary: "bg-[#00606c]/10 text-[#00606c]",
    secondary: "bg-[#9b4500]/10 text-[#9b4500]",
    tertiary: "bg-[#006074]/10 text-[#006074]",
    active: "bg-teal-500/10 text-teal-600",
  }[tone];

  return (
    <div className="group rounded-[2rem] border border-[#bdc8cb]/10 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <div className="mb-4 flex items-start justify-between">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl transition group-hover:scale-110 ${styles}`}
        >
          <Icon size={21} />
        </div>
        <p className="text-right text-[10px] font-black uppercase tracking-widest text-[#6e797b]">
          {desc}
        </p>
      </div>

      <p className="mb-1 text-xs font-black uppercase text-[#6e797b]">
        {title}
      </p>
      <p className="text-3xl font-black text-[#181c1d]">{value}</p>
    </div>
  );
}

function SelectFilter({
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
    <div className="flex items-center gap-2 rounded-xl border border-[#bdc8cb]/20 bg-[#ebeeef] px-3 py-2">
      <span className="text-xs font-bold text-[#3e494b]">{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border-none bg-transparent p-0 text-xs font-bold text-[#00606c] outline-none"
      >
        {options.map((option) => (
          <option key={option.value || "all"} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown size={14} className="text-[#00606c]" />
    </div>
  );
}

function IconButton({
  icon,
  title,
  danger,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`rounded-lg p-2 transition ${
        danger
          ? "text-[#ba1a1a] hover:bg-[#ba1a1a]/10"
          : "text-[#00606c] hover:bg-[#00606c]/10"
      }`}
    >
      {icon}
    </button>
  );
}