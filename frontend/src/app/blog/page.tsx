"use client";

import { useEffect, useMemo, useState } from "react";
import HomeHeader from "@/components/home/HomeHeader";
import { HomeFooter } from "@/components/home/HomeSections";

type Article = {
  id: string;
  title: string;
  slug: string;
  summary?: string | null;
  content?: string | null;
  featuredImageUrl?: string | null;
  publishedAt?: string | null;
  category?: string | null;
};

const heroImage =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBpjodxY5NORCwQlRLCFdxSiopnGnZuGHcDC7UG-OtPHmG72Ge6dV4Av5uXqDIYiWBy2F_eKHnzz80mXmpMwf1EzkH2lvybM1gzILjU_vEA7ScHMMvPgkF9g1ow-KEKEVxHJAGsQ1o_grILPbMVC8L0qDRHXVF5cSTzVEaHNXf_ZdmdYYyscTSCgVUqkIVx9wP0IkdzqVrIYsAoHSBhu2SOhbZQWqh7n0ff1wlb8Vekf8_skvtpnuqcjc_IXBk90sgx9_s3RZbMMXfm";

const filterItems = ["Tất cả", "Ẩm thực", "Kinh nghiệm", "Điểm đến", "Mẹo vặt"];
const pageSize = 6;

const labelStyles = [
  "bg-[#fc8a40] text-[#672c00]",
  "bg-[#9defff] text-[#001f24]",
  "bg-[#007a93] text-[#e5f7ff]",
];

function formatDate(date?: string | null) {
  if (!date) return "Đang cập nhật";

  return new Date(date).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function BlogPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [activeFilter, setActiveFilter] = useState("Tất cả");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadArticles() {
      try {
        const res = await fetch("/backend-api/articles", {
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error("Không thể lấy danh sách bài viết");
        }

        const json = await res.json();
        setArticles(Array.isArray(json.data) ? json.data : []);
      } catch (error) {
        console.error("Load articles error:", error);
        setArticles([]);
      } finally {
        setLoading(false);
      }
    }

    loadArticles();
  }, []);

  const filteredArticles = useMemo(() => {
    if (activeFilter === "Tất cả") return articles;

    return articles.filter((article) => article.category === activeFilter);
  }, [articles, activeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredArticles.length / pageSize));

  const displayArticles = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredArticles.slice(start, start + pageSize);
  }, [filteredArticles, currentPage]);

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
    setCurrentPage(1);
  };

  return (
    <main className="min-h-screen bg-[#f6fafb] font-['Plus_Jakarta_Sans'] text-[#181c1d]">
      <HomeHeader />

      <header className="relative flex h-[614px] min-h-[500px] items-center justify-center overflow-hidden pt-20">
        <div className="absolute inset-0 z-0">
          <img
            alt="Travel Hero Banner"
            className="h-full w-full object-cover"
            src={heroImage}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#00606c]/30 to-[#f6fafb]" />
        </div>

        <div className="relative z-10 max-w-3xl px-6 text-center">
          <h1 className="mb-6 text-5xl font-extrabold tracking-tighter text-[#00606c] drop-shadow-sm md:text-7xl">
            Cẩm nang du lịch
          </h1>
          <p className="text-lg font-medium leading-relaxed text-[#3e494b] md:text-xl">
            Khám phá những điểm đến mơ ước, kinh nghiệm bỏ túi và những hành
            trình đầy cảm hứng từ cộng đồng ChillTrip.
          </p>
        </div>
      </header>

      <section className="relative z-20 mx-auto -mt-16 max-w-7xl px-6">
        <div className="mb-12">
          <div className="mx-auto flex max-w-fit flex-wrap items-center justify-center gap-2 rounded-full border border-[#bdc8cb]/15 bg-white p-2 shadow-[0_16px_32px_rgba(0,96,108,0.08)] backdrop-blur-xl md:gap-4">
            {filterItems.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => handleFilterChange(item)}
                className={`rounded-full px-6 py-2.5 transition-all hover:scale-105 ${
                  activeFilter === item
                    ? "bg-[#00606c] font-bold text-white"
                    : "font-medium text-[#3e494b] hover:bg-[#9defff]/30"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="rounded-[2rem] bg-white p-12 text-center font-bold text-[#00606c] shadow-sm">
            Đang tải bài viết...
          </div>
        ) : displayArticles.length === 0 ? (
          <div className="rounded-[2rem] bg-white p-12 text-center font-bold text-[#00606c] shadow-sm">
            Chưa có bài viết nào trong mục này.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {displayArticles.map((article, index) => (
              <article
                key={article.id}
                className={`group overflow-hidden rounded-[3rem] bg-white shadow-sm transition-shadow duration-500 hover:shadow-xl ${
                  index === 1 || index === 4 ? "lg:translate-y-6" : ""
                }`}
              >
                <div className="relative h-64 overflow-hidden">
                  <img
                    alt={article.title}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    src={
                      article.featuredImageUrl ||
                      "/images/tours/dalat-cover.jpg"
                    }
                  />

                  <span
                    className={`absolute left-4 top-4 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest backdrop-blur-xl ${
                      labelStyles[index % labelStyles.length]
                    }`}
                  >
                    {article.category || "Cẩm nang"}
                  </span>
                </div>

                <div className="p-8">
                  <p className="mb-3 text-xs font-medium tracking-wide text-[#6e797b]">
                    {formatDate(article.publishedAt)}
                  </p>

                  <h3 className="mb-4 text-2xl font-bold leading-tight text-[#00606c] transition-colors group-hover:text-[#9b4500]">
                    {article.title}
                  </h3>

                  <p className="mb-6 line-clamp-3 text-sm leading-relaxed text-[#3e494b]">
                    {article.summary ||
                      article.content ||
                      "Nội dung bài viết đang được cập nhật."}
                  </p>

                  <a
                    className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-[#00606c] transition-all hover:gap-4"
                    href={`/blog/${article.slug}`}
                  >
                    Chi tiết <ArrowRightIcon />
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}

        <nav className="mb-10 mt-20 flex justify-center">
          <div className="inline-flex items-center gap-3 rounded-full bg-[#f1f4f5] p-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#00606c] shadow-sm transition-all hover:bg-[#00606c] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeftIcon />
            </button>

            {Array.from({ length: totalPages }).map((_, index) => {
              const page = index + 1;

              return (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`flex h-12 w-12 items-center justify-center rounded-full font-bold transition-all ${
                    currentPage === page
                      ? "bg-[#00606c] text-white shadow-md"
                      : "bg-white text-[#3e494b] hover:bg-[#9defff]/50"
                  }`}
                >
                  {page}
                </button>
              );
            })}

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() =>
                setCurrentPage((page) => Math.min(totalPages, page + 1))
              }
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#00606c] shadow-sm transition-all hover:bg-[#00606c] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRightIcon />
            </button>
          </div>
        </nav>
      </section>

      <HomeFooter />
    </main>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 12h14m-6-6 6 6-6 6"
      />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
    </svg>
  );
}