"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import HomeHeader from "@/components/home/HomeHeader";
import ProfileSidebar from "@/components/profile/ProfileSidebar";
import { getCurrentUserApi, type CurrentUserResponse } from "@/lib/api/auth.api";
import {
  formatAccessorRoleLabel,
  formatConsentStatusLabel,
  formatPrivacyDataTypeLabel,
  formatPrivacyPurposeLabel,
  formatPrivacyReasonLabel,
  getMyBookingPrivacyConsentsApi,
  getMyPrivacyAccessLogsApi,
  updateBookingPrivacyConsentApi,
  type CustomerBookingConsentItem,
  type CustomerPrivacyAccessLog,
  type CustomerPrivacyLogStats,
} from "@/lib/api/privacy.api";

type ProfileData = NonNullable<CurrentUserResponse["data"]>;

export default function SecurityPage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  // Quản lý Consent chia sẻ SĐT với HDV theo từng booking/chuyến
  const [consentSchemaReady, setConsentSchemaReady] = useState(true);
  const [consentItems, setConsentItems] = useState<CustomerBookingConsentItem[]>([]);
  const [consentsLoading, setConsentsLoading] = useState(true);
  const [updatingBookingId, setUpdatingBookingId] = useState<string | null>(null);
  const [consentFeedback, setConsentFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Lịch sử truy cập dữ liệu cá nhân (privacy_access_logs)
  const [accessLogs, setAccessLogs] = useState<CustomerPrivacyAccessLog[]>([]);
  const [logStats, setLogStats] = useState<CustomerPrivacyLogStats>({
    totalAccess: 0,
    allowedCount: 0,
    deniedCount: 0,
    guideAccessCount: 0,
  });
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(1);
  const [logsLoading, setLogsLoading] = useState(true);
  const [resultFilter, setResultFilter] = useState<"" | "ALLOWED" | "DENIED">("");
  const [selectedBookingId, setSelectedBookingId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");

  const loadConsents = useCallback(async () => {
    try {
      setConsentsLoading(true);
      const res = await getMyBookingPrivacyConsentsApi();
      setConsentSchemaReady(res.schemaReady);
      setConsentItems(res.items || []);
    } catch (error) {
      console.warn("Load booking privacy consents error:", error);
      setConsentItems([]);
    } finally {
      setConsentsLoading(false);
    }
  }, []);

  const loadAccessLogs = useCallback(async () => {
    try {
      setLogsLoading(true);
      const res = await getMyPrivacyAccessLogsApi({
        result: resultFilter,
        bookingId: selectedBookingId || undefined,
        q: appliedQuery || undefined,
        page: logsPage,
        pageSize: 10,
      });
      setAccessLogs(res.items || []);
      setLogsTotal(res.total || 0);
      if (res.stats) {
        setLogStats(res.stats);
      }
    } catch (error) {
      console.warn("Load privacy access logs error:", error);
      setAccessLogs([]);
      setLogsTotal(0);
    } finally {
      setLogsLoading(false);
    }
  }, [resultFilter, selectedBookingId, appliedQuery, logsPage]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const bid = params.get("bookingId")?.trim();
      if (bid) {
        setSelectedBookingId(bid);
      }
    }
  }, []);

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        const data = await getCurrentUserApi();
        setProfile(data);
      } catch (error) {
        console.error("Load security profile error:", error);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
    loadConsents();
  }, [loadConsents]);

  useEffect(() => {
    loadAccessLogs();
  }, [loadAccessLogs]);

  async function handleConsentAction(
    bookingId: string,
    status: "GRANTED" | "DENIED" | "REVOKED"
  ) {
    try {
      setUpdatingBookingId(bookingId);
      setConsentFeedback(null);
      const res = await updateBookingPrivacyConsentApi(bookingId, status);
      setConsentFeedback({
        type: "success",
        text: res.message,
      });
      await loadConsents();
    } catch (error) {
      setConsentFeedback({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Không thể cập nhật quyền chia sẻ số điện thoại",
      });
    } finally {
      setUpdatingBookingId(null);
    }
  }

  async function handleChangePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setMessage("");
    setMessageType("");

    if (!currentPassword.trim()) {
      setMessage("Vui lòng nhập mật khẩu hiện tại.");
      setMessageType("error");
      return;
    }

    if (newPassword.length < 6) {
      setMessage("Mật khẩu mới phải có ít nhất 6 ký tự.");
      setMessageType("error");
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage("Mật khẩu xác nhận không khớp.");
      setMessageType("error");
      return;
    }

    try {
      setSubmitting(true);

      const token =
        localStorage.getItem("access_token") ||
        sessionStorage.getItem("access_token");

      if (!token) {
        throw new Error("Chưa đăng nhập");
      }

      const res = await fetch("/backend-api/auth/change-password", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Đổi mật khẩu thất bại");
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setMessage("Đổi mật khẩu thành công.");
      setMessageType("success");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Không thể đổi mật khẩu";

      setMessage(errorMessage);
      setMessageType("error");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f6fafb] text-[#181c1d]">
        <HomeHeader />

        <div className="mx-auto max-w-[1500px] px-4 pb-24 pt-28 md:px-8">
          <div className="rounded-[3rem] bg-white p-10 text-center shadow-sm">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#e5e9ea] border-t-[#00606c]" />
            <p className="mt-5 font-semibold text-slate-600">
              Đang tải trang bảo mật...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6fafb] text-[#181c1d]">
      <HomeHeader />

      <div className="mx-auto max-w-[1500px] px-4 pb-24 pt-28 md:px-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          <ProfileSidebar profile={profile} />

          <div className="min-w-0 flex-1 space-y-8">
            <section className="mb-2">
              <p className="mb-3 text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#9b4500]">
                ChillTrip
              </p>

              <h1 className="mb-3 text-3xl font-extrabold tracking-[-0.03em] text-[#00606c] md:text-4xl">
                Bảo mật tài khoản
              </h1>

              <p className="max-w-2xl text-[16px] leading-8 text-[#3e494b]">
                Quản lý mật khẩu, kiểm tra trạng thái tài khoản và tăng cường
                bảo vệ thông tin cá nhân của bạn.
              </p>
            </section>

            <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <SecurityStatCard
                title="Trạng thái"
                value={profile?.user?.status || "ACTIVE"}
                desc="Tài khoản đang hoạt động"
                icon="shield"
              />

              <SecurityStatCard
                title="Vai trò"
                value={profile?.user?.role?.name || "Khách hàng"}
                desc="Quyền truy cập hiện tại"
                icon="user"
              />

              <SecurityStatCard
                title="Đăng nhập gần nhất"
                value={
                  profile?.user?.lastLoginAt
                    ? new Date(profile.user.lastLoginAt).toLocaleDateString(
                      "vi-VN"
                    )
                    : "Chưa cập nhật"
                }
                desc="Theo dõi hoạt động tài khoản"
                icon="clock"
              />
            </section>

            <section className="rounded-[3rem] bg-white p-6 shadow-sm shadow-cyan-900/5 md:p-10">
              <div className="mb-8 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
                    Đổi mật khẩu
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">
                    Để bảo vệ tài khoản, hãy sử dụng mật khẩu đủ mạnh và không
                    chia sẻ mật khẩu với người khác.
                  </p>
                </div>

                <div className="hidden rounded-full bg-[#dff8fb] p-4 text-[#00606c] md:block">
                  <ShieldIcon />
                </div>
              </div>

              {message ? (
                <div
                  className={`mb-6 rounded-2xl px-5 py-4 text-sm font-bold ${messageType === "success"
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-600"
                    }`}
                >
                  {message}
                </div>
              ) : null}

              <form className="space-y-6" onSubmit={handleChangePassword}>
                <PasswordField
                  label="Mật khẩu hiện tại"
                  value={currentPassword}
                  onChange={setCurrentPassword}
                  show={showCurrent}
                  onToggleShow={() => setShowCurrent((prev) => !prev)}
                  placeholder="Nhập mật khẩu hiện tại"
                />

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <PasswordField
                    label="Mật khẩu mới"
                    value={newPassword}
                    onChange={setNewPassword}
                    show={showNew}
                    onToggleShow={() => setShowNew((prev) => !prev)}
                    placeholder="Nhập mật khẩu mới"
                  />

                  <PasswordField
                    label="Xác nhận mật khẩu mới"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    show={showConfirm}
                    onToggleShow={() => setShowConfirm((prev) => !prev)}
                    placeholder="Nhập lại mật khẩu mới"
                  />
                </div>

                <PasswordHint />

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-full bg-gradient-to-r from-[#9b4500] to-[#fc8a40] px-10 py-4 text-base font-extrabold text-white shadow-lg transition hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
                  </button>
                </div>
              </form>
            </section>

            <section
              id="privacy-consents"
              className="rounded-[3rem] bg-white p-6 shadow-sm shadow-cyan-900/5 md:p-10"
            >
              <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="mb-1 text-xs font-extrabold uppercase tracking-[0.16em] text-[#9b4500]">
                    Personal Privacy • Quyền kiểm soát dữ liệu
                  </p>
                  <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
                    Quản lý quyền chia sẻ SĐT với Hướng dẫn viên
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
                    Theo nguyên tắc <b>Privacy by Default</b>, số điện thoại của
                    bạn luôn được ẩn với Hướng dẫn viên cho đến khi bạn chủ động
                    cấp quyền trên từng đơn đặt chỗ/chuyến đi. Ngay cả khi đã cấp
                    quyền, Hướng dẫn viên được phân công cũng chỉ xem được trong
                    thời hạn từ 3 ngày trước ngày khởi hành đến 1 ngày sau khi kết
                    thúc chuyến.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={loadConsents}
                  className="rounded-full border border-[#c5cfd1] bg-white px-5 py-2.5 text-xs font-extrabold text-[#00606c] transition hover:bg-[#eef2f3]"
                >
                  Làm mới trạng thái
                </button>
              </div>

              {!consentSchemaReady ? (
                <div className="mb-6 rounded-2xl border border-[#ffdcb8] bg-[#fff7ed] px-5 py-4 text-sm font-semibold text-[#9b4500]">
                  Bảng lưu trữ đồng ý quyền riêng tư (<code>dbo.privacy_consents</code>)
                  đang chờ kích hoạt trên cơ sở dữ liệu. Hệ thống đang bảo vệ mặc
                  định: ẩn toàn bộ số điện thoại đối với Hướng dẫn viên.
                </div>
              ) : null}

              {consentFeedback ? (
                <div
                  className={`mb-6 rounded-2xl px-5 py-4 text-sm font-bold ${consentFeedback.type === "success"
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-600"
                    }`}
                >
                  {consentFeedback.text}
                </div>
              ) : null}

              {consentsLoading ? (
                <div className="rounded-3xl bg-[#f6fafb] p-8 text-center text-sm font-bold text-slate-500">
                  Đang tải danh sách đơn đặt chỗ và trạng thái quyền riêng tư...
                </div>
              ) : consentItems.length === 0 ? (
                <div className="rounded-3xl bg-[#f6fafb] p-8 text-center text-sm font-bold text-slate-500">
                  Bạn chưa có đơn đặt tour nào để cấu hình quyền chia sẻ số điện
                  thoại.
                </div>
              ) : (
                <div className="space-y-4">
                  {consentItems.map((item) => {
                    const isUpdating = updatingBookingId === item.bookingId;
                    const isCancelled =
                      item.bookingStatus === "CANCELLED" ||
                      item.bookingStatus === "REFUNDED";

                    return (
                      <div
                        key={item.bookingId}
                        className="rounded-[24px] border border-[#dfe5e6] bg-[#f9fbfc] p-5 transition hover:border-[#00606c]/30"
                      >
                        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2.5">
                              <span className="rounded-full bg-[#00606c]/10 px-3 py-1 text-xs font-extrabold text-[#00606c]">
                                Đơn {item.bookingCode}
                              </span>
                              <span className="rounded-full bg-slate-200/70 px-3 py-1 text-xs font-bold text-slate-700">
                                Chuyến {item.departureCode}
                              </span>
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-extrabold ${item.phoneShared
                                  ? "bg-[#dff7e8] text-[#14532d]"
                                  : item.consentStatus === "DENIED" ||
                                    item.consentStatus === "REVOKED"
                                    ? "bg-[#fff1df] text-[#9b4500]"
                                    : "bg-slate-200 text-slate-700"
                                  }`}
                              >
                                {formatConsentStatusLabel(item.consentStatus)}
                              </span>
                            </div>

                            <h3 className="text-lg font-extrabold text-slate-900">
                              {item.tourName}
                            </h3>

                            <p className="text-xs font-semibold text-slate-600">
                              Khởi hành:{" "}
                              {new Date(item.startDate).toLocaleDateString("vi-VN")}{" "}
                              – Kết thúc:{" "}
                              {new Date(item.endDate).toLocaleDateString("vi-VN")} •
                              HDV phụ trách:{" "}
                              <b>{item.guideName || "Đang chờ phân công"}</b>
                            </p>

                            <p className="text-xs text-slate-500">
                              Thời hạn HDV được phép xem khi có consent:{" "}
                              <b>
                                {item.allowedFrom
                                  ? new Date(item.allowedFrom).toLocaleDateString(
                                    "vi-VN"
                                  )
                                  : "—"}{" "}
                                –{" "}
                                {item.allowedUntil
                                  ? new Date(item.allowedUntil).toLocaleDateString(
                                    "vi-VN"
                                  )
                                  : "—"}
                              </b>{" "}
                              (
                              {item.guideAccessWindowAllowed
                                ? "Đang trong thời hạn vận hành"
                                : "Ngoài thời hạn vận hành"}
                              )
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2.5">
                            {!item.phoneShared ? (
                              <button
                                type="button"
                                disabled={
                                  isUpdating || !item.canGrantConsent || isCancelled
                                }
                                onClick={() =>
                                  handleConsentAction(item.bookingId, "GRANTED")
                                }
                                className="rounded-full bg-[#00606c] px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-[#004c56] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {isUpdating ? "Đang lưu..." : "Đồng ý chia sẻ SĐT"}
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={isUpdating || !item.canRevokeConsent}
                                onClick={() =>
                                  handleConsentAction(item.bookingId, "REVOKED")
                                }
                                className="rounded-full bg-[#ba1a1a] px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-[#93000a] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {isUpdating ? "Đang lưu..." : "Thu hồi quyền chia sẻ"}
                              </button>
                            )}

                              {
                                item.consentStatus !== "DENIED" ? (
                                  <button
                                    type="button"
                                    disabled={isUpdating || !item.canRevokeConsent}
                                    onClick={() =>
                                      handleConsentAction(item.bookingId, "DENIED")
                                    }
                                    className="rounded-full border border-[#c5cfd1] bg-white px-4 py-2.5 text-xs font-extrabold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    Từ chối chia sẻ
                                  </button>
                                ) : null
                              }

                              < button
                              type="button"
                            onClick={() => {
                              setSelectedBookingId(item.bookingId);
                              setLogsPage(1);
                            }}
                            className="rounded-full bg-[#e5f7fa] px-4 py-2.5 text-xs font-extrabold text-[#00606c] transition hover:bg-[#cfedf2]"
                            >
                            Lọc nhật ký đơn này
                          </button>

                          <Link
                            href={`/my-bookings/${item.bookingId}`}
                            className="rounded-full px-3 py-2 text-xs font-bold text-slate-600 hover:text-[#00606c] hover:underline"
                          >
                            Chi tiết đơn →
                          </Link>
                        </div>
                      </div>
                      </div>
              );
                  })}
          </div>
              )}
        </section>

        <section
          id="privacy-access-logs"
          className="rounded-[3rem] bg-white p-6 shadow-sm shadow-cyan-900/5 md:p-10"
        >
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="mb-1 text-xs font-extrabold uppercase tracking-[0.16em] text-[#9b4500]">
                Minh bạch dữ liệu • privacy_access_logs
              </p>
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
                Lịch sử truy cập dữ liệu cá nhân của bạn
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
                Mọi lượt xem hoặc cố gắng truy cập danh sách hành khách, thông
                tin liên hệ và hồ sơ cá nhân của bạn đều được ghi nhận tự động
                vào sổ nhật ký bất biến (không thể sửa hoặc xóa).
              </p>
            </div>

            <button
              type="button"
              onClick={loadAccessLogs}
              className="rounded-full border border-[#c5cfd1] bg-white px-5 py-2.5 text-xs font-extrabold text-[#00606c] transition hover:bg-[#eef2f3]"
            >
              Làm mới nhật ký
            </button>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-2xl bg-[#f6fafb] p-4">
              <p className="text-xs font-bold text-slate-500">
                Tổng lượt ghi nhận
              </p>
              <p className="mt-1 text-2xl font-black text-[#00606c]">
                {logStats.totalAccess}
              </p>
            </div>
            <div className="rounded-2xl bg-[#f0fdf4] p-4">
              <p className="text-xs font-bold text-green-700">
                Được phép (ALLOWED)
              </p>
              <p className="mt-1 text-2xl font-black text-green-700">
                {logStats.allowedCount}
              </p>
            </div>
            <div className="rounded-2xl bg-[#fef2f2] p-4">
              <p className="text-xs font-bold text-red-700">
                Đã chặn (DENIED)
              </p>
              <p className="mt-1 text-2xl font-black text-red-700">
                {logStats.deniedCount}
              </p>
            </div>
            <div className="rounded-2xl bg-[#ecfeff] p-4">
              <p className="text-xs font-bold text-[#00606c]">
                Lượt từ Hướng dẫn viên
              </p>
              <p className="mt-1 text-2xl font-black text-[#00606c]">
                {logStats.guideAccessCount}
              </p>
            </div>
          </div>

          <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  ["", "Tất cả"],
                  ["ALLOWED", "Được phép"],
                  ["DENIED", "Bị từ chối"],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val || "ALL"}
                  type="button"
                  onClick={() => {
                    setResultFilter(val);
                    setLogsPage(1);
                  }}
                  className={`rounded-full px-4 py-2 text-xs font-extrabold transition ${resultFilter === val
                    ? "bg-[#00606c] text-white"
                    : "bg-[#f1f4f5] text-slate-700 hover:bg-[#e2e8ea]"
                    }`}
                >
                  {label}
                </button>
              ))}

              {selectedBookingId ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBookingId("");
                    setLogsPage(1);
                  }}
                  className="rounded-full bg-[#fff1df] px-3.5 py-2 text-xs font-extrabold text-[#9b4500] hover:bg-[#ffe4c4]"
                >
                  Đang lọc theo đơn #{selectedBookingId} ✕
                </button>
              ) : null}
            </div>

            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                setAppliedQuery(searchQuery);
                setLogsPage(1);
              }}
            >
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo tên người xem, mã đơn, tour..."
                className="w-full rounded-full bg-[#eef2f3] px-4 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-[#00606c] md:w-64"
              />
              <button
                type="submit"
                className="rounded-full bg-[#00606c] px-4 py-2.5 text-xs font-extrabold text-white hover:bg-[#004c56]"
              >
                Tìm
              </button>
            </form>
          </div>

          {logsLoading ? (
            <div className="rounded-3xl bg-[#f6fafb] p-8 text-center text-sm font-bold text-slate-500">
              Đang tải lịch sử truy cập dữ liệu cá nhân...
            </div>
          ) : accessLogs.length === 0 ? (
            <div className="rounded-3xl bg-[#f6fafb] p-8 text-center text-sm font-bold text-slate-500">
              Chưa có bản ghi truy cập dữ liệu cá nhân nào khớp với bộ lọc hiện
              tại.
            </div>
          ) : (
            <div className="space-y-3">
              {accessLogs.map((log) => {
                const isAllowed = log.result === "ALLOWED";
                const reasonText = formatPrivacyReasonLabel(log.reason);

                return (
                  <div
                    key={log.id}
                    className={`rounded-2xl border-l-4 p-4 shadow-sm ${isAllowed
                      ? "border-l-emerald-600 bg-[#f9fbfc]"
                      : "border-l-red-500 bg-red-50/50"
                      }`}
                  >
                    <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-[11px] font-extrabold uppercase ${isAllowed
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-red-100 text-red-700"
                            }`}
                        >
                          {isAllowed ? "Được phép (ALLOWED)" : "Đã chặn (DENIED)"}
                        </span>

                        <span className="rounded-full bg-[#e5f7fa] px-3 py-1 text-xs font-extrabold text-[#00606c]">
                          {formatAccessorRoleLabel(log.accessorRole)}
                          {log.accessorName ? ` • ${log.accessorName}` : ""}
                        </span>

                        {log.bookingCode ? (
                          <span className="rounded-full bg-slate-200/80 px-3 py-1 text-xs font-bold text-slate-700">
                            Đơn {log.bookingCode}
                          </span>
                        ) : null}

                        {log.departureCode ? (
                          <span className="rounded-full bg-slate-200/80 px-3 py-1 text-xs font-bold text-slate-700">
                            Chuyến {log.departureCode}
                          </span>
                        ) : null}
                      </div>

                      <span className="text-xs font-bold text-slate-500">
                        {new Date(log.createdAt).toLocaleString("vi-VN")}
                      </span>
                    </div>

                    <div className="mt-2.5 grid grid-cols-1 gap-2 text-xs text-slate-700 md:grid-cols-3">
                      <p>
                        <b>Loại dữ liệu:</b>{" "}
                        {formatPrivacyDataTypeLabel(log.dataType)} ({log.action})
                      </p>
                      <p>
                        <b>Mục đích:</b>{" "}
                        {formatPrivacyPurposeLabel(log.purpose)}
                      </p>
                      <p>
                        <b>Chuyến / Tour:</b>{" "}
                        {log.tourName || "Hệ thống quản lý khách hàng"}
                      </p>
                    </div>

                    {reasonText ? (
                      <p className="mt-2 text-xs font-bold text-red-700">
                        Lý do: {reasonText}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}

          {logsTotal > 10 ? (
            <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-bold text-slate-600">
              <span>
                Trang {logsPage} / {Math.max(1, Math.ceil(logsTotal / 10))} (Tổng{" "}
                {logsTotal} lượt)
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={logsPage <= 1}
                  onClick={() => setLogsPage((p) => Math.max(1, p - 1))}
                  className="rounded-full border border-slate-300 px-4 py-1.5 disabled:opacity-40"
                >
                  Trước
                </button>
                <button
                  type="button"
                  disabled={logsPage >= Math.ceil(logsTotal / 10)}
                  onClick={() => setLogsPage((p) => p + 1)}
                  className="rounded-full border border-slate-300 px-4 py-1.5 disabled:opacity-40"
                >
                  Sau
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
    </div >
  </main >
);
}

function PasswordField({
  label,
  value,
  onChange,
  show,
  onToggleShow,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggleShow: () => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-2">
      <label className="ml-2 text-xs font-extrabold uppercase tracking-wider text-slate-700">
        {label}
      </label>

      <div className="relative">
        <span className="absolute left-4 top-1/2 flex -translate-y-1/2 text-slate-500">
          <LockIcon />
        </span>

        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-full border-none bg-[#eef2f3] py-4 pl-11 pr-14 text-sm font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:ring-2 focus:ring-[#00606c]"
        />

        <button
          type="button"
          onClick={onToggleShow}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-[#00606c]"
        >
          {show ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </div>
  );
}

function PasswordHint() {
  return (
    <div className="rounded-[2rem] bg-[#f1f4f5] p-5">
      <p className="mb-3 text-sm font-extrabold text-[#00606c]">
        Gợi ý mật khẩu an toàn
      </p>

      <ul className="space-y-2 text-sm leading-6 text-[#3e494b]">
        <li>• Tối thiểu 6 ký tự, nên có chữ hoa, chữ thường và số.</li>
        <li>• Không dùng ngày sinh, số điện thoại hoặc tên cá nhân.</li>
        <li>• Không chia sẻ mật khẩu qua tin nhắn hoặc email.</li>
      </ul>
    </div>
  );
}

function SecurityStatCard({
  title,
  value,
  desc,
  icon,
}: {
  title: string;
  value: string;
  desc: string;
  icon: "shield" | "user" | "clock";
}) {
  return (
    <div className="flex min-h-[92px] items-center gap-4 rounded-[2rem] bg-white px-6 py-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#dff8fb] text-[#00606c]">
        {icon === "shield" ? (
          <ShieldIcon />
        ) : icon === "user" ? (
          <UserIcon />
        ) : (
          <ClockSmallIcon />
        )}
      </div>

      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-slate-500">{title}</p>
        <p className="mt-1 truncate text-sm font-extrabold text-[#00606c]">
          {value}
        </p>
        <p className="mt-1 text-xs text-slate-500">{desc}</p>
      </div>
    </div>
  );
}

function SecurityOptionCard({
  title,
  desc,
  status,
}: {
  title: string;
  desc: string;
  status: string;
}) {
  return (
    <div className="rounded-[3rem] bg-white p-7 shadow-sm shadow-cyan-900/5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-extrabold text-slate-900">{title}</h3>
          <p className="mt-2 text-sm leading-7 text-slate-500">{desc}</p>
        </div>

        <span className="shrink-0 rounded-full bg-[#9defff] px-4 py-1.5 text-xs font-extrabold text-[#001f24]">
          {status}
        </span>
      </div>

      <button
        type="button"
        className="rounded-full bg-[#00606c]/10 px-6 py-3 text-sm font-bold text-[#00606c] transition hover:bg-[#00606c] hover:text-white"
      >
        Quản lý
      </button>
    </div>
  );
}

function LockIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6A2 2 0 0 0 12 14a2 2 0 0 0 1.4-.6" />
      <path d="M9.9 4.2A9.8 9.8 0 0 1 12 4c6.5 0 10 8 10 8a18.5 18.5 0 0 1-3.2 4.5" />
      <path d="M6.6 6.6C3.6 8.6 2 12 2 12s3.5 8 10 8a9.8 9.8 0 0 0 4.1-.9" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      className="h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6l7-3Z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function ClockSmallIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}