"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Download,
  Edit,
  Eye,
  FileText,
  Hotel,
  MapPin,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  Truck,
  Utensils,
  X,
} from "lucide-react";
import ExportTimeFilter, {
  TimeFilterOptions,
  formatReportTimeLabel,
  formatReportFilenameSuffix,
  filterItemsByTime,
} from "@/components/shared/ExportTimeFilter";

const API_BASE_URL = "/backend-api";

type Supplier = {
  id: string | number;
  supplier_code: string;
  supplier_name: string;
  supplier_type: string;
  contact_name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  tax_code?: string | null;
  notes?: string | null;
  is_active: boolean;
  created_at?: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("vi-VN");
}

function getSupplierTypeLabel(type?: string) {
  switch (type) {
    case "HOTEL":
      return "Khách sạn";
    case "TRANSPORT":
      return "Vận chuyển";
    case "RESTAURANT":
      return "Nhà hàng";
    case "TICKET":
      return "Vé tham quan";
    case "SERVICE":
      return "Dịch vụ khác";
    default:
      return type || "-";
  }
}

function getSupplierTypeClass(type?: string) {
  switch (type) {
    case "HOTEL":
      return "bg-[#9defff]/50 text-[#00606c]";
    case "TRANSPORT":
      return "bg-[#ffdbc9] text-[#9b4500]";
    case "RESTAURANT":
      return "bg-teal-500/10 text-teal-700";
    case "TICKET":
      return "bg-[#b3ebff]/60 text-[#006074]";
    default:
      return "bg-[#dfe3e4] text-[#3e494b]";
  }
}

function escapeHtml(value: string) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export default function AdminSuppliers() {
  const router = useRouter();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [keyword, setKeyword] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [showExportPreview, setShowExportPreview] = useState(false);

  const [timeFilter, setTimeFilter] = useState<TimeFilterOptions>({
    type: "month",
    month: new Date().getMonth() + 1,
    quarter: 1,
    year: new Date().getFullYear(),
  });

  const filteredSuppliersForExport = useMemo(() => {
    return filterItemsByTime(
      suppliers,
      (item) => item.created_at,
      timeFilter
    );
  }, [suppliers, timeFilter]);

  async function loadData() {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (keyword.trim()) params.set("keyword", keyword.trim());
      if (typeFilter) params.set("supplierType", typeFilter);
      if (activeFilter) params.set("isActive", activeFilter);

      const query = params.toString();

      const res = await fetch(
        query
          ? `${API_BASE_URL}/admin/suppliers?${query}`
          : `${API_BASE_URL}/admin/suppliers`,
        {
          cache: "no-store",
          credentials: "include",
        }
      );

      const json = await res.json().catch(() => null);

      if (!res.ok || json?.success === false) {
        setSuppliers([]);
        return;
      }

      setSuppliers(json?.data || []);
    } catch (error) {
      console.error("LOAD_SUPPLIERS_ERROR:", error);
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(loadData, 300);
    return () => clearTimeout(timer);
  }, [keyword, typeFilter, activeFilter]);

  const stats = useMemo(() => {
    const total = suppliers.length;
    const active = suppliers.filter((item) => item.is_active).length;
    const inactive = total - active;
    const hotel = suppliers.filter((item) => item.supplier_type === "HOTEL").length;
    const transport = suppliers.filter(
      (item) => item.supplier_type === "TRANSPORT"
    ).length;
    const restaurant = suppliers.filter(
      (item) => item.supplier_type === "RESTAURANT"
    ).length;
    const ticket = suppliers.filter((item) => item.supplier_type === "TICKET").length;
    const service = suppliers.filter(
      (item) => item.supplier_type === "SERVICE"
    ).length;
    const activeRate = total > 0 ? Math.round((active / total) * 100) : 0;

    return {
      total,
      active,
      inactive,
      hotel,
      transport,
      restaurant,
      ticket,
      service,
      activeRate,
    };
  }, [suppliers]);

  function openCreate() {
    router.push("/admin/suppliers/create");
  }

  function openDetail(supplier: Supplier) {
    router.push(`/admin/suppliers/${supplier.id}`);
  }

  function openEdit(supplier: Supplier) {
    router.push(`/admin/suppliers/${supplier.id}/edit`);
  }

  async function handleDelete(supplier: Supplier) {
    const ok = confirm(
      `Bạn có chắc muốn xóa nhà cung cấp ${supplier.supplier_name}?`
    );

    if (!ok) return;

    try {
      const res = await fetch(`${API_BASE_URL}/admin/suppliers/${supplier.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || json?.success === false) {
        alert(json?.message || "Xóa nhà cung cấp thất bại");
        return;
      }

      await loadData();
    } catch (error) {
      console.error("DELETE_SUPPLIER_ERROR:", error);
      alert("Không thể xóa nhà cung cấp");
    }
  }

  function exportCsv(dataToExport: Supplier[]) {
    const timeLabel = formatReportTimeLabel(timeFilter);
    const fileSuffix = formatReportFilenameSuffix(timeFilter);

    const rows = [
      [`BÁO CÁO DANH SÁCH NHÀ CUNG CẤP - ${timeLabel.toUpperCase()}`],
      [`Ngày lập`, new Date().toLocaleDateString("vi-VN")],
      [],
      [
        "Mã nhà cung cấp",
        "Tên nhà cung cấp",
        "Loại",
        "Người liên hệ",
        "Số điện thoại",
        "Email",
        "Địa chỉ",
        "Mã số thuế",
        "Trạng thái",
        "Ngày tạo",
        "Ghi chú",
      ],
      ...dataToExport.map((item) => [
        item.supplier_code,
        item.supplier_name,
        getSupplierTypeLabel(item.supplier_type),
        item.contact_name || "",
        item.phone || "",
        item.email || "",
        item.address || "",
        item.tax_code || "",
        item.is_active ? "Hoạt động" : "Ngưng hoạt động",
        formatDate(item.created_at),
        item.notes || "",
      ]),
    ];

    const content =
      "\uFEFF" +
      rows
        .map((row) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
        )
        .join("\n");

    const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `bao-cao-nha-cung-cap-${fileSuffix}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  }

  function exportPdf(dataToExport: Supplier[]) {
    const timeLabel = formatReportTimeLabel(timeFilter);
    const tableRows = dataToExport
      .map(
        (item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(item.supplier_code || "")}</td>
            <td>${escapeHtml(item.supplier_name || "")}</td>
            <td>${escapeHtml(getSupplierTypeLabel(item.supplier_type))}</td>
            <td>${escapeHtml(item.contact_name || "")}</td>
            <td>${escapeHtml(item.phone || "")}</td>
            <td>${escapeHtml(item.email || "")}</td>
            <td>${escapeHtml(item.tax_code || "")}</td>
            <td>${escapeHtml(item.is_active ? "Hoạt động" : "Ngưng hoạt động")}</td>
            <td>${escapeHtml(formatDate(item.created_at))}</td>
          </tr>
        `
      )
      .join("");

    // Calculate dynamic stats
    const total = dataToExport.length;
    const active = dataToExport.filter((s) => s.is_active).length;
    const inactive = total - active;
    const activeRate = total > 0 ? Math.round((active / total) * 100) : 0;

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Báo cáo danh sách nhà cung cấp ${timeLabel}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              font-family: Arial, sans-serif;
              color: #181c1d;
              padding: 20px;
            }
            h1 {
              text-align: center;
              font-size: 24px;
              color: #00606c;
              margin: 0 0 5px;
            }
            .sub {
              text-align: center;
              font-size: 13px;
              color: #5f6b6d;
              margin-bottom: 20px;
            }
            .summary {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 8px;
              margin-bottom: 18px;
              font-size: 12px;
            }
            .summary div {
              border: 1px solid #dfe3e4;
              padding: 8px;
              text-align: center;
              background-color: #f6fafb;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11px;
            }
            th, td {
              border: 1px solid #dfe3e4;
              padding: 6px 7px;
              vertical-align: top;
            }
            th {
              text-align: center;
              font-weight: bold;
              background: #f1f4f5;
              color: #3e494b;
            }
            .footer {
              margin-top: 24px;
              text-align: right;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <h1>Báo cáo danh sách nhà cung cấp</h1>
          <div class="sub">Báo cáo: ${timeLabel} • Ngày xuất: ${new Date().toLocaleDateString("vi-VN")}</div>

          <div class="summary">
            <div><b>Tổng NCC</b><br/>${total}</div>
            <div><b>Hoạt động</b><br/>${active}</div>
            <div><b>Ngưng</b><br/>${inactive}</div>
            <div><b>Tỷ lệ hoạt động</b><br/>${activeRate}%</div>
          </div>

          <table>
            <thead>
              <tr>
                <th>STT</th>
                <th>Mã NCC</th>
                <th>Tên nhà cung cấp</th>
                <th>Loại</th>
                <th>Người liên hệ</th>
                <th>SĐT</th>
                <th>Email</th>
                <th>MST</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>

          <div class="footer">
            <div>
              Người lập báo cáo<br /><br /><br />
              ..............................
            </div>
          </div>

          <script>
            window.onload = function () { window.print(); };
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      alert("Trình duyệt đang chặn cửa sổ in PDF");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

  if (showExportPreview) {
    // Re-calculate stats based on filtered list for preview display
    const total = filteredSuppliersForExport.length;
    const active = filteredSuppliersForExport.filter((s) => s.is_active).length;
    const inactive = total - active;
    const activeRate = total > 0 ? Math.round((active / total) * 100) : 0;

    return (
      <div className="space-y-8">
        <section className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-[#00606c]/70">
              Supplier Report
            </p>
            <h1 className="text-3xl font-black tracking-tight text-[#00606c]">
              Xem trước báo cáo nhà cung cấp
            </h1>
            <p className="mt-2 max-w-2xl text-[#3e494b]">
              Kiểm tra dữ liệu trước khi xuất CSV hoặc PDF.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowExportPreview(false)}
              className="inline-flex items-center gap-2 rounded-full bg-[#f1f4f5] px-6 py-3 font-black text-[#00606c] transition hover:bg-[#dfe3e4]"
            >
              <X size={18} />
              Quay lại
            </button>

            <button
              onClick={() => exportCsv(filteredSuppliersForExport)}
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-black text-[#00606c] shadow-sm transition hover:bg-[#9defff]/30"
            >
              <Download size={18} />
              Xuất CSV
            </button>

            <button
              onClick={() => exportPdf(filteredSuppliersForExport)}
              className="inline-flex items-center gap-2 rounded-full bg-[#00606c] px-6 py-3 font-black text-white shadow-lg shadow-[#00606c]/20 transition hover:scale-105"
            >
              <FileText size={18} />
              Xuất PDF
            </button>
          </div>
        </section>

        {/* Bộ chọn thời gian nhúng trực tiếp lên giao diện preview */}
        <div className="rounded-[2.5rem] bg-[#f6fafb] p-6 ring-1 ring-[#ebeeef] shadow-sm">
          <ExportTimeFilter value={timeFilter} onChange={setTimeFilter} />
        </div>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Tổng NCC" value={total} icon={Building2} />
          <MetricCard title="Hoạt động" value={active} icon={CheckCircle2} />
          <MetricCard title="Ngưng hoạt động" value={inactive} icon={X} />
          <MetricCard title="Tỷ lệ hoạt động" value={`${activeRate}%`} icon={FileText} />
        </section>

        <section className="overflow-hidden rounded-[2.5rem] border border-[#bdc8cb]/10 bg-white shadow-xl shadow-[#00606c]/5">
          <div className="border-b border-[#bdc8cb]/10 p-6">
            <h2 className="text-xl font-black text-[#00606c]">
              Dữ liệu chuẩn bị xuất
            </h2>
            <p className="mt-1 text-sm font-semibold text-[#6e797b]">
              Tổng cộng {filteredSuppliersForExport.length} nhà cung cấp trong khoảng thời gian được chọn.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-left">
              <thead>
                <tr className="bg-[#f1f4f5]/70 text-[10px] font-black uppercase tracking-widest text-[#3e494b]">
                  <th className="px-6 py-4">STT</th>
                  <th className="px-6 py-4">Mã NCC</th>
                  <th className="px-6 py-4">Tên nhà cung cấp</th>
                  <th className="px-6 py-4">Loại</th>
                  <th className="px-6 py-4">Người liên hệ</th>
                  <th className="px-6 py-4">SĐT</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">MST</th>
                  <th className="px-6 py-4">Trạng thái</th>
                  <th className="px-6 py-4">Ngày tạo</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#bdc8cb]/10">
                {filteredSuppliersForExport.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-6 py-12 text-center text-sm font-bold text-[#6e797b]"
                    >
                      Không có dữ liệu nhà cung cấp trong khoảng thời gian được chọn.
                    </td>
                  </tr>
                ) : (
                  filteredSuppliersForExport.map((item, index) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 text-sm font-bold">{index + 1}</td>
                      <td className="px-6 py-4 text-sm font-bold">
                        {item.supplier_code}
                      </td>
                      <td className="px-6 py-4 text-sm font-black text-[#181c1d]">
                        {item.supplier_name}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {getSupplierTypeLabel(item.supplier_type)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {item.contact_name || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm">{item.phone || "-"}</td>
                      <td className="px-6 py-4 text-sm">{item.email || "-"}</td>
                      <td className="px-6 py-4 text-sm">{item.tax_code || "-"}</td>
                      <td className="px-6 py-4 text-sm font-bold">
                        {item.is_active ? "Hoạt động" : "Ngưng hoạt động"}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {formatDate(item.created_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-[#00606c]/70">
            Supplier Management
          </p>
          <h1 className="text-3xl font-black tracking-tight text-[#00606c]">
            Quản lý nhà cung cấp
          </h1>
          <p className="mt-2 max-w-2xl text-[#3e494b]">
            Quản lý khách sạn, nhà xe, nhà hàng, vé tham quan và các đối tác
            dịch vụ phục vụ tour.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 font-black text-[#00606c] shadow-sm transition hover:bg-[#9defff]/30"
          >
            <RefreshCcw size={18} className={loading ? "animate-spin" : ""} />
            Làm mới
          </button>

          <button
            onClick={() => setShowExportPreview(true)}
            className="inline-flex items-center gap-2 rounded-full bg-[#f1f4f5] px-6 py-3 font-black text-[#00606c] transition hover:bg-[#dfe3e4]"
          >
            <Download size={18} />
            Xuất báo cáo
          </button>

          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#9b4500] to-[#fc8a40] px-6 py-3 font-black text-white shadow-lg shadow-[#9b4500]/20 transition hover:scale-105"
          >
            <Plus size={18} />
            Thêm nhà cung cấp
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Tổng nhà cung cấp" value={stats.total} icon={Building2} />
        <MetricCard title="Đang hoạt động" value={stats.active} icon={CheckCircle2} />
        <MetricCard title="Ngưng hoạt động" value={stats.inactive} icon={X} />
        <MetricCard title="Tỷ lệ hoạt động" value={`${stats.activeRate}%`} icon={FileText} />
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-5">
        <SmallSummaryCard title="Khách sạn" value={stats.hotel} icon={Hotel} />
        <SmallSummaryCard title="Vận chuyển" value={stats.transport} icon={Truck} />
        <SmallSummaryCard title="Nhà hàng" value={stats.restaurant} icon={Utensils} />
        <SmallSummaryCard title="Vé tham quan" value={stats.ticket} icon={MapPin} />
        <SmallSummaryCard title="Dịch vụ khác" value={stats.service} icon={Building2} />
      </section>

      <section className="overflow-hidden rounded-[2.5rem] border border-[#bdc8cb]/10 bg-white shadow-xl shadow-[#00606c]/5">
        <div className="space-y-4 border-b border-[#bdc8cb]/10 p-6">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div className="flex max-w-md flex-1 items-center rounded-2xl bg-[#f1f4f5] px-4 py-3">
              <Search size={18} className="mr-2 text-[#00606c]" />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Tìm tên, mã, email, số điện thoại..."
                className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-[#6e797b]/60"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <SelectFilter
                label="Loại"
                value={typeFilter}
                onChange={setTypeFilter}
                options={[
                  { label: "Tất cả", value: "" },
                  { label: "Khách sạn", value: "HOTEL" },
                  { label: "Vận chuyển", value: "TRANSPORT" },
                  { label: "Nhà hàng", value: "RESTAURANT" },
                  { label: "Vé tham quan", value: "TICKET" },
                  { label: "Dịch vụ khác", value: "SERVICE" },
                ]}
              />

              <SelectFilter
                label="Trạng thái"
                value={activeFilter}
                onChange={setActiveFilter}
                options={[
                  { label: "Tất cả", value: "" },
                  { label: "Hoạt động", value: "true" },
                  { label: "Ngưng", value: "false" },
                ]}
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left">
            <thead>
              <tr className="bg-[#f1f4f5]/70 text-[10px] font-black uppercase tracking-widest text-[#3e494b]">
                <th className="px-6 py-4">Nhà cung cấp</th>
                <th className="px-6 py-4">Loại</th>
                <th className="px-6 py-4">Liên hệ</th>
                <th className="px-6 py-4">Mã số thuế</th>
                <th className="px-6 py-4">Ngày tạo</th>
                <th className="px-6 py-4">Trạng thái</th>
                <th className="px-6 py-4 text-right">Thao tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#bdc8cb]/10">
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-sm font-bold text-[#00606c]"
                  >
                    Đang tải danh sách nhà cung cấp...
                  </td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-sm font-bold text-[#6e797b]"
                  >
                    Không có nhà cung cấp phù hợp.
                  </td>
                </tr>
              ) : (
                suppliers.map((supplier) => (
                  <tr
                    key={supplier.id}
                    className="transition hover:bg-[#00606c]/[0.02]"
                  >
                    <td className="px-6 py-4">
                      <p className="text-sm font-black text-[#181c1d]">
                        {supplier.supplier_name}
                      </p>
                      <p className="text-[11px] font-semibold text-[#6e797b]">
                        {supplier.supplier_code}
                      </p>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-black ${getSupplierTypeClass(
                          supplier.supplier_type
                        )}`}
                      >
                        {getSupplierTypeLabel(supplier.supplier_type)}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-[#181c1d]">
                        {supplier.contact_name || "-"}
                      </p>
                      <p className="text-[11px] text-[#6e797b]">
                        {supplier.phone || supplier.email || "Chưa cập nhật"}
                      </p>
                    </td>

                    <td className="px-6 py-4 text-sm font-semibold text-[#3e494b]">
                      {supplier.tax_code || "-"}
                    </td>

                    <td className="px-6 py-4 text-sm font-semibold text-[#3e494b]">
                      {formatDate(supplier.created_at)}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${
                          supplier.is_active
                            ? "bg-teal-500/10 text-teal-600"
                            : "bg-[#dfe3e4] text-[#3e494b]"
                        }`}
                      >
                        {supplier.is_active ? "Hoạt động" : "Ngưng"}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-1">
                        <IconButton
                          title="Xem chi tiết"
                          onClick={() => openDetail(supplier)}
                          icon={<Eye size={17} />}
                        />
                        <IconButton
                          title="Chỉnh sửa"
                          onClick={() => openEdit(supplier)}
                          icon={<Edit size={17} />}
                        />
                        <IconButton
                          title="Xóa"
                          danger
                          onClick={() => handleDelete(supplier)}
                          icon={<Trash2 size={17} />}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  icon: any;
}) {
  return (
    <div className="flex items-center gap-4 rounded-[2rem] border border-[#bdc8cb]/10 bg-white p-6 shadow-sm">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#9defff]/50 text-[#00606c]">
        <Icon size={22} />
      </div>

      <div className="flex min-w-0 flex-col justify-center">
        <p className="text-xs font-black uppercase leading-none text-[#6e797b]">
          {title}
        </p>
        <p className="mt-2 text-3xl font-black leading-none text-[#181c1d]">
          {value}
        </p>
      </div>
    </div>
  );
}

function SmallSummaryCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  icon: any;
}) {
  return (
    <div className="flex items-center gap-4 rounded-[1.5rem] border border-[#bdc8cb]/10 bg-white p-5 shadow-sm">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f1f4f5] text-[#00606c]">
        <Icon size={19} />
      </div>
      <div>
        <p className="text-[11px] font-black uppercase tracking-wider text-[#6e797b]">
          {title}
        </p>
        <p className="text-xl font-black text-[#181c1d]">{value}</p>
      </div>
    </div>
  );
}

function SelectFilter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-[#bdc8cb]/20 bg-[#ebeeef] px-3 py-2">
      <span className="text-xs font-bold text-[#3e494b]">{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border-none bg-transparent p-0 text-xs font-bold text-[#00606c] outline-none"
      >
        {options.map((option) => (
          <option key={option.value || "all"} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function IconButton({
  icon,
  title,
  danger,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`rounded-lg p-2 transition ${
        danger
          ? "text-[#ba1a1a] hover:bg-[#ba1a1a]/10"
          : "text-[#00606c] hover:bg-[#00606c]/10"
      }`}
    >
      {icon}
    </button>
  );
}