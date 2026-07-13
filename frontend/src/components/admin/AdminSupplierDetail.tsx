"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Edit,
  Hotel,
  Mail,
  Map,
  MapPin,
  Phone,
  StickyNote,
  Trash2,
  UserRound,
  WalletCards,
} from "lucide-react";

const API_BASE_URL = "/backend-api";

type Supplier = {
  id: string | number;
  supplier_code: string;
  supplier_name: string;
  supplier_type: string;
  contact_name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  tax_code?: string | null;
  notes?: string | null;
  is_active: boolean;
  created_at?: string | null;
};

const SUPPLIER_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBArWxpWrm2r9bTrHndI0ikeHokM46mUygX_Y0jxTa5Nx23mMlZ_WbbAQNCP7D7_XsGf2cghNlLx7J6PT9Ku5q7Ub5n-0yl70CHdZVo3uTNLj6WVC7NuwF68oThfIdrMv1cdSfSfXEM0qAetts1BQFbKGrJlG-JR0yL7rzZ1RLFGLfD-OCGiaJEw_ZfOFTq_dj0rb4KdJcR1SVMhRCcFOb-DFrI0RF4kypDZHvx_kFc6vpNh_5Z4AJDXj83RjO-087G5mwhmSQLEZFM";

const MAP_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBUE7ALwV0A9qQLep6nP5GrvWTcTiPdeKAs4ZNtcDO3NbssUOZXTR2RfZ-CF7kvAggDczz7yvL6LQei5O1xHmh4LyVSJOpuE5nwYodYpbjhrFI4ZQs4zf3UP20rVTRMFDJXrvCtv43DswnJrjPUvZwzzFSeMaR7ioJPgfYbzm8FomKHtIxEha-3782WrYnWXqGZXMeREXXo979wKvJ-npsUbQb3enRZsqJZyFZGYvGXq_NSEsLQCQw49lq_GscHSo5UbcCGhdChSojW";

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("vi-VN");
}

function getSupplierTypeLabel(type?: string) {
  switch (type) {
    case "HOTEL":
      return "Khách sạn / Resort";
    case "TRANSPORT":
      return "Vận chuyển";
    case "RESTAURANT":
      return "Nhà hàng";
    case "TICKET":
      return "Vé tham quan";
    case "SERVICE":
      return "Dịch vụ khác";
    default:
      return type || "-";
  }
}

function getInitials(name?: string | null) {
  if (!name) return "NC";

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

export default function AdminSupplierDetail() {
  const router = useRouter();
  const params = useParams();
 const rawId = params?.id;
const id = Array.isArray(rawId) ? rawId[0] : rawId;

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadDetail() {
  if (!id || id === "0" || Number.isNaN(Number(id))) {
    setLoading(false);
    alert("ID nhà cung cấp không hợp lệ");
    return;
  }

    try {
      setLoading(true);

      const res = await fetch(`${API_BASE_URL}/admin/suppliers/${id}`, {
        cache: "no-store",
        credentials: "include",
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || json?.success === false) {
        alert(json?.message || "Không thể lấy chi tiết nhà cung cấp");
        router.push("/admin/suppliers");
        return;
      }

      setSupplier(json?.data || null);
    } catch (error) {
      console.error("LOAD_SUPPLIER_DETAIL_ERROR:", error);
      alert("Không thể lấy chi tiết nhà cung cấp");
      router.push("/admin/suppliers");
    } finally {
      setLoading(false);
    }
  }

 useEffect(() => {
  if (!id) return;
  loadDetail();
}, [id]);

  async function handleDelete() {
    if (!supplier) return;

    const ok = confirm(
      `Bạn có chắc muốn xóa nhà cung cấp ${supplier.supplier_name}?`
    );

    if (!ok) return;

    try {
      const res = await fetch(`${API_BASE_URL}/admin/suppliers/${supplier.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || json?.success === false) {
        alert(json?.message || "Xóa nhà cung cấp thất bại");
        return;
      }

      router.push("/admin/suppliers");
      router.refresh();
    } catch (error) {
      console.error("DELETE_SUPPLIER_ERROR:", error);
      alert("Không thể xóa nhà cung cấp");
    }
  }

  if (loading) {
    return (
      <div className="rounded-[2.5rem] bg-white p-12 text-center shadow-xl shadow-[#00606c]/5">
        <p className="text-sm font-black text-[#00606c]">
          Đang tải chi tiết nhà cung cấp...
        </p>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="rounded-[2.5rem] bg-white p-12 text-center shadow-xl shadow-[#00606c]/5">
        <p className="text-sm font-black text-[#6e797b]">
          Không tìm thấy nhà cung cấp.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#6e797b]">
            <span>Hệ thống</span>
            <span>/</span>
            <span>Nhà cung cấp</span>
            <span>/</span>
            <span className="text-[#00606c]">Chi tiết</span>
          </div>

          <h1 className="text-4xl font-black tracking-tight text-[#00606c]">
            Chi tiết nhà cung cấp
          </h1>

          <div className="flex flex-wrap items-center gap-4">
            <h2 className="text-2xl font-black text-[#181c1d]">
              {supplier.supplier_name}
            </h2>

            <span
              className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-black uppercase tracking-widest ${
                supplier.is_active
                  ? "bg-[#9defff]/30 text-[#00606c]"
                  : "bg-[#dfe3e4] text-[#3e494b]"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  supplier.is_active ? "bg-[#00606c]" : "bg-[#6e797b]"
                }`}
              />
              {supplier.is_active ? "Đang hoạt động" : "Ngưng hoạt động"}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => router.push("/admin/suppliers")}
            className="inline-flex items-center gap-2 rounded-full bg-[#dfe3e4] px-6 py-3 font-black text-[#3e494b] transition hover:bg-[#cfd5d6]"
          >
            <ArrowLeft size={18} />
            Trở lại
          </button>

          <button
            onClick={() => router.push(`/admin/suppliers/${supplier.id}/edit`)}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#9b4500] to-[#fc8a40] px-7 py-3 font-black text-white shadow-lg shadow-[#9b4500]/20 transition hover:scale-105"
          >
            <Edit size={18} />
            Chỉnh sửa
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="space-y-8 lg:col-span-4">
          <div className="overflow-hidden rounded-[2.5rem] bg-white shadow-xl shadow-[#00606c]/5">
            <div className="relative h-64">
              <img
                src={SUPPLIER_IMAGE}
                alt="Supplier Image"
                className="h-full w-full object-cover"
              />

              <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/40 bg-white/70 p-4 shadow-xl backdrop-blur-xl">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#007b8a]">
                  Mã nhà cung cấp
                </p>
                <p className="text-lg font-black text-[#00606c]">
                  {supplier.supplier_code}
                </p>
              </div>
            </div>

            <div className="space-y-4 p-6">
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-[#6e797b]">
                  Loại nhà cung cấp
                </label>
                <div className="flex items-center gap-2 font-bold text-[#181c1d]">
                  <Hotel size={19} className="text-[#00606c]" />
                  <span>{getSupplierTypeLabel(supplier.supplier_type)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[2.5rem] bg-white p-8 shadow-xl shadow-[#00606c]/5">
            <div className="mb-6 flex items-center gap-3">
              <StickyNote size={22} className="text-[#9b4500]" />
              <h3 className="text-sm font-black uppercase tracking-widest text-[#181c1d]">
                Ghi chú nội bộ
              </h3>
            </div>

            <div className="rounded-2xl border-l-4 border-[#9b4500] bg-[#ffdbc9]/30 p-4">
              <p className="text-sm font-medium italic leading-relaxed text-[#763300]">
                “{supplier.notes || "Chưa có ghi chú nội bộ cho nhà cung cấp này."}”
              </p>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#6e797b]">
                Cập nhật: {formatDate(supplier.created_at)}
              </span>

              <button
                onClick={() => router.push(`/admin/suppliers/${supplier.id}/edit`)}
                className="text-xs font-black text-[#00606c] hover:underline"
              >
                Chỉnh ghi chú
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-8 lg:col-span-8">
          <div className="rounded-[2.5rem] bg-white p-8 shadow-xl shadow-[#00606c]/5">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#9defff] text-[#00606c]">
                <Phone size={21} />
              </div>
              <h3 className="text-lg font-black uppercase tracking-widest text-[#181c1d]">
                Thông tin liên hệ
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-x-12 gap-y-8 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-[#6e797b]">
                  Người liên hệ
                </label>

                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f1f4f5] text-sm font-black text-[#00606c]">
                    {getInitials(supplier.contact_name)}
                  </div>

                  <div>
                    <p className="font-black text-[#181c1d]">
                      {supplier.contact_name || "-"}
                    </p>
                    <p className="text-xs font-semibold text-[#6e797b]">
                      Đại diện liên hệ
                    </p>
                  </div>
                </div>
              </div>

              <InfoBlock
                label="Số điện thoại"
                value={supplier.phone || "-"}
                highlight
              />

              <div>
                <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-[#6e797b]">
                  Địa chỉ Email
                </label>

                <div className="flex items-center gap-2">
                  <Mail size={16} className="text-[#bdc8cb]" />
                  <p className="font-bold text-[#181c1d]">
                    {supplier.email || "-"}
                  </p>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-[#6e797b]">
                  Địa chỉ trụ sở
                </label>

                <div className="flex items-start gap-2">
                  <MapPin size={16} className="mt-0.5 text-[#bdc8cb]" />
                  <p className="font-bold leading-relaxed text-[#181c1d]">
                    {supplier.address || "-"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[2.5rem] bg-white p-8 shadow-xl shadow-[#00606c]/5">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e5e9ea] text-[#3e494b]">
                <WalletCards size={21} />
              </div>
              <h3 className="text-lg font-black uppercase tracking-widest text-[#181c1d]">
                Thông tin hệ thống & thuế
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <SystemBox label="Mã số thuế" value={supplier.tax_code || "-"} />
              <SystemBox
                label="Ngày gia nhập hệ thống"
                value={formatDate(supplier.created_at)}
              />
              <SystemBox
                label="Trạng thái"
                value={supplier.is_active ? "Đang hoạt động" : "Ngưng hoạt động"}
              />
              <SystemBox
                label="Loại đối tác"
                value={getSupplierTypeLabel(supplier.supplier_type)}
              />
            </div>
          </div>

          <div className="relative h-48 overflow-hidden rounded-[2.5rem] shadow-xl shadow-[#00606c]/5">
            <img
              src={MAP_IMAGE}
              alt="Supplier Map"
              className="h-full w-full object-cover opacity-60 grayscale"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />

            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex items-center gap-3 rounded-full border border-white/40 bg-white/70 px-6 py-3 shadow-xl backdrop-blur-xl">
                <Map size={20} className="text-[#00606c]" />
                <span className="text-sm font-black uppercase tracking-widest text-[#00606c]">
                  Xem bản đồ chi tiết
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => router.push(`/admin/suppliers/${supplier.id}/edit`)}
              className="inline-flex items-center gap-2 rounded-full bg-[#00606c] px-7 py-3 font-black text-white shadow-lg shadow-[#00606c]/20"
            >
              <Edit size={18} />
              Chỉnh sửa thông tin
            </button>

            <button
              onClick={handleDelete}
              className="inline-flex items-center gap-2 rounded-full bg-[#ffdad6] px-7 py-3 font-black text-[#ba1a1a]"
            >
              <Trash2 size={18} />
              Xóa nhà cung cấp
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function InfoBlock({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-[#6e797b]">
        {label}
      </label>
      <p
        className={`font-black ${
          highlight ? "text-lg text-[#00606c]" : "text-[#181c1d]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function SystemBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[2rem] bg-[#f1f4f5] p-6">
      <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-[#6e797b]">
        {label}
      </label>
      <p className="text-xl font-black tracking-tight text-[#181c1d]">
        {value}
      </p>
    </div>
  );
}