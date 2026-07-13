"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  FileText,
  Phone,
  RefreshCw,
  Search,
  UsersRound,
  XCircle,
} from "lucide-react";
import {
  approveGroupContract,
  getAdminGroupContracts,
  rejectGroupContract,
} from "@/lib/group-contract.api";
import GroupContractForm, {
  type GroupContractFormData,
} from "@/components/admin/GroupContractForm";
import GroupContractPreview from "@/components/admin/GroupContractPreview";

type GroupContract = {
  id: string | number;
  contract_code?: string;
  organization_name?: string;
  representative_name?: string | null;
  representative_phone?: string | null;
  representative_email?: string | null;
  expected_guest_count?: number | null;
  contract_value?: string | number;
  payment_terms?: string | null;
  cancellation_terms?: string | null;
  contract_status?: string;
  signed_date?: string | null;
  attached_file_url?: string | null;
  created_at?: string | null;
  booking_id?: string | number | null;

  booking_code?: string | null;
  booking_status?: string | null;
  tour_name?: string | null;
  tour_code?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  available_seats?: number | null;
};

type StatusFilter = "ALL" | "DRAFT" | "ACTIVE" | "REJECTED";

function formatMoney(value?: string | number | null) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("vi-VN");
}

function statusLabel(status?: string) {
  switch (status) {
    case "DRAFT":
      return "Chờ xử lý";
    case "ACTIVE":
      return "Đã duyệt";
    case "REJECTED":
      return "Từ chối";
    case "CANCELLED":
      return "Đã hủy";
    default:
      return status || "-";
  }
}

function statusClass(status?: string) {
  switch (status) {
    case "DRAFT":
      return "bg-amber-100 text-amber-700";
    case "ACTIVE":
      return "bg-emerald-100 text-emerald-700";
    case "REJECTED":
    case "CANCELLED":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

export default function AdminGroupContractsPage() {
  const [contracts, setContracts] = useState<GroupContract[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const [processingId, setProcessingId] = useState<string | number | null>(null);
  const [showContractModal, setShowContractModal] = useState(false);
  const [contractForm, setContractForm] =
    useState<GroupContractFormData | null>(null);

  async function loadContracts() {
    try {
      setLoading(true);
      const data = await getAdminGroupContracts();
      setContracts(data || []);

      if (!selectedId && data?.length > 0) {
        setSelectedId(data[0].id);
      }
    } catch (error) {
      console.error("LOAD_GROUP_CONTRACTS_ERROR:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Không tải được danh sách tour đoàn"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadContracts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredContracts = useMemo(() => {
    const q = keyword.trim().toLowerCase();

    return contracts.filter((item) => {
      const matchStatus = status === "ALL" || item.contract_status === status;

      const matchKeyword = !q
        ? true
        : [
            item.contract_code,
            item.organization_name,
            item.representative_name,
            item.representative_phone,
            item.representative_email,
            item.tour_name,
            item.booking_code,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(q);

      return matchStatus && matchKeyword;
    });
  }, [contracts, keyword, status]);

  const selected =
    filteredContracts.find((item) => item.id === selectedId) ||
    filteredContracts[0] ||
    null;

  function openContractForm(item: GroupContract) {
    setContractForm({
      contractCode: item.contract_code || `HD-${Date.now()}`,
      createdDate: new Date().toLocaleDateString("vi-VN"),
      organizationName: item.organization_name || "",
      representativeName: item.representative_name || "",
      representativePhone: item.representative_phone || "",
      representativeEmail: item.representative_email || "",
      tourName: item.tour_name || "",
      startDate: formatDate(item.start_date),
      guestCount: String(item.expected_guest_count || ""),
      contractValue: formatMoney(item.contract_value),
      depositAmount: "",
      paymentTerms:
        item.payment_terms ||
        "Bên B thanh toán tiền cọc sau khi ký hợp đồng. Phần còn lại thanh toán trước ngày khởi hành theo thỏa thuận.",
      cancellationTerms:
        item.cancellation_terms ||
        "Việc hoàn hủy được thực hiện theo chính sách của ChillTrip và thời điểm hủy dịch vụ.",
      note: "",
    });

    setShowContractModal(true);
  }

  async function handleApprove(item: GroupContract) {
    if (!item.booking_id) {
      alert("Yêu cầu này chưa liên kết booking, chưa thể duyệt.");
      return;
    }

    const availableSeats = Number(item.available_seats || 0);
    const expectedGuests = Number(item.expected_guest_count || 0);

    if (availableSeats < expectedGuests) {
      alert("Số chỗ còn lại không đủ để duyệt tour đoàn này.");
      return;
    }

    if (!confirm("Duyệt yêu cầu tour đoàn này?")) return;

    try {
      setProcessingId(item.id);
      await approveGroupContract(item.id);
      alert("Đã duyệt yêu cầu tour đoàn.");
      await loadContracts();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Không duyệt được");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReject(item: GroupContract) {
    if (!confirm("Từ chối yêu cầu tour đoàn này?")) return;

    try {
      setProcessingId(item.id);
      await rejectGroupContract(item.id);
      alert("Đã từ chối yêu cầu tour đoàn.");
      await loadContracts();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Không từ chối được");
    } finally {
      setProcessingId(null);
    }
  }

  const total = contracts.length;
  const pending = contracts.filter(
    (item) => item.contract_status === "DRAFT"
  ).length;
  const active = contracts.filter(
    (item) => item.contract_status === "ACTIVE"
  ).length;

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <Link
            href="/admin/booking"
            className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-[#007B8A] hover:underline"
          >
            <ArrowLeft size={16} />
            Quay lại đặt chỗ
          </Link>

          <h2 className="text-4xl font-extrabold tracking-tight text-[#007B8A]">
            Xử lý tour đoàn
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Kiểm tra yêu cầu tour đoàn, tạo hợp đồng từ mẫu, xuất PDF/Word và
            duyệt giữ chỗ khi đủ điều kiện.
          </p>
        </div>

        <button
          onClick={loadContracts}
          disabled={loading}
          className="inline-flex w-fit items-center gap-2 rounded-full bg-[#007B8A] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#00606c] disabled:opacity-60"
        >
          <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
          Tải lại
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <SummaryBox label="Tất cả" value={total} />
        <SummaryBox label="Chờ xử lý" value={pending} />
        <SummaryBox label="Đã duyệt" value={active} />
      </div>

      <section className="grid min-h-[680px] overflow-hidden rounded-[32px] border border-slate-100 bg-white shadow-sm xl:grid-cols-[420px_1fr]">
        <aside className="border-r border-slate-100 bg-[#f8fafb]">
          <div className="border-b border-slate-100 bg-white p-5">
            <div className="relative">
              <Search
                size={17}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Tìm công ty, mã HĐ, tour..."
                className="w-full rounded-full border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none focus:border-[#007B8A] focus:bg-white"
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <FilterButton
                active={status === "ALL"}
                onClick={() => setStatus("ALL")}
              >
                Tất cả
              </FilterButton>
              <FilterButton
                active={status === "DRAFT"}
                onClick={() => setStatus("DRAFT")}
              >
                Chờ xử lý
              </FilterButton>
              <FilterButton
                active={status === "ACTIVE"}
                onClick={() => setStatus("ACTIVE")}
              >
                Đã duyệt
              </FilterButton>
              <FilterButton
                active={status === "REJECTED"}
                onClick={() => setStatus("REJECTED")}
              >
                Từ chối
              </FilterButton>
            </div>
          </div>

          <div className="max-h-[590px] overflow-y-auto p-4">
            {loading ? (
              <div className="rounded-2xl bg-white p-8 text-center text-sm font-bold text-[#007B8A]">
                Đang tải dữ liệu...
              </div>
            ) : filteredContracts.length === 0 ? (
              <div className="rounded-2xl bg-white p-8 text-center text-sm font-bold text-slate-500">
                Không có yêu cầu tour đoàn.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredContracts.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      selected?.id === item.id
                        ? "border-[#007B8A] bg-white shadow-md"
                        : "border-transparent bg-white hover:border-slate-200"
                    }`}
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider text-[#9b4500]">
                          {item.contract_code || "-"}
                        </p>
                        <h3 className="mt-1 line-clamp-1 font-black text-slate-900">
                          {item.organization_name || "-"}
                        </h3>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-black ${statusClass(
                          item.contract_status
                        )}`}
                      >
                        {statusLabel(item.contract_status)}
                      </span>
                    </div>

                    <p className="line-clamp-1 text-sm font-semibold text-slate-600">
                      {item.tour_name || "-"}
                    </p>

                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                      <span>{Number(item.expected_guest_count || 0)} khách</span>
                      <span className="font-bold text-[#007B8A]">
                        {formatMoney(item.contract_value)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        <main className="bg-white p-7">
          {!selected ? (
            <div className="flex h-full items-center justify-center rounded-[28px] bg-slate-50 text-center">
              <div>
                <FileText className="mx-auto mb-4 text-slate-300" size={44} />
                <p className="font-black text-slate-700">
                  Chọn một yêu cầu tour đoàn để xem chi tiết
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-7">
              <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-6 md:flex-row md:items-start">
                <div>
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-[#e6fafc] px-4 py-1.5 text-xs font-black text-[#007B8A]">
                      {selected.contract_code || "-"}
                    </span>
                    <span
                      className={`rounded-full px-4 py-1.5 text-xs font-black ${statusClass(
                        selected.contract_status
                      )}`}
                    >
                      {statusLabel(selected.contract_status)}
                    </span>
                  </div>

                  <h1 className="text-3xl font-black tracking-tight text-slate-900">
                    {selected.organization_name || "-"}
                  </h1>

                  <p className="mt-2 text-sm text-slate-500">
                    Tạo ngày {formatDate(selected.created_at)} • Booking{" "}
                    {selected.booking_code || "-"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => openContractForm(selected)}
                    className="inline-flex items-center gap-2 rounded-full bg-[#9b4500] px-5 py-3 text-sm font-black text-white hover:bg-[#7a3500]"
                  >
                    <FileText size={17} />
                    Tạo hợp đồng
                  </button>

                  {selected.attached_file_url ? (
                    <Link
                      href={selected.attached_file_url}
                      target="_blank"
                      className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200"
                    >
                      <FileText size={17} />
                      Xem file
                    </Link>
                  ) : null}

                  {selected.contract_status === "DRAFT" ? (
                    <>
                      <button
                        onClick={() => handleApprove(selected)}
                        disabled={processingId === selected.id}
                        className="inline-flex items-center gap-2 rounded-full bg-[#007B8A] px-5 py-3 text-sm font-black text-white hover:bg-[#00606c] disabled:opacity-60"
                      >
                        <CheckCircle2 size={17} />
                        Duyệt
                      </button>

                      <button
                        onClick={() => handleReject(selected)}
                        disabled={processingId === selected.id}
                        className="inline-flex items-center gap-2 rounded-full bg-red-50 px-5 py-3 text-sm font-black text-red-600 hover:bg-red-100 disabled:opacity-60"
                      >
                        <XCircle size={17} />
                        Từ chối
                      </button>
                    </>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                <InfoCard
                  icon={<UsersRound size={20} />}
                  label="Số khách dự kiến"
                  value={`${Number(selected.expected_guest_count || 0)} khách`}
                />
                <InfoCard
                  icon={<CheckCircle2 size={20} />}
                  label="Chỗ còn lại"
                  value={`${Number(selected.available_seats || 0)} chỗ`}
                  danger={
                    Number(selected.available_seats || 0) <
                    Number(selected.expected_guest_count || 0)
                  }
                />
                <InfoCard
                  icon={<FileText size={20} />}
                  label="Giá trị hợp đồng"
                  value={formatMoney(selected.contract_value)}
                  money
                />
              </div>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <section className="rounded-[24px] border border-slate-100 bg-[#f8fafb] p-6">
                  <h2 className="mb-5 text-lg font-black text-[#007B8A]">
                    Thông tin đại diện
                  </h2>

                  <DetailRow
                    icon={<Building2 size={18} />}
                    label="Công ty / tổ chức"
                    value={selected.organization_name}
                  />
                  <DetailRow
                    icon={<UsersRound size={18} />}
                    label="Người đại diện"
                    value={selected.representative_name}
                  />
                  <DetailRow
                    icon={<Phone size={18} />}
                    label="Số điện thoại"
                    value={selected.representative_phone}
                  />
                  <DetailRow
                    icon={<FileText size={18} />}
                    label="Email"
                    value={selected.representative_email}
                  />
                </section>

                <section className="rounded-[24px] border border-slate-100 bg-[#f8fafb] p-6">
                  <h2 className="mb-5 text-lg font-black text-[#007B8A]">
                    Thông tin tour
                  </h2>

                  <DetailRow
                    icon={<FileText size={18} />}
                    label="Tên tour"
                    value={selected.tour_name}
                  />
                  <DetailRow
                    icon={<FileText size={18} />}
                    label="Mã tour"
                    value={selected.tour_code}
                  />
                  <DetailRow
                    icon={<CalendarDays size={18} />}
                    label="Ngày khởi hành"
                    value={formatDate(selected.start_date)}
                  />
                  <DetailRow
                    icon={<CalendarDays size={18} />}
                    label="Ngày kết thúc"
                    value={formatDate(selected.end_date)}
                  />
                </section>
              </div>

              <section className="rounded-[24px] border border-slate-100 bg-white p-6 shadow-sm">
                <h2 className="mb-5 text-lg font-black text-[#007B8A]">
                  Điều khoản hợp đồng
                </h2>

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  <TermBox
                    title="Điều khoản thanh toán"
                    value={selected.payment_terms}
                  />
                  <TermBox
                    title="Điều khoản hoàn hủy"
                    value={selected.cancellation_terms}
                  />
                </div>
              </section>

              {selected.contract_status === "DRAFT" &&
              Number(selected.available_seats || 0) <
                Number(selected.expected_guest_count || 0) ? (
                <div className="rounded-[22px] border border-red-100 bg-red-50 p-5 text-sm font-bold text-red-600">
                  Không đủ chỗ để duyệt yêu cầu này. Cần kiểm tra lại lịch khởi
                  hành hoặc tạo lịch riêng cho đoàn.
                </div>
              ) : null}
            </div>
          )}
        </main>
      </section>

      {showContractModal && contractForm ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-6">
          <div className="mx-auto max-w-7xl rounded-[28px] bg-white p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-[#007B8A]">
                  Tạo hợp đồng tour đoàn
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Chỉnh thông tin hợp đồng, xem trước và xuất PDF/Word.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowContractModal(false)}
                className="rounded-full bg-slate-100 px-5 py-2 font-bold text-slate-600 hover:bg-slate-200"
              >
                Đóng
              </button>
            </div>

            <div className="grid grid-cols-1 gap-8 xl:grid-cols-[0.9fr_1.1fr]">
              <section className="rounded-[24px] border border-slate-100 bg-[#f8fafb] p-5">
                <h3 className="mb-5 text-lg font-black text-slate-900">
                  Thông tin hợp đồng
                </h3>
                <GroupContractForm
                  value={contractForm}
                  onChange={setContractForm}
                />
              </section>

              <section className="rounded-[24px] border border-slate-100 bg-slate-50 p-5">
                <h3 className="mb-5 text-lg font-black text-slate-900">
                  Xem trước hợp đồng
                </h3>
                <GroupContractPreview data={contractForm} />
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SummaryBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[22px] bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-[#007B8A]">{value}</p>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-full bg-[#007B8A] px-4 py-2 text-xs font-bold text-white"
          : "rounded-full bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200"
      }
    >
      {children}
    </button>
  );
}

function InfoCard({
  icon,
  label,
  value,
  danger,
  money,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  danger?: boolean;
  money?: boolean;
}) {
  return (
    <div className="rounded-[24px] border border-slate-100 bg-[#f8fafb] p-5">
      <div
        className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${
          danger
            ? "bg-red-100 text-red-600"
            : money
              ? "bg-orange-100 text-[#9b4500]"
              : "bg-cyan-100 text-[#007B8A]"
        }`}
      >
        {icon}
      </div>

      <p className="text-xs font-black uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p
        className={`mt-2 text-xl font-black ${
          danger ? "text-red-600" : money ? "text-[#9b4500]" : "text-slate-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | number | null;
}) {
  return (
    <div className="flex gap-3 border-b border-slate-100 py-4 last:border-b-0">
      <span className="mt-0.5 text-[#007B8A]">{icon}</span>
      <div>
        <p className="text-xs font-black uppercase tracking-wider text-slate-400">
          {label}
        </p>
        <p className="mt-1 text-sm font-bold text-slate-800">{value || "-"}</p>
      </div>
    </div>
  );
}

function TermBox({
  title,
  value,
}: {
  title: string;
  value?: string | null;
}) {
  return (
    <div className="min-h-[120px] rounded-[20px] bg-[#f8fafb] p-5">
      <p className="mb-2 text-xs font-black uppercase tracking-wider text-slate-400">
        {title}
      </p>
      <p className="text-sm leading-6 text-slate-700">
        {value || "Chưa cập nhật"}
      </p>
    </div>
  );
}