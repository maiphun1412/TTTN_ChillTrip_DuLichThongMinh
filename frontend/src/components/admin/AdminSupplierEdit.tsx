"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  FileText,
  Mail,
  MapPin,
  Phone,
  Save,
  Settings,
  UserRound,
} from "lucide-react";

const API_BASE_URL = "/backend-api";

type SupplierForm = {
  supplierName: string;
  supplierType: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  taxCode: string;
  notes: string;
  isActive: boolean;
};

function emptyForm(): SupplierForm {
  return {
    supplierName: "",
    supplierType: "HOTEL",
    contactName: "",
    phone: "",
    email: "",
    address: "",
    taxCode: "",
    notes: "",
    isActive: true,
  };
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

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("vi-VN");
}

export default function AdminSupplierEdit() {
  const router = useRouter();
  const params = useParams();
  const rawId = params?.id;
const id = Array.isArray(rawId) ? rawId[0] : rawId;


  const [form, setForm] = useState<SupplierForm>(emptyForm());
  const [supplierCode, setSupplierCode] = useState("-");
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  function updateForm<K extends keyof SupplierForm>(
    key: K,
    value: SupplierForm[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

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

      const data = json?.data;

      setSupplierCode(data?.supplier_code || "-");
      setCreatedAt(data?.created_at || null);

      setForm({
        supplierName: data?.supplier_name || "",
        supplierType: data?.supplier_type || "HOTEL",
        contactName: data?.contact_name || "",
        phone: data?.phone || "",
        email: data?.email || "",
        address: data?.address || "",
        taxCode: data?.tax_code || "",
        notes: data?.notes || "",
        isActive: Boolean(data?.is_active),
      });
    } catch (error) {
      console.error("LOAD_SUPPLIER_EDIT_ERROR:", error);
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

  async function handleSave() {
    if (!form.supplierName.trim()) {
      alert("Vui lòng nhập tên nhà cung cấp");
      return;
    }

    if (!form.supplierType.trim()) {
      alert("Vui lòng chọn loại nhà cung cấp");
      return;
    }

    try {
      setSaving(true);

      const res = await fetch(`${API_BASE_URL}/admin/suppliers/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || json?.success === false) {
        alert(json?.message || "Cập nhật nhà cung cấp thất bại");
        return;
      }

      alert("Cập nhật nhà cung cấp thành công");
      router.push(`/admin/suppliers/${id}`);
      router.refresh();
    } catch (error) {
      console.error("UPDATE_SUPPLIER_ERROR:", error);
      alert("Không thể cập nhật nhà cung cấp");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-[2.5rem] bg-white p-12 text-center shadow-xl shadow-[#00606c]/5">
        <p className="text-sm font-black text-[#00606c]">
          Đang tải thông tin nhà cung cấp...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#6e797b]">
            <span>Nhà cung cấp</span>
            <span>/</span>
            <span className="text-[#00606c]">Chỉnh sửa</span>
          </div>

          <h1 className="text-3xl font-black tracking-tight text-[#00606c]">
            Chỉnh sửa nhà cung cấp
          </h1>

          <p className="mt-2 max-w-2xl text-[#3e494b]">
            Cập nhật thông tin đối tác cung ứng dịch vụ cho hệ thống tour.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => router.push(`/admin/suppliers/${id}`)}
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
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-8 xl:grid-cols-[1fr_380px]">
        <div className="space-y-8">
          <FormCard icon={Building2} title="Thông tin cơ bản">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <InputField
                label="Tên nhà cung cấp"
                value={form.supplierName}
                onChange={(value) => updateForm("supplierName", value)}
              />

              <InputField
                label="Mã nhà cung cấp"
                value={supplierCode}
                readOnly
                onChange={() => {}}
              />

              <SelectField
                label="Loại hình"
                value={form.supplierType}
                onChange={(value) => updateForm("supplierType", value)}
                options={[
                  { label: "Khách sạn / Resort", value: "HOTEL" },
                  { label: "Vận chuyển", value: "TRANSPORT" },
                  { label: "Nhà hàng", value: "RESTAURANT" },
                  { label: "Vé tham quan", value: "TICKET" },
                  { label: "Dịch vụ khác", value: "SERVICE" },
                ]}
              />

              <InputField
                label="Mã số thuế"
                value={form.taxCode}
                onChange={(value) => updateForm("taxCode", value)}
              />
            </div>
          </FormCard>

          <FormCard icon={Mail} title="Thông tin liên hệ">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <InputField
                label="Người liên hệ"
                value={form.contactName}
                icon={UserRound}
                onChange={(value) => updateForm("contactName", value)}
              />

              <InputField
                label="Số điện thoại"
                value={form.phone}
                icon={Phone}
                onChange={(value) => updateForm("phone", value)}
              />

              <div className="md:col-span-2">
                <InputField
                  label="Email"
                  type="email"
                  value={form.email}
                  icon={Mail}
                  onChange={(value) => updateForm("email", value)}
                />
              </div>

              <div className="md:col-span-2">
                <InputField
                  label="Địa chỉ trụ sở"
                  value={form.address}
                  icon={MapPin}
                  onChange={(value) => updateForm("address", value)}
                />
              </div>
            </div>
          </FormCard>
        </div>

        <aside className="space-y-8 xl:sticky xl:top-28">
          <FormCard icon={Settings} title="Cấu hình & ghi chú">
            <div className="space-y-7">
              <div className="flex items-center justify-between rounded-2xl bg-[#f1f4f5] p-4">
                <div>
                  <p className="text-sm font-black text-[#181c1d]">
                    Trạng thái hoạt động
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#6e797b]">
                    Hiện tại:{" "}
                    {form.isActive ? "Đang hoạt động" : "Ngưng hoạt động"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => updateForm("isActive", !form.isActive)}
                  className={`relative h-7 w-14 rounded-full transition ${
                    form.isActive ? "bg-[#00606c]" : "bg-[#bdc8cb]"
                  }`}
                >
                  <span
                    className={`absolute top-[2px] h-6 w-6 rounded-full bg-white transition ${
                      form.isActive ? "left-[30px]" : "left-[2px]"
                    }`}
                  />
                </button>
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-[#6e797b]">
                  Ghi chú nội bộ
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => updateForm("notes", e.target.value)}
                  placeholder="Nhập ghi chú quan trọng về đối tác này..."
                  rows={7}
                  className="w-full resize-none rounded-2xl border-none bg-[#f1f4f5] px-5 py-4 text-sm font-medium text-[#181c1d] outline-none transition focus:ring-2 focus:ring-[#00606c]"
                />
              </div>

              <div className="space-y-4 border-t border-[#bdc8cb]/20 pt-4">
                <div className="flex justify-between gap-4 text-xs font-black uppercase tracking-wider text-[#6e797b]">
                  <span>Ngày tạo</span>
                  <span className="text-right text-[#00606c]">
                    {formatDate(createdAt)}
                  </span>
                </div>
                <div className="flex justify-between gap-4 text-xs font-black uppercase tracking-wider text-[#6e797b]">
                  <span>Loại đối tác</span>
                  <span className="text-right text-[#00606c]">
                    {getSupplierTypeLabel(form.supplierType)}
                  </span>
                </div>
              </div>
            </div>
          </FormCard>

          <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#00606c] to-[#007b8a] p-8 text-white shadow-2xl shadow-[#00606c]/20">
            <div className="relative z-10">
              <Building2 size={48} className="mb-5 text-[#9defff]" />
              <h3 className="text-2xl font-black leading-tight">
                {form.supplierName || "Nhà cung cấp"}
              </h3>
              <p className="mt-2 text-sm font-semibold text-white/75">
                {supplierCode} • {getSupplierTypeLabel(form.supplierType)}
              </p>

              <div className="my-6 h-px bg-white/15" />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-white/55">
                    Trạng thái
                  </p>
                  <p className="mt-1 text-sm font-black">
                    {form.isActive ? "Hoạt động" : "Ngưng"}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-white/55">
                    Liên hệ
                  </p>
                  <p className="mt-1 text-sm font-black">
                    {form.contactName || "Chưa cập nhật"}
                  </p>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-white/5 blur-2xl" />
            <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-[#fc8a40]/10 blur-2xl" />
          </div>

          <div className="rounded-[2rem] border border-[#bdc8cb]/10 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#6e797b]">
                Vị trí / địa chỉ
              </p>
              <MapPin size={16} className="text-[#00606c]" />
            </div>

            <div className="flex h-32 items-center justify-center rounded-[1.5rem] bg-[#f1f4f5] p-5 text-center">
              <p className="text-sm font-bold leading-relaxed text-[#3e494b]">
                {form.address || "Chưa cập nhật địa chỉ trụ sở"}
              </p>
            </div>
          </div>
        </aside>
      </section>

      <footer className="fixed bottom-0 right-0 z-40 flex w-full items-center justify-end gap-4 border-t border-[#bdc8cb]/20 bg-white/80 px-10 py-5 backdrop-blur-xl xl:w-[calc(100%-18rem)]">
        <button
          onClick={() => router.push(`/admin/suppliers/${id}`)}
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
    <section className="rounded-[2.5rem] border border-[#bdc8cb]/10 bg-white p-8 shadow-sm transition hover:shadow-lg hover:shadow-[#00606c]/5">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e5f7ff] text-[#00606c]">
          <Icon size={21} />
        </div>
        <h2 className="text-lg font-black text-[#181c1d]">{title}</h2>
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
  icon: Icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  readOnly?: boolean;
  icon?: any;
}) {
  return (
    <div>
      <label className="mb-2 block px-1 text-[10px] font-black uppercase tracking-widest text-[#6e797b]">
        {label}
      </label>

      <div className="relative">
        {Icon && (
          <Icon
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6e797b]"
          />
        )}

        <input
          type={type}
          value={value}
          readOnly={readOnly}
          onChange={(e) => onChange(e.target.value)}
          className={`h-13 w-full rounded-2xl border-none px-5 py-4 text-sm font-semibold outline-none transition focus:ring-2 focus:ring-[#00606c]/20 ${
            Icon ? "pl-11" : ""
          } ${
            readOnly
              ? "cursor-not-allowed bg-[#e5e9ea] font-mono text-[#6e797b]"
              : "bg-[#f1f4f5] text-[#181c1d]"
          }`}
        />
      </div>
    </div>
  );
}

function SelectField({
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
    <div>
      <label className="mb-2 block px-1 text-[10px] font-black uppercase tracking-widest text-[#6e797b]">
        {label}
      </label>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-13 w-full rounded-2xl border-none bg-[#f1f4f5] px-5 py-4 text-sm font-semibold text-[#181c1d] outline-none transition focus:ring-2 focus:ring-[#00606c]/20"
      >
        {options.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </div>
  );
}