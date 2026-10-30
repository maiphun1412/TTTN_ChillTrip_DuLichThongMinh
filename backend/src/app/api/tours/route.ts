import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api-response";

function serialize<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const keyword = searchParams.get("keyword")?.trim() || "";
    const tourType = searchParams.get("tourType")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "PUBLISHED";
    const tagId = searchParams.get("tagId")?.trim();
    const destination = searchParams.get("destination")?.trim() || "";
    const departureDate = searchParams.get("departureDate")?.trim() || "";

    const scheduleFilter: any = {
      booking_status: "OPEN",
      available_seats: { gt: 0 },
    };

    if (departureDate) {
      const depDate = new Date(departureDate);
      if (!isNaN(depDate.getTime())) {
        scheduleFilter.start_date = depDate;
      }
    }

    const tours = await prisma.tours.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(tourType ? { tour_type: tourType } : {}),

        // ✅ FILTER THEO TAG
        ...(tagId
          ? {
              tour_tag_map: {
                some: {
                  tag_id: Number(tagId),
                },
              },
            }
          : {}),

        ...(keyword
          ? {
              OR: [
                { tour_name: { contains: keyword } },
                { tour_code: { contains: keyword } },
                { short_description: { contains: keyword } },
              ],
            }
          : {}),

        // ✅ FILTER THEO DESTINATION (tên tour, điểm đến, thành phố, quốc gia)
        ...(destination
          ? {
              OR: [
                { tour_name: { contains: destination } },
                {
                  destinations: {
                    OR: [
                      { destination_name: { contains: destination } },
                      { city: { contains: destination } },
                      { country: { contains: destination } },
                    ],
                  },
                },
              ],
            }
          : {}),

        // ✅ CHỈ LẤY CÁC TOUR CÒN LỊCH KHỞI HÀNH THỎA MÃN (OPEN, CÒN CHỖ, VÀ ĐÚNG NGÀY NẾU CÓ)
        departure_schedules: {
          some: scheduleFilter,
        },
      },

      include: {
        tour_categories: true,
        destinations: true,

        tour_images: {
          orderBy: [{ is_cover: "desc" }, { sort_order: "asc" }],
        },

        departure_schedules: {
          where: scheduleFilter,
          orderBy: {
            start_date: "asc",
          },
        },

        // ✅ include tag luôn (optional)
        tour_tag_map: {
          include: {
            tour_tags: true,
          },
        },
      },

      orderBy: [{ is_featured: "desc" }, { created_at: "desc" }],
    });

    const result = tours.map((tour: any) => {
      const coverImage =
        tour.tour_images?.find((img: any) => img.is_cover) ||
        tour.tour_images?.[0];

      const firstDeparture = tour.departure_schedules?.[0];

      return {
        id: tour.id,
        tourCode: tour.tour_code,
        tourName: tour.tour_name,
        slug: tour.slug,
        tourType: tour.tour_type,

        durationDays: tour.duration_days,
        durationNights: tour.duration_nights,
        transportType: tour.transport_type,

        basePrice: tour.base_price,
        childPrice: tour.child_price,
        maxCapacity: tour.max_capacity,

        shortDescription: tour.short_description,
        description: tour.description,

        imageUrl:
          coverImage?.image_url ||
          tour.featured_image_url ||
          null,

        destination: tour.destinations
          ? {
              id: tour.destinations.id,
              name: tour.destinations.destination_name,
              country: tour.destinations.country,
            }
          : null,

        departure: firstDeparture
          ? {
              id: firstDeparture.id,
              startDate: firstDeparture.start_date,
              endDate: firstDeparture.end_date,
            }
          : null,

        tags:
          tour.tour_tag_map?.map((t: any) => t.tour_tags?.tag_name) || [],

        status: tour.status,
        isFeatured: tour.is_featured,
        createdAt: tour.created_at,
      };
    });

    return ok(serialize(result), "Lấy danh sách tour thành công");
  } catch (error) {
    console.error("GET /api/tours error:", error);
    return fail("Không thể lấy danh sách tour", 500);
  }
}