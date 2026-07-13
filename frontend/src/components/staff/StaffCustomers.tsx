"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Crown,
  Download,
  Edit3,
  Eye,
  FileCheck2,
  History,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  RefreshCcw,
  Search,
  Send,
  TrendingUp,
  UserPlus,
  UserRound,
  Users,
  Wallet,
  X,
} from "lucide-react";
import {
  getStaffCustomerDetailApi,
  getStaffCustomersApi,
  saveStaffCustomerApi,
  sendStaffCustomerMessageApi,
  type StaffCustomerDetailData,
  type StaffCustomerItem,
  type StaffCustomerPayload,
} from "@/lib/api/staff.api";

const PAGE_SIZE = 10;

type MemberLevel = "Platinum" | "Gold" | "Silver";

type FilterValue = "ALL" | "INDIVIDUAL" | "CORPORATE" | MemberLevel;

type FormState = {
  id?: string;
  fullName: string;
  gender: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  address: string;
  customerType: string;
  notes: string;
};

function emptyForm(): FormState {
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

function formFromCustomer(customer: StaffCustomerItem): FormState {
  return {
    id: customer.id,
    fullName: customer.fullName || "",
    gender: customer.gender || "",
    dateOfBirth: "",
    email: customer.email || "",
    phone: customer.phone || "",
    address: customer.address || "",
    customerType: customer.customerType || "INDIVIDUAL",
    notes: customer.notes || "",
  };
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value || 0) + "đ";
}

function getCustomerTypeLabel(type: string) {
  if (type === "INDIVIDUAL") return "Cá nhân";
  if (type === "CORPORATE") return "Doanh nghiệp";
  return type || "Chưa rõ";
}

function getInitials(name: string) {
  return name
    .trim()
    .split(" ")
    .map((item) => item[0])
    .join("")
    .slice(-2)
    .toUpperCase();
}

function getMemberLevel(customer: StaffCustomerItem): MemberLevel {
  if (customer.totalSpent >= 50000000) return "Platinum";
  if (customer.totalSpent >= 15000000) return "Gold";
  return "Silver";
}

function getCustomerStatus(customer: StaffCustomerItem) {
  if (!customer.userStatus) return "Chưa có tài khoản";
  if (customer.userStatus === "ACTIVE") return "Hoạt động";
  if (customer.userStatus === "INACTIVE") return "Tạm khóa";
  return customer.userStatus;
}

function getStatusClass(status: string) {
  if (status === "Hoạt động") return "bg-emerald-50 text-emerald-600";
  if (status === "Tạm khóa") return "bg-[#ffdad6]/40 text-[#ba1a1a]";
  return "bg-[#f1f4f5] text-[#3e494b]";
}

export default function StaffCustomers() {
  const [customers, setCustomers] = useState<StaffCustomerItem[]>([]);
  const [summary, setSummary] = useState({
    totalCustomers: 0,
    individualCustomers: 0,
    corporateCustomers: 0,
    customersWithBookings: 0,
  });

  const [keyword, setKeyword] = useState("");
  const [filter, setFilter] = useState<FilterValue>("ALL");
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [openDetail, setOpenDetail] = useState(false);
  const [detail, setDetail] = useState<StaffCustomerDetailData | null>(null);
  const [detailTab, setDetailTab] = useState<"profile" | "history">("profile");

  const [openForm, setOpenForm] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState<FormState>(emptyForm());

  const [openMessage, setOpenMessage] = useState(false);
  const [messageTarget, setMessageTarget] = useState<StaffCustomerItem | null>(
    null
  );
  const [messageTitle, setMessageTitle] = useState("");
  const [messageContent, setMessageContent] = useState("");

  const [openReport, setOpenReport] = useState(false);

  const filteredCustomers = useMemo(() => {
    let result = [...customers];

    if (filter === "INDIVIDUAL" || filter === "CORPORATE") {
      result = result.filter((item) => item.customerType === filter);
    }

    if (filter === "Platinum" || filter === "Gold" || filter === "Silver") {
      result = result.filter((item) => getMemberLevel(item) === filter);
    }

    return result;
  }, [customers, filter]);

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / PAGE_SIZE));

  const pagedCustomers = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredCustomers.slice(start, start + PAGE_SIZE);
  }, [filteredCustomers, page]);

  const report = useMemo(() => {
  const totalSpent = customers.reduce((sum, item) => sum + item.totalSpent, 0);

  const platinumCustomers = customers.filter(
    (item) => getMemberLevel(item) === "Platinum"
  );
  const goldCustomers = customers.filter((item) => getMemberLevel(item) === "Gold");
  const silverCustomers = customers.filter(
    (item) => getMemberLevel(item) === "Silver"
  );

  const individual = customers.filter(
    (item) => item.customerType === "INDIVIDUAL"
  ).length;

  const corporate = customers.filter(
    (item) => item.customerType === "CORPORATE"
  ).length;

  const active = customers.filter(
    (item) => getCustomerStatus(item) === "Hoạt động"
  ).length;

  const platinumSpent = platinumCustomers.reduce(
    (sum, item) => sum + item.totalSpent,
    0
  );
  const goldSpent = goldCustomers.reduce((sum, item) => sum + item.totalSpent, 0);
  const silverSpent = silverCustomers.reduce(
    (sum, item) => sum + item.totalSpent,
    0
  );

  return {
    totalSpent,
    platinum: platinumCustomers.length,
    gold: goldCustomers.length,
    silver: silverCustomers.length,
    individual,
    corporate,
    active,
    averageSpent: customers.length ? Math.round(totalSpent / customers.length) : 0,
    spentByLevel: {
      platinum: platinumSpent,
      gold: goldSpent,
      silver: silverSpent,
    },
  };
}, [customers]);

  async function loadCustomers(options?: {
    nextKeyword?: string;
    nextFilter?: FilterValue;
  }) {
    try {
      setLoading(true);
      setErrorMessage("");

      const nextKeyword = options?.nextKeyword ?? keyword;
      const nextFilter = options?.nextFilter ?? filter;

      const customerType =
        nextFilter === "INDIVIDUAL" || nextFilter === "CORPORATE"
          ? nextFilter
          : "ALL";

      const result = await getStaffCustomersApi({
        keyword: nextKeyword,
        customerType,
      });

      setCustomers(result.customers);
      setSummary(result.summary);
      setPage(1);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Không tải được khách hàng"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers({ nextFilter: filter });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadCustomers({ nextKeyword: keyword });
    }, 350);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword]);

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function openCreateModal() {
    setFormMode("create");
    setForm(emptyForm());
    setOpenForm(true);
  }

  function openEditModal(customer: StaffCustomerItem) {
    setFormMode("edit");
    setForm(formFromCustomer(customer));
    setOpenForm(true);
  }

  async function openCustomerDetail(
    customer: StaffCustomerItem,
    tab: "profile" | "history" = "profile"
  ) {
    try {
      setDetailTab(tab);
      setDetailLoading(true);
      setOpenDetail(true);
      setDetail(null);

      const result = await getStaffCustomerDetailApi(customer.id);
      setDetail(result);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Không tải được hồ sơ.");
      setOpenDetail(false);
    } finally {
      setDetailLoading(false);
    }
  }

  function openMessagePopup(customer: StaffCustomerItem) {
    setMessageTarget(customer);
    setMessageTitle(`Thông báo từ ChillTrip`);
    setMessageContent("");
    setOpenMessage(true);
  }

  async function handleSendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!messageTarget) return;

    try {
      setActionLoading(true);

      await sendStaffCustomerMessageApi({
        customerId: messageTarget.id,
        title: messageTitle.trim(),
        content: messageContent.trim(),
      });

      alert("Đã tạo thông báo / email chăm sóc khách hàng.");
      setOpenMessage(false);
      setMessageTarget(null);
      setMessageTitle("");
      setMessageContent("");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Không gửi được tin nhắn.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setActionLoading(true);

      const payload: StaffCustomerPayload = {
        id: form.id,
        fullName: form.fullName.trim(),
        gender: form.gender,
        dateOfBirth: form.dateOfBirth,
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        customerType: form.customerType,
        notes: form.notes.trim(),
      };

      await saveStaffCustomerApi(payload);

      alert(
        formMode === "create"
          ? "Tạo khách hàng thành công."
          : "Cập nhật khách hàng thành công."
      );

      setOpenForm(false);
      setForm(emptyForm());
      await loadCustomers();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Không lưu được khách hàng.");
    } finally {
      setActionLoading(false);
    }
  }

  function exportCustomersCsv() {
    const headers = [
      "Mã KH",
      "Tên khách hàng",
      "Email",
      "Số điện thoại",
      "Loại khách",
      "Hạng",
      "Tổng chi tiêu",
      "Tổng booking",
      "Trạng thái",
    ];

    const rows = filteredCustomers.map((item) => [
      item.customerCode,
      item.fullName,
      item.email || "",
      item.phone || "",
      getCustomerTypeLabel(item.customerType),
      getMemberLevel(item),
      item.totalSpent,
      item.totalBookings,
      getCustomerStatus(item),
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `chilltrip-khach-hang-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function resetFilters() {
    setKeyword("");
    setFilter("ALL");
    setPage(1);
    loadCustomers({
      nextKeyword: "",
      nextFilter: "ALL",
    });
  }

  if (loading && customers.length === 0) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="flex items-center gap-3 rounded-[2rem] bg-white px-6 py-4 shadow-sm">
          <Loader2 className="animate-spin text-[#00606c]" size={22} />
          <span className="font-semibold text-[#00606c]">
            Đang tải khách hàng...
          </span>
        </div>
      </div>
    );
  }

  if (errorMessage && customers.length === 0) {
    return (
      <div className="rounded-[2rem] border border-red-200 bg-white p-6 text-red-700 shadow-sm">
        <div className="mb-2 flex items-center gap-2 font-bold">
          <AlertCircle size={20} />
          Không tải được dữ liệu
        </div>

        <p className="text-sm">{errorMessage}</p>

        <button
          type="button"
          onClick={() => loadCustomers()}
          className="mt-5 rounded-full bg-[#00606c] px-5 py-2 text-sm font-bold text-white"
        >
          Tải lại
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 pb-12">
      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-[#00606c]">
            Quản lý khách hàng
          </h1>
          <p className="mt-2 max-w-3xl text-[#3e494b]">
            Theo dõi hồ sơ khách hàng, hạng hội viên, lịch sử đặt chỗ và hỗ trợ
            chăm sóc khách hàng từ dữ liệu thật trong hệ thống.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 rounded-full bg-[#fc8a40] px-5 py-3 text-sm font-black text-white shadow-sm transition hover:scale-105"
        >
          <Plus size={17} />
          Thêm khách hàng
        </button>
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <StatCard
          title="Tổng khách hàng"
          value={summary.totalCustomers.toLocaleString("vi-VN")}
          desc={`${summary.customersWithBookings} khách đã từng đặt tour`}
          icon={<Users size={30} />}
          iconClass="bg-[#9defff] text-[#00606c]"
          valueClass="text-[#00606c]"
        />

        <StatCard
          title="Khách cá nhân"
          value={summary.individualCustomers.toLocaleString("vi-VN")}
          desc="Lọc theo INDIVIDUAL"
          icon={<UserPlus size={30} />}
          iconClass="bg-[#ffdbc9] text-[#9b4500]"
          valueClass="text-[#9b4500]"
        />

        <StatCard
          title="Gold / Platinum"
          value={(report.gold + report.platinum).toLocaleString("vi-VN")}
          desc={`Platinum: ${report.platinum}, Gold: ${report.gold}`}
          icon={<Crown size={30} />}
          iconClass="bg-[#b3ebff] text-[#006074]"
          valueClass="text-[#006074]"
        />
      </section>

      <section className="overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 p-6">
          <div>
            <h2 className="text-xl font-bold text-[#00606c]">
              Danh sách khách hàng
            </h2>
            <p className="mt-1 text-sm text-[#3e494b]">
              Hiển thị dữ liệu thật từ bảng khách hàng, booking và công nợ.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-72">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6e797b]"
              />
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                className="h-10 w-full rounded-full bg-[#f6fafb] pl-10 pr-4 text-sm font-semibold outline-none ring-1 ring-[#ebeeef] focus:ring-2 focus:ring-[#00606c]/30"
                placeholder="Tìm khách hàng..."
              />
            </div>

            <button
              type="button"
              onClick={resetFilters}
              className="flex items-center gap-2 rounded-full bg-[#f1f4f5] px-4 py-2 text-sm font-bold text-[#3e494b]"
            >
              <RefreshCcw size={16} />
              Làm mới
            </button>

            <button
              type="button"
              onClick={exportCustomersCsv}
              className="flex items-center gap-2 text-sm font-bold text-[#00606c]"
            >
              <Download size={17} />
              Xuất dữ liệu
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-y border-[#bdc8cb]/10 bg-[#f8fafb] px-6 py-4">
          <span className="mr-2 text-sm font-medium text-[#3e494b]">
            Lọc theo:
          </span>

          <FilterButton active={filter === "ALL"} onClick={() => setFilter("ALL")}>
            Tất cả
          </FilterButton>
          <FilterButton
            active={filter === "INDIVIDUAL"}
            onClick={() => setFilter("INDIVIDUAL")}
          >
            Khách cá nhân
          </FilterButton>
          <FilterButton
            active={filter === "CORPORATE"}
            onClick={() => setFilter("CORPORATE")}
          >
            Khách doanh nghiệp
          </FilterButton>
          <FilterButton
            active={filter === "Platinum"}
            onClick={() => setFilter("Platinum")}
          >
            Platinum
          </FilterButton>
          <FilterButton active={filter === "Gold"} onClick={() => setFilter("Gold")}>
            Gold
          </FilterButton>
          <FilterButton
            active={filter === "Silver"}
            onClick={() => setFilter("Silver")}
          >
            Silver
          </FilterButton>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[#bdc8cb]/10 bg-[#f1f4f5]/50">
                <TableHead>Mã KH</TableHead>
                <TableHead>Tên khách hàng</TableHead>
                <TableHead>Email / SĐT</TableHead>
                <TableHead>Loại khách</TableHead>
                <TableHead>Hạng thành viên</TableHead>
                <TableHead>Tổng chi tiêu</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead center>Hành động</TableHead>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#bdc8cb]/10">
              {pagedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <Users className="mx-auto mb-3 text-[#6e797b]" size={34} />
                    <p className="font-black text-[#181c1d]">
                      Không tìm thấy khách hàng
                    </p>
                  </td>
                </tr>
              ) : (
                pagedCustomers.map((customer) => {
                  const level = getMemberLevel(customer);
                  const status = getCustomerStatus(customer);

                  return (
                    <tr
                      key={customer.id}
                      className="group transition-colors hover:bg-[#00606c]/5"
                    >
                      <td className="px-6 py-5 font-mono text-xs font-bold text-[#00606c]">
                        {customer.customerCode}
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-black ${
                              level === "Gold"
                                ? "bg-[#ffdbc9] text-[#9b4500]"
                                : level === "Silver"
                                ? "bg-[#dfe3e4] text-[#3e494b]"
                                : "bg-[#9defff] text-[#00606c]"
                            }`}
                          >
                            {customer.avatarUrl ? (
                              <img
                                src={customer.avatarUrl}
                                alt={customer.fullName}
                                className="h-full w-full rounded-full object-cover"
                              />
                            ) : (
                              getInitials(customer.fullName)
                            )}
                          </div>

                          <div>
                            <span className="font-bold text-[#181c1d]">
                              {customer.fullName}
                            </span>
                            <p className="text-xs text-[#3e494b]">
                              Booking: {customer.totalBookings}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <div className="text-sm">
                          <p className="font-medium text-[#181c1d]">
                            {customer.email || "Chưa có email"}
                          </p>
                          <p className="text-xs text-[#3e494b]">
                            {customer.phone || "Chưa có SĐT"}
                          </p>
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <span className="rounded-full bg-[#f1f4f5] px-3 py-1 text-xs font-black text-[#3e494b]">
                          {getCustomerTypeLabel(customer.customerType)}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <LevelBadge level={level} />
                      </td>

                      <td className="px-6 py-5 font-bold text-[#181c1d]">
                        {formatMoney(customer.totalSpent)}
                      </td>

                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${getStatusClass(
                            status
                          )}`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {status}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex items-center justify-center gap-2">
                          <ActionButton
                            title="Xem chi tiết"
                            onClick={() => openCustomerDetail(customer, "profile")}
                          >
                            <Eye size={18} />
                          </ActionButton>

                          <ActionButton
                            title="Lịch sử đặt chỗ"
                            onClick={() => openCustomerDetail(customer, "history")}
                          >
                            <History size={18} />
                          </ActionButton>

                          <ActionButton
                            title="Nhắn tin"
                            orange
                            onClick={() => openMessagePopup(customer)}
                          >
                            <MessageCircle size={18} />
                          </ActionButton>

                          <ActionButton
                            title="Sửa thông tin"
                            onClick={() => openEditModal(customer)}
                          >
                            <Edit3 size={18} />
                          </ActionButton>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#bdc8cb]/10 p-6">
          <p className="text-sm text-[#3e494b]">
            Hiển thị{" "}
            {filteredCustomers.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1} -{" "}
            {Math.min(page * PAGE_SIZE, filteredCustomers.length)} trên tổng số{" "}
            {filteredCustomers.length} khách hàng
          </p>

          <div className="flex items-center gap-1">
            <PageButton
              disabled={page <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              <ChevronLeft size={18} />
            </PageButton>

            {Array.from({ length: Math.min(totalPages, 5) }).map((_, index) => {
              const pageNumber = index + 1;

              return (
                <PageButton
                  key={pageNumber}
                  active={page === pageNumber}
                  onClick={() => setPage(pageNumber)}
                >
                  {pageNumber}
                </PageButton>
              );
            })}

            {totalPages > 5 && <span className="px-2 text-[#3e494b]">...</span>}

            {totalPages > 5 && (
              <PageButton
                active={page === totalPages}
                onClick={() => setPage(totalPages)}
              >
                {totalPages}
              </PageButton>
            )}

            <PageButton
              disabled={page >= totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            >
              <ChevronRight size={18} />
            </PageButton>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-8 pb-12 lg:grid-cols-2">
        <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-[#00606c] to-[#007b8a] p-8 text-white shadow-xl">
          <div className="relative z-10">
            <h4 className="mb-2 text-2xl font-black">
              Tăng trưởng khách hàng
            </h4>
            <p className="max-w-sm text-sm leading-relaxed text-[#9defff]/90">
              Hiện có {report.platinum} khách Platinum, {report.gold} khách
              Gold. Tổng doanh thu từ nhóm khách đã ghi nhận là{" "}
              {formatMoney(report.totalSpent)}.
            </p>

            <button
              type="button"
              onClick={() => setOpenReport(true)}
              className="mt-6 rounded-full bg-white px-6 py-2.5 font-bold text-[#00606c] shadow-sm transition hover:scale-105"
            >
              Xem báo cáo chi tiết
            </button>
          </div>

          <BarChart3 className="absolute -bottom-10 right-0 h-48 w-48 text-white/10 transition group-hover:scale-110" />
        </div>

        <div className="relative overflow-hidden rounded-xl border border-[#bdc8cb]/10 bg-[#f1f4f5] p-8">
          <h4 className="mb-6 flex items-center gap-2 text-xl font-bold text-[#181c1d]">
            <MessageCircle size={22} className="text-[#9b4500]" />
            Thông báo nhanh cho khách hàng
          </h4>

          <div className="space-y-4">
            <textarea
              value={messageContent}
              onChange={(event) => setMessageContent(event.target.value)}
              className="h-24 w-full rounded-xl border-none bg-white p-4 text-sm outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-[#9b4500]/20"
              placeholder="Nhập thông điệp chăm sóc khách hàng..."
            />

            <div className="flex items-center justify-between gap-4">
              <p className="text-xs text-[#3e494b]">
                Chọn một khách trong bảng rồi bấm nút nhắn tin để gửi trực tiếp.
              </p>

              <button
                type="button"
                onClick={() => {
                  const firstCustomer = filteredCustomers[0];
                  if (!firstCustomer) {
                    alert("Không có khách hàng để gửi thông báo.");
                    return;
                  }

                  setMessageTarget(firstCustomer);
                  setMessageTitle("Thông báo từ ChillTrip");
                  setOpenMessage(true);
                }}
                className="flex shrink-0 items-center gap-2 rounded-full bg-[#9b4500] px-6 py-2.5 font-bold text-white transition hover:shadow-lg"
              >
                <Send size={16} />
                Chọn khách gửi
              </button>
            </div>
          </div>
        </div>
      </section>

      {openDetail && (
        <CustomerDetailModal
          loading={detailLoading}
          detail={detail}
          activeTab={detailTab}
          setActiveTab={setDetailTab}
          onClose={() => setOpenDetail(false)}
          onEdit={() => {
            if (!detail) return;
            setOpenDetail(false);
            openEditModal(detail.customer);
          }}
          onMessage={() => {
            if (!detail) return;
            setOpenDetail(false);
            openMessagePopup(detail.customer);
          }}
        />
      )}

      {openMessage && messageTarget && (
        <MessageModal
          customer={messageTarget}
          title={messageTitle}
          content={messageContent}
          loading={actionLoading}
          setTitle={setMessageTitle}
          setContent={setMessageContent}
          onClose={() => setOpenMessage(false)}
          onSubmit={handleSendMessage}
        />
      )}

      {openReport && (
        <ReportModal
          report={report}
          totalCustomers={customers.length}
          onClose={() => setOpenReport(false)}
        />
      )}

      {openForm && (
        <CustomerFormModal
          mode={formMode}
          form={form}
          actionLoading={actionLoading}
          onClose={() => {
            if (!actionLoading) setOpenForm(false);
          }}
          onSubmit={handleSave}
          updateForm={updateForm}
        />
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  desc,
  icon,
  iconClass,
  valueClass,
}: {
  title: string;
  value: string;
  desc: string;
  icon: React.ReactNode;
  iconClass: string;
  valueClass: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-[#bdc8cb]/5 bg-white p-6 shadow-sm">
      <div>
        <p className="text-sm font-bold uppercase tracking-wider text-[#3e494b]">
          {title}
        </p>
        <h3 className={`mt-1 text-4xl font-black ${valueClass}`}>{value}</h3>
        <p className="mt-2 flex items-center gap-1 text-xs text-[#007b8a]">
          <TrendingUp size={13} />
          {desc}
        </p>
      </div>

      <div
        className={`flex h-16 w-16 items-center justify-center rounded-2xl ${iconClass}`}
      >
        {icon}
      </div>
    </div>
  );
}

function FilterButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
        active
          ? "bg-[#00606c] text-white"
          : "bg-slate-100 text-slate-500 hover:bg-[#9defff]"
      }`}
    >
      {children}
    </button>
  );
}

function LevelBadge({ level }: { level: MemberLevel }) {
  const className =
    level === "Platinum"
      ? "bg-[#b3ebff] text-[#006074]"
      : level === "Gold"
      ? "bg-[#ffdbc9] text-[#9b4500]"
      : "bg-[#e5e9ea] text-[#3e494b]";

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black uppercase tracking-tighter ${className}`}
    >
      {level}
    </span>
  );
}

function ActionButton({
  children,
  orange,
  title,
  onClick,
}: {
  children: React.ReactNode;
  orange?: boolean;
  title?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`rounded-full p-2 shadow-sm transition hover:bg-white ${
        orange ? "text-[#9b4500]" : "text-[#00606c]"
      }`}
    >
      {children}
    </button>
  );
}

function TableHead({
  children,
  center,
}: {
  children: React.ReactNode;
  center?: boolean;
}) {
  return (
    <th
      className={`px-6 py-4 text-xs font-black uppercase tracking-widest text-[#3e494b] ${
        center ? "text-center" : ""
      }`}
    >
      {children}
    </th>
  );
}

function PageButton({
  children,
  active,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex h-10 w-10 items-center justify-center rounded-full font-bold transition disabled:opacity-40 ${
        active
          ? "bg-[#00606c] text-white shadow-sm"
          : "text-[#3e494b] hover:bg-[#ebeeef]"
      }`}
    >
      {children}
    </button>
  );
}
function CustomerDetailModal({
  loading,
  detail,
  activeTab,
  setActiveTab,
  onClose,
  onEdit,
  onMessage,
}: {
  loading: boolean;
  detail: StaffCustomerDetailData | null;
  activeTab: "profile" | "history";
  setActiveTab: (tab: "profile" | "history") => void;
  onClose: () => void;
  onEdit: () => void;
  onMessage: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-6 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#ebeeef] bg-[#00606c] px-7 py-5 text-white">
          <div>
            <h2 className="text-2xl font-black">Chi tiết khách hàng</h2>
            <p className="mt-1 text-sm font-semibold text-[#ddf9ff]">
              Hồ sơ, lịch sử đặt tour, hành khách, giấy tờ và công nợ.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[76vh] overflow-y-auto p-6">
          {loading || !detail ? (
            <div className="flex min-h-[360px] items-center justify-center">
              <Loader2 className="animate-spin text-[#00606c]" size={28} />
            </div>
          ) : (
            <div className="space-y-5">
              <section className="rounded-[1.5rem] bg-[#f6fafb] p-5">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[#00606c]">
                      {detail.customer.customerCode}
                    </p>
                    <h3 className="mt-1 text-2xl font-black text-[#181c1d]">
                      {detail.customer.fullName}
                    </h3>
                    <p className="mt-2 text-sm font-semibold text-[#6e797b]">
                      {detail.customer.email || "Chưa có email"} •{" "}
                      {detail.customer.phone || "Chưa có SĐT"}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#6e797b]">
                      {detail.customer.address || "Chưa có địa chỉ"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={onEdit}
                      className="rounded-full bg-[#00606c] px-5 py-2.5 text-xs font-black text-white"
                    >
                      Sửa hồ sơ
                    </button>
                    <button
                      type="button"
                      onClick={onMessage}
                      className="rounded-full bg-[#9b4500] px-5 py-2.5 text-xs font-black text-white"
                    >
                      Nhắn tin
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                  <InfoBox label="Loại khách" value={getCustomerTypeLabel(detail.customer.customerType)} />
                  <InfoBox label="Hạng" value={getMemberLevel(detail.customer)} />
                  <InfoBox label="Booking" value={detail.customer.totalBookings} />
                  <InfoBox label="Tổng chi" value={formatMoney(detail.customer.totalSpent)} />
                </div>
              </section>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("profile")}
                  className={`rounded-full px-4 py-2 text-sm font-black ${
                    activeTab === "profile"
                      ? "bg-[#00606c] text-white"
                      : "bg-[#f1f4f5] text-[#3e494b]"
                  }`}
                >
                  Hồ sơ
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("history")}
                  className={`rounded-full px-4 py-2 text-sm font-black ${
                    activeTab === "history"
                      ? "bg-[#00606c] text-white"
                      : "bg-[#f1f4f5] text-[#3e494b]"
                  }`}
                >
                  Lịch sử đặt chỗ
                </button>
              </div>

              {activeTab === "profile" ? (
                <CustomerProfileSections detail={detail} />
              ) : (
                <CustomerHistorySection detail={detail} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CustomerProfileSections({
  detail,
}: {
  detail: StaffCustomerDetailData;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <ProfileSection title="Hành khách đi cùng" icon={<Users size={18} />}>
        {detail.passengers.length === 0 ? (
          <EmptyLine text="Chưa có hành khách." />
        ) : (
          <div className="space-y-3">
            {detail.passengers.map((item) => (
              <div key={item.id} className="rounded-2xl bg-white p-4 ring-1 ring-[#ebeeef]">
                <p className="font-black text-[#181c1d]">{item.fullName}</p>
                <p className="mt-1 text-xs font-bold text-[#00606c]">
                  {item.bookingCode} • {item.passengerType}
                </p>
                <p className="mt-2 text-xs font-semibold text-[#6e797b]">
                  CCCD: {item.idNumber || "Chưa có"} • Passport:{" "}
                  {item.passportNumber || "Chưa có"}
                </p>
              </div>
            ))}
          </div>
        )}
      </ProfileSection>

      <ProfileSection title="Giấy tờ / hồ sơ" icon={<FileCheck2 size={18} />}>
        {detail.documents.length === 0 ? (
          <EmptyLine text="Chưa có giấy tờ." />
        ) : (
          <div className="space-y-3">
            {detail.documents.map((item) => (
              <div key={item.id} className="rounded-2xl bg-white p-4 ring-1 ring-[#ebeeef]">
                <p className="font-black text-[#181c1d]">
                  {item.passengerName} - {item.documentType}
                </p>
                <p className="mt-1 text-xs font-bold text-[#00606c]">
                  {item.bookingCode}
                </p>
                <p className="mt-2 text-xs font-semibold text-[#6e797b]">
                  Số giấy tờ: {item.documentNumber || "Chưa có"} • Hạn:{" "}
                  {item.expiryDate || "Chưa có"}
                </p>
              </div>
            ))}
          </div>
        )}
      </ProfileSection>

      <ProfileSection title="Công nợ" icon={<Wallet size={18} />}>
        {detail.debts.length === 0 ? (
          <EmptyLine text="Không có công nợ." />
        ) : (
          <div className="space-y-3">
            {detail.debts.map((item, index) => (
              <div key={index} className="rounded-2xl bg-white p-4 ring-1 ring-[#ebeeef]">
                <p className="font-black text-[#00606c]">{item.bookingCode}</p>
                <p className="mt-1 text-xs font-semibold text-[#6e797b]">
                  Hạn thanh toán: {item.dueDate || "Chưa có"}
                </p>
                <p className="mt-2 font-black text-[#ba1a1a]">
                  Còn {formatMoney(item.remainingAmount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </ProfileSection>
    </div>
  );
}

function CustomerHistorySection({
  detail,
}: {
  detail: StaffCustomerDetailData;
}) {
  return (
    <ProfileSection title="Lịch sử đặt tour" icon={<CalendarDays size={18} />}>
      {detail.bookings.length === 0 ? (
        <EmptyLine text="Khách hàng chưa có booking." />
      ) : (
        <div className="space-y-3">
          {detail.bookings.map((item) => (
            <div key={item.id} className="rounded-2xl bg-white p-4 ring-1 ring-[#ebeeef]">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="font-black text-[#00606c]">{item.bookingCode}</p>
                  <p className="mt-1 font-bold text-[#181c1d]">{item.tourName}</p>
                  <p className="mt-1 text-xs font-semibold text-[#6e797b]">
                    {item.startDate || "Chưa có ngày"} -{" "}
                    {item.endDate || "Chưa có ngày"} • Người lớn/trẻ em:{" "}
                    {item.adultCount}/{item.childCount}
                  </p>
                </div>

                <div className="md:text-right">
                  <p className="font-black text-[#9b4500]">
                    {formatMoney(item.totalPayableAmount)}
                  </p>
                  <p className="mt-1 text-xs font-bold text-[#6e797b]">
                    Đã trả {formatMoney(item.paidAmount)} • Còn{" "}
                    {formatMoney(item.remainingAmount)}
                  </p>
                  <span className="mt-2 inline-flex rounded-full bg-[#ddf9ff] px-3 py-1 text-[10px] font-black text-[#00606c]">
                    {item.bookingStatus}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </ProfileSection>
  );
}

function MessageModal({
  customer,
  title,
  content,
  loading,
  setTitle,
  setContent,
  onClose,
  onSubmit,
}: {
  customer: StaffCustomerItem;
  title: string;
  content: string;
  loading: boolean;
  setTitle: (value: string) => void;
  setContent: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-6 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-[#9b4500] px-7 py-5 text-white">
          <div>
            <h2 className="text-2xl font-black">Nhắn tin khách hàng</h2>
            <p className="mt-1 text-sm font-semibold text-white/80">
              Gửi cho {customer.fullName}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 p-7">
          <Input
            label="Tiêu đề"
            value={title}
            onChange={setTitle}
            required
          />

          <label className="block">
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-[#9b4500]">
              Nội dung
            </span>
            <textarea
              value={content}
              required
              onChange={(event) => setContent(event.target.value)}
              rows={6}
              className="w-full resize-none rounded-2xl border border-[#dfe3e4] bg-[#f6fafb] px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-[#9b4500]/30"
              placeholder="Nhập nội dung chăm sóc khách hàng..."
            />
          </label>

          <div className="flex justify-end gap-3 border-t border-[#ebeeef] pt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border px-6 py-3 text-sm font-black"
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-full bg-[#9b4500] px-7 py-3 text-sm font-black text-white disabled:opacity-60"
            >
              {loading ? <Loader2 className="animate-spin" size={17} /> : <Send size={17} />}
              Gửi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ReportModal({
  report,
  totalCustomers,
  onClose,
}: {
  report: {
    totalSpent: number;
    platinum: number;
    gold: number;
    silver: number;
    individual: number;
    corporate: number;
    active: number;
    averageSpent: number;
    spentByLevel: {
      platinum: number;
      gold: number;
      silver: number;
    };
  };
  totalCustomers: number;
  onClose: () => void;
}) {
  const maxLevelCount = Math.max(report.platinum, report.gold, report.silver, 1);
  const maxSpent = Math.max(
    report.spentByLevel.platinum,
    report.spentByLevel.gold,
    report.spentByLevel.silver,
    1
  );

  const individualPercent = totalCustomers
    ? Math.round((report.individual / totalCustomers) * 100)
    : 0;

  const corporatePercent = totalCustomers
    ? Math.round((report.corporate / totalCustomers) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-6 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-[#00606c] px-7 py-5 text-white">
          <div>
            <h2 className="text-2xl font-black">Báo cáo khách hàng</h2>
            <p className="mt-1 text-sm font-semibold text-[#ddf9ff]">
              Thống kê phân hạng, loại khách và chi tiêu từ dữ liệu thật.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[78vh] overflow-y-auto p-7">
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <InfoBox label="Tổng khách" value={totalCustomers} />
            <InfoBox label="Khách hoạt động" value={report.active} />
            <InfoBox label="Tổng chi tiêu" value={formatMoney(report.totalSpent)} />
            <InfoBox
              label="Chi tiêu trung bình"
              value={formatMoney(report.averageSpent)}
            />
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-2">
            <div className="rounded-[1.5rem] bg-[#f6fafb] p-6 ring-1 ring-[#ebeeef]">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-[#00606c]">
                    Biểu đồ phân hạng khách hàng
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-[#6e797b]">
                    Số lượng khách theo hạng thành viên.
                  </p>
                </div>
                <Crown className="text-[#00606c]" size={26} />
              </div>

              <div className="flex h-72 items-end justify-around gap-6 rounded-2xl bg-white p-6 ring-1 ring-[#ebeeef]">
                <VerticalBar
                  label="Platinum"
                  value={report.platinum}
                  max={maxLevelCount}
                  className="bg-[#9defff]"
                  textClass="text-[#00606c]"
                />
                <VerticalBar
                  label="Gold"
                  value={report.gold}
                  max={maxLevelCount}
                  className="bg-[#ffdbc9]"
                  textClass="text-[#9b4500]"
                />
                <VerticalBar
                  label="Silver"
                  value={report.silver}
                  max={maxLevelCount}
                  className="bg-[#dfe3e4]"
                  textClass="text-[#3e494b]"
                />
              </div>
            </div>

            <div className="rounded-[1.5rem] bg-[#f6fafb] p-6 ring-1 ring-[#ebeeef]">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-[#00606c]">
                    Loại khách hàng
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-[#6e797b]">
                    So sánh khách cá nhân và khách doanh nghiệp.
                  </p>
                </div>
                <Users className="text-[#00606c]" size={26} />
              </div>

              <div className="space-y-5 rounded-2xl bg-white p-6 ring-1 ring-[#ebeeef]">
                <HorizontalBar
                  label="Khách cá nhân"
                  value={report.individual}
                  percent={individualPercent}
                  className="bg-[#00606c]"
                />

                <HorizontalBar
                  label="Khách doanh nghiệp"
                  value={report.corporate}
                  percent={corporatePercent}
                  className="bg-[#fc8a40]"
                />

                <div className="mt-6 rounded-2xl bg-[#f6fafb] p-4">
                  <p className="text-sm font-bold text-[#181c1d]">
                    Tỷ trọng hiện tại
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[#6e797b]">
                    Cá nhân chiếm {individualPercent}% và doanh nghiệp chiếm{" "}
                    {corporatePercent}% trên tổng số khách hàng.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-6 rounded-[1.5rem] bg-[#f6fafb] p-6 ring-1 ring-[#ebeeef]">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-[#00606c]">
                  Doanh thu theo hạng thành viên
                </h3>
                <p className="mt-1 text-sm font-semibold text-[#6e797b]">
                  Tổng chi tiêu của từng nhóm khách.
                </p>
              </div>
              <BarChart3 className="text-[#00606c]" size={26} />
            </div>

            <div className="space-y-4 rounded-2xl bg-white p-6 ring-1 ring-[#ebeeef]">
              <RevenueBar
                label="Platinum"
                value={report.spentByLevel.platinum}
                max={maxSpent}
                className="bg-[#00606c]"
              />
              <RevenueBar
                label="Gold"
                value={report.spentByLevel.gold}
                max={maxSpent}
                className="bg-[#9b4500]"
              />
              <RevenueBar
                label="Silver"
                value={report.spentByLevel.silver}
                max={maxSpent}
                className="bg-[#6e797b]"
              />
            </div>
          </section>

          <section className="mt-6 grid gap-4 lg:grid-cols-3">
            <InsightCard
              title="Nhóm giá trị cao"
              content={`Platinum hiện có ${report.platinum} khách, đóng góp ${formatMoney(
                report.spentByLevel.platinum
              )}. Có thể tạo ưu đãi riêng để giữ chân nhóm này.`}
            />

            <InsightCard
              title="Nhóm cần chăm sóc"
              content={`Gold hiện có ${report.gold} khách. Đây là nhóm có khả năng nâng hạng nếu được chăm sóc bằng ưu đãi hoặc voucher phù hợp.`}
            />

            <InsightCard
              title="Tệp khách phổ thông"
              content={`Silver hiện có ${report.silver} khách. Có thể gửi chương trình khuyến mãi định kỳ để kích thích đặt tour lần tiếp theo.`}
            />
          </section>
        </div>
      </div>
    </div>
  );
}

function VerticalBar({
  label,
  value,
  max,
  className,
  textClass,
}: {
  label: string;
  value: number;
  max: number;
  className: string;
  textClass: string;
}) {
  const height = Math.max(8, Math.round((value / max) * 180));

  return (
    <div className="flex h-full flex-1 flex-col items-center justify-end gap-3">
      <p className={`text-xl font-black ${textClass}`}>{value}</p>

      <div className="flex h-[190px] w-full max-w-[72px] items-end rounded-full bg-[#f1f4f5] p-1">
        <div
          className={`w-full rounded-full ${className}`}
          style={{ height: `${height}px` }}
        />
      </div>

      <p className="text-xs font-black uppercase tracking-[0.12em] text-[#3e494b]">
        {label}
      </p>
    </div>
  );
}

function HorizontalBar({
  label,
  value,
  percent,
  className,
}: {
  label: string;
  value: number;
  percent: number;
  className: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-black text-[#181c1d]">{label}</p>
        <p className="text-sm font-black text-[#00606c]">
          {value} khách • {percent}%
        </p>
      </div>

      <div className="h-4 overflow-hidden rounded-full bg-[#f1f4f5]">
        <div
          className={`h-full rounded-full ${className}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
    </div>
  );
}

function RevenueBar({
  label,
  value,
  max,
  className,
}: {
  label: string;
  value: number;
  max: number;
  className: string;
}) {
  const percent = max ? Math.round((value / max) * 100) : 0;

  return (
    <div className="grid gap-3 md:grid-cols-[130px_1fr_170px] md:items-center">
      <p className="text-sm font-black text-[#181c1d]">{label}</p>

      <div className="h-4 overflow-hidden rounded-full bg-[#f1f4f5]">
        <div
          className={`h-full rounded-full ${className}`}
          style={{ width: `${Math.max(3, Math.min(percent, 100))}%` }}
        />
      </div>

      <p className="text-sm font-black text-[#00606c] md:text-right">
        {formatMoney(value)}
      </p>
    </div>
  );
}

function InsightCard({
  title,
  content,
}: {
  title: string;
  content: string;
}) {
  return (
    <div className="rounded-[1.4rem] bg-white p-5 shadow-sm ring-1 ring-[#ebeeef]">
      <p className="text-sm font-black uppercase tracking-[0.12em] text-[#00606c]">
        {title}
      </p>
      <p className="mt-3 text-sm font-semibold leading-6 text-[#3e494b]">
        {content}
      </p>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-[#f6fafb] p-4 ring-1 ring-[#ebeeef]">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#6e797b]">
        {label}
      </p>
      <p className="mt-1 text-lg font-black text-[#00606c]">{value}</p>
    </div>
  );
}

function ProfileSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[1.5rem] bg-[#f6fafb] p-5">
      <h4 className="mb-4 flex items-center gap-2 text-lg font-black text-[#00606c]">
        {icon}
        {title}
      </h4>
      {children}
    </section>
  );
}

function EmptyLine({ text }: { text: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 text-sm font-semibold text-[#6e797b]">
      {text}
    </div>
  );
}
function CustomerFormModal({
  mode,
  form,
  actionLoading,
  onClose,
  onSubmit,
  updateForm,
}: {
  mode: "create" | "edit";
  form: FormState;
  actionLoading: boolean;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  updateForm: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-6 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#ebeeef] bg-[#00606c] px-7 py-5 text-white">
          <div>
            <h2 className="text-2xl font-black">
              {mode === "create" ? "Thêm khách hàng" : "Sửa khách hàng"}
            </h2>

            <p className="mt-1 text-sm font-semibold text-[#ddf9ff]">
              Cập nhật thông tin liên hệ và ghi chú chăm sóc khách.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="max-h-[76vh] overflow-y-auto p-7">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Input
              label="Họ tên"
              value={form.fullName}
              onChange={(value) => updateForm("fullName", value)}
              required
            />

            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-[#00606c]">
                Loại khách
              </span>

              <select
                value={form.customerType}
                onChange={(event) =>
                  updateForm("customerType", event.target.value)
                }
                className="h-12 w-full rounded-2xl border border-[#dfe3e4] bg-[#f6fafb] px-4 text-sm font-semibold outline-none focus:ring-2 focus:ring-[#00606c]/30"
              >
                <option value="INDIVIDUAL">Cá nhân</option>
                <option value="CORPORATE">Doanh nghiệp</option>
              </select>
            </label>

            <Input
              label="Giới tính"
              value={form.gender}
              onChange={(value) => updateForm("gender", value)}
              placeholder="MALE/FEMALE"
            />

            <Input
              label="Ngày sinh"
              type="date"
              value={form.dateOfBirth}
              onChange={(value) => updateForm("dateOfBirth", value)}
            />

            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(value) => updateForm("email", value)}
            />

            <Input
              label="Số điện thoại"
              value={form.phone}
              onChange={(value) => updateForm("phone", value)}
            />

            <label className="block md:col-span-2">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-[#00606c]">
                Địa chỉ
              </span>

              <textarea
                value={form.address}
                onChange={(event) => updateForm("address", event.target.value)}
                rows={3}
                className="w-full resize-none rounded-2xl border border-[#dfe3e4] bg-[#f6fafb] px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-[#00606c]/30"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-[#00606c]">
                Ghi chú
              </span>

              <textarea
                value={form.notes}
                onChange={(event) => updateForm("notes", event.target.value)}
                rows={4}
                className="w-full resize-none rounded-2xl border border-[#dfe3e4] bg-[#f6fafb] px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-[#00606c]/30"
              />
            </label>
          </div>

          <div className="mt-7 flex justify-end gap-3 border-t border-[#ebeeef] pt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[#bdc8cb] px-6 py-3 text-sm font-black text-[#3e494b]"
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={actionLoading}
              className="flex items-center gap-2 rounded-full bg-[#00606c] px-7 py-3 text-sm font-black text-white shadow-md disabled:opacity-60"
            >
              {actionLoading ? (
                <Loader2 className="animate-spin" size={17} />
              ) : (
                <Plus size={17} />
              )}
              {mode === "create" ? "Thêm khách" : "Lưu thay đổi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-[#00606c]">
        {label}
      </span>

      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-2xl border border-[#dfe3e4] bg-[#f6fafb] px-4 text-sm font-semibold outline-none focus:ring-2 focus:ring-[#00606c]/30"
      />
    </label>
  );
}