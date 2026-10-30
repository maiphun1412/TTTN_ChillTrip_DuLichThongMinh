import { Suspense } from "react";
import BookingPage from "../../components/booking/BookingPage";

export default function BookingRoute() {
  return (
    <Suspense fallback={
      <div className="mx-auto max-w-7xl px-4 py-40 text-center text-xl font-bold text-[#00606c]">
        Đang tải trang đặt tour...
      </div>
    }>
      <BookingPage />
    </Suspense>
  );
}