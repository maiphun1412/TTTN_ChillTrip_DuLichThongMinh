"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  Download,
  Eye,
  EyeOff,
  MessageCircle,
  RefreshCcw,
  Search,
  ShieldOff,
  Star,
  TrendingUp,
  X,
  XCircle,
} from "lucide-react";
import ExportTimeFilter, {
  TimeFilterOptions,
  formatReportTimeLabel,
  formatReportFilenameSuffix,
  filterItemsByTime,
} from "@/components/shared/ExportTimeFilter";

const API_BASE_URL = "/backend-api";

const REPORT_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuB4EBlwDaGRaixNOyKRYBPdJzVDuFe6f3FW16Yq4tUcyvj_vq2UZvpvR7yAfC0BlQ3UvO4RjkP8hEatip3p-TkhmKHKtSW9HUTEXqzUpR5IeFHY9wFb7WC7NbKvPXU8E5b-uw1WZe-HrBtjCrIe6FENDUx5tb9reBRagBrFP0bhxrXPX1kUU06zyP7yyeVWzQvbMfywZfdcU_MsUzo4ay6YNAtvQEHaTQDV-cWFSAJSdyuz0Eyx31oNB3-sPqsfpvpeOeYqxDH19vMs";

type Review = {
  id: string | number;
  booking_id: string | number;
  customer_id: string | number;
  tour_id: string | number;
  rating: number;
  review_title?: string | null;
  review_content?: string | null;
  is_public: boolean;
  moderation_status: "PENDING" | "APPROVED" | "REJECTED" | "HIDDEN" | string;
  created_at?: string | null;
  customers?: {
    full_name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  tours?: {
    tour_code?: string | null;
    tour_name?: string | null;
  } | null;
  bookings?: {
    booking_code?: string | null;
  } | null;
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("vi-VN");
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

function getStatusLabel(status?: string) {
  switch (status) {
    case "PENDING":
      return "Chờ duyệt";
    case "APPROVED":
      return "Đã duyệt";
   
    case "HIDDEN":
      return "Đã ẩn";
    default:
      return status || "-";
  }
}

function getStatusClass(status?: string) {
  switch (status) {
    case "APPROVED":
      return "bg-[#9defff]/40 text-[#00606c]";
    case "PENDING":
      return "bg-[#ffdbc9] text-[#9b4500]";
    
    case "HIDDEN":
      return "bg-[#dfe3e4] text-[#3e494b]";
    default:
      return "bg-[#dfe3e4] text-[#3e494b]";
  }
}

function Stars({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5 text-[#f2b01e]">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          size={15}
          className={
            index < value
              ? "fill-[#f2b01e] text-[#f2b01e]"
              : "fill-[#d9d9d9] text-[#d9d9d9]"
          }
        />
      ))}
    </div>
  );
}

export default function AdminReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [ratingFilter, setRatingFilter] = useState("");
  const [publicFilter, setPublicFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);

  const [showReportFilterModal, setShowReportFilterModal] = useState(false);
  const [timeFilter, setTimeFilter] = useState<TimeFilterOptions>({
    type: "month",
    month: new Date().getMonth() + 1,
    quarter: 1,
    year: new Date().getFullYear(),
  });

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");

  const filteredReviewsForExport = useMemo(() => {
    return filterItemsByTime(
      reviews,
      (item) => item.created_at,
      timeFilter
    );
  }, [reviews, timeFilter]);

  async function loadData() {
    try {
      setLoading(true);

      const params = new URLSearchParams();

      if (keyword.trim()) params.set("keyword", keyword.trim());
      if (statusFilter) params.set("status", statusFilter);
      if (ratingFilter) params.set("rating", ratingFilter);
      if (publicFilter) params.set("isPublic", publicFilter);

      const query = params.toString();

      const res = await fetch(
        query
          ? `${API_BASE_URL}/admin/reviews?${query}`
          : `${API_BASE_URL}/admin/reviews`,
        {
          cache: "no-store",
          credentials: "include",
        }
      );

      const json = await res.json().catch(() => null);

      if (!res.ok || json?.success === false) {
        setReviews([]);
        return;
      }

      setReviews(json?.data || []);
    } catch (error) {
      console.error("LOAD_REVIEWS_ERROR:", error);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(loadData, 300);
    return () => clearTimeout(timer);
  }, [keyword, statusFilter, ratingFilter, publicFilter]);

  const stats = useMemo(() => {
    const total = reviews.length;
    const pending = reviews.filter(
      (item) => item.moderation_status === "PENDING"
    ).length;
    const approved = reviews.filter(
      (item) => item.moderation_status === "APPROVED"
    ).length;
    const hidden = reviews.filter(
      (item) => item.moderation_status === "HIDDEN"
    ).length;

    const avg =
      total > 0
        ? (
            reviews.reduce((sum, item) => sum + Number(item.rating || 0), 0) /
            total
          ).toFixed(1)
        : "0.0";

    const publicRate =
      total > 0
        ? Math.round(
            (reviews.filter((item) => item.is_public).length / total) * 100
          )
        : 0;

    return {
      total,
      pending,
      approved,
      hidden,
      avg,
      publicRate,
    };
  }, [reviews]);

  async function handleAction(
    review: Review,
    action: "APPROVE" | "HIDE"
  ) {
    const label =
  action === "APPROVE" ? "duyệt" : "ẩn";

    const ok = confirm(`Bạn có chắc muốn ${label} đánh giá này?`);
    if (!ok) return;

    try {
      const res = await fetch(`${API_BASE_URL}/admin/reviews/${review.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ action }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || json?.success === false) {
        alert(json?.message || "Cập nhật đánh giá thất bại");
        return;
      }

      await loadData();

      if (selectedReview?.id === review.id) {
        setSelectedReview(json?.data || null);
      }
    } catch (error) {
      console.error("UPDATE_REVIEW_ERROR:", error);
      alert("Không thể cập nhật đánh giá");
    }
  }

  function exportCsv(dataToExport: Review[]) {
    const timeLabel = formatReportTimeLabel(timeFilter);
    const fileSuffix = formatReportFilenameSuffix(timeFilter);

    const rows = [
      [`BÁO CÁO ĐÁNH GIÁ KHÁCH HÀNG - ${timeLabel.toUpperCase()}`],
      [`Ngày lập`, new Date().toLocaleDateString("vi-VN")],
      [],
      [
        "Khách hàng",
        "Email",
        "Tour",
        "Mã tour",
        "Số sao",
        "Tiêu đề",
        "Nội dung",
        "Công khai",
        "Trạng thái",
        "Ngày gửi",
      ],
      ...dataToExport.map((item) => [
        item.customers?.full_name || "",
        item.customers?.email || "",
        item.tours?.tour_name || "",
        item.tours?.tour_code || "",
        item.rating,
        item.review_title || "",
        item.review_content || "",
        item.is_public ? "Có" : "Không",
        getStatusLabel(item.moderation_status),
        formatDate(item.created_at),
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
    a.download = `bao-cao-danh-gia-${fileSuffix}.csv`;
    a.click();

    URL.revokeObjectURL(url);
    setShowReportFilterModal(false);
  }

  function generateReportHtml(dataToExport: Review[], timeLabel?: string) {
    const rowsHtml =
      dataToExport.length > 0
        ? dataToExport
            .map(
              (item, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${escapeHtml(item.customers?.full_name || "Khách hàng")}</td>
                  <td>${escapeHtml(item.customers?.email || item.customers?.phone || "-")}</td>
                  <td>${escapeHtml(item.tours?.tour_name || "-")}</td>
                  <td>${escapeHtml(item.tours?.tour_code || "-")}</td>
                  <td>${escapeHtml(item.rating)}/5</td>
                  <td>${escapeHtml(item.review_title || "-")}</td>
                  <td>${escapeHtml(item.review_content || "-")}</td>
                  <td>${item.is_public ? "Có" : "Không"}</td>
                  <td>${escapeHtml(getStatusLabel(item.moderation_status))}</td>
                  <td>${escapeHtml(formatDate(item.created_at))}</td>
                </tr>
              `
            )
            .join("")
        : `
          <tr>
            <td colspan="11" style="text-align:center;">Không có dữ liệu đánh giá</td>
          </tr>
        `;

    // Recalculate stats for report
    const total = dataToExport.length;
    const pending = dataToExport.filter((item) => item.moderation_status === "PENDING").length;
    const approved = dataToExport.filter((item) => item.moderation_status === "APPROVED").length;
    const hidden = dataToExport.filter((item) => item.moderation_status === "HIDDEN").length;
    const sum = dataToExport.reduce((s, item) => s + (item.rating || 0), 0);
    const avg = total > 0 ? (sum / total).toFixed(1) : "0.0";
    const publicRate = total > 0 ? Math.round((dataToExport.filter((item) => item.is_public).length / total) * 100) : 0;

    return `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8" />
        <title>Báo cáo đánh giá khách hàng ${timeLabel || ""}</title>
        <style>
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            padding: 36px;
            font-family: Arial, sans-serif;
            color: #111827;
            background: #ffffff;
            line-height: 1.45;
          }

          .report-header {
            text-align: center;
            margin-bottom: 24px;
          }

          .brand {
            color: #00606c;
            font-size: 18px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
          }

          h1 {
            margin: 10px 0 6px;
            font-size: 26px;
            text-transform: uppercase;
          }

          .subtitle {
            margin: 0;
            font-size: 14px;
            color: #4b5563;
          }

          .meta {
            margin: 18px 0 24px;
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
          }

          .meta-card {
            border: 1px solid #cfd8dc;
            border-radius: 12px;
            padding: 12px;
            background: #f6fafb;
          }

          .meta-card span {
            display: block;
            font-size: 12px;
            color: #4b5563;
          }

          .meta-card strong {
            display: block;
            margin-top: 4px;
            color: #00606c;
            font-size: 18px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
          }

          th,
          td {
            border: 1px solid #dfe3e4;
            padding: 7px 8px;
            vertical-align: top;
          }

          th {
            background: #f1f4f5;
            color: #3e494b;
            text-align: center;
            font-weight: bold;
          }

          td:nth-child(1),
          td:nth-child(6),
          td:nth-child(9),
          td:nth-child(10),
          td:nth-child(11) {
            text-align: center;
          }

          .summary {
            margin-top: 22px;
            border: 1px solid #cfd8dc;
            border-radius: 14px;
            padding: 14px 18px;
            background: #f6fafb;
          }

          .summary h2 {
            margin: 0 0 8px;
            color: #00606c;
            font-size: 18px;
          }

          .summary p {
            margin: 4px 0;
            font-size: 13px;
          }

          .image-section {
            margin-top: 26px;
            page-break-inside: avoid;
          }

          .image-section h2 {
            margin: 0 0 10px;
            color: #00606c;
            font-size: 18px;
          }

          .report-image {
            width: 100%;
            height: 220px;
            object-fit: cover;
            border-radius: 16px;
            display: block;
          }

          .footer {
            margin-top: 22px;
            text-align: center;
            font-size: 12px;
            color: #4b5563;
          }

          @media print {
            body {
              padding: 10mm;
            }

            .no-print {
              display: none !important;
            }

            .report-image {
              height: 190px;
            }
          }
        </style>
      </head>

      <body>
        <div class="report-header">
          <div class="brand">ChillTrip Admin</div>
          <h1>Báo cáo đánh giá khách hàng</h1>
          <p class="subtitle">Báo cáo: ${timeLabel || ""} • Ngày lập: ${new Date().toLocaleDateString("vi-VN")}</p>
        </div>

        <div class="meta">
          <div class="meta-card">
            <span>Tổng đánh giá</span>
            <strong>${total}</strong>
          </div>
          <div class="meta-card">
            <span>Điểm trung bình</span>
            <strong>${avg}/5</strong>
          </div>
          <div class="meta-card">
            <span>Chờ duyệt</span>
            <strong>${pending}</strong>
          </div>
          <div class="meta-card">
            <span>Tỷ lệ công khai</span>
            <strong>${publicRate}%</strong>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>STT</th>
              <th>Khách hàng</th>
              <th>Liên hệ</th>
              <th>Tour</th>
              <th>Mã tour</th>
              <th>Số sao</th>
              <th>Tiêu đề</th>
              <th>Nội dung</th>
              <th>Công khai</th>
              <th>Trạng thái</th>
              <th>Ngày gửi</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="summary">
          <h2>Nhận xét tổng quan</h2>
          <p>Báo cáo tổng hợp các đánh giá khách hàng trong khoảng thời gian được chọn.</p>
          <p>Các phản hồi từ du khách giúp nâng cao trải nghiệm tour của ChillTrip.</p>
        </div>

        <div class="image-section">
          <h2>Hình ảnh minh họa</h2>
          <img class="report-image" src="${REPORT_IMAGE}" alt="Hạ Long" />
        </div>

        <div class="footer">
          © ${new Date().getFullYear()} ChillTrip Admin • Hệ thống quản lý vận hành chuyên nghiệp
        </div>
      </body>
      </html>
    `;
  }

  function previewPdf(dataToExport: Review[]) {
    const timeLabel = formatReportTimeLabel(timeFilter);
    setPreviewHtml(generateReportHtml(dataToExport, timeLabel));
    setPreviewOpen(true);
    setShowReportFilterModal(false);
  }

  function printPdf() {
    const iframe = document.getElementById(
      "report-preview-frame"
    ) as HTMLIFrameElement | null;

    iframe?.contentWindow?.focus();
    iframe?.contentWindow?.print();
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-[#00606c]/70">
            Review Management
          </p>
          <h1 className="text-3xl font-black tracking-tight text-[#00606c]">
            Quản lý đánh giá
          </h1>
          <p className="mt-2 max-w-2xl text-[#3e494b]">
            Theo dõi phản hồi khách hàng, duyệt đánh giá công khai và ẩn các nội
            dung không phù hợp.
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

          <div className="relative">
            <button
              onClick={() => setShowReportFilterModal(true)}
              className="inline-flex items-center gap-2 rounded-full bg-[#00606c] px-6 py-3 font-black text-white shadow-lg shadow-[#00606c]/20 transition hover:scale-105"
            >
              <Download size={18} />
              Xuất báo cáo
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Tổng đánh giá"
          value={stats.total}
          desc="Theo bộ lọc hiện tại"
          icon={MessageCircle}
          tone="primary"
        />
        <MetricCard
          title="Điểm trung bình"
          value={`${stats.avg}/5`}
          desc="Chất lượng trải nghiệm"
          icon={Star}
          tone="secondary"
        />
        <MetricCard
          title="Chờ duyệt"
          value={stats.pending}
          desc="Cần xử lý"
          icon={TrendingUp}
          tone="warning"
        />
        <MetricCard
          title="Tỷ lệ công khai"
          value={`${stats.publicRate}%`}
          desc={`${stats.approved} đã duyệt`}
          icon={CheckCircle2}
          tone="active"
        />
      </section>

      <section className="overflow-hidden rounded-[2.5rem] border border-[#bdc8cb]/10 bg-white shadow-xl shadow-[#00606c]/5">
        <div className="space-y-4 border-b border-[#bdc8cb]/10 p-6">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div className="flex max-w-md flex-1 items-center rounded-2xl bg-[#f1f4f5] px-4 py-3">
              <Search size={18} className="mr-2 text-[#00606c]" />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Tìm khách hàng, tour, nội dung..."
                className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-[#6e797b]/60"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <SelectFilter
                label="Số sao"
                value={ratingFilter}
                onChange={setRatingFilter}
                options={[
                  { label: "Tất cả", value: "" },
                  { label: "5 sao", value: "5" },
                  { label: "4 sao", value: "4" },
                  { label: "3 sao", value: "3" },
                  { label: "2 sao", value: "2" },
                  { label: "1 sao", value: "1" },
                ]}
              />

              <SelectFilter
                label="Trạng thái"
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { label: "Tất cả", value: "" },
                  { label: "Chờ duyệt", value: "PENDING" },
                  { label: "Đã duyệt", value: "APPROVED" },
                 
                  { label: "Đã ẩn", value: "HIDDEN" },
                ]}
              />

              <SelectFilter
                label="Hiển thị"
                value={publicFilter}
                onChange={setPublicFilter}
                options={[
                  { label: "Tất cả", value: "" },
                  { label: "Công khai", value: "true" },
                  { label: "Không công khai", value: "false" },
                ]}
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1250px] text-left">
            <thead>
              <tr className="bg-[#f1f4f5]/70 text-[10px] font-black uppercase tracking-widest text-[#3e494b]">
                <th className="px-6 py-4">Khách hàng</th>
                <th className="px-6 py-4">Chuyến đi</th>
                <th className="px-6 py-4">Đánh giá</th>
                <th className="px-6 py-4">Nội dung</th>
                <th className="px-6 py-4">Ngày gửi</th>
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
                    Đang tải danh sách đánh giá...
                  </td>
                </tr>
              ) : reviews.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-sm font-bold text-[#6e797b]"
                  >
                    Không có đánh giá phù hợp.
                  </td>
                </tr>
              ) : (
                reviews.map((review) => (
                  <tr
                    key={review.id}
                    className="transition hover:bg-[#00606c]/[0.02]"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#9defff] text-sm font-black text-[#00606c]">
                          {getInitials(review.customers?.full_name)}
                        </div>

                        <div>
                          <p className="text-sm font-black text-[#181c1d]">
                            {review.customers?.full_name || "Khách hàng"}
                          </p>
                          <p className="text-[11px] text-[#6e797b]">
                            {review.customers?.email ||
                              review.customers?.phone ||
                              "Chưa cập nhật"}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <p className="text-sm font-black text-[#00606c]">
                        {review.tours?.tour_code || "-"}
                      </p>
                      <p className="max-w-[190px] truncate text-[11px] font-semibold uppercase text-[#6e797b]">
                        {review.tours?.tour_name || "-"}
                      </p>
                    </td>

                    <td className="px-6 py-4">
                      <Stars value={Number(review.rating || 0)} />
                      <p className="mt-1 text-[11px] font-bold text-[#6e797b]">
                        {review.rating}/5 sao
                      </p>
                    </td>

                    <td className="px-6 py-4">
                      <p className="max-w-[240px] truncate text-sm font-bold text-[#181c1d]">
                        {review.review_title || "Không có tiêu đề"}
                      </p>
                      <p className="max-w-[280px] truncate text-xs font-medium text-[#6e797b]">
                        {review.review_content || "Không có nội dung"}
                      </p>
                    </td>

                    <td className="px-6 py-4 text-sm font-semibold text-[#3e494b]">
                      {formatDate(review.created_at)}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${getStatusClass(
                          review.moderation_status
                        )}`}
                      >
                        {getStatusLabel(review.moderation_status)}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-1">
                        <IconButton
                          title="Xem chi tiết"
                          onClick={() => setSelectedReview(review)}
                          icon={<Eye size={17} />}
                        />

                        {review.moderation_status !== "APPROVED" && (
                          <IconButton
                            title="Duyệt công khai"
                            onClick={() => handleAction(review, "APPROVE")}
                            icon={<CheckCircle2 size={17} />}
                          />
                        )}

                       

                        {review.moderation_status !== "HIDDEN" && (
                          <IconButton
                            title="Ẩn đánh giá"
                            warning
                            onClick={() => handleAction(review, "HIDE")}
                            icon={<EyeOff size={17} />}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-[#bdc8cb]/10 bg-[#f1f4f5]/30 px-8 py-6">
          <span className="text-xs font-bold uppercase tracking-wider text-[#3e494b]">
            Hiển thị {reviews.length} đánh giá
          </span>

          <div className="flex items-center gap-2">
            <button className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00606c] text-sm font-black text-white">
              1
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div className="group relative h-48 overflow-hidden rounded-[2.5rem] text-white shadow-lg md:col-span-2">
          <img
            src={REPORT_IMAGE}
            alt="Vịnh Hạ Long"
            className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
          />
          <div className="absolute inset-0 flex flex-col justify-center bg-gradient-to-r from-[#00606c]/85 to-transparent px-10">
            <h3 className="mb-2 text-2xl font-black">
              Tăng trưởng dịch vụ từ phản hồi khách hàng
            </h3>
            <p className="max-w-lg text-sm font-medium text-[#ddf9ff]">
              Các đánh giá tích cực giúp ChillTrip nâng cao chất lượng tour và
              cải thiện trải nghiệm du khách.
            </p>
          </div>
        </div>

        <div className="rounded-[2.5rem] bg-[#007b8a] p-8 text-center text-white shadow-lg">
          <ShieldOff className="mx-auto mb-4" size={42} />
          <h3 className="mb-2 text-xl font-black">Kiểm duyệt nội dung</h3>
          <p className="text-sm font-medium text-[#ddf9ff]">
            Còn {stats.pending} đánh giá đang chờ duyệt.
          </p>
        </div>
      </section>

      {selectedReview && (
        <ReviewDetailModal
          review={selectedReview}
          onClose={() => setSelectedReview(null)}
          onApprove={() => handleAction(selectedReview, "APPROVE")}
          onHide={() => handleAction(selectedReview, "HIDE")}
        />
      )}

      {previewOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4">
          <div className="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#bdc8cb]/20 px-6 py-4">
              <div>
                <h3 className="text-xl font-black text-[#00606c]">
                  Xem trước báo cáo PDF
                </h3>
                <p className="text-xs font-semibold text-[#6e797b]">
                  Kiểm tra nội dung trước khi lưu PDF.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={printPdf}
                  className="rounded-full bg-[#00606c] px-5 py-3 text-sm font-black text-white"
                >
                  Tải / In PDF
                </button>

                <button
                  onClick={() => setPreviewOpen(false)}
                  className="rounded-full bg-[#f1f4f5] px-5 py-3 text-sm font-black text-[#3e494b]"
                >
                  Đóng
                </button>
              </div>
            </div>

            <iframe
              id="report-preview-frame"
              title="Xem trước báo cáo"
              srcDoc={previewHtml}
              className="h-full w-full flex-1 bg-white"
            />
          </div>
        </div>
      )}
      {showReportFilterModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md overflow-hidden rounded-[2rem] bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between border-b border-[#ebeeef] pb-4">
              <h3 className="text-lg font-black text-[#00606c]">Xuất báo cáo đánh giá</h3>
              <button
                type="button"
                onClick={() => setShowReportFilterModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f1f4f5] text-[#3e494b]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="my-6">
              <ExportTimeFilter value={timeFilter} onChange={setTimeFilter} />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowReportFilterModal(false)}
                className="flex-1 rounded-full border border-[#bdc8cb] py-3 text-sm font-black text-[#3e494b]"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => exportCsv(filteredReviewsForExport)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-full bg-[#9b4500] py-3 text-sm font-black text-white"
              >
                <Download size={14} />
                Xuất CSV
              </button>
              <button
                type="button"
                onClick={() => previewPdf(filteredReviewsForExport)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-full bg-[#00606c] py-3 text-sm font-black text-white"
              >
                <Eye size={14} />
                Xem PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  title,
  value,
  desc,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string | number;
  desc: string;
  icon: any;
  tone: "primary" | "secondary" | "warning" | "active";
}) {
  const styles = {
    primary: "bg-[#9defff]/40 text-[#00606c]",
    secondary: "bg-[#ffdbc9]/70 text-[#9b4500]",
    warning: "bg-[#ffdbc9] text-[#9b4500]",
    active: "bg-teal-500/10 text-teal-600",
  }[tone];

  return (
    <div className="flex items-center justify-between rounded-[2rem] bg-white p-6 shadow-sm transition hover:scale-[1.02]">
      <div>
        <p className="mb-1 text-xs font-black uppercase tracking-widest text-[#6e797b]">
          {title}
        </p>
        <p className="text-3xl font-black text-[#00606c]">{value}</p>
        <p className="mt-2 text-xs font-semibold text-[#3e494b]">{desc}</p>
      </div>

      <div
        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${styles}`}
      >
        <Icon size={27} />
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
    <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2">
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
  warning,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  danger?: boolean;
  warning?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`rounded-lg p-2 transition ${
        danger
          ? "text-[#ba1a1a] hover:bg-[#ba1a1a]/10"
          : warning
          ? "text-[#9b4500] hover:bg-[#9b4500]/10"
          : "text-[#00606c] hover:bg-[#00606c]/10"
      }`}
    >
      {icon}
    </button>
  );
}

function ReviewDetailModal({
  review,
  onClose,
  onApprove,
 
  onHide,
}: {
  review: Review;
  onClose: () => void;
  onApprove: () => void;

  onHide: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#bdc8cb]/20 px-6 py-5">
          <div>
            <h3 className="text-xl font-black text-[#00606c]">
              Chi tiết đánh giá
            </h3>
            <p className="text-xs font-semibold text-[#6e797b]">
              {review.tours?.tour_name || "-"}
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-full bg-[#f1f4f5] px-4 py-2 text-sm font-black text-[#3e494b]"
          >
            Đóng
          </button>
        </div>

        <div className="space-y-5 p-6">
          <div className="rounded-3xl bg-[#f1f4f5] p-5">
            <p className="text-sm font-black text-[#181c1d]">
              {review.customers?.full_name || "Khách hàng"}
            </p>
            <p className="text-xs font-semibold text-[#6e797b]">
              {review.customers?.email || review.customers?.phone || "-"}
            </p>
            <div className="mt-3">
              <Stars value={Number(review.rating || 0)} />
            </div>
          </div>

          <InfoLine label="Tiêu đề" value={review.review_title || "-"} />
          <InfoLine label="Nội dung" value={review.review_content || "-"} />
          <InfoLine
            label="Trạng thái"
            value={getStatusLabel(review.moderation_status)}
          />
          <InfoLine
            label="Công khai"
            value={review.is_public ? "Có" : "Không"}
          />
          <InfoLine label="Ngày gửi" value={formatDate(review.created_at)} />

          <div className="flex flex-wrap justify-end gap-3 border-t border-[#bdc8cb]/20 pt-5">
            <button
              onClick={onApprove}
              className="rounded-full bg-[#00606c] px-5 py-3 text-sm font-black text-white"
            >
              Duyệt công khai
            </button>

           

            <button
              onClick={onHide}
              className="rounded-full bg-[#f1f4f5] px-5 py-3 text-sm font-black text-[#3e494b]"
            >
              Ẩn đánh giá
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#f6fafb] px-4 py-3">
      <p className="text-xs font-black uppercase tracking-wider text-[#6e797b]">
        {label}
      </p>
      <p className="mt-1 font-bold text-[#181c1d]">{value}</p>
    </div>
  );
}