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
  tourCode: z.string().min(2, "Mã tour không hợp lệ").optional(),
  tourName: z.string().min(2, "Tên tour không hợp lệ").optional(),
  slug: z.string().min(2, "Slug không hợp lệ").nullable().optional(),
  tourType: z.enum(["DOMESTIC", "INTERNATIONAL"]).optional(),
  durationDays: z.number().int().min(1).optional(),
  durationNights: z.number().int().min(0).optional(),
  basePrice: z.number().min(0).optional(),
  childPrice: z.number().min(0).optional(),
  maxCapacity: z.number().int().min(1).optional(),
  shortDescription: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  featuredImageUrl: z.string().nullable().optional(),
  galleryImages: z.array(z.string()).optional(),

includedItems: z.array(z.string()).optional(),
excludedItems: z.array(z.string()).optional(),
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
  .optional(),

  itineraryDays: z
    .array(
      z.object({
        dayNo: z.number().int().min(1),
        title: z.string().optional(),
        description: z.string().optional(),
        overnightLocation: z.string().nullable().optional(),
        activities: z
          .array(
            z.object({
              activityTime: z.string().optional(),
              activityTitle: z.string().optional(),
              locationName: z.string().optional(),
              description: z.string().optional(),
              sortOrder: z.number().int().min(1).optional(),
            })
          )
          .optional()
          .default([]),
      })
    )
    .optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "STOPPED"]).optional(),
  isFeatured: z.boolean().optional(),
});

async function getTourId(params: Promise<{ id: string }>) {
  const resolvedParams = await params;
  const id = Number(resolvedParams.id);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

function mapUpdateData(data: z.infer<typeof updateTourSchema>) {
  return {
    ...(data.tourCode !== undefined ? { tour_code: data.tourCode } : {}),
    ...(data.tourName !== undefined ? { tour_name: data.tourName } : {}),
    ...(data.slug !== undefined ? { slug: data.slug || null } : {}),
    ...(data.tourType !== undefined ? { tour_type: data.tourType } : {}),
    ...(data.durationDays !== undefined
      ? { duration_days: data.durationDays }
      : {}),
    ...(data.durationNights !== undefined
      ? { duration_nights: data.durationNights }
      : {}),
    ...(data.basePrice !== undefined ? { base_price: data.basePrice } : {}),
    ...(data.childPrice !== undefined ? { child_price: data.childPrice } : {}),
    ...(data.maxCapacity !== undefined
      ? { max_capacity: data.maxCapacity }
      : {}),
    ...(data.shortDescription !== undefined
      ? { short_description: data.shortDescription || null }
      : {}),
    ...(data.description !== undefined
      ? { description: data.description || null }
      : {}),
    ...(data.featuredImageUrl !== undefined
      ? { featured_image_url: data.featuredImageUrl || null }
      : {}),
    ...(data.status !== undefined ? { status: data.status } : {}),
    ...(data.isFeatured !== undefined ? { is_featured: data.isFeatured } : {}),
    ...(data.includedItems !== undefined
  ? {
      included_services:
        data.includedItems.length > 0 ? data.includedItems.join("; ") : null,
    }
  : {}),
...(data.excludedItems !== undefined
  ? {
      excluded_services:
        data.excludedItems.length > 0 ? data.excludedItems.join("; ") : null,
    }
  : {}),
  };
}

function tourInclude() {
    
  return {
    tour_images: {
      orderBy: {
        sort_order: "asc" as const,
      },
    },
    departure_schedules: {
  orderBy: {
    start_date: "asc" as const,
  },
},
    itineraries: {
      where: {
        is_active: true,
      },
      include: {
        itinerary_days: {
          orderBy: {
            day_no: "asc" as const,
          },
          include: {
            itinerary_activities: {
              orderBy: {
                sort_order: "asc" as const,
              },
            },
          },
        },
      },
    },
  };
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireRole(req, ["ADMIN"]);

  if (!auth.ok) {
    return fail(
      auth.reason === "UNAUTHORIZED" ? "Chưa đăng nhập" : "Không có quyền",
      auth.reason === "UNAUTHORIZED" ? 401 : 403
    );
  }

  try {
    const id = await getTourId(params);

    if (!id) {
      return fail("ID tour không hợp lệ", 400);
    }

    const tour = await prisma.tours.findUnique({
      where: { id },
      include: tourInclude(),
    });

    if (!tour) {
      return fail("Không tìm thấy tour", 404);
    }

    return ok(serialize(tour), "Lấy chi tiết tour thành công");
  } catch (error) {
    console.error("GET /api/admin/tours/[id] error:", error);
    return fail("Không thể lấy chi tiết tour", 500);
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireRole(req, ["ADMIN"]);

  if (!auth.ok) {
    return fail(
      auth.reason === "UNAUTHORIZED" ? "Chưa đăng nhập" : "Không có quyền",
      auth.reason === "UNAUTHORIZED" ? 401 : 403
    );
  }

  try {
    const id = await getTourId(params);

    if (!id) {
      return fail("ID tour không hợp lệ", 400);
    }

    const body = await req.json();
    const parsed = updateTourSchema.safeParse(body);

    if (!parsed.success) {
      return fail("Dữ liệu không hợp lệ", 422, parsed.error.flatten());
    }

    const currentTour = await prisma.tours.findUnique({
      where: { id },
    });

    if (!currentTour) {
      return fail("Không tìm thấy tour", 404);
    }

    const data = parsed.data;

    if (data.tourCode || data.slug) {
      const existed = await prisma.tours.findFirst({
        where: {
          id: {
            not: id,
          },
          OR: [
            ...(data.tourCode ? [{ tour_code: data.tourCode }] : []),
            ...(data.slug ? [{ slug: data.slug }] : []),
          ],
        },
      });

      if (existed) {
        return fail("Mã tour hoặc slug đã tồn tại", 409);
      }
    }

    const updated = await prisma.tours.update({
      where: { id },
      data: mapUpdateData(data),
    });

    if (data.galleryImages !== undefined) {
      await prisma.tour_images.deleteMany({
        where: {
          tour_id: id,
          is_cover: false,
        },
      });

      if (data.galleryImages.length > 0) {
        await prisma.tour_images.createMany({
          data: data.galleryImages.map((imageUrl, index) => ({
            tour_id: id,
            image_url: imageUrl,
            sort_order: index + 1,
            is_cover: false,
          })),
        });
      }
    }

    if (data.itineraryDays !== undefined) {
      const oldItineraries = await prisma.itineraries.findMany({
        where: {
          tour_id: id,
        },
        select: {
          id: true,
        },
      });
      if (data.departures !== undefined) {
      await prisma.departure_schedules.deleteMany({
        where: {
          tour_id: id,
        },
      });

      if (data.departures.length > 0) {
        await prisma.departure_schedules.createMany({
          data: data.departures.map((item, index) => ({
            tour_id: id,
            departure_code:
              item.departureCode?.trim() || `DEP${id}-${index + 1}`,
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
    }

      const itineraryIds = oldItineraries.map((item) => item.id);

      if (itineraryIds.length > 0) {
        const oldDays = await prisma.itinerary_days.findMany({
          where: {
            itinerary_id: {
              in: itineraryIds,
            },
          },
          select: {
            id: true,
          },
        });

        const dayIds = oldDays.map((item) => item.id);

        if (dayIds.length > 0) {
          await prisma.itinerary_activities.deleteMany({
            where: {
              itinerary_day_id: {
                in: dayIds,
              },
            },
          });
        }

        await prisma.itinerary_days.deleteMany({
          where: {
            itinerary_id: {
              in: itineraryIds,
            },
          },
        });

        await prisma.itineraries.deleteMany({
          where: {
            tour_id: id,
          },
        });
      }

      if (data.itineraryDays.length > 0) {
        const itinerary = await prisma.itineraries.create({
          data: {
            tour_id: id,
            version_no: 1,
            title: `Lịch trình chuẩn - ${data.tourName || currentTour.tour_name}`,
            notes: "Lịch trình được cập nhật từ trang quản trị",
            is_active: true,
          },
        });

        for (const day of data.itineraryDays) {
          const createdDay = await prisma.itinerary_days.create({
            data: {
              itinerary_id: itinerary.id,
              day_no: day.dayNo,
              title: day.title || `Ngày ${day.dayNo}`,
              description: day.description || null,
              overnight_location: day.overnightLocation || null,
            },
          });

          if (day.activities.length > 0) {
            await prisma.itinerary_activities.createMany({
              data: day.activities.map((activity, index) => ({
                itinerary_day_id: createdDay.id,
                activity_time: activity.activityTime || null,
                activity_title: activity.activityTitle || "",
                location_name: activity.locationName || null,
                description: activity.description || null,
                sort_order: activity.sortOrder || index + 1,
              })),
            });
          }
        }
      }
    }

    const result = await prisma.tours.findUnique({
      where: { id },
      include: tourInclude(),
    });

    return ok(serialize(result || updated), "Cập nhật tour thành công");
  } catch (error) {
    console.error("PUT /api/admin/tours/[id] error:", error);
    return fail("Không thể cập nhật tour", 500);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireRole(req, ["ADMIN"]);

  if (!auth.ok) {
    return fail(
      auth.reason === "UNAUTHORIZED" ? "Chưa đăng nhập" : "Không có quyền",
      auth.reason === "UNAUTHORIZED" ? 401 : 403
    );
  }

  try {
    const id = await getTourId(params);

    if (!id) {
      return fail("ID tour không hợp lệ", 400);
    }

    const tour = await prisma.tours.findUnique({
      where: { id },
    });

    if (!tour) {
      return fail("Không tìm thấy tour", 404);
    }

    await prisma.tours.delete({
      where: { id },
    });

    return ok(null, "Xóa tour thành công");
  } catch (error) {
    console.error("DELETE /api/admin/tours/[id] error:", error);
    return fail(
      "Không thể xóa tour. Tour có thể đang có dữ liệu liên quan.",
      500
    );
  }
}