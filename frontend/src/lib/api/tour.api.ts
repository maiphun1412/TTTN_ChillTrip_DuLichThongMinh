export type TourItem = {
  id: string;
  tourCode: string;
  tourName: string;
  slug: string;
  tourType: string;
  durationDays: number;
  durationNights: number;
  transportType: string;
  basePrice: string | number;
  childPrice: string | number;
  maxCapacity: number;
  shortDescription: string;
  description: string;
  imageUrl: string;
  category?: {
    id: string;
    code: string;
    name: string;
  };
  destination?: {
    id: string;
    code: string;
    name: string;
    country: string;
    city: string;
  };
  departure?: {
    id: string;
    departureCode: string;
    startDate: string;
    endDate: string;
    availableSeats: number;
    bookingStatus: string;
  };
  status: string;
  isFeatured: boolean;
  createdAt: string;
};

export async function getTours(): Promise<TourItem[]> {
  const res = await fetch("http://localhost:3001/api/tours", {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Không thể lấy danh sách tour");
  }

  const json = await res.json();

  return json.data || [];
}