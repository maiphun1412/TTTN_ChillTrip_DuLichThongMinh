import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/permissions";
import { z } from "zod";

function serialize<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

const updateBookingSchema = z.object({
  contactName: z.string().min(2).optional(),
  contactPhone: z.string().min(8).optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  bookingStatus: z
    .enum([
      "PENDING",
      "RESERVED",
      "CONFIRMED",
      "PARTIALLY_PAID",
      "PAID",
      "CANCELLED",
      "COMPLETED",
    ])
    .optional(),
  specialNotes: z.string().optional(),
});

async function getCurrentCustomer(req: Request) {
  const auth = requireAuth(req);

  if (!auth) {
    return null;
  }

  const customer = await prisma.customers.findFirst({
  where: {
    user_id: BigInt(auth.userId),
  },
});

  return customer;
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const customer = await getCurrentCustomer(req);

    if (!customer) {
      return NextResponse.json(
        { success: false, message: "Chưa đăng nhập hoặc không tìm thấy khách hàng" },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const bookingId = Number(id);

    if (!bookingId) {
      return NextResponse.json(
        { success: false, message: "ID booking không hợp lệ" },
        { status: 400 }
      );
    }

    const booking: any = await prisma.$queryRawUnsafe(
      `
        SELECT
          b.id,
          b.booking_code AS bookingCode,
          b.booking_status AS bookingStatus,
          b.adult_count AS adultCount,
          b.child_count AS childCount,
          b.contact_name AS contactName,
          b.contact_phone AS contactPhone,
          b.contact_email AS contactEmail,
          b.total_original_amount AS totalOriginalAmount,
          b.discount_amount AS discountAmount,
          b.total_payable_amount AS totalPayableAmount,
          b.booked_at AS bookedAt,
          b.reserved_until AS reservedUntil,
          b.special_notes AS specialNotes,

          t.id AS tourId,
          t.tour_name AS tourName,
          t.tour_code AS tourCode,
          t.duration_days AS durationDays,
          t.duration_nights AS durationNights,
          t.featured_image_url AS featuredImageUrl,
          t.included_services AS includedServices,
          t.excluded_services AS excludedServices,

          ds.id AS departureId,
          ds.start_date AS startDate,
          ds.end_date AS endDate,

          pp.point_name AS pickupName,
          pp.address AS pickupAddress,

          p.promotion_name AS promotionName
        FROM bookings b
        LEFT JOIN tours t ON b.tour_id = t.id
        LEFT JOIN departure_schedules ds ON b.departure_id = ds.id
        LEFT JOIN pickup_points pp ON b.pickup_point_id = pp.id
        LEFT JOIN promotions p ON b.promotion_id = p.id
        WHERE b.id = @P1
          AND b.customer_id = @P2
      `,
      BigInt(bookingId),
      customer.id
    );

    if (!booking?.length) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy booking" },
        { status: 404 }
      );
    }

    const passengers = await prisma.$queryRawUnsafe(
      `
        SELECT
          bp.id,
          bp.booking_id AS bookingId,
          bp.passenger_type AS passengerType,
          bp.full_name AS fullName,
          bp.gender,
          bp.date_of_birth AS dateOfBirth,
          bp.phone,
          bp.email,
          bp.id_number AS idNumber,
          bp.passport_number AS passportNumber,
          bp.nationality,
          bp.emergency_contact_name AS emergencyContactName,
          bp.emergency_contact_phone AS emergencyContactPhone,
          bp.meal_note AS mealNote,
          bp.health_note AS healthNote,
          bp.room_preference AS roomPreference,
          bp.is_booking_contact AS isBookingContact
        FROM booking_passengers bp
        INNER JOIN bookings b ON bp.booking_id = b.id
        WHERE bp.booking_id = @P1
          AND b.customer_id = @P2
        ORDER BY bp.id ASC
      `,
      BigInt(bookingId),
      customer.id
    );

    const itineraryDays = await prisma.$queryRawUnsafe(
      `
        SELECT
          d.id,
          d.day_no AS dayNo,
          d.title,
          d.description,
          d.overnight_location AS overnightLocation
        FROM itinerary_days d
        INNER JOIN itineraries i ON d.itinerary_id = i.id
        INNER JOIN bookings b ON b.tour_id = i.tour_id
        WHERE b.id = @P1
          AND b.customer_id = @P2
          AND i.is_active = 1
        ORDER BY d.day_no ASC
      `,
      BigInt(bookingId),
      customer.id
    );

    return NextResponse.json({
      success: true,
      data: serialize({
        booking: booking[0],
        passengers,
        itineraryDays,
      }),
    });
  } catch (error) {
    console.error("GET /api/bookings/[id] error:", error);

    return NextResponse.json(
      { success: false, message: "Không thể lấy chi tiết booking" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const customer = await getCurrentCustomer(req);

    if (!customer) {
      return NextResponse.json(
        { success: false, message: "Chưa đăng nhập hoặc không tìm thấy khách hàng" },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const bookingId = Number(id);

    if (!bookingId) {
      return NextResponse.json(
        { success: false, message: "ID booking không hợp lệ" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const parsed = updateBookingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Dữ liệu cập nhật không hợp lệ",
          errors: parsed.error.flatten(),
        },
        { status: 422 }
      );
    }

    const existed = await prisma.bookings.findFirst({
      where: {
        id: BigInt(bookingId),
        customer_id: customer.id,
      },
    });

    if (!existed) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy booking" },
        { status: 404 }
      );
    }

    const updated = await prisma.bookings.update({
      where: {
        id: BigInt(bookingId),
      },
      data: {
        ...(parsed.data.contactName !== undefined
          ? { contact_name: parsed.data.contactName }
          : {}),
        ...(parsed.data.contactPhone !== undefined
          ? { contact_phone: parsed.data.contactPhone }
          : {}),
        ...(parsed.data.contactEmail !== undefined
          ? { contact_email: parsed.data.contactEmail || null }
          : {}),
        ...(parsed.data.bookingStatus !== undefined
          ? { booking_status: parsed.data.bookingStatus }
          : {}),
        ...(parsed.data.specialNotes !== undefined
          ? { special_notes: parsed.data.specialNotes || null }
          : {}),
      },
      include: {
        customers: true,
        tours: true,
        departure_schedules: true,
        debts: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Cập nhật booking thành công",
      data: serialize(updated),
    });
  } catch (error) {
    console.error("PATCH /api/bookings/[id] error:", error);

    return NextResponse.json(
      { success: false, message: "Không thể cập nhật booking" },
      { status: 500 }
    );
  }
}