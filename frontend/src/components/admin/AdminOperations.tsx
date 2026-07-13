"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BedDouble,
  Bus,
  CalendarClock,
  FileText,
  Handshake,
  Hotel,
  Map,
  MapPin,
  MessageCircle,
  Phone,
  Plane,
  RefreshCcw,
  Search,
  ShipWheel,
  Train,
  Utensils,
  X,
} from "lucide-react";

const API_BASE_URL = "/backend-api";

type Overview = {
  dispatch?: {
    total_dispatches?: string | number;
    active_dispatches?: string | number;
    transport_schedules?: string | number;
    active_pickup_points?: string | number;
  };
  incident?: {
    total_incidents?: string | number;
    open_incidents?: string | number;
    urgent_incidents?: string | number;
  };
  partner?: {
    total_partners?: string | number;
    active_partners?: string | number;
  };
};

type OperationService = {
  id: string | number;
  dispatch_code?: string;
  transport_type?: string | null;
  driver_name?: string | null;
  driver_phone?: string | null;
  vehicle_plate?: string | null;
  pickup_time?: string | null;
  pickup_location?: string | null;
  current_location?: string | null;
  dispatch_status?: string;
  departure_code?: string | null;
  tour_name?: string | null;
  tour_code?: string | null;
  partner_name?: string | null;
  partner_type?: string | null;
  partner_phone?: string | null;
  booked_seats?: string | number | null;
  unit_price?: string | number | null;
};

type Supplier = {
  id: string | number;
  partner_code?: string;
  partner_name?: string;
  partner_type?: string;
  contact_name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  image_url?: string | null;
  status?: string;
};

type Incident = {
  id: string | number;
  incident_code?: string;
  incident_type?: string;
  priority_level?: string;
  title?: string;
  description?: string | null;
  incident_status?: string;
  reported_at?: string;
  tour_name?: string | null;
  tour_code?: string | null;
  departure_code?: string | null;
};

function formatTime(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
}

function formatMoney(value?: string | number | null) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

function getServiceIcon(type?: string | null) {
  switch (type) {
    case "FLIGHT":
      return Plane;
    case "TRAIN":
      return Train;
    case "BOAT":
      return ShipWheel;
    case "HOTEL":
      return Hotel;
    default:
      return Bus;
  }
}

function getSupplierIcon(type?: string) {
  switch (type) {
    case "HOTEL":
      return Hotel;
    case "RESTAURANT":
      return Utensils;
    case "AIRLINE":
      return Plane;
    case "BUS":
      return Bus;
    default:
      return Handshake;
  }
}

function getServiceLabel(type?: string | null) {
  switch (type) {
    case "FLIGHT":
      return "Chuyến bay";
    case "HOTEL":
      return "Lưu trú";
    case "TRAIN":
      return "Tàu";
    case "BOAT":
      return "Tàu/Thuyền";
    case "BUS":
      return "Xe";
    default:
      return "Dịch vụ";
  }
}

function getStatusLabel(status?: string) {
  switch (status) {
    case "PLANNED":
      return "Đã lên kế hoạch";
    case "CONFIRMED":
      return "Đã xác nhận";
    case "IN_PROGRESS":
      return "Đang thực hiện";
    case "COMPLETED":
      return "Hoàn tất";
    case "CANCELLED":
      return "Đã hủy";
    default:
      return status || "-";
  }
}

function getStatusClass(status?: string) {
  switch (status) {
    case "CONFIRMED":
      return "bg-[#9defff]/30 text-[#00606c] border-[#00606c]/20";
    case "IN_PROGRESS":
      return "bg-[#ffdbc9]/50 text-[#9b4500] border-[#9b4500]/20";
    case "COMPLETED":
      return "bg-green-100 text-green-700 border-green-200";
    case "CANCELLED":
      return "bg-[#ffdad6] text-[#93000a] border-[#93000a]/20";
    default:
      return "bg-[#e5e9ea] text-[#3e494b] border-[#bdc8cb]/30";
  }
}

function getSupplierTypeLabel(type?: string) {
  switch (type) {
    case "HOTEL":
      return "Khách sạn";
    case "RESTAURANT":
      return "Nhà hàng";
    case "BUS":
      return "Vận chuyển";
    case "AIRLINE":
      return "Hàng không";
    case "OTHER":
      return "Khác";
    default:
      return type || "-";
  }
}

function getIncidentClass(priority?: string) {
  switch (priority) {
    case "URGENT":
      return "border-[#ba1a1a] bg-[#fff1f0]";
    case "HIGH":
      return "border-[#9b4500] bg-[#fff7f0]";
    default:
      return "border-[#bdc8cb]/30 bg-[#f8fbfc]";
  }
}

export default function AdminOperations() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [services, setServices] = useState<OperationService[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [keyword, setKeyword] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const [showAllServices, setShowAllServices] = useState(false);
  const [showIncident, setShowIncident] = useState(false);
  const [showSuppliers, setShowSuppliers] = useState(false);

  async function loadData() {
    try {
      setLoading(true);

      const [overviewRes, servicesRes, suppliersRes, incidentsRes] =
        await Promise.allSettled([
          fetch(`${API_BASE_URL}/admin/operations/overview`, {
            cache: "no-store",
          }),
          fetch(`${API_BASE_URL}/admin/operations/dispatches`, {
            cache: "no-store",
          }),
          fetch(`${API_BASE_URL}/admin/operations/partners`, {
            cache: "no-store",
          }),
          fetch(`${API_BASE_URL}/admin/operations/incidents`, {
            cache: "no-store",
          }),
        ]);

      if (overviewRes.status === "fulfilled" && overviewRes.value.ok) {
        const json = await overviewRes.value.json();
        setOverview(json.data || null);
      }

      if (servicesRes.status === "fulfilled" && servicesRes.value.ok) {
        const json = await servicesRes.value.json();
        setServices(json.data || []);
      }

      if (suppliersRes.status === "fulfilled" && suppliersRes.value.ok) {
        const json = await suppliersRes.value.json();
        setSuppliers(json.data || []);
      }

      if (incidentsRes.status === "fulfilled" && incidentsRes.value.ok) {
        const json = await incidentsRes.value.json();
        setIncidents(json.data || []);
      }
    } catch (error) {
      console.error("LOAD_OPERATIONS_ERROR:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredServices = useMemo(() => {
    const q = keyword.trim().toLowerCase();

    return services.filter((item) => {
      const matchKeyword =
        !q ||
        String(item.dispatch_code || "").toLowerCase().includes(q) ||
        String(item.tour_name || "").toLowerCase().includes(q) ||
        String(item.tour_code || "").toLowerCase().includes(q) ||
        String(item.partner_name || "").toLowerCase().includes(q) ||
        String(item.vehicle_plate || "").toLowerCase().includes(q);

      const matchType = !typeFilter || item.transport_type === typeFilter;

      return matchKeyword && matchType;
    });
  }, [services, keyword, typeFilter]);

  const stats = {
    vehicleServices: Number(overview?.dispatch?.active_dispatches || 0),
    transportSchedules: Number(overview?.dispatch?.transport_schedules || 0),
    activePickupPoints: Number(overview?.dispatch?.active_pickup_points || 0),
    urgentIncidents: Number(overview?.incident?.urgent_incidents || 0),
    activeSuppliers: Number(overview?.partner?.active_partners || 0),
  };

  const mapItems = filteredServices.slice(0, 5);

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-[#00606c]/70">
            Operations & Logistics
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#00606c]">
            Quản lý Vận hành & Dịch vụ
          </h1>
          <p className="mt-1 text-[#3e494b]">
            Theo dõi xe, chuyến bay, khách sạn, nhà cung cấp và sự cố phát sinh
            theo từng đợt khởi hành.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 rounded-full bg-[#dfe3e4] px-6 py-3 font-bold text-[#00606c] transition hover:bg-[#00606c] hover:text-white"
          >
            <RefreshCcw size={18} className={loading ? "animate-spin" : ""} />
            Cập nhật tình hình
          </button>

          <button
            onClick={() => setShowIncident(true)}
            className="inline-flex items-center gap-2 rounded-full bg-[#ba1a1a] px-6 py-3 font-bold text-white shadow-lg shadow-[#ba1a1a]/20 transition hover:scale-105"
          >
            <AlertTriangle size={18} />
            Xem sự cố
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Dịch vụ xe"
          value={stats.vehicleServices}
          desc="Đang theo dõi"
          icon={Bus}
          tone="primary"
        />

        <KpiCard
          title="Xe / Máy bay"
          value={stats.transportSchedules}
          desc="Lịch vận chuyển"
          icon={Plane}
          tone="tertiary"
        />

        <KpiCard
          title="Điểm đón"
          value={stats.activePickupPoints}
          desc="Có dữ liệu"
          icon={MapPin}
          tone="pickup"
        />

        <KpiCard
          title="Sự cố ưu tiên"
          value={stats.urgentIncidents}
          desc="Cần xử lý"
          icon={AlertTriangle}
          tone="error"
        />
      </section>

      <section className="grid grid-cols-1 gap-8 xl:grid-cols-3">
        <div className="space-y-8 xl:col-span-2">
          <div className="overflow-hidden rounded-[3rem] bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-4 bg-[#e5e9ea]/50 px-6 py-5 md:flex-row md:items-center">
              <h3 className="flex items-center gap-2 font-bold text-[#181c1d]">
                <CalendarClock size={20} className="text-[#00606c]" />
                Dịch vụ vận hành theo đợt khởi hành
              </h3>

              <div className="flex flex-wrap gap-3">
                <div className="flex items-center rounded-full bg-white px-4 py-2 shadow-sm">
                  <Search size={17} className="mr-2 text-[#00606c]" />
                  <input
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="Tìm tour, dịch vụ, nhà cung cấp..."
                    className="w-60 bg-transparent text-sm font-semibold outline-none"
                  />
                </div>

                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="rounded-full bg-white px-4 py-2 text-sm font-bold text-[#00606c] shadow-sm outline-none"
                >
                  <option value="">Tất cả dịch vụ</option>
                  <option value="BUS">Xe</option>
                  <option value="FLIGHT">Máy bay</option>
                  <option value="HOTEL">Khách sạn</option>
                </select>

                <button
                  onClick={() => setShowAllServices(true)}
                  className="text-xs font-black uppercase tracking-widest text-[#00606c] hover:underline"
                >
                  Xem tất cả
                </button>
              </div>
            </div>

            <ServiceTable services={filteredServices.slice(0, 6)} />
          </div>

          <div className="flex h-[400px] flex-col overflow-hidden rounded-[3rem] bg-white shadow-sm">
            <div className="flex shrink-0 justify-between bg-[#e5e9ea]/50 px-6 py-4">
              <h3 className="flex items-center gap-2 font-bold text-[#181c1d]">
                <Map size={20} className="text-[#00606c]" />
                Sơ đồ vận hành dịch vụ
              </h3>

              <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-[#00606c]">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[#00606c]" />
                Theo dõi
              </span>
            </div>

            <div className="relative flex-1 overflow-hidden bg-[#dfe3e4]">
              <img
                alt="Bản đồ vận hành"
                src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=1600&q=80"
                className="h-full w-full object-cover grayscale-[20%] sepia-[10%] brightness-[1.05]"
              />

              {mapItems.map((item, index) => {
                const Icon = getServiceIcon(item.transport_type);
                const positions = [
                  "left-[25%] top-[18%]",
                  "right-[32%] bottom-[22%]",
                  "left-[50%] top-[45%]",
                  "right-[18%] top-[28%]",
                  "left-[15%] bottom-[30%]",
                ];

                return (
                  <div
                    key={`${item.transport_type}-${item.id}-${index}`}
                    className={`group absolute ${positions[index]} cursor-pointer`}
                  >
                    <div className="relative">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#00606c] bg-white shadow-lg transition group-hover:scale-125">
                        <Icon size={17} className="text-[#00606c]" />
                      </div>

                      <div className="absolute -top-14 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-xl border border-[#bdc8cb]/20 bg-white px-3 py-2 shadow-xl group-hover:block">
                        <p className="text-[10px] font-black">
                          {item.dispatch_code} - {item.partner_name || "Dịch vụ"}
                        </p>
                        <p className="text-[10px] text-[#6e797b]">
                          {item.tour_name || "-"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="absolute bottom-6 left-6 rounded-2xl border border-[#bdc8cb]/20 bg-white/90 p-4 shadow-lg backdrop-blur">
                <div className="space-y-2">
                  <Legend dot="bg-[#00606c]" text="Xe / vận chuyển" />
                  <Legend dot="bg-[#006074]" text="Chuyến bay / khách sạn" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-[3rem] bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-bold text-[#181c1d]">
                <Handshake size={20} className="text-[#00606c]" />
                Nhà cung cấp dịch vụ
              </h3>

              <button
                onClick={() => setShowSuppliers(true)}
                className="text-xs font-black uppercase text-[#00606c] hover:underline"
              >
                Xem tất cả
              </button>
            </div>

            <div className="space-y-4">
              {suppliers.length === 0 ? (
                <div className="rounded-2xl bg-[#f1f4f5] p-6 text-center text-sm font-bold text-[#6e797b]">
                  Chưa có nhà cung cấp.
                </div>
              ) : (
                suppliers.slice(0, 5).map((supplier) => (
                  <SupplierCard key={supplier.id} supplier={supplier} />
                ))
              )}
            </div>

            <div className="mt-8 border-t border-[#bdc8cb]/20 pt-6">
              <p className="mb-4 text-[11px] font-bold uppercase tracking-widest text-[#6e797b]">
                Hỗ trợ nhanh
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-[#007b8a]/10 p-4 text-[#00606c] transition hover:bg-[#00606c] hover:text-white">
                  <FileText size={20} />
                  <span className="text-[10px] font-bold">Hợp đồng</span>
                </button>

                <button className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-[#006074]/10 p-4 text-[#006074] transition hover:bg-[#006074] hover:text-white">
                  <Handshake size={20} />
                  <span className="text-[10px] font-bold">Đối soát</span>
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-[3rem] bg-white p-6 shadow-sm">
            <h3 className="mb-5 flex items-center gap-2 font-bold text-[#181c1d]">
              <AlertTriangle size={20} className="text-[#ba1a1a]" />
              Sự cố mới nhất
            </h3>

            <div className="space-y-3">
              {incidents.length === 0 ? (
                <div className="rounded-2xl bg-[#f1f4f5] p-5 text-center text-sm font-bold text-[#6e797b]">
                  Chưa có sự cố vận hành.
                </div>
              ) : (
                incidents.slice(0, 4).map((incident) => (
                  <IncidentCard key={incident.id} incident={incident} />
                ))
              )}
            </div>
          </div>
        </aside>
      </section>

      <button className="fixed bottom-8 right-8 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#9b4500] to-[#fc8a40] text-white shadow-2xl transition hover:scale-110">
        <MessageCircle size={28} />
      </button>

      {showAllServices && (
        <Modal
          title="Tất cả dịch vụ vận hành"
          onClose={() => setShowAllServices(false)}
        >
          <ServiceTable services={filteredServices} />
        </Modal>
      )}

      {showSuppliers && (
        <Modal title="Tất cả nhà cung cấp" onClose={() => setShowSuppliers(false)}>
          <div className="grid gap-4 md:grid-cols-2">
            {suppliers.map((supplier) => (
              <SupplierCard key={supplier.id} supplier={supplier} />
            ))}
          </div>
        </Modal>
      )}

      {showIncident && (
        <Modal title="Danh sách sự cố vận hành" onClose={() => setShowIncident(false)}>
          <div className="grid gap-4 md:grid-cols-2">
            {incidents.length === 0 ? (
              <div className="rounded-2xl bg-[#f1f4f5] p-8 text-center font-bold text-[#6e797b] md:col-span-2">
                Chưa có sự cố vận hành.
              </div>
            ) : (
              incidents.map((incident) => (
                <IncidentCard key={incident.id} incident={incident} />
              ))
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

function ServiceTable({ services }: { services: OperationService[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] border-collapse text-left">
        <thead>
          <tr className="bg-[#f1f4f5]/70">
            <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[#3e494b]">
              Dịch vụ
            </th>
            <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[#3e494b]">
              Tour / Đợt khởi hành
            </th>
            <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[#3e494b]">
              Nhà cung cấp
            </th>
            <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[#3e494b]">
              Thời gian / Điểm
            </th>
            <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[#3e494b]">
              Chi phí
            </th>
            <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[#3e494b]">
              Trạng thái
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-[#bdc8cb]/10">
          {services.length === 0 ? (
            <tr>
              <td
                colSpan={6}
                className="px-6 py-10 text-center text-sm font-bold text-[#6e797b]"
              >
                Chưa có dữ liệu dịch vụ vận hành.
              </td>
            </tr>
          ) : (
            services.map((item, index) => {
              const Icon = getServiceIcon(item.transport_type);

              return (
                <tr
                  key={`${item.transport_type}-${item.id}-${index}`}
                  className="transition hover:bg-[#f6fafb]"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#9defff]/30 text-[#00606c]">
                        <Icon size={18} />
                      </div>
                      <div>
                        <p className="font-black text-[#181c1d]">
                          {getServiceLabel(item.transport_type)}
                        </p>
                        <p className="font-mono text-[10px] font-bold text-[#00606c]">
                          {item.dispatch_code || "-"}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <p className="max-w-[210px] truncate text-sm font-bold text-[#181c1d]">
                      {item.tour_name || "-"}
                    </p>
                    <p className="text-[10px] text-[#6e797b]">
                      {item.departure_code || item.tour_code || "-"} •{" "}
                      {Number(item.booked_seats || 0)} khách
                    </p>
                  </td>

                  <td className="px-6 py-4">
                    <p className="text-sm font-bold">
                      {item.partner_name || "Chưa gán"}
                    </p>
                    <p className="text-xs text-[#6e797b]">
                      {item.partner_phone || "-"}
                    </p>
                  </td>

                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-[#00606c]">
                      {formatTime(item.pickup_time)}
                    </p>
                    <p className="max-w-[220px] truncate text-xs text-[#6e797b]">
                      {item.pickup_location || item.current_location || "-"}
                    </p>
                  </td>

                  <td className="px-6 py-4 font-black text-[#9b4500]">
                    {formatMoney(item.unit_price)}
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase ${getStatusClass(
                        item.dispatch_status
                      )}`}
                    >
                      {getStatusLabel(item.dispatch_status)}
                    </span>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function SupplierCard({ supplier }: { supplier: Supplier }) {
  const Icon = getSupplierIcon(supplier.partner_type);

  return (
    <div className="rounded-2xl border border-transparent bg-[#f1f4f5] p-4 transition hover:border-[#00606c]/20">
      <div className="mb-3 flex items-center gap-4">
        <div className="h-11 w-11 overflow-hidden rounded-full bg-white">
          {supplier.image_url ? (
            <img
              src={supplier.image_url}
              alt={supplier.partner_name || "Nhà cung cấp"}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[#00606c]">
              <Icon size={20} />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-[#181c1d]">
            {supplier.partner_name || "-"}
          </p>
          <p className="text-[10px] uppercase text-[#6e797b]">
            {getSupplierTypeLabel(supplier.partner_type)}
          </p>
        </div>

        <div
          className={`h-2 w-2 rounded-full ${
            supplier.status === "ACTIVE" ? "bg-green-500" : "bg-orange-400"
          }`}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-[#6e797b]">
          Hotline: {supplier.phone || "Chưa cập nhật"}
        </span>
        <button
          onClick={() => {
            if (supplier.phone) window.location.href = `tel:${supplier.phone}`;
          }}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[#00606c]/10 text-[#00606c] transition hover:bg-[#00606c] hover:text-white"
        >
          <Phone size={15} />
        </button>
      </div>
    </div>
  );
}

function IncidentCard({ incident }: { incident: Incident }) {
  return (
    <div
      className={`rounded-2xl border p-4 ${getIncidentClass(
        incident.priority_level
      )}`}
    >
      <p className="mb-1 text-[10px] font-black uppercase text-[#ba1a1a]">
        {incident.incident_code} • {incident.priority_level}
      </p>
      <p className="font-black text-[#181c1d]">{incident.title}</p>
      <p className="mt-1 line-clamp-2 text-xs text-[#6e797b]">
        {incident.description || "Chưa có mô tả"}
      </p>
      <p className="mt-2 text-[10px] font-bold text-[#00606c]">
        {incident.tour_name || incident.departure_code || "-"}
      </p>
    </div>
  );
}

function KpiCard({
  title,
  value,
  desc,
  icon: Icon,
  tone,
}: {
  title: string;
  value: number;
  desc: string;
  icon: any;
  tone: "primary" | "tertiary" | "pickup" | "error";
}) {
  const styles = {
    primary: {
      border: "border-[#00606c]/20",
      wrap: "bg-[#007b8a]/10 text-[#00606c]",
      badge: "bg-[#007b8a]/10 text-[#00606c]",
      value: "text-[#181c1d]",
    },
    tertiary: {
      border: "border-[#006074]/20",
      wrap: "bg-[#006074]/10 text-[#006074]",
      badge: "bg-[#006074]/10 text-[#006074]",
      value: "text-[#181c1d]",
    },
    pickup: {
      border: "border-[#9defff]/60",
      wrap: "bg-[#9defff]/30 text-[#00606c]",
      badge: "bg-[#9defff]/30 text-[#00606c]",
      value: "text-[#181c1d]",
    },
    error: {
      border: "border-[#ba1a1a]/20",
      wrap: "bg-[#ffdad6] text-[#ba1a1a]",
      badge: "bg-[#ffdad6] text-[#ba1a1a]",
      value: "text-[#ba1a1a]",
    },
  }[tone];

  return (
    <div
      className={`rounded-[3rem] border-b-4 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${styles.border}`}
    >
      <div className="mb-4 flex items-start justify-between">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-full ${styles.wrap}`}
        >
          <Icon size={22} />
        </div>
        <span className={`rounded px-2 py-1 text-xs font-bold ${styles.badge}`}>
          {desc}
        </span>
      </div>

      <h3 className="text-sm font-semibold uppercase tracking-wider text-[#3e494b]">
        {title}
      </h3>
      <p className={`mt-1 text-4xl font-black ${styles.value}`}>{value}</p>
    </div>
  );
}

function Legend({ dot, text }: { dot: string; text: string }) {
  return (
    <p className="flex items-center gap-2 text-[11px] font-bold text-[#3e494b]">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {text}
    </p>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#bdc8cb]/20 px-6 py-5">
          <h3 className="text-xl font-black text-[#00606c]">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-full bg-[#f1f4f5] p-2 text-[#3e494b]"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}