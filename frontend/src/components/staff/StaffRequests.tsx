"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  Headphones,
  Loader2,
  Mail,
  RefreshCcw,
  Search,
  Send,
  X,
  XCircle,
} from "lucide-react";
import {
  getStaffRequestsApi,
  processStaffRequestApi,
  resendStaffEmailApi,
  sendStaffEmailApi,
  type StaffEmailCustomerOption,
  type StaffEmailItem,
  type StaffRequestsData,
  type StaffSupportRequestItem,
} from "@/lib/api/staff.api";

type EmailForm = {
  customerId: string;
  bookingId: string;
  recipientEmail: string;
  subject: string;
  body: string;
};

type ProcessForm = {
  requestId: string;
  action: "APPROVED" | "REJECTED";
  note: string;
};

function emptyEmailForm(): EmailForm {
  return {
    customerId: "",
    bookingId: "",
    recipientEmail: "",
    subject: "",
    body: "",
  };
}

function getEmailStatusLabel(status: string) {
  if (status === "SENT") return "Đã gửi";
  if (status === "PENDING") return "Chờ gửi";
  if (status === "FAILED") return "Gửi lỗi";
  return status || "Chưa rõ";
}

function getEmailStatusClass(status: string) {
  if (status === "SENT") return "bg-emerald-50 text-emerald-600";
  if (status === "PENDING") return "bg-yellow-100 text-yellow-700";
  if (status === "FAILED") return "bg-red-100 text-red-700";
  return "bg-[#f1f4f5] text-[#3e494b]";
}

function getRequestStatusLabel(status: string) {
  if (status === "PENDING") return "Chờ xử lý";
  if (status === "APPROVED") return "Đã duyệt";
  if (status === "REJECTED") return "Từ chối";
  return status || "Chưa rõ";
}

function getRequestStatusClass(status: string) {
  if (status === "PENDING") return "bg-yellow-100 text-yellow-700";
  if (status === "APPROVED") return "bg-emerald-50 text-emerald-600";
  if (status === "REJECTED") return "bg-red-100 text-red-700";
  return "bg-[#f1f4f5] text-[#3e494b]";
}

export default function StaffRequests() {
  const [data, setData] = useState<StaffRequestsData | null>(null);
  const [keyword, setKeyword] = useState("");
  const [emailStatus, setEmailStatus] = useState("ALL");
  const [requestStatus, setRequestStatus] = useState("ALL");
  const [activeTab, setActiveTab] = useState<"emails" | "requests">("emails");

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [openEmail, setOpenEmail] = useState(false);
  const [emailForm, setEmailForm] = useState<EmailForm>(emptyEmailForm());

  const [previewEmail, setPreviewEmail] = useState<StaffEmailItem | null>(null);
  const [previewRequest, setPreviewRequest] =
    useState<StaffSupportRequestItem | null>(null);

  const [processForm, setProcessForm] = useState<ProcessForm | null>(null);

  const emails = data?.emails || [];
  const requests = data?.requests || [];

  const selectedCustomer = useMemo(() => {
    if (!data) return null;
    return data.customers.find(
      (item) =>
        item.customerId === emailForm.customerId &&
        String(item.bookingId || "") === String(emailForm.bookingId || "")
    );
  }, [data, emailForm.customerId, emailForm.bookingId]);

  async function loadData(options?: {
    nextKeyword?: string;
    nextEmailStatus?: string;
    nextRequestStatus?: string;
  }) {
    try {
      setLoading(true);
      setErrorMessage("");

      const result = await getStaffRequestsApi({
        keyword: options?.nextKeyword ?? keyword,
        emailStatus: options?.nextEmailStatus ?? emailStatus,
        requestStatus: options?.nextRequestStatus ?? requestStatus,
      });

      setData(result);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Không tải được dữ liệu"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData({
      nextEmailStatus: emailStatus,
      nextRequestStatus: requestStatus,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailStatus, requestStatus]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadData({ nextKeyword: keyword });
    }, 350);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword]);

  function updateEmailForm<K extends keyof EmailForm>(
    key: K,
    value: EmailForm[K]
  ) {
    setEmailForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function handlePickCustomer(value: string) {
    if (!data) return;

    const target = data.customers.find(
      (item) => `${item.customerId}__${item.bookingId || ""}` === value
    );

    if (!target) return;

    setEmailForm({
      customerId: target.customerId,
      bookingId: target.bookingId || "",
      recipientEmail: target.customerEmail || "",
      subject: target.bookingCode
        ? `Thông tin booking ${target.bookingCode} - ChillTrip`
        : "Thông báo từ ChillTrip",
      body: target.tourName
        ? `Chào ${target.customerName},\n\nChillTrip gửi bạn thông tin liên quan đến tour ${target.tourName}.\n\nTrân trọng,\nChillTrip`
        : `Chào ${target.customerName},\n\nChillTrip gửi bạn thông báo chăm sóc khách hàng.\n\nTrân trọng,\nChillTrip`,
    });
  }

  async function handleSendEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setActionLoading(true);

      await sendStaffEmailApi({
        customerId: emailForm.customerId,
        bookingId: emailForm.bookingId,
        recipientEmail: emailForm.recipientEmail,
        subject: emailForm.subject,
        body: emailForm.body,
      });

      alert("Đã gửi email.");
      setOpenEmail(false);
      setEmailForm(emptyEmailForm());
      await loadData();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Không gửi được email.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleResendEmail(email: StaffEmailItem) {
    const ok = confirm(`Gửi lại email đến ${email.recipientEmail}?`);
    if (!ok) return;

    try {
      setActionLoading(true);
      await resendStaffEmailApi(email.id);
      alert("Đã gửi lại email.");
      await loadData();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Không gửi lại được email.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleProcessRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!processForm) return;

    try {
      setActionLoading(true);

      await processStaffRequestApi({
        requestId: processForm.requestId,
        action: processForm.action,
        note: processForm.note,
      });

      alert("Đã xử lý yêu cầu.");
      setProcessForm(null);
      setPreviewRequest(null);
      await loadData();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Không xử lý được yêu cầu.");
    } finally {
      setActionLoading(false);
    }
  }

  function resetFilters() {
    setKeyword("");
    setEmailStatus("ALL");
    setRequestStatus("ALL");

    loadData({
      nextKeyword: "",
      nextEmailStatus: "ALL",
      nextRequestStatus: "ALL",
    });
  }

  if (loading && !data) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="flex items-center gap-3 rounded-[2rem] bg-white px-6 py-4 shadow-sm">
          <Loader2 className="animate-spin text-[#00606c]" size={22} />
          <span className="font-semibold text-[#00606c]">
            Đang tải email và yêu cầu...
          </span>
        </div>
      </div>
    );
  }

  if (errorMessage && !data) {
    return (
      <div className="rounded-2xl border border-red-200 bg-white p-6 text-red-700">
        <p className="font-black">Không tải được dữ liệu</p>
        <p className="mt-2 text-sm">{errorMessage}</p>

        <button
          type="button"
          onClick={() => loadData()}
          className="mt-4 rounded-full bg-[#00606c] px-5 py-2 text-sm font-black text-white"
        >
          Tải lại
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="w-full space-y-8 pb-12">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-[#00606c]">
            Cổng nhân viên
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight text-[#181c1d]">
            Email & Yêu cầu
          </h1>
          <p className="mt-2 max-w-2xl text-[#3e494b]">
            Quản lý email xác nhận, gửi lại thông báo và xử lý yêu cầu phát sinh
            của khách hàng.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={resetFilters}
            className="flex items-center gap-2 rounded-full bg-white px-6 py-3 text-xs font-bold text-[#00606c] shadow-sm transition hover:scale-105"
          >
            <RefreshCcw size={18} />
            Làm mới
          </button>

          <button
            type="button"
            onClick={() => {
              setEmailForm(emptyEmailForm());
              setOpenEmail(true);
            }}
            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#9b4500] to-[#fc8a40] px-6 py-3 text-xs font-bold text-white shadow-lg shadow-[#9b4500]/20 transition hover:scale-105"
          >
            <Send size={18} />
            Soạn email
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-5">
        <StatCard
          title="Email chờ gửi"
          value={String(data.summary.pendingEmails)}
          note="Cần gửi lại / xác nhận"
          icon={<Mail size={22} />}
          iconClass="bg-yellow-100 text-yellow-700"
        />
        <StatCard
          title="Đã gửi hôm nay"
          value={String(data.summary.sentToday)}
          note="Email thành công"
          icon={<CheckCircle2 size={22} />}
          iconClass="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          title="Email lỗi"
          value={String(data.summary.failedEmails)}
          note="Cần kiểm tra"
          icon={<AlertCircle size={22} />}
          iconClass="bg-red-100 text-red-700"
        />
        <StatCard
          title="Yêu cầu chờ xử lý"
          value={String(data.summary.pendingRequests)}
          note="Hủy tour / phát sinh"
          icon={<Headphones size={22} />}
          iconClass="bg-[#ffdbc9]/50 text-[#9b4500]"
        />
        <StatCard
          title="Đã xử lý"
          value={String(data.summary.processedRequests)}
          note="Yêu cầu hoàn tất"
          icon={<FileText size={22} />}
          iconClass="bg-[#9defff]/40 text-[#00606c]"
        />
      </section>

      <section className="overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#ebeeef] p-6">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("emails")}
              className={`rounded-full px-5 py-2 text-sm font-black ${
                activeTab === "emails"
                  ? "bg-[#00606c] text-white"
                  : "bg-[#f1f4f5] text-[#3e494b]"
              }`}
            >
              Email
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("requests")}
              className={`rounded-full px-5 py-2 text-sm font-black ${
                activeTab === "requests"
                  ? "bg-[#00606c] text-white"
                  : "bg-[#f1f4f5] text-[#3e494b]"
              }`}
            >
              Yêu cầu khách hàng
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-72">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6e797b]"
              />
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                className="h-10 w-full rounded-full bg-[#f6fafb] pl-9 pr-4 text-xs font-semibold outline-none ring-1 ring-[#ebeeef]"
                placeholder="Tìm email, booking, khách..."
              />
            </div>

            {activeTab === "emails" ? (
              <select
                value={emailStatus}
                onChange={(event) => setEmailStatus(event.target.value)}
                className="h-10 rounded-full bg-[#f6fafb] px-4 text-xs font-bold outline-none ring-1 ring-[#ebeeef]"
              >
                <option value="ALL">Tất cả email</option>
                <option value="PENDING">Chờ gửi</option>
                <option value="SENT">Đã gửi</option>
                <option value="FAILED">Gửi lỗi</option>
              </select>
            ) : (
              <select
                value={requestStatus}
                onChange={(event) => setRequestStatus(event.target.value)}
                className="h-10 rounded-full bg-[#f6fafb] px-4 text-xs font-bold outline-none ring-1 ring-[#ebeeef]"
              >
                <option value="ALL">Tất cả yêu cầu</option>
                <option value="PENDING">Chờ xử lý</option>
                <option value="APPROVED">Đã duyệt</option>
                <option value="REJECTED">Từ chối</option>
              </select>
            )}
          </div>
        </div>

        {activeTab === "emails" ? (
          <EmailTable
            emails={emails}
            loading={actionLoading}
            onView={setPreviewEmail}
            onResend={handleResendEmail}
          />
        ) : (
          <RequestTable
            requests={requests}
            onView={setPreviewRequest}
            onApprove={(item) =>
              setProcessForm({
                requestId: item.id,
                action: "APPROVED",
                note: "",
              })
            }
            onReject={(item) =>
              setProcessForm({
                requestId: item.id,
                action: "REJECTED",
                note: "",
              })
            }
          />
        )}
      </section>

      {openEmail && (
        <EmailFormModal
  form={emailForm}
  customers={data.customers}
  selectedCustomer={selectedCustomer ?? null}
  loading={actionLoading}
  updateForm={updateEmailForm}
  onPickCustomer={handlePickCustomer}
  onClose={() => setOpenEmail(false)}
  onSubmit={handleSendEmail}
/>
      )}

      {previewEmail && (
        <EmailPreviewModal
          email={previewEmail}
          onClose={() => setPreviewEmail(null)}
          onResend={() => handleResendEmail(previewEmail)}
        />
      )}

      {previewRequest && (
        <RequestPreviewModal
          request={previewRequest}
          onClose={() => setPreviewRequest(null)}
          onApprove={() =>
            setProcessForm({
              requestId: previewRequest.id,
              action: "APPROVED",
              note: "",
            })
          }
          onReject={() =>
            setProcessForm({
              requestId: previewRequest.id,
              action: "REJECTED",
              note: "",
            })
          }
        />
      )}

      {processForm && (
        <ProcessRequestModal
          form={processForm}
          loading={actionLoading}
          setForm={setProcessForm}
          onClose={() => setProcessForm(null)}
          onSubmit={handleProcessRequest}
        />
      )}
    </div>
  );
}

function EmailTable({
  emails,
  loading,
  onView,
  onResend,
}: {
  emails: StaffEmailItem[];
  loading: boolean;
  onView: (email: StaffEmailItem) => void;
  onResend: (email: StaffEmailItem) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-[1050px] w-full text-left">
        <thead>
          <tr className="bg-[#f1f4f5]/60">
            <TableHead>Người nhận</TableHead>
            <TableHead>Booking / Tour</TableHead>
            <TableHead>Tiêu đề</TableHead>
            <TableHead>Ngày tạo</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead>Hành động</TableHead>
          </tr>
        </thead>

        <tbody className="divide-y divide-[#ebeeef]">
          {emails.length === 0 ? (
            <tr>
              <td
                colSpan={6}
                className="px-6 py-12 text-center text-sm font-semibold text-[#6e797b]"
              >
                Không có email phù hợp.
              </td>
            </tr>
          ) : (
            emails.map((email) => (
              <tr key={email.id} className="transition hover:bg-[#f1f4f5]/40">
                <td className="px-6 py-4">
                  <p className="text-sm font-bold text-[#181c1d]">
                    {email.customerName || "Khách hàng"}
                  </p>
                  <p className="text-xs text-[#6e797b]">
                    {email.recipientEmail}
                  </p>
                </td>

                <td className="px-6 py-4">
                  <p className="text-xs font-bold text-[#00606c]">
                    {email.bookingCode || "Không có booking"}
                  </p>
                  <p className="line-clamp-1 text-xs text-[#6e797b]">
                    {email.tourName || "Email chăm sóc khách hàng"}
                  </p>
                </td>

                <td className="px-6 py-4">
                  <p className="line-clamp-2 text-xs font-semibold text-[#181c1d]">
                    {email.subject || "Không có tiêu đề"}
                  </p>
                </td>

                <td className="px-6 py-4 text-xs text-[#6e797b]">
                  {email.createdAt || "Chưa có"}
                </td>

                <td className="px-6 py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-[10px] font-black ${getEmailStatusClass(
                      email.sendStatus
                    )}`}
                  >
                    {getEmailStatusLabel(email.sendStatus)}
                  </span>
                </td>

                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onView(email)}
                      className="rounded-full bg-[#f1f4f5] px-3 py-2 text-xs font-black text-[#00606c]"
                    >
                      Xem
                    </button>

                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => onResend(email)}
                      className="rounded-full bg-[#00606c] px-3 py-2 text-xs font-black text-white disabled:opacity-60"
                    >
                      Gửi lại
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function RequestTable({
  requests,
  onView,
  onApprove,
  onReject,
}: {
  requests: StaffSupportRequestItem[];
  onView: (request: StaffSupportRequestItem) => void;
  onApprove: (request: StaffSupportRequestItem) => void;
  onReject: (request: StaffSupportRequestItem) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-[1050px] w-full text-left">
        <thead>
          <tr className="bg-[#f1f4f5]/60">
            <TableHead>Booking</TableHead>
            <TableHead>Khách hàng</TableHead>
            <TableHead>Tour</TableHead>
            <TableHead>Lý do</TableHead>
            <TableHead>Ngày yêu cầu</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead>Hành động</TableHead>
          </tr>
        </thead>

        <tbody className="divide-y divide-[#ebeeef]">
          {requests.length === 0 ? (
            <tr>
              <td
                colSpan={7}
                className="px-6 py-12 text-center text-sm font-semibold text-[#6e797b]"
              >
                Không có yêu cầu phù hợp.
              </td>
            </tr>
          ) : (
            requests.map((item) => (
              <tr key={item.id} className="transition hover:bg-[#f1f4f5]/40">
                <td className="px-6 py-4 font-mono text-xs font-bold text-[#00606c]">
                  {item.bookingCode}
                </td>

                <td className="px-6 py-4">
                  <p className="text-sm font-bold text-[#181c1d]">
                    {item.customerName}
                  </p>
                  <p className="text-xs text-[#6e797b]">
                    {item.customerPhone || item.customerEmail || "Chưa có liên hệ"}
                  </p>
                </td>

                <td className="px-6 py-4 text-xs font-semibold text-[#3e494b]">
                  {item.tourName}
                </td>

                <td className="px-6 py-4">
                  <p className="line-clamp-2 text-xs text-[#3e494b]">
                    {item.reason || "Không có lý do"}
                  </p>
                </td>

                <td className="px-6 py-4 text-xs text-[#6e797b]">
                  {item.requestedAt || "Chưa có"}
                </td>

                <td className="px-6 py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-[10px] font-black ${getRequestStatusClass(
                      item.requestStatus
                    )}`}
                  >
                    {getRequestStatusLabel(item.requestStatus)}
                  </span>
                </td>

                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onView(item)}
                      className="rounded-full bg-[#f1f4f5] px-3 py-2 text-xs font-black text-[#00606c]"
                    >
                      Xem
                    </button>

                    {item.requestStatus === "PENDING" && (
                      <>
                        <button
                          type="button"
                          onClick={() => onApprove(item)}
                          className="rounded-full bg-emerald-600 px-3 py-2 text-xs font-black text-white"
                        >
                          Duyệt
                        </button>

                        <button
                          type="button"
                          onClick={() => onReject(item)}
                          className="rounded-full bg-red-600 px-3 py-2 text-xs font-black text-white"
                        >
                          Từ chối
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
function EmailFormModal({
  form,
  customers,
  selectedCustomer,
  loading,
  updateForm,
  onPickCustomer,
  onClose,
  onSubmit,
}: {
  form: EmailForm;
  customers: StaffEmailCustomerOption[];
  selectedCustomer: StaffEmailCustomerOption | null;
  loading: boolean;
  updateForm: <K extends keyof EmailForm>(key: K, value: EmailForm[K]) => void;
  onPickCustomer: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-6 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-[#00606c] px-7 py-5 text-white">
          <div>
            <h2 className="text-2xl font-black">Soạn email</h2>
            <p className="mt-1 text-sm font-semibold text-[#ddf9ff]">
              Gửi email xác nhận hoặc chăm sóc khách hàng.
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

        <form onSubmit={onSubmit} className="max-h-[76vh] overflow-y-auto p-7">
          <div className="grid gap-5">
            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-[#00606c]">
                Chọn khách hàng / booking
              </span>

              <select
                value={`${form.customerId}__${form.bookingId}`}
                onChange={(event) => onPickCustomer(event.target.value)}
                className="h-12 w-full rounded-2xl border border-[#dfe3e4] bg-[#f6fafb] px-4 text-sm font-semibold outline-none"
              >
                <option value="__">Chọn khách hàng</option>
                {customers.map((item, index) => (
                  <option
                    key={`${item.customerId}-${item.bookingId}-${index}`}
                    value={`${item.customerId}__${item.bookingId || ""}`}
                  >
                    {item.customerName} - {item.bookingCode || "Không có booking"} -{" "}
                    {item.customerEmail}
                  </option>
                ))}
              </select>
            </label>

            {selectedCustomer && (
              <div className="rounded-2xl bg-[#f6fafb] p-4">
                <p className="text-sm font-black text-[#00606c]">
                  {selectedCustomer.customerName}
                </p>
                <p className="mt-1 text-xs font-semibold text-[#6e797b]">
                  {selectedCustomer.customerEmail} •{" "}
                  {selectedCustomer.tourName || "Email chăm sóc khách hàng"}
                </p>
              </div>
            )}

            <Input
              label="Email người nhận"
              type="email"
              value={form.recipientEmail}
              onChange={(value) => updateForm("recipientEmail", value)}
              required
            />

            <Input
              label="Tiêu đề"
              value={form.subject}
              onChange={(value) => updateForm("subject", value)}
              required
            />

            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-[#00606c]">
                Nội dung
              </span>

              <textarea
                value={form.body}
                required
                onChange={(event) => updateForm("body", event.target.value)}
                rows={8}
                className="w-full resize-none rounded-2xl border border-[#dfe3e4] bg-[#f6fafb] px-4 py-3 text-sm font-semibold outline-none"
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
              disabled={loading}
              className="flex items-center gap-2 rounded-full bg-[#00606c] px-7 py-3 text-sm font-black text-white disabled:opacity-60"
            >
              {loading ? <Loader2 className="animate-spin" size={17} /> : <Send size={17} />}
              Gửi email
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EmailPreviewModal({
  email,
  onClose,
  onResend,
}: {
  email: StaffEmailItem;
  onClose: () => void;
  onResend: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-6 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-[#00606c] px-7 py-5 text-white">
          <div>
            <h2 className="text-2xl font-black">Chi tiết email</h2>
            <p className="mt-1 text-sm font-semibold text-[#ddf9ff]">
              {email.recipientEmail}
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

        <div className="space-y-4 p-7">
          <InfoBox label="Trạng thái" value={getEmailStatusLabel(email.sendStatus)} />
          <InfoBox label="Tiêu đề" value={email.subject || "Không có tiêu đề"} />
          <div className="rounded-2xl bg-[#f6fafb] p-4 ring-1 ring-[#ebeeef]">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#6e797b]">
              Nội dung
            </p>
            <p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-6 text-[#3e494b]">
              {email.body || "Không có nội dung"}
            </p>
          </div>

          {email.errorMessage && (
            <InfoBox label="Lỗi gửi email" value={email.errorMessage} danger />
          )}

          <div className="flex justify-end gap-3 border-t border-[#ebeeef] pt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[#bdc8cb] px-6 py-3 text-sm font-black text-[#3e494b]"
            >
              Đóng
            </button>

            <button
              type="button"
              onClick={onResend}
              className="rounded-full bg-[#00606c] px-6 py-3 text-sm font-black text-white"
            >
              Gửi lại
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RequestPreviewModal({
  request,
  onClose,
  onApprove,
  onReject,
}: {
  request: StaffSupportRequestItem;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-6 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-[#00606c] px-7 py-5 text-white">
          <div>
            <h2 className="text-2xl font-black">Chi tiết yêu cầu</h2>
            <p className="mt-1 text-sm font-semibold text-[#ddf9ff]">
              {request.bookingCode} • {request.customerName}
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

        <div className="space-y-4 p-7">
          <div className="grid gap-4 md:grid-cols-2">
            <InfoBox label="Khách hàng" value={request.customerName} />
            <InfoBox label="Liên hệ" value={request.customerPhone || request.customerEmail || "Chưa có"} />
            <InfoBox label="Tour" value={request.tourName} />
            <InfoBox label="Trạng thái" value={getRequestStatusLabel(request.requestStatus)} />
          </div>

          <div className="rounded-2xl bg-[#f6fafb] p-4 ring-1 ring-[#ebeeef]">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#6e797b]">
              Lý do yêu cầu
            </p>
            <p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-6 text-[#3e494b]">
              {request.reason || "Không có lý do"}
            </p>
          </div>

          <div className="flex justify-end gap-3 border-t border-[#ebeeef] pt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[#bdc8cb] px-6 py-3 text-sm font-black text-[#3e494b]"
            >
              Đóng
            </button>

            {request.requestStatus === "PENDING" && (
              <>
                <button
                  type="button"
                  onClick={onReject}
                  className="rounded-full bg-red-600 px-6 py-3 text-sm font-black text-white"
                >
                  Từ chối
                </button>

                <button
                  type="button"
                  onClick={onApprove}
                  className="rounded-full bg-emerald-600 px-6 py-3 text-sm font-black text-white"
                >
                  Duyệt yêu cầu
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProcessRequestModal({
  form,
  loading,
  setForm,
  onClose,
  onSubmit,
}: {
  form: ProcessForm;
  loading: boolean;
  setForm: (form: ProcessForm | null) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/40 p-6 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-[#00606c] px-7 py-5 text-white">
          <div>
            <h2 className="text-2xl font-black">
              {form.action === "APPROVED" ? "Duyệt yêu cầu" : "Từ chối yêu cầu"}
            </h2>
            <p className="mt-1 text-sm font-semibold text-[#ddf9ff]">
              Ghi chú này sẽ được lưu vào email phản hồi khách hàng.
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

        <form onSubmit={onSubmit} className="space-y-5 p-7">
          <label className="block">
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-[#00606c]">
              Ghi chú xử lý
            </span>

            <textarea
              value={form.note}
              onChange={(event) =>
                setForm({
                  ...form,
                  note: event.target.value,
                })
              }
              rows={5}
              className="w-full resize-none rounded-2xl border border-[#dfe3e4] bg-[#f6fafb] px-4 py-3 text-sm font-semibold outline-none"
              placeholder="Ví dụ: Đã kiểm tra chính sách hủy tour..."
            />
          </label>

          <div className="flex justify-end gap-3 border-t border-[#ebeeef] pt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[#bdc8cb] px-6 py-3 text-sm font-black text-[#3e494b]"
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={loading}
              className={`flex items-center gap-2 rounded-full px-7 py-3 text-sm font-black text-white disabled:opacity-60 ${
                form.action === "APPROVED" ? "bg-emerald-600" : "bg-red-600"
              }`}
            >
              {loading ? (
                <Loader2 className="animate-spin" size={17} />
              ) : form.action === "APPROVED" ? (
                <CheckCircle2 size={17} />
              ) : (
                <XCircle size={17} />
              )}
              Xác nhận
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  note,
  icon,
  iconClass,
}: {
  title: string;
  value: string;
  note: string;
  icon: React.ReactNode;
  iconClass: string;
}) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-start justify-between">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-full ${iconClass}`}
        >
          {icon}
        </div>
        <Clock3 size={18} className="text-[#6e797b]" />
      </div>

      <p className="text-[11px] font-bold uppercase tracking-wider text-[#3e494b]">
        {title}
      </p>
      <h3 className="mt-1 text-3xl font-black text-[#181c1d]">{value}</h3>
      <p className="mt-2 text-xs text-[#3e494b]">{note}</p>
    </div>
  );
}

function InfoBox({
  label,
  value,
  danger,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-[#f6fafb] p-4 ring-1 ring-[#ebeeef]">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#6e797b]">
        {label}
      </p>
      <p
        className={`mt-2 text-sm font-black ${
          danger ? "text-red-600" : "text-[#00606c]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function TableHead({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#3e494b]">
      {children}
    </th>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
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
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-2xl border border-[#dfe3e4] bg-[#f6fafb] px-4 text-sm font-semibold outline-none"
      />
    </label>
  );
}