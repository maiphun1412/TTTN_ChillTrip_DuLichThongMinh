"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Filter,
  User,
  Users,
  ArrowRight,
  MapPin,
  Maximize,
  Headphones,
  Download,
  ClipboardList,
  Search,
  Utensils,
  MessageCircle,
  Plus,
  Route,
  XCircle,
  Phone,
  Copy,
  FileText,
} from "lucide-react";

const API_BASE_URL = "/backend-api";

type ScheduleItem = {
  id: string | number;
  departure_code: string;
  start_date: string;
  end_date: string;
  max_seats: number;
  available_seats: number;
  booked_seats: number;
  booking_status: string;
  tour_id: string | number;
  tour_code: string;
  tour_name: string;
  tour_type?: string | null;
  featured_image_url?: string | null;
  guide_id?: string | number | null;
  guide_name?: string | null;
  guide_phone?: string | null;
  passenger_count: number;
};

type ItineraryDay = {
  id: string | number;
  day_no: number;
  title?: string | null;
  description?: string | null;
  overnight_location?: string | null;
};

type ItineraryActivity = {
  id: string | number;
  itinerary_day_id: string | number;
  activity_time?: string | null;
  activity_title?: string | null;
  location_name?: string | null;
  description?: string | null;
};

type ScheduleGuest = {
  id: string | number;
  full_name: string;
  passenger_type: string;
  phone?: string | null;
  email?: string | null;
  passport_number?: string | null;
  id_number?: string | null;
  meal_note?: string | null;
  health_note?: string | null;
  room_preference?: string | null;
  booking_code: string;
  contact_phone?: string | null;
};

type ReportForm = {
  reportStatus: string;
  currentLocation: string;
  content: string;
  presentCount: string;
  absentCount: string;
  issueType: string;
  priorityLevel: string;
  handledAction: string;
  nextAction: string;
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("vi-VN");
}

function formatTime(value?: string | null) {
  if (!value) return "";
  return String(value).slice(0, 5);
}

function getInitials(name?: string | null) {
  if (!name) return "KH";

  return name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function escapeCSV(value: string | number | null | undefined) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export default function AdminSchedule() {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [selectedDepartureId, setSelectedDepartureId] = useState<
    string | number | null
  >(null);
  const [itineraryDays, setItineraryDays] = useState<ItineraryDay[]>([]);
  const [activities, setActivities] = useState<ItineraryActivity[]>([]);
  const [guests, setGuests] = useState<ScheduleGuest[]>([]);
  const [loading, setLoading] = useState(true);

  const [showFilterPopup, setShowFilterPopup] = useState(false);
  const [showGuidePopup, setShowGuidePopup] = useState(false);
  const [showExportPopup, setShowExportPopup] = useState(false);
  const [showReportPopup, setShowReportPopup] = useState(false);

  const [guestKeyword, setGuestKeyword] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterKeyword, setFilterKeyword] = useState("");

  const [reportForm, setReportForm] = useState<ReportForm>({
  reportStatus: "Bình thường",
  currentLocation: "",
  content: "",
  presentCount: "",
  absentCount: "",
  issueType: "",
  priorityLevel: "MEDIUM",
  handledAction: "",
  nextAction: "",
});

  async function loadSchedules() {
    try {
      setLoading(true);

      const params = new URLSearchParams();

      if (filterDate) params.set("date", filterDate);
      if (filterStatus) params.set("status", filterStatus);
      if (filterKeyword.trim()) params.set("keyword", filterKeyword.trim());

      const query = params.toString();
      const url = query
        ? `${API_BASE_URL}/admin/schedules/today?${query}`
        : `${API_BASE_URL}/admin/schedules/today`;

      const res = await fetch(url, {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("LOAD_SCHEDULES_ERROR:", res.status, text);
        setSchedules([]);
        return;
      }

      const json = await res.json();
      const items = json.data || [];

      setSchedules(items);

      if (items.length > 0) {
        setSelectedDepartureId(items[0].id);
      } else {
        setSelectedDepartureId(null);
        setItineraryDays([]);
        setActivities([]);
        setGuests([]);
      }
    } catch (error) {
      console.error("LOAD_SCHEDULES_ERROR:", error);
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadScheduleDetail(departureId: string | number) {
    try {
      const [itineraryRes, guestsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/schedules/${departureId}/itinerary`, {
          method: "GET",
          cache: "no-store",
        }),
        fetch(`${API_BASE_URL}/admin/schedules/${departureId}/guests`, {
          method: "GET",
          cache: "no-store",
        }),
      ]);

      if (itineraryRes.ok) {
        const json = await itineraryRes.json();
        setItineraryDays(json.data?.days || []);
        setActivities(json.data?.activities || []);
      } else {
        setItineraryDays([]);
        setActivities([]);
      }

      if (guestsRes.ok) {
        const json = await guestsRes.json();
        setGuests(json.data || []);
      } else {
        setGuests([]);
      }
    } catch (error) {
      console.error("LOAD_SCHEDULE_DETAIL_ERROR:", error);
      setItineraryDays([]);
      setActivities([]);
      setGuests([]);
    }
  }

  async function handleSubmitReport() {
    if (!selectedDepartureId) {
      alert("Vui lòng chọn đợt khởi hành");
      return;
    }

    if (!reportForm.content.trim()) {
      alert("Vui lòng nhập nội dung báo cáo");
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE_URL}/admin/schedules/${selectedDepartureId}/reports`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reportStatus: reportForm.reportStatus,
            currentLocation: reportForm.currentLocation,
            content: reportForm.content,
            presentCount: reportForm.presentCount,
            absentCount: reportForm.absentCount,
            issueType: reportForm.issueType,
priorityLevel: reportForm.priorityLevel,
handledAction: reportForm.handledAction,
nextAction: reportForm.nextAction,
          }),
        }
      );

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        alert(json?.message || "Gửi báo cáo thất bại");
        return;
      }

      setShowReportPopup(false);
      setReportForm({
  reportStatus: "Bình thường",
  currentLocation: "",
  content: "",
  presentCount: "",
  absentCount: "",
  issueType: "",
  priorityLevel: "MEDIUM",
  handledAction: "",
  nextAction: "",
});

      alert("Đã gửi báo cáo tình hình đoàn");
    } catch (error) {
      console.error("SUBMIT_REPORT_ERROR:", error);
      alert("Không thể gửi báo cáo");
    }
  }

  useEffect(() => {
    loadSchedules();
  }, []);

  useEffect(() => {
    if (selectedDepartureId) {
      loadScheduleDetail(selectedDepartureId);
    }
  }, [selectedDepartureId]);

  const selectedSchedule = schedules.find(
    (item) => String(item.id) === String(selectedDepartureId)
  );

  const filteredGuests = useMemo(() => {
    const keyword = guestKeyword.trim().toLowerCase();

    if (!keyword) return guests;

    return guests.filter((guest) => {
      const text = [
        guest.full_name,
        guest.phone,
        guest.contact_phone,
        guest.email,
        guest.passport_number,
        guest.id_number,
        guest.booking_code,
        guest.meal_note,
        guest.health_note,
        guest.room_preference,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return text.includes(keyword);
    });
  }, [guests, guestKeyword]);

  const timelineItems = useMemo(() => {
    return itineraryDays.flatMap((day) => {
      const dayActivities = activities.filter(
        (item) => String(item.itinerary_day_id) === String(day.id)
      );

      if (dayActivities.length === 0) {
        return [
          {
            time: `Ngày ${day.day_no}`,
            title: day.title || `Ngày ${day.day_no}`,
            desc: day.description || "",
            status: "waiting",
          },
        ];
      }

      return dayActivities.map((activity, index) => ({
        time: activity.activity_time
          ? formatTime(activity.activity_time)
          : `Ngày ${day.day_no}`,
        title: activity.activity_title || day.title || `Ngày ${day.day_no}`,
        desc: activity.description || activity.location_name || "",
        status: index === 0 ? "active" : "waiting",
      }));
    });
  }, [itineraryDays, activities]);

  function handleApplyFilter() {
    setShowFilterPopup(false);
    loadSchedules();
  }

  function handleResetFilter() {
    setFilterDate("");
    setFilterStatus("");
    setFilterKeyword("");
    setShowFilterPopup(false);

    setTimeout(() => {
      loadSchedules();
    }, 0);
  }

  function handleCopyGuidePhone() {
    if (!selectedSchedule?.guide_phone) return;

    navigator.clipboard.writeText(selectedSchedule.guide_phone);
    alert("Đã sao chép số điện thoại HDV");
  }

  function handleExportCSV() {
    const startDateStr = selectedSchedule?.start_date
      ? new Date(selectedSchedule.start_date).toLocaleDateString("vi-VN").replace(/\//g, "-")
      : "";
    const filename = `danh-sach-khach-${selectedSchedule?.departure_code || "tour"}${
      startDateStr ? `-khoi-hanh-${startDateStr}` : ""
    }.csv`;

    const rows = [
      [`DANH SÁCH HÀNH KHÁCH - ĐỢT KHỞI HÀNH ${selectedSchedule?.departure_code || ""}`],
      [`Tour`, selectedSchedule?.tour_name || ""],
      [`Ngày khởi hành`, selectedSchedule?.start_date ? formatDate(selectedSchedule.start_date) : ""],
      [`Ngày lập`, new Date().toLocaleDateString("vi-VN")],
      [],
      [
        "Mã booking",
        "Tên khách",
        "Loại khách",
        "Điện thoại",
        "Email",
        "CMND/CCCD",
        "Passport",
        "Ghi chú ăn uống",
        "Ghi chú sức khỏe",
        "Phòng",
      ],
      ...filteredGuests.map((guest) => [
        guest.booking_code,
        guest.full_name,
        guest.passenger_type === "ADULT" ? "Người lớn" : "Trẻ em",
        guest.phone || guest.contact_phone || "",
        guest.email || "",
        guest.id_number || "",
        guest.passport_number || "",
        guest.meal_note || "",
        guest.health_note || "",
        guest.room_preference || "",
      ]),
    ];

    const csv = rows.map((row) => row.map(escapeCSV).join(",")).join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();

    URL.revokeObjectURL(link.href);
    setShowExportPopup(false);
  }

  function handleExportPDF() {
    const startDateStr = selectedSchedule?.start_date
      ? formatDate(selectedSchedule.start_date)
      : "";
    const rows = filteredGuests
      .map(
        (guest, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${guest.booking_code}</td>
            <td>${guest.full_name}</td>
            <td>${guest.passenger_type === "ADULT" ? "Người lớn" : "Trẻ em"}</td>
            <td>${guest.phone || guest.contact_phone || ""}</td>
            <td>${guest.id_number || guest.passport_number || ""}</td>
            <td>${guest.health_note || guest.meal_note || guest.room_preference || ""}</td>
          </tr>
        `
      )
      .join("");

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      alert("Trình duyệt đang chặn popup. Hãy cho phép popup để xuất PDF.");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="vi">
        <head>
          <meta charset="UTF-8" />
          <title>Danh sách khách hàng ${selectedSchedule?.departure_code || ""} khởi hành ${startDateStr}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              color: #181c1d;
            }
            h1 {
              text-align: center;
              margin-bottom: 4px;
              text-transform: uppercase;
              font-size: 20px;
              color: #00606c;
            }
            .subtitle {
              text-align: center;
              margin-bottom: 24px;
              font-size: 14px;
            }
            .meta {
              margin-bottom: 18px;
              font-size: 13px;
              line-height: 1.8;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
            }
            th, td {
              border: 1px solid #333;
              padding: 7px 8px;
              vertical-align: top;
            }
            th {
              background: #e5e9ea;
              text-align: center;
            }
            .footer {
              margin-top: 30px;
              display: grid;
              grid-template-columns: 1fr 1fr;
              text-align: center;
              gap: 60px;
              font-size: 13px;
            }
            .sign-space {
              height: 70px;
            }
          </style>
        </head>
        <body>
          <h1>Danh sách khách hàng tham gia tour</h1>
          <div class="subtitle">Hệ thống quản trị ChillTrip</div>

          <div class="meta">
            <div><b>Tour:</b> ${selectedSchedule?.tour_name || "-"}</div>
            <div><b>Mã khởi hành:</b> ${
              selectedSchedule?.departure_code || "-"
            }</div>
            <div><b>Ngày khởi hành:</b> ${
              selectedSchedule?.start_date
                ? formatDate(selectedSchedule.start_date)
                : "-"
            }</div>
            <div><b>Hướng dẫn viên:</b> ${
              selectedSchedule?.guide_name || "Chưa phân công"
            }</div>
          </div>

          <table>
            <thead>
              <tr>
                <th>STT</th>
                <th>Mã booking</th>
                <th>Tên khách</th>
                <th>Loại khách</th>
                <th>Liên hệ</th>
                <th>Giấy tờ</th>
                <th>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              ${
                rows ||
                `<tr><td colspan="7" style="text-align:center;">Không có dữ liệu</td></tr>`
              }
            </tbody>
          </table>

          <div class="footer">
            <div>
              <b>Người lập danh sách</b>
              <div class="sign-space"></div>
              <div>(Ký và ghi rõ họ tên)</div>
            </div>
            <div>
              <b>Hướng dẫn viên</b>
              <div class="sign-space"></div>
              <div>(Ký và ghi rõ họ tên)</div>
            </div>
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
    setShowExportPopup(false);
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-[#3e494b]">
            <span>Hệ thống</span>
            <span>/</span>
            <span>Điều hành</span>
            <span>/</span>
            <span className="font-bold text-[#00606c]">Lịch trình</span>
          </div>

          <h2 className="text-3xl font-black tracking-tight text-[#00606c]">
            Lịch trình
          </h2>
          <p className="mt-1 text-[#3e494b]">
            Giám sát và điều hành các tour đang diễn ra trong ngày.
          </p>
        </div>

        <div className="flex w-fit items-center gap-3 rounded-full bg-[#f1f4f5] p-2">
          <button className="flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-sm">
            <CalendarDays size={18} className="text-[#00606c]" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Hôm nay: {new Date().toLocaleDateString("vi-VN")}
            </span>
          </button>

          <button
            onClick={() => setShowFilterPopup(true)}
            className="flex items-center gap-2 rounded-full px-4 py-2 transition hover:bg-[#dfe3e4]"
          >
            <Filter size={18} className="text-[#6e797b]" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Bộ lọc
            </span>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-8 lg:h-[calc(100vh-210px)] lg:overflow-hidden pb-4">
        <section className="col-span-12 space-y-6 lg:col-span-4 lg:h-full lg:overflow-y-auto pr-1">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-bold">
              <span className="h-6 w-2 rounded-full bg-[#9b4500]" />
              Đợt khởi hành ({schedules.length})
            </h3>
            <span className="rounded-full bg-[#00606c]/10 px-3 py-1 text-xs font-bold text-[#00606c]">
              LIVE
            </span>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="rounded-xl bg-white p-6 text-sm font-bold text-[#00606c] shadow-sm">
                Đang tải lịch trình...
              </div>
            ) : schedules.length === 0 ? (
              <div className="rounded-xl bg-white p-6 text-sm font-bold text-[#3e494b] shadow-sm">
                Chưa có đợt khởi hành nào.
              </div>
            ) : (
              schedules.map((trip) => {
                const active =
                  String(selectedDepartureId) === String(trip.id);
                const progress = Math.round(
                  (Number(trip.booked_seats || 0) /
                    Number(trip.max_seats || 1)) *
                    100
                );

                return (
                  <div
                    key={trip.id}
                    onClick={() => setSelectedDepartureId(trip.id)}
                    className={
                      active
                        ? "group relative cursor-pointer overflow-hidden rounded-xl bg-white p-6 shadow-xl shadow-[#00606c]/5 ring-2 ring-[#00606c] transition-all"
                        : "group cursor-pointer rounded-xl bg-[#f1f4f5] p-6 transition-all hover:bg-white"
                    }
                  >
                    {active && (
                      <div className="absolute right-0 top-0 p-3">
                        <span className="relative flex h-3 w-3">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00606c] opacity-75" />
                          <span className="relative inline-flex h-3 w-3 rounded-full bg-[#00606c]" />
                        </span>
                      </div>
                    )}

                    <div className="mb-4">
                      <span
                        className={`text-[10px] font-black tracking-widest ${
                          active ? "text-[#007b8a]" : "text-[#3e494b]"
                        }`}
                      >
                        {trip.departure_code || trip.tour_code}
                      </span>
                      <h4 className="text-lg font-bold leading-tight text-[#181c1d]">
                        {trip.tour_name}
                      </h4>
                      <p className="mt-1 text-xs font-semibold text-[#6e797b]">
                        Khởi hành: {formatDate(trip.start_date)}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-sm">
                        <User
                          size={18}
                          className={
                            active ? "text-[#007b8a]" : "text-[#6e797b]"
                          }
                        />
                        <span className="font-medium">
                          HDV: {trip.guide_name || "Chưa phân công"}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-sm">
                        <Users
                          size={18}
                          className={
                            active ? "text-[#007b8a]" : "text-[#6e797b]"
                          }
                        />
                        <span className="font-medium">
                          {trip.passenger_count || 0} khách hàng
                        </span>
                      </div>
                    </div>

                    <div className="mt-6 border-t border-[#dfe3e4]/60 pt-4">
                      <div className="mb-2 flex justify-between text-[11px] font-bold uppercase">
                        <span>Tiến độ chỗ</span>
                        <span className="text-[#00606c]">{progress}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[#ebeeef]">
                        <div
                          className="h-full bg-[#00606c]"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="col-span-12 space-y-8 lg:col-span-8 lg:h-full lg:overflow-y-auto pr-1 pb-10">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="rounded-xl bg-white p-8 shadow-sm">
              <h3 className="mb-6 flex items-center gap-2 text-xl font-bold">
                <Route size={22} className="text-[#00606c]" />
                Lộ trình hôm nay
              </h3>

              <div className="relative space-y-8 before:absolute before:bottom-2 before:left-3 before:top-2 before:w-[2px] before:bg-[#ebeeef]">
                {timelineItems.length === 0 ? (
                  <div className="rounded-xl bg-[#f1f4f5] p-5 text-sm font-semibold text-[#6e797b]">
                    Tour này chưa có dữ liệu lộ trình.
                  </div>
                ) : (
                  timelineItems.map((item, index) => (
                    <div
                      key={`${item.title}-${index}`}
                      className="relative pl-10"
                    >
                      <div
                        className={`absolute left-0 top-1.5 flex h-6 w-6 items-center justify-center rounded-full ${
                          item.status === "active"
                            ? "bg-[#00606c]"
                            : item.status === "done"
                            ? "bg-[#00606c]/10"
                            : "border border-[#bdc8cb] bg-[#ebeeef]"
                        }`}
                      >
                        {item.status !== "waiting" && (
                          <div
                            className={`h-2 w-2 rounded-full ${
                              item.status === "active"
                                ? "bg-white"
                                : "bg-[#00606c]"
                            }`}
                          />
                        )}
                      </div>

                      <p
                        className={`text-[10px] font-black uppercase ${
                          item.status === "waiting"
                            ? "text-[#6e797b]"
                            : "text-[#00606c]"
                        }`}
                      >
                        {item.time}
                      </p>
                      <p
                        className={`font-bold ${
                          item.status === "waiting"
                            ? "text-[#3e494b]"
                            : "text-[#181c1d]"
                        }`}
                      >
                        {item.title}
                      </p>
                      {item.desc && (
                        <p className="mt-1 text-xs text-[#3e494b]">
                          {item.desc}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="group relative h-64 overflow-hidden rounded-xl bg-white p-6 shadow-sm">
                {selectedSchedule?.featured_image_url ? (
                  <img
                    src={selectedSchedule.featured_image_url}
                    alt={selectedSchedule.tour_name}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-[#9defff] via-[#b3ebff] to-[#f6fafb]" />
                )}

                <div className="absolute inset-0 bg-[#00606c]/25" />

                <div className="relative z-10 flex h-full flex-col justify-between">
                  <div className="flex w-fit items-center gap-2 rounded-full bg-white/90 px-4 py-2 shadow-lg backdrop-blur-md">
                    <MapPin size={18} className="text-[#ba1a1a]" />
                    <span className="text-xs font-bold uppercase tracking-tight">
                      {selectedSchedule?.tour_name || "Chưa chọn tour"}
                    </span>
                  </div>

                  <div className="flex justify-end">
                    <button className="rounded-full bg-[#00606c] p-3 text-white shadow-xl transition hover:scale-110">
                      <Maximize size={20} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setShowGuidePopup(true)}
                  className="group flex flex-col items-center justify-center gap-2 rounded-xl bg-[#f1f4f5] p-4 transition hover:bg-[#00606c]/5"
                >
                  <Headphones
                    size={22}
                    className="text-[#00606c] transition group-hover:scale-110"
                  />
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    Liên hệ HDV
                  </span>
                </button>

                <button
                  onClick={() => setShowExportPopup(true)}
                  className="group flex flex-col items-center justify-center gap-2 rounded-xl bg-[#f1f4f5] p-4 transition hover:bg-[#00606c]/5"
                >
                  <Download
                    size={22}
                    className="text-[#00606c] transition group-hover:scale-110"
                  />
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    Xuất DS Khách
                  </span>
                </button>

                <button
                  onClick={() => {
                    setReportForm((prev) => ({
                      ...prev,
                      presentCount: String(guests.length),
                      absentCount: "0",
                    }));
                    setShowReportPopup(true);
                  }}
                  className="col-span-2 flex items-center justify-center gap-3 rounded-xl bg-[#9b4500] p-4 text-white shadow-lg transition hover:scale-[1.02]"
                >
                  <ClipboardList size={22} />
                  <span className="text-sm font-bold uppercase tracking-widest">
                    Báo cáo nhanh tình hình đoàn
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-[#dfe3e4]/50 bg-[#00606c]/5 px-8 py-6 md:flex-row md:items-center md:justify-between">
              <h3 className="flex items-center gap-2 text-xl font-bold">
                <Users size={22} className="text-[#00606c]" />
                Danh sách khách hàng ({filteredGuests.length})
              </h3>

              <div className="flex items-center rounded-xl border border-[#dfe3e4] bg-white px-3 py-2">
                <Search size={18} className="mr-2 text-[#6e797b]" />
                <input
                  value={guestKeyword}
                  onChange={(e) => setGuestKeyword(e.target.value)}
                  placeholder="Tìm khách, SĐT, giấy tờ..."
                  className="w-64 bg-transparent text-sm outline-none"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[#f1f4f5] text-[10px] font-black uppercase tracking-widest text-[#3e494b]">
                    <th className="px-8 py-4">Tên khách hàng</th>
                    <th className="px-6 py-4">Liên hệ</th>
                    <th className="px-6 py-4">Dịch vụ</th>
                    <th className="px-8 py-4">Ghi chú đặc biệt</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#dfe3e4]/40">
                  {filteredGuests.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-8 py-10 text-center text-sm font-semibold text-[#6e797b]"
                      >
                        Không tìm thấy khách hàng phù hợp.
                      </td>
                    </tr>
                  ) : (
                    filteredGuests.map((guest, index) => {
                      const note =
                        guest.health_note ||
                        guest.meal_note ||
                        guest.room_preference ||
                        "Không có ghi chú";

                      return (
                        <tr
                          key={guest.id}
                          className="transition hover:bg-[#f1f4f5]/40"
                        >
                          <td className="px-8 py-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                                  index === 1
                                    ? "bg-[#ffdbc9] text-[#9b4500]"
                                    : "bg-[#9defff] text-[#00606c]"
                                }`}
                              >
                                {getInitials(guest.full_name)}
                              </div>

                              <div>
                                <p className="text-sm font-bold">
                                  {guest.full_name}
                                </p>
                                <p className="text-[10px] text-[#3e494b]">
                                  {guest.passport_number ||
                                    guest.id_number ||
                                    "Chưa có giấy tờ"}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4 text-sm font-medium">
                            {guest.phone || guest.contact_phone || "-"}
                          </td>

                          <td className="px-6 py-4">
                            <span
                              className={`rounded px-2 py-1 text-[10px] font-bold uppercase ${
                                guest.passenger_type === "ADULT"
                                  ? "bg-[#b3ebff] text-[#004e5f]"
                                  : "bg-[#dfe3e4] text-[#3e494b]"
                              }`}
                            >
                              {guest.passenger_type === "ADULT"
                                ? "Người lớn"
                                : "Trẻ em"}
                            </span>
                          </td>

                          <td className="px-8 py-4">
                            {note !== "Không có ghi chú" ? (
                              <div className="flex items-center gap-2 text-xs font-bold text-[#9b4500]">
                                <Utensils size={16} />
                                {note}
                              </div>
                            ) : (
                              <p className="text-xs italic text-[#3e494b]/60">
                                Không có ghi chú
                              </p>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      {showFilterPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-[2rem] bg-white p-8 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-2xl font-black text-[#00606c]">
                Bộ lọc lịch trình
              </h3>
              <button
                onClick={() => setShowFilterPopup(false)}
                className="rounded-full bg-[#f1f4f5] p-2"
              >
                <XCircle size={22} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-black uppercase text-[#6e797b]">
                  Ngày khởi hành
                </label>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-full rounded-2xl border border-[#bdc8cb]/40 px-4 py-3 outline-none focus:ring-4 focus:ring-[#007B8A]/10"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-black uppercase text-[#6e797b]">
                  Trạng thái
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full rounded-2xl border border-[#bdc8cb]/40 px-4 py-3 outline-none focus:ring-4 focus:ring-[#007B8A]/10"
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="OPEN">Đang mở</option>
                  <option value="CLOSED">Đã đóng</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-black uppercase text-[#6e797b]">
                  Từ khóa
                </label>
                <input
                  value={filterKeyword}
                  onChange={(e) => setFilterKeyword(e.target.value)}
                  placeholder="Tên tour, mã tour, mã khởi hành, HDV..."
                  className="w-full rounded-2xl border border-[#bdc8cb]/40 px-4 py-3 outline-none focus:ring-4 focus:ring-[#007B8A]/10"
                />
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button
                onClick={handleResetFilter}
                className="rounded-full bg-[#f1f4f5] px-6 py-3 font-bold text-[#3e494b]"
              >
                Xóa lọc
              </button>
              <button
                onClick={handleApplyFilter}
                className="rounded-full bg-[#007B8A] px-6 py-3 font-bold text-white"
              >
                Áp dụng
              </button>
            </div>
          </div>
        </div>
      )}

      {showGuidePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-2xl font-black text-[#00606c]">
                Liên hệ hướng dẫn viên
              </h3>
              <button
                onClick={() => setShowGuidePopup(false)}
                className="rounded-full bg-[#f1f4f5] p-2"
              >
                <XCircle size={22} />
              </button>
            </div>

            {selectedSchedule?.guide_name ? (
              <div className="space-y-4">
                <div className="rounded-2xl bg-[#f1f4f5] p-5">
                  <p className="text-xs font-black uppercase text-[#6e797b]">
                    Hướng dẫn viên
                  </p>
                  <p className="text-xl font-black text-[#007B8A]">
                    {selectedSchedule.guide_name}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#f1f4f5] p-5">
                  <p className="text-xs font-black uppercase text-[#6e797b]">
                    Số điện thoại
                  </p>
                  <p className="text-lg font-bold">
                    {selectedSchedule.guide_phone || "Chưa có số điện thoại"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <a
                    href={
                      selectedSchedule.guide_phone
                        ? `tel:${selectedSchedule.guide_phone}`
                        : "#"
                    }
                    className="flex items-center justify-center gap-2 rounded-full bg-[#007B8A] px-5 py-3 font-bold text-white"
                  >
                    <Phone size={17} />
                    Gọi ngay
                  </a>

                  <button
                    onClick={handleCopyGuidePhone}
                    className="flex items-center justify-center gap-2 rounded-full bg-[#f1f4f5] px-5 py-3 font-bold text-[#3e494b]"
                  >
                    <Copy size={17} />
                    Sao chép
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-[#ffdbc9]/40 p-5 text-sm font-semibold text-[#763300]">
                Đợt khởi hành này chưa được phân công hướng dẫn viên.
              </div>
            )}
          </div>
        </div>
      )}

      {showExportPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-2xl font-black text-[#00606c]">
                Xuất danh sách khách
              </h3>
              <button
                onClick={() => setShowExportPopup(false)}
                className="rounded-full bg-[#f1f4f5] p-2"
              >
                <XCircle size={22} />
              </button>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleExportCSV}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#007B8A] px-5 py-4 font-black text-white"
              >
                <Download size={19} />
                Xuất file CSV
              </button>

              <button
                onClick={handleExportPDF}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#f1f4f5] px-5 py-4 font-black text-[#00606c]"
              >
                <FileText size={19} />
                Xem trước / In PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {showReportPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-[2rem] bg-white p-8 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-2xl font-black text-[#00606c]">
                Báo cáo nhanh tình hình đoàn
              </h3>
              <button
                onClick={() => setShowReportPopup(false)}
                className="rounded-full bg-[#f1f4f5] p-2"
              >
                <XCircle size={22} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-black uppercase text-[#6e797b]">
                  Trạng thái đoàn
                </label>
                <select
                  value={reportForm.reportStatus}
                  onChange={(e) =>
                    setReportForm((prev) => ({
                      ...prev,
                      reportStatus: e.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-[#bdc8cb]/40 px-4 py-3 outline-none focus:ring-4 focus:ring-[#007B8A]/10"
                >
                  <option value="Bình thường">Bình thường</option>
                  <option value="Cần hỗ trợ">Cần hỗ trợ</option>
                  <option value="Khẩn cấp">Khẩn cấp</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-black uppercase text-[#6e797b]">
                  Vị trí hiện tại
                </label>
                <input
                  value={reportForm.currentLocation}
                  onChange={(e) =>
                    setReportForm((prev) => ({
                      ...prev,
                      currentLocation: e.target.value,
                    }))
                  }
                  placeholder="Ví dụ: Hạ Long, khách sạn..."
                  className="w-full rounded-2xl border border-[#bdc8cb]/40 px-4 py-3 outline-none focus:ring-4 focus:ring-[#007B8A]/10"
                />


              </div>
              <div>
  <label className="mb-2 block text-xs font-black uppercase text-[#6e797b]">
    Loại vấn đề
  </label>
  <input
    value={reportForm.issueType}
    onChange={(e) =>
      setReportForm((prev) => ({
        ...prev,
        issueType: e.target.value,
      }))
    }
    placeholder="Ví dụ: Say xe, trễ giờ, thất lạc hành lý..."
    className="w-full rounded-2xl border border-[#bdc8cb]/40 px-4 py-3 outline-none focus:ring-4 focus:ring-[#007B8A]/10"
  />
</div>

<div>
  <label className="mb-2 block text-xs font-black uppercase text-[#6e797b]">
    Mức độ ưu tiên
  </label>
  <select
    value={reportForm.priorityLevel}
    onChange={(e) =>
      setReportForm((prev) => ({
        ...prev,
        priorityLevel: e.target.value,
      }))
    }
    className="w-full rounded-2xl border border-[#bdc8cb]/40 px-4 py-3 outline-none focus:ring-4 focus:ring-[#007B8A]/10"
  >
    <option value="LOW">Thấp</option>
    <option value="MEDIUM">Trung bình</option>
    <option value="HIGH">Cao</option>
    <option value="CRITICAL">Khẩn cấp</option>
  </select>
</div>

              <div>
                <label className="mb-2 block text-xs font-black uppercase text-[#6e797b]">
                  Số khách có mặt
                </label>
                <input
                  type="number"
                  value={reportForm.presentCount}
                  onChange={(e) =>
                    setReportForm((prev) => ({
                      ...prev,
                      presentCount: e.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-[#bdc8cb]/40 px-4 py-3 outline-none focus:ring-4 focus:ring-[#007B8A]/10"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-black uppercase text-[#6e797b]">
                  Số khách vắng
                </label>
                <input
                  type="number"
                  value={reportForm.absentCount}
                  onChange={(e) =>
                    setReportForm((prev) => ({
                      ...prev,
                      absentCount: e.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-[#bdc8cb]/40 px-4 py-3 outline-none focus:ring-4 focus:ring-[#007B8A]/10"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-xs font-black uppercase text-[#6e797b]">
                  Nội dung báo cáo
                </label>
                <textarea
                  rows={5}
                  value={reportForm.content}
                  onChange={(e) =>
                    setReportForm((prev) => ({
                      ...prev,
                      content: e.target.value,
                    }))
                  }
                  placeholder="Nhập tình hình hiện tại của đoàn..."
                  className="w-full rounded-2xl border border-[#bdc8cb]/40 px-4 py-3 outline-none focus:ring-4 focus:ring-[#007B8A]/10"
                />
              </div>

              <div className="md:col-span-2">
  <label className="mb-2 block text-xs font-black uppercase text-[#6e797b]">
    Hành động đã xử lý
  </label>
  <textarea
    rows={3}
    value={reportForm.handledAction}
    onChange={(e) =>
      setReportForm((prev) => ({
        ...prev,
        handledAction: e.target.value,
      }))
    }
    placeholder="Ví dụ: HDV đã hỗ trợ khách nghỉ ngơi, gọi xe trung chuyển..."
    className="w-full rounded-2xl border border-[#bdc8cb]/40 px-4 py-3 outline-none focus:ring-4 focus:ring-[#007B8A]/10"
  />
</div>

<div className="md:col-span-2">
  <label className="mb-2 block text-xs font-black uppercase text-[#6e797b]">
    Hướng xử lý tiếp theo
  </label>
  <textarea
    rows={3}
    value={reportForm.nextAction}
    onChange={(e) =>
      setReportForm((prev) => ({
        ...prev,
        nextAction: e.target.value,
      }))
    }
    placeholder="Ví dụ: Tiếp tục theo dõi sức khỏe khách, cập nhật lại sau 30 phút..."
    className="w-full rounded-2xl border border-[#bdc8cb]/40 px-4 py-3 outline-none focus:ring-4 focus:ring-[#007B8A]/10"
  />
</div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button
                onClick={() => setShowReportPopup(false)}
                className="rounded-full bg-[#f1f4f5] px-6 py-3 font-bold text-[#3e494b]"
              >
                Hủy
              </button>
              <button
                onClick={handleSubmitReport}
                className="rounded-full bg-[#007B8A] px-6 py-3 font-bold text-white"
              >
                Gửi báo cáo
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-8 right-8 flex flex-col gap-3">
        <button className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-[#007b8a] text-white shadow-2xl transition hover:scale-110">
          <MessageCircle size={22} />
          <span className="absolute right-full mr-4 whitespace-nowrap rounded-lg bg-[#00606c] px-3 py-1 text-[10px] font-bold uppercase text-white opacity-0 transition group-hover:opacity-100">
            Chat điều hành
          </span>
        </button>

        <button
          onClick={() => {
            setReportForm((prev) => ({
              ...prev,
              presentCount: String(guests.length),
              absentCount: "0",
            }));
            setShowReportPopup(true);
          }}
          className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-[#00606c] text-white shadow-2xl transition hover:scale-110"
        >
          <Plus size={22} />
          <span className="absolute right-full mr-4 whitespace-nowrap rounded-lg bg-[#00606c] px-3 py-1 text-[10px] font-bold uppercase text-white opacity-0 transition group-hover:opacity-100">
            Tạo thông báo khẩn
          </span>
        </button>
      </div>
    </div>
  );
}