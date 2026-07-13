"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  ChevronDown,
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

const HERO_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuC3CozPcZ1gIBLLTdk_RfMGb0cicbTQsYpdwHcH2fg0AhPwHN-jwgWIp5LphPYrFHMzeWZyU4eaizcoysW0ouZmq01dsPwPWcfGT-iNJUIPL14dz7FCZYq2ZTotddYe1lIZXqqqPBIRLYnF6CNLO2t7VMvoUcZ5A9iPApa0W23lfijMK34aipTltmmZGKRT0is_jKOCAMuBhKLDvsKZ0s8av5Tf5vSm3esg9utoG9ipGuyOjkImkgQqynNRsMFCh1FkTVmElBIG3ST6";

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

export default function AdminSupplierCreate() {
  const router = useRouter();

  const [form, setForm] = useState<SupplierForm>(emptyForm());
  const [saving, setSaving] = useState(false);

  function updateForm<K extends keyof SupplierForm>(
    key: K,
    value: SupplierForm[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!form.supplierName.trim()) {
      alert("Vui lòng nhập tên nhà cung cấp");
      return;
    }

    if (!form.supplierType.trim()) {
      alert("Vui lòng chọn loại hình nhà cung cấp");
      return;
    }

    try {
      setSaving(true);

      const res = await fetch(`${API_BASE_URL}/admin/suppliers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || json?.success === false) {
        alert(json?.message || "Tạo nhà cung cấp thất bại");
        return;
      }

      alert("Tạo nhà cung cấp thành công");
      router.push("/admin/suppliers");
      router.refresh();
    } catch (error) {
      console.error("CREATE_SUPPLIER_ERROR:", error);
      alert("Không thể tạo nhà cung cấp");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-10">
      <section className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-[#00606c]">
            <span>Hệ thống</span>
            <span>/</span>
            <span>Nhà cung cấp</span>
          </div>

          <h1 className="text-4xl font-black leading-tight tracking-tight text-[#181c1d] md:text-5xl">
            Thêm nhà cung cấp{" "}
            <span className="italic text-[#00606c]">mới</span>
          </h1>

          <p className="max-w-xl text-[#3e494b]">
            Khởi tạo thông tin đối tác mới để tích hợp vào hệ thống quản lý du
            lịch ChillTrip.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => router.push("/admin/suppliers")}
            className="inline-flex items-center gap-2 rounded-full px-7 py-4 font-black text-[#3e494b] transition hover:bg-[#e5e9ea]"
          >
            <ArrowLeft size={18} />
            Hủy bỏ
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#00606c] to-[#007b8a] px-8 py-4 font-black text-white shadow-lg shadow-[#00606c]/20 transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save size={18} />
            {saving ? "Đang lưu..." : "Lưu nhà cung cấp"}
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="space-y-8 lg:col-span-8">
          <FormCard
            icon={Building2}
            title="Thông tin cơ bản"
            desc="Định danh nhà cung cấp trên hệ thống"
          >
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <InputField
                label="Tên nhà cung cấp"
                value={form.supplierName}
                placeholder="Ví dụ: Khách sạn Horizon Sky"
                onChange={(value) => updateForm("supplierName", value)}
              />

              <InputField
                label="Mã nhà cung cấp"
                value="Hệ thống tự tạo"
                readOnly
                onChange={() => {}}
              />

              <SelectField
                label="Loại hình"
                value={form.supplierType}
                onChange={(value) => updateForm("supplierType", value)}
                options={[
                  { label: "Khách sạn", value: "HOTEL" },
                  { label: "Vận chuyển", value: "TRANSPORT" },
                  { label: "Nhà hàng", value: "RESTAURANT" },
                  { label: "Vé tham quan", value: "TICKET" },
                  { label: "Khác", value: "SERVICE" },
                ]}
              />

              <InputField
                label="Mã số thuế"
                value={form.taxCode}
                placeholder="0102030405"
                onChange={(value) => updateForm("taxCode", value)}
              />
            </div>
          </FormCard>
        </div>

        <div className="lg:col-span-4">
          <section className="relative flex h-full min-h-[360px] flex-col overflow-hidden rounded-[3rem] bg-[#00606c] p-8 text-white shadow-xl shadow-[#00606c]/10">
            <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-[#007b8a] opacity-50 blur-3xl" />
            <div className="absolute bottom-0 right-0 opacity-10">
              <Settings size={140} />
            </div>

            <div className="relative z-10 flex flex-1 flex-col gap-8">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20">
                  <Settings size={21} />
                </div>
                <h2 className="text-xl font-black">Cấu hình hệ thống</h2>
              </div>

              <div className="rounded-2xl bg-white/10 p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-black">Trạng thái hoạt động</p>
                    <p className="text-xs font-semibold text-white/70">
                      Kích hoạt ngay khi tạo
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => updateForm("isActive", !form.isActive)}
                    className={`relative h-6 w-11 rounded-full transition ${
                      form.isActive ? "bg-[#fc8a40]" : "bg-white/20"
                    }`}
                  >
                    <span
                      className={`absolute top-[2px] h-5 w-5 rounded-full bg-white transition ${
                        form.isActive ? "left-[22px]" : "left-[2px]"
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 ml-1 block text-xs font-black uppercase tracking-widest text-white/70">
                  Ghi chú nội bộ
                </label>

                <textarea
                  value={form.notes}
                  onChange={(e) => updateForm("notes", e.target.value)}
                  placeholder="Nhập lưu ý đặc biệt cho nhà cung cấp này..."
                  rows={7}
                  className="w-full resize-none rounded-2xl border-none bg-white/10 px-6 py-4 text-sm font-semibold text-white outline-none placeholder:text-white/40 focus:ring-2 focus:ring-white/30"
                />
              </div>
            </div>
          </section>
        </div>

        <div className="lg:col-span-12">
          <FormCard
            icon={Phone}
            title="Thông tin liên hệ"
            desc="Thông tin chi tiết để kết nối với đối tác"
            iconWrap="bg-[#ffdbc9]"
            iconColor="text-[#9b4500]"
          >
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <InputField
                label="Người liên hệ"
                value={form.contactName}
                placeholder="Họ và tên"
                icon={UserRound}
                onChange={(value) => updateForm("contactName", value)}
              />

              <InputField
                label="Số điện thoại"
                value={form.phone}
                placeholder="+84 9xx xxx xxx"
                icon={Phone}
                onChange={(value) => updateForm("phone", value)}
              />

              <InputField
                label="Email"
                type="email"
                value={form.email}
                placeholder="contact@supplier.com"
                icon={Mail}
                onChange={(value) => updateForm("email", value)}
              />

              <div className="md:col-span-3">
                <InputField
                  label="Địa chỉ trụ sở"
                  value={form.address}
                  placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố"
                  icon={MapPin}
                  onChange={(value) => updateForm("address", value)}
                />
              </div>
            </div>
          </FormCard>
        </div>

        <div className="lg:col-span-12">
          <section className="relative h-64 overflow-hidden rounded-[3rem] shadow-2xl">
            <img
              src={HERO_IMAGE}
              alt="Mở rộng mạng lưới ChillTrip"
              className="h-full w-full object-cover"
            />

            <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent p-8">
              <div className="text-white">
                <h3 className="text-2xl font-black">
                  Mở rộng mạng lưới ChillTrip
                </h3>
                <p className="text-white/80">
                  Kết nối những trải nghiệm tuyệt vời nhất đến với du khách toàn
                  cầu.
                </p>
              </div>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

function FormCard({
  icon: Icon,
  title,
  desc,
  children,
  iconWrap = "bg-[#9defff]",
  iconColor = "text-[#00606c]",
}: {
  icon: any;
  title: string;
  desc: string;
  children: React.ReactNode;
  iconWrap?: string;
  iconColor?: string;
}) {
  return (
    <section className="rounded-[3rem] border border-[#bdc8cb]/10 bg-white p-8 shadow-sm">
      <div className="mb-8 flex items-center gap-3">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconWrap} ${iconColor}`}
        >
          <Icon size={23} />
        </div>

        <div>
          <h2 className="text-xl font-black text-[#181c1d]">{title}</h2>
          <p className="text-sm font-semibold text-[#3e494b]">{desc}</p>
        </div>
      </div>

      {children}
    </section>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  readOnly,
  icon: Icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  readOnly?: boolean;
  icon?: any;
}) {
  return (
    <div>
      <label className="mb-2 ml-1 block text-xs font-black uppercase tracking-widest text-[#00606c]">
        {label}
      </label>

      <div className="relative">
        {Icon && (
          <Icon
            size={17}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6e797b]"
          />
        )}

        <input
          type={type}
          value={value}
          readOnly={readOnly}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`h-14 w-full rounded-2xl border-none bg-[#f1f4f5] px-6 text-sm font-semibold outline-none transition placeholder:text-[#6e797b]/60 focus:ring-2 focus:ring-[#00606c]/30 ${
            Icon ? "pl-12" : ""
          } ${readOnly ? "cursor-not-allowed text-[#6e797b]" : "text-[#181c1d]"}`}
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
      <label className="mb-2 ml-1 block text-xs font-black uppercase tracking-widest text-[#00606c]">
        {label}
      </label>

      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-14 w-full appearance-none rounded-2xl border-none bg-[#f1f4f5] px-6 text-sm font-semibold text-[#181c1d] outline-none transition focus:ring-2 focus:ring-[#00606c]/30"
        >
          {options.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        <ChevronDown
          size={18}
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#6e797b]"
        />
      </div>
    </div>
  );
}