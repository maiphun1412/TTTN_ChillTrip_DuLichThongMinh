"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { newsletterImage, trendingDestinations } from "@/components/home/homeData";

type ApiTour = {
  id: string;
  tourCode: string;
  tourName: string;
  slug: string;
  tourType: string;
  durationDays: number;
  durationNights: number;
  transportType?: string;
  basePrice: string | number;
  imageUrl?: string | null;
  destination?: {
    name?: string;
    country?: string;
    city?: string;
  } | null;
};

type ApiArticle = {
  id: string;
  title: string;
  slug: string;
  summary?: string | null;
  content?: string | null;
  featuredImageUrl?: string | null;
  category?: string | null;
  publishedAt?: string | null;
  createdAt?: string | null;
};

const fadeUp = {
  hidden: { opacity: 0, y: 36 },
  show: { opacity: 1, y: 0 },
};

const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1 },
};

const staggerContainer = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

function SectionContainer({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`px-4 md:px-8 lg:px-20 ${className}`}>
      {children}
    </section>
  );
}

export function HeroSection() {
  const router = useRouter();
  const [destination, setDestination] = useState("");
  const [departureDate, setDepartureDate] = useState("");

  const [today] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!destination.trim() && !departureDate) {
      alert("Vui lòng nhập điểm đến hoặc chọn ngày đi để tìm kiếm tour.");
      return;
    }

    if (departureDate) {
      const selected = new Date(departureDate);
      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);
      if (selected < currentDate) {
        alert("Ngày đi không được trong quá khứ.");
        return;
      }
    }

    const params = new URLSearchParams();

    if (destination.trim()) {
      params.set("destination", destination.trim());
    }

    if (departureDate) {
      params.set("departureDate", departureDate);
    }

    const queryString = params.toString();
    router.push(queryString ? `/tours?${queryString}` : "/tours");
  }

  return (
    <SectionContainer className="relative flex min-h-[680px] items-center justify-center overflow-hidden text-center">
      <div className="absolute inset-0 z-0">
        <motion.video
  autoPlay
  muted
  loop
  playsInline
  preload="auto"
  className="h-full w-full object-cover"
>
  <source src="/videos/chilltrip-hero.mp4" type="video/mp4" />
</motion.video>
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/15 to-black/25" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 44 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.75, ease: "easeOut" }}
        className="relative z-10 flex max-w-5xl flex-col items-center pt-8"
      >
        <motion.span
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.55 }}
          className="mb-4 inline-flex items-center rounded-full bg-[#9b4500]/80 px-4 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-white backdrop-blur-md"
        >
          Trải nghiệm độc bản
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.7 }}
          className="mb-8 text-4xl font-extrabold leading-[1.05] tracking-[-0.03em] text-white md:text-6xl lg:text-7xl"
        >
          Chạm đến <br />
          <span className="text-[#9defff]">Chân trời mới</span>
        </motion.h1>

        <motion.form
          initial={{ opacity: 0, y: 28, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.38, duration: 0.65, ease: "easeOut" }}
          onSubmit={handleSearch}
          className="flex w-full max-w-3xl flex-col gap-2 rounded-[30px] bg-white/95 p-2 shadow-[0_20px_55px_rgba(0,0,0,0.16)] backdrop-blur-xl md:flex-row md:items-center"
        >
          <div className="flex flex-1 items-center gap-3 px-5 py-3 md:px-6 md:py-4">
            <MapPinIcon />
            <div className="flex min-w-0 flex-col text-left">
              <span className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#7a8486]">
                Điểm đến
              </span>
              <input
                type="text"
                value={destination}
                onChange={(event) => setDestination(event.target.value)}
                placeholder="Bạn muốn đi đâu?"
                className="w-full bg-transparent text-sm font-semibold text-[#1f2a2d] outline-none placeholder:font-semibold placeholder:text-[#b8c0c2]"
              />
            </div>
          </div>

          <div className="mx-1 hidden h-10 w-px bg-[#d8dede] md:block" />

          <div className="flex flex-1 items-center gap-3 px-5 py-3 md:px-6 md:py-4">
            <CalendarIcon />
            <div className="flex min-w-0 flex-col text-left">
              <span className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#7a8486]">
                Ngày đi
              </span>
              <input
                type="date"
                value={departureDate}
                min={today}
                onChange={(event) => setDepartureDate(event.target.value)}
                className="w-full bg-transparent text-sm font-semibold text-[#1f2a2d] outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            className="flex min-w-[150px] items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#b85a10_0%,#ef8a34_100%)] px-6 py-3.5 text-sm font-extrabold text-white shadow-[0_10px_24px_rgba(185,90,16,0.28)] transition duration-200 hover:scale-[1.02]"
          >
            <SearchIcon />
            <span>TÌM KIẾM</span>
          </button>
        </motion.form>
      </motion.div>
    </SectionContainer>
  );
}

export function FeaturedCategoriesSection() {
  const categories = [
    {
      title: "Tour Gia Đình",
      tagId: 3,
      icon: "👨‍👩‍👧‍👦",
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuATEpbJylIfjXyOmKKr_hauXanbFdVevd_DzGpcH8GPd5VI0X7puETzpL8LsBIxH_CmUiWnrH2xj12strAX5UoaVY-_JhoeJL-2sq3chIZFhvTWeuN18OEpEJdFYwWHibMn3KAGVQGKoBbX4BYqT-yUaFvlm5IvqSmy8rDu-vaRqNpdIe3w_U4UXuXtmrPNZPSTAQGoD8-TtbiS5hRIbp9ZmkjSYP4cX74uLHUomjiCBq5anxcJurmDBsmVUFYmEfEdX3G8AkUvaZe6",
    },
    {
      title: "Mua sắm",
      tagId: 5,
      icon: "❤",
      image:
        "https://i.pinimg.com/1200x/95/19/df/9519df92de831ae0faed7a86bd49af54.jpg",
    },
    {
      title: "Khám Phá Mạo Hiểm",
      tagId: 6,
      icon: "🥾",
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuCKrcrk0SPc21X0x08lhUi6Gu1JWp8MKmpdWdsyd_GETAOU9Oc6cotPykXImSei1-GPVvktU4zdICN84XvrrvDb5EMHXK7xvLpqgw1-FG6J9d7PS70-dQAFFjDZ2l88YYfq3FyLBvIqnR4jphymEKcm5uH2X7qR7cU3t82DcTFVndvFBwxjFvyzG0vIgMNL-ljHdBhIdyNhG-X7tvk0mV5rMZZZMKIvvLtMW_x8k7Et0OaGY8jcLQ79v0PBamMLgoRFuZgmdtE7os61",
    },
    {
      title: "Du Lịch Nghỉ Dưỡng",
      tagId: 1,
      icon: "🏖",
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuA5QBkkRuPr6CSu-BgIu_L1OcRAeAX0rbBAUGTexKj81_FiCK82zKaPbTvt5RGasNCjqXqx2Kab2U5_SoFXMbfX6pYajJ8-RUmZ6qdfRkH4Zul_n_dyYcCAfPPNaUpDSHdQC3fphbzYMajd01qes3OUCXkk9o58Go9TJUQWzWI2QbUBsBa1zfYDFMmuzFaB7WjZyOXm4IkCADavfLuARPbG0qlQgOAxrMaygRT90sulAY-ihNsyt0lu5TkoN0VyCx0XX8FhuQxnSOEu",
    },
  ];

  return (
    <SectionContainer className="bg-[#f6fafb] py-16">
      <SectionTitle
        title="Khám Phá Theo Chủ Đề"
        description="Tìm kiếm trải nghiệm du lịch phù hợp nhất với phong cách của bạn."
      />

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        className="mx-auto grid max-w-7xl grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4"
      >
        {categories.map((item) => (
          <motion.a
            key={item.title}
            variants={fadeUp}
            transition={{ duration: 0.5, ease: "easeOut" }}
            href={`/tours/theme?tagId=${item.tagId}&title=${encodeURIComponent(
              item.title
            )}`}
            className="group relative h-56 cursor-pointer overflow-hidden rounded-[24px] shadow-[0_10px_24px_rgba(15,23,42,0.07)] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(15,23,42,0.12)]"
          >
            <img
              src={item.image}
              alt={item.title}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-black/15 transition-all duration-500 group-hover:from-black/55" />
            <div className="absolute inset-0 flex flex-col items-center justify-center p-5 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/18 text-2xl backdrop-blur-md">
                {item.icon}
              </div>
              <h3 className="text-lg font-bold text-white drop-shadow-md">
                {item.title}
              </h3>
            </div>
          </motion.a>
        ))}
      </motion.div>
    </SectionContainer>
  );
}

export function FeaturedToursSection() {
  const [tours, setTours] = useState<ApiTour[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTours() {
      try {
        const res = await fetch("/backend-api/tours", { cache: "no-store" });

        if (!res.ok) {
          throw new Error("Không thể lấy danh sách tour");
        }

        const json = await res.json();
        setTours(Array.isArray(json.data) ? json.data : []);
      } catch (error) {
        console.error("Load tours error:", error);
        setTours([]);
      } finally {
        setLoading(false);
      }
    }

    loadTours();
  }, []);

  return (
    <SectionContainer className="bg-[#f1f4f5] py-16">
      <SectionTitle
        title="Tour Nổi Bật"
        description="Những hành trình được thiết kế tỉ mỉ cho những tâm hồn khao khát khám phá."
        actionLabel="Xem tất cả"
        actionHref="/tours"
      />

      {loading ? (
        <div className="py-10 text-center text-sm font-semibold text-[#3e494b]">
          Đang tải danh sách tour...
        </div>
      ) : tours.length === 0 ? (
        <div className="py-10 text-center text-sm font-semibold text-[#3e494b]">
          Chưa có tour nào để hiển thị.
        </div>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.16 }}
          className="grid grid-cols-1 gap-7 md:grid-cols-2 lg:grid-cols-3"
        >
          {tours.slice(0, 6).map((tour) => {
            const imageUrl =
              tour.imageUrl ||
              "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop";

            const location = [tour.destination?.name, tour.destination?.country]
              .filter(Boolean)
              .join(", ");

            return (
              <motion.div
                key={tour.id}
                variants={fadeUp}
                transition={{ duration: 0.52, ease: "easeOut" }}
                className="group flex h-full flex-col overflow-hidden rounded-[24px] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.07)] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(15,23,42,0.12)]"
              >
                <div className="relative h-60 overflow-hidden">
                  <img
                    src={imageUrl}
                    alt={tour.tourName}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />

                  <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 shadow-sm backdrop-blur">
                    <StarIcon />
                    <span className="text-xs font-bold">4.9</span>
                  </div>

                  <div className="absolute bottom-4 left-4">
                    <span className="rounded-full bg-[#007b8a] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#ddf9ff]">
                      {tour.durationDays} ngày {tour.durationNights} đêm
                    </span>
                  </div>
                </div>

                <div className="flex flex-grow flex-col p-6">
                  <h3 className="mb-2 text-xl font-bold leading-tight transition-colors group-hover:text-[#00606c]">
                    {tour.tourName}
                  </h3>

                  <div className="mb-5 flex items-center gap-2 text-sm text-[#3e494b]">
                    <MapPinMiniIcon />
                    {location || "Đang cập nhật"}
                  </div>

                  <div className="mt-auto flex items-center justify-between border-t border-[#ebeeef] pt-5">
                    <div>
                      <span className="block text-left text-[11px] uppercase tracking-[0.08em] text-[#6e797b]">
                        Giá từ
                      </span>
                      <span className="text-xl font-extrabold text-[#9b4500]">
                        {Number(tour.basePrice).toLocaleString("vi-VN")}đ
                      </span>
                    </div>

                    <a
                      href={`/tours/${tour.id}`}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e5e9ea] transition-colors group-hover:bg-[#00606c] group-hover:text-white"
                    >
                      <ArrowRightIcon />
                    </a>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </SectionContainer>
  );
}

import Link from "next/link";
import { travelInspirations } from "@/data/travel-inspirations";

export function TrendingDestinationsSection() {
  const large = travelInspirations[0];
  const medium = travelInspirations[1];
  const small1 = travelInspirations[2];
  const small2 = travelInspirations[3];

  return (
    <SectionContainer className="bg-[#f6fafb] py-16">
      <SectionTitle
        title="Cảm Hứng Du Lịch"
        description="Khám phá những trải nghiệm đáng nhớ, kinh nghiệm hữu ích và các hành trình truyền cảm hứng từ khắp nơi trên thế giới."
      />

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.18 }}
        className="grid h-auto grid-cols-1 gap-5 md:h-[620px] md:grid-cols-4 md:grid-rows-2"
      >
        <Link
          href={`/cam-hung-du-lich/${large.slug}`}
          className="block md:col-span-2 md:row-span-2"
        >
          <DestinationCard
            className="h-full"
            title={large.title}
            subtitle={large.subtitle}
            image={large.image}
            titleClassName="text-3xl"
            contentClassName="bottom-8 left-8"
          />
        </Link>

        <Link
          href={`/cam-hung-du-lich/${medium.slug}`}
          className="block md:col-span-2"
        >
          <DestinationCard
            className="h-full"
            title={medium.title}
            subtitle={medium.subtitle}
            image={medium.image}
            titleClassName="text-xl"
            contentClassName="bottom-5 left-5"
          />
        </Link>

        <Link href={`/cam-hung-du-lich/${small1.slug}`} className="block">
          <DestinationCard
            className="h-full"
            title={small1.title}
            subtitle={small1.subtitle}
            image={small1.image}
            titleClassName="text-lg"
            contentClassName="bottom-4 left-4"
          />
        </Link>

        <Link href={`/cam-hung-du-lich/${small2.slug}`} className="block">
          <DestinationCard
            className="h-full"
            title={small2.title}
            subtitle={small2.subtitle}
            image={small2.image}
            titleClassName="text-lg"
            contentClassName="bottom-4 left-4"
          />
        </Link>
      </motion.div>
    </SectionContainer>
  );
}

export function TrustPartnersSection() {
  const partners = [
    {
      name: "Vietnam Airlines",
      logo: "/images/partners/vietnam-airlines.png",
      url: "https://www.vietnamairlines.com",
    },
    {
      name: "Vietjet Air",
      logo: "/images/partners/vietjet.png",
      url: "https://www.vietjetair.com",
    },
    {
      name: "Vinpearl",
      logo: "/images/partners/vinpearl.png",
      url: "https://vinpearl.com",
    },
    {
      name: "Mường Thanh",
      logo: "/images/partners/muongthanh.png",
      url: "https://muongthanh.com",
    },
    {
      name: "Bamboo Airways",
      logo: "/images/partners/bamboo.png",
      url: "https://www.bambooairways.com",
    },
  ];

  const [selectedPartner, setSelectedPartner] = useState<{
    name: string;
    logo: string;
    url: string;
  } | null>(null);

  return (
    <SectionContainer className="relative border-y border-[#ebeeef] bg-[#f1f4f5] py-14">
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.5 }}
        className="mb-10 text-center"
      >
        <h3 className="text-3xl font-extrabold tracking-[-0.02em] text-[#00606c]">
          Đối tác đồng hành
        </h3>
      </motion.div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-12 text-center"
      >
        {partners.map((partner) => (
          <motion.div
            key={partner.name}
            variants={fadeUp}
            transition={{ duration: 0.45, ease: "easeOut" }}
            onClick={() => setSelectedPartner(partner)}
            className="group flex cursor-pointer flex-col items-center"
          >
            <div className="flex h-32 w-32 items-center justify-center rounded-full bg-white shadow-md transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl">
              <img
                src={partner.logo}
                alt={partner.name}
                className="h-20 w-20 object-contain"
              />
            </div>

            <p className="mt-4 text-base font-semibold text-[#3e494b] transition group-hover:text-[#00606c]">
              {partner.name}
            </p>
          </motion.div>
        ))}
      </motion.div>

      {selectedPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.25 }}
            className="w-[320px] rounded-2xl bg-white p-6 text-center shadow-xl"
          >
            <h4 className="mb-2 text-lg font-bold text-[#00606c]">
              Chuyển hướng
            </h4>
            <p className="mb-6 text-sm text-[#3e494b]">
              Bạn có muốn truy cập{" "}
              <span className="font-semibold">{selectedPartner.name}</span>{" "}
              không?
            </p>

            <div className="flex justify-center gap-3">
              <button
                onClick={() => setSelectedPartner(null)}
                className="rounded-full border px-4 py-2 text-sm"
              >
                Bỏ qua
              </button>

              <button
                onClick={() => {
                  window.open(selectedPartner.url, "_blank");
                  setSelectedPartner(null);
                }}
                className="rounded-full bg-[#00606c] px-4 py-2 text-sm text-white"
              >
                Đồng ý
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </SectionContainer>
  );
}

export function TravelBlogSection() {
  const [blogs, setBlogs] = useState<ApiArticle[]>([]);
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
        setBlogs(Array.isArray(json.data) ? json.data.slice(0, 3) : []);
      } catch (error) {
        console.error("Load articles error:", error);
        setBlogs([]);
      } finally {
        setLoading(false);
      }
    }

    loadArticles();
  }, []);

  return (
    <SectionContainer className="bg-[#f6fafb] py-16">
      <SectionTitle
        title="Cẩm Nang Du Lịch"
        description="Chia sẻ bí quyết và cảm hứng từ những chuyên gia xê dịch thực thụ."
        actionLabel="Xem tất cả bài viết"
        actionHref="/blog"
      />

      {loading ? (
        <div className="py-10 text-center text-sm font-semibold text-[#3e494b]">
          Đang tải bài viết...
        </div>
      ) : blogs.length === 0 ? (
        <div className="py-10 text-center text-sm font-semibold text-[#3e494b]">
          Chưa có bài viết nào để hiển thị.
        </div>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="mx-auto grid max-w-7xl grid-cols-1 gap-6 md:grid-cols-3"
        >
          {blogs.map((blog) => {
            const imageUrl =
              blog.featuredImageUrl || "/images/blog/default-blog.jpg";

            const date = blog.publishedAt || blog.createdAt;

            return (
              <motion.article
                key={blog.id}
                variants={fadeUp}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="group flex h-full flex-col overflow-hidden rounded-[24px] border border-[#ebeeef] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(15,23,42,0.1)]"
              >
                <a href={`/blog/${blog.slug}`}>
                  <img
                    src={imageUrl}
                    alt={blog.title}
                    className="h-60 w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </a>

                <div className="flex flex-grow flex-col p-5">
                  <div className="mb-3 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#00606c]">
                    <span>{blog.category || "DU LỊCH"}</span>
                    <span className="h-1 w-1 rounded-full bg-[#bdc8cb]" />
                    <span>
                      {date
                        ? new Date(date).toLocaleDateString("vi-VN")
                        : "Đang cập nhật"}
                    </span>
                  </div>

                  <a href={`/blog/${blog.slug}`}>
                    <h3 className="mb-2 text-lg font-bold leading-tight transition-colors group-hover:text-[#00606c]">
                      {blog.title}
                    </h3>
                  </a>

                  <p className="line-clamp-3 text-sm leading-6 text-[#3e494b]">
                    {blog.summary ||
                      blog.content ||
                      "Nội dung bài viết đang được cập nhật."}
                  </p>
                </div>
              </motion.article>
            );
          })}
        </motion.div>
      )}
    </SectionContainer>
  );
}

export function InstagramGallerySection() {
  const images = [
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1493558103817-58b2924bce98?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1519046904884-53103b34b206?q=80&w=1200&auto=format&fit=crop",
  ];

  return (
    <section className="bg-[#f1f4f5] py-16">
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.55 }}
        className="mx-auto max-w-7xl px-4 text-center md:px-8 lg:px-20"
      >
        <div className="mb-4 inline-flex items-center gap-3">
          <span className="h-px w-8 bg-[#9b4500]" />
          <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#9b4500]">
            Instagram Feeds
          </span>
          <span className="h-px w-8 bg-[#9b4500]" />
        </div>

        <h2 className="mb-2 text-3xl font-extrabold text-[#00606c]">
          #ChillTripMoments
        </h2>
        <p className="mx-auto mb-10 max-w-lg text-sm leading-6 text-[#3e494b]">
          Ghi lại những khoảnh khắc tuyệt vời nhất từ cộng đồng ChillTrip trên
          khắp thế giới.
        </p>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="mb-10 grid grid-cols-2 gap-3 md:grid-cols-5"
        >
          {images.map((image, index) => (
            <motion.div
              key={index}
              variants={fadeIn}
              transition={{ duration: 0.45 }}
              className="group aspect-square cursor-pointer overflow-hidden rounded-[18px] shadow-sm"
            >
              <img
                src={image}
                alt={`Gallery ${index + 1}`}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
            </motion.div>
          ))}
        </motion.div>

        <button className="mx-auto flex items-center gap-3 rounded-full border border-[#00606c] bg-white px-7 py-3 text-sm font-bold text-[#00606c] shadow-sm transition-all hover:bg-[#00606c] hover:text-white">
          Theo dõi chúng tôi trên Instagram
          <ArrowUpRightIcon />
        </button>
      </motion.div>
    </section>
  );
}

export function NewsletterSection() {
  const router = useRouter();

  return (
    <SectionContainer className="bg-[#f6fafb] py-16">
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.55 }}
        className="relative overflow-hidden rounded-[36px] bg-[#071f25] px-8 py-12 shadow-[0_24px_70px_rgba(0,96,108,0.22)] md:px-14 lg:px-16"
      >
        <img
          src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1600&auto=format&fit=crop"
          alt="Ưu đãi du lịch ChillTrip"
          className="absolute inset-0 h-full w-full object-cover opacity-35"
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#00343c]/95 via-[#00606c]/75 to-transparent" />
        <div className="absolute -left-20 -top-20 h-56 w-56 rounded-full bg-[#9defff]/20 blur-3xl" />
        <div className="absolute -bottom-24 right-10 h-72 w-72 rounded-full bg-[#fc8a40]/20 blur-3xl" />

        <div className="relative z-10 grid items-center gap-10 md:grid-cols-[1.2fr_0.8fr]">
          <div>
            <span className="mb-5 inline-flex rounded-full bg-[#fc8a40] px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-[#331200]">
              Ưu đãi độc quyền
            </span>

            <h2 className="mb-5 max-w-2xl text-4xl font-black leading-tight tracking-[-0.04em] text-white md:text-5xl">
              Săn deal du lịch đẹp hơn mỗi tuần
            </h2>

            <p className="mb-8 max-w-xl text-base leading-7 text-[#ddf9ff]/90">
              Khám phá các mã giảm giá, flash deal và ưu đãi tour đang hoạt động
              trên ChillTrip.
            </p>

            <button
              type="button"
              onClick={() => router.push("/promotions")}
              className="inline-flex items-center gap-3 rounded-full bg-[linear-gradient(135deg,#9b4500_0%,#fc8a40_100%)] px-8 py-4 text-sm font-black uppercase tracking-[0.14em] !text-white shadow-[0_14px_32px_rgba(252,138,64,0.32)] transition hover:scale-[1.03] hover:!text-white active:scale-95"
            >
              Xem tất cả ưu đãi
              <ArrowRightIcon />
            </button>
          </div>

          <motion.div
            animate={{ y: [0, -10, 0], rotate: [2, -1, 2] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="relative mx-auto w-full max-w-[360px]"
          >
            <div className="relative overflow-hidden rounded-[30px] border border-white/20 bg-white/15 p-6 text-white shadow-2xl backdrop-blur-xl">
              <div className="absolute -left-5 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full bg-[#071f25]" />
              <div className="absolute -right-5 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full bg-[#071f25]" />

              <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-[#9defff]">
                ChillTrip Pass
              </p>

              <div className="mb-6 text-5xl font-black tracking-[-0.06em]">
                -40%
              </div>

              <div className="mb-6 border-t border-dashed border-white/30 pt-5">
                <p className="text-sm text-white/70">Áp dụng cho</p>
                <p className="text-lg font-black">Tour hè & nghỉ dưỡng</p>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-white/15 px-4 py-3">
                <span className="text-xs font-bold uppercase tracking-[0.16em]">
                  Code
                </span>
                <span className="font-black text-[#ffdbc9]">CHILL40</span>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </SectionContainer>
  );
}

export function HomeFooter() {
  return (
    <footer className="bg-[#eef4f5] pt-16 text-[#16323a]">
      <div className="mx-auto max-w-7xl px-6 md:px-10 lg:px-16">
        <div className="grid grid-cols-1 gap-10 border-b border-[#d9e5e7] pb-10 md:grid-cols-[1.35fr_1fr_1fr_1fr]">
          <div>
            <div className="mb-4 text-[26px] font-extrabold tracking-[-0.02em] text-[#007b8a]">
              ChillTrip
            </div>

            <p className="max-w-[320px] text-sm leading-6 text-[#5f7378]">
              Nền tảng du lịch hiện đại giúp bạn khám phá những hành trình đẹp,
              thư giãn và đáng nhớ hơn mỗi ngày.
            </p>

            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7a8f95]">
                Theo dõi chúng tôi
              </p>

              <div className="mt-4 flex items-center gap-3">
                <SocialButton icon={<GlobeIcon />} />
                <SocialButton icon={<MailIcon />} />
                <SocialButton icon={<FacebookIcon />} />
              </div>
            </div>
          </div>

          <FooterLinkColumn
            title="Khám phá"
            items={[
              "Tour nổi bật",
              "Điểm đến xu hướng",
              "Ưu đãi trong tuần",
              "Cẩm nang du lịch",
            ]}
          />

          <FooterLinkColumn
            title="Công ty"
            items={["Về chúng tôi", "Sự nghiệp", "Đối tác", "Liên hệ quảng cáo"]}
          />

          <FooterLinkColumn
            title="Hỗ trợ"
            items={[
              "Trung tâm trợ giúp",
              "Chính sách bảo mật",

              "Điều khoản sử dụng",
              "Khiếu nại",
            ]}
          />
        </div>

        <div className="flex flex-col items-center justify-between gap-4 py-5 text-sm text-[#71858b] md:flex-row">
          <p>© 2026 ChillTrip. All rights reserved.</p>

          <div className="flex items-center gap-5">
            <a href="#" className="transition hover:text-[#007b8a]">
              Privacy
            </a>
            <a href="#" className="transition hover:text-[#007b8a]">
              Terms
            </a>
            <a href="#" className="transition hover:text-[#007b8a]">
              Support
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function SectionTitle({
  title,
  description,
  actionLabel,
  actionHref = "/blog",
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5 }}
      className="mb-12 flex flex-col items-center text-center"
    >
      <h2 className="mb-3 text-3xl font-extrabold tracking-[-0.02em] text-[#00606c]">
        {title}
      </h2>
      <p className="mx-auto max-w-xl text-sm leading-6 text-[#3e494b]">
        {description}
      </p>

      {actionLabel ? (
        <a
          href={actionHref}
          className="mt-5 flex items-center gap-2 text-sm font-bold text-[#00606c] transition hover:underline"
        >
          {actionLabel}
          <ArrowRightIcon />
        </a>
      ) : null}
    </motion.div>
  );
}

function DestinationCard({
  title,
  subtitle,
  image,
  className = "",
  titleClassName = "text-xl",
  contentClassName = "bottom-5 left-5",
}: {
  title: string;
  subtitle?: string;
  image: string;
  className?: string;
  titleClassName?: string;
  contentClassName?: string;
}) {
  return (
    <motion.div
      variants={fadeUp}
      transition={{ duration: 0.52, ease: "easeOut" }}
      className={`group relative min-h-[210px] cursor-pointer overflow-hidden rounded-[24px] shadow-[0_10px_24px_rgba(15,23,42,0.07)] ${className}`}
    >
      <img
        src={image}
        alt={title}
        className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
      <div className={`absolute ${contentClassName}`}>
        <h4 className={`font-bold text-white ${titleClassName}`}>{title}</h4>
        {subtitle ? (
          <p className="mt-1 text-sm text-white/80">{subtitle}</p>
        ) : null}
      </div>
    </motion.div>
  );
}

function FooterLinkColumn({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h4 className="mb-4 text-[13px] font-extrabold uppercase tracking-[0.12em] text-[#16323a]">
        {title}
      </h4>

      <ul className="space-y-2.5">
        {items.map((item) => (
          <li key={item}>
            <a
              href="#"
              className="text-sm text-[#5f7378] transition hover:translate-x-1 hover:text-[#007b8a]"
            >
              {item}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SocialButton({ icon }: { icon: ReactNode }) {
  return (
    <a
      href="#"
      className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d9e5e7] bg-white text-[#35545c] shadow-sm transition hover:-translate-y-0.5 hover:border-[#b8d7dc] hover:text-[#007b8a]"
    >
      {icon}
    </a>
  );
}

function SearchIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35m1.85-5.15a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0 text-[#0f7a8a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-4.35 7-11a7 7 0 1 0-14 0c0 6.65 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0 text-[#0f7a8a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 2v3M16 2v3M3 9h18M5 5h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6 6 6-6 6" />
    </svg>
  );
}

function ArrowUpRightIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 17 17 7M9 7h8v8" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 fill-[#9b4500] text-[#9b4500]" viewBox="0 0 24 24">
      <path d="m12 17.27 6.18 3.73-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
  );
}

function MapPinMiniIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#3e494b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-4.35 7-11a7 7 0 1 0-14 0c0 6.65 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M12 3a15.3 15.3 0 0 1 4 9 15.3 15.3 0 0 1-4 9 15.3 15.3 0 0 1-4-9 15.3 15.3 0 0 1 4-9Z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16v12H4z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m4 7 8 6 8-6" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22 12.07C22 6.503 17.523 2 12 2S2 6.503 2 12.07c0 5.019 3.657 9.182 8.438 9.93v-7.02H7.898v-2.91h2.54V9.845c0-2.52 1.492-3.913 3.777-3.913 1.094 0 2.238.196 2.238.196v2.474H15.19c-1.243 0-1.63.774-1.63 1.567v1.9h2.773l-.443 2.91H13.56V22c4.78-.748 8.44-4.911 8.44-9.93Z" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h8M8 14h5M5 19l-1-4V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H8l-3 2Z" />
    </svg>
  );
}