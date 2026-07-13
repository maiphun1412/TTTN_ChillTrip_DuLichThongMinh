export type StaffDashboardBooking = {
  id: string;
  bookingCode: string;
  tour: string;
  customer: string;
  date: string | null;
  price: number;
  status: string;
};

export type StaffDashboardSummary = {
  pendingBookings: number;
  supportRequests: number;
  upcomingTours: number;
  todayRevenue: number;
  unpaidDebt: number;
  preparingOperations: number;
  urgentTasks: number;
};

export type StaffDashboardLogistics = {
  preparingOperations: number;
  missingDocuments: number;
  pendingGuideAssign: number;
};

export type StaffDashboardData = {
  summary: StaffDashboardSummary;
  bookings: StaffDashboardBooking[];
  logistics: StaffDashboardLogistics;
};

export type StaffBookingItem = {
  id: string;
  bookingCode: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  tourName: string;
  tourImage: string;
  startDate: string | null;
  endDate: string | null;
  adultCount: number;
  childCount: number;
  pax: number;
  totalAmount: number;
  discountAmount: number;
  payableAmount: number;
  paidAmount: number;
  remainingAmount: number;
  bookingStatus: string;
  specialNotes: string;
  bookedAt: string | null;
};

export type StaffBookingsData = {
  bookings: StaffBookingItem[];
  total: number;
};

export type StaffBookingPassenger = {
  id: string;
  passengerType: string;
  fullName: string;
  gender: string | null;
  dateOfBirth: string | null;
  phone: string | null;
  email: string | null;
  idNumber: string | null;
  passportNumber: string | null;
  nationality: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  mealNote: string | null;
  healthNote: string | null;
  roomPreference: string | null;
  isBookingContact: boolean;
};

export type StaffBookingPayment = {
  id: string;
  paymentCode: string;
  paymentMethod: string;
  amount: number;
  paymentStatus: string;
  transactionCode: string | null;
  proofUrl: string | null;
  paidAt: string | null;
};

export type StaffBookingDocument = {
  id: string;
  passengerName: string;
  documentType: string;
  documentNumber: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  fileUrl: string | null;
  status: string;
  notes: string | null;
};

export type StaffBookingDetailData = {
  booking: StaffBookingItem & {
    pickupPointName: string | null;
    pickupAddress: string | null;
    promotionCode: string | null;
    promotionName: string | null;
    customerAddress: string | null;
    tourCode: string | null;
    departureCode: string | null;
  };
  passengers: StaffBookingPassenger[];
  payments: StaffBookingPayment[];
  documents: StaffBookingDocument[];
  debt: {
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    dueDate: string | null;
    debtStatus: string;
    notes: string | null;
  } | null;
};

export type StaffScheduleItem = {
  id: string;
  departureCode: string;
  tourId: string;
  tourCode: string;
  tourName: string;
  tourImage: string | null;
  startDate: string;
  endDate: string;
  maxSeats: number;
  availableSeats: number;
  bookedSeats: number;
  bookingStatus: string;
  guideId: string | null;
  guideName: string | null;
  notes: string | null;
  fillRate: number;
};

export type StaffScheduleOption = {
  id: string;
  label: string;
};

export type StaffScheduleData = {
  schedules: StaffScheduleItem[];
  tours: StaffScheduleOption[];
  guides: StaffScheduleOption[];
  total: number;
  summary: {
    totalSchedules: number;
    openSchedules: number;
    fullSchedules: number;
    cancelledSchedules: number;
  };
};

export type StaffSchedulePayload = {
  id?: string;
  tourId: string;
  departureCode: string;
  startDate: string;
  endDate: string;
  maxSeats: number;
  availableSeats: number;
  bookedSeats: number;
  bookingStatus: string;
  guideId?: string;
  notes?: string;
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

export function getStaffDashboardApi() {
  return requestApi<StaffDashboardData>("/backend-api/staff/dashboard");
}

export function getStaffBookingsApi(params?: {
  status?: string;
  keyword?: string;
  paymentStatus?: string;
  fromDate?: string;
  toDate?: string;
}) {
  const query = new URLSearchParams();

  if (params?.status) query.set("status", params.status);
  if (params?.keyword) query.set("keyword", params.keyword);
  if (params?.paymentStatus) query.set("paymentStatus", params.paymentStatus);
  if (params?.fromDate) query.set("fromDate", params.fromDate);
  if (params?.toDate) query.set("toDate", params.toDate);

  const queryString = query.toString();

  return requestApi<StaffBookingsData>(
    `/backend-api/staff/bookings${queryString ? `?${queryString}` : ""}`
  );
}

export function getStaffBookingDetailApi(id: string) {
  return requestApi<StaffBookingDetailData>(
    `/backend-api/staff/booking-detail?id=${id}`
  );
}

export function confirmStaffBookingApi(id: string) {
  if (!id || id === "undefined") {
    throw new Error("Thiếu mã đặt chỗ cần xác nhận");
  }

  return requestApi<{ bookingId: string }>(
    `/backend-api/staff/booking-confirm?id=${encodeURIComponent(id)}`,
    {
      method: "PATCH",
    }
  );
}

export function createStaffRefundApi(id: string) {
  if (!id || id === "undefined") {
    throw new Error("Thiếu mã đặt chỗ cần hoàn tiền");
  }

  return requestApi<{ refundCode: string }>(
    `/backend-api/staff/booking-refund?id=${encodeURIComponent(id)}`,
    {
      method: "POST",
    }
  );
}



export function getStaffSchedulesApi(params?: {
  keyword?: string;
  status?: string;
}) {
  const query = new URLSearchParams();

  if (params?.keyword) query.set("keyword", params.keyword);
  if (params?.status) query.set("status", params.status);

  const queryString = query.toString();

  return requestApi<StaffScheduleData>(
    `/backend-api/staff/schedules${queryString ? `?${queryString}` : ""}`
  );
}

export function saveStaffScheduleApi(payload: StaffSchedulePayload) {
  return requestApi<{ id: string }>("/backend-api/staff/schedule-save", {
    method: payload.id ? "PATCH" : "POST",
    body: JSON.stringify(payload),
  });
}

export function updateStaffScheduleStatusApi(id: string, status: string) {
  if (!id || id === "undefined") {
    throw new Error("Thiếu mã lịch khởi hành");
  }

  return requestApi<{ id: string }>(
    `/backend-api/staff/schedule-status?id=${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }
  );
}
export function deleteStaffScheduleApi(id: string) {
  if (!id || id === "undefined") {
    throw new Error("Thiếu mã lịch khởi hành cần xóa");
  }

  return requestApi<{ id: string }>(
    `/backend-api/staff/schedule-delete?id=${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    }
  );
}
export type StaffCustomerItem = {
  id: string;
  customerCode: string;
  fullName: string;
  gender: string | null;
  dateOfBirth: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  customerType: string;
  notes: string | null;
  avatarUrl: string | null;
  userStatus: string | null;
  totalBookings: number;
  totalSpent: number;
  lastBookedAt: string | null;
};

export type StaffCustomersData = {
  customers: StaffCustomerItem[];
  total: number;
  summary: {
    totalCustomers: number;
    individualCustomers: number;
    corporateCustomers: number;
    customersWithBookings: number;
  };
};

export type StaffCustomerBooking = {
  id: string;
  bookingCode: string;
  tourName: string;
  tourImage: string | null;
  startDate: string | null;
  endDate: string | null;
  adultCount: number;
  childCount: number;
  totalPayableAmount: number;
  paidAmount: number;
  remainingAmount: number;
  bookingStatus: string;
  bookedAt: string | null;
};

export type StaffCustomerPassenger = {
  id: string;
  bookingCode: string;
  passengerType: string;
  fullName: string;
  gender: string | null;
  dateOfBirth: string | null;
  phone: string | null;
  email: string | null;
  idNumber: string | null;
  passportNumber: string | null;
  nationality: string | null;
};

export type StaffCustomerDocument = {
  id: string;
  bookingCode: string;
  passengerName: string;
  documentType: string;
  documentNumber: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  fileUrl: string | null;
  status: string;
  notes: string | null;
};

export type StaffCustomerDebt = {
  bookingCode: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: string | null;
  debtStatus: string;
  notes: string | null;
};

export type StaffCustomerDetailData = {
  customer: StaffCustomerItem;
  bookings: StaffCustomerBooking[];
  passengers: StaffCustomerPassenger[];
  documents: StaffCustomerDocument[];
  debts: StaffCustomerDebt[];
};

export type StaffCustomerPayload = {
  id?: string;
  fullName: string;
  gender?: string;
  dateOfBirth?: string;
  email?: string;
  phone?: string;
  address?: string;
  customerType: string;
  notes?: string;
};
export function getStaffCustomersApi(params?: {
  keyword?: string;
  customerType?: string;
}) {
  const query = new URLSearchParams();

  if (params?.keyword) query.set("keyword", params.keyword);
  if (params?.customerType) query.set("customerType", params.customerType);

  const queryString = query.toString();

  return requestApi<StaffCustomersData>(
    `/backend-api/staff/customers${queryString ? `?${queryString}` : ""}`
  );
}

export function getStaffCustomerDetailApi(id: string) {
  if (!id || id === "undefined") {
    throw new Error("Thiếu mã khách hàng cần xem hồ sơ");
  }

  return requestApi<StaffCustomerDetailData>(
    `/backend-api/staff/customer-detail?id=${encodeURIComponent(id)}`
  );
}

export function saveStaffCustomerApi(payload: StaffCustomerPayload) {
  return requestApi<{ id: string }>("/backend-api/staff/customer-save", {
    method: payload.id ? "PATCH" : "POST",
    body: JSON.stringify(payload),
  });
}
export type StaffCustomerMessagePayload = {
  customerId: string;
  title: string;
  content: string;
};

export function sendStaffCustomerMessageApi(payload: StaffCustomerMessagePayload) {
  return requestApi<{ sent: boolean }>("/backend-api/staff/customer-message", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
export type StaffFinanceTransaction = {
  id: string;
  paymentCode: string;
  bookingCode: string;
  customerName: string;
  tourName: string;
  amount: number;
  paymentMethod: string;
  paymentStatus: string;
  transactionCode: string | null;
  paidAt: string | null;
  createdAt: string | null;
};

export type StaffFinanceDebt = {
  id: string;
  bookingId: string;
  bookingCode: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: string | null;
  debtStatus: string;
  overdueDays: number;
  notes: string | null;
};

export type StaffFinanceBookingOption = {
  id: string;
  bookingCode: string;
  customerName: string;
  tourName: string;
  totalPayableAmount: number;
  remainingAmount: number;
};

export type StaffFinanceRefund = {
  id: string;
  refundCode: string;
  bookingCode: string;
  customerName: string;
  refundAmount: number;
  cancellationFeeAmount: number;
  refundStatus: string;
  refundMethod: string | null;
  refundAt: string | null;
};

export type StaffFinanceTrendItem = {
  label: string;
  revenue: number;
};

export type StaffFinanceData = {
  summary: {
    monthRevenue: number;
    pendingPaymentAmount: number;
    paidAmount: number;
    unpaidDebtAmount: number;
    refundAmount: number;
    netRevenue: number;
  };
  transactions: StaffFinanceTransaction[];
  debts: StaffFinanceDebt[];
  refunds: StaffFinanceRefund[];
  bookingOptions: StaffFinanceBookingOption[];
  revenueTrend: StaffFinanceTrendItem[];
};

export type StaffPaymentRecordPayload = {
  bookingId: string;
  paymentMethod: string;
  amount: number;
  transactionCode?: string;
  proofUrl?: string;
  paidAt?: string;
  note?: string;
};

export function getStaffFinanceApi(params?: {
  keyword?: string;
  status?: string;
}) {
  const query = new URLSearchParams();

  if (params?.keyword) query.set("keyword", params.keyword);
  if (params?.status) query.set("status", params.status);

  const queryString = query.toString();

  return requestApi<StaffFinanceData>(
    `/backend-api/staff/finance${queryString ? `?${queryString}` : ""}`
  );
}

export function recordStaffPaymentApi(payload: StaffPaymentRecordPayload) {
  return requestApi<{ paymentId: string; paymentCode: string }>(
    "/backend-api/staff/payment-record",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export function remindStaffDebtApi(debtId: string) {
  if (!debtId || debtId === "undefined") {
    throw new Error("Thiếu mã công nợ cần nhắc");
  }

  return requestApi<{ sent: boolean }>(
    `/backend-api/staff/debt-remind?id=${encodeURIComponent(debtId)}`,
    {
      method: "POST",
    }
  );
}
export type StaffOperationTask = {
  id: string;
  taskType: string;
  refId: string;
  title: string;
  tourName: string | null;
  customerName: string | null;
  deadline: string | null;
  status: string;
  priority: number;
  icon: "BUS" | "HOTEL" | "MAIL" | "DOC" | "BOOKING" | "OPERATION";
};

export type StaffUpcomingDeparture = {
  id: string;
  departureCode: string;
  tourName: string;
  startDate: string | null;
  endDate: string | null;
  guideName: string | null;
  bookedSeats: number;
  maxSeats: number;
  operationStatus: string | null;
  pickupCount: number;
  readyPercent: number;
};

export type StaffOperationIncident = {
  id: string;
  type: string;
  title: string;
  desc: string;
  createdAt: string | null;
};

export type StaffOperationData = {
  summary: {
    todayTasks: number;
    urgentTasks: number;
    upcomingTours: number;
    supportRequests: number;
    pendingEmails: number;
  };
  tasks: StaffOperationTask[];
  upcomingTours: StaffUpcomingDeparture[];
  incidents: StaffOperationIncident[];
};

export type StaffOperationNoticePayload = {
  title: string;
  content: string;
  targetRole: "ALL" | "STAFF" | "GUIDE" | "ADMIN";
};

export function getStaffOperationApi() {
  return requestApi<StaffOperationData>("/backend-api/staff/operation");
}

export function completeStaffOperationTaskApi(payload: {
  taskType: string;
  refId: string;
}) {
  return requestApi<{ done: boolean }>("/backend-api/staff/operation-task", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function sendStaffOperationNoticeApi(
  payload: StaffOperationNoticePayload
) {
  return requestApi<{ sent: boolean }>("/backend-api/staff/operation-notice", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type StaffEmailItem = {
  id: string;
  bookingCode: string | null;
  customerName: string | null;
  tourName: string | null;
  recipientEmail: string;
  subject: string | null;
  body: string | null;
  sendStatus: string;
  sentAt: string | null;
  errorMessage: string | null;
  createdAt: string | null;
};

export type StaffSupportRequestItem = {
  id: string;
  bookingId: string;
  bookingCode: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  tourName: string;
  reason: string | null;
  requestStatus: string;
  requestedAt: string | null;
  processedAt: string | null;
};

export type StaffEmailCustomerOption = {
  customerId: string;
  bookingId: string | null;
  bookingCode: string | null;
  customerName: string;
  customerEmail: string | null;
  tourName: string | null;
};

export type StaffRequestsData = {
  summary: {
    pendingEmails: number;
    sentToday: number;
    failedEmails: number;
    pendingRequests: number;
    processedRequests: number;
  };
  emails: StaffEmailItem[];
  requests: StaffSupportRequestItem[];
  customers: StaffEmailCustomerOption[];
};

export type StaffSendEmailPayload = {
  customerId?: string;
  bookingId?: string;
  recipientEmail: string;
  subject: string;
  body: string;
};

export type StaffProcessRequestPayload = {
  requestId: string;
  action: "APPROVED" | "REJECTED";
  note?: string;
};

export function getStaffRequestsApi(params?: {
  keyword?: string;
  emailStatus?: string;
  requestStatus?: string;
}) {
  const query = new URLSearchParams();

  if (params?.keyword) query.set("keyword", params.keyword);
  if (params?.emailStatus) query.set("emailStatus", params.emailStatus);
  if (params?.requestStatus) query.set("requestStatus", params.requestStatus);

  const queryString = query.toString();

  return requestApi<StaffRequestsData>(
    `/backend-api/staff/requests${queryString ? `?${queryString}` : ""}`
  );
}

export function sendStaffEmailApi(payload: StaffSendEmailPayload) {
  return requestApi<{ emailId: string }>("/backend-api/staff/email-send", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function resendStaffEmailApi(id: string) {
  if (!id || id === "undefined") {
    throw new Error("Thiếu mã email cần gửi lại");
  }

  return requestApi<{ sent: boolean }>(
    `/backend-api/staff/email-resend?id=${encodeURIComponent(id)}`,
    {
      method: "PATCH",
    }
  );
}

export function processStaffRequestApi(payload: StaffProcessRequestPayload) {
  return requestApi<{ processed: boolean }>("/backend-api/staff/request-process", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}