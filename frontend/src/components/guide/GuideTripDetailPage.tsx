"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import GuideShell from "@/components/guide/GuideShell";
import {
  createGuideIncidentApi,
  getGuideMeApi,
  getGuideTripDetailApi,
  updateGuideTripStatusApi,
  type GuideActivity,
  type GuideMe,
  type GuideOperationLog,
  type GuidePassenger,
  type GuideTripDetail,
} from "@/lib/api/guide.api";

type TabKey = "ITINERARY" | "PASSENGERS" | "PICKUPS" | "REPORTS";

function formatDate(value?: string | null) {
  if (!value) return "Đang cập nhật";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Đang cập nhật";
  return date.toLocaleDateString("vi-VN");
}

function formatDateTime(value?: string | null) {
  if (!value) return "Đang cập nhật";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Đang cập nhật";
  return date.toLocaleString("vi-VN");
}

function statusText(status?: string) {
  switch (status) {
    case "PREPARING":
      return "Đang chuẩn bị";
    case "CONFIRMED":
      return "Đã xác nhận";
    case "PICKING_UP":
      return "Đang đón khách";
    case "ON_TOUR":
      return "Đang đi tour";
    case "COMPLETED":
      return "Hoàn thành";
    case "CANCELLED":
      return "Đã hủy";
    default:
      return status || "Đang cập nhật";
  }
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

function getInitials(name?: string | null) {
  if (!name) return "?";

  return name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

export default function GuideTripDetailPage() {
  const router = useRouter();
  const params = useParams();

  const assignmentId = Array.isArray(params.id)
    ? params.id[0]
    : String(params.id || "");

  const [guide, setGuide] = useState<GuideMe | null>(null);
  const [data, setData] = useState<GuideTripDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("ITINERARY");

  const [operationStatus, setOperationStatus] = useState("PREPARING");
  const [statusNote, setStatusNote] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [issueType, setIssueType] = useState("OTHER");
  const [severity, setSeverity] = useState("NORMAL");
  const [issueTitle, setIssueTitle] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [sendingIncident, setSendingIncident] = useState(false);

  async function loadData() {
    try {
      setLoading(true);
      setErrorMessage("");

      const [guideData, detailData] = await Promise.all([
        getGuideMeApi(),
        getGuideTripDetailApi(assignmentId),
      ]);

      setGuide(guideData);
      setData(detailData);
      setOperationStatus(detailData.assignment.operationStatus || "PREPARING");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Không thể tải chi tiết chuyến đi";

      setErrorMessage(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (assignmentId) {
      loadData();
    }
  }, [assignmentId]);

  const activityMap = useMemo(() => {
    const map: Record<string, GuideActivity[]> = {};

    data?.activities.forEach((activity) => {
      if (!map[activity.itineraryDayId]) {
        map[activity.itineraryDayId] = [];
      }

      map[activity.itineraryDayId].push(activity);
    });

    return map;
  }, [data]);

  const incidentLogs = useMemo(() => {
    return data?.logs.filter((log) => log.logType === "INCIDENT") || [];
  }, [data]);

  const statusLogs = useMemo(() => {
    return data?.logs.filter((log) => log.logType === "STATUS") || [];
  }, [data]);

  const specialPassengers = useMemo(() => {
    return (
      data?.passengers.filter(
        (p) => p.mealNote || p.healthNote || p.roomPreference
      ) || []
    );
  }, [data]);

  async function handleUpdateStatus() {
    try {
      setUpdatingStatus(true);

      await updateGuideTripStatusApi(assignmentId, {
        operationStatus,
        note: statusNote.trim(),
      });

      setStatusNote("");
      await loadData();
      alert("Cập nhật tình trạng chuyến đi thành công.");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Không thể cập nhật.");
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleCreateIncident() {
    if (!issueTitle.trim()) {
      alert("Vui lòng nhập tiêu đề vấn đề.");
      return;
    }

    try {
      setSendingIncident(true);

      await createGuideIncidentApi(assignmentId, {
        issueType,
        severity,
        title: issueTitle.trim(),
        description: issueDescription.trim(),
      });

      setIssueType("OTHER");
      setSeverity("NORMAL");
      setIssueTitle("");
      setIssueDescription("");

      await loadData();
      setActiveTab("REPORTS");
      alert("Đã gửi báo cáo vấn đề phát sinh.");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Không thể gửi báo cáo.");
    } finally {
      setSendingIncident(false);
    }
  }

  if (loading) {
    return (
      <GuideShell guide={guide}>
        <EmptyState text="Đang tải chi tiết chuyến đi..." />
      </GuideShell>
    );
  }

  if (errorMessage || !data) {
    return (
      <GuideShell guide={guide}>
        <section className="rounded-[28px] border border-[#ffd5d1] bg-white p-10 text-center shadow-sm">
          <p className="text-xl font-black text-[#ba1a1a]">
            {errorMessage || "Không tìm thấy chuyến đi được phân công."}
          </p>

          <button
            type="button"
            onClick={() => router.push("/guide")}
            className="mt-6 rounded-2xl bg-[#00606c] px-7 py-3 text-sm font-black !text-white"
          >
            Quay lại danh sách tour
          </button>
        </section>
      </GuideShell>
    );
  }

  const { assignment, passengers, pickupPoints, itineraryDays } = data;

  return (
    <GuideShell guide={guide}>
      <section className="space-y-7 pb-24 xl:pb-0">
        <section className="relative overflow-hidden rounded-[34px] border border-[#dfe8ea] bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
          <div className="relative h-[330px] overflow-hidden">
            <img
              src={assignment.featuredImageUrl || "/images/tours/dalat-cover.jpg"}
              alt={assignment.tourName}
              className="h-full w-full object-cover"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />

            <button
              type="button"
              onClick={() => router.push("/guide")}
              className="absolute left-6 top-6 rounded-full bg-white/90 px-4 py-2 text-sm font-black text-[#00606c] backdrop-blur transition hover:bg-white"
            >
              ← Quay lại
            </button>

            <div className="absolute bottom-7 left-7 right-7 flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
              <div>
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-[#9defff] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#001f24]">
                    {statusText(assignment.operationStatus)}
                  </span>

                  <span className="rounded-full bg-white/20 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] !text-white backdrop-blur">
                    {assignment.departureCode || assignment.tourCode}
                  </span>
                </div>

                <p className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] !text-white/80">
                  <LocationIcon />
                  {assignment.destinationName ||
                    assignment.destinationCity ||
                    "Điểm đến đang cập nhật"}
                </p>

                <h1 className="max-w-5xl text-3xl font-black leading-tight tracking-[-0.04em] !text-white md:text-5xl">
                  {assignment.tourName}
                </h1>

                <p className="mt-3 text-base font-semibold !text-white/85">
                  {formatDate(assignment.startDate)} -{" "}
                  {formatDate(assignment.endDate)} • {assignment.durationDays} ngày{" "}
                  {assignment.durationNights} đêm
                </p>
              </div>

              <div className="grid w-full grid-cols-3 gap-3 rounded-[26px] bg-white/16 p-4 backdrop-blur-md xl:w-[360px]">
                <HeroMetric label="Khách" value={String(passengers.length)} />
                <HeroMetric label="Điểm đón" value={String(pickupPoints.length)} />
                <HeroMetric label="Vấn đề" value={String(incidentLogs.length)} />
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <QuickActionCard
            color="primary"
            title="Cập nhật tình hình"
            desc="Ghi nhận trạng thái thực tế của chuyến đi."
            onClick={() => setActiveTab("REPORTS")}
          />

          <QuickActionCard
            color="danger"
            title="Báo cáo phát sinh"
            desc="Gửi vấn đề khẩn hoặc sự cố trong quá trình đi tour."
            onClick={() => setActiveTab("REPORTS")}
          />

          <div className="rounded-[28px] border border-[#dfe8ea] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-[#ddf9ff] text-[#00606c]">
                <MapIcon />
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6e797b]">
                  Điểm tập trung
                </p>
                <p className="mt-1 text-lg font-black text-[#172124]">
                  {pickupPoints[0]?.pointName || "Chưa có điểm đón"}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-7 xl:grid-cols-[1fr_420px]">
          <div className="rounded-[32px] border border-[#dfe8ea] bg-white p-5 shadow-sm md:p-7">
            <div className="mb-7 flex flex-wrap gap-2">
              <TabButton
                active={activeTab === "ITINERARY"}
                onClick={() => setActiveTab("ITINERARY")}
              >
                Lộ trình
              </TabButton>

              <TabButton
                active={activeTab === "PASSENGERS"}
                onClick={() => setActiveTab("PASSENGERS")}
              >
                Hành khách
              </TabButton>

              <TabButton
                active={activeTab === "PICKUPS"}
                onClick={() => setActiveTab("PICKUPS")}
              >
                Điểm đón
              </TabButton>

              <TabButton
                active={activeTab === "REPORTS"}
                onClick={() => setActiveTab("REPORTS")}
              >
                Điều phối
              </TabButton>
            </div>

            {activeTab === "ITINERARY" ? (
              <ItineraryPanel
                days={itineraryDays}
                activityMap={activityMap}
              />
            ) : activeTab === "PASSENGERS" ? (
              <PassengerPanel passengers={passengers} />
            ) : activeTab === "PICKUPS" ? (
              <PickupPanel pickupPoints={pickupPoints} />
            ) : (
              <ReportPanel
                operationStatus={operationStatus}
                setOperationStatus={setOperationStatus}
                statusNote={statusNote}
                setStatusNote={setStatusNote}
                updatingStatus={updatingStatus}
                handleUpdateStatus={handleUpdateStatus}
                issueType={issueType}
                setIssueType={setIssueType}
                severity={severity}
                setSeverity={setSeverity}
                issueTitle={issueTitle}
                setIssueTitle={setIssueTitle}
                issueDescription={issueDescription}
                setIssueDescription={setIssueDescription}
                sendingIncident={sendingIncident}
                handleCreateIncident={handleCreateIncident}
              />
            )}
          </div>

          <aside className="space-y-5">
            <section className="rounded-[32px] border border-[#dfe8ea] bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-xl font-black text-[#00606c]">
                  Thống kê đoàn
                </h2>

                <span className="rounded-full bg-[#ddf9ff] px-3 py-1 text-xs font-black text-[#00606c]">
                  Live
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <StatBox label="Hành khách" value={String(passengers.length)} />
                <StatBox
                  label="Đặc biệt"
                  value={String(specialPassengers.length)}
                  orange
                />
                <StatBox label="Điểm đón" value={String(pickupPoints.length)} />
                <StatBox label="Nhật ký" value={String(data.logs.length)} />
              </div>
            </section>

            <section className="rounded-[32px] border border-[#dfe8ea] bg-white p-6 shadow-sm">
              <h2 className="mb-5 text-xl font-black text-[#00606c]">
                Khách cần lưu ý
              </h2>

              {specialPassengers.length === 0 ? (
                <p className="rounded-2xl bg-[#f7fbfc] p-4 text-sm font-semibold text-[#6e797b]">
                  Chưa có yêu cầu đặc biệt.
                </p>
              ) : (
                <div className="space-y-3">
                  {specialPassengers.slice(0, 4).map((p) => (
                    <div
                      key={p.id}
                      className="rounded-2xl border border-[#ffdcb8] bg-[#fff7ed] p-4"
                    >
                      <p className="font-black text-[#172124]">{p.fullName}</p>
                      <p className="mt-1 text-sm font-semibold text-[#9b4500]">
                        {[p.mealNote, p.healthNote, p.roomPreference]
                          .filter(Boolean)
                          .join(" • ")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-[32px] border border-[#dfe8ea] bg-white p-6 shadow-sm">
              <h2 className="mb-5 text-xl font-black text-[#00606c]">
                Nhật ký mới nhất
              </h2>

              {data.logs.length === 0 ? (
                <p className="rounded-2xl bg-[#f7fbfc] p-4 text-sm font-semibold text-[#6e797b]">
                  Chưa có nhật ký điều hành.
                </p>
              ) : (
                <div className="space-y-3">
                  {data.logs.slice(0, 4).map((log) => (
                    <LogItem key={log.id} log={log} />
                  ))}
                </div>
              )}
            </section>
          </aside>
        </section>
      </section>
    </GuideShell>
  );
}

function ItineraryPanel({
  days,
  activityMap,
}: {
  days: GuideTripDetail["itineraryDays"];
  activityMap: Record<string, GuideActivity[]>;
}) {
  if (days.length === 0) {
    return <EmptyState text="Chưa có lịch trình cho chuyến đi này." />;
  }

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-black text-[#00606c]">
          <RouteIcon />
          Lộ trình chi tiết
        </h2>

        <span className="rounded-full bg-[#ddf9ff] px-3 py-1 text-xs font-black text-[#00606c]">
          {days.length} ngày
        </span>
      </div>

      <div className="relative space-y-0 before:absolute before:bottom-4 before:left-[18px] before:top-4 before:w-[2px] before:bg-[#d7eef2]">
        {days.map((day) => (
          <div key={day.id} className="relative pb-8 pl-14 last:pb-0">
            <div className="absolute left-0 top-1 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-[#00606c] text-sm font-black !text-white shadow-md">
              {day.dayNo}
            </div>

            <div className="rounded-[24px] bg-[#f7fbfc] p-5 transition hover:bg-[#eef7f9]">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#9b4500]">
                Ngày {day.dayNo}
              </p>

              <h3 className="mt-2 text-lg font-black text-[#172124]">
                {day.title || `Ngày ${day.dayNo}`}
              </h3>

              <p className="mt-2 whitespace-pre-line text-sm leading-7 text-[#3e494b]">
                {day.description || "Đang cập nhật nội dung lịch trình."}
              </p>

              {activityMap[day.id]?.length ? (
                <div className="mt-4 space-y-3">
                  {activityMap[day.id].map((activity) => (
                    <div
                      key={activity.id}
                      className="rounded-2xl border border-[#dfe8ea] bg-white p-4"
                    >
                      <p className="text-sm font-black text-[#00606c]">
                        {activity.activityTime
                          ? `${activity.activityTime} • `
                          : ""}
                        {activity.activityTitle}
                      </p>

                      <p className="mt-1 text-xs font-semibold text-[#6e797b]">
                        {activity.locationName || "Chưa cập nhật địa điểm"}
                      </p>

                      {activity.description ? (
                        <p className="mt-2 text-sm leading-6 text-[#3e494b]">
                          {activity.description}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function PassengerPanel({ passengers }: { passengers: GuidePassenger[] }) {
  if (passengers.length === 0) {
    return <EmptyState text="Chưa có danh sách hành khách." />;
  }

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-black text-[#00606c]">
          <GroupIcon />
          Danh sách hành khách
        </h2>

        <span className="rounded-full bg-[#ddf9ff] px-3 py-1 text-xs font-black text-[#00606c]">
          {passengers.length} khách
        </span>
      </div>

      <div className="space-y-4">
        {passengers.map((passenger) => (
          <div
            key={passenger.id}
            className="rounded-[24px] border-l-4 border-[#00606c] bg-[#f7fbfc] p-5 shadow-sm"
          >
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div className="flex gap-4">
                <div className="flex h-13 w-13 items-center justify-center rounded-full bg-[#ddf9ff] text-base font-black text-[#00606c]">
                  {getInitials(passenger.fullName)}
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-black text-[#172124]">
                      {passenger.fullName}
                    </h3>

                    {passenger.isBookingContact ? (
                      <span className="rounded-full bg-[#9defff] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#001f24]">
                        Liên hệ chính
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-1 text-sm font-semibold text-[#6e797b]">
  {passengerTypeText(passenger.passengerType)}
  {passenger.bookingCode ? ` • Booking ${passenger.bookingCode}` : ""}
</p>
                </div>
              </div>

              {(passenger.mealNote ||
                passenger.healthNote ||
                passenger.roomPreference) && (
                <span className="w-fit rounded-full bg-[#fff0ef] px-3 py-1.5 text-xs font-black text-[#ba1a1a]">
                  Có lưu ý đặc biệt
                </span>
              )}
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
              <InfoLine label="Số điện thoại" value={passenger.phone} />
              <InfoLine label="Email" value={passenger.email} />
              <InfoLine
                label="Giấy tờ"
                value={passenger.idNumber || passenger.passportNumber}
              />
              <InfoLine label="Ăn uống" value={passenger.mealNote} />
              <InfoLine label="Sức khỏe" value={passenger.healthNote} />
              <InfoLine label="Phòng" value={passenger.roomPreference} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function PickupPanel({
  pickupPoints,
}: {
  pickupPoints: GuideTripDetail["pickupPoints"];
}) {
  if (pickupPoints.length === 0) {
    return <EmptyState text="Chưa có điểm đón cho chuyến đi này." />;
  }

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-black text-[#00606c]">
          <MapIcon />
          Điểm đón / trả khách
        </h2>

        <span className="rounded-full bg-[#ddf9ff] px-3 py-1 text-xs font-black text-[#00606c]">
          {pickupPoints.length} điểm
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {pickupPoints.map((point) => (
          <div
            key={point.id}
            className="rounded-[24px] border border-[#dfe8ea] bg-[#f7fbfc] p-5"
          >
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#9b4500]">
                  {point.pointType || "PICKUP"}
                </p>

                <h3 className="mt-2 text-xl font-black text-[#172124]">
                  {point.pointName}
                </h3>

                <p className="mt-2 text-sm leading-7 text-[#3e494b]">
                  {point.address}
                </p>
              </div>

              <span className="w-fit rounded-full bg-white px-4 py-2 text-sm font-black text-[#00606c] shadow-sm">
                {point.passengerCount || 0} khách
              </span>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4">
              <InfoLine label="Giờ đón" value={formatDateTime(point.pickupTime)} />
              <InfoLine label="Giờ trả" value={formatDateTime(point.dropoffTime)} />
              <InfoLine label="Booking" value={String(point.bookingCount || 0)} />
              <InfoLine label="Tỉnh/TP" value={point.province} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ReportPanel({
  operationStatus,
  setOperationStatus,
  statusNote,
  setStatusNote,
  updatingStatus,
  handleUpdateStatus,
  issueType,
  setIssueType,
  severity,
  setSeverity,
  issueTitle,
  setIssueTitle,
  issueDescription,
  setIssueDescription,
  sendingIncident,
  handleCreateIncident,
}: {
  operationStatus: string;
  setOperationStatus: (value: string) => void;
  statusNote: string;
  setStatusNote: (value: string) => void;
  updatingStatus: boolean;
  handleUpdateStatus: () => void;
  issueType: string;
  setIssueType: (value: string) => void;
  severity: string;
  setSeverity: (value: string) => void;
  issueTitle: string;
  setIssueTitle: (value: string) => void;
  issueDescription: string;
  setIssueDescription: (value: string) => void;
  sendingIncident: boolean;
  handleCreateIncident: () => void;
}) {
  return (
    <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="rounded-[26px] bg-[#f7fbfc] p-6">
        <h2 className="mb-5 text-xl font-black text-[#00606c]">
          Cập nhật tình trạng
        </h2>

        <FieldLabel label="Trạng thái chuyến đi">
          <select
            value={operationStatus}
            onChange={(e) => setOperationStatus(e.target.value)}
            className="w-full rounded-2xl border border-[#dfe8ea] bg-white px-4 py-3 text-sm font-bold outline-none focus:border-[#00606c]"
          >
            <option value="PREPARING">Đang chuẩn bị</option>
            <option value="CONFIRMED">Đã xác nhận</option>
            <option value="PICKING_UP">Đang đón khách</option>
            <option value="ON_TOUR">Đang đi tour</option>
            <option value="COMPLETED">Hoàn thành</option>
            <option value="CANCELLED">Đã hủy</option>
          </select>
        </FieldLabel>

        <FieldLabel label="Ghi chú">
          <textarea
            value={statusNote}
            onChange={(e) => setStatusNote(e.target.value)}
            rows={5}
            placeholder="VD: Đã đón đủ khách tại điểm đón đầu tiên..."
            className="w-full rounded-2xl border border-[#dfe8ea] bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-[#00606c]"
          />
        </FieldLabel>

        <button
          type="button"
          onClick={handleUpdateStatus}
          disabled={updatingStatus}
          className="mt-4 w-full rounded-2xl bg-[#00606c] px-6 py-3 text-sm font-black !text-white shadow-[0_12px_26px_rgba(0,96,108,0.2)] transition hover:bg-[#007b8a] disabled:opacity-60"
        >
          {updatingStatus ? "Đang cập nhật..." : "Cập nhật tình trạng"}
        </button>
      </div>

      <div className="rounded-[26px] bg-[#fff7ed] p-6">
        <h2 className="mb-5 text-xl font-black text-[#9b4500]">
          Báo cáo vấn đề phát sinh
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FieldLabel label="Loại vấn đề">
            <select
              value={issueType}
              onChange={(e) => setIssueType(e.target.value)}
              className="w-full rounded-2xl border border-[#ffdcb8] bg-white px-4 py-3 text-sm font-bold outline-none focus:border-[#9b4500]"
            >
              <option value="CUSTOMER">Khách hàng</option>
              <option value="TRANSPORT">Phương tiện</option>
              <option value="HOTEL">Khách sạn</option>
              <option value="ITINERARY">Lịch trình</option>
              <option value="PAYMENT">Thanh toán</option>
              <option value="OTHER">Khác</option>
            </select>
          </FieldLabel>

          <FieldLabel label="Mức độ">
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="w-full rounded-2xl border border-[#ffdcb8] bg-white px-4 py-3 text-sm font-bold outline-none focus:border-[#9b4500]"
            >
              <option value="LOW">Thấp</option>
              <option value="NORMAL">Bình thường</option>
              <option value="HIGH">Cao</option>
              <option value="URGENT">Khẩn cấp</option>
            </select>
          </FieldLabel>
        </div>

        <FieldLabel label="Tiêu đề vấn đề">
          <input
            value={issueTitle}
            onChange={(e) => setIssueTitle(e.target.value)}
            placeholder="VD: Khách bị thất lạc hành lý"
            className="w-full rounded-2xl border border-[#ffdcb8] bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-[#9b4500]"
          />
        </FieldLabel>

        <FieldLabel label="Mô tả chi tiết">
          <textarea
            value={issueDescription}
            onChange={(e) => setIssueDescription(e.target.value)}
            rows={4}
            placeholder="Nhập nội dung báo cáo..."
            className="w-full rounded-2xl border border-[#ffdcb8] bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-[#9b4500]"
          />
        </FieldLabel>

        <button
          type="button"
          onClick={handleCreateIncident}
          disabled={sendingIncident}
          className="mt-4 w-full rounded-2xl bg-[#9b4500] px-6 py-3 text-sm font-black !text-white shadow-[0_12px_26px_rgba(155,69,0,0.2)] transition hover:bg-[#7a3500] disabled:opacity-60"
        >
          {sendingIncident ? "Đang gửi..." : "Gửi báo cáo"}
        </button>
      </div>
    </section>
  );
}

function QuickActionCard({
  color,
  title,
  desc,
  onClick,
}: {
  color: "primary" | "danger";
  title: string;
  desc: string;
  onClick: () => void;
}) {
  const isDanger = color === "danger";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-between rounded-[28px] p-6 text-left shadow-sm transition hover:scale-[1.01] ${
        isDanger ? "bg-[#9b4500]" : "bg-[#00606c]"
      }`}
    >
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] !text-white/70">
          Hành động nhanh
        </p>
        <p className="mt-2 text-lg font-black !text-white">{title}</p>
        <p className="mt-1 text-sm font-semibold !text-white/75">{desc}</p>
      </div>

      <span className="text-2xl font-black !text-white">→</span>
    </button>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/16 p-3 text-center">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] !text-white/65">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black !text-white">{value}</p>
    </div>
  );
}

function StatBox({
  label,
  value,
  orange = false,
}: {
  label: string;
  value: string;
  orange?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-[#f7fbfc] p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#91a0a4]">
        {label}
      </p>
      <p
        className={`mt-1 text-3xl font-black ${
          orange ? "text-[#9b4500]" : "text-[#00606c]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function InfoLine({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div className="rounded-2xl bg-white p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#91a0a4]">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-[#172124]">
        {value || "Chưa cập nhật"}
      </p>
    </div>
  );
}

function FieldLabel({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="mb-4 block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-[#3e494b]">
        {label}
      </span>
      {children}
    </label>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-2xl bg-[#00606c] px-5 py-3 text-sm font-black !text-white shadow-[0_12px_26px_rgba(0,96,108,0.18)]"
          : "rounded-2xl bg-[#f1f4f5] px-5 py-3 text-sm font-black text-[#3e494b] transition hover:bg-[#e5e9ea]"
      }
    >
      {children}
    </button>
  );
}

function LogItem({ log }: { log: GuideOperationLog }) {
  return (
    <div className="rounded-2xl bg-[#f7fbfc] p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#9b4500]">
        {formatDateTime(log.logTime)}
      </p>
      <p className="mt-2 whitespace-pre-line text-sm font-semibold leading-6 text-[#3e494b]">
        {log.content}
      </p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-[26px] border border-[#dfe8ea] bg-white p-10 text-center">
      <p className="font-black text-[#00606c]">{text}</p>
    </div>
  );
}

function LocationIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function RouteIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 19c5-8 11 2 16-6M4 5h.01M20 5h.01M4 19h.01M20 13h.01" />
    </svg>
  );
}

function GroupIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9.5 11A3.5 3.5 0 1 0 9.5 4a3.5 3.5 0 0 0 0 7ZM20 8v6M17 11h6" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 18 3 21V6l6-3 6 3 6-3v15l-6 3-6-3Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v15M15 6v15" />
    </svg>
  );
}