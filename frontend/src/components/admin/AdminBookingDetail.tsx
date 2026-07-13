"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Edit,
  Mail,
  Map,
  MapPin,
  Phone,
  ReceiptText,
  StickyNote,
  User,
  Users,
  Wallet,
  XCircle,
  History,
  Bus,
} from "lucide-react";

const API_BASE_URL = "/backend-api";

type BookingDetail = {
  id: string | number;
  booking_code: string;
  booking_status: string;
  contact_name: string;
  contact_phone: string;
  contact_email?: string | null;
  adult_count: number;
  child_count: number;
  total_original_amount: string | number;
  discount_amount: string | number;
  total_payable_amount: string | number;
  special_notes?: string | null;
  booked_at?: string | null;
  confirmed_at?: string | null;
  cancelled_at?: string | null;
  completed_at?: string | null;

  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  customer_address?: string | null;

  tour_name?: string | null;
  tour_code?: string | null;
  tour_type?: string | null;
  duration_days?: number | null;
  duration_nights?: number | null;
  featured_image_url?: string | null;
  tour_image_url?: string | null;

  start_date?: string | null;
  end_date?: string | null;

  pickup_name?: string | null;
  pickup_address?: string | null;
  promotion_name?: string | null;

  tour_id?: string | number;
departure_id?: string | number;
};

type DepartureOption = {
  id: string | number;
  departure_code: string;
  start_date: string;
  end_date: string;
  available_seats: number;
  booked_seats: number;
  booking_status: string;
};

type ItineraryDay = {
  id: string | number;
  day_no: number;
  title?: string | null;
  description?: string | null;
  overnight_location?: string | null;
};

type ApiData = {
  booking: BookingDetail;
  passengers: any[];
  documents: any[];
  promotions: any[];
  itineraryDays?: ItineraryDay[];
};

type EditForm = {
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  special_notes: string;
};

function formatMoney(value?: string | number | null) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("vi-VN");
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("vi-VN");
}

function getStatusLabel(status?: string) {
  switch (status) {
    case "PENDING":
      return "Chờ xác nhận";
    case "CONFIRMED":
      return "Đã xác nhận";
    case "PAID":
      return "Đã thanh toán";
    case "COMPLETED":
      return "Hoàn thành";
    case "CANCELLED":
      return "Đã hủy";
    default:
      return status || "-";
  }
}

function getStatusClass(status?: string) {
  switch (status) {
    case "PENDING":
      return "bg-[#ffdbc9] text-[#763300]";
    case "CONFIRMED":
    case "PAID":
    case "COMPLETED":
      return "bg-[#9defff] text-[#001f24]";
    case "CANCELLED":
      return "bg-[#ffdad6] text-[#93000a]";
    default:
      return "bg-[#ebeeef] text-[#3e494b]";
  }
}

function buildInvoiceHtml(booking: BookingDetail) {
  const totalGuests =
    Number(booking.adult_count || 0) + Number(booking.child_count || 0);

  return `
    <!DOCTYPE html>
    <html lang="vi">
      <head>
        <meta charset="UTF-8" />
        <title>Hóa đơn đặt tour ${booking.booking_code}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: Arial, "Times New Roman", sans-serif;
            color: #111;
            margin: 0;
            padding: 32px;
            background: white;
          }
          .invoice { max-width: 900px; margin: 0 auto; }
          .header {
            text-align: center;
            border-bottom: 2px solid #007B8A;
            padding-bottom: 18px;
            margin-bottom: 24px;
          }
          .header h1 {
            margin: 0;
            font-size: 26px;
            text-transform: uppercase;
            color: #007B8A;
          }
          .header p { margin: 6px 0 0; font-size: 14px; }
          .info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-bottom: 24px;
            font-size: 14px;
          }
          .box {
            border: 1px solid #d7dbdb;
            border-radius: 14px;
            padding: 16px;
          }
          .box h3 {
            margin: 0 0 10px;
            font-size: 16px;
            color: #00606c;
          }
          .line { margin: 6px 0; }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 22px 0;
            font-size: 14px;
          }
          th, td {
            border: 1px solid #333;
            padding: 10px;
            vertical-align: top;
          }
          th { background: #e5e9ea; text-align: left; }
          .right { text-align: right; }
          .center { text-align: center; }
          .summary {
            width: 360px;
            margin-left: auto;
            font-size: 14px;
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #eee;
          }
          .summary-row.total {
            font-size: 18px;
            font-weight: 800;
            color: #007B8A;
            border-bottom: none;
            border-top: 2px solid #007B8A;
            margin-top: 8px;
            padding-top: 12px;
          }
          .signature {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 60px;
            margin-top: 60px;
            text-align: center;
            font-size: 14px;
          }
          .signature strong {
            display: block;
            margin-bottom: 70px;
          }
          .note {
            margin-top: 24px;
            font-size: 13px;
            color: #444;
            font-style: italic;
          }
          @media print {
            body { padding: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="invoice">
          <div class="header">
            <h1>Hóa đơn đặt tour</h1>
            <p>Hệ thống quản trị ChillTrip</p>
          </div>

          <div class="info">
            <div class="box">
              <h3>Thông tin đơn hàng</h3>
              <p class="line"><b>Mã đơn:</b> ${booking.booking_code}</p>
              <p class="line"><b>Ngày đặt:</b> ${formatDateTime(
                booking.booked_at
              )}</p>
              <p class="line"><b>Trạng thái:</b> ${getStatusLabel(
                booking.booking_status
              )}</p>
            </div>

            <div class="box">
              <h3>Thông tin khách hàng</h3>
              <p class="line"><b>Khách hàng:</b> ${booking.contact_name || "-"}</p>
              <p class="line"><b>Số điện thoại:</b> ${
                booking.contact_phone || "-"
              }</p>
              <p class="line"><b>Email:</b> ${booking.contact_email || "-"}</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Nội dung</th>
                <th class="center">Số lượng</th>
                <th class="right">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <b>${booking.tour_name || "Tour du lịch"}</b><br />
                  Mã tour: ${booking.tour_code || "-"}<br />
                  Khởi hành: ${formatDate(booking.start_date)}
                </td>
                <td class="center">
                  ${totalGuests} khách<br />
                  (${booking.adult_count || 0} người lớn, ${
                    booking.child_count || 0
                  } trẻ em)
                </td>
                <td class="right">${formatMoney(
                  booking.total_original_amount
                )}</td>
              </tr>
            </tbody>
          </table>

          <div class="summary">
            <div class="summary-row">
              <span>Tổng gốc:</span>
              <b>${formatMoney(booking.total_original_amount)}</b>
            </div>
            <div class="summary-row">
              <span>Giảm giá:</span>
              <b>${formatMoney(booking.discount_amount)}</b>
            </div>
            <div class="summary-row total">
              <span>Tổng thanh toán:</span>
              <span>${formatMoney(booking.total_payable_amount)}</span>
            </div>
          </div>

          <p class="note">
            Ghi chú: ${booking.special_notes || "Không có ghi chú đặc biệt."}
          </p>

          <div class="signature">
            <div>
              <strong>Khách hàng</strong>
              <p>(Ký và ghi rõ họ tên)</p>
            </div>
            <div>
              <strong>Người lập hóa đơn</strong>
              <p>(Ký và ghi rõ họ tên)</p>
            </div>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `;
}

export default function AdminBookingDetail({
  bookingId,
}: {
  bookingId: string;
}) {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [departures, setDepartures] = useState<DepartureOption[]>([]);
const [selectedDepartureId, setSelectedDepartureId] = useState("");
  const [showInvoicePopup, setShowInvoicePopup] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({
    contact_name: "",
    contact_phone: "",
    contact_email: "",
    special_notes: "",
  });

 async function loadDepartures(tourId: string | number) {
  try {
    if (!tourId) {
      console.warn("tourId không hợp lệ:", tourId);
      setDepartures([]);
      return;
    }

    const url = `${API_BASE_URL}/admin/bookings/${tourId}/departures`;

    console.log("CALL API:", url);

    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("LOAD_DEPARTURES_ERROR:", res.status, text);
      setDepartures([]);
      return;
    }

    const json = await res.json();

    console.log("DEPARTURES DATA:", json);

    setDepartures(Array.isArray(json.data) ? json.data : []);
  } catch (error) {
    console.error("LOAD_DEPARTURES_ERROR:", error);
    setDepartures([]);
  }
}
  async function loadDetail() {
    try {
      setLoading(true);

      const res = await fetch(`${API_BASE_URL}/admin/bookings/${bookingId}`, {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("BOOKING_DETAIL_ERROR:", res.status, text);
        setData(null);
        return;
      }

      const json = await res.json();
      setData(json.data || null);
    } catch (error) {
      console.error("LOAD_BOOKING_DETAIL_ERROR:", error);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDetail();
  }, [bookingId]);

  function openEditPopup(booking: BookingDetail) {
    setEditForm({
      contact_name: booking.contact_name || "",
      contact_phone: booking.contact_phone || "",
      contact_email: booking.contact_email || "",
      special_notes: booking.special_notes || "",
      
    });
    if (booking.tour_id) {
  loadDepartures(booking.id);
}

setSelectedDepartureId(String(booking.departure_id || ""));
    setShowEditPopup(true);
  }

  async function handleChangeDeparture() {
  if (!selectedDepartureId) {
    alert("Vui lòng chọn ngày khởi hành mới");
    return;
  }

  try {
    const res = await fetch(
      `${API_BASE_URL}/admin/bookings/${bookingId}/change-departure`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          departureId: selectedDepartureId,
        }),
      }
    );

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      alert(json?.message || "Đổi ngày khởi hành thất bại");
      return;
    }

    await loadDetail();
    alert("Đổi ngày khởi hành thành công");
  } catch (error) {
    console.error("CHANGE_DEPARTURE_ERROR:", error);
    alert("Không thể đổi ngày khởi hành");
  }
}

async function handleSaveEdit() {
  if (!data?.booking) return;

  try {
    const res = await fetch(`${API_BASE_URL}/admin/bookings/${bookingId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contactName: editForm.contact_name,
        contactPhone: editForm.contact_phone,
        contactEmail: editForm.contact_email,
        specialNotes: editForm.special_notes,
      }),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => null);
      alert(json?.message || "Cập nhật đặt chỗ thất bại");
      return;
    }

    await loadDetail();
    setShowEditPopup(false);
  } catch (error) {
    console.error("UPDATE_BOOKING_ERROR:", error);
    alert("Không thể cập nhật đặt chỗ.");
  }
}

  function handleConfirmExportInvoice() {
    if (!data?.booking) return;

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      alert("Trình duyệt đang chặn popup. Hãy cho phép popup để xuất PDF.");
      return;
    }

    printWindow.document.write(buildInvoiceHtml(data.booking));
    printWindow.document.close();
    setShowInvoicePopup(false);
  }

  if (loading) {
    return (
      <div className="rounded-[2rem] bg-white p-10 text-center font-bold text-[#007B8A] shadow-sm">
        Đang tải chi tiết đặt chỗ...
      </div>
    );
  }

  if (!data?.booking) {
    return (
      <div className="rounded-[2rem] bg-white p-10 text-center font-bold text-[#93000a] shadow-sm">
        Không tìm thấy chi tiết đặt chỗ.
      </div>
    );
  }

  const booking = data.booking;

  const tourImage =
    booking.featured_image_url ||
    booking.tour_image_url ||
    "/images/tour-placeholder.jpg";

  const remainingAmount = 0;
  const itineraryDays = data.itineraryDays || [];
  const selectedDeparture = departures.find(
  (item) => String(item.id) === String(selectedDepartureId)
);

  return (
    <div className="space-y-8">
      <div className="rounded-[2rem] bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <Link
              href="/admin/booking"
              className="mb-4 inline-flex w-fit items-center gap-2 rounded-full bg-[#f1f4f5] px-4 py-2 text-sm font-bold text-[#007B8A] transition-all hover:bg-[#9defff]/40"
            >
              <ArrowLeft size={17} />
              Quay lại danh sách đặt chỗ
            </Link>

            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-black text-[#00606c]">
                Chi tiết đơn đặt tour
              </h1>
              <span className="rounded-full bg-[#9defff] px-4 py-1.5 text-xs font-extrabold text-[#001f24]">
                #{booking.booking_code}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {booking.booking_status !== "CANCELLED" && (
              <button className="rounded-full bg-[#ffdad6] px-5 py-3 font-bold text-[#93000a] transition hover:bg-[#ffc6c0]">
                <XCircle size={17} className="mr-2 inline" />
                Hủy đơn
              </button>
            )}

            <button
              onClick={() => setShowInvoicePopup(true)}
              className="rounded-full bg-[#007B8A] px-6 py-3 font-bold text-white shadow-lg shadow-[#007B8A]/20 transition hover:bg-[#00606c]"
            >
              <ReceiptText size={17} className="mr-2 inline" />
              Xuất hóa đơn
            </button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <section className="relative col-span-12 overflow-hidden rounded-[2rem] bg-[#f8fbfc] p-8 shadow-inner lg:col-span-7">
            <div className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-[#007B8A]/5 blur-3xl" />

            <div className="relative z-10 flex h-full min-h-[250px] flex-col justify-between">
              <div>
                <div className="mb-5 flex flex-wrap items-center gap-3">
                  <span
                    className={`rounded-full px-4 py-1.5 text-xs font-extrabold uppercase ${getStatusClass(
                      booking.booking_status
                    )}`}
                  >
                    {getStatusLabel(booking.booking_status)}
                  </span>

                  <span className="flex items-center gap-2 text-sm font-semibold text-[#3e494b]">
                    <CalendarDays size={16} />
                    Đặt ngày: {formatDate(booking.booked_at)}
                  </span>
                </div>

                <h2 className="mb-4 text-5xl font-black tracking-tight text-[#007B8A]">
                  Đơn hàng #{booking.booking_code}
                </h2>

                <p className="max-w-2xl text-base leading-8 text-[#3e494b]">
                  Đơn đặt tour đã được ghi nhận trong hệ thống. Nhân viên có thể
                  kiểm tra thông tin khách hàng, lịch trình, thanh toán và trạng
                  thái xử lý tại đây.
                </p>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <button className="flex items-center gap-2 rounded-full bg-white px-5 py-3 font-bold text-[#007B8A] shadow-sm transition hover:bg-[#9defff]/40">
                  <Mail size={17} />
                  Gửi lại email
                </button>

                <button
                  onClick={() => openEditPopup(booking)}
                  className="flex items-center gap-2 rounded-full bg-white px-5 py-3 font-bold text-[#007B8A] shadow-sm transition hover:bg-[#9defff]/40"
                >
                  <Edit size={17} />
                  Chỉnh sửa đơn
                </button>
              </div>
            </div>
          </section>

          <section className="relative col-span-12 overflow-hidden rounded-[2rem] bg-[#007B8A] p-8 text-white shadow-xl shadow-[#007B8A]/10 lg:col-span-5">
            <Wallet className="absolute bottom-3 right-3 h-36 w-36 opacity-10" />

            <div className="relative z-10 flex h-full min-h-[250px] flex-col justify-between">
              <div>
                <h3 className="mb-6 flex items-center gap-2 text-xl font-black">
                  <CreditCard size={22} />
                  Tổng thanh toán
                </h3>

                <div className="space-y-4">
                  <div className="border-b border-white/15 pb-4">
                    <p className="mb-2 text-sm opacity-80">
                      Tổng tiền cần thanh toán
                    </p>
                    <p className="text-4xl font-black">
                      {formatMoney(booking.total_payable_amount)}
                    </p>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="opacity-75">Tổng gốc</span>
                    <span className="font-bold">
                      {formatMoney(booking.total_original_amount)}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="opacity-75">Giảm giá</span>
                    <span className="font-bold">
                      {formatMoney(booking.discount_amount)}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="opacity-75">Còn lại</span>
                    <span className="font-bold">
                      {formatMoney(remainingAmount)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-3 rounded-2xl bg-white/10 p-4 text-sm">
                <CheckCircle2 className="shrink-0 text-[#9defff]" size={20} />
                <span>Trạng thái thanh toán: đã ghi nhận</span>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 space-y-6 xl:col-span-4">
          <section className="rounded-[2rem] bg-white p-6 shadow-sm">
            <h3 className="mb-6 flex items-center gap-2 text-lg font-black text-[#007B8A]">
              <User size={20} />
              Thông tin khách hàng
            </h3>

            <div className="mb-6 flex items-center gap-4 rounded-2xl bg-[#f6fafb] p-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#b3ebff] text-xl font-black text-[#001f24]">
                {(booking.contact_name || booking.customer_name || "K")
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div className="min-w-0">
                <p className="text-xs font-bold uppercase text-[#6e797b]">
                  Người liên hệ
                </p>
                <p className="truncate font-black text-[#181c1d]">
                  {booking.contact_name || booking.customer_name || "-"}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl bg-[#f1f4f5] p-4">
                <p className="mb-1 text-xs font-black uppercase text-[#6e797b]">
                  Số điện thoại
                </p>
                <p className="flex items-center gap-2 font-bold text-[#007B8A]">
                  <Phone size={16} />
                  {booking.contact_phone || booking.customer_phone || "-"}
                </p>
              </div>

              <div className="rounded-2xl bg-[#f1f4f5] p-4">
                <p className="mb-1 text-xs font-black uppercase text-[#6e797b]">
                  Email
                </p>
                <p className="flex items-center gap-2 break-all font-bold text-[#007B8A]">
                  <Mail size={16} />
                  {booking.contact_email || booking.customer_email || "-"}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] bg-white p-6 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-black text-[#9b4500]">
              <StickyNote size={20} />
              Ghi chú & yêu cầu
            </h3>

            <div className="rounded-2xl bg-[#ffdbc9]/35 p-4 text-sm italic leading-relaxed text-[#3e494b]">
              {booking.special_notes || "Không có ghi chú đặc biệt."}
            </div>
          </section>
        </div>

        <div className="col-span-12 space-y-6 xl:col-span-8">
          <section className="overflow-hidden rounded-[2rem] bg-white shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr]">
              <div className="min-h-[280px] bg-[#dfe3e4]">
                <img
                  src={tourImage}
                  alt={booking.tour_name || "Ảnh tour"}
                  className="h-full min-h-[280px] w-full object-cover"
                />
              </div>

              <div className="flex flex-col justify-center p-8">
                <div className="mb-3 flex items-center gap-2 text-[#007B8A]">
                  <MapPin size={16} />
                  <span className="text-xs font-black uppercase tracking-widest">
                    {booking.tour_type === "INTERNATIONAL"
                      ? "Tour quốc tế"
                      : "Tour du lịch"}
                  </span>
                </div>

                <h3 className="mb-7 text-3xl font-black leading-tight text-[#181c1d]">
                  {booking.tour_name || "-"}
                </h3>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div className="flex items-start gap-3 rounded-2xl bg-[#f6fafb] p-4">
                    <CalendarDays className="text-[#007B8A]" size={21} />
                    <div>
                      <p className="text-xs font-black uppercase text-[#6e797b]">
                        Ngày khởi hành
                      </p>
                      <p className="font-bold">
                        {formatDate(booking.start_date)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl bg-[#f6fafb] p-4">
                    <Users className="text-[#007B8A]" size={21} />
                    <div>
                      <p className="text-xs font-black uppercase text-[#6e797b]">
                        Số lượng khách
                      </p>
                      <p className="font-bold">
                        {booking.adult_count} người lớn, {booking.child_count}{" "}
                        trẻ em
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl bg-[#f6fafb] p-4 md:col-span-2">
                    <Bus className="text-[#007B8A]" size={21} />
                    <div>
                      <p className="text-xs font-black uppercase text-[#6e797b]">
                        Điểm đón khách
                      </p>
                      <p className="font-bold">
                        {booking.pickup_name ||
                          booking.pickup_address ||
                          "Chưa cập nhật điểm đón"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] bg-white p-8 shadow-sm">
            <h3 className="mb-8 flex items-center gap-2 text-lg font-black text-[#007B8A]">
              <History size={20} />
              Nhật ký đơn hàng
            </h3>

            <div className="relative space-y-8 before:absolute before:left-3 before:top-0 before:h-full before:w-0.5 before:bg-[#ebeeef]">
              <div className="relative pl-10">
                <div className="absolute left-0 top-1 z-10 h-6 w-6 rounded-full border-4 border-white bg-[#007B8A]" />
                <div className="flex justify-between gap-4">
                  <div>
                    <p className="font-black text-[#181c1d]">
                      Tạo đơn đặt tour
                    </p>
                    <p className="text-sm text-[#6e797b]">
                      Khách hàng gửi yêu cầu đặt tour trên hệ thống.
                    </p>
                  </div>
                  <span className="shrink-0 text-right text-xs font-semibold text-[#6e797b]">
                    {formatDateTime(booking.booked_at)}
                  </span>
                </div>
              </div>

              {booking.confirmed_at && (
                <div className="relative pl-10">
                  <div className="absolute left-0 top-1 z-10 h-6 w-6 rounded-full border-4 border-white bg-[#007B8A]" />
                  <div className="flex justify-between gap-4">
                    <div>
                      <p className="font-black text-[#181c1d]">
                        Đơn đã được xác nhận
                      </p>
                      <p className="text-sm text-[#6e797b]">
                        Nhân viên đã xác nhận thông tin đặt tour.
                      </p>
                    </div>
                    <span className="shrink-0 text-right text-xs font-semibold text-[#6e797b]">
                      {formatDateTime(booking.confirmed_at)}
                    </span>
                  </div>
                </div>
              )}

              {booking.cancelled_at && (
                <div className="relative pl-10">
                  <div className="absolute left-0 top-1 z-10 h-6 w-6 rounded-full border-4 border-white bg-[#ba1a1a]" />
                  <div className="flex justify-between gap-4">
                    <div>
                      <p className="font-black text-[#181c1d]">Đơn đã bị hủy</p>
                      <p className="text-sm text-[#6e797b]">
                        Đơn đặt tour đã chuyển sang trạng thái hủy.
                      </p>
                    </div>
                    <span className="shrink-0 text-right text-xs font-semibold text-[#6e797b]">
                      {formatDateTime(booking.cancelled_at)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      <section className="rounded-[2rem] bg-white p-8 shadow-sm">
        <h3 className="mb-6 flex items-center gap-2 text-lg font-black text-[#007B8A]">
          <Map size={22} />
          Lộ trình chi tiết dự kiến
        </h3>

        {itineraryDays.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {itineraryDays.map((day) => (
              <div
                key={day.id}
                className="rounded-2xl border border-[#bdc8cb]/20 bg-[#f6fafb] p-5"
              >
                <p className="mb-1 text-xs font-black uppercase text-[#007B8A]">
                  Ngày {day.day_no}
                </p>
                <h4 className="mb-2 text-lg font-black text-[#181c1d]">
                  {day.title || `Ngày ${day.day_no}`}
                </h4>
                <p className="text-sm leading-relaxed text-[#3e494b]">
                  {day.description || "Chưa có mô tả lộ trình."}
                </p>

                {day.overnight_location && (
                  <p className="mt-3 text-sm font-bold text-[#9b4500]">
                    Nghỉ đêm: {day.overnight_location}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-[#f1f4f5] p-6 text-sm font-semibold text-[#6e797b]">
            Tour này chưa có dữ liệu lộ trình.
          </div>
        )}
      </section>

     {showEditPopup && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#001f24]/55 p-4 backdrop-blur-sm">
    <div className="w-full max-w-4xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
      <div className="relative overflow-hidden bg-[#007B8A] px-8 py-7 text-white">
        <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute bottom-0 right-8 opacity-10">
          <Edit size={130} />
        </div>

        <div className="relative z-10 flex items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-[#9defff]">
              Cập nhật thông tin đặt chỗ
            </p>
            <h3 className="text-3xl font-black">
              Chỉnh sửa đơn #{booking.booking_code}
            </h3>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/80">
              Điều chỉnh thông tin liên hệ và ghi chú xử lý cho đơn đặt tour.
              Các thông tin tour, số khách và thanh toán được giữ nguyên.
            </p>
          </div>

          <button
            onClick={() => setShowEditPopup(false)}
            className="shrink-0 rounded-full bg-white/15 p-2 text-white transition hover:bg-white/25"
          >
            <XCircle size={24} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-0 lg:grid-cols-[1fr_300px]">
        <div className="p-8">
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-2 block text-xs font-black uppercase tracking-wider text-[#6e797b]">
                Người liên hệ
              </label>
              <div className="flex items-center gap-3 rounded-2xl border border-[#bdc8cb]/40 bg-[#f6fafb] px-4 py-3 transition focus-within:border-[#007B8A] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#007B8A]/10">
                <User size={18} className="shrink-0 text-[#007B8A]" />
                <input
                  value={editForm.contact_name}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      contact_name: e.target.value,
                    }))
                  }
                  placeholder="Nhập tên người liên hệ"
                  className="w-full bg-transparent text-sm font-semibold text-[#181c1d] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wider text-[#6e797b]">
                Số điện thoại
              </label>
              <div className="flex items-center gap-3 rounded-2xl border border-[#bdc8cb]/40 bg-[#f6fafb] px-4 py-3 transition focus-within:border-[#007B8A] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#007B8A]/10">
                <Phone size={18} className="shrink-0 text-[#007B8A]" />
                <input
                  value={editForm.contact_phone}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      contact_phone: e.target.value,
                    }))
                  }
                  placeholder="Nhập số điện thoại"
                  className="w-full bg-transparent text-sm font-semibold text-[#181c1d] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wider text-[#6e797b]">
                Email
              </label>
              <div className="flex items-center gap-3 rounded-2xl border border-[#bdc8cb]/40 bg-[#f6fafb] px-4 py-3 transition focus-within:border-[#007B8A] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#007B8A]/10">
                <Mail size={18} className="shrink-0 text-[#007B8A]" />
                <input
                  value={editForm.contact_email}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      contact_email: e.target.value,
                    }))
                  }
                  placeholder="Nhập email"
                  className="w-full bg-transparent text-sm font-semibold text-[#181c1d] outline-none"
                />
              </div>
            </div>

            <div className="md:col-span-2">
  <label className="mb-2 block text-xs font-black uppercase tracking-wider text-[#6e797b]">
    Đổi ngày khởi hành
  </label>

  <select
    value={selectedDepartureId}
    onChange={(e) => setSelectedDepartureId(e.target.value)}
    className="w-full rounded-2xl border border-[#bdc8cb]/40 bg-[#f6fafb] px-4 py-3 text-sm font-semibold text-[#181c1d] outline-none focus:border-[#007B8A] focus:ring-4 focus:ring-[#007B8A]/10"
  >
    <option value="">Chọn ngày khởi hành mới</option>

    {departures.map((item) => (
      <option key={item.id} value={item.id}>
        {formatDate(item.start_date)} - còn {item.available_seats} chỗ
      </option>
    ))}
  </select>

  <button
    type="button"
    onClick={handleChangeDeparture}
    className="mt-3 rounded-full bg-[#ffdbc9] px-5 py-2 text-sm font-black text-[#672c00] hover:bg-[#ffb68d]"
  >
    Xác nhận đổi ngày khởi hành
  </button>
</div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-xs font-black uppercase tracking-wider text-[#6e797b]">
                Ghi chú xử lý
              </label>
              <div className="rounded-2xl border border-[#bdc8cb]/40 bg-[#f6fafb] p-4 transition focus-within:border-[#007B8A] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#007B8A]/10">
                <div className="mb-3 flex items-center gap-2 text-xs font-bold text-[#007B8A]">
                  <StickyNote size={16} />
                  Yêu cầu đặc biệt / ghi chú nội bộ
                </div>
                <textarea
                  value={editForm.special_notes}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      special_notes: e.target.value,
                    }))
                  }
                  rows={5}
                  placeholder="Nhập ghi chú cho đơn đặt tour..."
                  className="w-full resize-none bg-transparent text-sm font-medium leading-6 text-[#181c1d] outline-none"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#ffdbc9] bg-[#ffdbc9]/25 p-4 text-sm leading-6 text-[#672c00]">
            <b>Lưu ý:</b> Popup này chỉ chỉnh các thông tin liên hệ và ghi chú.
            Nếu cần đổi tour, ngày khởi hành, số khách hoặc giá tiền thì nên xử
            lý bằng nghiệp vụ riêng để tránh sai dữ liệu thanh toán.
          </div>
        </div>

        <aside className="border-t border-[#bdc8cb]/20 bg-[#f1f4f5] p-7 lg:border-l lg:border-t-0">
          <h4 className="mb-5 text-sm font-black uppercase tracking-wider text-[#3e494b]">
            Tóm tắt đơn
          </h4>

          <div className="space-y-4">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="mb-1 text-xs font-black uppercase text-[#6e797b]">
                Mã đơn
              </p>
              <p className="font-black text-[#007B8A]">
                #{booking.booking_code}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="mb-1 text-xs font-black uppercase text-[#6e797b]">
                Tour
              </p>
              <p className="line-clamp-2 text-sm font-bold text-[#181c1d]">
                {booking.tour_name || "-"}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="mb-1 text-xs font-black uppercase text-[#6e797b]">
                Ngày khởi hành
              </p>
              <p className="font-bold text-[#181c1d]">
               {formatDate(selectedDeparture?.start_date || booking.start_date)}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="mb-1 text-xs font-black uppercase text-[#6e797b]">
                Tổng thanh toán
              </p>
              <p className="text-lg font-black text-[#9b4500]">
                {formatMoney(booking.total_payable_amount)}
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3">
            <button
              onClick={handleSaveEdit}
              className="rounded-full bg-[#007B8A] px-6 py-3 font-black text-white shadow-lg shadow-[#007B8A]/20 transition hover:bg-[#00606c]"
            >
              Lưu thay đổi
            </button>

            <button
              onClick={() => setShowEditPopup(false)}
              className="rounded-full bg-white px-6 py-3 font-black text-[#3e494b] transition hover:bg-[#dfe3e4]"
            >
              Hủy chỉnh sửa
            </button>
          </div>
        </aside>
      </div>
    </div>
  </div>
)}

      {showInvoicePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] bg-white p-8 shadow-2xl">
            <div className="mb-6 flex items-center justify-between gap-4">
              <h3 className="text-2xl font-black text-[#007B8A]">
                Xem trước hóa đơn
              </h3>
              <button
                onClick={() => setShowInvoicePopup(false)}
                className="rounded-full bg-[#f1f4f5] p-2 text-[#3e494b]"
              >
                <XCircle size={22} />
              </button>
            </div>

            <div className="rounded-2xl border border-[#bdc8cb]/30 bg-white p-6 text-[#111]">
              <div className="mb-8 border-b-2 border-[#007B8A] pb-5 text-center">
                <h2 className="text-2xl font-black uppercase text-[#007B8A]">
                  Hóa đơn đặt tour
                </h2>
                <p className="mt-1 text-sm">Hệ thống quản trị ChillTrip</p>
              </div>

              <div className="mb-6 grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                <div className="rounded-2xl border border-[#d7dbdb] p-4">
                  <h4 className="mb-2 font-black text-[#00606c]">
                    Thông tin đơn hàng
                  </h4>
                  <p>
                    <b>Mã đơn:</b> {booking.booking_code}
                  </p>
                  <p>
                    <b>Ngày đặt:</b> {formatDateTime(booking.booked_at)}
                  </p>
                  <p>
                    <b>Trạng thái:</b> {getStatusLabel(booking.booking_status)}
                  </p>
                </div>

                <div className="rounded-2xl border border-[#d7dbdb] p-4">
                  <h4 className="mb-2 font-black text-[#00606c]">
                    Thông tin khách hàng
                  </h4>
                  <p>
                    <b>Khách hàng:</b> {booking.contact_name || "-"}
                  </p>
                  <p>
                    <b>Số điện thoại:</b> {booking.contact_phone || "-"}
                  </p>
                  <p>
                    <b>Email:</b> {booking.contact_email || "-"}
                  </p>
                </div>
              </div>

              <table className="mb-6 w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-[#f1f4f5]">
                    <th className="border border-[#333] p-3 text-left">
                      Nội dung
                    </th>
                    <th className="border border-[#333] p-3 text-center">
                      Số lượng
                    </th>
                    <th className="border border-[#333] p-3 text-right">
                      Thành tiền
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-[#333] p-3">
                      <b>{booking.tour_name || "Tour du lịch"}</b>
                      <br />
                      Mã tour: {booking.tour_code || "-"}
                      <br />
                      Khởi hành: {formatDate(booking.start_date)}
                    </td>
                    <td className="border border-[#333] p-3 text-center">
                      {booking.adult_count + booking.child_count} khách
                      <br />({booking.adult_count || 0} người lớn,{" "}
                      {booking.child_count || 0} trẻ em)
                    </td>
                    <td className="border border-[#333] p-3 text-right">
                      {formatMoney(booking.total_original_amount)}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="ml-auto w-full max-w-sm space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Tổng gốc:</span>
                  <b>{formatMoney(booking.total_original_amount)}</b>
                </div>
                <div className="flex justify-between">
                  <span>Giảm giá:</span>
                  <b>{formatMoney(booking.discount_amount)}</b>
                </div>
                <div className="flex justify-between border-t-2 border-[#007B8A] pt-3 text-lg font-black text-[#007B8A]">
                  <span>Tổng thanh toán:</span>
                  <span>{formatMoney(booking.total_payable_amount)}</span>
                </div>
              </div>

              <p className="mt-8 text-sm italic text-[#444]">
                Ghi chú: {booking.special_notes || "Không có ghi chú đặc biệt."}
              </p>

              <div className="mt-10 grid grid-cols-2 gap-8 text-center text-sm">
                <div>
                  <p className="font-bold">Khách hàng</p>
                  <p className="mt-16">(Ký và ghi rõ họ tên)</p>
                </div>
                <div>
                  <p className="font-bold">Người lập hóa đơn</p>
                  <p className="mt-16">(Ký và ghi rõ họ tên)</p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button
                onClick={() => setShowInvoicePopup(false)}
                className="rounded-full bg-[#f1f4f5] px-6 py-3 font-bold text-[#3e494b]"
              >
                Đóng
              </button>
              <button
                onClick={handleConfirmExportInvoice}
                className="rounded-full bg-[#007B8A] px-6 py-3 font-bold text-white"
              >
                Xác nhận xuất PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}