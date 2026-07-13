export type StaffTourItem = {
  id: string;
  tourCode: string;
  tourName: string;
  slug: string | null;
  tourType: string;
  durationDays: number;
  durationNights: number;
  transportType: string | null;
  basePrice: number;
  childPrice: number;
  maxCapacity: number;
  shortDescription: string | null;
  description: string | null;
  featuredImageUrl: string | null;
  includedServices: string | null;
  excludedServices: string | null;
  status: string;
  isFeatured: boolean;
  categoryName: string | null;
  destinationName: string | null;
  destinationCity: string | null;
  destinationCountry: string | null;
  nextDepartureDate: string | null;
  totalDepartures: number;
  totalMaxSeats: number;
  totalBookedSeats: number;
  totalAvailableSeats: number;
  fillRate: number;
};

export type StaffTourSummary = {
  totalTours: number;
  activeTours: number;
  todayDepartures: number;
  totalAvailableSeats: number;
  averageFillRate: number;
};

export type StaffToursData = {
  tours: StaffTourItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  summary: StaffTourSummary;
};

export type StaffTourPayload = {
  id?: string;
  tourCode?: string;
  tourName: string;
  tourType: string;
  durationDays: number;
  durationNights: number;
  transportType?: string;
  basePrice: number;
  childPrice: number;
  maxCapacity: number;
  shortDescription?: string;
  description?: string;
  featuredImageUrl?: string;
  includedServices?: string;
  excludedServices?: string;
  status: string;
  isFeatured?: boolean;
};

export type StaffTourDetailData = {
  tour: StaffTourItem;
  departures: {
    id: string;
    departureCode: string;
    startDate: string | null;
    endDate: string | null;
    maxSeats: number;
    availableSeats: number;
    bookedSeats: number;
    bookingStatus: string;
    guideName: string | null;
  }[];
  itineraryDays: {
    id: string;
    dayNo: number;
    title: string | null;
    description: string | null;
    overnightLocation: string | null;
  }[];
};

function getToken() {
  if (typeof window === "undefined") return "";

  return (
    localStorage.getItem("access_token") ||
    sessionStorage.getItem("access_token") ||
    ""
  );
}

async function requestApi<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getToken();

  if (!token) {
    throw new Error("Chưa đăng nhập");
  }

  const headers: HeadersInit = {
    Authorization: `Bearer ${token}`,
    ...(options?.body ? { "Content-Type": "application/json" } : {}),
    ...(options?.headers || {}),
  };

  const res = await fetch(url, {
    ...options,
    headers,
    cache: "no-store",
  });

  const text = await res.text();

  let json: any;

  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error("API trả về HTML/không phải JSON. Kiểm tra lại route backend.");
  }

  if (!res.ok || !json.success) {
    throw new Error(json.message || "Có lỗi xảy ra");
  }

  return json.data;
}

export function getStaffToursApi(params?: {
  keyword?: string;
  status?: string;
  region?: string;
  tourType?: string;
  page?: number;
  pageSize?: number;
}) {
  const query = new URLSearchParams();

  if (params?.keyword) query.set("keyword", params.keyword);
  if (params?.status) query.set("status", params.status);
  if (params?.region) query.set("region", params.region);
  if (params?.tourType) query.set("tourType", params.tourType);
  if (params?.page) query.set("page", String(params.page));
  if (params?.pageSize) query.set("pageSize", String(params.pageSize));

  const qs = query.toString();

  return requestApi<StaffToursData>(
    `/backend-api/staff/tours${qs ? `?${qs}` : ""}`
  );
}

export function getStaffTourDetailApi(id: string) {
  if (!id || id === "undefined") {
    throw new Error("Thiếu mã tour cần xem chi tiết");
  }

  return requestApi<StaffTourDetailData>(
    `/backend-api/staff/tour-detail?id=${encodeURIComponent(id)}`
  );
}

export function saveStaffTourApi(payload: StaffTourPayload) {
  return requestApi<{ id: string }>(`/backend-api/staff/tour-save`, {
    method: payload.id ? "PATCH" : "POST",
    body: JSON.stringify(payload),
  });
}

export function updateStaffTourStatusApi(id: string, status: string) {
  if (!id || id === "undefined") {
    throw new Error("Thiếu mã tour cần cập nhật");
  }

  return requestApi<{ id: string }>(
    `/backend-api/staff/tour-status?id=${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }
  );
}