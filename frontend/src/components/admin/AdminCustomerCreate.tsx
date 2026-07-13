"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Info,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  User,
  UserPlus,
  Users,
} from "lucide-react";

const API_BASE_URL = "/backend-api";

const PROFILE_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAFgNRF1o1Du7LPBCVK6F8Yr_GLWl6hL-QQrNSSqQREr85xVYTHUcqFSLqG_WCcg7h0gXl7OpWKrnC5bhdGq3OmavB2lElu6ZoULPpcltlqnIyNKPeFZPmrtiJeU0RHn__35wUDPrwYHe8dC-BCkYgG-5XSwLmEw2SVn63A-vZ3spoGh1YMg83MC92IX34YDR7dJbSmvaIkccI24o3bbPwG4m-FCfzjkBcurXarKbMrVz3bj5VPOEcK06NgG7rtiYWuKbDMaXYQdyuc";

const TRAVEL_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAPA7FyBOQopBFaZFmDcChVJQtgLANxnRekbNw4tbVRqV5pENfhpeOp4BPl4OuCbG71Ou8U77ouWQQvydf4CVMHCaBz-4dEgBjVnNMcRiwD5L__0GyyqLIp01OzEG6v2MLCOswCTrOhHsId3CyuTYHQ6LrjuvBxRXRvsxdyXY2YouYVLhLlHjgAzf2rRiXaui0vDcBP8y6vRjxD3mQbQShwpxUGjA09fywRXKpQv1OFz57e974oJo2rqZWOLMRJGINdQn_R7kDmeDwE";

type CustomerForm = {
  fullName: string;
  gender: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  address: string;
  customerType: string;
  notes: string;
};

function emptyForm(): CustomerForm {
  return {
    fullName: "",
    gender: "",
    dateOfBirth: "",
    email: "",
    phone: "",
    address: "",
    customerType: "INDIVIDUAL",
    notes: "",
  };
}

export default function AdminCustomerCreate() {
  const router = useRouter();
  const [form, setForm] = useState<CustomerForm>(emptyForm());
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!form.fullName.trim()) {
      alert("Vui lòng nhập họ tên khách hàng");
      return;
    }

    try {
      setSaving(true);

      const res = await fetch(`${API_BASE_URL}/admin/customers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: form.fullName,
          gender: form.gender,
          dateOfBirth: form.dateOfBirth,
          email: form.email,
          phone: form.phone,
          address: form.address,
          customerType: form.customerType,
          notes: form.notes,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        alert(json?.message || "Thêm khách hàng thất bại");
        return;
      }

      alert("Thêm khách hàng thành công");
      router.push("/admin/customers");
    } catch (error) {
      console.error("CREATE_CUSTOMER_ERROR:", error);
      alert("Không thể thêm khách hàng");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <button
            onClick={() => router.push("/admin/customers")}
            className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-[#00606c] shadow-sm transition hover:bg-[#9defff]/30"
          >
            <ArrowLeft size={17} />
            Quay lại danh sách khách hàng
          </button>

          <div className="mb-2 flex items-center gap-2 text-sm text-[#3e494b]">
            <span>Quản lý</span>
            <span>/</span>
            <span>Khách hàng</span>
            <span>/</span>
            <span className="font-bold text-[#00606c]">Thêm mới</span>
          </div>

          <h1 className="text-4xl font-black tracking-tight text-[#00606c]">
            Thêm khách hàng mới
          </h1>
          <p className="mt-2 max-w-xl text-[#3e494b]">
            Tạo hồ sơ khách hàng để quản lý thông tin liên hệ, lịch sử đặt tour
            và chăm sóc khách hàng về sau.
          </p>
        </div>

        <div className="rounded-[2rem] bg-white px-6 py-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#9defff] text-[#00606c]">
              <UserPlus size={22} />
            </div>
            <div>
              <p className="text-xs font-black uppercase text-[#6e797b]">
                Trạng thái
              </p>
              <p className="font-black text-[#00606c]">Đang tạo hồ sơ</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
        <section className="xl:col-span-8">
          <form
            onSubmit={handleSubmit}
            className="rounded-[3rem] bg-white p-8 shadow-sm"
          >
            <div className="mb-8 flex items-center gap-3">
              <span className="h-7 w-2 rounded-full bg-[#00606c]" />
              <h2 className="text-xl font-black text-[#00606c]">
                Thông tin cá nhân
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <InputBox
                label="Họ và tên"
                icon={<User size={18} />}
                value={form.fullName}
                placeholder="Nhập đầy đủ họ tên..."
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, fullName: value }))
                }
              />

              <InputBox
                label="Email"
                icon={<Mail size={18} />}
                value={form.email}
                placeholder="example@email.com"
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, email: value }))
                }
              />

              <InputBox
                label="Số điện thoại"
                icon={<Phone size={18} />}
                value={form.phone}
                placeholder="09xx xxx xxx"
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, phone: value }))
                }
              />

              <div>
                <label className="mb-2 block px-1 text-xs font-black uppercase tracking-wider text-[#6e797b]">
                  Ngày sinh
                </label>
                <input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      dateOfBirth: e.target.value,
                    }))
                  }
                  className="h-12 w-full rounded-2xl border-0 bg-[#e5e9ea] px-4 text-sm font-semibold outline-none transition focus:ring-4 focus:ring-[#007B8A]/10"
                />
              </div>
            </div>

            <div className="mt-6">
              <label className="mb-3 block px-1 text-xs font-black uppercase tracking-wider text-[#6e797b]">
                Giới tính
              </label>

              <div className="flex flex-wrap gap-3">
                {[
                  { label: "Nam", value: "MALE" },
                  { label: "Nữ", value: "FEMALE" },
                  { label: "Khác", value: "OTHER" },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({ ...prev, gender: item.value }))
                    }
                    className={`rounded-full px-5 py-2.5 text-sm font-bold transition ${
                      form.gender === item.value
                        ? "bg-[#00606c] text-white"
                        : "bg-[#f1f4f5] text-[#3e494b] hover:bg-[#dfe3e4]"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <InputBox
                label="Địa chỉ"
                icon={<MapPin size={18} />}
                value={form.address}
                placeholder="Số nhà, tên đường, phường/xã..."
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, address: value }))
                }
              />
            </div>

            <div className="my-8 border-t border-[#bdc8cb]/20" />

            <div className="mb-8 flex items-center gap-3">
              <span className="h-7 w-2 rounded-full bg-[#fc8a40]" />
              <h2 className="text-xl font-black text-[#00606c]">
                Cài đặt khách hàng
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block px-1 text-xs font-black uppercase tracking-wider text-[#6e797b]">
                  Loại khách hàng
                </label>
                <select
                  value={form.customerType}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      customerType: e.target.value,
                    }))
                  }
                  className="h-12 w-full rounded-2xl border-0 bg-[#e5e9ea] px-4 text-sm font-semibold outline-none transition focus:ring-4 focus:ring-[#007B8A]/10"
                >
                  <option value="INDIVIDUAL">Cá nhân</option>
                  <option value="COMPANY">Doanh nghiệp</option>
                  <option value="GROUP">Nhóm</option>
                </select>
              </div>

              <div className="rounded-2xl bg-[#e5e9ea] px-5 py-4">
                <p className="mb-1 text-xs font-black uppercase text-[#6e797b]">
                  Trạng thái
                </p>
                <div className="flex items-center justify-between">
                  <span className="font-black text-[#00606c]">
                    Hồ sơ hoạt động
                  </span>
                  <CheckCircle2 size={22} className="text-[#00606c]" />
                </div>
              </div>
            </div>

            <div className="mt-6">
              <label className="mb-2 block px-1 text-xs font-black uppercase tracking-wider text-[#6e797b]">
                Ghi chú
              </label>
              <textarea
                rows={4}
                value={form.notes}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="Thông tin thêm về khách hàng..."
                className="w-full resize-none rounded-2xl border-0 bg-[#e5e9ea] px-4 py-3 text-sm font-medium outline-none transition focus:ring-4 focus:ring-[#007B8A]/10"
              />
            </div>

            <div className="mt-8 flex flex-col justify-end gap-3 border-t border-[#bdc8cb]/20 pt-8 sm:flex-row">
              <button
                type="button"
                onClick={() => router.push("/admin/customers")}
                className="rounded-full bg-[#f1f4f5] px-8 py-3.5 font-black text-[#3e494b] transition hover:bg-[#dfe3e4]"
              >
                Hủy bỏ
              </button>

              <button
                type="submit"
                disabled={saving}
                className="flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#9b4500] to-[#fc8a40] px-10 py-3.5 font-black text-white shadow-lg shadow-[#9b4500]/20 transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={18} />
                {saving ? "Đang lưu..." : "Lưu thông tin"}
              </button>
            </div>
          </form>
        </section>

        <aside className="space-y-6 xl:col-span-4">
          <div className="relative overflow-hidden rounded-[3rem] bg-[#00606c] p-8 text-white shadow-xl">
            <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/10 blur-3xl" />

            <div className="relative z-10">
              <div className="mb-6 h-20 w-20 overflow-hidden rounded-full bg-white/20 p-1">
                <img
                  src={PROFILE_IMAGE}
                  alt="Profile Preview"
                  className="h-full w-full rounded-full object-cover"
                />
              </div>

              <p className="mb-1 text-xs font-black uppercase tracking-widest text-white/70">
                Mẫu thẻ khách hàng
              </p>

              <h3 className="mb-4 text-2xl font-black">
                {form.fullName || "ChillTrip Member"}
              </h3>

              <div className="space-y-3 text-sm text-white/90">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} />
                  <span>Bảo mật dữ liệu khách hàng</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users size={18} />
                  <span>Quản lý lịch sử đặt tour</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[3rem] bg-[#f1f4f5] p-8">
            <h4 className="mb-6 flex items-center gap-2 text-lg font-black text-[#00606c]">
              <Info size={20} />
              Hướng dẫn nhanh
            </h4>

            <div className="space-y-5">
              <GuideItem
                index="01"
                text="Kiểm tra kỹ số điện thoại để đảm bảo liên hệ và xác nhận đặt tour chính xác."
              />
              <GuideItem
                index="02"
                text="Email giúp gửi thông báo đặt tour, hóa đơn và chương trình ưu đãi."
              />
              <GuideItem
                index="03"
                text="Ghi chú có thể dùng để lưu yêu cầu riêng hoặc thói quen của khách hàng."
              />
            </div>
          </div>

          <div className="relative h-48 overflow-hidden rounded-[3rem] bg-[#ffdbc9]">
            <img
              src={TRAVEL_IMAGE}
              alt="Travel vibes"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#001f24]/70 to-transparent" />
            <div className="relative z-10 flex h-full items-end p-8">
              <p className="max-w-xs text-sm font-semibold italic leading-6 text-white">
                “Mỗi khách hàng là một hành trình mới.”
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function InputBox({
  label,
  icon,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block px-1 text-xs font-black uppercase tracking-wider text-[#6e797b]">
        {label}
      </label>
      <div className="flex h-12 items-center gap-3 rounded-2xl bg-[#e5e9ea] px-4 transition focus-within:ring-4 focus-within:ring-[#007B8A]/10">
        <span className="text-[#00606c]">{icon}</span>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm font-semibold text-[#181c1d] outline-none placeholder:text-[#6e797b]/50"
        />
      </div>
    </div>
  );
}

function GuideItem({ index, text }: { index: string; text: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-xs font-black text-[#00606c] shadow-sm">
        {index}
      </div>
      <p className="text-sm leading-6 text-[#3e494b]">{text}</p>
    </div>
  );
}