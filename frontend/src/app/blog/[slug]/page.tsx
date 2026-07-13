"use client";

import { useEffect, useMemo, useState } from "react";
import HomeHeader from "@/components/home/HomeHeader";
import { HomeFooter } from "@/components/home/HomeSections";

type Article = {
  id: string;
  title: string;
  slug: string;
  summary?: string | null;
  content: string;
  featuredImageUrl?: string | null;
  publishedAt?: string | null;
  createdAt?: string | null;
  category?: string | null;
};

type ApiTour = {
  id: string;
  tourName: string;
  tourType: string;
  basePrice: string | number;
  imageUrl?: string | null;
  destination?: {
    name?: string | null;
    country?: string | null;
    city?: string | null;
  } | null;
};

const fallbackHeroImage =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBIT-s6qY2TrSOyjGPy8xX7r-5RRFm78l7wYL5iwBVOdhwnuj9HDxNNCaYnPB-iEP5fgOkZczNlW7lH5jVJtsYjyqf2ZFSZHyHoAd7y5GyFrIuv5fMs14DMxErWB9nTfuIAn5qx3HrQftafn3q1fT1ZPQNqnyTJmVUCtknmHllMUfPaXPpbxxBmpd_DT3Gw3X4co7IulWA2l6n3dYjbZDF-DQ3rMnO2LYOyCDn5COKLlHOmu4tWfEbqJPwuLj7WC4pp5EDVqzNjIdzU";

const relatedImages = [
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDqQ2_A1_JQaSN8iiwmYJBWDKaXSwRNrPsU4EzOmGr7K1fvWBfYlKT_S5Jd1cyZpsozE-f2Xq_W5pTHf2p0hKf4Cr8P4-0NI9LO1_KYKHmAmpeVXW3TlANxif-eDVTeTdfu6hNm0lTex5V3OeplirPpEo2JD3S272pXMqrxJBI53SZEP3OukVhqrKyeXVy0nD7saiGbno_PH6FuO0tFd2P84po85p9VxSkHKBUkJ9wmO6gIbzi00g7XHa_1iAwxovra0cayAhLydqTI",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBBRQ-DseHIakZ6ROrfeDaLde0Ss9yt5qiDAJx9TRMFLGFoh5vAKUcUmmbqlGsCG8wbgUqjQj6y0eVty8lnv3ZAUaKSG7TveNnDl_rKk1gTowiZpvYYRcxtftM6yU3oWlymA164PE91NMARRv2eAR-QFNMH3doAWoyCyafkkWmYEZxFPVELZfMHTIQV1dfXP2wBAyzeYQrrXufl3MH4XzDzGT3aUlz0R-RrLh0R1eyFVfkVCewgPitdwPtezvtcdVwepEdaPs8rM_KI",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCvPwGZOW6rPrF7hm6MW6_UExMon4kY6GYeV_IrkY1HcQDVe_W02NZupJBTWOzXq2XI51xCzUcS6PuVJQnBVkYEXCmlbPBDTIx9iaznlB4xsoLHB49GEEpaYo46zerORlxwXJyu72tsnaURySm5e-tg_0fkTpQlRa1kLM34VKaHWCAC8u_Mihyx8f88w_33xdzmNxRiFO9TL9RrK5Y-IH0ydHWZjcKNx2xoeuf-5S6ul6RwHIAnhJhLzjjr_xfxsWucCNq6GeIUaCw7",
];

const sidebarImages = [
  "https://lh3.googleusercontent.com/aida-public/AB6AXuB2iwthRb9cOW5XTU6xblXbrOJLUVeQolxEYvUjlfYD4HOdSIOlDEc9iLBrOHFO4rRjv_lTblNmRl0wM_4CZ3h0-WVYCaaLF-teL-XwAIeUfQJbqA5XPBwEnvxg8GNQM_-Zz_crotiljiibjn1w3PU0rkzS_B_yH0aRm2bJj_Y1z7arn-yR6i3w131IvGX5KkXDDCOm7g8dtcULbRAlACPORNxh943dV8fjgpd6k0e8nvWUsKl5gfmkUGf_ulcHJ1sTUXnGVRhShxwo",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBS7ZO8Fe5RIW0FO6pLR6ipKS3I4o0W-IbpsQntlMMBmpJZdpI2yhidbIkZUJzzTt5_Ua8BZ0Wh-tuXug01V-whOHkoW5t5lZPLmJhIZ-nuCsl0aEZQvoaoPb2vJxON8Ww_EWt1gCnetNEFQQ12IMyZtsVtKNuEVrlU4mDnpBQ6fscpZ8yIQWKzocy1zTN8KwL2SEK1jbMA0KaJ3dt_JtOR_xXwQVUdEE8UqM078NHDXhA5-8xanW44Ar-KH6jm0BboYp-80keDGAsh",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuA2Cw8liTza78t8DZi2_sB_hmt66ptGcph7re8acUN0st1cLDXPY_uKoRqE0wQX04v4l9UsVe_O2CVFDGek-x2v_zvIt4XmnIjOMxLC5wRkcyDLeSh2sZ2acTQv_Kj78-Q0XCQ8dAAq5HQnZtmcGY1W-ys9cUrDaQ75f2IA4xrkwR7WqguelnS8TF1J4dUcoTDpQmNwBgw499LfxE4ukDqB5oLCtnsMy2dW7iheMoqnq_y_Acub03ui7XBNcSHb6yu_I7WWPpjr6UCv",
];

function formatDate(date?: string | null) {
  if (!date) return "Đang cập nhật";
  return new Date(date).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatPrice(price?: string | number | null) {
  return `${Number(price || 0).toLocaleString("vi-VN")}đ`;
}

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

function scoreTour(article: Article, tour: ApiTour) {
  const text = `${article.title} ${article.summary || ""} ${
    article.content || ""
  }`.toLowerCase();

  const tourText = `${tour.tourName} ${tour.destination?.name || ""} ${
    tour.destination?.city || ""
  } ${tour.destination?.country || ""}`.toLowerCase();

  let score = 0;

  const keywordGroups = [
    ["đà lạt", "dalat", "lâm đồng"],
    ["phú quốc", "phu quoc", "kiên giang"],
    ["bangkok", "thái lan", "thailand"],
    ["hàn quốc", "seoul", "korea"],
    ["nhật bản", "tokyo", "japan", "fuji"],
    ["singapore"],
    ["hạ long", "ha long", "quảng ninh"],
    ["sapa", "fansipan", "lào cai"],
    ["đà nẵng", "da nang", "hội an", "huế"],
    ["nha trang", "khánh hòa"],
  ];

  keywordGroups.forEach((group) => {
    const articleHasKeyword = group.some((keyword) => text.includes(keyword));
    const tourHasKeyword = group.some((keyword) => tourText.includes(keyword));

    if (articleHasKeyword && tourHasKeyword) {
      score += 10;
    }
  });

  if (
    (text.includes("nước ngoài") ||
      text.includes("quốc tế") ||
      text.includes("visa") ||
      text.includes("hộ chiếu")) &&
    tour.tourType === "INTERNATIONAL"
  ) {
    score += 5;
  }

  if (
    (text.includes("trong nước") ||
      text.includes("việt nam") ||
      text.includes("đặc sản")) &&
    tour.tourType === "DOMESTIC"
  ) {
    score += 3;
  }

  return score;
}

export default function BlogDetailPage() {
  const [article, setArticle] = useState<Article | null>(null);
  const [allArticles, setAllArticles] = useState<Article[]>([]);
  const [tours, setTours] = useState<ApiTour[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadArticle() {
      try {
        const slug = window.location.pathname.split("/").filter(Boolean).pop();

        if (!slug) {
          throw new Error("Thiếu slug bài viết");
        }

        const [detailRes, listRes, tourRes] = await Promise.all([
          fetch(`/backend-api/articles/${slug}`, { cache: "no-store" }),
          fetch("/backend-api/articles", { cache: "no-store" }),
          fetch("/backend-api/tours", { cache: "no-store" }),
        ]);

        if (!detailRes.ok) {
          throw new Error("Không thể lấy chi tiết bài viết");
        }

        const detailJson = await detailRes.json();
        const listJson = listRes.ok ? await listRes.json() : { data: [] };
        const tourJson = tourRes.ok ? await tourRes.json() : { data: [] };

        setArticle(detailJson.data || null);
        setAllArticles(Array.isArray(listJson.data) ? listJson.data : []);
        setTours(Array.isArray(tourJson.data) ? tourJson.data : []);
      } catch (error) {
        console.error("Load article detail error:", error);
        setArticle(null);
      } finally {
        setLoading(false);
      }
    }

    loadArticle();
  }, []);

  const relatedArticles = useMemo(() => {
    if (!article) return [];

    return allArticles
      .filter(
        (item) =>
          item.slug !== article.slug && item.category === article.category
      )
      .slice(0, 3);
  }, [allArticles, article]);

  const featuredArticles = useMemo(() => {
    if (!article) return [];

    return allArticles
      .filter(
        (item) =>
          item.slug !== article.slug &&
          !relatedArticles.some((related) => related.slug === item.slug)
      )
      .slice(0, 3);
  }, [allArticles, article, relatedArticles]);

  const suggestedTours = useMemo(() => {
    if (!article) return [];

    return [...tours]
      .map((tour) => ({
        tour,
        score: scoreTour(article, tour),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
      .map((item) => item.tour);
  }, [article, tours]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f6fafb] text-[#181c1d]">
        <HomeHeader />
        <div className="mx-auto max-w-7xl px-4 py-40 text-center text-xl font-bold text-[#00606c]">
          Đang tải bài viết...
        </div>
      </main>
    );
  }

  if (!article) {
    return (
      <main className="min-h-screen bg-[#f6fafb] text-[#181c1d]">
        <HomeHeader />
        <div className="mx-auto max-w-7xl px-4 py-40 text-center text-xl font-bold text-[#00606c]">
          Không tìm thấy bài viết.
        </div>
      </main>
    );
  }

  const heroImage = article.featuredImageUrl || fallbackHeroImage;
  const contentParts = article.content
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);

  return (
    <main className="min-h-screen bg-[#f6fafb] text-[#181c1d]">
      <HomeHeader />

      <section className="relative mb-12 flex h-[56vh] min-h-[430px] w-full items-center justify-center overflow-hidden md:h-[64vh]">
        <div className="absolute inset-0 z-0">
          <img
            alt={article.title}
            className="h-full w-full scale-105 object-cover"
            src={heroImage}
          />
          <div className="absolute inset-0 bg-black/30 bg-gradient-to-b from-black/20 via-transparent to-[#f6fafb]/90" />
        </div>

        <div className="relative z-10 w-full max-w-5xl px-4 md:px-8">
          <div className="rounded-[2.5rem] border border-white/20 bg-white/10 p-7 shadow-2xl backdrop-blur-2xl transition-all duration-500 hover:bg-white/15 md:p-12">
            <div className="flex flex-col items-center space-y-5 text-center">
              <span className="rounded-full bg-[#9b4500] px-6 py-2 text-xs font-extrabold uppercase tracking-[0.2em] text-white shadow-lg shadow-[#9b4500]/20">
                {article.category || "Cẩm nang du lịch"}
              </span>

              <h1 className="text-3xl font-extrabold leading-[1.1] tracking-tight text-white drop-shadow-md md:text-6xl">
                {article.title}
              </h1>

              <div className="mx-auto flex w-full max-w-md flex-wrap items-center justify-center gap-6 border-t border-white/20 pt-4 font-semibold tracking-wide text-white/90">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-[#9defff]" />
                  <span className="text-sm opacity-90">
                    {formatDate(article.publishedAt || article.createdAt)}
                  </span>
                </div>

                <div className="hidden h-1 w-1 rounded-full bg-white/40 md:block" />

                <div className="flex items-center gap-2">
                  <UserIcon className="h-5 w-5 text-[#9defff]" />
                  <span className="text-sm opacity-90">Bởi Admin</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-4 md:px-8 lg:grid-cols-3">
        <article className="space-y-10 lg:col-span-2">
          <div
            id="noi-dung"
            className="scroll-mt-28 rounded-[3rem] bg-white p-8 shadow-xl shadow-[#00606c]/5 md:p-12"
          >
            {article.summary ? (
              <p className="mb-8 text-xl font-medium leading-relaxed text-[#3e494b]">
                {article.summary}
              </p>
            ) : null}

            <h2 className="mb-6 text-3xl font-bold text-[#00606c]">
              Nội dung bài viết
            </h2>

            <div className="space-y-6 leading-relaxed text-[#3e494b]">
              {contentParts.length > 0 ? (
                contentParts.map((part, index) => <p key={index}>{part}</p>)
              ) : (
                <p>Nội dung bài viết đang được cập nhật.</p>
              )}
            </div>

            <div className="relative my-10 overflow-hidden rounded-[3rem] bg-[#f1f4f5] px-8 py-12">
              <span className="absolute left-4 top-4 font-serif text-8xl text-[#00606c] opacity-20">
                “
              </span>
              <blockquote className="relative z-10 text-center text-2xl font-medium italic text-[#00606c]">
                Có những nơi bạn đến để nhìn ngắm, nhưng có những nơi bạn đến để
                lắng nghe chính tiếng lòng mình.
              </blockquote>
              <span className="absolute bottom-0 right-4 font-serif text-8xl text-[#00606c] opacity-20">
                ”
              </span>
            </div>

            <div id="tour-goi-y" className="scroll-mt-28 my-16 space-y-8">
              <h4 className="border-l-4 border-[#9b4500] pl-4 text-2xl font-bold text-[#00606c]">
                Tour gợi ý dành cho bạn
              </h4>

              {suggestedTours.length === 0 ? (
                <div className="rounded-[2rem] bg-[#f1f4f5] p-6 font-semibold text-[#00606c]">
                  Chưa có tour phù hợp để gợi ý.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {suggestedTours.map((tour) => (
                    <SuggestedTourCard key={tour.id} tour={tour} />
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 border-t border-[#bdc8cb]/15 pt-8">
              {["#ChillTrip", "#KinhNghiemDuLich", "#VietNamTravel"].map(
                (tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-[#e5e9ea] px-4 py-1 text-xs font-medium text-[#3e494b]"
                  >
                    {tag}
                  </span>
                )
              )}
            </div>
          </div>

          <div id="bai-viet-lien-quan" className="scroll-mt-28 mt-16">
            <h3 className="mb-8 text-2xl font-bold text-[#181c1d]">
              Bài viết liên quan
            </h3>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {(relatedArticles.length > 0 ? relatedArticles : allArticles)
                .filter((item) => item.slug !== article.slug)
                .slice(0, 3)
                .map((item, index) => (
                  <a
                    key={`${item.id}-${index}`}
                    href={`/blog/${item.slug}`}
                    className="group cursor-pointer"
                  >
                    <div className="mb-4 aspect-[4/3] overflow-hidden rounded-[3rem]">
                      <img
                        alt={item.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                        src={
                          item.featuredImageUrl ||
                          relatedImages[index % relatedImages.length]
                        }
                      />
                    </div>
                    <h4 className="line-clamp-2 font-bold text-[#181c1d] transition-colors group-hover:text-[#00606c]">
                      {item.title}
                    </h4>
                  </a>
                ))}
            </div>
          </div>
        </article>

        <aside className="space-y-12">
          <div className="sticky top-28 rounded-[3rem] bg-[#f1f4f5] p-8">
            <h4 className="mb-6 flex items-center gap-2 text-xl font-bold text-[#00606c]">
              <ListIcon className="h-5 w-5" />
              Mục lục bài viết
            </h4>

            <nav className="space-y-4 text-[#3e494b]">
              <button
                type="button"
                onClick={() => scrollToSection("noi-dung")}
                className="block border-l-2 border-[#007b8a] pl-4 text-left font-medium transition-colors hover:text-[#00606c]"
              >
                1. Nội dung bài viết
              </button>
              <button
                type="button"
                onClick={() => scrollToSection("tour-goi-y")}
                className="block pl-4 text-left transition-colors hover:text-[#00606c]"
              >
                2. Tour gợi ý
              </button>
              <button
                type="button"
                onClick={() => scrollToSection("bai-viet-lien-quan")}
                className="block pl-4 text-left transition-colors hover:text-[#00606c]"
              >
                3. Bài viết liên quan
              </button>
            </nav>

            <div className="mt-12">
              <h4 className="mb-6 text-xl font-bold text-[#00606c]">
                Bài viết nổi bật
              </h4>

              <div className="space-y-6">
                {(featuredArticles.length > 0 ? featuredArticles : allArticles)
                  .filter((item) => item.slug !== article.slug)
                  .slice(0, 3)
                  .map((item, index) => (
                    <a
                      href={`/blog/${item.slug}`}
                      key={`${item.id}-side-${index}`}
                      className="group flex cursor-pointer gap-4"
                    >
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl">
                        <img
                          alt={item.title}
                          className="h-full w-full object-cover transition-transform group-hover:scale-110"
                          src={
                            item.featuredImageUrl ||
                            sidebarImages[index % sidebarImages.length]
                          }
                        />
                      </div>
                      <div className="flex flex-col justify-center">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#9b4500]">
                          {item.category || "Cẩm nang"}
                        </span>
                        <h5 className="line-clamp-2 text-sm font-bold transition-colors group-hover:text-[#00606c]">
                          {item.title}
                        </h5>
                      </div>
                    </a>
                  ))}
              </div>
            </div>

            <div className="mt-12 rounded-[3rem] bg-[#007b8a] p-6 text-[#ddf9ff]">
              <h4 className="mb-2 text-lg font-bold">
                Nhận tin du lịch mới nhất!
              </h4>
              <p className="mb-4 text-xs opacity-90">
                Chúng tôi sẽ gửi cho bạn những deal hời nhất mỗi tuần.
              </p>
              <input
                className="mb-3 w-full rounded-full border-none bg-white/20 px-4 py-2 text-sm placeholder:text-white/60 focus:ring-2 focus:ring-white"
                placeholder="Email của bạn..."
                type="email"
              />
              <button className="w-full rounded-full bg-[#9b4500] py-2 text-xs font-bold text-white transition-transform hover:scale-[1.02]">
                Đăng ký ngay
              </button>
            </div>
          </div>
        </aside>
      </div>

      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="fixed bottom-8 right-8 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#9b4500] text-white shadow-2xl transition-all hover:scale-110 active:scale-95"
      >
        <ArrowUpIcon className="h-6 w-6" />
      </button>

      <HomeFooter />
    </main>
  );
}

function SuggestedTourCard({ tour }: { tour: ApiTour }) {
  return (
    <div className="group overflow-hidden rounded-[3rem] bg-[#e5e9ea] transition-all duration-300 hover:scale-[1.02]">
      <div className="relative h-48">
        <img
          alt={tour.tourName}
          className="h-full w-full object-cover"
          src={tour.imageUrl || "/images/tours/dalat-cover.jpg"}
        />
        <div className="absolute right-4 top-4 rounded-full bg-[#9b4500] px-3 py-1 text-xs font-bold text-white">
          {tour.tourType === "INTERNATIONAL" ? "Quốc tế" : "Trong nước"}
        </div>
      </div>
      <div className="p-6">
        <h5 className="mb-2 line-clamp-2 text-lg font-bold">
          {tour.tourName}
        </h5>
        <div className="mb-4 text-xl font-bold text-[#00606c]">
          {formatPrice(tour.basePrice)}
        </div>
        <a
          href={`/tours/${tour.id}`}
          className="block w-full rounded-full bg-[#00606c] py-2 text-center text-sm font-bold text-white transition-colors hover:bg-[#007b8a]"
        >
          Xem chi tiết
        </a>
      </div>
    </div>
  );
}

function CalendarIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 2v3M16 2v3M3 9h18M5 5h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
      />
    </svg>
  );
}

function UserIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="8" r="4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

function ListIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h10" />
    </svg>
  );
}

function ArrowUpIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m-7 7 7-7 7 7" />
    </svg>
  );
}