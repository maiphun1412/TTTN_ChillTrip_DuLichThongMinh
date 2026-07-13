"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const API_BASE_URL = "/backend-api";

type ArticleForm = {
  title: string;
  slug: string;
  summary: string;
  content: string;
  featuredImage: string;
  status: "DRAFT" | "PUBLISHED" | "HIDDEN";
  publishedAt: string;
  category: string;
};

const FALLBACK_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAwDLP1RGg2wwfW94fW15837ZrsgVHKsZ-oOw6ZX6eugtfp9zraVlMc8PmqodCPkzxliqXauz3XWn1CI4hIVNMYWqc7QrAQzx9ZmHTjBs9H3b49IYxZcWmCfr3X96er5-WmWU0D-iZkiU07geOp8VuvFfpNVSFigyg__XMtq9NwzcE4AoPKMcillbLl4X90z5eMQ8eg3_gawVjUkjzw8u5nOtRgdy2yYTOXPKyX1SuuiJruLf9JLb5lkqYN4eh-4IMsd1E-J_fgG7Ig";

function emptyForm(): ArticleForm {
  return {
    title: "",
    slug: "",
    summary: "",
    content: "",
    featuredImage: "",
    status: "DRAFT",
    publishedAt: "",
    category: "Kinh nghiệm",
  };
}

function formatDateInput(value?: string | null) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function makeSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export default function AdminArticleEdit() {
  const router = useRouter();
  const params = useParams();

  const rawId = params?.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  const [form, setForm] = useState<ArticleForm>(emptyForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  function updateForm<K extends keyof ArticleForm>(
    key: K,
    value: ArticleForm[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

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

      const data = json?.data;

     setForm({
  title: data?.title || "",
  slug: data?.slug || "",
  summary: data?.summary || "",
  content: data?.content || "",
  featuredImage: data?.featured_image_url || "",
  status: data?.status || "DRAFT",
  publishedAt: formatDateInput(data?.published_at),
  category: data?.category || "Kinh nghiệm",
});
    } catch (error) {
      console.error("LOAD_ARTICLE_EDIT_ERROR:", error);
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

  async function handleSave() {
    if (!form.title.trim()) {
      alert("Vui lòng nhập tiêu đề bài viết");
      return;
    }

    if (!form.slug.trim()) {
      alert("Vui lòng nhập slug bài viết");
      return;
    }

    if (!form.content.trim()) {
      alert("Vui lòng nhập nội dung bài viết");
      return;
    }

    try {
      setSaving(true);

      const res = await fetch(`${API_BASE_URL}/admin/articles/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || json?.success === false) {
        alert(json?.message || "Cập nhật bài viết thất bại");
        return;
      }

      alert("Cập nhật bài viết thành công");
      router.push(`/admin/articles/${id}`);
      router.refresh();
    } catch (error) {
      console.error("UPDATE_ARTICLE_ERROR:", error);
      alert("Không thể cập nhật bài viết");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-[2.5rem] bg-white p-12 text-center shadow-xl shadow-[#00606c]/5">
        <p className="text-sm font-black text-[#00606c]">
          Đang tải bài viết...
        </p>
      </div>
    );
  }

  return (
    <div className="relative space-y-8 pb-24">
      <nav className="mb-6 flex items-center gap-2 text-sm text-[#3e494b]">
        <button
          onClick={() => router.push("/admin/articles")}
          className="transition hover:text-[#00606c]"
        >
          Quản lý bài viết
        </button>
        <span className="material-symbols-outlined text-xs">chevron_right</span>
        <span className="font-bold text-[#00606c]">Chỉnh sửa bài viết</span>
      </nav>

      <section className="mb-10 space-y-4">
        <label className="ml-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[#6e797b]">
          Tiêu đề bài viết
        </label>

        <input
          value={form.title}
          onChange={(e) => {
            const value = e.target.value;
            updateForm("title", value);
            if (!form.slug.trim()) {
              updateForm("slug", makeSlug(value));
            }
          }}
          placeholder="Nhập tiêu đề bài viết..."
          className="w-full rounded-[2rem] border-none bg-transparent p-4 text-4xl font-black tracking-tight text-[#00606c] outline-none transition placeholder:text-[#00606c]/20 hover:bg-[#f1f4f5] focus:ring-0 md:text-5xl"
        />
      </section>

      <section className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        <div className="space-y-8 lg:col-span-8">
          <div className="grid grid-cols-1 gap-6 rounded-[2.5rem] border border-[#007b8a]/5 bg-white p-8 shadow-sm md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#3e494b]">
                Danh mục
              </label>

              <div className="relative">
                <select
                  value={form.category}
                  onChange={(e) => updateForm("category", e.target.value)}
                  className="w-full appearance-none rounded-full border-none bg-[#f1f4f5] px-6 py-3 text-[#181c1d] outline-none focus:ring-2 focus:ring-[#00606c]/20"
                >
                  <option value="Kinh nghiệm">Kinh nghiệm</option>
                  <option value="Ẩm thực">Ẩm thực</option>
                  <option value="Điểm đến">Điểm đến</option>
                  <option value="Mẹo vặt">Mẹo vặt</option>
                  <option value="Trải nghiệm">Trải nghiệm</option>
                  <option value="Lưu trú">Lưu trú</option>
                </select>

                <span className="material-symbols-outlined pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#6e797b]">
                  expand_more
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#3e494b]">
                Slug bài viết
              </label>

              <input
                value={form.slug}
                onChange={(e) => updateForm("slug", e.target.value)}
                className="w-full rounded-full border-none bg-[#f1f4f5] px-6 py-3 text-[#181c1d] outline-none focus:ring-2 focus:ring-[#00606c]/20"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#3e494b]">
                Trạng thái
              </label>

              <div className="relative">
                <select
                  value={form.status}
                  onChange={(e) =>
                    updateForm("status", e.target.value as ArticleForm["status"])
                  }
                  className="w-full appearance-none rounded-full border-none bg-[#f1f4f5] px-6 py-3 text-[#181c1d] outline-none focus:ring-2 focus:ring-[#00606c]/20"
                >
                  <option value="DRAFT">Nháp</option>
                  <option value="PUBLISHED">Đã đăng</option>
                  <option value="HIDDEN">Đã ẩn</option>
                </select>

                <span className="material-symbols-outlined pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#6e797b]">
                  expand_more
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#3e494b]">
                Ngày đăng
              </label>

              <input
                type="date"
                value={form.publishedAt}
                onChange={(e) => updateForm("publishedAt", e.target.value)}
                className="w-full rounded-full border-none bg-[#f1f4f5] px-6 py-3 text-[#181c1d] outline-none focus:ring-2 focus:ring-[#00606c]/20"
              />
            </div>

            <div className="space-y-2 pt-2 md:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#3e494b]">
                Tóm tắt ngắn gọn
              </label>

              <textarea
                value={form.summary}
                onChange={(e) => updateForm("summary", e.target.value)}
                rows={3}
                className="w-full resize-none rounded-[1.5rem] border-none bg-[#f1f4f5] px-6 py-4 text-[#181c1d] outline-none focus:ring-2 focus:ring-[#00606c]/20"
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-[2.5rem] border border-[#007b8a]/5 bg-white shadow-sm">
            <div className="flex flex-wrap gap-2 border-b border-[#bdc8cb]/20 bg-[#f1f4f5] p-4">
              {[
                "format_bold",
                "format_italic",
                "link",
                "image",
                "format_list_bulleted",
                "format_quote",
                "undo",
                "redo",
              ].map((icon) => (
                <button
                  key={icon}
                  type="button"
                  className="rounded-lg p-2 text-[#3e494b] transition hover:bg-white"
                >
                  <span className="material-symbols-outlined">{icon}</span>
                </button>
              ))}
            </div>

            <textarea
              value={form.content}
              onChange={(e) => updateForm("content", e.target.value)}
              placeholder="Bắt đầu viết nội dung bài viết tại đây..."
              rows={18}
              className="w-full resize-none border-none p-8 text-lg leading-relaxed text-[#3e494b] outline-none focus:ring-0"
            />
          </div>
        </div>

        <aside className="space-y-8 lg:col-span-4">
          <div className="space-y-4 rounded-[2.5rem] border border-[#007b8a]/5 bg-white p-6 shadow-sm">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[#3e494b]">
              Ảnh bìa bài viết
            </label>

            <div className="group relative aspect-video overflow-hidden rounded-[2rem] shadow-md">
              <img
  src={form.featuredImage || FALLBACK_IMAGE}
  alt={form.title || "Ảnh bìa bài viết"}
  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
/>

              <div className="absolute inset-0 flex items-center justify-center bg-[#00606c]/40 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                <span className="flex scale-90 items-center gap-2 rounded-full bg-white px-6 py-2 text-sm font-bold text-[#00606c] shadow-xl transition-transform group-hover:scale-100">
                  <span className="material-symbols-outlined text-sm">edit</span>
                  Thay đổi ảnh
                </span>
              </div>
            </div>

            <input
              value={form.featuredImage}
              onChange={(e) => updateForm("featuredImage", e.target.value)}
              placeholder="Nhập URL ảnh bìa"
              className="w-full rounded-full border-none bg-[#f1f4f5] px-5 py-3 text-sm font-semibold text-[#181c1d] outline-none focus:ring-2 focus:ring-[#00606c]/20"
            />
          </div>

          <div className="space-y-6 rounded-[2.5rem] border border-[#007b8a]/5 bg-white p-8 shadow-sm">
            <h3 className="border-b border-[#bdc8cb]/20 pb-4 text-sm font-bold uppercase tracking-widest text-[#00606c]">
              Cài đặt bài viết
            </h3>

            <SettingLine
              title="Cho phép bình luận"
              desc="Người dùng có thể thảo luận"
              active
            />

            <SettingLine
              title="Bài viết nổi bật"
              desc="Hiển thị đầu trang chủ"
              active={form.status === "PUBLISHED"}
            />

            <SettingLine
              title="Đặt làm bản nháp"
              desc="Không công khai bài viết"
              active={form.status === "DRAFT"}
            />
          </div>

          <div className="space-y-3 pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full rounded-full bg-gradient-to-r from-[#9b4500] to-[#fc8a40] py-5 text-center font-extrabold tracking-wide text-white shadow-lg shadow-[#9b4500]/20 transition hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "ĐANG LƯU..." : "LƯU THAY ĐỔI"}
            </button>

            <button
              onClick={() => router.push(`/admin/articles/${id}`)}
              className="w-full rounded-full bg-[#e5e9ea] py-5 text-center font-bold tracking-wide text-[#3e494b] transition hover:bg-[#dfe3e4]"
            >
              HỦY BỎ
            </button>
          </div>

          <div className="rounded-[2rem] border border-[#00606c]/10 bg-[#00606c]/5 p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-white p-3 text-[#00606c]">
                <span className="material-symbols-outlined">visibility</span>
              </div>
              <div>
                <p className="text-xs font-medium text-[#3e494b]">
                  Lượt xem hiện tại
                </p>
                <p className="text-xl font-black text-[#00606c]">12,840</p>
              </div>
            </div>
          </div>
        </aside>
      </section>

      <button
        onClick={() => router.push(`/admin/articles/${id}`)}
        className="group fixed bottom-10 right-10 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-[#007b8a] text-[#ddf9ff] shadow-2xl transition hover:scale-110 active:scale-90"
      >
        <span className="material-symbols-outlined">visibility</span>
        <span className="absolute right-20 whitespace-nowrap rounded-full bg-[#00606c] px-4 py-2 text-xs font-bold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
          Xem trước bài viết
        </span>
      </button>
    </div>
  );
}

function SettingLine({
  title,
  desc,
  active,
}: {
  title: string;
  desc: string;
  active: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-1">
        <p className="text-sm font-bold text-[#181c1d]">{title}</p>
        <p className="text-xs text-[#3e494b]">{desc}</p>
      </div>

      <div
        className={`flex h-6 w-12 items-center rounded-full px-1 transition-colors ${
          active ? "bg-[#00606c]" : "bg-[#e5e9ea]"
        }`}
      >
        <div
          className={`h-4 w-4 rounded-full bg-white transition-transform ${
            active ? "translate-x-6" : "translate-x-0"
          }`}
        />
      </div>
    </div>
  );
}