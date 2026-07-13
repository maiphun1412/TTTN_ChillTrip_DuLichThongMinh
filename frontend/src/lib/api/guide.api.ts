export type GuideMe = {
  userId: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  guideId: string;
  guideCode: string;
  region?: string | null;
  languages?: string | null;
  experienceYears: number;
  status: string;
};

export type GuideTrip = {
  assignmentId: string;
  assignedAt: string;
  assignmentNotes?: string | null;

  departureId: string;
  departureCode: string;
  startDate: string;
  endDate: string;
  maxSeats: number;
  availableSeats: number;
  bookedSeats: number;
  bookingStatus: string;

  operationStatus: string;
  operationUpdatedAt?: string | null;

  tourId: string;
  tourCode: string;
  tourName: string;
  tourType: string;
  durationDays: number;
  durationNights: number;
  featuredImageUrl?: string | null;
  shortDescription?: string | null;

  destinationName?: string | null;
  destinationCity?: string | null;
  destinationCountry?: string | null;

  bookingCount: number;
  passengerCount: number;
};

export type GuidePassenger = {
  id: string;
  bookingId?: string;
  bookingCode?: string;
  bookingStatus?: string;

  passengerType?: string | null;
  fullName?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  phone?: string | null;
  email?: string | null;
  idNumber?: string | null;
  passportNumber?: string | null;
  nationality?: string | null;

  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  mealNote?: string | null;
  healthNote?: string | null;
  roomPreference?: string | null;
  isBookingContact?: boolean;

  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  specialNotes?: string | null;
};

export type GuidePickupPoint = {
  id: string;
  pointType: string;
  pointName: string;
  address: string;
  province?: string | null;
  pickupTime?: string | null;
  dropoffTime?: string | null;
  notes?: string | null;
  bookingCount: number;
  passengerCount: number;
};

export type GuideItineraryDay = {
  id: string;
  dayNo: number;
  title?: string | null;
  description?: string | null;
  overnightLocation?: string | null;
};

export type GuideActivity = {
  id: string;
  itineraryDayId: string;
  activityTime?: string | null;
  activityTitle: string;
  locationName?: string | null;
  description?: string | null;
  sortOrder: number;
};

export type GuideOperationLog = {
  id: string;
  logTime: string;
  logType?: "STATUS" | "INCIDENT" | "ITINERARY_NOTE" | string | null;
  content: string;
  createdBy?: string | null;
};

export type GuideTripDetail = {
  assignment: GuideTrip & {
    description?: string | null;
    includedServices?: string | null;
    excludedServices?: string | null;
    operationNotes?: string | null;
  };
  passengers: GuidePassenger[];
  pickupPoints: GuidePickupPoint[];
  itineraryDays: GuideItineraryDay[];
  activities: GuideActivity[];
  logs: GuideOperationLog[];
};

export type GuideScheduleActivity = {
  id: string;
  activityTime?: string | null;
  activityTitle?: string | null;
  locationName?: string | null;
  description?: string | null;
  sortOrder?: number | null;
};

export type GuideScheduleDay = {
  id: string;
  dayNo: number;
  title?: string | null;
  description?: string | null;
  overnightLocation?: string | null;
  activities: GuideScheduleActivity[];
};

export type GuideScheduleTrip = {
  assignmentId: string;
  assignmentNotes?: string | null;

  departureId: string;
  departureCode: string;
  startDate: string;
  endDate: string;
  maxSeats: number;
  availableSeats: number;
  bookedSeats: number;
  bookingStatus: string;
  operationStatus: string;

  tourId: string;
  tourCode: string;
  tourName: string;
  tourType: string;
  durationDays: number;
  durationNights: number;
  featuredImageUrl?: string | null;
  shortDescription?: string | null;

  destinationName?: string | null;
  destinationCity?: string | null;
  destinationCountry?: string | null;

  itineraryId?: string | null;
  itineraryTitle?: string | null;

  passengerCount: number;
  bookingCount: number;

  itineraryDays: GuideScheduleDay[];
};

export type GuidePassengerBooking = {
  id: string;
  bookingCode: string;
  bookingStatus: string;
  contactName: string;
  contactPhone: string;
  contactEmail?: string | null;
  adultCount: number;
  childCount: number;
  specialNotes?: string | null;

  pickupName?: string | null;
  pickupAddress?: string | null;
  pickupTime?: string | null;

  passengers: GuidePassenger[];
};

export type GuidePassengerTrip = {
  assignmentId: string;

  departureId: string;
  departureCode: string;
  startDate: string;
  endDate: string;

  tourId: string;
  tourCode: string;
  tourName: string;
  durationDays: number;
  durationNights: number;
  featuredImageUrl?: string | null;

  bookingCount: number;
  passengerCount: number;

  bookings: GuidePassengerBooking[];
};

export type GuidePickupBooking = {
  id: string;
  bookingCode: string;
  bookingStatus: string;
  contactName: string;
  contactPhone: string;
  contactEmail?: string | null;
  adultCount: number;
  childCount: number;
  passengerCount: number;
  specialNotes?: string | null;
};

export type GuidePickupGroup = {
  pickupPointId: string;
  pointType: string;
  pointName: string;
  address: string;
  province?: string | null;
  pickupTime?: string | null;
  dropoffTime?: string | null;
  notes?: string | null;

  bookingCount: number;
  passengerCount: number;

  bookings: GuidePickupBooking[];
};

export type GuidePickupTrip = {
  assignmentId: string;

  departureId: string;
  departureCode: string;
  startDate: string;
  endDate: string;

  tourId: string;
  tourCode: string;
  tourName: string;
  durationDays: number;
  durationNights: number;
  featuredImageUrl?: string | null;

  pickupGroups: GuidePickupGroup[];
};

export type GuideIncident = {
  id: string;
  departureId: string;
  assignmentId?: string | null;

  issueType?: string | null;
  title: string;
  description?: string | null;
  severity?: string | null;
  status?: string | null;

  reportedAt?: string | null;
  processedAt?: string | null;

  tourName?: string | null;
  tourCode?: string | null;
  departureCode?: string | null;
  startDate?: string | null;
  endDate?: string | null;
};

export type CreateGuideIncidentPayload = {
  issueType: string;
  title: string;
  description?: string;
  severity: string;
};

export type UpdateGuideTripStatusPayload = {
  operationStatus: string;
  note?: string;
};

export type CreateGuideScheduleNotePayload = {
  departureId: string | number;
  dayNo?: string | number;
  content: string;
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

  const json = await res.json();

  if (!res.ok || !json.success) {
    throw new Error(json.message || "Có lỗi xảy ra");
  }

  return json.data;
}

/* =========================
   GUIDE BASIC
========================= */

export function getGuideMeApi() {
  return requestApi<GuideMe>("/backend-api/guide/me");
}

export function getGuideTripsApi() {
  return requestApi<GuideTrip[]>("/backend-api/guide/trips");
}

export function getGuideTripDetailApi(assignmentId: string) {
  return requestApi<GuideTripDetail>(`/backend-api/guide/trips/${assignmentId}`);
}

/* =========================
   GUIDE STATUS
========================= */

export function updateGuideTripStatusApi(
  assignmentId: string,
  payload: UpdateGuideTripStatusPayload
) {
  return requestApi<GuideOperationLog>(
    `/backend-api/guide/trips/${assignmentId}/status`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );
}

/* =========================
   GUIDE SCHEDULE
========================= */

export function getGuideScheduleApi() {
  return requestApi<GuideScheduleTrip[]>("/backend-api/guide/schedule");
}

export function createGuideScheduleNoteApi(
  payload: CreateGuideScheduleNotePayload
) {
  return requestApi<GuideOperationLog | null>("/backend-api/guide/schedule", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/* =========================
   GUIDE PASSENGERS
========================= */

export function getGuidePassengersApi() {
  return requestApi<GuidePassengerTrip[]>("/backend-api/guide/passengers");
}

/* =========================
   GUIDE PICKUP POINTS
   Xíu làm page điểm đón sẽ gọi hàm này
========================= */

export function getGuidePickupsApi() {
  return requestApi<GuidePickupTrip[]>("/backend-api/guide/pickups");
}

/* =========================
   GUIDE INCIDENTS
   Xíu làm page báo cáo phát sinh sẽ gọi mấy hàm này
========================= */

export function getGuideIncidentsApi() {
  return requestApi<GuideIncident[]>("/backend-api/guide/incidents");
}

export function createGuideIncidentApi(
  assignmentId: string,
  payload: CreateGuideIncidentPayload
) {
  return requestApi<GuideOperationLog>(
    `/backend-api/guide/trips/${assignmentId}/incidents`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export function createGuideIncidentGeneralApi(payload: {
  departureId: string | number;
  issueType: string;
  title: string;
  description?: string;
  severity: string;
}) {
  return requestApi<GuideIncident>("/backend-api/guide/incidents", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
export type EndTripReportExpense = {
  title: string;
  amount: number;
  date?: string;
  note?: string;
};

export type EndTripReportImage = {
  url: string;
  caption?: string;
};

export type EndTripReportData = {
  generalSummary?: string;
  incidentSummary?: string;
  positiveFeedback?: string[];
  improvementFeedback?: string[];
  expenses?: EndTripReportExpense[];
  images?: EndTripReportImage[];
  overallRating?: number;
  recommendation?: string;
  nextAction?: string;
};

export type GuideEndTripReport = {
  assignmentId: string;
  assignmentNotes?: string | null;

  departureId: string;
  departureCode: string;
  startDate: string;
  endDate: string;
  bookingStatus: string;

  tourId: string;
  tourCode: string;
  tourName: string;
  durationDays: number;
  durationNights: number;
  featuredImageUrl?: string | null;

  destinationName?: string | null;
  destinationCity?: string | null;
  destinationCountry?: string | null;

  bookingCount: number;
  passengerCount: number;

  isEnded: boolean;
  mustReport: boolean;

  reportId?: string | null;
  reportStatus: "MISSING" | "DRAFT" | "SUBMITTED";
  reportSubmittedAt?: string | null;
  report?: EndTripReportData | null;
};

export type SaveEndTripReportPayload = {
  assignmentId: string | number;
  status: "DRAFT" | "SUBMITTED";
  report: EndTripReportData;
};

export function getGuideReportsApi() {
  return requestApi<GuideEndTripReport[]>("/backend-api/guide/reports");
}

export function saveGuideEndTripReportApi(payload: SaveEndTripReportPayload) {
  return requestApi<null>("/backend-api/guide/reports", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
export async function uploadGuideAvatarApi(file: File) {
  const token =
    localStorage.getItem("access_token") ||
    sessionStorage.getItem("access_token") ||
    "";

  if (!token) {
    throw new Error("Chưa đăng nhập");
  }

  const formData = new FormData();
  formData.append("avatar", file);

  const res = await fetch("/backend-api/guide/profile/avatar", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const text = await res.text();

  let json: any = null;

  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(
      `API upload avatar không trả JSON. Status: ${res.status}. Nội dung trả về: ${text.slice(
        0,
        120
      )}`
    );
  }

  if (!res.ok || !json?.success) {
    throw new Error(json?.message || "Không thể cập nhật ảnh đại diện");
  }

  return json.data as {
    avatarUrl: string;
  };
}