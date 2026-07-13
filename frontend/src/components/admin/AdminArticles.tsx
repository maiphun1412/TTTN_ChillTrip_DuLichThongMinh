"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Edit3,
  Eye,
  FileText,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
} from "lucide-react";

const API_BASE_URL = "/backend-api";

type Article = {
  id: string | number;
  title: string;
  slug: string;
  summary?: string | null;
  content?: string | null;
  featured_image?: string | null;
  status: "DRAFT" | "PUBLISHED" | "HIDDEN" | string;
  published_at?: string | null;
  created_by?: string | number | null;
  created_at?: string | null;
  updated_at?: string | null;
  category?: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("vi-VN");
}

function getStatusLabel(status?: string) {
  switch (status) {
    case "PUBLISHED":
      return "Đã đăng";
    case "DRAFT":
      return "Nháp";
    case "HIDDEN":
      return "Đã ẩn";
    default:
      return status || "-";
  }
}

function getStatusClass(status?: string) {
  switch (status) {
    case "PUBLISHED":
      return "text-emerald-600";
    case "DRAFT":
      return "text-[#9b4500]";
    case "HIDDEN":
      return "text-slate-400";
    default:
      return "text-slate-500";
  }
}

function getCategoryClass(category?: string | null) {
  switch (category) {
    case "Ẩm thực":
      return "bg-[#ffdbc9]/50 text-[#763300]";
    case "Kinh nghiệm":
      return "bg-[#9defff]/30 text-[#004f59]";
    case "Điểm đến":
      return "bg-[#b3ebff]/50 text-[#004e5f]";
    case "Mẹo vặt":
      return "bg-slate-200 text-slate-600";
    default:
      return "bg-[#dfe3e4] text-[#3e494b]";
  }
}

export default function AdminArticles() {
  const router = useRouter();

  const [articles, setArticles] = useState<Article[]>([]);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (keyword.trim()) params.set("keyword", keyword.trim());
      if (statusFilter) params.set("status", statusFilter);
      if (categoryFilter) params.set("category", categoryFilter);

      const query = params.toString();

      const res = await fetch(
        query
          ? `${API_BASE_URL}/admin/articles?${query}`
          : `${API_BASE_URL}/admin/articles`,
        {
          cache: "no-store",
          credentials: "include",
        }
      );

      const json = await res.json().catch(() => null);

      if (!res.ok || json?.success === false) {
        setArticles([]);
        return;
      }

      setArticles(json?.data || []);
    } catch (error) {
      console.error("LOAD_ARTICLES_ERROR:", error);
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(loadData, 300);
    return () => clearTimeout(timer);
  }, [keyword, statusFilter, categoryFilter]);

  const stats = useMemo(() => {
    const total = articles.length;
    const published = articles.filter((item) => item.status === "PUBLISHED").length;
    const draft = articles.filter((item) => item.status === "DRAFT").length;
    const hidden = articles.filter((item) => item.status === "HIDDEN").length;

    return { total, published, draft, hidden };
  }, [articles]);

  async function handleDelete(article: Article) {
    const ok = confirm(`Bạn có chắc muốn xóa bài viết "${article.title}"?`);
    if (!ok) return;

    try {
      const res = await fetch(`${API_BASE_URL}/admin/articles/${article.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || json?.success === false) {
        alert(json?.message || "Xóa bài viết thất bại");
        return;
      }

      await loadData();
    } catch (error) {
      console.error("DELETE_ARTICLE_ERROR:", error);
      alert("Không thể xóa bài viết");
    }
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-[#00606c]/70">
            Editorial CMS
          </p>
          <h1 className="text-3xl font-black tracking-tight text-[#00606c]">
            Quản lý bài đăng
          </h1>
          <p className="mt-2 max-w-2xl text-[#3e494b]">
            Quản lý và biên tập các bài blog hiển thị trên website ChillTrip.
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
            onClick={() => router.push("/admin/articles/create")}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#9b4500] to-[#fc8a40] px-6 py-3 font-black text-white shadow-lg shadow-[#9b4500]/20 transition hover:scale-105"
          >
            <Plus size={18} />
            Tạo bài viết mới
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Tổng bài viết" value={stats.total} icon="article" />
        <StatCard title="Đã đăng" value={stats.published} icon="check_circle" />
        <StatCard title="Bản nháp" value={stats.draft} icon="pending_actions" warning />
        <StatCard title="Đã ẩn" value={stats.hidden} icon="visibility_off" />
      </section>

      <section className="rounded-[2.5rem] bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div className="flex max-w-md flex-1 items-center rounded-full bg-[#f1f4f5] px-4 py-3">
            <Search size={18} className="mr-2 text-[#00606c]" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm kiếm bài viết..."
              className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-[#6e797b]/60"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <SelectFilter
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={[
                { label: "Tất cả danh mục", value: "" },
                { label: "Ẩm thực", value: "Ẩm thực" },
                { label: "Kinh nghiệm", value: "Kinh nghiệm" },
                { label: "Điểm đến", value: "Điểm đến" },
                { label: "Mẹo vặt", value: "Mẹo vặt" },
              ]}
            />

            <SelectFilter
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { label: "Tất cả trạng thái", value: "" },
                { label: "Đã đăng", value: "PUBLISHED" },
                { label: "Nháp", value: "DRAFT" },
                { label: "Đã ẩn", value: "HIDDEN" },
              ]}
            />
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-5">
          <h2 className="text-2xl font-black tracking-tight text-slate-800">
            Danh sách nội dung
          </h2>
          <p className="mt-1 text-sm text-[#3e494b]">
            Hiển thị {articles.length} bài viết theo bộ lọc hiện tại.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1150px] border-collapse text-left">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Bài viết
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Danh mục
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Ngày đăng
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Trạng thái
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Slug
                </th>
                <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Thao tác
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm font-bold text-[#00606c]">
                    Đang tải danh sách bài viết...
                  </td>
                </tr>
              ) : articles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm font-bold text-[#6e797b]">
                    Không có bài viết phù hợp.
                  </td>
                </tr>
              ) : (
                articles.map((article) => (
                  <tr key={article.id} className="transition hover:bg-slate-50/50">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-16 shrink-0 overflow-hidden rounded-xl bg-[#f1f4f5] shadow-sm">
                          {article.featured_image ? (
                            <img
                              src={article.featured_image}
                              alt={article.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[#00606c]">
                              <FileText size={22} />
                            </div>
                          )}
                        </div>

                        <div>
                          <h3 className="max-w-[360px] truncate text-sm font-black text-slate-800">
                            {article.title}
                          </h3>
                          <p className="max-w-[420px] truncate text-xs text-slate-500">
                            {article.summary || "Chưa có mô tả tóm tắt"}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      <span
                        className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${getCategoryClass(
                          article.category
                        )}`}
                      >
                        {article.category || "Chưa phân loại"}
                      </span>
                    </td>

                    <td className="px-6 py-5">
                      <p className="text-xs font-semibold text-slate-600">
                        {formatDate(article.published_at || article.created_at)}
                      </p>
                    </td>

                    <td className="px-6 py-5">
                      <div
                        className={`flex items-center gap-1.5 ${getStatusClass(
                          article.status
                        )}`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        <span className="text-[11px] font-black uppercase">
                          {getStatusLabel(article.status)}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      <p className="max-w-[180px] truncate text-xs font-semibold text-slate-500">
                        {article.slug}
                      </p>
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex justify-end gap-2">
                        <IconButton
                          title="Xem chi tiết"
                          onClick={() => router.push(`/admin/articles/${article.id}`)}
                        >
                          <Eye size={18} />
                        </IconButton>

                        <IconButton
                          title="Chỉnh sửa"
                          onClick={() => router.push(`/admin/articles/${article.id}/edit`)}
                        >
                          <Edit3 size={18} />
                        </IconButton>

                        <IconButton
                          title="Xóa bài viết"
                          danger
                          onClick={() => handleDelete(article)}
                        >
                          <Trash2 size={18} />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between bg-slate-50/60 px-6 py-4">
          <p className="text-xs text-slate-500">
            Hiển thị <span className="font-black text-slate-800">{articles.length}</span> bài viết
          </p>

          <div className="flex gap-2">
            <button className="flex h-8 w-8 items-center justify-center rounded-full bg-[#00606c] text-xs font-black text-white">
              1
            </button>
            <button className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-slate-600 hover:bg-white">
              2
            </button>
            <button className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-slate-600 hover:bg-white">
              3
            </button>
          </div>
        </div>
      </section>

      <section className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
        <div className="relative overflow-hidden rounded-[2.5rem] border border-[#007b8a]/20 bg-[#007b8a]/10 p-8 md:col-span-2">
          <div className="relative z-10 max-w-lg">
            <span className="mb-4 inline-block rounded-full bg-[#00606c] px-3 py-1 text-[10px] font-black uppercase text-white">
              Mẹo quản trị
            </span>
            <h4 className="mb-2 text-xl font-black text-[#00606c]">
              Tối ưu hóa SEO cho bài viết mới
            </h4>
            <p className="mb-6 text-sm leading-relaxed text-[#3e494b]">
              Đảm bảo bài viết có tiêu đề rõ ràng, ảnh chất lượng cao, slug dễ nhớ
              và nội dung liên quan đến điểm đến để tăng khả năng tiếp cận.
            </p>
          </div>

          <div className="absolute right-0 top-0 text-[12rem] text-[#00606c]/10">
            ✨
          </div>
        </div>

        <div className="rounded-[2.5rem] bg-[#e5e9ea] p-8">
          <h4 className="mb-4 text-lg font-black text-slate-800">
            Hoạt động gần đây
          </h4>

          <div className="space-y-4 text-xs text-slate-600">
            <p>• Có {stats.published} bài viết đang được hiển thị.</p>
            <p>• Có {stats.draft} bài viết đang ở trạng thái nháp.</p>
            <p>• Có {stats.hidden} bài viết đã được ẩn khỏi website.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  warning,
}: {
  title: string;
  value: string | number;
  icon: string;
  warning?: boolean;
}) {
  return (
    <div className="group rounded-[2rem] bg-white p-6 shadow-sm transition hover:bg-[#00606c]">
      <div className="mb-4 flex items-start justify-between">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
            warning ? "bg-[#ffdbc9]" : "bg-[#9defff]"
          }`}
        >
          <span className="material-symbols-outlined text-[#00606c] group-hover:text-white">
            {icon}
          </span>
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-[#00606c] group-hover:text-[#9defff]">
          CMS
        </span>
      </div>

      <p className="text-xs font-bold text-slate-500 group-hover:text-white/70">
        {title}
      </p>
      <p className="mt-1 text-2xl font-black text-[#00606c] group-hover:text-white">
        {value}
      </p>
    </div>
  );
}

function SelectFilter({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-full border-none bg-[#f1f4f5] px-5 py-3 text-sm font-bold text-[#00606c] outline-none focus:ring-2 focus:ring-[#00606c]/20"
    >
      {options.map((option) => (
        <option key={option.value || "all"} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function IconButton({
  children,
  title,
  danger,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`rounded-full p-2 transition ${
        danger
          ? "text-slate-400 hover:bg-[#ffdad6] hover:text-[#ba1a1a]"
          : "text-slate-400 hover:bg-[#9defff]/30 hover:text-[#00606c]"
      }`}
    >
      {children}
    </button>
  );
}