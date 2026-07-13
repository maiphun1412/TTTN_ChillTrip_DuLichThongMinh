import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api-response";
import { requireRole } from "@/lib/permissions";
import { z } from "zod";

function serialize<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

const updateTourSchema = z.object({
  tourCode: z.string().min(2).optional(),
  tourName: z.string().min(2).optional(),
  slug: z.string().min(2).optional().or(z.literal("")),
  tourType: z.enum(["DOMESTIC", "INTERNATIONAL"]).optional(),
  durationDays: z.number().int().min(1).optional(),
  durationNights: z.number().int().min(0).optional(),
  basePrice: z.number().min(0).optional(),
  childPrice: z.number().min(0).optional(),
  maxCapacity: z.number().int().min(1).optional(),
  shortDescription: z.string().optional(),
  description: z.string().optional(),
  featuredImageUrl: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "STOPPED"]).optional(),
  isFeatured: z.boolean().optional(),
});

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const tour = await prisma.tours.findUnique({
      where: { id: BigInt(id) },
      include: {
        tour_categories: true,
        destinations: true,
        tour_images: {
          orderBy: [{ is_cover: "desc" }, { sort_order: "asc" }],
        },
        departure_schedules: {
          orderBy: { start_date: "asc" },
        },
      },
    });

    if (!tour) {
      return fail("Không tìm thấy tour", 404);
    }

    const itineraryRows = await prisma.$queryRaw<
      {
        id: bigint;
        day_no: number;
        title: string;
        description: string | null;
        overnight_location: string | null;
      }[]
    >`
      SELECT 
        d.id,
        d.day_no,
        d.title,
        d.description,
        d.overnight_location
      FROM itineraries i
      INNER JOIN itinerary_days d ON d.itinerary_id = i.id
      WHERE i.tour_id = ${BigInt(id)}
      ORDER BY d.day_no ASC
    `;

   const reviewRows = await prisma.$queryRaw<
  {
    id: bigint;
    rating: number;
    review_title: string | null;
    review_content: string | null;
    is_public: boolean;
    moderation_status: string;
    created_at: Date;
    customer_id: bigint | null;
    full_name: string | null;
    images: string | null;
  }[]
>`
  SELECT
    r.id,
    r.rating,
    r.review_title,
    r.review_content,
    r.is_public,
    r.moderation_status,
    r.created_at,
    r.customer_id,
    c.full_name,
    STRING_AGG(ri.image_url, '|') AS images
  FROM reviews r
  LEFT JOIN customers c ON c.id = r.customer_id
  LEFT JOIN review_images ri ON ri.review_id = r.id
  WHERE r.tour_id = ${BigInt(id)}
    AND r.is_public = 1
    AND r.moderation_status = 'APPROVED'
  GROUP BY
    r.id,
    r.rating,
    r.review_title,
    r.review_content,
    r.is_public,
    r.moderation_status,
    r.created_at,
    r.customer_id,
    c.full_name
  ORDER BY r.created_at DESC
`;

    const coverImage =
      tour.tour_images?.find((image: any) => image.is_cover) ||
      tour.tour_images?.[0];

    const firstDeparture = tour.departure_schedules?.[0];

    const result = {
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
      includedServices: tour.included_services,
      excludedServices: tour.excluded_services,

      imageUrl:
        coverImage?.image_url?.includes("-1.jpg")
          ? tour.featured_image_url
          : coverImage?.image_url || tour.featured_image_url || null,

      images:
        tour.tour_images?.map((image: any) => ({
          id: image.id,
          imageUrl:
            image.image_url?.includes("-1.jpg") && image.is_cover
              ? tour.featured_image_url
              : image.image_url,
          sortOrder: image.sort_order,
          isCover: image.is_cover,
        })) || [],

      category: tour.tour_categories
        ? {
            id: tour.tour_categories.id,
            code: tour.tour_categories.category_code,
            name: tour.tour_categories.category_name,
          }
        : null,

      destination: tour.destinations
  ? {
      id: tour.destinations.id,
      code: tour.destinations.destination_code,
      name: tour.destinations.destination_name,
      country: tour.destinations.country,
      city: tour.destinations.city,
      description: tour.destinations.description,
      latitude: tour.destinations.latitude,
      longitude: tour.destinations.longitude,
    }
  : null,

      departure: firstDeparture
        ? {
            id: firstDeparture.id,
            departureCode: firstDeparture.departure_code,
            startDate: firstDeparture.start_date,
            endDate: firstDeparture.end_date,
            maxSeats: firstDeparture.max_seats,
            availableSeats: firstDeparture.available_seats,
            bookedSeats: firstDeparture.booked_seats,
            bookingStatus: firstDeparture.booking_status,
          }
        : null,

      departures:
        tour.departure_schedules?.map((departure: any) => ({
          id: departure.id,
          departureCode: departure.departure_code,
          startDate: departure.start_date,
          endDate: departure.end_date,
          maxSeats: departure.max_seats,
          availableSeats: departure.available_seats,
          bookedSeats: departure.booked_seats,
          bookingStatus: departure.booking_status,
        })) || [],

      itineraryDays: itineraryRows.map((day) => ({
        id: day.id.toString(),
        dayNumber: day.day_no,
        title: day.title,
        description: day.description,
        overnightLocation: day.overnight_location,
      })),

      reviews: reviewRows.map((review) => ({
  id: review.id.toString(),
  rating: review.rating,
  title: review.review_title,
  content: review.review_content,
  isPublic: review.is_public,
  moderationStatus: review.moderation_status,
  createdAt: review.created_at,
  images: review.images ? review.images.split("|") : [],
  customer: {
    id: review.customer_id?.toString() || null,
    fullName: review.full_name || "Khách hàng",
  },
})),

      status: tour.status,
      isFeatured: tour.is_featured,
      createdAt: tour.created_at,
      updatedAt: tour.updated_at,
    };

    return ok(serialize(result), "Lấy chi tiết tour thành công");
  } catch (error) {
    console.error("GET /api/tours/[id] error:", error);
    return fail("Không thể lấy chi tiết tour", 500);
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = requireRole(req, ["ADMIN", "STAFF"]);

  if (!auth.ok) {
    return fail(
      auth.reason === "UNAUTHORIZED" ? "Chưa đăng nhập" : "Không có quyền",
      auth.reason === "UNAUTHORIZED" ? 401 : 403
    );
  }

  try {
    const { id } = await context.params;
    const body = await req.json();
    const parsed = updateTourSchema.safeParse(body);

    if (!parsed.success) {
      return fail("Dữ liệu không hợp lệ", 422, parsed.error.flatten());
    }

    const existed = await prisma.tours.findUnique({
      where: { id: BigInt(id) },
    });

    if (!existed) {
      return fail("Không tìm thấy tour", 404);
    }

    if (parsed.data.tourCode && parsed.data.tourCode !== existed.tour_code) {
      const codeExists = await prisma.tours.findFirst({
        where: {
          tour_code: parsed.data.tourCode,
          NOT: { id: BigInt(id) },
        },
      });

      if (codeExists) {
        return fail("Mã tour đã tồn tại", 409);
      }
    }

    if (
      parsed.data.slug !== undefined &&
      parsed.data.slug !== "" &&
      parsed.data.slug !== existed.slug
    ) {
      const slugExists = await prisma.tours.findFirst({
        where: {
          slug: parsed.data.slug,
          NOT: { id: BigInt(id) },
        },
      });

      if (slugExists) {
        return fail("Slug đã tồn tại", 409);
      }
    }

    const updated = await prisma.tours.update({
      where: { id: BigInt(id) },
      data: {
        ...(parsed.data.tourCode !== undefined
          ? { tour_code: parsed.data.tourCode }
          : {}),
        ...(parsed.data.tourName !== undefined
          ? { tour_name: parsed.data.tourName }
          : {}),
        ...(parsed.data.slug !== undefined
          ? { slug: parsed.data.slug || null }
          : {}),
        ...(parsed.data.tourType !== undefined
          ? { tour_type: parsed.data.tourType }
          : {}),
        ...(parsed.data.durationDays !== undefined
          ? { duration_days: parsed.data.durationDays }
          : {}),
        ...(parsed.data.durationNights !== undefined
          ? { duration_nights: parsed.data.durationNights }
          : {}),
        ...(parsed.data.basePrice !== undefined
          ? { base_price: parsed.data.basePrice }
          : {}),
        ...(parsed.data.childPrice !== undefined
          ? { child_price: parsed.data.childPrice }
          : {}),
        ...(parsed.data.maxCapacity !== undefined
          ? { max_capacity: parsed.data.maxCapacity }
          : {}),
        ...(parsed.data.shortDescription !== undefined
          ? { short_description: parsed.data.shortDescription || null }
          : {}),
        ...(parsed.data.description !== undefined
          ? { description: parsed.data.description || null }
          : {}),
        ...(parsed.data.featuredImageUrl !== undefined
          ? { featured_image_url: parsed.data.featuredImageUrl || null }
          : {}),
        ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
        ...(parsed.data.isFeatured !== undefined
          ? { is_featured: parsed.data.isFeatured }
          : {}),
      },
    });

    return ok(serialize(updated), "Cập nhật tour thành công");
  } catch (error) {
    console.error("PATCH /api/tours/[id] error:", error);
    return fail("Không thể cập nhật tour", 500);
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = requireRole(req, ["ADMIN"]);

  if (!auth.ok) {
    return fail(
      auth.reason === "UNAUTHORIZED" ? "Chưa đăng nhập" : "Không có quyền",
      auth.reason === "UNAUTHORIZED" ? 401 : 403
    );
  }

  try {
    const { id } = await context.params;

    const existed = await prisma.tours.findUnique({
      where: { id: BigInt(id) },
      include: {
        departure_schedules: true,
        bookings: true,
      },
    });

    if (!existed) {
      return fail("Không tìm thấy tour", 404);
    }

    if (existed.bookings.length > 0) {
      return fail("Tour đã có booking, không thể xóa", 422);
    }

    if (existed.departure_schedules.length > 0) {
      return fail("Tour đã có đợt khởi hành, không thể xóa", 422);
    }

    await prisma.tours.delete({
      where: { id: BigInt(id) },
    });

    return ok(null, "Xóa tour thành công");
  } catch (error) {
    console.error("DELETE /api/tours/[id] error:", error);
    return fail("Không thể xóa tour", 500);
  }
}