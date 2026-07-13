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

const createTourSchema = z.object({
  tourCode: z.string().min(2, "Mã tour không hợp lệ"),
  tourName: z.string().min(2, "Tên tour không hợp lệ"),
  slug: z.string().min(2, "Slug không hợp lệ").optional(),
  tourType: z.enum(["DOMESTIC", "INTERNATIONAL"]),
  durationDays: z.number().int().min(1),
  durationNights: z.number().int().min(0).default(0),
  basePrice: z.number().min(0),
  childPrice: z.number().min(0).default(0),
  maxCapacity: z.number().int().min(1),
  shortDescription: z.string().optional(),
  description: z.string().optional(),
  featuredImageUrl: z.string().optional(),
  galleryImages: z.array(z.string()).optional().default([]),
  status: z.enum(["DRAFT", "PUBLISHED", "STOPPED"]).default("DRAFT"),
  isFeatured: z.boolean().default(false),
  includedItems: z.array(z.string()).optional().default([]),
excludedItems: z.array(z.string()).optional().default([]),
departures: z
  .array(
    z.object({
      departureCode: z.string().optional(),
      startDate: z.string().min(1),
      endDate: z.string().min(1),
      maxSeats: z.number().int().min(1),
      availableSeats: z.number().int().min(0).optional(),
      bookingStatus: z.enum(["OPEN", "CLOSED", "FULL"]).default("OPEN"),
      guideId: z.number().int().nullable().optional(),
      notes: z.string().optional(),
    })
  )
  .optional()
  .default([]),
});

export async function GET(req: Request) {
  const auth = requireRole(req, ["ADMIN"]);

  if (!auth.ok) {
    return fail(
      auth.reason === "UNAUTHORIZED" ? "Chưa đăng nhập" : "Không có quyền",
      auth.reason === "UNAUTHORIZED" ? 401 : 403
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const keyword = searchParams.get("keyword")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "";
    const tourType = searchParams.get("tourType")?.trim() || "";

    const tours = await prisma.tours.findMany({
      where: {
        ...(keyword
          ? {
              OR: [
                { tour_name: { contains: keyword } },
                { tour_code: { contains: keyword } },
                { short_description: { contains: keyword } },
              ],
            }
          : {}),
        ...(status ? { status } : {}),
        ...(tourType ? { tour_type: tourType } : {}),
      },
      orderBy: {
        created_at: "desc",
      },
    });

    return ok(serialize(tours), "Lấy danh sách tour thành công");
  } catch (error) {
    console.error("GET /api/admin/tours error:", error);
    return fail("Không thể lấy danh sách tour", 500);
  }
}

export async function POST(req: Request) {
  const auth = requireRole(req, ["ADMIN"]);

  if (!auth.ok) {
    return fail(
      auth.reason === "UNAUTHORIZED" ? "Chưa đăng nhập" : "Không có quyền",
      auth.reason === "UNAUTHORIZED" ? 401 : 403
    );
  }

  try {
    const body = await req.json();
    const parsed = createTourSchema.safeParse(body);

    if (!parsed.success) {
      return fail("Dữ liệu không hợp lệ", 422, parsed.error.flatten());
    }

    const data = parsed.data;

    const existed = await prisma.tours.findFirst({
      where: {
        OR: [
          { tour_code: data.tourCode },
          ...(data.slug ? [{ slug: data.slug }] : []),
        ],
      },
    });

    if (existed) {
      return fail("Mã tour hoặc slug đã tồn tại", 409);
    }

    const created = await prisma.tours.create({
      data: {
        tour_code: data.tourCode,
        tour_name: data.tourName,
        slug: data.slug || null,
        tour_type: data.tourType,
        duration_days: data.durationDays,
        duration_nights: data.durationNights,
        base_price: data.basePrice,
        child_price: data.childPrice,
        max_capacity: data.maxCapacity,
        short_description: data.shortDescription || null,
        description: data.description || null,
        featured_image_url: data.featuredImageUrl || null,
        status: data.status,
        is_featured: data.isFeatured,
        included_services:
  data.includedItems.length > 0 ? data.includedItems.join("; ") : null,
excluded_services:
  data.excludedItems.length > 0 ? data.excludedItems.join("; ") : null,
      },
    });

    if (data.galleryImages.length > 0) {
      await prisma.tour_images.createMany({
        data: data.galleryImages.map((imageUrl, index) => ({
          tour_id: created.id,
          image_url: imageUrl,
          sort_order: index + 1,
          is_cover: false,
        })),
      });
    }

    if (data.departures.length > 0) {
  await prisma.departure_schedules.createMany({
    data: data.departures.map((item, index) => ({
      tour_id: created.id,
      departure_code:
        item.departureCode?.trim() || `DEP${created.id}-${index + 1}`,
      start_date: new Date(item.startDate),
      end_date: new Date(item.endDate),
      max_seats: item.maxSeats,
      available_seats: item.availableSeats ?? item.maxSeats,
      booked_seats: 0,
      booking_status: item.bookingStatus,
      guide_id: item.guideId || null,
      notes: item.notes || null,
    })),
  });
}

    const result = await prisma.tours.findUnique({
      where: {
        id: created.id,
      },
      include: {
        tour_images: {
          orderBy: {
            sort_order: "asc",
          },
        },
      },
    });

    return ok(serialize(result || created), "Tạo tour thành công", 201);
  } catch (error) {
    console.error("POST /api/admin/tours error:", error);
    return fail("Không thể tạo tour", 500);
  }
}