import { NextRequest, NextResponse } from "next/server";
import { bookingService } from "@/server/services/booking.service";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/permissions";

function serialize(data: any) {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);

  if (!auth) {
    return NextResponse.json(
      {
        success: false,
        message: "Chưa đăng nhập",
      },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();

    const customer = await prisma.customers.findFirst({
      where: {
        user_id: BigInt(auth.userId),
      },
    });

    if (!customer) {
      return NextResponse.json(
        {
          success: false,
          message: "Không tìm thấy thông tin khách hàng",
        },
        { status: 404 }
      );
    }

    const booking = await bookingService.create({
      customerId: Number(customer.id),
      passengers: body.passengers,
      tourId: Number(body.tourId || body.tour_id),
      departureId: Number(body.departureId || body.departure_id),
      pickupPointId: body.pickupPointId || body.pickup_point_id,
      promotionId: body.promotionId || body.promotion_id,
      contactName: body.contactName || body.contact_name,
      contactPhone: body.contactPhone || body.contact_phone,
      contactEmail: body.contactEmail || body.contact_email,
      adultCount: Number(body.adultCount || body.adult_count || 0),
      childCount: Number(body.childCount || body.child_count || 0),
      specialNotes: body.specialNotes || body.special_notes,
    });

    await prisma.notifications.create({
      data: {
        user_id: BigInt(auth.userId),
        title: "Đặt tour thành công",
        content:
          "Đơn đặt tour của bạn đã được tạo thành công. Vui lòng kiểm tra mục Tour đã đặt để xem chi tiết lịch trình và vé điện tử.",
        notification_type: "BOOKING",
        is_read: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Đặt tour thành công",
      data: serialize(booking),
    });
  } catch (error) {
    console.error("CREATE_BOOKING_ERROR:", error);

    if (error instanceof Error && error.message.startsWith("NOT_ENOUGH_SEATS:")) {
      const availableSeats = error.message.split(":")[1];

      return NextResponse.json(
        {
          success: false,
          message: `Chỉ còn ${availableSeats} chỗ trống`,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Không tạo được đặt chỗ",
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);

  if (!auth) {
    return NextResponse.json(
      {
        success: false,
        message: "Chưa đăng nhập",
      },
      { status: 401 }
    );
  }

  try {
    const customer = await prisma.customers.findFirst({
      where: {
        user_id: BigInt(auth.userId),
      },
    });

    if (!customer) {
      return NextResponse.json(
        {
          success: false,
          message: "Không tìm thấy thông tin khách hàng",
        },
        { status: 404 }
      );
    }

    const bookings = await prisma.$queryRawUnsafe(
      `
        SELECT
          b.id,
          b.booking_code AS bookingCode,
          b.booking_status AS bookingStatus,
          b.adult_count AS adultCount,
          b.child_count AS childCount,
          b.total_payable_amount AS totalPayableAmount,
          b.booked_at AS bookedAt,
          b.reserved_until AS reservedUntil,

          t.id AS tourId,
          t.tour_name AS tourName,
          t.tour_code AS tourCode,
          t.duration_days AS durationDays,
          t.duration_nights AS durationNights,
          t.featured_image_url AS featuredImageUrl,

          ds.id AS departureId,
          ds.start_date AS startDate,
          ds.end_date AS endDate
        FROM bookings b
        INNER JOIN tours t ON b.tour_id = t.id
        LEFT JOIN departure_schedules ds ON b.departure_id = ds.id
        WHERE b.customer_id = @P1
        ORDER BY b.booked_at DESC
      `,
      customer.id
    );

    return NextResponse.json({
      success: true,
      data: serialize(bookings),
    });
  } catch (error) {
    console.error("GET_MY_BOOKINGS_ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Không lấy được danh sách tour đã đặt",
      },
      { status: 500 }
    );
  }
}