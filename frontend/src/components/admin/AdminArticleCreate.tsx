"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE_URL = "/backend-api";

export default function AdminArticleCreate() {
  const router = useRouter();

  const [form, setForm] = useState({
    title: "",
    category: "Kinh nghiệm",
    readingTime: 5,
    summary: "",
    content: "",
    featuredImage: "",
    allowComment: true,
    isFeatured: false,
  });

  const [loading, setLoading] = useState(false);

  function updateForm(key: string, value: any) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(status: "PUBLISHED" | "DRAFT") {
    if (!form.title.trim()) {
      alert("Nhập tiêu đề");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`${API_BASE_URL}/admin/articles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: form.title,
          slug: form.title.toLowerCase().replace(/\s+/g, "-"),
          summary: form.summary,
          content: form.content,
          featuredImage: form.featuredImage,
          status,
           category: form.category,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || json?.success === false) {
        alert(json?.message || "Tạo bài viết thất bại");
        return;
      }

      router.push(`/admin/articles/${json.data.id}`);
    } catch (err) {
      console.error(err);
      alert("Lỗi tạo bài viết");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-black text-[#00606c]">
        Tạo bài viết mới
      </h1>

      <div className="grid grid-cols-12 gap-8">
        {/* LEFT */}
        <div className="col-span-12 lg:col-span-8 space-y-8">
          <div className="bg-white p-8 rounded-[2rem] space-y-6">
            {/* TITLE */}
            <div>
              <label className="text-xs font-bold text-[#00606c]">
                Tiêu đề
              </label>
              <input
                value={form.title}
                onChange={(e) => updateForm("title", e.target.value)}
                className="w-full text-3xl font-black outline-none"
                placeholder="Nhập tiêu đề..."
              />
            </div>

            {/* CATEGORY + TIME */}
            <div className="grid grid-cols-2 gap-6">
              <select
                value={form.category}
                onChange={(e) => updateForm("category", e.target.value)}
                className="rounded-full bg-[#f1f4f5] px-6 py-3"
              >
                <option>Kinh nghiệm</option>
                <option>Ẩm thực</option>
                <option>Mẹo vặt</option>
                <option>Điểm đến</option>
              </select>

              <input
                type="number"
                value={form.readingTime}
                onChange={(e) =>
                  updateForm("readingTime", Number(e.target.value))
                }
                className="rounded-full bg-[#f1f4f5] px-6 py-3"
              />
            </div>

            {/* SUMMARY */}
            <textarea
              value={form.summary}
              onChange={(e) => updateForm("summary", e.target.value)}
              className="w-full bg-[#f1f4f5] rounded-xl p-4"
              placeholder="Tóm tắt..."
            />

          </div>

          {/* CONTENT */}
          <div className="bg-white rounded-[2rem] overflow-hidden">
            <div className="p-4 border-b">
              Editor
            </div>

            <textarea
              value={form.content}
              onChange={(e) => updateForm("content", e.target.value)}
              className="w-full min-h-[400px] p-6 outline-none"
              placeholder="Viết nội dung bài..."
            />
          </div>
        </div>

        {/* RIGHT */}
        <div className="col-span-12 lg:col-span-4 space-y-8">
          {/* IMAGE */}
          <div className="bg-white p-6 rounded-[2rem] space-y-4">
            <label className="text-xs font-bold text-[#00606c]">
              Ảnh bìa
            </label>

            <input
              type="text"
              placeholder="Link ảnh..."
              value={form.featuredImage}
              onChange={(e) =>
                updateForm("featuredImage", e.target.value)
              }
              className="w-full bg-[#f1f4f5] rounded-full px-4 py-3"
            />

            {form.featuredImage && (
  <img
    src={form.featuredImage}
    alt="Ảnh bìa bài viết"
    className="absolute inset-0 h-full w-full object-cover opacity-80 transition-transform duration-700 group-hover:scale-105"
  />
)}
          </div>

          {/* SETTINGS */}
          <div className="bg-white p-6 rounded-[2rem] space-y-6">
            <h3 className="font-bold text-[#00606c]">
              Cài đặt
            </h3>

            <Toggle
              label="Cho phép bình luận"
              checked={form.allowComment}
              onChange={(v) => updateForm("allowComment", v)}
            />

            <Toggle
              label="Bài viết nổi bật"
              checked={form.isFeatured}
              onChange={(v) => updateForm("isFeatured", v)}
            />

            {/* BUTTON */}
            <div className="space-y-3 pt-4">
              <button
                onClick={() => handleSubmit("PUBLISHED")}
                disabled={loading}
                className="w-full bg-[#00606c] text-white py-4 rounded-full font-bold"
              >
                Xuất bản
              </button>

              <button
                onClick={() => handleSubmit("DRAFT")}
                disabled={loading}
                className="w-full bg-[#f1f4f5] py-4 rounded-full font-bold"
              >
                Lưu nháp
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="font-semibold">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </div>
  );
}