"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Info,
  Landmark,
  Mail,
  Map,
  Minus,
  Phone,
  Plus,
  Search,
  Tag,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";

const API_BASE_URL = "/backend-api";

type CustomerMode = "EXISTING" | "NEW";

type BookingForm = {
  customer_id: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  tour_id: string;
  departure_id: string;
  pickup_point_id: string;
  promotion_id: string;
  adult_count: number;
  child_count: number;
  payment_method: "CASH" | "BANK_TRANSFER" | "CREDIT_CARD";
  special_notes: string;
};

type CustomerOption = {
  id: string | number;
  full_name: string;
  email?: string | null;
  phone?: string | null;
};

type TourOption = {
  id: string | number;
  tour_code: string;
  tour_name: string;
  duration_days: number;
  duration_nights: number;
  base_price: number;
  child_price: number;
  featured_image_url?: string | null;
};

type DepartureOption = {
  id: string | number;
  departure_code?: string | null;
  departureCode?: string | null;
  start_date?: string | null;
  startDate?: string | null;
  end_date?: string | null;
  endDate?: string | null;
  available_seats?: number | null;
  availableSeats?: number | null;
  booked_seats?: number | null;
  bookedSeats?: number | null;
  max_seats?: number | null;
  maxSeats?: number | null;
  booking_status?: string | null;
  bookingStatus?: string | null;
};

type PickupPointOption = {
  id: string | number;
  point_name?: string | null;
  pointName?: string | null;
  address?: string | null;
};

type PromotionOption = {
  id: string | number;
  promotion_code: string;
  promotion_name: string;
  promotion_type: "PERCENT" | "FIXED" | string;
  discount_value: number;
  min_order_amount: number;
  max_discount_amount?: number | null;
};

const fallbackImage =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuA-jFI5-8HWjZeFPSHlP7RuGFr6_kTnC5Fz5c9px5LNqEfBOJwsRSD4v6Ml8h4VeZOu2pM5l8bOdyQGeY_sTjBG528emjR2GS49EoLSby7koUbVx2cwhDTVjXkb2woOsz6ukrKpxTQ4RVUp5FEnp_Qo6s4VXOKTWPjHJyrgbc7rEMVPmMtg9eRD-bDTst5OgPCd7Iqa4SIZ2i4af4P0DumJVFI8w13DMfBkB2aAdvbKjraWIFUb286PQ9CcBtG7Lo4kR6RPpPtHhVmf";

function formatMoney(value: number) {
  return `${Number(value || 0).toLocaleString("vi-VN")} đ`;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("vi-VN");
}

function getDepartureCode(departure: DepartureOption) {
  return (
    departure.departure_code ||
    departure.departureCode ||
    `Đợt #${departure.id}`
  );
}

function getDepartureStartDate(departure: DepartureOption) {
  return departure.start_date || departure.startDate || "";
}

function getDepartureEndDate(departure: DepartureOption) {
  return departure.end_date || departure.endDate || "";
}

function getDepartureAvailableSeats(departure: DepartureOption) {
  const maxSeats = Number(departure.max_seats ?? departure.maxSeats ?? 0);
  const bookedSeats = Number(
    departure.booked_seats ?? departure.bookedSeats ?? 0
  );

  return (
    departure.available_seats ??
    departure.availableSeats ??
    Math.max(maxSeats - bookedSeats, 0)
  );
}

function getPickupPointName(point: PickupPointOption) {
  return point.point_name || point.pointName || `Điểm đón #${point.id}`;
}

function getAuthHeaders() {
  if (typeof window === "undefined") {
    return {
      "Content-Type": "application/json",
    };
  }

  const token =
    localStorage.getItem("access_token") ||
    sessionStorage.getItem("access_token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("adminToken") ||
    "";

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function AdminBookingCreate() {
  const router = useRouter();

  const [customerMode, setCustomerMode] = useState<CustomerMode>("EXISTING");

  const [form, setForm] = useState<BookingForm>({
    customer_id: "",
    contact_name: "",
    contact_phone: "",
    contact_email: "",
    tour_id: "",
    departure_id: "",
    pickup_point_id: "",
    promotion_id: "",
    adult_count: 1,
    child_count: 0,
    payment_method: "BANK_TRANSFER",
    special_notes: "",
  });

  const [customerKeyword, setCustomerKeyword] = useState("");
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [tours, setTours] = useState<TourOption[]>([]);
  const [departures, setDepartures] = useState<DepartureOption[]>([]);
  const [pickupPoints, setPickupPoints] = useState<PickupPointOption[]>([]);
  const [promotions, setPromotions] = useState<PromotionOption[]>([]);
  const [loadingTours, setLoadingTours] = useState(false);
  const [loadingDepartures, setLoadingDepartures] = useState(false);
  const [loadingPickupPoints, setLoadingPickupPoints] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const selectedTour = useMemo(
    () => tours.find((item) => String(item.id) === String(form.tour_id)),
    [tours, form.tour_id]
  );

  const selectedPromotion = useMemo(
    () =>
      promotions.find((item) => String(item.id) === String(form.promotion_id)),
    [promotions, form.promotion_id]
  );

  const totalOriginalAmount = useMemo(() => {
    if (!selectedTour) return 0;

    return (
      form.adult_count * Number(selectedTour.base_price || 0) +
      form.child_count * Number(selectedTour.child_price || 0)
    );
  }, [form.adult_count, form.child_count, selectedTour]);

  const discountAmount = useMemo(() => {
    if (!selectedPromotion) return 0;

    if (totalOriginalAmount < Number(selectedPromotion.min_order_amount || 0)) {
      return 0;
    }

    let discount = 0;

    if (selectedPromotion.promotion_type === "PERCENT") {
      discount =
        (totalOriginalAmount * Number(selectedPromotion.discount_value || 0)) /
        100;
    } else {
      discount = Number(selectedPromotion.discount_value || 0);
    }

    if (selectedPromotion.max_discount_amount) {
      discount = Math.min(
        discount,
        Number(selectedPromotion.max_discount_amount)
      );
    }

    return Math.min(Math.round(discount), totalOriginalAmount);
  }, [selectedPromotion, totalOriginalAmount]);

  const totalPayableAmount = Math.max(totalOriginalAmount - discountAmount, 0);

  function updateForm<K extends keyof BookingForm>(
    key: K,
    value: BookingForm[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function changeCount(
    key: "adult_count" | "child_count",
    type: "minus" | "plus"
  ) {
    setForm((prev) => {
      const currentValue = Number(prev[key] || 0);
      const nextValue =
        type === "plus" ? currentValue + 1 : Math.max(0, currentValue - 1);

      return {
        ...prev,
        [key]: nextValue,
      };
    });
  }

  async function loadTours() {
    try {
      setLoadingTours(true);

      const res = await fetch(`${API_BASE_URL}/admin/tours?status=PUBLISHED`, {
        headers: getAuthHeaders(),
        cache: "no-store",
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || json?.success === false) {
        setTours([]);
        return;
      }

      const list = Array.isArray(json?.data) ? json.data : [];
      setTours(list);

      if (list.length) {
        setForm((prev) => ({
          ...prev,
          tour_id: prev.tour_id || String(list[0].id),
        }));
      }
    } catch (error) {
      console.error("LOAD_TOURS_ERROR:", error);
      setTours([]);
    } finally {
      setLoadingTours(false);
    }
  }

  async function loadCustomers(keyword: string) {
    try {
      const params = new URLSearchParams();

      if (keyword.trim()) {
        params.set("keyword", keyword.trim());
      }

      const res = await fetch(
        `${API_BASE_URL}/admin/customers?${params.toString()}`,
        {
          headers: getAuthHeaders(),
          cache: "no-store",
        }
      );

      const json = await res.json().catch(() => null);

      if (!res.ok || json?.success === false) {
        setCustomers([]);
        return;
      }

      setCustomers(Array.isArray(json?.data) ? json.data : []);
    } catch (error) {
      console.error("LOAD_CUSTOMERS_ERROR:", error);
      setCustomers([]);
    }
  }

  async function loadDepartures(tourId: string) {
    if (!tourId) {
      setDepartures([]);
      setForm((prev) => ({ ...prev, departure_id: "" }));
      return;
    }

    try {
      setLoadingDepartures(true);

      const res = await fetch(
        `${API_BASE_URL}/admin/bookings/departures?tourId=${tourId}`,
        {
          headers: getAuthHeaders(),
          cache: "no-store",
        }
      );

      const json = await res.json().catch(() => null);

      if (!res.ok || json?.success === false) {
        console.error("LOAD_DEPARTURES_RESPONSE_ERROR:", {
          status: res.status,
          statusText: res.statusText,
          body: json,
        });

        setDepartures([]);
        setForm((prev) => ({ ...prev, departure_id: "" }));
        return;
      }

      const list = Array.isArray(json?.data) ? json.data : [];
      setDepartures(list);

      setForm((prev) => ({
        ...prev,
        departure_id: list.length ? String(list[0].id) : "",
      }));
    } catch (error) {
      console.error("LOAD_DEPARTURES_ERROR:", error);
      setDepartures([]);
      setForm((prev) => ({ ...prev, departure_id: "" }));
    } finally {
      setLoadingDepartures(false);
    }
  }

  async function loadPickupPoints(departureId: string) {
    if (!departureId) {
      setPickupPoints([]);
      setForm((prev) => ({ ...prev, pickup_point_id: "" }));
      return;
    }

    try {
      setLoadingPickupPoints(true);

      const urls = [
        `${API_BASE_URL}/admin/pickup-points?departureId=${departureId}`,
        `${API_BASE_URL}/admin/pickup-points?departure_id=${departureId}`,
        `${API_BASE_URL}/admin/bookings/pickup-points?departureId=${departureId}`,
      ];

      let list: PickupPointOption[] = [];

      for (const url of urls) {
        const res = await fetch(url, {
          headers: getAuthHeaders(),
          cache: "no-store",
        });

        if (!res.ok) continue;

        const json = await res.json().catch(() => null);
        const data = Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json)
          ? json
          : [];

        if (data.length > 0) {
          list = data;
          break;
        }
      }

      setPickupPoints(list);

      setForm((prev) => ({
        ...prev,
        pickup_point_id: list.length ? String(list[0].id) : "",
      }));
    } catch (error) {
      console.error("LOAD_PICKUP_POINTS_ERROR:", error);
      setPickupPoints([]);
      setForm((prev) => ({ ...prev, pickup_point_id: "" }));
    } finally {
      setLoadingPickupPoints(false);
    }
  }

  async function loadPromotions(tourId: string) {
    if (!tourId) {
      setPromotions([]);
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE_URL}/admin/promotions?tourId=${tourId}&status=ACTIVE`,
        {
          headers: getAuthHeaders(),
          cache: "no-store",
        }
      );

      const json = await res.json().catch(() => null);

      if (!res.ok || json?.success === false) {
        setPromotions([]);
        return;
      }

      setPromotions(Array.isArray(json?.data) ? json.data : []);
    } catch (error) {
      console.error("LOAD_PROMOTIONS_ERROR:", error);
      setPromotions([]);
    }
  }

  function selectCustomer(customer: CustomerOption) {
    setForm((prev) => ({
      ...prev,
      customer_id: String(customer.id),
      contact_name: customer.full_name || prev.contact_name,
      contact_phone: customer.phone || prev.contact_phone,
      contact_email: customer.email || prev.contact_email,
    }));

    setCustomerKeyword(customer.full_name || "");
  }

  function switchCustomerMode(mode: CustomerMode) {
    setCustomerMode(mode);

    if (mode === "NEW") {
      setCustomerKeyword("");
      setCustomers([]);
      setForm((prev) => ({
        ...prev,
        customer_id: "",
        contact_name: "",
        contact_phone: "",
        contact_email: "",
      }));
    }
  }

  async function handleSubmit() {
    if (customerMode === "EXISTING" && !form.customer_id) {
      alert("Vui lòng chọn khách hàng cũ hoặc chuyển sang tạo khách hàng mới.");
      return;
    }

    if (customerMode === "NEW" && !form.contact_name.trim()) {
      alert("Vui lòng nhập tên khách hàng mới.");
      return;
    }

    if (customerMode === "NEW" && !form.contact_phone.trim()) {
      alert("Vui lòng nhập số điện thoại khách hàng mới.");
      return;
    }

    if (!form.tour_id) {
      alert("Vui lòng chọn tour.");
      return;
    }

    if (!form.departure_id) {
      alert("Vui lòng chọn đợt khởi hành.");
      return;
    }

    if (!form.contact_name.trim()) {
      alert("Vui lòng nhập họ tên liên hệ.");
      return;
    }

    if (!form.contact_phone.trim()) {
      alert("Vui lòng nhập số điện thoại liên hệ.");
      return;
    }

    if (form.adult_count + form.child_count <= 0) {
      alert("Số lượng người lớn và trẻ em phải lớn hơn 0.");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        customer_id:
          customerMode === "EXISTING" ? Number(form.customer_id) : null,
        create_new_customer: customerMode === "NEW",
        new_customer:
          customerMode === "NEW"
            ? {
                full_name: form.contact_name.trim(),
                phone: form.contact_phone.trim(),
                email: form.contact_email.trim() || null,
              }
            : null,
        tour_id: Number(form.tour_id),
        departure_id: Number(form.departure_id),
        pickup_point_id: form.pickup_point_id
          ? Number(form.pickup_point_id)
          : null,
        promotion_id: form.promotion_id ? Number(form.promotion_id) : null,
        contact_name: form.contact_name.trim(),
        contact_phone: form.contact_phone.trim(),
        contact_email: form.contact_email.trim() || null,
        adult_count: form.adult_count,
        child_count: form.child_count,
        total_original_amount: totalOriginalAmount,
        discount_amount: discountAmount,
        total_payable_amount: totalPayableAmount,
        special_notes: form.special_notes.trim() || null,
        payment_method: form.payment_method,
      };

      const res = await fetch(`${API_BASE_URL}/admin/bookings`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || json?.success === false) {
        alert(json?.message || "Tạo đặt chỗ thất bại.");
        return;
      }

      alert("Tạo đặt chỗ thành công.");
      router.push("/admin/booking");
    } catch (error) {
      console.error("CREATE_BOOKING_ERROR:", error);
      alert("Không thể tạo đặt chỗ.");
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    loadTours();
  }, []);

  useEffect(() => {
    if (customerMode !== "EXISTING") return;

    const timer = setTimeout(() => {
      loadCustomers(customerKeyword);
    }, 300);

    return () => clearTimeout(timer);
  }, [customerKeyword, customerMode]);

  useEffect(() => {
    if (!form.tour_id) return;

    setDepartures([]);
    setPickupPoints([]);
    setPromotions([]);

    setForm((prev) => ({
      ...prev,
      departure_id: "",
      pickup_point_id: "",
      promotion_id: "",
    }));

    loadDepartures(form.tour_id);
    loadPromotions(form.tour_id);
  }, [form.tour_id]);

  useEffect(() => {
    loadPickupPoints(form.departure_id);
  }, [form.departure_id]);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-start">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight text-[#00606c]">
            Tạo Đặt Chỗ Mới
          </h2>
          <p className="mt-2 text-lg text-[#3e494b]">
            Tạo booking đúng theo dữ liệu khách hàng, tour, đợt khởi hành và
            khuyến mãi trong hệ thống.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push("/admin/booking")}
          className="group flex w-fit items-center gap-2 rounded-full bg-[#f1f4f5] px-5 py-3 font-bold text-[#3e494b] transition hover:bg-[#dfe3e4] hover:text-[#00606c]"
        >
          <ArrowLeft
            size={18}
            className="transition group-hover:-translate-x-1"
          />
          Quay lại
        </button>
      </div>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        <div className="space-y-8 lg:col-span-8">
          <section className="rounded-[3rem] bg-white p-8 shadow-sm">
            <SectionTitle
              icon={<UserPlus size={24} />}
              title="Thông tin Khách hàng"
              color="bg-[#9defff]"
              iconColor="text-[#00606c]"
            />

            <div className="mb-6 flex w-fit rounded-full bg-[#f1f4f5] p-1.5">
              <button
                type="button"
                onClick={() => switchCustomerMode("EXISTING")}
                className={`rounded-full px-5 py-2 text-sm font-bold transition ${
                  customerMode === "EXISTING"
                    ? "bg-[#00606c] text-white"
                    : "text-[#3e494b] hover:bg-white"
                }`}
              >
                Khách hàng cũ
              </button>

              <button
                type="button"
                onClick={() => switchCustomerMode("NEW")}
                className={`rounded-full px-5 py-2 text-sm font-bold transition ${
                  customerMode === "NEW"
                    ? "bg-[#00606c] text-white"
                    : "text-[#3e494b] hover:bg-white"
                }`}
              >
                Khách hàng mới
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {customerMode === "EXISTING" && (
                <div className="md:col-span-2">
                  <Label>Tìm kiếm khách hàng</Label>

                  <div className="relative">
                    <Search
                      size={20}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3e494b]"
                    />

                    <input
                      value={customerKeyword}
                      onChange={(e) => setCustomerKeyword(e.target.value)}
                      className="w-full rounded-[2rem] border-none bg-[#f1f4f5] py-4 pl-12 pr-4 text-[#181c1d] outline-none transition focus:bg-white focus:ring-2 focus:ring-[#00606c]"
                      placeholder="Nhập tên, số điện thoại hoặc email khách hàng..."
                      type="text"
                    />
                  </div>

                  {customers.length > 0 && (
                    <div className="mt-3 max-h-56 overflow-y-auto rounded-[2rem] border border-[#bdc8cb]/30 bg-white p-2 shadow-sm">
                      {customers.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => selectCustomer(customer)}
                          className={`block w-full rounded-[1.5rem] px-4 py-3 text-left transition hover:bg-[#f1f4f5] ${
                            String(form.customer_id) === String(customer.id)
                              ? "bg-[#9defff]/30"
                              : ""
                          }`}
                        >
                          <p className="font-bold text-[#181c1d]">
                            {customer.full_name}
                          </p>
                          <p className="text-xs text-[#3e494b]">
                            {customer.phone || "-"} • {customer.email || "-"}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {customerMode === "EXISTING" && (
                <InputBox
                  label="Mã khách hàng"
                  value={form.customer_id}
                  onChange={(value) => updateForm("customer_id", value)}
                  placeholder="ID khách hàng"
                />
              )}

              <InputBox
                label={
                  customerMode === "NEW"
                    ? "Họ và tên khách hàng mới"
                    : "Họ và tên liên hệ"
                }
                value={form.contact_name}
                onChange={(value) => updateForm("contact_name", value)}
                placeholder="Nguyễn Văn A"
              />

              <InputBox
                label="Số điện thoại liên hệ"
                value={form.contact_phone}
                onChange={(value) => updateForm("contact_phone", value)}
                placeholder="0901 234 567"
                icon={<Phone size={18} />}
              />

              <InputBox
                label="Email liên hệ"
                value={form.contact_email}
                onChange={(value) => updateForm("contact_email", value)}
                placeholder="khachhang@email.com"
                type="email"
                icon={<Mail size={18} />}
              />
            </div>
          </section>

          <section className="rounded-[3rem] bg-white p-8 shadow-sm">
            <SectionTitle
              icon={<Map size={24} />}
              title="Lựa chọn Tour"
              color="bg-[#b3ebff]"
              iconColor="text-[#006074]"
            />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label>Tour du lịch</Label>

                <select
                  value={form.tour_id}
                  onChange={(e) => updateForm("tour_id", e.target.value)}
                  className="w-full appearance-none rounded-[2rem] border-none bg-[#f1f4f5] px-4 py-4 text-[#181c1d] outline-none transition focus:bg-white focus:ring-2 focus:ring-[#00606c]"
                >
                  <option value="">
                    {loadingTours ? "Đang tải tour..." : "Chọn tour"}
                  </option>

                  {tours.map((tour) => (
                    <option key={tour.id} value={tour.id}>
                      {tour.tour_code} - {tour.tour_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Đợt khởi hành</Label>

                <select
                  value={form.departure_id}
                  onChange={(e) => updateForm("departure_id", e.target.value)}
                  className="w-full appearance-none rounded-[2rem] border-none bg-[#f1f4f5] px-4 py-4 text-[#181c1d] outline-none transition focus:bg-white focus:ring-2 focus:ring-[#00606c]"
                >
                  <option value="">
                    {loadingDepartures
                      ? "Đang tải đợt khởi hành..."
                      : departures.length === 0
                      ? "Chưa có đợt khởi hành"
                      : "Chọn đợt khởi hành"}
                  </option>

                  {departures.map((departure) => {
                    const startDate = getDepartureStartDate(departure);
                    const endDate = getDepartureEndDate(departure);
                    const availableSeats =
                      getDepartureAvailableSeats(departure);

                    return (
                      <option key={departure.id} value={departure.id}>
                        {getDepartureCode(departure)} - {formatDate(startDate)}
                        {endDate ? ` đến ${formatDate(endDate)}` : ""} - còn{" "}
                        {availableSeats} chỗ
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <Label>Điểm đón khách</Label>

                <select
                  value={form.pickup_point_id}
                  onChange={(e) =>
                    updateForm("pickup_point_id", e.target.value)
                  }
                  className="w-full appearance-none rounded-[2rem] border-none bg-[#f1f4f5] px-4 py-4 text-[#181c1d] outline-none transition focus:bg-white focus:ring-2 focus:ring-[#00606c]"
                >
                  <option value="">
                    {loadingPickupPoints
                      ? "Đang tải điểm đón..."
                      : pickupPoints.length === 0
                      ? "Không có điểm đón"
                      : "Không chọn điểm đón"}
                  </option>

                  {pickupPoints.map((point) => (
                    <option key={point.id} value={point.id}>
                      {getPickupPointName(point)}
                      {point.address ? ` - ${point.address}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <Label>Khuyến mãi</Label>

                <div className="relative">
                  <Tag
                    size={18}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#3e494b]"
                  />

                  <select
                    value={form.promotion_id}
                    onChange={(e) =>
                      updateForm("promotion_id", e.target.value)
                    }
                    className="w-full appearance-none rounded-[2rem] border-none bg-[#f1f4f5] py-4 pl-12 pr-4 text-[#181c1d] outline-none transition focus:bg-white focus:ring-2 focus:ring-[#00606c]"
                  >
                    <option value="">Không áp dụng khuyến mãi</option>

                    {promotions.map((promotion) => (
                      <option key={promotion.id} value={promotion.id}>
                        {promotion.promotion_code} -{" "}
                        {promotion.promotion_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[3rem] bg-white p-8 shadow-sm">
            <SectionTitle
              icon={<Users size={24} />}
              title="Chi tiết Hành khách"
              color="bg-[#ffdbc9]"
              iconColor="text-[#9b4500]"
            />

            <div className="space-y-4">
              <CounterRow
                title="Người lớn"
                desc="Tính theo base_price trong bảng tours"
                value={form.adult_count}
                onMinus={() => changeCount("adult_count", "minus")}
                onPlus={() => changeCount("adult_count", "plus")}
              />

              <CounterRow
                title="Trẻ em"
                desc="Tính theo child_price trong bảng tours"
                value={form.child_count}
                onMinus={() => changeCount("child_count", "minus")}
                onPlus={() => changeCount("child_count", "plus")}
              />
            </div>
          </section>

          <section className="rounded-[3rem] bg-white p-8 shadow-sm">
            <SectionTitle
              icon={<Wallet size={24} />}
              title="Thanh toán & Ghi chú"
              color="bg-[#9defff]"
              iconColor="text-[#00606c]"
            />

            <div className="space-y-6">
              <div>
                <Label>Phương thức thanh toán</Label>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <PaymentOption
                    label="Tiền mặt"
                    icon={<Wallet size={18} />}
                    active={form.payment_method === "CASH"}
                    onClick={() => updateForm("payment_method", "CASH")}
                  />

                  <PaymentOption
                    label="Chuyển khoản"
                    icon={<Landmark size={18} />}
                    active={form.payment_method === "BANK_TRANSFER"}
                    onClick={() =>
                      updateForm("payment_method", "BANK_TRANSFER")
                    }
                  />

                  <PaymentOption
                    label="Thẻ tín dụng"
                    icon={<CreditCard size={18} />}
                    active={form.payment_method === "CREDIT_CARD"}
                    onClick={() => updateForm("payment_method", "CREDIT_CARD")}
                  />
                </div>
              </div>

              <div>
                <Label>Yêu cầu đặc biệt / Ghi chú</Label>

                <textarea
                  value={form.special_notes}
                  onChange={(e) => updateForm("special_notes", e.target.value)}
                  className="min-h-[130px] w-full resize-none rounded-[2rem] border-none bg-[#f1f4f5] px-4 py-4 outline-none transition focus:bg-white focus:ring-2 focus:ring-[#00606c]"
                  placeholder="Nhập lưu ý về ăn uống, phòng nghỉ hoặc yêu cầu riêng của khách..."
                />
              </div>
            </div>
          </section>
        </div>

        <aside className="sticky top-28 lg:col-span-4">
          <div className="overflow-hidden rounded-[3rem] bg-white shadow-sm">
            <div className="relative h-48">
              <img
                alt={selectedTour?.tour_name || "Tour du lịch"}
                className="h-full w-full object-cover"
                src={selectedTour?.featured_image_url || fallbackImage}
              />

              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                <h4 className="text-lg font-bold text-white">
                  {selectedTour?.tour_name || "Chưa chọn tour"}
                </h4>

                <div className="mt-1 flex items-center gap-2 text-sm text-white/80">
                  <CalendarDays size={14} />
                  <span>
                    {selectedTour
                      ? `${selectedTour.duration_days} ngày ${selectedTour.duration_nights} đêm`
                      : "Chưa có thời lượng"}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-8">
              <h5 className="mb-6 text-xs font-bold uppercase tracking-widest text-[#3e494b]">
                Chi tiết thanh toán
              </h5>

              <div className="mb-8 space-y-4">
                <SummaryLine
                  label={`Người lớn (x${form.adult_count})`}
                  value={formatMoney(
                    form.adult_count * Number(selectedTour?.base_price || 0)
                  )}
                />

                <SummaryLine
                  label={`Trẻ em (x${form.child_count})`}
                  value={formatMoney(
                    form.child_count * Number(selectedTour?.child_price || 0)
                  )}
                />

                <SummaryLine
                  label="Tạm tính"
                  value={formatMoney(totalOriginalAmount)}
                />

                <SummaryLine
                  label="Giảm giá"
                  value={`- ${formatMoney(discountAmount)}`}
                />

                <div className="flex items-end justify-between border-t border-[#bdc8cb]/30 pt-4">
                  <span className="font-bold text-[#181c1d]">Tổng cộng</span>
                  <span className="text-3xl font-black text-[#00606c]">
                    {formatMoney(totalPayableAmount)}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#9b4500] to-[#fc8a40] py-4 font-bold text-white transition hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <CheckCircle2 size={20} />
                  {submitting ? "Đang tạo..." : "Xác nhận & Tạo đơn"}
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/admin/booking")}
                  className="w-full rounded-full bg-[#ebeeef] py-4 font-bold text-[#3e494b] transition hover:bg-[#dfe3e4]"
                >
                  Hủy bỏ
                </button>
              </div>

              <div className="mt-8 rounded-[2rem] border border-[#00606c]/10 bg-[#9defff]/20 p-4">
                <div className="flex gap-3">
                  <Info size={20} className="shrink-0 text-[#00606c]" />
                  <p className="text-xs leading-relaxed text-[#004f59]">
                    Chọn tour trước, hệ thống sẽ tải đợt khởi hành. Sau khi chọn
                    đợt khởi hành, hệ thống sẽ tải điểm đón tương ứng.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function SectionTitle({
  icon,
  title,
  color,
  iconColor,
}: {
  icon: React.ReactNode;
  title: string;
  color: string;
  iconColor: string;
}) {
  return (
    <div className="mb-8 flex items-center gap-4">
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-full ${color} ${iconColor}`}
      >
        {icon}
      </div>

      <h3 className="text-xl font-bold text-[#181c1d]">{title}</h3>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-[#3e494b]">
      {children}
    </label>
  );
}

function InputBox({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <Label>{label}</Label>

      <div className="relative">
        {icon && (
          <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#3e494b]">
            {icon}
          </div>
        )}

        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-[2rem] border-none bg-[#f1f4f5] py-4 pr-4 text-[#181c1d] outline-none transition focus:bg-white focus:ring-2 focus:ring-[#00606c] ${
            icon ? "pl-12" : "px-4"
          }`}
          placeholder={placeholder}
          type={type}
        />
      </div>
    </div>
  );
}

function CounterRow({
  title,
  desc,
  value,
  onMinus,
  onPlus,
}: {
  title: string;
  desc: string;
  value: number;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-[2rem] bg-[#f1f4f5] p-4">
      <div>
        <p className="font-bold text-[#181c1d]">{title}</p>
        <p className="text-sm text-[#3e494b]">{desc}</p>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onMinus}
          disabled={value <= 0}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#00606c] shadow-sm disabled:opacity-40"
        >
          <Minus size={16} />
        </button>

        <span className="w-8 text-center text-xl font-bold text-[#181c1d]">
          {String(value).padStart(2, "0")}
        </span>

        <button
          type="button"
          onClick={onPlus}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00606c] text-white shadow-sm"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

function PaymentOption({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-[2rem] border p-4 text-left transition ${
        active
          ? "border-2 border-[#00606c] bg-[#9defff]/20 text-[#00606c]"
          : "border-[#bdc8cb]/40 bg-white text-[#181c1d] hover:bg-[#9defff]/10"
      }`}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

function SummaryLine({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-[#3e494b]">{label}</span>
      <span className="font-medium text-[#181c1d]">{value}</span>
    </div>
  );
}