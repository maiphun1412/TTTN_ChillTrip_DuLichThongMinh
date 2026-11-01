"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  formatConsentStatusLabel,
  getBookingPrivacyConsentApi,
  updateBookingPrivacyConsentApi,
  type CustomerBookingConsentItem,
} from "@/lib/api/privacy.api";

type BookingDetail = {
  booking: {
    id: string;
    bookingCode: string;
    bookingStatus: string;
    adultCount: number;
    childCount: number;
    contactName?: string | null;
    contactPhone?: string | null;
    contactEmail?: string | null;
    totalOriginalAmount: string | number;
    discountAmount: string | number;
    totalPayableAmount: string | number;
    bookedAt: string;
    reservedUntil?: string | null;
    specialNotes?: string | null;
    tourId: string;
    tourName: string;
    tourCode: string;
    durationDays: number;
    durationNights: number;
    featuredImageUrl?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    pickupName?: string | null;
    pickupAddress?: string | null;
    promotionName?: string | null;
    bookingType?: "INDIVIDUAL" | "GROUP";
    paymentType?: string | null;
  };
  passengers: {
    id?: string;
    fullName?: string;
    passengerType?: string;
    gender?: string | null;
    phone?: string | null;
    email?: string | null;
    idNumber?: string | null;
    passportNumber?: string | null;
  }[];
  itineraryDays: {
    id: string;
    dayNo: number;
    title?: string | null;
    description?: string | null;
    overnightLocation?: string | null;
  }[];

  groupContract?: {
    id: string;
    contractCode: string;
    organizationName: string;
    representativeName?: string | null;
    representativePhone?: string | null;
    representativeEmail?: string | null;
    expectedGuestCount?: number | null;
    contractValue?: string | number;
    paymentTerms?: string | null;
    cancellationTerms?: string | null;
    contractStatus?: string;
    signedDate?: string | null;
    attachedFileUrl?: string | null;
  } | null;
  payments?: {
    id: string;
    paymentCode: string;
    paymentType?: string | null;
    paymentMethod: string;
    amount: string | number;
    paymentStatus: string;
  }[];
};

function formatPrice(price?: string | number | null) {
  return `${Number(price || 0).toLocaleString("vi-VN")}đ`;
}

function formatDate(date?: string | null) {
  if (!date) return "Đang cập nhật";
  return new Date(date).toLocaleDateString("vi-VN");
}

function statusText(status?: string) {
  switch (status) {
    case "PENDING":
      return "Chờ thanh toán";
    case "RESERVED":
      return "Đã giữ chỗ";
    case "CONFIRMED":
      return "Đã xác nhận";
    case "PARTIALLY_PAID":
      return "Đã thanh toán một phần";
    case "PAID":
      return "Đã thanh toán";
    case "CANCELLED":
      return "Đã hủy";
    case "COMPLETED":
      return "Hoàn thành";
    default:
      return status || "Đang cập nhật";

    case "PENDING_CONTRACT":
      return "Chờ tạo hợp đồng";
    case "WAITING_DEPOSIT":
      return "Chờ thanh toán cọc";
    case "DEPOSIT_PAID":
      return "Đã thanh toán cọc";
  }
}

function statusClass(status?: string) {
  switch (status) {
    case "CONFIRMED":
    case "PAID":
      return "bg-green-100 text-green-700";
    case "PENDING":
    case "RESERVED":
    case "PARTIALLY_PAID":
      return "bg-[#ffdbc9] text-[#331200]";
    case "CANCELLED":
      return "bg-[#ffdad6] text-[#93000a]";
    case "COMPLETED":
      return "bg-[#dff7e8] text-[#14532d]";
    default:
      return "bg-[#ebeeef] text-[#3e494b]";
  }
}

function passengerTypeText(type?: string) {
  switch (type) {
    case "ADULT":
      return "Người lớn";
    case "CHILD":
      return "Trẻ em";
    case "INFANT":
      return "Em bé";
    default:
      return type || "Hành khách";
  }
}

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [data, setData] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [consentInfo, setConsentInfo] = useState<
    (CustomerBookingConsentItem & { schemaReady: boolean }) | null
  >(null);
  const [consentLoading, setConsentLoading] = useState(false);
  const [consentMessage, setConsentMessage] = useState("");
  const [consentError, setConsentError] = useState("");

  useEffect(() => {
    async function loadDetail() {
      try {
        setLoading(true);

        const token =
          localStorage.getItem("access_token") ||
          sessionStorage.getItem("access_token");

        if (!token) {
          throw new Error("Chưa đăng nhập");
        }

        const res = await fetch(`/backend-api/bookings/${id}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });

        const json = await res.json();

        if (!res.ok || !json.success) {
          if (res.status === 401 || res.status === 403 || res.status === 404) {
            setData(null);
            return;
          }
          throw new Error(json.message || "Không lấy được chi tiết booking");
        }

        setData(json.data);

        try {
          const consentData = await getBookingPrivacyConsentApi(id);
          setConsentInfo(consentData);
        } catch {
          setConsentInfo(null);
        }
      } catch (error) {
        console.error("Load booking detail error:", error);
        setData(null);
      } finally {
        setLoading(false);
      }
    }

    if (id) loadDetail();
  }, [id]);

  async function handleUpdateConsent(
    targetStatus: "GRANTED" | "DENIED" | "REVOKED"
  ) {
    try {
      setConsentLoading(true);
      setConsentMessage("");
      setConsentError("");

      const result = await updateBookingPrivacyConsentApi(id, targetStatus);
      const refreshed = await getBookingPrivacyConsentApi(id);
      setConsentInfo(refreshed);
      setConsentMessage(result.message);
    } catch (error) {
      setConsentError(
        error instanceof Error
          ? error.message
          : "Không thể cập nhật quyền chia sẻ số điện thoại"
      );
    } finally {
      setConsentLoading(false);
    }
  }

  function handleDownloadTicket() {
    if (!data) return;

    const { booking, passengers } = data;
    const guests =
      Number(booking.adultCount || 0) + Number(booking.childCount || 0);

    const passengerRows =
      passengers.length > 0
        ? passengers
          .map(
            (passenger, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${passenger.fullName || `Hành khách ${index + 1}`}</td>
                  <td>${passengerTypeText(passenger.passengerType)}</td>
                  <td>${passenger.phone || ""}</td>
                  <td>${passenger.idNumber || passenger.passportNumber || ""}</td>
                </tr>
              `
          )
          .join("")
        : `
          <tr>
            <td>1</td>
            <td>${booking.contactName || "Khách hàng"}</td>
            <td>Người liên hệ chính</td>
            <td>${booking.contactPhone || ""}</td>
            <td></td>
          </tr>
        `;

    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8" />
        <title>Vé điện tử ${booking.bookingCode}</title>
        <style>
          body {
            font-family: "Times New Roman", Times, serif;
            color: #111;
            padding: 36px;
            line-height: 1.5;
          }
          .ticket {
            border: 2px solid #00606c;
            border-radius: 18px;
            padding: 28px;
          }
          h1 {
            color: #00606c;
            margin: 0 0 8px;
            font-size: 32px;
          }
          h2 {
            margin: 24px 0 10px;
            font-size: 20px;
            color: #00606c;
          }
          .code {
            display: inline-block;
            padding: 8px 14px;
            background: #e5f7ff;
            border-radius: 999px;
            font-weight: bold;
            margin-bottom: 18px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
          }
          td, th {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: left;
          }
          th {
            background: #f1f4f5;
          }
          .total {
            font-size: 24px;
            font-weight: bold;
            color: #9b4500;
          }
          .footer {
            margin-top: 28px;
            font-size: 14px;
            color: #444;
          }
          @media print {
            button { display: none; }
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="ticket">
          <div class="code">Mã đơn: ${booking.bookingCode}</div>
          <h1>Vé điện tử ChillTrip</h1>
          <p><b>Trạng thái:</b> ${statusText(booking.bookingStatus)}</p>

          <h2>Thông tin tour</h2>
          <table>
            <tr><td><b>Tên tour</b></td><td>${booking.tourName}</td></tr>
            <tr><td><b>Mã tour</b></td><td>${booking.tourCode}</td></tr>
            <tr><td><b>Thời lượng</b></td><td>${booking.durationDays} ngày ${booking.durationNights} đêm</td></tr>
            <tr><td><b>Ngày khởi hành</b></td><td>${formatDate(booking.startDate)}</td></tr>
            <tr><td><b>Ngày kết thúc</b></td><td>${formatDate(booking.endDate)}</td></tr>
            <tr><td><b>Điểm đón</b></td><td>${booking.pickupName || "Chưa chọn điểm đón"}</td></tr>
            <tr><td><b>Địa chỉ điểm đón</b></td><td>${booking.pickupAddress || "Chưa cập nhật"}</td></tr>
          </table>

          <h2>Thông tin liên hệ</h2>
          <table>
            <tr><td><b>Người liên hệ</b></td><td>${booking.contactName || "Chưa cập nhật"}</td></tr>
            <tr><td><b>Số điện thoại</b></td><td>${booking.contactPhone || "Chưa cập nhật"}</td></tr>
            <tr><td><b>Email</b></td><td>${booking.contactEmail || "Chưa cập nhật"}</td></tr>
            <tr><td><b>Số khách</b></td><td>${guests} khách</td></tr>
          </table>

          <h2>Danh sách hành khách</h2>
          <table>
            <thead>
              <tr>
                <th>STT</th>
                <th>Họ tên</th>
                <th>Loại khách</th>
                <th>Số điện thoại</th>
                <th>CCCD / Passport</th>
              </tr>
            </thead>
            <tbody>
              ${passengerRows}
            </tbody>
          </table>

          <h2>Thanh toán</h2>
          <table>
            <tr><td><b>Tạm tính</b></td><td>${formatPrice(booking.totalOriginalAmount)}</td></tr>
            <tr><td><b>Ưu đãi</b></td><td>-${formatPrice(booking.discountAmount)}</td></tr>
            <tr><td><b>Tổng cộng</b></td><td class="total">${formatPrice(booking.totalPayableAmount)}</td></tr>
          </table>

          <p class="footer">
            Vui lòng mang theo vé điện tử này khi tham gia tour. ChillTrip xin cảm ơn quý khách.
          </p>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `);

    printWindow.document.close();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f6fafb] px-4 pt-32 text-center text-xl font-bold text-[#00606c]">
        Đang tải chi tiết đặt chỗ...
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-[#f6fafb] px-4 pt-32 text-center">
        <p className="text-2xl font-black text-[#181c1d]">
          Không tìm thấy đơn đặt tour
        </p>
        <button
          type="button"
          onClick={() => router.push("/my-bookings")}
          className="mt-5 rounded-full bg-[#00606c] px-6 py-3 font-bold text-white"
        >
          Quay lại tour đã đặt
        </button>
      </main>
    );
  }

  const { booking, passengers, itineraryDays, groupContract, payments } = data;
  const isGroupBooking = booking.bookingType === "GROUP";
  const depositPayment = payments?.find((item) => item.paymentType === "DEPOSIT");
  const guests =
    Number(booking.adultCount || 0) + Number(booking.childCount || 0);
  const image = booking.featuredImageUrl || "/images/tours/dalat-cover.jpg";

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#e8f4f6] via-[#f1f8f9] to-[#f6fafb] text-[#181c1d]">
      <div className="mx-auto max-w-[1400px] px-4 pb-20 pt-10 sm:px-6 lg:px-10">
        <button
          type="button"
          onClick={() => router.push("/my-bookings")}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#cde6ea] bg-white/90 px-5 py-2.5 text-sm font-bold text-[#00606c] shadow-sm transition-all hover:bg-[#e6f4f6]"
        >
          ← Quay lại tour đã đặt
        </button>

        <div className="mb-8 flex flex-col justify-between gap-6 rounded-[28px] border border-[#cbe4e8] bg-gradient-to-r from-[#e3f3f6] via-[#f2fafb] to-[#fff3e6] p-6 shadow-[0_14px_30px_rgba(0,96,108,0.06)] md:flex-row md:items-center md:p-8">
          <div>
            <div className="mb-3.5 flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-[#007b8a]/20 bg-[#007b8a]/15 px-4 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-[#005863]">
                Mã đơn: {booking.bookingCode}
              </span>
              <span
                className={`rounded-full px-4 py-1.5 text-xs font-black uppercase tracking-[0.16em] shadow-xs ${statusClass(
                  booking.bookingStatus
                )}`}
              >
                {statusText(booking.bookingStatus)}
              </span>
            </div>

            <h1 className="text-3xl font-black leading-tight tracking-[-0.04em] text-[#00606c] md:text-5xl">
              {booking.tourName}
            </h1>
            <p className="mt-2.5 font-medium text-[#355256]">
              Thông tin chi tiết đơn đặt tour của bạn.
            </p>
          </div>

          <div className="flex flex-wrap gap-3.5">
            <button
              type="button"
              onClick={handleDownloadTicket}
              className="rounded-full bg-gradient-to-r from-[#9b4500] to-[#fc8a40] px-7 py-3.5 font-bold text-white shadow-lg shadow-[#9b4500]/20 transition-all hover:scale-105"
            >
              Tải vé điện tử
            </button>
            <button className="rounded-full border border-[#c8dfe3] bg-white px-7 py-3.5 font-bold text-[#00606c] shadow-xs transition-all hover:bg-[#e8f4f6]">
              Hỗ trợ
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="space-y-8 lg:col-span-8">
            <div className="overflow-hidden rounded-[28px] border-2 border-white bg-white shadow-[0_16px_36px_rgba(0,96,108,0.09)]">
              <img
                src={image}
                alt={booking.tourName}
                className="h-72 w-full object-cover md:h-80"
              />
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <SummaryCard
                title="Ngày khởi hành"
                main={formatDate(booking.startDate)}
                sub={`Kết thúc: ${formatDate(booking.endDate)}`}
                tone="teal"
              />
              <SummaryCard
                title="Điểm đón khách"
                main={booking.pickupName || "Chưa chọn điểm đón"}
                sub={booking.pickupAddress || "Chưa cập nhật địa chỉ điểm đón"}
                tone="amber"
              />
              <SummaryCard
                title="Số khách"
                main={`${guests} khách`}
                sub={`${booking.adultCount || 0} người lớn • ${booking.childCount || 0
                  } trẻ em`}
                tone="emerald"
              />
              <SummaryCard
                title="Thời lượng"
                main={`${booking.durationDays} ngày ${booking.durationNights} đêm`}
                sub={`Mã tour: ${booking.tourCode}`}
                tone="sky"
              />
            </div>
            {isGroupBooking && groupContract ? (
              <section className="rounded-[28px] border border-[#cde5e9] bg-gradient-to-b from-[#f2f9fa] to-white p-8 shadow-[0_16px_32px_rgba(0,96,108,0.05)]">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xl font-black text-[#00606c]">
                    Hợp đồng tour đoàn
                  </h2>

                  <span className="rounded-full bg-[#ffdbc9] px-4 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-[#331200]">
                    {groupContract.contractStatus || "DRAFT"}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <InfoText label="Mã hợp đồng" value={groupContract.contractCode} />
                  <InfoText label="Tổ chức / công ty" value={groupContract.organizationName} />
                  <InfoText label="Người đại diện" value={groupContract.representativeName} />
                  <InfoText label="SĐT đại diện" value={groupContract.representativePhone} />
                  <InfoText label="Email đại diện" value={groupContract.representativeEmail} />
                  <InfoText
                    label="Số khách dự kiến"
                    value={
                      groupContract.expectedGuestCount
                        ? `${groupContract.expectedGuestCount} khách`
                        : "Chưa cập nhật"
                    }
                  />
                  <InfoText
                    label="Giá trị hợp đồng"
                    value={formatPrice(groupContract.contractValue)}
                  />
                  <InfoText
                    label="Tiền cọc"
                    value={depositPayment ? formatPrice(depositPayment.amount) : "Chưa tạo"}
                  />
                </div>

                {groupContract.paymentTerms ? (
                  <p className="mt-5 rounded-2xl bg-[#f6fafb] p-4 text-sm leading-7 text-[#3e494b]">
                    <b>Điều khoản thanh toán:</b> {groupContract.paymentTerms}
                  </p>
                ) : null}

                {groupContract.cancellationTerms ? (
                  <p className="mt-4 rounded-2xl bg-[#fff8ef] p-4 text-sm leading-7 text-[#3e494b]">
                    <b>Điều khoản hoàn hủy:</b> {groupContract.cancellationTerms}
                  </p>
                ) : null}

                {groupContract.attachedFileUrl ? (
                  <Link
                    href={groupContract.attachedFileUrl}
                    target="_blank"
                    className="mt-5 inline-flex rounded-full bg-[#00606c] px-6 py-3 font-bold text-white"
                  >
                    Xem file hợp đồng
                  </Link>
                ) : null}
              </section>
            ) : null}


            <section className="rounded-[28px] border border-[#cde5e9] bg-gradient-to-b from-[#f3f9fa] via-white to-white p-8 shadow-[0_16px_32px_rgba(0,96,108,0.05)]">
              <div className="mb-6 flex items-center justify-between gap-3">
                <h2 className="text-xl font-black text-[#00606c]">
                  Danh sách hành khách
                </h2>
                <span className="rounded-full bg-[#e3f3f5] px-3.5 py-1 text-xs font-extrabold text-[#00606c]">
                  {guests} hành khách
                </span>
              </div>

              <div className="space-y-4">
                {passengers.length > 0 ? (
                  passengers.map((p, index) => (
                    <PassengerRow
                      key={p.id || index}
                      name={p.fullName || `Hành khách ${index + 1}`}
                      desc={passengerTypeText(p.passengerType)}
                      index={index}
                      phone={p.phone}
                      documentNumber={p.idNumber || p.passportNumber}
                    />
                  ))
                ) : (
                  <>
                    <PassengerRow
                      name={booking.contactName || "Khách hàng"}
                      desc="Người liên hệ chính"
                      index={0}
                      phone={booking.contactPhone}
                    />
                    {Array.from({ length: Math.max(guests - 1, 0) }).map(
                      (_, index) => (
                        <PassengerRow
                          key={index}
                          name={`Hành khách ${index + 2}`}
                          desc="Chưa cập nhật thông tin"
                          index={index + 1}
                        />
                      )
                    )}
                  </>
                )}
              </div>
            </section>

            <section className="rounded-[28px] border border-[#cde5e9] bg-gradient-to-b from-[#f4fafb] via-white to-[#fffaf5] p-8 shadow-[0_16px_32px_rgba(0,96,108,0.05)]">
              <h2 className="mb-8 text-xl font-black text-[#00606c]">
                Lịch trình tóm tắt
              </h2>

              {itineraryDays.length === 0 ? (
                <p className="text-[#3e494b]">Chưa cập nhật lịch trình.</p>
              ) : (
                <div className="relative space-y-8">
                  <div className="absolute bottom-2 left-4 top-2 w-0.5 bg-gradient-to-b from-[#007b8a] via-[#fc8a40]/60 to-transparent" />
                  {itineraryDays.map((day) => (
                    <div key={day.id} className="relative pl-12">
                      <div className="absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#00606c] to-[#008da0] text-xs font-black text-white shadow-sm ring-4 ring-[#e8f4f6]">
                        {String(day.dayNo).padStart(2, "0")}
                      </div>
                      <div className="rounded-2xl border border-[#dfeef0] bg-[#f8fcfd] p-4">
                        <p className="text-lg font-black text-[#00505a]">
                          {day.title || `Ngày ${day.dayNo}`}
                        </p>
                        <p className="mt-1.5 text-sm leading-7 text-[#3e494b]">
                          {day.description ||
                            "Đang cập nhật nội dung lịch trình."}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-8 lg:col-span-4">
            <section className="rounded-[28px] bg-gradient-to-br from-[#005864] via-[#006b78] to-[#008394] p-8 text-white shadow-2xl shadow-[#00606c]/25">
              <h2 className="mb-6 text-xl font-black">Chi tiết thanh toán</h2>

              <div className="space-y-4">
                <PayLine
                  label="Tạm tính"
                  value={formatPrice(booking.totalOriginalAmount)}
                />
                <PayLine
                  label="Ưu đãi"
                  value={`-${formatPrice(booking.discountAmount)}`}
                />
                <div className="border-b border-white/20 pb-4" />
                <div className="flex items-center justify-between pt-2">
                  <span className="font-bold">Tổng cộng</span>
                  <span className="text-2xl font-black text-[#ffddb8]">
                    {formatPrice(booking.totalPayableAmount)}
                  </span>
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-[#cde5e9] bg-gradient-to-b from-[#edf7f9] via-white to-white p-8 shadow-[0_16px_32px_rgba(0,96,108,0.05)]">
              <h2 className="mb-4 text-lg font-black text-[#00606c]">
                Thông tin liên hệ
              </h2>
              <InfoText label="Người liên hệ" value={booking.contactName} />
              <InfoText label="Số điện thoại" value={booking.contactPhone} />
              <InfoText label="Email" value={booking.contactEmail} />
            </section>

            <section className="rounded-[28px] border border-[#b9dfe5] bg-gradient-to-b from-[#e8f6f8] via-white to-[#f6fbfc] p-8 shadow-[0_16px_32px_rgba(0,96,108,0.06)]">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-black text-[#00606c]">
                  Quyền riêng tư & Chia sẻ SĐT với HDV
                </h2>
                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-extrabold ${consentInfo?.phoneShared
                    ? "bg-[#dff7e8] text-[#14532d]"
                    : consentInfo?.consentStatus === "DENIED" ||
                      consentInfo?.consentStatus === "REVOKED"
                      ? "bg-[#fff1df] text-[#9b4500]"
                      : "bg-[#e0f0f2] text-[#005863]"
                    }`}
                >
                  {formatConsentStatusLabel(consentInfo?.consentStatus)}
                </span>
              </div>

              <p className="text-xs leading-6 text-[#3e494b]">
                Hướng dẫn viên được phân công chỉ có thể xem số điện thoại của
                đơn đặt chỗ này khi bạn chủ động cấp quyền <b>VÀ</b> chuyến đi
                đang trong khung thời gian vận hành (3 ngày trước khởi hành đến
                1 ngày sau khi kết thúc).
              </p>

              {consentInfo ? (
                <div className="mt-4 rounded-2xl border border-[#cde6ea] bg-[#eef8fa] p-4 text-xs leading-6 text-[#2d4649]">
                  <p>
                    <b>HDV phụ trách:</b>{" "}
                    {consentInfo.guideName || "Đang chờ phân công"}
                  </p>
                  <p>
                    <b>Thời hạn vận hành cho phép:</b>{" "}
                    {formatDate(consentInfo.allowedFrom)} –{" "}
                    {formatDate(consentInfo.allowedUntil)}
                  </p>
                </div>
              ) : null}

              {consentInfo && !consentInfo.schemaReady ? (
                <p className="mt-3 rounded-2xl bg-[#fff7ed] px-4 py-3 text-xs font-semibold text-[#9b4500]">
                  Bảng lưu trữ consent (dbo.privacy_consents) đang chờ kích hoạt
                  trên cơ sở dữ liệu. Hệ thống đang áp dụng chế độ mặc định ẩn
                  số điện thoại với Hướng dẫn viên.
                </p>
              ) : null}

              {consentMessage ? (
                <p className="mt-3 rounded-2xl bg-green-50 px-4 py-3 text-xs font-bold text-green-700">
                  {consentMessage}
                </p>
              ) : null}

              {consentError ? (
                <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-xs font-bold text-red-600">
                  {consentError}
                </p>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-2.5">
                {!consentInfo?.phoneShared ? (
                  <button
                    type="button"
                    disabled={
                      consentLoading ||
                      !consentInfo?.canGrantConsent ||
                      booking.bookingStatus === "CANCELLED"
                    }
                    onClick={() => handleUpdateConsent("GRANTED")}
                    className="rounded-full bg-[#00606c] px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-[#004c56] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {consentLoading
                      ? "Đang xử lý..."
                      : "Đồng ý chia sẻ SĐT với HDV"}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={consentLoading || !consentInfo?.canRevokeConsent}
                    onClick={() => handleUpdateConsent("REVOKED")}
                    className="rounded-full bg-[#ba1a1a] px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-[#93000a] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {consentLoading
                      ? "Đang xử lý..."
                      : "Thu hồi quyền chia sẻ SĐT"}
                  </button>
                )}

                {consentInfo?.consentStatus !== "DENIED" ? (
                  <button
                    type="button"
                    disabled={consentLoading || !consentInfo?.canRevokeConsent}
                    onClick={() => handleUpdateConsent("DENIED")}
                    className="rounded-full border border-[#c5cfd1] bg-white px-4 py-2.5 text-xs font-extrabold text-[#3e494b] transition hover:bg-[#eef2f3] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Từ chối chia sẻ
                  </button>
                ) : null}
              </div>

              <div className="mt-4 border-t border-[#d8eaed] pt-4">
                <Link
                  href={`/security?bookingId=${encodeURIComponent(booking.id)}#privacy-access-logs`}
                  className="inline-flex items-center text-xs font-extrabold text-[#00606c] hover:underline"
                >
                  Xem lịch sử truy cập dữ liệu của đơn này →
                </Link>
              </div>
            </section>

            <section className="rounded-[28px] border border-[#f2d9c7] bg-gradient-to-b from-[#fff5ec] via-white to-white p-8 shadow-[0_16px_32px_rgba(155,69,0,0.05)]">
              <h2 className="mb-4 text-lg font-black text-[#9b4500]">
                Chính sách hoàn hủy
              </h2>
              <p className="mb-6 rounded-2xl border border-[#f6e2d3] bg-[#fff9f4] p-4 text-sm leading-7 text-[#4e3829]">
                Hủy trước 15 ngày: hoàn 100%. Hủy từ 7-14 ngày: phí 50%.
                Hủy dưới 7 ngày: không hoàn tiền.
              </p>

              <button className="w-full rounded-full border border-[#ba1a1a]/30 bg-[#fff5f5] py-4 text-sm font-black text-[#ba1a1a] transition-all hover:bg-[#ba1a1a]/10">
                Yêu cầu hủy tour
              </button>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

function SummaryCard({
  title,
  main,
  sub,
  tone = "teal",
}: {
  title: string;
  main: string;
  sub: string;
  tone?: "teal" | "amber" | "emerald" | "sky";
}) {
  const toneStyles = {
    teal: {
      card: "border-[#c7e4e8] bg-gradient-to-br from-[#eaf6f8] via-white to-[#f6fbfc]",
      bar: "bg-[#007b8a]",
      badge: "bg-[#d8eff2] text-[#00606c]",
    },
    amber: {
      card: "border-[#f3dac2] bg-gradient-to-br from-[#fff3e6] via-white to-[#fffaf5]",
      bar: "bg-[#fc8a40]",
      badge: "bg-[#ffe8d1] text-[#9b4500]",
    },
    emerald: {
      card: "border-[#c5e6d8] bg-gradient-to-br from-[#eaf8f2] via-white to-[#f5fcf9]",
      bar: "bg-[#158058]",
      badge: "bg-[#d6f2e5] text-[#0f6848]",
    },
    sky: {
      card: "border-[#c9dfef] bg-gradient-to-br from-[#ebf4fb] via-white to-[#f6fafd]",
      bar: "bg-[#02779e]",
      badge: "bg-[#d8ecfa] text-[#005573]",
    },
  }[tone];

  return (
    <div
      className={`relative overflow-hidden rounded-[26px] border p-6 shadow-[0_12px_28px_rgba(0,96,108,0.05)] ${toneStyles.card}`}
    >
      <div className={`absolute bottom-5 left-0 top-5 w-1.5 rounded-r-full ${toneStyles.bar}`} />
      <div className="pl-2">
        <span
          className={`inline-block rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] ${toneStyles.badge}`}
        >
          {title}
        </span>
        <p className="mt-3 text-xl font-black text-[#181c1d]">{main}</p>
        <p className="mt-1 text-sm font-medium text-[#3e494b]">{sub}</p>
      </div>
    </div>
  );
}

function PassengerRow({
  name,
  desc,
  index,
  phone,
  documentNumber,
}: {
  name: string;
  desc: string;
  index: number;
  phone?: string | null;
  documentNumber?: string | null;
}) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#d7eaed] bg-gradient-to-r from-[#eef7f9] via-[#f7fbfc] to-white p-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#00606c] to-[#008da0] font-black text-white shadow-xs">
          {initials || index + 1}
        </div>
        <div>
          <p className="font-black text-[#181c1d]">{name}</p>
          <p className="text-xs font-semibold text-[#00606c]">{desc}</p>
          {(phone || documentNumber) && (
            <p className="mt-1 text-xs font-medium text-[#526366]">
              {phone ? `SĐT: ${phone}` : ""}
              {phone && documentNumber ? " • " : ""}
              {documentNumber ? `Giấy tờ: ${documentNumber}` : ""}
            </p>
          )}
        </div>
      </div>
      <span className="inline-flex w-fit rounded-full bg-[#dff1f4] px-3.5 py-1 text-xs font-black text-[#00606c]">
        Khách {index + 1}
      </span>
    </div>
  );
}

function PayLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm opacity-85">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function InfoText({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="border-b border-[#ebeeef] py-3 last:border-b-0">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-[#6e797b]">
        {label}
      </p>
      <p className="mt-1 font-bold text-[#181c1d]">
        {value || "Chưa cập nhật"}
      </p>
    </div>
  );
}