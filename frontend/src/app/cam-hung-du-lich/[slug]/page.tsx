// src/app/cam-hung-du-lich/[slug]/page.tsx

import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Clock3,
  Heart,
  MapPin,
  Sparkles,
} from "lucide-react";
import { travelInspirations } from "@/data/travel-inspirations";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function TravelInspirationDetailPage({
  params,
}: PageProps) {
  const { slug } = await params;
  const article = travelInspirations.find((item) => item.slug === slug);

  if (!article) {
    notFound();
  }

  const destination = article.destination ?? article.title;
  const relatedTourHref = `/tours?keyword=${encodeURIComponent(destination)}`;
  const paragraphs = article.content.trim().split("\n\n");

  const otherArticles = travelInspirations
    .filter((item) => item.slug !== article.slug)
    .slice(0, 3);

  return (
    <main className="min-h-screen bg-[#f8fbfc] text-slate-900">
      <section className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 px-5 py-8 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14 lg:px-8">
        <div className="relative min-h-[420px] overflow-hidden rounded-[36px] lg:min-h-[calc(100vh-64px)]">
          <Image
            src={article.image}
            alt={article.title}
            fill
            priority
            className="object-cover"
          />

          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/10 to-black/45" />

          <Link
            href="/"
            className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-full bg-white/85 px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm backdrop-blur-md transition hover:bg-white"
          >
            <ArrowLeft size={16} />
            Trang chủ
          </Link>

          <div className="absolute bottom-6 left-6 right-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/85 px-4 py-2 text-sm font-semibold text-[#007B8A] backdrop-blur-md">
              <MapPin size={16} />
              {destination}
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center py-10 lg:py-0">
          <p className="mb-5 text-sm font-bold uppercase tracking-[0.28em] text-[#007B8A]">
            ChillTrip Journal
          </p>

          <h1 className="max-w-3xl text-[42px] font-bold leading-[1.08] tracking-[-0.04em] text-slate-950 md:text-6xl">
            {article.title}
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            {article.subtitle}
          </p>

          <div className="mt-8 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-3xl bg-white p-5 shadow-sm">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#007B8A]/10 text-[#007B8A]">
                <Sparkles size={20} />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Phong cách
              </p>
              <p className="mt-1 text-base font-bold text-slate-900">
                Cảm hứng
              </p>
            </div>

            <div className="rounded-3xl bg-white p-5 shadow-sm">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FF8C42]/10 text-[#FF8C42]">
                <Heart size={20} />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Phù hợp
              </p>
              <p className="mt-1 text-base font-bold text-slate-900">
                Nghỉ dưỡng
              </p>
            </div>

            <div className="rounded-3xl bg-white p-5 shadow-sm">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                <Camera size={20} />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Trải nghiệm
              </p>
              <p className="mt-1 text-base font-bold text-slate-900">
                Check-in
              </p>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href={relatedTourHref}
              className="inline-flex items-center gap-2 rounded-full bg-[#007B8A] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#007B8A]/20 transition hover:bg-[#006976]"
            >
              Xem tour {destination}
              <ArrowRight size={16} />
            </Link>

            <Link
              href="/"
              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition hover:border-[#007B8A]/30 hover:text-[#007B8A]"
            >
              Khám phá thêm
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-24">
        <div className="mb-12 h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

        <div className="mb-12 grid gap-6 md:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#007B8A]">
              Câu chuyện hành trình
            </p>
            <h2 className="mt-4 text-3xl font-bold leading-tight tracking-[-0.03em] text-slate-950 md:text-4xl">
              Vì sao trải nghiệm này đáng để thêm vào wishlist?
            </h2>
          </div>

          <p className="text-lg leading-8 text-slate-600">
            Mỗi điểm đến đều có một nhịp riêng. Bài viết này giúp bạn hình dung
            rõ hơn cảm giác, hoạt động và những khoảnh khắc nổi bật trước khi
            chọn hành trình phù hợp.
          </p>
        </div>

        <article className="space-y-8">
          {paragraphs.map((paragraph, index) => (
            <p
              key={index}
              className={
                index === 0
                  ? "text-2xl font-medium leading-10 tracking-[-0.02em] text-slate-900"
                  : "text-[18px] leading-9 text-slate-700"
              }
            >
              {paragraph}
            </p>
          ))}
        </article>

        <div className="my-14 rounded-[36px] bg-white p-8 shadow-sm md:p-10">
          <p className="text-2xl font-semibold leading-10 tracking-[-0.02em] text-slate-950 md:text-3xl">
            “Một chuyến đi đẹp không nhất thiết phải thật vội. Đôi khi, điều
            đáng nhớ nhất là được chậm lại giữa một khung cảnh thật khác.”
          </p>
        </div>

        <div className="rounded-[36px] bg-[#EAF8FA] p-8 md:p-10">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#007B8A]">
            Điểm nổi bật
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl bg-white/80 p-5">
              <Clock3 className="text-[#007B8A]" size={22} />
              <h3 className="mt-4 font-bold text-slate-950">
                Nhịp đi chậm rãi
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Phù hợp với những ai muốn nghỉ ngơi, ngắm cảnh và tận hưởng
                chuyến đi nhẹ nhàng.
              </p>
            </div>

            <div className="rounded-3xl bg-white/80 p-5">
              <Camera className="text-[#007B8A]" size={22} />
              <h3 className="mt-4 font-bold text-slate-950">
                Nhiều góc trải nghiệm
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Có đủ chất liệu cho ảnh đẹp, cảm xúc đẹp và những khoảnh khắc
                đáng nhớ.
              </p>
            </div>

            <div className="rounded-3xl bg-white/80 p-5">
              <MapPin className="text-[#007B8A]" size={22} />
              <h3 className="mt-4 font-bold text-slate-950">
                Dễ kết hợp tour
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Có thể kết nối với các hành trình được ChillTrip gợi ý theo
                điểm đến.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-16 rounded-[40px] bg-[#007B8A] p-8 text-white md:p-10">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-white/70">
            Gợi ý hành trình
          </p>

          <h2 className="mt-4 text-3xl font-bold tracking-[-0.03em] md:text-4xl">
            Muốn trải nghiệm {destination} theo cách trọn vẹn hơn?
          </h2>

          <p className="mt-4 max-w-2xl text-base leading-7 text-white/80">
            ChillTrip đã chuẩn bị các hành trình phù hợp để bạn dễ dàng chọn
            tour, lịch trình và ngân sách cho chuyến đi tiếp theo.
          </p>

<Link
  href={relatedTourHref}
  className="mt-7 inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold"
>
  <span className="!text-slate-900">
    Xem tour theo điểm đến
  </span>

  <ArrowRight
    size={16}
    className="!text-slate-900"
  />
</Link>
        </div>

        {otherArticles.length > 0 && (
          <section className="mt-18">
            <div className="mb-7 flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#007B8A]">
                  Đọc tiếp
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-[-0.03em] text-slate-950">
                  Cảm hứng khác cho bạn
                </h2>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {otherArticles.map((item) => (
                <Link
                  key={item.slug}
                  href={`/cam-hung-du-lich/${item.slug}`}
                  className="group overflow-hidden rounded-[28px] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-black/10"
                >
                  <div className="relative h-48 overflow-hidden">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className="object-cover transition duration-500 group-hover:scale-105"
                    />
                  </div>

                  <div className="p-5">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#007B8A]">
                      ChillTrip
                    </p>
                    <h3 className="mt-3 line-clamp-2 text-lg font-bold leading-snug text-slate-950">
                      {item.title}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                      {item.subtitle}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}