import { prisma } from "@/lib/prisma";

export async function recordCustomerTravelPlace(bookingId: bigint) {
  const booking = await prisma.bookings.findUnique({
    where: {
      id: bookingId,
    },
  });

  if (!booking) return;

  const tour = await prisma.tours.findUnique({
    where: {
      id: booking.tour_id,
    },
  });

  if (!tour?.destination_id) return;

  const existed = await prisma.customer_travel_places.findFirst({
    where: {
      customer_id: booking.customer_id,
      destination_id: tour.destination_id,
    },
  });

  if (existed) return;

  await prisma.customer_travel_places.create({
    data: {
      customer_id: booking.customer_id,
      destination_id: tour.destination_id,
      first_completed_booking_id: booking.id,
    },
  });
}