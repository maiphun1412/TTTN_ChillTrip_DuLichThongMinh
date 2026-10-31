"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import HomeHeader from "../home/HomeHeader";
import { QRCodeCanvas } from "qrcode.react";
import { useSeatAvailability } from "@/hooks/useSeatAvailability";
import SeatWarningModal from "@/components/shared/SeatWarningModal";

export function isPastDeparture(startDateStr: string | null | undefined): boolean {
  if (!startDateStr) return true;
  const startDate = new Date(startDateStr);
  startDate.setHours(0, 0, 0, 0);

  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  return startDate.getTime() < currentDate.getTime();
}

type ApiDeparture = {
  id: string;
  departureCode: string;
  startDate: string;
  endDate: string;
  availableSeats?: number;
  maxSeats?: number;
  bookedSeats?: number;
  bookingStatus?: string;
};

type ApiTour = {
  id: string;
  tourCode: string;
  tourName: string;
  slug?: string | null;
  tourType: string;
  durationDays: number;
  durationNights: number;
  basePrice: string | number;
  childPrice?: string | number;
  maxCapacity?: number;
  shortDescription?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  destination?: {
    name?: string | null;
    country?: string | null;
    city?: string | null;
  } | null;
  departure?: ApiDeparture | null;
  departures?: ApiDeparture[];
};

type PassengerForm = {
  fullName: string;
  phone: string;
  passportNumber: string;
  passengerType: "ADULT" | "CHILD";
};

type PickupProvinceFee = {
  id: string;
  departure_id: string;
  province: string;
  fee_amount: string | number;
  notes?: string | null;
};

type AppliedPromotion = {
  promotionId: string;
  promotionCode: string;
  promotionName: string;
  discountAmount: number;
  finalAmount: number;
};

type PickupPoint = {
  id: string;
  departure_id?: string;
  point_type: string;
  point_name: string;
  address: string;
  province?: string | null;
  pickup_time?: string | null;
  dropoff_time?: string | null;
  notes?: string | null;
};

type CurrentUserResponse = {
  success?: boolean;
  data?: {
    user?: {
      fullName?: string | null;
      email?: string | null;
      phone?: string | null;
    } | null;
    customer?: {
      fullName?: string | null;
      email?: string | null;
      phone?: string | null;
      address?: string | null;
    } | null;
  };
};

const fallbackBookingSummary = {
  title: "Tour du lịch ChillTrip",
  duration: "Đang cập nhật",
  departure: "Đang cập nhật",
  guests: 2,
  pricePerGuest: "0đ",
  subtotal: "0đ",
  discount: "0đ",
  total: "0đ",
  image: "/images/tours/dalat-cover.jpg",
};

function formatPrice(price?: string | number | null) {
  return `${Number(price || 0).toLocaleString("vi-VN")}đ`;
}

function formatDate(date?: string | null) {
  if (!date) return "Đang cập nhật";
  return new Date(date).toLocaleDateString("vi-VN");
}

function formatDateTime(date?: string | null) {
  if (!date) return "";
  return new Date(date).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

async function createVnpayPayment(paymentId: number) {
  const res = await fetch("/backend-api/payments/vnpay/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ paymentId }),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.message || "Không tạo được link thanh toán VNPay");
  }

  return json as { paymentUrl: string };
}

export default function BookingPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tourId = searchParams.get("tourId");
  const initialPromotionCode = searchParams.get("promotionCode") || "";
  const initialGuests = Math.max(Number(searchParams.get("guests") || 2), 1);

  const [vnpayQrUrl, setVnpayQrUrl] = useState("");

  const [paymentMethod, setPaymentMethod] = useState("BANK_TRANSFER");
  const [tour, setTour] = useState<ApiTour | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [guests, setGuests] = useState(initialGuests);

  const [bookingType, setBookingType] =
    useState<"INDIVIDUAL" | "GROUP">("INDIVIDUAL");

  const [organizationName, setOrganizationName] = useState("");
  const [representativeName, setRepresentativeName] = useState("");
  const [representativePhone, setRepresentativePhone] = useState("");
  const [representativeEmail, setRepresentativeEmail] = useState("");
  const [expectedGuestCount, setExpectedGuestCount] = useState(initialGuests);
  const [depositAmount, setDepositAmount] = useState(0);
  const [paymentTerms, setPaymentTerms] = useState("");
  const [cancellationTerms, setCancellationTerms] = useState("");

  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactCity, setContactCity] = useState("");
  const [specialNotes, setSpecialNotes] = useState("");

  const [pickupPoints, setPickupPoints] = useState<PickupPoint[]>([]);
  const [pickupPointId, setPickupPointId] = useState("");
  const [loadingPickupPoints, setLoadingPickupPoints] = useState(false);

  const [pickupServiceType, setPickupServiceType] =
    useState<"MEETING_POINT" | "DOOR_TO_DOOR">("MEETING_POINT");
  const [pickupFeeId, setPickupFeeId] = useState("");
  const [pickupProvince, setPickupProvince] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupProvinceFees, setPickupProvinceFees] = useState<
    PickupProvinceFee[]
  >([]);
  const [pickupFeeAmount, setPickupFeeAmount] = useState(0);

  const [promotionCode, setPromotionCode] = useState(initialPromotionCode);
  const [appliedPromotion, setAppliedPromotion] =
    useState<AppliedPromotion | null>(null);
  const [promotionMessage, setPromotionMessage] = useState("");
  const [applyingPromotion, setApplyingPromotion] = useState(false);

  const [passengers, setPassengers] = useState<PassengerForm[]>(
    Array.from({ length: initialGuests }, () => ({
      fullName: "",
      phone: "",
      passportNumber: "",
      passengerType: "ADULT",
    }))
  );

  const departureId = searchParams.get("departureId");
  const departure = useMemo(() => {
    if (!tour) return null;
    const list =
      tour.departures && tour.departures.length > 0
        ? tour.departures
        : tour.departure
        ? [tour.departure]
        : [];
    if (departureId) {
      return (
        list.find((d) => String(d.id) === String(departureId)) ||
        list[0] ||
        null
      );
    }
    return list[0] || null;
  }, [tour, departureId]);

  const availableSeats = Number(departure?.availableSeats || 0);
  const isDeparturePast = useMemo(() => isPastDeparture(departure?.startDate), [departure]);
  const isDepartureSeatsOut = useMemo(() => availableSeats <= 0, [departure, availableSeats]);
  const isDepartureInvalid = isDeparturePast || isDepartureSeatsOut;

  const isInternationalTour = tour?.tourType === "INTERNATIONAL";
  const pricePerGuest = Number(tour?.basePrice || 0);

  const billingGuests =
    bookingType === "GROUP"
      ? Math.max(Number(expectedGuestCount || 0), 1)
      : guests;

  const {
    isSeatsInvalid,
    warningInfo,
    showWarningModal,
    closeWarning,
  } = useSeatAvailability({
    tourId: tourId || "",
    departureId: departure?.id || "",
    bookingType: bookingType,
    adultCount: billingGuests,
    childCount: 0,
    expectedGuestCount: bookingType === "GROUP" ? expectedGuestCount : 0,
    availableSeats: availableSeats,
    isLoading: loading,
  });

  const pickupFeeForTotal =
    bookingType === "INDIVIDUAL" ? pickupFeeAmount : 0;

  const subtotal = pricePerGuest * billingGuests;
  const discount = appliedPromotion?.discountAmount || 0;
  const total = Math.max(subtotal - discount + pickupFeeForTotal, 0);

  const depositDisplayAmount =
    bookingType === "GROUP" ? Math.min(Number(depositAmount || 0), total) : 0;

  const bookingSummary = tour
    ? {
        title: tour.tourName,
        duration: `${tour.durationDays} Ngày ${tour.durationNights} Đêm`,
        departure: formatDate(departure?.startDate),
        guests: billingGuests,
        pricePerGuest: formatPrice(pricePerGuest),
        subtotal: formatPrice(subtotal),
        discount: discount > 0 ? `-${formatPrice(discount)}` : "0đ",
        total: formatPrice(total),
        image: tour.imageUrl || "/images/tours/dalat-cover.jpg",
      }
    : {
        ...fallbackBookingSummary,
        guests: billingGuests,
      };

  useEffect(() => {
    async function loadCurrentUser() {
      try {
        const token =
          localStorage.getItem("access_token") ||
          sessionStorage.getItem("access_token");

        if (!token) return;

        const res = await fetch("/backend-api/auth/me", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });

        if (!res.ok) return;

        const json = (await res.json()) as CurrentUserResponse;

        const user = json.data?.user;
        const customer = json.data?.customer;

        setContactName((prev) =>
          prev || customer?.fullName || user?.fullName || ""
        );
        setContactPhone((prev) => prev || customer?.phone || user?.phone || "");
        setContactEmail((prev) => prev || customer?.email || user?.email || "");
        setContactCity((prev) => prev || customer?.address || "");
      } catch (error) {
        console.error("Load current user error:", error);
      }
    }

    loadCurrentUser();
  }, []);

  useEffect(() => {
    setPassengers((prev) => {
      const next = [...prev];

      while (next.length < guests) {
        next.push({
          fullName: "",
          phone: "",
          passportNumber: "",
          passengerType: "ADULT",
        });
      }

      return next.slice(0, guests);
    });
  }, [guests]);

  useEffect(() => {
    async function loadTour() {
      try {
        if (!tourId) {
          setTour(null);
          return;
        }

        const res = await fetch(`/backend-api/tours/${tourId}`, {
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error("Không thể lấy thông tin tour");
        }

        const json = await res.json();
        setTour(json.data || null);
      } catch (error) {
        console.error("Load booking tour error:", error);
        setTour(null);
      } finally {
        setLoading(false);
      }
    }

    loadTour();
  }, [tourId]);

  useEffect(() => {
    async function loadPickupProvinceFees() {
      try {
        if (!departure?.id) {
          setPickupProvinceFees([]);
          return;
        }

        const res = await fetch(
          `/backend-api/pickup-province-fees?departureId=${departure.id}`,
          { cache: "no-store" }
        );

        const json = await res.json();

        if (!res.ok || !json.success) {
          setPickupProvinceFees([]);
          return;
        }

        setPickupProvinceFees(json.data || []);
      } catch (error) {
        console.error("Load pickup province fees error:", error);
        setPickupProvinceFees([]);
      }
    }

    loadPickupProvinceFees();
  }, [departure?.id]);

  useEffect(() => {
    async function loadPickupPoints() {
      try {
        if (!departure?.id) {
          setPickupPoints([]);
          setPickupPointId("");
          return;
        }

        setLoadingPickupPoints(true);

        const res = await fetch(
          `/backend-api/pickup-points?departureId=${departure.id}`,
          { cache: "no-store" }
        );

        const json = await res.json();

        if (!res.ok || !json.success) {
          setPickupPoints([]);
          setPickupPointId("");
          return;
        }

        const points = json.data || [];
        setPickupPoints(points);

        if (points.length === 1) {
          setPickupPointId(points[0].id);
        }
      } catch (error) {
        console.error("Load pickup points error:", error);
        setPickupPoints([]);
        setPickupPointId("");
      } finally {
        setLoadingPickupPoints(false);
      }
    }

    loadPickupPoints();
  }, [departure?.id]);

  useEffect(() => {
    if (!tour || !initialPromotionCode) return;

    handleApplyPromotion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour?.id]);

  async function handleApplyPromotion() {
    try {
      if (!tour) {
        alert("Không tìm thấy thông tin tour");
        return;
      }

      if (!promotionCode.trim()) {
        setPromotionMessage("Vui lòng nhập mã khuyến mãi.");
        setAppliedPromotion(null);
        return;
      }

      setApplyingPromotion(true);
      setPromotionMessage("");

      const res = await fetch("/backend-api/promotions/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          promotionCode: promotionCode.trim(),
          tourId: tour.id,
          orderAmount: subtotal,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setAppliedPromotion(null);
        setPromotionMessage(json.message || "Mã khuyến mãi không hợp lệ.");
        return;
      }

      setAppliedPromotion(json.data);
      setPromotionMessage(`Áp dụng thành công mã ${json.data.promotionCode}.`);
    } catch (error) {
      console.error("Apply promotion error:", error);
      setAppliedPromotion(null);
      setPromotionMessage("Không thể áp dụng mã khuyến mãi.");
    } finally {
      setApplyingPromotion(false);
    }
  }

  async function handleCreateBooking() {
    if (submitting) return;

    try {
      if (!tour || !departure) {
        alert("Không tìm thấy thông tin tour");
        return;
      }

      if (!contactName.trim()) {
        alert("Vui lòng nhập họ tên người liên hệ");
        return;
      }

      if (!contactPhone.trim()) {
        alert("Vui lòng nhập số điện thoại");
        return;
      }

      if (bookingType === "INDIVIDUAL") {
        if (
          pickupServiceType === "MEETING_POINT" &&
          pickupPoints.length > 0 &&
          !pickupPointId
        ) {
          alert("Vui lòng chọn điểm đón / điểm tập trung");
          return;
        }

        if (pickupServiceType === "DOOR_TO_DOOR") {
          if (!pickupFeeId) {
            alert("Vui lòng chọn tỉnh/thành đưa đón");
            return;
          }

          if (!pickupAddress.trim()) {
            alert("Vui lòng nhập địa chỉ đón tận nơi");
            return;
          }
        }

        if (isSeatsInvalid) {
          alert(`Chỉ còn ${availableSeats} chỗ trống. Không thể đặt cho ${guests} khách.`);
          return;
        }
      }

      if (bookingType === "GROUP") {
        if (!organizationName.trim()) {
          alert("Vui lòng nhập tên công ty / tổ chức.");
          return;
        }

        if (!representativeName.trim()) {
          alert("Vui lòng nhập tên người đại diện.");
          return;
        }

        if (!representativePhone.trim()) {
          alert("Vui lòng nhập số điện thoại người đại diện.");
          return;
        }

        if (expectedGuestCount <= 0) {
          alert("Vui lòng nhập số lượng khách dự kiến.");
          return;
        }

        if (isSeatsInvalid) {
          alert(
            `Tour này chỉ còn ${availableSeats} chỗ. Không thể gửi yêu cầu ${expectedGuestCount} khách.`
          );
          return;
        }

        if (depositAmount <= 0) {
          alert("Vui lòng nhập số tiền cọc.");
          return;
        }

        if (depositAmount > total) {
          alert("Tiền cọc không được lớn hơn tổng tiền tour.");
          return;
        }
      }

      setSubmitting(true);

      const token =
        localStorage.getItem("access_token") ||
        sessionStorage.getItem("access_token");

      if (!token) {
        alert("Vui lòng đăng nhập trước khi đặt tour.");
        router.push("/login");
        return;
      }

      const adultCount =
        bookingType === "GROUP"
          ? Number(expectedGuestCount)
          : passengers.filter((passenger) => passenger.passengerType === "ADULT")
              .length;

      const childCount =
        bookingType === "GROUP"
          ? 0
          : passengers.filter((passenger) => passenger.passengerType === "CHILD")
              .length;

      const res = await fetch("/backend-api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tourId: Number(tour.id),
          departureId: Number(departure.id),
          paymentMethod,
          contactName: contactName.trim(),
          contactPhone: contactPhone.trim(),
          contactEmail: contactEmail.trim() || null,

          pickupPointId:
            bookingType === "INDIVIDUAL" &&
            pickupServiceType === "MEETING_POINT" &&
            pickupPointId
              ? Number(pickupPointId)
              : null,
          pickupServiceType:
            bookingType === "INDIVIDUAL" ? pickupServiceType : null,
          pickupFeeId:
            bookingType === "INDIVIDUAL" &&
            pickupServiceType === "DOOR_TO_DOOR" &&
            pickupFeeId
              ? Number(pickupFeeId)
              : null,
          pickupProvince:
            bookingType === "INDIVIDUAL" &&
            pickupServiceType === "DOOR_TO_DOOR"
              ? pickupProvince || null
              : null,
          pickupAddress:
            bookingType === "INDIVIDUAL" &&
            pickupServiceType === "DOOR_TO_DOOR"
              ? pickupAddress.trim() || null
              : null,

          promotionId: appliedPromotion?.promotionId
            ? Number(appliedPromotion.promotionId)
            : null,
          promotionCode: appliedPromotion?.promotionCode || null,
          discountAmount: discount,
          finalAmount: total,

          bookingType,
          organizationName:
            bookingType === "GROUP" ? organizationName.trim() : null,
          representativeName:
            bookingType === "GROUP" ? representativeName.trim() : null,
          representativePhone:
            bookingType === "GROUP" ? representativePhone.trim() : null,
          representativeEmail:
            bookingType === "GROUP" ? representativeEmail.trim() || null : null,
          expectedGuestCount:
            bookingType === "GROUP" ? Number(expectedGuestCount) : null,
          depositAmount:
            bookingType === "GROUP" ? Number(depositAmount) : null,
          paymentTerms:
            bookingType === "GROUP" ? paymentTerms.trim() || null : null,
          cancellationTerms:
            bookingType === "GROUP" ? cancellationTerms.trim() || null : null,

          adultCount,
          childCount,
          specialNotes: specialNotes.trim(),
          passengers:
            bookingType === "GROUP"
              ? [
                  {
                    passengerType: "ADULT",
                    fullName: representativeName.trim() || contactName.trim(),
                    isBookingContact: true,
                    phone: representativePhone.trim() || contactPhone.trim(),
                    email:
                      representativeEmail.trim() || contactEmail.trim() || null,
                  },
                ]
              : passengers.map((passenger, index) => ({
                  passengerType: passenger.passengerType,
                  fullName:
                    passenger.fullName.trim() ||
                    (index === 0
                      ? contactName.trim()
                      : `Hành khách ${index + 1}`),
                  isBookingContact: index === 0,
                  phone: isInternationalTour
                    ? index === 0
                      ? contactPhone.trim()
                      : undefined
                    : passenger.phone.trim() ||
                      (index === 0 ? contactPhone.trim() : undefined),
                  email: index === 0 ? contactEmail.trim() : undefined,
                  passportNumber: isInternationalTour
                    ? passenger.passportNumber.trim() || undefined
                    : undefined,
                })),
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        alert(json.message || "Đặt tour thất bại");
        return;
      }

      window.dispatchEvent(new Event("notifications-changed"));

      if (paymentMethod === "VNPAY") {
        const paymentId =
          json.data?.paymentId ||
          json.data?.payment?.id ||
          json.data?.payments?.[0]?.id;

        if (!paymentId) {
          alert("Đã tạo đơn đặt tour nhưng chưa lấy được mã thanh toán VNPay.");
          router.push("/my-bookings");
          return;
        }

        const paymentData = await createVnpayPayment(Number(paymentId));
        setVnpayQrUrl(paymentData.paymentUrl);
        return;
      }

      if (bookingType === "GROUP") {
        alert(
          "Đã gửi yêu cầu tour đoàn. ChillTrip sẽ kiểm tra hợp đồng và liên hệ xác nhận tiền cọc."
        );
        router.push("/my-bookings");
        return;
      }

      if (paymentMethod === "BANK_TRANSFER") {
        alert(
          "Đơn đặt tour đã được tạo. Vui lòng chuyển khoản để hoàn tất thanh toán."
        );
        router.push("/my-bookings");
        return;
      }

      if (paymentMethod === "PAY_LATER") {
        alert("Đã gửi yêu cầu đặt tour. ChillTrip sẽ liên hệ xác nhận.");
        router.push("/my-bookings");
        return;
      }

      router.push("/my-bookings");
    } catch (error) {
      console.error(error);
      alert("Có lỗi xảy ra");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f6fafb] text-[#181c1d]">
        <HomeHeader />
        <div className="mx-auto max-w-7xl px-4 py-40 text-center text-xl font-bold text-[#00606c]">
          Đang tải thông tin đặt tour...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6fafb] text-[#181c1d]">
      <HomeHeader />

      <div className="mx-auto max-w-7xl px-4 pb-20 pt-28 md:px-8">
        <section className="mb-10">
          <p className="mb-3 text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#9b4500]">
            Đặt tour
          </p>
          <h1 className="mb-4 text-4xl font-extrabold tracking-[-0.03em] text-[#00606c] md:text-5xl">
            Hoàn tất thông tin đặt vé
          </h1>
          <p className="max-w-3xl text-[16px] leading-8 text-[#3e494b]">
            Điền thông tin hành khách và liên hệ để giữ chỗ nhanh chóng.
            ChillTrip sẽ xác nhận đơn đặt của bạn ngay sau khi hoàn tất.
          </p>
        </section>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.35fr_0.8fr]">
          <div className="space-y-8">
            {isDepartureInvalid && (
              <div className="rounded-[28px] border border-[#ffdad6] bg-[#ffdad6]/25 p-6 text-sm font-semibold text-[#ba1a1a] shadow-sm animate-pulse">
                <div className="flex items-start gap-3">
                  <span className="text-xl">⚠️</span>
                  <div>
                    <h3 className="text-[16px] font-extrabold uppercase mb-1">Lịch khởi hành không khả dụng</h3>
                    <p className="leading-6">
                      {isDeparturePast
                        ? "Lịch khởi hành này đã quá ngày khởi hành thực tế (đã khởi hành). Vui lòng quay lại trang chi tiết tour để chọn lịch khởi hành khác."
                        : "Lịch khởi hành này đã hết chỗ trống. Vui lòng quay lại trang chi tiết tour để chọn lịch khởi hành khác hoặc liên hệ bộ phận hỗ trợ."
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}

            <FormCard
              title="Thông tin liên hệ"
              subtitle="Chúng tôi sẽ dùng thông tin này để gửi xác nhận booking và liên hệ khi cần."
            >
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <InputField
                  label="Họ và tên người liên hệ"
                  placeholder="Nguyễn Văn A"
                  value={contactName}
                  onChange={setContactName}
                />
                <InputField
                  label="Số điện thoại"
                  placeholder="0901 234 567"
                  value={contactPhone}
                  onChange={setContactPhone}
                />
                <InputField
                  label="Email"
                  placeholder="ban@email.com"
                  value={contactEmail}
                  onChange={setContactEmail}
                />
                <InputField
                  label="Tỉnh / Thành phố đang ở"
                  placeholder="TP. Hồ Chí Minh"
                  value={contactCity}
                  onChange={setContactCity}
                />
              </div>

              <div className="mt-5">
                <InputField
                  label="Yêu cầu thêm"
                  placeholder="Ví dụ: cần hỗ trợ ăn chay, ghế gần nhau..."
                  isTextarea
                  value={specialNotes}
                  onChange={setSpecialNotes}
                />
              </div>
            </FormCard>

            <FormCard
              title="Hình thức đặt tour"
              subtitle="Chọn đặt tour cá nhân hoặc tour đoàn cần tư vấn hợp đồng."
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <PaymentOption
                  title="Cá nhân / gia đình"
                  desc="Đặt tour lẻ, thanh toán theo tổng giá trị đơn."
                  active={bookingType === "INDIVIDUAL"}
                  onClick={() => {
                    setBookingType("INDIVIDUAL");
                    setExpectedGuestCount(guests);
                    setDepositAmount(0);
                  }}
                />

                <PaymentOption
                  title="Đoàn / công ty"
                  desc="Gửi yêu cầu tour đoàn, tạo hợp đồng và thanh toán cọc."
                  active={bookingType === "GROUP"}
                  onClick={() => {
                    setBookingType("GROUP");

                    const safeGuestCount =
                      availableSeats > 0
                        ? Math.min(guests, availableSeats)
                        : guests;

                    setExpectedGuestCount(safeGuestCount);

                    const nextSubtotal = pricePerGuest * safeGuestCount;
                    const nextTotal = Math.max(nextSubtotal - discount, 0);

                    if (depositAmount <= 0) {
                      setDepositAmount(Math.round(nextTotal * 0.3));
                    }
                  }}
                />
              </div>

              {bookingType === "GROUP" ? (
                <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
                  <InputField
                    label="Tên công ty / tổ chức"
                    placeholder="Ví dụ: Công ty ABC"
                    value={organizationName}
                    onChange={setOrganizationName}
                  />

                  <InputField
                    label="Người đại diện"
                    placeholder="Nguyễn Văn A"
                    value={representativeName}
                    onChange={setRepresentativeName}
                  />

                  <InputField
                    label="SĐT người đại diện"
                    placeholder="0901 234 567"
                    value={representativePhone}
                    onChange={setRepresentativePhone}
                  />

                  <InputField
                    label="Email người đại diện"
                    placeholder="company@email.com"
                    value={representativeEmail}
                    onChange={setRepresentativeEmail}
                  />

                  <InputField
                    label="Số khách dự kiến"
                    placeholder={`Tối đa ${availableSeats} khách`}
                    value={String(expectedGuestCount || "")}
                    onChange={(value) => {
                      const nextValue = Math.max(Number(value || 0), 0);
                      setExpectedGuestCount(nextValue);
                    }}
                    hasError={isSeatsInvalid}
                  />

                  {isSeatsInvalid && (
                    <div className="md:col-span-2 rounded-[18px] border border-[#ffdad6] bg-[#ffdad6]/20 p-4 text-sm font-semibold text-[#ba1a1a] animate-pulse">
                      * Số khách dự kiến vượt quá số chỗ còn lại (Chỉ còn {availableSeats} chỗ). Vui lòng giảm ít nhất {warningInfo.excess} khách.
                    </div>
                  )}

                  <InputField
                    label="Số tiền cọc"
                    placeholder="Ví dụ: 3000000"
                    value={String(depositAmount || "")}
                    onChange={(value) => setDepositAmount(Number(value || 0))}
                  />

                  <div className="rounded-[18px] border border-[#f3d6b8] bg-[#fff8ef] p-4 text-sm font-semibold text-[#9b4500] md:col-span-2">
                    Tour hiện chỉ còn {availableSeats} chỗ. Số khách đoàn không
                    được vượt quá số chỗ còn lại. Thông tin đưa đón của tour
                    đoàn sẽ được ghi nhận trong hợp đồng.
                  </div>

                  <div className="md:col-span-2">
                    <InputField
                      label="Điều khoản thanh toán"
                      placeholder="Ví dụ: Cọc 30%, phần còn lại thanh toán trước ngày khởi hành..."
                      isTextarea
                      value={paymentTerms}
                      onChange={setPaymentTerms}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <InputField
                      label="Điều khoản hoàn hủy / ghi chú hợp đồng"
                      placeholder="Nhập ghi chú hợp đồng, điểm đón đoàn hoặc điều khoản hoàn hủy..."
                      isTextarea
                      value={cancellationTerms}
                      onChange={setCancellationTerms}
                    />
                  </div>
                </div>
              ) : null}
            </FormCard>

            {bookingType === "INDIVIDUAL" ? (
              <FormCard
                title="Điểm đón khách"
                subtitle="Chọn hình thức tập trung hoặc đưa đón tận nơi theo tỉnh/thành."
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <PaymentOption
                    title="Tự đến điểm tập trung"
                    desc="Bạn tự di chuyển đến điểm hẹn của tour"
                    active={pickupServiceType === "MEETING_POINT"}
                    onClick={() => {
                      setPickupServiceType("MEETING_POINT");
                      setPickupFeeId("");
                      setPickupProvince("");
                      setPickupAddress("");
                      setPickupFeeAmount(0);
                    }}
                  />

                  <PaymentOption
                    title="Đưa đón tận nơi"
                    desc="ChillTrip hỗ trợ đón theo tỉnh/thành, có phụ phí"
                    active={pickupServiceType === "DOOR_TO_DOOR"}
                    onClick={() => {
                      setPickupServiceType("DOOR_TO_DOOR");
                      setPickupPointId("");
                    }}
                  />
                </div>

                {pickupServiceType === "DOOR_TO_DOOR" ? (
                  <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-bold uppercase tracking-[0.12em] text-[#3e494b]">
                        Tỉnh / Thành phố đón
                      </label>

                      <select
                        value={pickupFeeId}
                        onChange={(e) => {
                          const id = e.target.value;
                          const selected = pickupProvinceFees.find(
                            (item) => String(item.id) === String(id)
                          );

                          setPickupFeeId(id);
                          setPickupProvince(selected?.province || "");
                          setPickupFeeAmount(Number(selected?.fee_amount || 0));
                        }}
                        className="w-full rounded-[18px] border border-[#d6e0e3] bg-white px-4 py-3 text-[15px] outline-none transition-colors focus:border-[#00606c]"
                      >
                        <option value="">-- Chọn tỉnh/thành --</option>

                        {pickupProvinceFees.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.province} - {formatPrice(item.fee_amount)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <InputField
                      label="Địa chỉ đón tận nơi"
                      placeholder="Ví dụ: 123 Lê Lợi, TP. Huế"
                      value={pickupAddress}
                      onChange={setPickupAddress}
                    />

                    {pickupFeeAmount > 0 ? (
                      <div className="rounded-[18px] border border-[#f3d6b8] bg-[#fff8ef] p-4 text-sm font-semibold text-[#9b4500] md:col-span-2">
                        Phụ phí đưa đón tận nơi: {formatPrice(pickupFeeAmount)}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-6">
                    {loadingPickupPoints ? (
                      <p className="text-sm font-semibold text-[#3e494b]">
                        Đang tải danh sách điểm đón...
                      </p>
                    ) : pickupPoints.length > 0 ? (
                      <div>
                        <label className="mb-2 block text-sm font-bold uppercase tracking-[0.12em] text-[#3e494b]">
                          Chọn điểm đón / điểm tập trung
                        </label>

                        <select
                          value={pickupPointId}
                          onChange={(e) => setPickupPointId(e.target.value)}
                          className="w-full rounded-[18px] border border-[#d6e0e3] bg-white px-4 py-3 text-[15px] outline-none transition-colors focus:border-[#00606c]"
                        >
                          <option value="">
                            -- Chọn điểm đón / điểm tập trung --
                          </option>

                          {pickupPoints.map((point) => (
                            <option key={point.id} value={point.id}>
                              {point.point_name}
                              {point.province ? ` - ${point.province}` : ""}
                              {point.pickup_time
                                ? ` - ${formatDateTime(point.pickup_time)}`
                                : ""}
                            </option>
                          ))}
                        </select>

                        {pickupPointId ? (
                          <div className="mt-4 rounded-[18px] border border-[#dfe3e4] bg-[#f9fbfb] p-4 text-sm leading-6 text-[#3e494b]">
                            {(() => {
                              const selected = pickupPoints.find(
                                (point) =>
                                  String(point.id) === String(pickupPointId)
                              );

                              if (!selected) return null;

                              return (
                                <>
                                  <p>
                                    <b>Địa chỉ:</b> {selected.address}
                                  </p>
                                  {selected.notes ? (
                                    <p>
                                      <b>Ghi chú:</b> {selected.notes}
                                    </p>
                                  ) : null}
                                </>
                              );
                            })()}
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="rounded-[18px] border border-[#dfe3e4] bg-[#f9fbfb] p-4 text-sm leading-6 text-[#3e494b]">
                        Tour này chưa cấu hình điểm đón. ChillTrip sẽ liên hệ
                        xác nhận điểm tập trung sau khi bạn đặt tour.
                      </div>
                    )}
                  </div>
                )}
              </FormCard>
            ) : null}

            {bookingType === "INDIVIDUAL" ? (
              <div className={isSeatsInvalid ? "rounded-[22px] ring-2 ring-[#ba1a1a]/40 bg-[#ffdad6]/5 p-1" : ""}>
                <FormCard
                  title="Thông tin hành khách"
                  subtitle="Vui lòng nhập đúng thông tin để thuận tiện cho việc xác nhận và làm dịch vụ."
                >
                  {isSeatsInvalid && (
                    <div className="mb-4 rounded-[18px] border border-[#ffdad6] bg-[#ffdad6]/30 p-4 text-sm font-semibold text-[#ba1a1a] animate-pulse">
                      * Số khách đặt ({guests} người) vượt quá số chỗ trống còn lại của chuyến đi này (Chỉ còn {availableSeats} chỗ trống). Vui lòng quay lại chọn số khách nhỏ hơn.
                    </div>
                  )}
                  <div className="space-y-6">
                    {passengers.map((passenger, index) => (
                      <PassengerBlock
                        key={index}
                        index={index + 1}
                        value={passenger.fullName}
                        phone={passenger.phone}
                        passportNumber={passenger.passportNumber}
                        passengerType={passenger.passengerType}
                        isInternationalTour={isInternationalTour}
                        onNameChange={(value) => {
                          setPassengers((prev) =>
                            prev.map((item, i) =>
                              i === index ? { ...item, fullName: value } : item
                            )
                          );
                        }}
                        onPhoneChange={(value) => {
                          setPassengers((prev) =>
                            prev.map((item, i) =>
                              i === index ? { ...item, phone: value } : item
                            )
                          );
                        }}
                        onPassportChange={(value) => {
                          setPassengers((prev) =>
                            prev.map((item, i) =>
                              i === index
                                ? { ...item, passportNumber: value }
                                : item
                            )
                          );
                        }}
                      />
                    ))}
                  </div>
                </FormCard>
              </div>
            ) : null}

            <FormCard
              title="Phương thức thanh toán"
              subtitle="Chọn hình thức thanh toán phù hợp với bạn."
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <PaymentOption
                  title="Chuyển khoản"
                  desc="Thanh toán qua ngân hàng"
                  active={paymentMethod === "BANK_TRANSFER"}
                  onClick={() => setPaymentMethod("BANK_TRANSFER")}
                />

                <PaymentOption
                  title="VNPay QR"
                  desc="Quét mã QR / ngân hàng / ví điện tử"
                  active={paymentMethod === "VNPAY"}
                  onClick={() => setPaymentMethod("VNPAY")}
                />

                <PaymentOption
                  title="Thanh toán sau"
                  desc="Giữ chỗ, xác nhận sau"
                  active={paymentMethod === "PAY_LATER"}
                  onClick={() => setPaymentMethod("PAY_LATER")}
                />
              </div>
            </FormCard>

            <FormCard
              title="Điều khoản xác nhận"
              subtitle="Vui lòng đọc kỹ trước khi hoàn tất đặt tour."
            >
              <div className="space-y-4">
                <CheckRow
                  label="Tôi xác nhận thông tin đã nhập là chính xác."
                  checked
                />
                <CheckRow
                  label="Tôi đồng ý với điều khoản sử dụng và chính sách hoàn hủy của ChillTrip."
                  checked
                />
                <CheckRow label="Tôi muốn nhận thông tin ưu đãi và tin tức mới qua email." />
              </div>
            </FormCard>
          </div>

          <aside>
            <div className="sticky top-28 space-y-6">
              <div className="overflow-hidden rounded-[28px] border border-[#dfe3e4] bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
                <div className="relative h-56 overflow-hidden">
                  <img
                    src={bookingSummary.image}
                    alt={bookingSummary.title}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute bottom-4 left-4 rounded-full bg-white/85 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#00606c] backdrop-blur-md">
                    {bookingSummary.duration}
                  </div>
                </div>

                <div className="p-6">
                  <h2 className="mb-4 text-xl font-extrabold leading-tight text-[#181c1d]">
                    {bookingSummary.title}
                  </h2>

                  <div className="space-y-3 text-sm text-[#3e494b]">
                    <InfoLine
                      icon={<CalendarIcon className="h-4 w-4" />}
                      label="Ngày khởi hành"
                      value={bookingSummary.departure}
                    />
                    <InfoLine
                      icon={<UsersIcon className="h-4 w-4" />}
                      label="Số khách"
                      value={`${bookingSummary.guests} khách`}
                    />
                    <InfoLine
                      icon={<UsersIcon className="h-4 w-4" />}
                      label="Chỗ còn lại"
                      value={`${availableSeats} chỗ`}
                    />
                    <InfoLine
                      icon={<TicketIcon className="h-4 w-4" />}
                      label="Giá / khách"
                      value={bookingSummary.pricePerGuest}
                    />
                  </div>

                  <div className="my-6 h-px bg-[#ebeeef]" />

                  <div className="rounded-[20px] border border-[#f3d6b8] bg-[#fff8ef] p-4">
                    <p className="mb-3 text-sm font-extrabold text-[#9b4500]">
                      Mã khuyến mãi
                    </p>

                    <div className="flex gap-2">
                      <input
                        value={promotionCode}
                        onChange={(e) => {
                          setPromotionCode(e.target.value.toUpperCase());
                          setPromotionMessage("");
                          setAppliedPromotion(null);
                        }}
                        placeholder="Nhập mã ưu đãi"
                        className="min-w-0 flex-1 rounded-full border border-[#f3d6b8] bg-white px-4 py-2 text-sm font-semibold uppercase outline-none focus:border-[#9b4500]"
                      />

                      <button
                        type="button"
                        onClick={handleApplyPromotion}
                        disabled={applyingPromotion}
                        className="rounded-full bg-[#9b4500] px-4 py-2 text-xs font-extrabold text-white transition hover:bg-[#7a3500] disabled:opacity-60"
                      >
                        {applyingPromotion ? "..." : "Áp dụng"}
                      </button>
                    </div>

                    {promotionMessage ? (
                      <p
                        className={`mt-2 text-xs font-semibold ${
                          appliedPromotion ? "text-green-600" : "text-red-500"
                        }`}
                      >
                        {promotionMessage}
                      </p>
                    ) : null}

                    {appliedPromotion ? (
                      <p className="mt-2 text-xs leading-5 text-[#3e494b]">
                        {appliedPromotion.promotionName} - giảm{" "}
                        <b>{formatPrice(appliedPromotion.discountAmount)}</b>
                      </p>
                    ) : null}
                  </div>

                  <div className="my-6 h-px bg-[#ebeeef]" />

                  <div className="space-y-3 text-sm">
                    <PriceLine
                      label={`Tạm tính (${bookingSummary.guests} khách)`}
                      value={bookingSummary.subtotal}
                    />
                    <PriceLine
                      label="Ưu đãi"
                      value={bookingSummary.discount}
                      valueClassName="text-[#9b4500]"
                    />
                    {bookingType === "INDIVIDUAL" ? (
                      <PriceLine
                        label="Đưa đón tận nơi"
                        value={
                          pickupFeeAmount > 0
                            ? `+${formatPrice(pickupFeeAmount)}`
                            : "0đ"
                        }
                        valueClassName="text-[#9b4500]"
                      />
                    ) : null}
                    {bookingType === "GROUP" ? (
                      <PriceLine
                        label="Tiền cọc cần thanh toán"
                        value={formatPrice(depositDisplayAmount)}
                        valueClassName="text-[#9b4500]"
                      />
                    ) : null}
                  </div>

                  <div className="my-6 h-px bg-[#ebeeef]" />

                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-[#181c1d]">
                      Tổng cộng
                    </span>
                    <span className="text-3xl font-extrabold text-[#00606c]">
                      {bookingSummary.total}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleCreateBooking}
                    disabled={submitting || isSeatsInvalid || isDepartureInvalid}
                    className={`mt-6 w-full rounded-full py-4 text-[15px] font-extrabold text-white transition-all active:scale-95 ${
                      submitting || isSeatsInvalid || isDepartureInvalid
                        ? "cursor-not-allowed bg-gray-400"
                        : "bg-[linear-gradient(135deg,#9b4500_0%,#fc8a40_100%)] shadow-[0_16px_35px_rgba(155,69,0,0.25)] hover:scale-[1.01]"
                    }`}
                  >
                    {submitting
                      ? bookingType === "GROUP"
                        ? "ĐANG GỬI YÊU CẦU..."
                        : "ĐANG ĐẶT TOUR..."
                      : isDeparturePast
                        ? "ĐÃ QUÁ NGÀY KHỞI HÀNH"
                        : isDepartureSeatsOut
                          ? "ĐÃ HẾT CHỖ TRỐNG"
                          : isSeatsInvalid
                            ? `Chỉ còn ${availableSeats} chỗ trống`
                            : bookingType === "GROUP"
                              ? "GỬI YÊU CẦU TOUR ĐOÀN"
                              : "XÁC NHẬN ĐẶT TOUR"}
                  </button>

                  <a
                    href={tour ? `/tours/${tour.id}` : "/tours"}
                    className="mt-3 block w-full rounded-full border border-[#cfd8da] py-3 text-center font-bold text-[#3e494b] transition-colors hover:bg-[#f1f4f5]"
                  >
                    Quay lại chi tiết tour
                  </a>
                </div>
              </div>

              <div className="rounded-[22px] border border-[#00606c]/10 bg-[#00606c]/5 p-5">
                <div className="flex items-start gap-3">
                  <ShieldIcon className="mt-0.5 h-5 w-5 text-[#00606c]" />
                  <div>
                    <p className="font-bold text-[#00606c]">Đặt chỗ an toàn</p>
                    <p className="mt-1 text-sm leading-6 text-[#3e494b]">
                      Thông tin của bạn được bảo mật. ChillTrip hỗ trợ xác nhận
                      nhanh và hoàn hủy theo chính sách áp dụng.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[22px] border border-[#dfe3e4] bg-white p-5 shadow-sm">
                <p className="mb-2 font-bold text-[#181c1d]">Cần hỗ trợ ngay?</p>
                <p className="text-sm leading-6 text-[#3e494b]">
                  Đội ngũ tư vấn viên của ChillTrip luôn sẵn sàng hỗ trợ bạn
                  24/7.
                </p>
                <button className="mt-4 rounded-full bg-[#00606c] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#007b8a]">
                  Liên hệ tư vấn
                </button>
              </div>
            </div>
          </aside>
        </div>

        <SeatWarningModal
          isOpen={showWarningModal}
          onClose={closeWarning}
          selectedCount={warningInfo.selected}
          availableSeats={warningInfo.available}
          excessCount={warningInfo.excess}
        />
      </div>

      {vnpayQrUrl ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-[28px] bg-white p-6 text-center shadow-xl">
            <h2 className="text-2xl font-extrabold text-[#00606c]">
              Quét mã QR để thanh toán
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#3e494b]">
              Dùng ứng dụng ngân hàng hoặc ví điện tử để quét mã VNPay.
            </p>

            <div className="my-6 flex justify-center rounded-[24px] bg-[#f6fafb] p-5">
              <QRCodeCanvas value={vnpayQrUrl} size={240} />
            </div>

            <button
              type="button"
              onClick={() => {
                window.location.href = vnpayQrUrl;
              }}
              className="w-full rounded-full bg-[#00606c] px-5 py-3 font-extrabold text-white"
            >
              Mở trang VNPay
            </button>

            <button
              type="button"
              onClick={() => setVnpayQrUrl("")}
              className="mt-3 w-full rounded-full border border-[#cfd8da] px-5 py-3 font-bold text-[#3e494b]"
            >
              Đóng
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function FormCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-[#dfe3e4] bg-white p-6 shadow-[0_14px_35px_rgba(15,23,42,0.05)] md:p-8">
      <h2 className="text-2xl font-extrabold tracking-[-0.02em] text-[#00606c]">
        {title}
      </h2>
      <p className="mt-2 text-[15px] leading-7 text-[#3e494b]">{subtitle}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function PassengerBlock({
  index,
  value,
  phone,
  passportNumber,
  passengerType,
  isInternationalTour,
  onNameChange,
  onPhoneChange,
  onPassportChange,
}: {
  index: number;
  value: string;
  phone: string;
  passportNumber: string;
  passengerType: "ADULT" | "CHILD";
  isInternationalTour: boolean;
  onNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onPassportChange: (value: string) => void;
}) {
  return (
    <div className="rounded-[22px] border border-[#ebeeef] bg-[#f9fbfb] p-5">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-lg font-extrabold text-[#181c1d]">
          Hành khách {index}
        </h3>
        <span className="rounded-full bg-[#9defff]/40 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#004f59]">
          {passengerType === "ADULT" ? "Người lớn" : "Trẻ em"}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <InputField
          label="Họ và tên"
          placeholder="Nhập họ tên đầy đủ"
          value={value}
          onChange={onNameChange}
        />

        <InputField label="Ngày sinh" placeholder="dd/mm/yyyy" />

        <InputField label="Giới tính" placeholder="Nam / Nữ" />

        {isInternationalTour ? (
          <InputField
            label="Số Passport"
            placeholder="Nhập số hộ chiếu"
            value={passportNumber}
            onChange={onPassportChange}
          />
        ) : (
          <InputField
            label="Số điện thoại"
            placeholder="0901 234 567"
            value={phone}
            onChange={onPhoneChange}
          />
        )}
      </div>
    </div>
  );
}

function InputField({
  label,
  placeholder,
  isTextarea = false,
  value,
  onChange,
  hasError = false,
}: {
  label: string;
  placeholder: string;
  isTextarea?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  hasError?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold uppercase tracking-[0.12em] text-[#3e494b]">
        {label}
      </label>

      {isTextarea ? (
        <textarea
          placeholder={placeholder}
          rows={4}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          className={`w-full rounded-[18px] border bg-white px-4 py-3 text-[15px] outline-none transition-colors placeholder:text-[#9aa6a9] ${
            hasError ? "border-[#ba1a1a] ring-2 ring-[#ba1a1a]/20" : "border-[#d6e0e3] focus:border-[#00606c]"
          }`}
        />
      ) : (
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          className={`w-full rounded-[18px] border bg-white px-4 py-3 text-[15px] outline-none transition-colors placeholder:text-[#9aa6a9] ${
            hasError ? "border-[#ba1a1a] ring-2 ring-[#ba1a1a]/20" : "border-[#d6e0e3] focus:border-[#00606c]"
          }`}
        />
      )}
    </div>
  );
}

function PaymentOption({
  title,
  desc,
  active = false,
  onClick,
}: {
  title: string;
  desc: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[20px] border p-5 text-left transition-all ${
        active
          ? "border-[#00606c] bg-[#00606c]/5 shadow-sm"
          : "border-[#dfe3e4] bg-white hover:border-[#b8d7dc]"
      }`}
    >
      <p className="font-extrabold text-[#181c1d]">{title}</p>
      <p className="mt-1 text-sm leading-6 text-[#3e494b]">{desc}</p>
    </button>
  );
}

function CheckRow({
  label,
  checked = false,
}: {
  label: string;
  checked?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        defaultChecked={checked}
        className="mt-1 h-5 w-5 rounded border-[#bdc8cb] text-[#00606c] focus:ring-[#00606c]"
      />
      <span className="text-[15px] leading-7 text-[#3e494b]">{label}</span>
    </label>
  );
}

function InfoLine({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-[#3e494b]">
        {icon}
        <span>{label}</span>
      </div>
      <span className="font-semibold text-[#181c1d]">{value}</span>
    </div>
  );
}

function PriceLine({
  label,
  value,
  valueClassName = "text-[#181c1d]",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[#3e494b]">{label}</span>
      <span className={`font-bold ${valueClassName}`}>{value}</span>
    </div>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className ?? "h-5 w-5"}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 2v3M16 2v3M3 9h18M5 5h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
      />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className ?? "h-5 w-5"}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9.5 11A3.5 3.5 0 1 0 9.5 4a3.5 3.5 0 0 0 0 7ZM20 8v6M17 11h6"
      />
    </svg>
  );
}

function TicketIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className ?? "h-5 w-5"}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 8.5A2.5 2.5 0 0 1 6.5 6h11A2.5 2.5 0 0 1 20 8.5V10a2 2 0 0 0 0 4v1.5A2.5 2.5 0 0 1 17.5 18h-11A2.5 2.5 0 0 1 4 15.5V14a2 2 0 0 0 0-4V8.5Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6v12" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className ?? "h-5 w-5"}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m12 3 7 3v6c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6l7-3Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m9.5 12 1.7 1.7 3.3-3.4"
      />
    </svg>
  );
}