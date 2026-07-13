const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export async function getAdminBookings() {
  const res = await fetch(`${API_URL}/api/admin/bookings`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Lỗi fetch bookings");
  }

  return res.json();
}

export async function confirmBooking(id: number) {
  const res = await fetch(`${API_URL}/api/admin/bookings/${id}/confirm`, {
    method: "PUT",
  });

  return res.json();
}

export async function cancelBooking(id: number) {
  const res = await fetch(`${API_URL}/api/admin/bookings/${id}/cancel`, {
    method: "PUT",
  });

  return res.json();
}