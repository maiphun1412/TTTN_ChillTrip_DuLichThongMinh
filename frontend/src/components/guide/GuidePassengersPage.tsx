"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import GuideShell from "@/components/guide/GuideShell";
import {
  clearAuthStorage,
  getGuideMeApi,
  getGuidePassengersApi,
  isForbiddenError,
  isNotFoundError,
  isUnauthorizedError,
  MISSING_PASSENGER_INFO_MESSAGE,
  UNSHARED_PHONE_MESSAGE,
  type GuideMe,
  type GuidePassenger,
  type GuidePassengerBooking,
  type GuidePassengerTrip,
} from "@/lib/api/guide.api";

type ExportType = "PDF" | "EXCEL";

type PickupGroup = {
  key: string;
  pickupName: string;
  pickupAddress: string;
  pickupTime?: string | null;
  bookings: GuidePassengerBooking[];
  bookingCount: number;
  passengerCount: number;
};

function formatDate(value?: string | null) {
  if (!value) return "Đang cập nhật";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Đang cập nhật";

  return date.toLocaleDateString("vi-VN");
}

function formatDateTime(value?: string | null) {
  if (!value) return "Đang cập nhật";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return formatDate(value);

  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function passengerTypeText(type?: string | null) {
  switch (String(type || "").toUpperCase()) {
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

function statusText(status?: string | null) {
  switch (String(status || "").toUpperCase()) {
    case "PENDING":
      return "Chờ thanh toán";
    case "RESERVED":
      return "Đã giữ chỗ";
    case "CONFIRMED":
      return "Đã xác nhận";
    case "PARTIALLY_PAID":
      return "Thanh toán một phần";
    case "PAID":
      return "Đã thanh toán";
    case "COMPLETED":
      return "Hoàn thành";
    default:
      return status || "Đang cập nhật";
  }
}

function getInitials(name?: string | null) {
  if (!name || name === MISSING_PASSENGER_INFO_MESSAGE) return "?";

  return name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function formatBookingContactPhone(booking: GuidePassengerBooking) {
  if (booking.contactPhoneShared && booking.contactPhone) {
    return booking.contactPhone;
  }
  return UNSHARED_PHONE_MESSAGE;
}

function formatPassengerPhone(
  passenger: GuidePassenger,
  _booking?: GuidePassengerBooking
) {
  if (passenger.hasPassengerInfo === false) {
    return UNSHARED_PHONE_MESSAGE;
  }
  if (passenger.phoneShared && passenger.phone) {
    return passenger.phone;
  }
  return UNSHARED_PHONE_MESSAGE;
}

function getBookingPassengerRows(booking: GuidePassengerBooking) {
  if (booking.passengers.length > 0) {
    return booking.passengers.map((passenger) => ({
      ...passenger,
      hasPassengerInfo: passenger.hasPassengerInfo !== false,
    }));
  }

  const total = Math.max(
    1,
    Number(booking.adultCount || 0) + Number(booking.childCount || 0)
  );

  return Array.from({ length: total }).map((_, index) => ({
    id: `${booking.id}-missing-${index}`,
    bookingId: booking.id,
    bookingCode: booking.bookingCode,
    bookingStatus: booking.bookingStatus,
    passengerType: index < Number(booking.adultCount || 0) ? "ADULT" : "CHILD",
    fullName: MISSING_PASSENGER_INFO_MESSAGE,
    hasPassengerInfo: false,
    phone: null,
    phoneShared: false,
    isBookingContact: false,
    contactName: booking.contactName,
    contactPhone: booking.contactPhoneShared ? booking.contactPhone : null,
    contactPhoneShared: Boolean(booking.contactPhoneShared),
  })) as GuidePassenger[];
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function makePickupKey(booking: GuidePassengerBooking) {
  return [
    booking.pickupName || "Chưa chọn điểm đón",
    booking.pickupAddress || "Chưa cập nhật địa chỉ",
    booking.pickupTime || "",
  ].join("___");
}

function groupBookingsByPickup(bookings: GuidePassengerBooking[]) {
  const map = new Map<string, PickupGroup>();

  for (const booking of bookings) {
    const key = makePickupKey(booking);

    if (!map.has(key)) {
      map.set(key, {
        key,
        pickupName: booking.pickupName || "Chưa chọn điểm đón",
        pickupAddress: booking.pickupAddress || "Chưa cập nhật địa chỉ",
        pickupTime: booking.pickupTime,
        bookings: [],
        bookingCount: 0,
        passengerCount: 0,
      });
    }

    const group = map.get(key)!;
    group.bookings.push(booking);
  }

  return Array.from(map.values()).map((group) => {
    const passengerCount = group.bookings.reduce(
      (sum, booking) => sum + getBookingPassengerRows(booking).length,
      0
    );

    return {
      ...group,
      bookingCount: group.bookings.length,
      passengerCount,
    };
  });
}

export default function GuidePassengersPage() {
  const router = useRouter();
  const [guide, setGuide] = useState<GuideMe | null>(null);
  const [trips, setTrips] = useState<GuidePassengerTrip[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [keyword, setKeyword] = useState("");
  const [exportType, setExportType] = useState<ExportType>("PDF");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setErrorMessage("");

      const [guideData, passengerData] = await Promise.all([
        getGuideMeApi(),
        getGuidePassengersApi(),
      ]);

      setGuide(guideData);
      setTrips(passengerData);

      if (passengerData[0]) {
        setSelectedId((prev) => prev || passengerData[0].assignmentId);
      }
    } catch (error) {
      setGuide(null);
      setTrips([]);

      if (isUnauthorizedError(error)) {
        clearAuthStorage();
        router.replace("/login");
        return;
      }

      if (isForbiddenError(error)) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Bạn không có quyền truy cập danh sách khách và điểm đón."
        );
        return;
      }

      if (isNotFoundError(error)) {
        setErrorMessage("Không tìm thấy chuyến đi được phân công.");
        return;
      }

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Không thể tải danh sách khách và điểm đón"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const selectedTrip =
    trips.find((trip) => trip.assignmentId === selectedId) || trips[0] || null;

  const isAccessAllowed = selectedTrip
    ? selectedTrip.passengerAccessAllowed !== false
    : false;

  const filteredBookings = useMemo(() => {
    if (!selectedTrip || selectedTrip.passengerAccessAllowed === false) {
      return [];
    }

    const search = keyword.trim().toLowerCase();

    if (!search) return selectedTrip.bookings;

    return selectedTrip.bookings.filter((booking) => {
      const passengerText = getBookingPassengerRows(booking)
        .map((passenger) =>
          [
            passenger.fullName,
            passenger.phoneShared ? passenger.phone : "",
          ]
            .filter(Boolean)
            .join(" ")
        )
        .join(" ");

      const text = [
        booking.bookingCode,
        booking.contactName,
        booking.contactPhoneShared ? booking.contactPhone : "",
        booking.pickupName,
        booking.pickupAddress,
        passengerText,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return text.includes(search);
    });
  }, [selectedTrip, keyword]);

  const pickupGroups = useMemo(
    () => groupBookingsByPickup(filteredBookings),
    [filteredBookings]
  );

  const flatPassengers = useMemo(() => {
    if (!isAccessAllowed) return [];
    return filteredBookings.flatMap((booking) =>
      getBookingPassengerRows(booking).map((passenger, index) => ({
        booking,
        passenger,
        index,
      }))
    );
  }, [filteredBookings, isAccessAllowed]);

  const summary = useMemo(() => {
    const registeredPassengerCount = flatPassengers.filter(
      ({ passenger }) =>
        passenger.hasPassengerInfo !== false &&
        passenger.fullName !== MISSING_PASSENGER_INFO_MESSAGE
    ).length;
    const missingPassengerCount =
      flatPassengers.length - registeredPassengerCount;

    const sharedPhoneCount = filteredBookings.filter(
      (booking) =>
        (booking.contactPhoneShared && Boolean(booking.contactPhone)) ||
        getBookingPassengerRows(booking).some(
          (passenger) => passenger.phoneShared && Boolean(passenger.phone)
        )
    ).length;

    return {
      pickupCount: pickupGroups.length,
      bookingCount: filteredBookings.length,
      passengerCount: flatPassengers.length,
      registeredPassengerCount,
      missingPassengerCount,
      sharedPhoneCount,
    };
  }, [filteredBookings, flatPassengers, pickupGroups.length]);

  function buildExportRows() {
    if (!selectedTrip || selectedTrip.passengerAccessAllowed === false) {
      return [];
    }

    return flatPassengers.map(({ booking, passenger }, index) => ({
      stt: index + 1,
      pickupName: booking.pickupName || "Chưa chọn điểm đón",
      pickupAddress: booking.pickupAddress || "Chưa cập nhật địa chỉ",
      pickupTime: formatDateTime(booking.pickupTime),
      bookingCode: booking.bookingCode,
      bookingStatus: statusText(booking.bookingStatus),
      contactPhone: formatBookingContactPhone(booking),
      passengerName: passenger.fullName || "Chưa cập nhật",
      passengerType: passengerTypeText(passenger.passengerType),
      phone: formatPassengerPhone(passenger, booking),
    }));
  }

  function exportPdf() {
    if (!selectedTrip || selectedTrip.passengerAccessAllowed === false) return;

    const rows = buildExportRows();
    if (rows.length === 0) return;

    const rowHtml = rows
      .map(
        (row) => `
          <tr>
            <td>${escapeHtml(row.stt)}</td>
            <td>${escapeHtml(row.pickupName)}<br/><small>${escapeHtml(
          row.pickupTime
        )}</small></td>
            <td>${escapeHtml(row.bookingCode)}</td>
            <td>${escapeHtml(row.bookingStatus)}</td>
            <td>${escapeHtml(row.contactPhone)}</td>
            <td>${escapeHtml(row.passengerName)}</td>
            <td>${escapeHtml(row.passengerType)}</td>
            <td>${escapeHtml(row.phone)}</td>
          </tr>
        `
      )
      .join("");

    const printWindow = window.open("", "_blank", "width=1100,height=800");

    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8" />
        <title>Danh sách khách và điểm đón - ${escapeHtml(
      selectedTrip.tourName
    )}</title>
        <style>
          body {
            font-family: "Times New Roman", Times, serif;
            padding: 28px;
            color: #111;
          }

          h1 {
            margin: 0 0 8px;
            color: #00606c;
            font-size: 26px;
          }

          .meta {
            margin-bottom: 20px;
            line-height: 1.6;
            font-size: 14px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }

          th, td {
            border: 1px solid #999;
            padding: 7px;
            text-align: left;
            vertical-align: top;
          }

          th {
            background: #e9f6f8;
            color: #003f46;
          }

          small {
            color: #555;
          }

          .footer {
            margin-top: 24px;
            font-size: 13px;
            color: #444;
          }

          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <h1>DANH SÁCH KHÁCH & ĐIỂM ĐÓN</h1>

        <div class="meta">
          <div><b>Tour:</b> ${escapeHtml(selectedTrip.tourName)}</div>
          <div><b>Mã tour:</b> ${escapeHtml(
      selectedTrip.tourCode
    )} | <b>Mã khởi hành:</b> ${escapeHtml(
      selectedTrip.departureCode
    )}</div>
          <div><b>Thời gian:</b> ${escapeHtml(
      formatDate(selectedTrip.startDate)
    )} - ${escapeHtml(formatDate(selectedTrip.endDate))}</div>
          <div><b>HDV:</b> ${escapeHtml(guide?.fullName || "")}</div>
          <div><b>Điểm đón:</b> ${summary.pickupCount
      } | <b>Booking:</b> ${summary.bookingCount} | <b>Khách:</b> ${summary.passengerCount
      }</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>STT</th>
              <th>Điểm đón</th>
              <th>Mã booking</th>
              <th>Trạng thái</th>
              <th>SĐT liên hệ</th>
              <th>Họ tên khách</th>
              <th>Loại khách</th>
              <th>SĐT khách</th>
            </tr>
          </thead>
          <tbody>
            ${rowHtml || `<tr><td colspan="8">Không có dữ liệu</td></tr>`}
          </tbody>
        </table>

        <div class="footer">
          In từ hệ thống ChillTrip Guide Center (Tuân thủ chính sách bảo vệ dữ liệu cá nhân).
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

  function exportExcel() {
    if (!selectedTrip || selectedTrip.passengerAccessAllowed === false) return;

    const rows = buildExportRows();
    if (rows.length === 0) return;

    const rowHtml = rows
      .map(
        (row) => `
          <tr>
            <td>${escapeHtml(row.stt)}</td>
            <td>${escapeHtml(row.pickupName)}</td>
            <td>${escapeHtml(row.pickupAddress)}</td>
            <td>${escapeHtml(row.pickupTime)}</td>
            <td>${escapeHtml(row.bookingCode)}</td>
            <td>${escapeHtml(row.bookingStatus)}</td>
            <td>${escapeHtml(row.contactPhone)}</td>
            <td>${escapeHtml(row.passengerName)}</td>
            <td>${escapeHtml(row.passengerType)}</td>
            <td>${escapeHtml(row.phone)}</td>
          </tr>
        `
      )
      .join("");

    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:x="urn:schemas-microsoft-com:office:excel"
            xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8" />
      </head>
      <body>
        <table border="1">
          <tr>
            <th colspan="10">DANH SÁCH KHÁCH & ĐIỂM ĐÓN - ${escapeHtml(
      selectedTrip.tourName
    )}</th>
          </tr>
          <tr>
            <td colspan="10">
              Mã tour: ${escapeHtml(selectedTrip.tourCode)}
              | Mã khởi hành: ${escapeHtml(selectedTrip.departureCode)}
              | Thời gian: ${escapeHtml(
      formatDate(selectedTrip.startDate)
    )} - ${escapeHtml(formatDate(selectedTrip.endDate))}
            </td>
          </tr>
          <tr></tr>
          <tr>
            <th>STT</th>
            <th>Điểm đón</th>
            <th>Địa chỉ điểm đón</th>
            <th>Giờ đón</th>
            <th>Mã booking</th>
            <th>Trạng thái booking</th>
            <th>SĐT liên hệ</th>
            <th>Họ tên khách</th>
            <th>Loại khách</th>
            <th>SĐT khách</th>
          </tr>
          ${rowHtml}
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(["\ufeff", html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeName = selectedTrip.tourCode || "khach-diem-don";

    link.href = url;
    link.download = `${safeName}-khach-diem-don.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  function handleExport() {
    if (
      !selectedTrip ||
      selectedTrip.passengerAccessAllowed === false ||
      flatPassengers.length === 0
    ) {
      return;
    }

    if (exportType === "PDF") {
      exportPdf();
      return;
    }

    exportExcel();
  }

  return (
    <GuideShell guide={guide}>
      <section className="space-y-7 pb-24 xl:pb-0">
        <section className="rounded-[32px] border border-[#dfe8ea]/70 bg-white/80 px-7 py-6 shadow-[0_14px_34px_rgba(15,23,42,0.04)] backdrop-blur-md">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="mb-3 text-[11px] font-black uppercase tracking-[0.26em] text-[#9b4500]">
                Quản lý đoàn khách
              </p>

              <h1 className="max-w-4xl text-[32px] font-black leading-[1.12] tracking-[-0.035em] text-[#005c66] md:text-[30px]">
                Khách & điểm đón
              </h1>

              <p className="mt-4 max-w-3xl text-[15px] font-medium leading-7 text-[#536163] md:text-base">
                Xem khách theo từng điểm đón để HDV dễ kiểm tra ai lên xe ở đâu
                và liên hệ hành khách đã đồng ý chia sẻ số điện thoại trong thời
                gian cho phép.
              </p>
            </div>

            <div className="flex flex-col gap-3 rounded-[24px] bg-[#f1f7f8] p-4 md:flex-row md:items-center">
              <select
                value={exportType}
                onChange={(event) =>
                  setExportType(event.target.value as ExportType)
                }
                className="rounded-full border border-[#d0dee1] bg-white px-5 py-3 text-sm font-black text-[#00606c] outline-none"
              >
                <option value="PDF">Xuất PDF</option>
                <option value="EXCEL">Xuất Excel</option>
              </select>

              <button
                type="button"
                onClick={handleExport}
                disabled={
                  !selectedTrip ||
                  selectedTrip.passengerAccessAllowed === false ||
                  flatPassengers.length === 0
                }
                className="rounded-full bg-[#00606c] px-6 py-3 text-sm font-black !text-white shadow-[0_12px_24px_rgba(0,96,108,0.18)] transition hover:bg-[#007b8a] disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                Xuất danh sách
              </button>
            </div>
          </div>
        </section>

        {loading ? (
          <StateBox text="Đang tải danh sách khách và điểm đón..." />
        ) : errorMessage ? (
          <StateBox text={errorMessage} danger />
        ) : trips.length === 0 ? (
          <StateBox text="Bạn chưa có tour nào có danh sách khách." />
        ) : (
          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_1fr]">
            <aside className="space-y-4">
              <div className="rounded-[28px] border border-[#dfe8ea] bg-white p-4 shadow-sm">
                <input
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="Tìm khách, SĐT, mã booking, điểm đón..."
                  className="w-full rounded-full border border-[#dfe8ea] bg-[#f7fbfc] px-5 py-3 text-sm font-semibold outline-none focus:border-[#00606c]"
                />
              </div>

              <div className="space-y-3">
                {trips.map((trip) => (
                  <button
                    key={trip.assignmentId}
                    type="button"
                    onClick={() => {
                      setSelectedId(trip.assignmentId);
                      setKeyword("");
                    }}
                    className={`w-full rounded-[28px] border p-4 text-left transition ${selectedTrip?.assignmentId === trip.assignmentId
                        ? "border-[#00606c] bg-[#effbfc] shadow-md"
                        : "border-[#dfe8ea] bg-white hover:bg-[#f7fbfc]"
                      }`}
                  >
                    <div className="flex gap-4">
                      <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-[22px] bg-[#e5e9ea]">
                        <img
                          src={
                            trip.featuredImageUrl ||
                            "/images/tours/dalat-cover.jpg"
                          }
                          alt={trip.tourName}
                          className="h-full w-full object-cover"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#9b4500]">
                          {trip.departureCode}
                        </p>

                        <h3 className="mt-1 line-clamp-2 text-base font-black text-[#172124]">
                          {trip.tourName}
                        </h3>

                        <p className="mt-2 text-xs font-semibold text-[#6e797b]">
                          {formatDate(trip.startDate)} -{" "}
                          {formatDate(trip.endDate)}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full bg-[#ddf9ff] px-3 py-1 text-[11px] font-black text-[#00606c]">
                            {trip.passengerCount} khách
                          </span>

                          <span className="rounded-full bg-[#fff3e8] px-3 py-1 text-[11px] font-black text-[#9b4500]">
                            {trip.bookingCount} booking
                          </span>

                          {trip.passengerAccessAllowed === false ? (
                            <span className="rounded-full bg-[#fff0ef] px-3 py-1 text-[11px] font-black text-[#ba1a1a]">
                              Ngoài hạn xem khách
                            </span>
                          ) : (
                            <span className="rounded-full bg-[#e6f9ed] px-3 py-1 text-[11px] font-black text-[#0e6b38]">
                              Đang mở danh sách
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </aside>

            <main className="space-y-6">
              {selectedTrip ? (
                <>
                  <section className="overflow-hidden rounded-[32px] border border-[#dfe8ea] bg-white shadow-sm">
                    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr]">
                      <div className="relative h-60 overflow-hidden bg-[#e5e9ea] lg:h-full">
                        <img
                          src={
                            selectedTrip.featuredImageUrl ||
                            "/images/tours/dalat-cover.jpg"
                          }
                          alt={selectedTrip.tourName}
                          className="h-full w-full object-cover"
                        />

                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                        <div className="absolute bottom-5 left-5 right-5">
                          <p className="text-xs font-black uppercase tracking-[0.18em] !text-[#9defff]">
                            {selectedTrip.tourCode}
                          </p>

                          <h2 className="mt-2 text-2xl font-black !text-white">
                            {selectedTrip.tourName}
                          </h2>
                        </div>
                      </div>

                      <div className="p-6 md:p-7">
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                          <SummaryBox
                            label="Điểm đón"
                            value={String(summary.pickupCount)}
                          />

                          <SummaryBox
                            label="Booking"
                            value={String(summary.bookingCount)}
                          />

                          <SummaryBox
                            label="Khách"
                            value={String(summary.passengerCount)}
                          />

                          <SummaryBox
                            label="SĐT chia sẻ"
                            value={String(summary.sharedPhoneCount)}
                          />
                        </div>

                        <div className="mt-5 rounded-[22px] bg-[#f7fbfc] p-4">
                          <p className="text-sm font-black text-[#00606c]">
                            Thông tin khởi hành & quyền truy cập
                          </p>

                          <p className="mt-2 text-sm font-semibold leading-7 text-[#536163]">
                            Mã khởi hành:{" "}
                            <span className="font-black text-[#172124]">
                              {selectedTrip.departureCode}
                            </span>
                            <br />
                            Thời gian tour: {formatDate(selectedTrip.startDate)} -{" "}
                            {formatDate(selectedTrip.endDate)}
                            <br />
                            Khung giờ được phép xem danh sách khách:{" "}
                            <span className="font-black text-[#172124]">
                              {formatDate(selectedTrip.allowedFrom)} -{" "}
                              {formatDate(selectedTrip.allowedUntil)}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-[32px] border border-[#dfe8ea] bg-white p-5 shadow-sm md:p-6">
                    <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#9b4500]">
                          Theo điểm đón
                        </p>

                        <h2 className="mt-2 text-2xl font-black text-[#172124]">
                          Khách lên xe ở đâu?
                        </h2>
                      </div>

                      <p className="rounded-full bg-[#f1f7f8] px-5 py-3 text-sm font-black text-[#00606c]">
                        {summary.passengerCount} khách đang hiển thị
                        {summary.missingPassengerCount > 0
                          ? ` (${summary.registeredPassengerCount} đã có hồ sơ • ${summary.missingPassengerCount} chưa có thông tin)`
                          : ""}
                      </p>
                    </div>

                    {selectedTrip.passengerAccessAllowed === false ? (
                      <div className="rounded-[26px] border border-[#ffdcb8] bg-[#fff7ed] p-6 text-left">
                        <p className="text-base font-black text-[#9b4500]">
                          Danh sách hành khách đang bị giới hạn theo chính sách bảo mật
                        </p>
                        <p className="mt-2 text-sm font-semibold leading-6 text-[#536163]">
                          {selectedTrip.passengerAccessMessage ||
                            "Chỉ được xem danh sách khách trong khoảng 3 ngày trước ngày khởi hành đến 1 ngày sau ngày kết thúc chuyến."}
                        </p>
                        <p className="mt-3 text-xs font-black uppercase tracking-[0.14em] text-[#00606c]">
                          Thời hạn cho phép: {formatDate(selectedTrip.allowedFrom)}{" "}
                          – {formatDate(selectedTrip.allowedUntil)}
                        </p>
                      </div>
                    ) : pickupGroups.length === 0 ? (
                      <StateBox text="Không tìm thấy khách phù hợp." />
                    ) : (
                      <div className="space-y-6">
                        {pickupGroups.map((group) => (
                          <PickupGroupCard key={group.key} group={group} />
                        ))}
                      </div>
                    )}
                  </section>
                </>
              ) : (
                <StateBox text="Chọn một tour để xem khách và điểm đón." />
              )}
            </main>
          </section>
        )}
      </section>
    </GuideShell>
  );
}

function PickupGroupCard({ group }: { group: PickupGroup }) {
  return (
    <article className="overflow-hidden rounded-[28px] border border-[#dfe8ea] bg-[#f7fbfc]">
      <div className="border-b border-[#dfe8ea] bg-white p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[#ddf9ff] text-[#00606c]">
              <PickupIcon />
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#9b4500]">
                Điểm đón
              </p>

              <h3 className="mt-1 text-xl font-black text-[#172124]">
                {group.pickupName}
              </h3>

              <p className="mt-2 text-sm font-semibold leading-6 text-[#536163]">
                {group.pickupAddress}
              </p>

              <p className="mt-1 text-sm font-black text-[#00606c]">
                Giờ đón: {formatDateTime(group.pickupTime)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-[#ddf9ff] px-4 py-2 text-xs font-black text-[#00606c]">
              {group.passengerCount} khách
            </span>

            <span className="rounded-full bg-[#fff3e8] px-4 py-2 text-xs font-black text-[#9b4500]">
              {group.bookingCount} booking
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-5">
        {group.bookings.map((booking) => (
          <BookingBlock key={booking.id} booking={booking} />
        ))}
      </div>
    </article>
  );
}

function BookingBlock({ booking }: { booking: GuidePassengerBooking }) {
  const passengers = getBookingPassengerRows(booking);
  const contactPhoneText = formatBookingContactPhone(booking);

  return (
    <div className="rounded-[24px] bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#00606c] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] !text-white">
              {booking.bookingCode}
            </span>

            <span className="rounded-full bg-[#fff3e8] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#9b4500]">
              {statusText(booking.bookingStatus)}
            </span>
          </div>

          <p className="mt-3 text-lg font-black text-[#172124]">
            Người liên hệ: {booking.contactName}
          </p>

          <p className="mt-1 text-sm font-semibold text-[#6e797b]">
            SĐT liên hệ:{" "}
            <span
              className={
                booking.contactPhoneShared && booking.contactPhone
                  ? "font-black text-[#00606c]"
                  : "italic text-[#9b4500]"
              }
            >
              {contactPhoneText}
            </span>
          </p>
        </div>

        <div className="rounded-[20px] bg-[#f7fbfc] px-4 py-3 text-sm font-bold text-[#536163]">
          {passengers.length} khách
        </div>
      </div>

      <div className="space-y-3">
        {passengers.map((passenger, index) => (
          <PassengerRow
            key={passenger.id || `${booking.id}-${index}`}
            passenger={passenger}
            booking={booking}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}

function PassengerRow({
  passenger,
  booking,
  index,
}: {
  passenger: GuidePassenger;
  booking: GuidePassengerBooking;
  index: number;
}) {
  const phoneDisplay = formatPassengerPhone(passenger, booking);
  const isPhoneShared = phoneDisplay !== UNSHARED_PHONE_MESSAGE;
  const isMissingInfo =
    passenger.hasPassengerInfo === false ||
    passenger.fullName === MISSING_PASSENGER_INFO_MESSAGE;

  return (
    <div className="rounded-[22px] border border-[#edf2f3] bg-[#fcfefe] p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[#ddf9ff] text-sm font-black text-[#00606c]">
            {getInitials(passenger.fullName)}
          </div>

          <div>
            <p className="font-black text-[#172124]">
              {passenger.fullName || `Hành khách ${index + 1}`}
                {
                  isMissingInfo?(
                <span className = "ml-2 rounded-full bg-[#fff3e8] px-2.5 py-0.5 text-[10px] font-black text-[#9b4500]" >
                      Chưa có hồ sơ khách
                </span>
            ) : passenger.isBookingContact ? (
            <span className="ml-2 rounded-full bg-[#9defff] px-2 py-0.5 text-[10px] font-black text-[#001f24]">
              Liên hệ chính
            </span>
              ) : null}
          </p>

          <p className="mt-1 text-sm font-semibold text-[#6e797b]">
            {passengerTypeText(passenger.passengerType)}
          </p>
        </div>
      </div>

      <div className="text-left md:text-right">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#91a0a4]">
          Số điện thoại
        </p>

        <p
          className={`mt-1 text-sm font-black ${isPhoneShared ? "text-[#172124]" : "text-[#9b4500]"
            }`}
        >
          {phoneDisplay}
        </p>
      </div>
    </div>
    </div >
  );
}

function SummaryBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] bg-[#f7fbfc] p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#91a0a4]">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black text-[#00606c]">{value}</p>
    </div>
  );
}

function StateBox({ text, danger = false }: { text: string; danger?: boolean }) {
  return (
    <div className="rounded-[28px] border border-[#dfe8ea] bg-white p-10 text-center shadow-sm">
      <p
        className={
          danger ? "font-black text-red-600" : "font-black text-[#00606c]"
        }
      >
        {text}
      </p>
    </div>
  );
}

function PickupIcon() {
  return (
    <svg
      className="h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 17h16M6 17V9a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v8M8 17v2M16 17v2M8 11h8M7 14h.01M17 14h.01"
      />
    </svg>
  );
}