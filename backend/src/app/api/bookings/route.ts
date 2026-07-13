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
      pickupServiceType: body.pickupServiceType || body.pickup_service_type,
pickupProvince: body.pickupProvince || body.pickup_province,
pickupAddress: body.pickupAddress || body.pickup_address,
pickupFeeId: body.pickupFeeId || body.pickup_fee_id,

bookingType: body.bookingType || body.booking_type || "INDIVIDUAL",
organizationName: body.organizationName || body.organization_name,
representativeName: body.representativeName || body.representative_name,
representativePhone: body.representativePhone || body.representative_phone,
representativeEmail: body.representativeEmail || body.representative_email,
expectedGuestCount: body.expectedGuestCount || body.expected_guest_count,
depositAmount: body.depositAmount || body.deposit_amount,
paymentTerms: body.paymentTerms || body.payment_terms,
cancellationTerms: body.cancellationTerms || body.cancellation_terms,

promotionId: body.promotionId || body.promotion_id,
paymentMethod: body.paymentMethod || body.payment_method || "BANK_TRANSFER",
      contactName: body.contactName || body.contact_name,
      contactPhone: body.contactPhone || body.contact_phone,
      contactEmail: body.contactEmail || body.contact_email,
      adultCount: Number(body.adultCount || body.adult_count || 0),
      childCount: Number(body.childCount || body.child_count || 0),
      specialNotes: body.specialNotes || body.special_notes,
    });

    const isGroupBooking =
  (body.bookingType || body.booking_type) === "GROUP";

    const payment = await prisma.payments.findFirst({
      where: {
        booking_id: booking.id,
      },
      orderBy: {
        created_at: "desc",
      },
    });

    await prisma.notifications.create({
      data: {
        user_id: BigInt(auth.userId),
        title: isGroupBooking
  ? "Yêu cầu tour đoàn đã được gửi"
  : body.paymentMethod === "VNPAY"
    ? "Đơn đặt tour chờ thanh toán VNPay"
    : body.paymentMethod === "BANK_TRANSFER"
      ? "Đơn đặt tour chờ chuyển khoản"
      : "Đã gửi yêu cầu đặt tour",
content: isGroupBooking
  ? "Yêu cầu tour đoàn của bạn đã được ghi nhận. ChillTrip sẽ liên hệ tư vấn, lập hợp đồng và hướng dẫn thanh toán cọc."
  : body.paymentMethod === "VNPAY"
    ? "Đơn đặt tour của bạn đã được tạo. Vui lòng hoàn tất thanh toán VNPay để xác nhận đặt chỗ."
    : body.paymentMethod === "BANK_TRANSFER"
      ? "Đơn đặt tour của bạn đã được tạo. Vui lòng chuyển khoản để hoàn tất thanh toán."
      : "Yêu cầu đặt tour của bạn đã được tạo. ChillTrip sẽ liên hệ xác nhận trong thời gian sớm nhất.",
        notification_type: "BOOKING",
        is_read: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: isGroupBooking
  ? "Đã gửi yêu cầu tour đoàn, chờ tư vấn và tạo hợp đồng"
  : body.paymentMethod === "VNPAY"
    ? "Đã tạo đơn đặt tour, chờ thanh toán VNPay"
    : body.paymentMethod === "BANK_TRANSFER"
      ? "Đã tạo đơn đặt tour, chờ chuyển khoản"
      : "Đã gửi yêu cầu đặt tour",
      data: serialize({
        ...booking,
        paymentId: payment?.id || null,
        payment,
      }),
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
b.booking_type AS bookingType,
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