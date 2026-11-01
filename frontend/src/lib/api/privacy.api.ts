const API_BASE_URL = "/backend-api";

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem("access_token") ||
    sessionStorage.getItem("access_token")
  );
}

export type ConsentStatusCode =
  | "GRANTED"
  | "DENIED"
  | "REVOKED"
  | "NOT_GRANTED"
  | "NO_CONSENT_SCHEMA";

export type CustomerPrivacyAccessLog = {
  id: string;
  createdAt: string;
  accessorRole: string | null;
  accessorName: string | null;
  dataType: string;
  action: string;
  result: "ALLOWED" | "DENIED";
  reason: string | null;
  purpose: string | null;
  departureId: string | null;
  departureCode: string | null;
  startDate: string | null;
  endDate: string | null;
  bookingId: string | null;
  bookingCode: string | null;
  tourName: string | null;
  tourCode: string | null;
};

export type CustomerPrivacyLogStats = {
  totalAccess: number;
  allowedCount: number;
  deniedCount: number;
  guideAccessCount: number;
};

export type CustomerPrivacyLogsResponse = {
  items: CustomerPrivacyAccessLog[];
  total: number;
  page: number;
  pageSize: number;
  stats: CustomerPrivacyLogStats;
};

export type CustomerBookingConsentItem = {
  bookingId: string;
  bookingCode: string;
  bookingStatus: string;
  contactName?: string;
  contactPhone?: string;
  guestCount?: number;
  bookedAt?: string;
  departureId: string;
  departureCode: string;
  startDate: string;
  endDate: string;
  tourId?: string;
  tourCode?: string;
  tourName: string;
  guideName: string | null;
  phoneShared: boolean;
  consentStatus: ConsentStatusCode;
  consentUpdatedAt: string | null;
  canGrantConsent: boolean;
  canRevokeConsent: boolean;
  guideAccessWindowAllowed: boolean;
  guideAccessWindowCode: string;
  guideAccessWindowMessage: string;
  allowedFrom: string | null;
  allowedUntil: string | null;
};

export type CustomerBookingConsentsResponse = {
  schemaReady: boolean;
  items: CustomerBookingConsentItem[];
};

export async function getMyPrivacyAccessLogsApi(params?: {
  result?: "" | "ALLOWED" | "DENIED";
  bookingId?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<CustomerPrivacyLogsResponse> {
  const token = getAccessToken();
  if (!token) {
    throw new Error("Vui lòng đăng nhập để xem lịch sử truy cập dữ liệu");
  }

  const search = new URLSearchParams();
  if (params?.result) search.set("result", params.result);
  if (params?.bookingId) search.set("bookingId", params.bookingId);
  if (params?.q?.trim()) search.set("q", params.q.trim());
  if (params?.page) search.set("page", String(params.page));
  if (params?.pageSize) search.set("pageSize", String(params.pageSize));

  const query = search.toString();
  const res = await fetch(
    `${API_BASE_URL}/profile/privacy-logs${query ? `?${query}` : ""}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }
  );

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(
      json.message || "Không thể tải lịch sử truy cập dữ liệu cá nhân"
    );
  }

  return json.data;
}

export async function getMyBookingPrivacyConsentsApi(): Promise<CustomerBookingConsentsResponse> {
  const token = getAccessToken();
  if (!token) {
    throw new Error("Vui lòng đăng nhập để quản lý quyền chia sẻ dữ liệu");
  }

  const res = await fetch(`${API_BASE_URL}/profile/privacy-consents`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(
      json.message || "Không thể tải danh sách quyền chia sẻ dữ liệu"
    );
  }

  return json.data;
}

export async function getBookingPrivacyConsentApi(
  bookingId: string
): Promise<CustomerBookingConsentItem & { schemaReady: boolean }> {
  const token = getAccessToken();
  if (!token) {
    throw new Error("Vui lòng đăng nhập");
  }

  const res = await fetch(
    `${API_BASE_URL}/bookings/${encodeURIComponent(bookingId)}/privacy-consent`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }
  );

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(
      json.message || "Không thể tải trạng thái quyền chia sẻ số điện thoại"
    );
  }

  return json.data;
}

export async function updateBookingPrivacyConsentApi(
  bookingId: string,
  status: "GRANTED" | "DENIED" | "REVOKED"
): Promise<{
  data: {
    schemaReady: boolean;
    bookingId: string;
    bookingCode: string;
    departureId: string;
    departureCode: string;
    phoneShared: boolean;
    consentStatus: ConsentStatusCode;
    consentUpdatedAt: string | null;
  };
  message: string;
}> {
  const token = getAccessToken();
  if (!token) {
    throw new Error("Vui lòng đăng nhập");
  }

  const res = await fetch(
    `${API_BASE_URL}/bookings/${encodeURIComponent(bookingId)}/privacy-consent`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    }
  );

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(
      json.message || "Không thể cập nhật quyền chia sẻ số điện thoại"
    );
  }

  return {
    data: json.data,
    message: json.message || "Đã cập nhật quyền chia sẻ số điện thoại",
  };
}

export function formatConsentStatusLabel(status?: ConsentStatusCode | string | null) {
  switch (status) {
    case "GRANTED":
      return "Đang cho phép HDV xem SĐT";
    case "DENIED":
      return "Đã từ chối chia sẻ SĐT";
    case "REVOKED":
      return "Đã thu hồi quyền chia sẻ SĐT";
    case "NO_CONSENT_SCHEMA":
      return "Mặc định ẩn SĐT (Chưa kích hoạt bảng consent)";
    case "NOT_GRANTED":
    default:
      return "Mặc định ẩn SĐT (Chưa cấp quyền)";
  }
}

export function formatAccessorRoleLabel(role?: string | null) {
  switch (role) {
    case "GUIDE":
      return "Hướng dẫn viên";
    case "STAFF":
      return "Nhân viên điều hành";
    case "ADMIN":
      return "Quản trị viên";
    case "CUSTOMER":
      return "Khách hàng";
    default:
      return role || "Hệ thống";
  }
}

export function formatPrivacyDataTypeLabel(dataType?: string | null) {
  switch (dataType) {
    case "PASSENGER_LIST":
      return "Danh sách hành khách & điều hành chuyến";
    case "CONTACT_INFO":
      return "Thông tin liên lạc (SĐT)";
    case "CUSTOMER_PROFILE":
      return "Hồ sơ khách hàng";
    case "CUSTOMER_LIST":
      return "Danh sách khách hàng";
    case "MESSAGE":
      return "Tin nhắn hỗ trợ";
    case "IDENTITY_DOC":
      return "Giấy tờ tùy thân";
    case "HEALTH_NOTE":
      return "Ghi chú sức khỏe";
    default:
      return dataType || "Dữ liệu cá nhân";
  }
}

export function formatPrivacyReasonLabel(reason?: string | null) {
  switch (reason) {
    case "GUIDE_NOT_ASSIGNED":
      return "HDV không được phân công phụ trách chuyến này";
    case "TRIP_EXPIRED":
      return "Ngoài thời hạn truy cập cho phép của chuyến đi";
    case "CUSTOMER_NOT_IN_TRIP":
      return "Khách không thuộc chuyến đi này";
    case "ROLE_NOT_ALLOWED":
      return "Vai trò không có quyền truy cập";
    case "UNAUTHENTICATED":
      return "Chưa xác thực phiên đăng nhập";
    default:
      return reason || null;
  }
}

export function formatPrivacyPurposeLabel(purpose?: string | null) {
  switch (purpose) {
    case "TOUR_OPERATION":
      return "Điều hành & đón khách đi tour";
    case "CUSTOMER_SUPPORT":
      return "Chăm sóc & hỗ trợ khách hàng";
    case "ADMINISTRATION":
      return "Quản trị hệ thống";
    default:
      return purpose || "Vận hành dịch vụ";
  }
}

