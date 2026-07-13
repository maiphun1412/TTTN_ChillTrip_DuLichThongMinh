"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const API_BASE_URL = "/backend-api";

const FALLBACK_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuC5-tjC6vQazuzGN8BMmWlZDHXRDAoEwrQC-_M_hZFS5kSNmNm61TrFhH8n8iU71VeSszKvQkqCooBo1h46tk8tLv-EdZAlVgVML4Fpt9ybhqsiAQd-q-usWJ0aMIsizEgZ1oBaguorHgJ__c7thwzGeLTZG3TNfXc5cP0-PmNoW9N1kT3fl4eJD9bXodezOW1a1YFsIdYLgkRVO_NCZJ-CwokTWiiuR_Y4UULyf2dMrKHzqisinteisz6GuYsEBNKErYBJ2-OVOxkR";

const MAP_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBsBgtL92kPP0NhU-vAnP4Gr1m537gAgWGrohrEH3BNAHdX9DSqmraqA1Q92kdEwy61eZ2Xgxa3rZ96bYUeXT2-wicyBFhQo3dNcbjqKHZ2N1Z4UK05um-93dfkA7TZ5kjACbqmmxWbylBcnV2JInO-8LBmFaxzb9igJcK9YgUv8Qk1W4t8R2CApQdfzAZZhsmP7xFiQbNQwvrzSzxafL6s31EDsDCZc5kDRkHuMoTEQ0TVnSColeqpay-lDHrZs2ipkAtDDKkyztWa";

type Article = {
  id: string | number;
  title: string;
  slug: string;
  summary?: string | null;
  content?: string | null;
  featured_image_url?: string | null;
  status: string;
  published_at?: string | null;
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
      return "Đã xuất bản";
    case "DRAFT":
      return "Bản nháp";
    case "HIDDEN":
      return "Đã ẩn";
    default:
      return status || "-";
  }
}

export default function AdminArticleDetail() {
  const router = useRouter();
  const params = useParams();

  const rawId = params?.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadDetail() {
    if (!id || id === "0" || Number.isNaN(Number(id))) {
      setLoading(false);
      alert("ID bài viết không hợp lệ");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`${API_BASE_URL}/admin/articles/${id}`, {
        cache: "no-store",
        credentials: "include",
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || json?.success === false) {
        alert(json?.message || "Không thể lấy chi tiết bài viết");
        router.push("/admin/articles");
        return;
      }

      setArticle(json?.data || null);
    } catch (error) {
      console.error("LOAD_ARTICLE_DETAIL_ERROR:", error);
      alert("Không thể lấy chi tiết bài viết");
      router.push("/admin/articles");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!id) return;
    loadDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="rounded-[2.5rem] bg-white p-12 text-center shadow-xl shadow-[#00606c]/5">
        <p className="text-sm font-black text-[#00606c]">
          Đang tải chi tiết bài viết...
        </p>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="rounded-[2.5rem] bg-white p-12 text-center shadow-xl shadow-[#00606c]/5">
        <p className="text-sm font-black text-[#6e797b]">
          Không tìm thấy bài viết.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <nav className="flex items-center gap-2 text-sm text-[#3e494b]">
        <button
          onClick={() => router.push("/admin/articles")}
          className="hover:text-[#00606c]"
        >
          Quản lý bài viết
        </button>
        <span className="material-symbols-outlined text-xs">chevron_right</span>
        <span className="font-semibold text-[#00606c]">Chi tiết bài viết</span>
      </nav>

      <header className="mb-10">
        <h1 className="max-w-4xl text-4xl font-extrabold leading-tight tracking-tight text-[#00606c] lg:text-5xl">
          {article.title}
        </h1>

        <div className="mt-6 flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#9defff] text-sm font-black text-[#00606c]">
              AD
            </div>
            <span className="font-semibold text-[#181c1d]">Admin ChillTrip</span>
          </div>

          <div className="h-4 w-px bg-[#bdc8cb]" />

          <div className="flex items-center gap-2 text-[#3e494b]">
            <span className="material-symbols-outlined text-sm">
              calendar_today
            </span>
            <span>{formatDate(article.published_at || article.created_at)}</span>
          </div>

          <span className="rounded-full bg-[#9defff]/40 px-4 py-1 text-xs font-bold uppercase tracking-widest text-[#004f59]">
            {article.category || "Chưa phân loại"}
          </span>
        </div>
      </header>

      <div className="flex flex-col gap-12 lg:flex-row">
        <div className="space-y-12 lg:w-[70%]">
          <div className="group relative aspect-[21/9] w-full overflow-hidden rounded-[2.5rem] shadow-2xl">
            <img
              src={article.featured_image_url || FALLBACK_IMAGE}
              alt={article.title}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </div>

          <article className="max-w-none text-lg leading-relaxed text-[#3e494b]">
            {article.summary && (
              <p className="mb-8 text-xl font-medium text-[#181c1d] first-letter:float-left first-letter:mr-3 first-letter:text-5xl first-letter:font-bold first-letter:text-[#00606c]">
                {article.summary}
              </p>
            )}

            <div className="whitespace-pre-line">{article.content}</div>
          </article>

          <div className="rounded-[2.5rem] bg-[#f1f4f5] p-8">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#00606c]">Cấu hình SEO</h3>
              <span className="rounded-full bg-green-100 px-4 py-1 text-xs font-bold uppercase tracking-widest text-green-700">
                Tốt
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-slate-500">
                  Meta Title
                </label>
                <p className="font-medium text-[#181c1d]">{article.title}</p>
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-slate-500">
                  Meta Description
                </label>
                <p className="text-[#3e494b]">
                  {article.summary || "Chưa có mô tả SEO."}
                </p>
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-6 lg:w-[30%]">
          <div className="rounded-[2.5rem] bg-white p-6 shadow-sm">
            <h4 className="mb-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">
              Trạng thái bài viết
            </h4>

            <div className="flex items-center gap-3">
              <div className="relative">
                <div
                  className={`h-3 w-3 rounded-full ${
                    article.status === "PUBLISHED"
                      ? "bg-green-500"
                      : article.status === "HIDDEN"
                      ? "bg-slate-400"
                      : "bg-[#fc8a40]"
                  }`}
                />
                {article.status === "PUBLISHED" && (
                  <div className="absolute inset-0 animate-ping rounded-full bg-green-500 opacity-75" />
                )}
              </div>
              <span className="text-lg font-bold text-[#181c1d]">
                {getStatusLabel(article.status)}
              </span>
            </div>
          </div>

          <div className="rounded-[2.5rem] bg-white p-6 shadow-sm">
            <h4 className="mb-6 text-[11px] font-bold uppercase tracking-widest text-slate-500">
              Số liệu thống kê
            </h4>

            <div className="grid gap-6">
             <StatInfo icon="tag" value={article.category || "-"} label="Danh mục" />
<StatInfo icon="calendar_today" value={formatDate(article.created_at)} label="Ngày tạo" />
<StatInfo icon="update" value={formatDate(article.updated_at)} label="Cập nhật" />
            </div>
          </div>

          <div className="divide-y divide-[#f1f4f5] rounded-[2.5rem] bg-white p-6 shadow-sm">
            <InfoRow label="Slug" value={article.slug || "-"} />
<InfoRow label="Ngày đăng" value={formatDate(article.published_at)} />
<InfoRow label="ID bài viết" value={String(article.id)} mono />
          </div>

          <div className="space-y-3 pt-6">
            <button
              onClick={() => router.push(`/admin/articles/${article.id}/edit`)}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#00606c] px-6 py-4 font-bold text-white shadow-lg shadow-[#00606c]/20 transition hover:scale-[1.02]"
            >
              <span className="material-symbols-outlined">edit</span>
              <span>Chỉnh sửa</span>
            </button>

            <div className="grid grid-cols-2 gap-3">
              <button className="flex items-center justify-center gap-2 rounded-full bg-[#dfe3e4] px-4 py-4 font-bold text-[#3e494b] transition hover:bg-slate-200">
                <span className="material-symbols-outlined text-sm">archive</span>
                <span className="text-xs">Gỡ bài</span>
              </button>

              <button className="flex items-center justify-center gap-2 rounded-full bg-[#ffdad6] px-4 py-4 font-bold text-[#93000a] transition hover:bg-[#ffdad6]/70">
                <span className="material-symbols-outlined text-sm">delete</span>
                <span className="text-xs">Xóa bài</span>
              </button>
            </div>
          </div>

          <div className="group relative h-48 overflow-hidden rounded-[2.5rem] shadow-sm">
            <img
              src={MAP_IMAGE}
              alt="Bản đồ điểm đến"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-[#00606c]/10 opacity-0 backdrop-blur-[2px] transition-opacity group-hover:opacity-100">
              <button className="rounded-full bg-white px-4 py-2 text-xs font-bold text-[#00606c] shadow-lg">
                Xem vị trí
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function StatInfo({
  icon,
  value,
  label,
}: {
  icon: string;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#9defff] text-[#00606c]">
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <div>
        <p className="text-2xl font-extrabold text-[#181c1d]">{value}</p>
        <p className="text-sm text-[#3e494b]">{label}</p>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  badge,
  mono,
}: {
  label: string;
  value: string;
  badge?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
      <span className="text-sm text-[#3e494b]">{label}</span>
      {badge ? (
        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
          {value}
        </span>
      ) : (
        <span
          className={`font-bold text-[#181c1d] ${
            mono ? "font-mono text-xs text-[#3e494b]" : ""
          }`}
        >
          {value}
        </span>
      )}
    </div>
  );
}