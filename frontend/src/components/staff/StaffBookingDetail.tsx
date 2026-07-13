"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CreditCard,
  FileText,
  Loader2,
  Mail,
  Phone,
  ReceiptText,
  UserRound,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  getStaffBookingDetailApi,
  type StaffBookingDetailData,
} from "@/lib/api/staff.api";

function formatMoney(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value || 0) + "đ";
}

function valueOrEmpty(value: unknown) {
  if (value === null || value === undefined || value === "") return "Chưa có";
  return String(value);
}

export default function StaffBookingDetail({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [data, setData] = useState<StaffBookingDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadDetail() {
    try {
      setLoading(true);
      setErrorMessage("");

      if (!bookingId || bookingId === "undefined") {
        throw new Error("Thiếu mã đặt chỗ cần xem chi tiết");
      }

      const result = await getStaffBookingDetailApi(bookingId);
      setData(result);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Không tải được chi tiết đặt chỗ"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="flex items-center gap-3 rounded-[2rem] bg-white px-6 py-4 shadow-sm">
          <Loader2 className="animate-spin text-[#00606c]" size={22} />
          <span className="font-semibold text-[#00606c]">
            Đang tải chi tiết đặt chỗ...
          </span>
        </div>
      </div>
    );
  }

  if (errorMessage || !data) {
    return (
      <div className="rounded-[2rem] border border-red-200 bg-white p-6 text-red-700 shadow-sm">
        <div className="mb-2 flex items-center gap-2 font-bold">
          <AlertCircle size={20} />
          Không tải được dữ liệu
        </div>

        <p className="text-sm">{errorMessage}</p>

        <button
          type="button"
          onClick={() => router.push("/staff/booking")}
          className="mt-5 rounded-full bg-[#00606c] px-5 py-2 text-sm font-bold text-white"
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  const { booking, passengers, payments, documents, debt } = data;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-6">
        <div>
          <button
            type="button"
            onClick={() => router.push("/staff/booking")}
            className="mb-5 flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-[#00606c] shadow-sm"
          >
            <ArrowLeft size={17} />
            Quay lại danh sách
          </button>

          <h1 className="text-4xl font-black tracking-[-0.04em] text-[#00606c]">
            Chi tiết đặt chỗ #{booking.bookingCode}
          </h1>

          <p className="mt-2 text-sm text-[#3e494b]">
            Toàn bộ thông tin đặt tour, khách hàng, hành khách, thanh toán, công
            nợ, hồ sơ và yêu cầu đặc biệt.
          </p>
        </div>

        <div className="rounded-[2rem] bg-white px-6 py-4 text-right shadow-sm ring-1 ring-[#ebeeef]">
          <p className="text-xs font-black uppercase text-[#6e797b]">
            Tổng cần thu
          </p>
          <p className="mt-1 text-3xl font-black text-[#00606c]">
            {formatMoney(booking.payableAmount)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-[#ebeeef] xl:col-span-2">
          <div className="mb-5 flex items-center gap-3">
            <CalendarDays className="text-[#00606c]" />
            <h2 className="text-xl font-black">Thông tin tour</h2>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <Info label="Tên tour" value={booking.tourName} />
            <Info label="Mã tour" value={booking.tourCode} />
            <Info label="Mã khởi hành" value={booking.departureCode} />
            <Info
              label="Ngày đi - ngày về"
              value={`${valueOrEmpty(booking.startDate)} - ${valueOrEmpty(
                booking.endDate
              )}`}
            />
            <Info label="Điểm đón" value={booking.pickupPointName} />
            <Info label="Địa chỉ đón" value={booking.pickupAddress} />
            <Info label="Khuyến mãi" value={booking.promotionName} />
            <Info label="Mã khuyến mãi" value={booking.promotionCode} />
          </div>
        </section>

        <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-[#ebeeef]">
          <div className="mb-5 flex items-center gap-3">
            <UserRound className="text-[#00606c]" />
            <h2 className="text-xl font-black">Khách đặt tour</h2>
          </div>

          <div className="space-y-3 text-sm">
            <Info label="Họ tên" value={booking.customerName} />
            <Info label="Email" value={booking.customerEmail} />
            <Info label="Số điện thoại" value={booking.customerPhone} />
            <Info label="Địa chỉ" value={booking.customerAddress} />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                if (!booking.customerPhone) alert("Chưa có số điện thoại");
                else window.location.href = `tel:${booking.customerPhone}`;
              }}
              className="flex items-center justify-center gap-2 rounded-full bg-[#ddf9ff] py-2 text-sm font-black text-[#00606c]"
            >
              <Phone size={16} />
              Gọi
            </button>

            <button
              type="button"
              onClick={() => {
                if (!booking.customerEmail) alert("Chưa có email");
                else window.location.href = `mailto:${booking.customerEmail}`;
              }}
              className="flex items-center justify-center gap-2 rounded-full bg-[#ddf9ff] py-2 text-sm font-black text-[#00606c]"
            >
              <Mail size={16} />
              Email
            </button>
          </div>
        </section>
      </div>

      <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-[#ebeeef]">
        <div className="mb-5 flex items-center gap-3">
          <Users className="text-[#00606c]" />
          <h2 className="text-xl font-black">Danh sách hành khách</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead>
              <tr className="bg-[#f1f4f5] text-[10px] font-black uppercase tracking-[0.16em] text-[#6e797b]">
                <th className="px-4 py-4">Họ tên</th>
                <th className="px-4 py-4">Loại</th>
                <th className="px-4 py-4">Giới tính</th>
                <th className="px-4 py-4">Ngày sinh</th>
                <th className="px-4 py-4">SĐT</th>
                <th className="px-4 py-4">CCCD</th>
                <th className="px-4 py-4">Passport</th>
                <th className="px-4 py-4">Ghi chú</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#ebeeef]">
              {passengers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm">
                    Chưa có danh sách hành khách.
                  </td>
                </tr>
              ) : (
                passengers.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-4 font-bold">{item.fullName}</td>
                    <td className="px-4 py-4">{item.passengerType}</td>
                    <td className="px-4 py-4">{valueOrEmpty(item.gender)}</td>
                    <td className="px-4 py-4">
                      {valueOrEmpty(item.dateOfBirth)}
                    </td>
                    <td className="px-4 py-4">{valueOrEmpty(item.phone)}</td>
                    <td className="px-4 py-4">{valueOrEmpty(item.idNumber)}</td>
                    <td className="px-4 py-4">
                      {valueOrEmpty(item.passportNumber)}
                    </td>
                    <td className="px-4 py-4">
                      {valueOrEmpty(item.healthNote || item.mealNote)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-[#ebeeef]">
          <div className="mb-5 flex items-center gap-3">
            <CreditCard className="text-[#00606c]" />
            <h2 className="text-xl font-black">Thanh toán</h2>
          </div>

          <div className="mb-5 grid grid-cols-3 gap-3">
            <Summary label="Tổng tiền" value={formatMoney(booking.totalAmount)} />
            <Summary label="Đã thanh toán" value={formatMoney(booking.paidAmount)} />
            <Summary label="Còn lại" value={formatMoney(booking.remainingAmount)} />
          </div>

          <div className="space-y-3">
            {payments.length === 0 ? (
              <p className="rounded-2xl bg-[#f6fafb] p-4 text-sm font-semibold text-[#6e797b]">
                Chưa có giao dịch thanh toán.
              </p>
            ) : (
              payments.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl bg-[#f6fafb] p-4 text-sm"
                >
                  <div className="flex justify-between gap-3">
                    <b>{item.paymentCode}</b>
                    <b className="text-[#00606c]">{formatMoney(item.amount)}</b>
                  </div>
                  <p className="mt-1 text-[#6e797b]">
                    {item.paymentMethod} • {item.paymentStatus} •{" "}
                    {valueOrEmpty(item.paidAt)}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-[#ebeeef]">
          <div className="mb-5 flex items-center gap-3">
            <FileText className="text-[#00606c]" />
            <h2 className="text-xl font-black">Hồ sơ / giấy tờ</h2>
          </div>

          <div className="space-y-3">
            {documents.length === 0 ? (
              <p className="rounded-2xl bg-[#f6fafb] p-4 text-sm font-semibold text-[#6e797b]">
                Chưa có hồ sơ giấy tờ.
              </p>
            ) : (
              documents.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl bg-[#f6fafb] p-4 text-sm"
                >
                  <div className="flex justify-between gap-3">
                    <b>{item.passengerName}</b>
                    <span className="rounded-full bg-[#ddf9ff] px-3 py-1 text-xs font-black text-[#00606c]">
                      {item.status}
                    </span>
                  </div>
                  <p className="mt-1 text-[#3e494b]">
                    {item.documentType} • {valueOrEmpty(item.documentNumber)}
                  </p>
                  <p className="mt-1 text-[#6e797b]">
                    Hết hạn: {valueOrEmpty(item.expiryDate)}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-[#ebeeef]">
        <div className="mb-5 flex items-center gap-3">
          <ReceiptText className="text-[#00606c]" />
          <h2 className="text-xl font-black">Yêu cầu / ghi chú đặc biệt</h2>
        </div>

        <div className="rounded-2xl bg-[#ffdbc9]/60 p-5 text-sm font-semibold leading-6 text-[#672c00]">
          {booking.specialNotes || "Booking này chưa có yêu cầu đặc biệt."}
        </div>

        {debt && (
          <div className="mt-5 rounded-2xl bg-[#f6fafb] p-5 text-sm">
            <p className="font-black text-[#181c1d]">Thông tin công nợ</p>
            <p className="mt-2 text-[#3e494b]">
              Tổng nợ: <b>{formatMoney(debt.totalAmount)}</b> • Đã trả:{" "}
              <b>{formatMoney(debt.paidAmount)}</b> • Còn lại:{" "}
              <b>{formatMoney(debt.remainingAmount)}</b>
            </p>
            <p className="mt-1 text-[#6e797b]">
              Hạn thanh toán: {valueOrEmpty(debt.dueDate)} • Trạng thái:{" "}
              {debt.debtStatus}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-2xl bg-[#f6fafb] p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#6e797b]">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-[#181c1d]">
        {valueOrEmpty(value)}
      </p>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#f6fafb] p-4">
      <p className="text-xs font-bold text-[#6e797b]">{label}</p>
      <p className="mt-1 text-lg font-black text-[#00606c]">{value}</p>
    </div>
  );
}