"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  KeyRound,
  Lock,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldX,
} from "lucide-react";

const API_BASE_URL = "/backend-api";

type LogType = "access" | "audit";

type AccessLog = {
  id: string;
  createdAt: string;
  accessorName: string | null;
  accessorRole: string | null;
  ownerName: string | null;
  dataType: string;
  result: "ALLOWED" | "DENIED";
  reason: string | null;
  purpose: string | null;
  ipAddress: string | null;
};

type AuditLog = {
  id: string;
  createdAt: string;
  actorName: string | null;
  actorRole: string | null;
  module: string;
  action: string;
  entityName: string;
  entityId: string | null;
  entityLabel: string | null;
  oldData: string | null;
  newData: string | null;
  ipAddress: string | null;
};

type Stats = { accessTotal: number; denied: number; sensitive: number; loginFailed: number };
type Alert = { level: "danger" | "warning"; message: string };
type Json = Record<string, unknown>;
type Tone = "allowed" | "denied" | "sensitive" | "normal";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Quản trị viên",
  STAFF: "Nhân viên",
  GUIDE: "Hướng dẫn viên",
  CUSTOMER: "Khách hàng",
};

// Câu mô tả hành động "xem" theo loại dữ liệu
const ACCESS_VERB: Record<string, string> = {
  CUSTOMER_LIST: "xem thông tin trong danh sách khách hàng",
  CUSTOMER_PROFILE: "mở hồ sơ khách hàng",
  MESSAGE: "đọc tin nhắn của khách",
  STAFF_LIST: "xem thông tin trong danh sách nhân sự",
  STAFF_PROFILE: "mở hồ sơ nhân sự",
  PASSENGER_LIST: "xem danh sách hành khách",
  CONTACT_INFO: "xem thông tin liên lạc",
  IDENTITY_DOC: "xem giấy tờ tùy thân",
  HEALTH_NOTE: "xem ghi chú sức khỏe",
};

const REASON_LABEL: Record<string, string> = {
  UNAUTHENTICATED: "Chưa đăng nhập",
  ROLE_NOT_ALLOWED: "Vai trò không có quyền xem dữ liệu này",
  GUIDE_NOT_ASSIGNED: "Hướng dẫn viên không được phân công chuyến này",
  TRIP_EXPIRED: "Chuyến đi đã hết thời hạn được xem",
  CUSTOMER_NOT_IN_TRIP: "Khách không thuộc chuyến đi này",
  WRONG_PASSWORD: "Sai mật khẩu",
  ACCOUNT_NOT_FOUND: "Tài khoản không tồn tại",
  ACCOUNT_LOCKED: "Tài khoản đang bị khóa",
};

const PURPOSE_LABEL: Record<string, string> = {
  ADMINISTRATION: "Quản trị hệ thống",
  CUSTOMER_SUPPORT: "Hỗ trợ khách hàng",
  TOUR_OPERATION: "Điều hành tour",
};

const ACTION_FILTERS: [string, string][] = [
  ["SENSITIVE", "Chỉ thao tác nhạy cảm"],
  ["CREATE", "Thêm mới"],
  ["UPDATE", "Cập nhật"],
  ["DELETE", "Xóa"],
  ["CHANGE_ROLE", "Đổi vai trò"],
  ["LOCK", "Khóa tài khoản"],
  ["UNLOCK", "Mở khóa tài khoản"],
  ["SEND_MESSAGE", "Gửi tin nhắn"],
  ["LOGIN_SUCCESS", "Đăng nhập thành công"],
  ["LOGIN_FAILED", "Đăng nhập thất bại"],
  ["VIEW_LOGS", "Mở nhật ký"],
];

const FIELD_LABEL: Record<string, string> = {
  full_name: "Họ tên",
  email: "Email",
  phone: "Số điện thoại",
  status: "Trạng thái",
  role: "Vai trò",
  customer_code: "Mã khách hàng",
  customer_type: "Loại khách",
  gender: "Giới tính",
  date_of_birth: "Ngày sinh",
  address: "Địa chỉ",
  notes: "Ghi chú",
  reason: "Lý do",
};

const HIDDEN_FIELDS = new Set(["id", "user_id", "created_at", "updated_at"]);
const SENSITIVE = ["CHANGE_ROLE", "LOCK", "UNLOCK", "DELETE"];

const ROW_BG: Record<Tone, string> = {
  denied: "bg-red-50 hover:bg-red-100/70",
  sensitive: "bg-orange-50 hover:bg-orange-100/70",
  allowed: "bg-white hover:bg-emerald-50",
  normal: "bg-white hover:bg-[#eaf6f7]",
};

const ROW_STRIPE: Record<Tone, string> = {
  denied: "border-l-red-500",
  sensitive: "border-l-orange-400",
  allowed: "border-l-emerald-500",
  normal: "border-l-[#007B8A]",
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function splitDateTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return { date: value, time: "" };
  return {
    date: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`,
  };
}

function parseJson(value: string | null): Json | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as Json;
  } catch {
    return null;
  }
}

function initials(name: string | null) {
  if (!name) return "?";
  const words = name.trim().split(/\s+/);
  return ((words[0]?.[0] ?? "") + (words.length > 1 ? words[words.length - 1][0] : "")).toUpperCase();
}

function friendlyIp(ip: string | null) {
  if (!ip) return "Không xác định";
  if (ip === "::1" || ip === "127.0.0.1" || ip === "::ffff:127.0.0.1") {
    return "Máy nội bộ (localhost)";
  }
  return ip;
}

function roleText(code: unknown) {
  return typeof code === "string" ? ROLE_LABEL[code] || code : "không rõ";
}

const LIST_NAME: Record<string, string> = {
  CUSTOMER_LIST: "danh sách khách hàng",
  STAFF_LIST: "danh sách nhân sự",
  PASSENGER_LIST: "danh sách hành khách",
};

function describeAccess(log: AccessLog) {
  const list = LIST_NAME[log.dataType];
  if (list) {
    // Mở 1 danh sách -> mỗi người có trong danh sách được ghi 1 dòng
    if (log.result === "DENIED") return `Cố mở ${list} — đã bị chặn`;
    return log.ownerName
      ? `Mở ${list} — thấy thông tin của ${log.ownerName}`
      : `Mở ${list}`;
  }

  const verb = ACCESS_VERB[log.dataType] || "xem dữ liệu cá nhân";
  const owner = log.ownerName ? ` của ${log.ownerName}` : "";
  return log.result === "DENIED"
    ? `Cố ${verb}${owner} — đã bị chặn`
    : `${verb.charAt(0).toUpperCase()}${verb.slice(1)}${owner}`;
}

function entityText(log: AuditLog, oldData: Json | null, newData: Json | null) {
  const name =
    log.entityLabel ||
    (oldData?.full_name as string | undefined) ||
    (newData?.full_name as string | undefined);
  const kind =
    log.entityName === "users"
      ? "tài khoản"
      : log.entityName === "customers" || log.entityName === "customer_messages"
        ? "khách hàng"
        : "dữ liệu";
  return name ? `${kind} ${name}` : kind;
}

function describeAudit(log: AuditLog) {
  const oldData = parseJson(log.oldData);
  const newData = parseJson(log.newData);
  const target = entityText(log, oldData, newData);
  const reason = newData?.reason as string | undefined;

  if (log.action.endsWith("_DENIED")) {
    return `Cố thay đổi ${target} — đã bị chặn`;
  }

  switch (log.action) {
    case "LOGIN_SUCCESS":
      return "Đăng nhập thành công";
    case "LOGIN_FAILED":
      if (reason === "ACCOUNT_NOT_FOUND") {
        const account = (newData?.email || newData?.phone) as string | undefined;
        return `Đăng nhập bằng tài khoản không tồn tại${account ? ` (${account})` : ""}`;
      }
      return "Đăng nhập thất bại — sai mật khẩu";
    case "LOGIN_BLOCKED":
      return "Đăng nhập khi tài khoản đang bị khóa";
    case "VIEW_LOGS":
      return log.entityName === "audit_logs"
        ? "Mở nhật ký thao tác hệ thống"
        : "Mở nhật ký truy cập dữ liệu khách";
    case "CREATE":
      return `Thêm mới ${target}`;
    case "UPDATE":
      return `Cập nhật thông tin ${target}`;
    case "DELETE":
      return `Xóa ${target}`;
    case "CHANGE_ROLE":
      return `Đổi vai trò ${target}: ${roleText(oldData?.role)} → ${roleText(newData?.role)}`;
    case "LOCK":
      return `Khóa ${target}`;
    case "UNLOCK":
      return `Mở khóa ${target}`;
    case "SEND_MESSAGE":
      return `Gửi tin nhắn cho ${target}`;
    default:
      return `${log.action} — ${target}`;
  }
}

function auditTone(action: string): Tone {
  if (action === "LOGIN_FAILED" || action === "LOGIN_BLOCKED" || action.endsWith("_DENIED")) {
    return "denied";
  }
  if (SENSITIVE.includes(action)) return "sensitive";
  return "normal";
}

function auditBadge(action: string) {
  if (action.endsWith("_DENIED")) return { text: "Bị chặn", cls: "bg-red-100 text-red-700" };
  if (action === "LOGIN_FAILED" || action === "LOGIN_BLOCKED") {
    return { text: "Đăng nhập lỗi", cls: "bg-red-100 text-red-700" };
  }
  if (SENSITIVE.includes(action)) return { text: "Nhạy cảm", cls: "bg-orange-100 text-[#9b4500]" };
  if (action === "LOGIN_SUCCESS") return { text: "Đăng nhập", cls: "bg-emerald-100 text-emerald-700" };
  return { text: "Thông thường", cls: "bg-[#e3f4f6] text-[#007B8A]" };
}

function getToken() {
  return localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Eye;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-3xl bg-white p-5 shadow-[0_16px_32px_rgba(0,96,108,0.06)]">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tone}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-sm font-medium text-[#3e494b]">{label}</p>
        <p className="text-3xl font-bold tabular-nums text-[#181c1d]">{value}</p>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-[#6e797b]">{label}</p>
      <p className="mt-0.5 text-[15px] text-[#181c1d]">{value}</p>
    </div>
  );
}

function ChangeTable({ oldData, newData }: { oldData: Json | null; newData: Json | null }) {
  const keys = Array.from(
    new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})])
  ).filter((key) => !HIDDEN_FIELDS.has(key));

  const show = (data: Json | null, key: string) => {
    if (!data) return "—";
    const value = data[key];
    if (value === null || value === undefined || value === "") return "—";
    if (key === "role") return roleText(value);
    return typeof value === "object" ? JSON.stringify(value) : String(value);
  };

  const changed = (key: string) =>
    oldData && newData && JSON.stringify(oldData[key]) !== JSON.stringify(newData[key]);

  const rows = oldData && newData && keys.some(changed) ? keys.filter(changed) : keys;
  if (!rows.length) return null;

  return (
    <div className="overflow-x-auto rounded-2xl border border-[#e3eaeb] bg-white">
      <table className="w-full text-[15px]">
        <thead className="bg-[#f1f4f5] text-left text-sm text-[#3e494b]">
          <tr>
            <th className="px-4 py-2 font-semibold">Thông tin</th>
            {oldData && <th className="px-4 py-2 font-semibold">Trước</th>}
            {newData && <th className="px-4 py-2 font-semibold">{oldData ? "Sau" : "Giá trị"}</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((key) => (
            <tr key={key} className="border-t border-[#eef2f3]">
              <td className="px-4 py-2 font-medium text-[#181c1d]">{FIELD_LABEL[key] || key}</td>
              {oldData && <td className="px-4 py-2 break-all text-[#6e797b] line-through decoration-red-300">{show(oldData, key)}</td>}
              {newData && <td className="px-4 py-2 break-all font-semibold text-[#007B8A]">{show(newData, key)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-4 py-2 text-xs text-[#6e797b]">
        Số điện thoại, email và giấy tờ tùy thân đã được che bớt khi lưu vào nhật ký.
      </p>
    </div>
  );
}

export default function AdminPrivacyLogs() {
  const [type, setType] = useState<LogType>("access");
  const [keyword, setKeyword] = useState("");
  const [result, setResult] = useState("");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const [items, setItems] = useState<(AccessLog | AuditLog)[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [stats, setStats] = useState<Stats | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    const params = new URLSearchParams({ type, page: String(page) });
    if (keyword.trim()) params.set("q", keyword.trim());
    if (type === "access" && result) params.set("result", result);
    if (type === "audit" && action) params.set("action", action);
    if (from) params.set("from", from);
    if (to) params.set("to", to);

    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/admin/privacy-logs?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Không thể tải nhật ký");

      setItems(json.data.items);
      setTotal(json.data.total);
      setPageSize(json.data.pageSize);
      setStats(json.data.stats);
      setAlerts(json.data.alerts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải nhật ký");
    } finally {
      setLoading(false);
    }
  }, [type, page, keyword, result, action, from, to]);

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  // Tự làm mới mỗi 10 giây khi đang xem tab này (không làm mới khi đang mở chi tiết một dòng)
  useEffect(() => {
    if (expanded) return;
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 10000);
    return () => clearInterval(interval);
  }, [load, expanded]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const resetPage = () => {
    setPage(1);
    setExpanded(null);
  };

  const inputCls =
    "rounded-full border border-transparent bg-[#f1f4f5] px-4 py-2.5 text-[15px] text-[#181c1d] outline-none focus:border-[#007B8A]";

  return (
    <div className="space-y-6 font-sans text-[15px] text-[#181c1d]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#007B8A]">Privacy audit</p>
          <h1 className="mt-1 text-3xl font-bold text-[#007B8A]">Nhật ký hoạt động</h1>
          <p className="mt-1 max-w-3xl text-[15px] text-[#3e494b]">
            Ai đã xem dữ liệu cá nhân của khách và ai đã thay đổi gì trong hệ thống. Nhật ký chỉ
            được đọc, không thể sửa hoặc xóa.
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-[15px] font-bold text-[#007B8A] shadow-sm hover:bg-[#f1f4f5]"
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          Làm mới
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Eye} label="Lượt truy cập dữ liệu khách" value={stats?.accessTotal ?? 0} tone="bg-[#e3f4f6] text-[#007B8A]" />
        <StatCard icon={ShieldAlert} label="Lượt bị chặn" value={stats?.denied ?? 0} tone="bg-red-50 text-red-600" />
        <StatCard icon={KeyRound} label="Thao tác nhạy cảm" value={stats?.sensitive ?? 0} tone="bg-orange-50 text-[#9b4500]" />
        <StatCard icon={Lock} label="Đăng nhập thất bại" value={stats?.loginFailed ?? 0} tone="bg-slate-100 text-slate-600" />
      </div>

      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, index) => (
            <div
              key={index}
              className={`flex items-center gap-3 rounded-2xl px-5 py-3.5 text-[15px] font-semibold ${
                alert.level === "danger" ? "bg-red-50 text-red-700" : "bg-orange-50 text-[#9b4500]"
              }`}
            >
              <AlertTriangle size={20} />
              {alert.message}
            </div>
          ))}
        </div>
      )}

      <div className="rounded-[2rem] bg-white p-6 shadow-[0_16px_32px_rgba(0,96,108,0.06)]">
        <div className="mb-5 flex flex-wrap gap-2">
          {(
            [
              ["access", "Truy cập dữ liệu khách"],
              ["audit", "Thao tác hệ thống"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => {
                setType(value);
                resetPage();
              }}
              className={`rounded-full px-6 py-2.5 text-[15px] font-bold transition ${
                type === value ? "bg-[#007B8A] text-white shadow" : "bg-[#f1f4f5] text-[#3e494b] hover:text-[#007B8A]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="flex min-w-[240px] flex-1 items-center rounded-full bg-[#f1f4f5] px-4 py-2.5">
            <Search size={18} className="mr-2 text-[#3e494b]" />
            <input
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                resetPage();
              }}
              placeholder={
                type === "access"
                  ? "Tìm theo tên người xem hoặc tên khách hàng…"
                  : "Tìm theo tên người thao tác hoặc hành động…"
              }
              className="w-full bg-transparent text-[15px] outline-none placeholder:text-[#6e797b]"
            />
          </div>

          {type === "access" ? (
            <select value={result} onChange={(e) => { setResult(e.target.value); resetPage(); }} className={inputCls}>
              <option value="">Kết quả: Tất cả</option>
              <option value="ALLOWED">Được phép</option>
              <option value="DENIED">Bị chặn</option>
            </select>
          ) : (
            <select value={action} onChange={(e) => { setAction(e.target.value); resetPage(); }} className={inputCls}>
              <option value="">Hành động: Tất cả</option>
              {ACTION_FILTERS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          )}

          <label className="flex items-center gap-2 text-sm text-[#3e494b]">
            Từ ngày
            <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); resetPage(); }} className={inputCls} />
          </label>
          <label className="flex items-center gap-2 text-sm text-[#3e494b]">
            Đến ngày
            <input type="date" value={to} onChange={(e) => { setTo(e.target.value); resetPage(); }} className={inputCls} />
          </label>
        </div>

        <div className="mb-4 flex flex-wrap gap-4 text-sm text-[#3e494b]">
          {type === "access" ? (
            <>
              <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-emerald-500" />Được phép: có quyền, đã xem dữ liệu</span>
              <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-red-500" />Bị chặn: không có quyền, không xem được</span>
            </>
          ) : (
            <>
              <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-[#007B8A]" />Thông thường</span>
              <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-orange-400" />Nhạy cảm: đổi vai trò, khóa, xóa</span>
              <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-red-500" />Bị chặn hoặc đăng nhập lỗi</span>
            </>
          )}
        </div>

        {error && <p className="mb-4 rounded-2xl bg-red-50 px-5 py-3 text-[15px] text-red-700">{error}</p>}

        <div className="overflow-hidden rounded-2xl border border-[#d5e3e5] shadow-sm">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-[15px]">
            <colgroup>
              <col className="w-[150px]" />
              <col className="w-[240px]" />
              <col />
              <col className="w-[150px]" />
              <col className="w-[130px]" />
            </colgroup>
            <thead>
              <tr className="bg-[#007B8A] text-left text-[13px] font-bold uppercase tracking-wider text-white">
                <th className="px-5 py-4">Thời gian</th>
                <th className="border-l border-white/15 px-5 py-4">
                  {type === "access" ? "Người truy cập" : "Người thao tác"}
                </th>
                <th className="border-l border-white/15 px-5 py-4">Mô tả</th>
                <th className="border-l border-white/15 px-5 py-4 text-center">
                  {type === "access" ? "Kết quả" : "Mức độ"}
                </th>
                <th className="border-l border-white/15 px-5 py-4 text-center">Chi tiết</th>
              </tr>
            </thead>
            <tbody>
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={5} className="bg-[#f6fafb] px-5 py-12 text-center text-[#3e494b]">
                  Chưa có nhật ký nào khớp bộ lọc.
                </td>
              </tr>
            )}

            {items.map((item) => {
              const isAccess = type === "access";
              const access = item as AccessLog;
              const audit = item as AuditLog;
              const tone: Tone = isAccess
                ? access.result === "DENIED" ? "denied" : "allowed"
                : auditTone(audit.action);
              const { date, time } = splitDateTime(item.createdAt);
              const name = isAccess ? access.accessorName : audit.actorName;
              const role = isAccess ? access.accessorRole : audit.actorRole;
              const description = isAccess ? describeAccess(access) : describeAudit(audit);
              const open = expanded === item.id;
              const oldData = isAccess ? null : parseJson(audit.oldData);
              const newData = isAccess ? null : parseJson(audit.newData);
              const hasChanges =
                !isAccess &&
                ["CREATE", "UPDATE", "DELETE", "CHANGE_ROLE", "LOCK", "UNLOCK"].includes(audit.action) &&
                (oldData || newData);

              return (
                <Fragment key={item.id}>
                  <tr className={`border-t border-[#e3eaeb] transition-colors ${ROW_BG[tone]}`}>
                    <td className={`border-l-[5px] px-5 py-4 align-middle ${ROW_STRIPE[tone]}`}>
                      <p className="font-bold tabular-nums text-[#181c1d]">{date}</p>
                      <p className="text-sm tabular-nums text-[#3e494b]">{time}</p>
                    </td>

                    <td className="border-l border-[#e3eaeb] px-5 py-4 align-middle">
                      <div className="flex min-w-0 items-center gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${name ? "bg-[#007B8A] text-white" : "bg-slate-200 text-slate-600"}`}>
                        {initials(name)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{name || "Người lạ (chưa đăng nhập)"}</p>
                        <p className="text-sm text-[#3e494b]">{role ? ROLE_LABEL[role] || role : "Không xác định"}</p>
                      </div>
                      </div>
                    </td>

                    <td className="border-l border-[#e3eaeb] px-5 py-4 align-middle font-medium leading-snug">
                      {description}
                    </td>

                    <td className="border-l border-[#e3eaeb] px-5 py-4 text-center align-middle">
                      {isAccess ? (
                        access.result === "DENIED" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1.5 text-sm font-bold text-red-700">
                            <ShieldX size={16} /> Bị chặn
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-sm font-bold text-emerald-700">
                            <CheckCircle2 size={16} /> Được phép
                          </span>
                        )
                      ) : (
                        <span className={`inline-flex rounded-full px-3 py-1.5 text-sm font-bold ${auditBadge(audit.action).cls}`}>
                          {auditBadge(audit.action).text}
                        </span>
                      )}
                    </td>

                    <td className="border-l border-[#e3eaeb] px-5 py-4 text-center align-middle">
                      <button
                        onClick={() => setExpanded(open ? null : item.id)}
                        className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-bold transition ${
                          open
                            ? "border-[#007B8A] bg-[#007B8A] text-white"
                            : "border-[#bfd9dc] bg-white text-[#007B8A] hover:border-[#007B8A]"
                        }`}
                      >
                        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        {hasChanges ? "Thay đổi" : "Chi tiết"}
                      </button>
                    </td>
                  </tr>

                  {open && (
                    <tr className={ROW_BG[tone]}>
                    <td colSpan={5} className={`border-l-[5px] px-5 pb-5 pt-1 ${ROW_STRIPE[tone]}`}>
                    <div className="space-y-4 rounded-2xl border border-[#e3eaeb] bg-white/80 p-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <DetailItem label="Thời điểm" value={`${time} ngày ${date}`} />
                        {isAccess ? (
                          <>
                            <DetailItem
                              label={access.result === "DENIED" ? "Lý do bị chặn" : "Mục đích sử dụng"}
                              value={
                                access.result === "DENIED"
                                  ? REASON_LABEL[access.reason || ""] || access.reason || "—"
                                  : PURPOSE_LABEL[access.purpose || ""] || access.purpose || "—"
                              }
                            />
                            <DetailItem label="Chủ dữ liệu" value={access.ownerName || "Không xác định"} />
                          </>
                        ) : (
                          (newData?.reason as string | undefined) && (
                            <DetailItem
                              label="Lý do"
                              value={REASON_LABEL[newData!.reason as string] || String(newData!.reason)}
                            />
                          )
                        )}
                        <DetailItem label="Máy truy cập (địa chỉ IP)" value={friendlyIp(item.ipAddress)} />
                      </div>
                      {hasChanges && <ChangeTable oldData={oldData} newData={newData} />}
                    </div>
                    </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            </tbody>
          </table>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between text-sm font-semibold text-[#3e494b]">
          <span>{total} bản ghi · Trang {page}/{totalPages}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => { setPage((p) => p - 1); setExpanded(null); }} className="rounded-full bg-[#f1f4f5] px-5 py-2 disabled:opacity-40">
              Trước
            </button>
            <button disabled={page >= totalPages} onClick={() => { setPage((p) => p + 1); setExpanded(null); }} className="rounded-full bg-[#f1f4f5] px-5 py-2 disabled:opacity-40">
              Sau
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
