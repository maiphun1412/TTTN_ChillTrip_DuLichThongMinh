import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAccessToken } from "@/lib/auth";

type CurrentUserRow = {
  id: bigint;
  roleCode: string;
};

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
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
        { success: false, message: "Bạn không có quyền xem hồ sơ khách hàng" },
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
        { success: false, message: "Thiếu mã khách hàng cần xem hồ sơ" },
        { status: 400 }
      );
    }

    const customerId = BigInt(id);

    const customerRows = await prisma.$queryRaw<any[]>`
      SELECT TOP 1
        c.id,
        c.customer_code AS customerCode,
        c.full_name AS fullName,
        c.gender,
        c.date_of_birth AS dateOfBirth,
        c.email,
        c.phone,
        c.address,
        c.customer_type AS customerType,
        c.notes,
        u.avatar_url AS avatarUrl,
        u.status AS userStatus,
        COALESCE(bs.totalBookings, 0) AS totalBookings,
        COALESCE(bs.totalSpent, 0) AS totalSpent,
        bs.lastBookedAt
      FROM customers c
      LEFT JOIN users u ON u.id = c.user_id
      OUTER APPLY (
        SELECT
          COUNT(*) AS totalBookings,
          COALESCE(SUM(b.total_payable_amount), 0) AS totalSpent,
          MAX(b.booked_at) AS lastBookedAt
        FROM bookings b
        WHERE b.customer_id = c.id
      ) bs
      WHERE c.id = ${customerId}
    `;

    const customer = customerRows[0];

    if (!customer) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy khách hàng" },
        { status: 404 }
      );
    }

    const bookings = await prisma.$queryRaw<any[]>`
      SELECT
        b.id,
        b.booking_code AS bookingCode,
        t.tour_name AS tourName,
        t.featured_image_url AS tourImage,
        ds.start_date AS startDate,
        ds.end_date AS endDate,
        b.adult_count AS adultCount,
        b.child_count AS childCount,
        b.total_payable_amount AS totalPayableAmount,
        COALESCE(paid.paidAmount, 0) AS paidAmount,
        b.total_payable_amount - COALESCE(paid.paidAmount, 0) AS remainingAmount,
        b.booking_status AS bookingStatus,
        b.booked_at AS bookedAt
      FROM bookings b
      INNER JOIN tours t ON t.id = b.tour_id
      INNER JOIN departure_schedules ds ON ds.id = b.departure_id
      OUTER APPLY (
        SELECT COALESCE(SUM(p.amount), 0) AS paidAmount
        FROM payments p
        WHERE p.booking_id = b.id
          AND p.payment_status = 'PAID'
      ) paid
      WHERE b.customer_id = ${customerId}
      ORDER BY b.booked_at DESC
    `;

    const passengers = await prisma.$queryRaw<any[]>`
      SELECT
        bp.id,
        b.booking_code AS bookingCode,
        bp.passenger_type AS passengerType,
        bp.full_name AS fullName,
        bp.gender,
        bp.date_of_birth AS dateOfBirth,
        bp.phone,
        bp.email,
        bp.id_number AS idNumber,
        bp.passport_number AS passportNumber,
        bp.nationality
      FROM booking_passengers bp
      INNER JOIN bookings b ON b.id = bp.booking_id
      WHERE b.customer_id = ${customerId}
      ORDER BY b.booked_at DESC, bp.id ASC
    `;

    const documents = await prisma.$queryRaw<any[]>`
      SELECT
        pd.id,
        b.booking_code AS bookingCode,
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
      INNER JOIN bookings b ON b.id = bp.booking_id
      WHERE b.customer_id = ${customerId}
      ORDER BY b.booked_at DESC, pd.id DESC
    `;

    const debts = await prisma.$queryRaw<any[]>`
      SELECT
        b.booking_code AS bookingCode,
        d.total_amount AS totalAmount,
        d.paid_amount AS paidAmount,
        d.remaining_amount AS remainingAmount,
        d.due_date AS dueDate,
        d.debt_status AS debtStatus,
        d.notes
      FROM debts d
      INNER JOIN bookings b ON b.id = d.booking_id
      WHERE d.customer_id = ${customerId}
      ORDER BY d.updated_at DESC
    `;

    return NextResponse.json({
      success: true,
      message: "Lấy hồ sơ khách hàng thành công",
      data: {
        customer: {
          id: toStringId(customer.id),
          customerCode: customer.customerCode,
          fullName: customer.fullName,
          gender: customer.gender,
          dateOfBirth: formatDate(customer.dateOfBirth),
          email: customer.email,
          phone: customer.phone,
          address: customer.address,
          customerType: customer.customerType,
          notes: customer.notes,
          avatarUrl: customer.avatarUrl,
          userStatus: customer.userStatus,
          totalBookings: toNumber(customer.totalBookings),
          totalSpent: toNumber(customer.totalSpent),
          lastBookedAt: formatDate(customer.lastBookedAt),
        },
        bookings: bookings.map((item) => ({
          id: toStringId(item.id),
          bookingCode: item.bookingCode,
          tourName: item.tourName,
          tourImage: item.tourImage,
          startDate: formatDate(item.startDate),
          endDate: formatDate(item.endDate),
          adultCount: toNumber(item.adultCount),
          childCount: toNumber(item.childCount),
          totalPayableAmount: toNumber(item.totalPayableAmount),
          paidAmount: toNumber(item.paidAmount),
          remainingAmount: toNumber(item.remainingAmount),
          bookingStatus: item.bookingStatus,
          bookedAt: formatDate(item.bookedAt),
        })),
        passengers: passengers.map((item) => ({
          id: toStringId(item.id),
          bookingCode: item.bookingCode,
          passengerType: item.passengerType,
          fullName: item.fullName,
          gender: item.gender,
          dateOfBirth: formatDate(item.dateOfBirth),
          phone: item.phone,
          email: item.email,
          idNumber: item.idNumber,
          passportNumber: item.passportNumber,
          nationality: item.nationality,
        })),
        documents: documents.map((item) => ({
          id: toStringId(item.id),
          bookingCode: item.bookingCode,
          passengerName: item.passengerName,
          documentType: item.documentType,
          documentNumber: item.documentNumber,
          issueDate: formatDate(item.issueDate),
          expiryDate: formatDate(item.expiryDate),
          fileUrl: item.fileUrl,
          status: item.status,
          notes: item.notes,
        })),
        debts: debts.map((item) => ({
          bookingCode: item.bookingCode,
          totalAmount: toNumber(item.totalAmount),
          paidAmount: toNumber(item.paidAmount),
          remainingAmount: toNumber(item.remainingAmount),
          dueDate: formatDate(item.dueDate),
          debtStatus: item.debtStatus,
          notes: item.notes,
        })),
      },
    });
  } catch (error) {
    console.error("GET /api/staff/customer-detail error:", error);

    return NextResponse.json(
      { success: false, message: "Không lấy được hồ sơ khách hàng" },
      { status: 500 }
    );
  }
}