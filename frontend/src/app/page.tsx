import HomeHeader from "../components/home/HomeHeader";
import {
  HeroSection,
 
  FeaturedCategoriesSection,
  FeaturedToursSection,
  TrendingDestinationsSection,
  TrustPartnersSection,
  TravelBlogSection,
  InstagramGallerySection,
  NewsletterSection,
  HomeFooter,
} from "../components/home/HomeSections";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f6fafb] text-[#181c1d]">
      <HomeHeader />

      <div className="pt-20">
        <HeroSection />
        <FeaturedCategoriesSection />
        <FeaturedToursSection />
        <TrendingDestinationsSection />
        <TrustPartnersSection />
        <TravelBlogSection />
        <InstagramGallerySection />
        <NewsletterSection />
        <HomeFooter />
      </div>

    </main>
  );
}