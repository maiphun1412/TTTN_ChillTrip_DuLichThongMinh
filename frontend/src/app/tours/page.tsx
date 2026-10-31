import { Suspense } from "react";
import TourListPage from "../../components/tours/TourListPage";

export default function ToursPage() {
  return (
    <Suspense fallback={
      <div className="mx-auto max-w-7xl px-4 py-40 text-center text-xl font-bold text-[#00606c]">
        Đang tải danh sách tour...
      </div>
    }>
      <TourListPage />
    </Suspense>
  );
}