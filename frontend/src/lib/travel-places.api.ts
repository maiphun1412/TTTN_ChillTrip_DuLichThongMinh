export type TravelPlace = {
  id: string;
  customerId: string;
  destinationId: string;
  destinationName: string;
  country?: string | null;
  city?: string | null;
  destinationType?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  visitedAt: string;
  firstCompletedBookingId?: string | null;
};

export async function getMyTravelPlaces() {
  const token =
    localStorage.getItem("access_token") ||
    sessionStorage.getItem("access_token");

  const res = await fetch("/backend-api/profile/travel-places", {
    method: "GET",
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {},
    cache: "no-store",
  });

  const json = await res.json();

  if (!res.ok || !json.success) {
    throw new Error(json.message || "Không thể lấy bản đồ đã đi");
  }

  return json.data as {
    total: number;
    places: TravelPlace[];
  };
}