import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAccessToken } from "@/lib/auth";

type CurrentUserRow = {
  id: bigint;
  roleCode: string;
};

type BookingDetailRow = {
  id: bigint;
  bookingCode: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  tourCode: string | null;
  tourName: string | null;
  tourImage: string | null;
  departureCode: string | null;
  startDate: Date | null;
  endDate: Date | null;
  adultCount: number | null;
  childCount: number | null;
  totalAmount: number | string | null;
  discountAmount: number | string | null;
  payableAmount: number | string | null;
  paidAmount: number | string | null;
  bookingStatus: string;
  specialNotes: string | null;
  bookedAt: Date | null;
  pickupPointName: string | null;
  pickupAddress: string | null;
  promotionCode: string | null;
  promotionName: string | null;
};

type PassengerRow = {
  id: bigint;
  passengerType: string;
  fullName: string;
  gender: string | null;
  dateOfBirth: Date | null;
  phone: string | null;
  email: string | null;
  idNumber: string | null;
  passportNumber: string | null;
  nationality: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  mealNote: string | null;
  healthNote: string | null;
  roomPreference: string | null;
  isBookingContact: boolean | number;
};

type PaymentRow = {
  id: bigint;
  paymentCode: string;
  paymentMethod: string;
  amount: number | string | null;
  paymentStatus: string;
  transactionCode: string | null;
  proofUrl: string | null;
  paidAt: Date | null;
};

type DocumentRow = {
  id: bigint;
  passengerName: string;
  documentType: string;
  documentNumber: string | null;
  issueDate: Date | null;
  expiryDate: Date | null;
  fileUrl: string | null;
  status: string;
  notes: string | null;
};

type DebtRow = {
  totalAmount: number | string | null;
  paidAmount: number | string | null;
  remainingAmount: number | string | null;
  dueDate: Date | null;
  debtStatus: string;
  notes: string | null;
};

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.replace("Bearer ", "");
}

function toNumber(value: unknown) {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

function toStringId(value: unknown) {
  if (value === null || value === undefined) return "";
  return value.toString();
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return null;

  return new Date(value).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return null;

  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function getCurrentStaff(request: NextRequest) {
  const token = getBearerToken(request);

  if (!token) {
    return {
      error: NextResponse.json(
        { success: false, message: "Chưa đăng nhập" },
        { status: 401 }
      ),
      user: null,
    };
  }

  const payload = verifyAccessToken(token);

  if (!payload?.userId) {
    return {
      error: NextResponse.json(
        { success: false, message: "Token không hợp lệ" },
        { status: 401 }
      ),
      user: null,
    };
  }

  const users = await prisma.$queryRaw<CurrentUserRow[]>`
    SELECT u.id, r.code AS roleCode
    FROM users u
    INNER JOIN roles r ON r.id = u.role_id
    WHERE u.id = ${BigInt(payload.userId)}
  `;

  const user = users[0];

  if (!user) {
    return {
      error: NextResponse.json(
        { success: false, message: "Không tìm thấy người dùng" },
        { status: 404 }
      ),
      user: null,
    };
  }

  if (user.roleCode !== "STAFF" && user.roleCode !== "ADMIN") {
    return {
      error: NextResponse.json(
        { success: false, message: "Bạn không có quyền xem chi tiết đặt chỗ" },
        { status: 403 }
      ),
      user: null,
    };
  }

  return { error: null, user };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getCurrentStaff(request);
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id || id === "undefined") {
      return NextResponse.json(
        { success: false, message: "Thiếu mã đặt chỗ cần xem chi tiết" },
        { status: 400 }
      );
    }

    const bookingId = BigInt(id);

    const bookingRows = await prisma.$queryRaw<BookingDetailRow[]>`
      SELECT TOP 1
        b.id,
        b.booking_code AS bookingCode,
        COALESCE(b.contact_name, c.full_name) AS customerName,
        COALESCE(b.contact_email, c.email) AS customerEmail,
        COALESCE(b.contact_phone, c.phone) AS customerPhone,
        c.address AS customerAddress,
        t.tour_code AS tourCode,
        t.tour_name AS tourName,
        t.featured_image_url AS tourImage,
        ds.departure_code AS departureCode,
        ds.start_date AS startDate,
        ds.end_date AS endDate,
        b.adult_count AS adultCount,
        b.child_count AS childCount,
        b.total_original_amount AS totalAmount,
        b.discount_amount AS discountAmount,
        b.total_payable_amount AS payableAmount,
        COALESCE((
          SELECT SUM(p.amount)
          FROM payments p
          WHERE p.booking_id = b.id
            AND p.payment_status = 'PAID'
        ), 0) AS paidAmount,
        b.booking_status AS bookingStatus,
        b.special_notes AS specialNotes,
        b.booked_at AS bookedAt,
        pp.point_name AS pickupPointName,
        pp.address AS pickupAddress,
        pr.promotion_code AS promotionCode,
        pr.promotion_name AS promotionName
      FROM bookings b
      LEFT JOIN customers c ON c.id = b.customer_id
      LEFT JOIN tours t ON t.id = b.tour_id
      LEFT JOIN departure_schedules ds ON ds.id = b.departure_id
      LEFT JOIN pickup_points pp ON pp.id = b.pickup_point_id
      LEFT JOIN promotions pr ON pr.id = b.promotion_id
      WHERE b.id = ${bookingId}
    `;

    const booking = bookingRows[0];

    if (!booking) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy đặt chỗ" },
        { status: 404 }
      );
    }

    const passengerRows = await prisma.$queryRaw<PassengerRow[]>`
      SELECT
        id,
        passenger_type AS passengerType,
        full_name AS fullName,
        gender,
        date_of_birth AS dateOfBirth,
        phone,
        email,
        id_number AS idNumber,
        passport_number AS passportNumber,
        nationality,
        emergency_contact_name AS emergencyContactName,
        emergency_contact_phone AS emergencyContactPhone,
        meal_note AS mealNote,
        health_note AS healthNote,
        room_preference AS roomPreference,
        is_booking_contact AS isBookingContact
      FROM booking_passengers
      WHERE booking_id = ${bookingId}
      ORDER BY id ASC
    `;

    const paymentRows = await prisma.$queryRaw<PaymentRow[]>`
      SELECT
        id,
        payment_code AS paymentCode,
        payment_method AS paymentMethod,
        amount,
        payment_status AS paymentStatus,
        transaction_code AS transactionCode,
        proof_url AS proofUrl,
        paid_at AS paidAt
      FROM payments
      WHERE booking_id = ${bookingId}
      ORDER BY created_at DESC
    `;

    const documentRows = await prisma.$queryRaw<DocumentRow[]>`
      SELECT
        pd.id,
        bp.full_name AS passengerName,
        pd.document_type AS documentType,
        pd.document_number AS documentNumber,
        pd.issue_date AS issueDate,
        pd.expiry_date AS expiryDate,
        pd.file_url AS fileUrl,
        pd.status,
        pd.notes
      FROM passenger_documents pd
      INNER JOIN booking_passengers bp ON bp.id = pd.booking_passenger_id
      WHERE bp.booking_id = ${bookingId}
      ORDER BY pd.id ASC
    `;

    const debtRows = await prisma.$queryRaw<DebtRow[]>`
      SELECT TOP 1
        total_amount AS totalAmount,
        paid_amount AS paidAmount,
        remaining_amount AS remainingAmount,
        due_date AS dueDate,
        debt_status AS debtStatus,
        notes
      FROM debts
      WHERE booking_id = ${bookingId}
    `;

    const adultCount = booking.adultCount || 0;
    const childCount = booking.childCount || 0;
    const payableAmount = toNumber(booking.payableAmount);
    const paidAmount = toNumber(booking.paidAmount);

    return NextResponse.json({
      success: true,
      message: "Lấy chi tiết đặt chỗ thành công",
      data: {
        booking: {
          id: toStringId(booking.id),
          bookingCode: booking.bookingCode,
          customerName: booking.customerName || "Chưa có tên khách",
          customerEmail: booking.customerEmail || "",
          customerPhone: booking.customerPhone || "",
          customerAddress: booking.customerAddress || "",
          tourCode: booking.tourCode || "",
          tourName: booking.tourName || "Chưa có tour",
          tourImage: booking.tourImage || "",
          departureCode: booking.departureCode || "",
          startDate: formatDate(booking.startDate),
          endDate: formatDate(booking.endDate),
          adultCount,
          childCount,
          pax: adultCount + childCount,
          totalAmount: toNumber(booking.totalAmount),
          discountAmount: toNumber(booking.discountAmount),
          payableAmount,
          paidAmount,
          remainingAmount: Math.max(payableAmount - paidAmount, 0),
          bookingStatus: booking.bookingStatus,
          specialNotes: booking.specialNotes || "",
          bookedAt: formatDateTime(booking.bookedAt),
          pickupPointName: booking.pickupPointName || "",
          pickupAddress: booking.pickupAddress || "",
          promotionCode: booking.promotionCode || "",
          promotionName: booking.promotionName || "",
        },

        passengers: passengerRows.map((item) => ({
          id: toStringId(item.id),
          passengerType: item.passengerType,
          fullName: item.fullName,
          gender: item.gender,
          dateOfBirth: formatDate(item.dateOfBirth),
          phone: item.phone,
          email: item.email,
          idNumber: item.idNumber,
          passportNumber: item.passportNumber,
          nationality: item.nationality,
          emergencyContactName: item.emergencyContactName,
          emergencyContactPhone: item.emergencyContactPhone,
          mealNote: item.mealNote,
          healthNote: item.healthNote,
          roomPreference: item.roomPreference,
          isBookingContact: Boolean(item.isBookingContact),
        })),

        payments: paymentRows.map((item) => ({
          id: toStringId(item.id),
          paymentCode: item.paymentCode,
          paymentMethod: item.paymentMethod,
          amount: toNumber(item.amount),
          paymentStatus: item.paymentStatus,
          transactionCode: item.transactionCode,
          proofUrl: item.proofUrl,
          paidAt: formatDateTime(item.paidAt),
        })),

        documents: documentRows.map((item) => ({
          id: toStringId(item.id),
          passengerName: item.passengerName,
          documentType: item.documentType,
          documentNumber: item.documentNumber,
          issueDate: formatDate(item.issueDate),
          expiryDate: formatDate(item.expiryDate),
          fileUrl: item.fileUrl,
          status: item.status,
          notes: item.notes,
        })),

        debt: debtRows[0]
          ? {
              totalAmount: toNumber(debtRows[0].totalAmount),
              paidAmount: toNumber(debtRows[0].paidAmount),
              remainingAmount: toNumber(debtRows[0].remainingAmount),
              dueDate: formatDate(debtRows[0].dueDate),
              debtStatus: debtRows[0].debtStatus,
              notes: debtRows[0].notes,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("GET /api/staff/booking-detail error:", error);

    return NextResponse.json(
      { success: false, message: "Không lấy được chi tiết đặt chỗ" },
      { status: 500 }
    );
  }
}