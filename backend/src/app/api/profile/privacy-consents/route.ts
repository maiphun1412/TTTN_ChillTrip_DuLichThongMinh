import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api-response";
import { requireRole } from "@/lib/permissions";
import {
  evaluateTripAccessWindow,
  hasPrivacyConsentTable,
  resolveBookingPhoneConsentMap,
} from "@/lib/guide-privacy";

function serialize<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

type CustomerBookingConsentRow = {
  bookingId: bigint;
  bookingCode: string;
  bookingStatus: string;
  contactName: string;
  contactPhone: string;
  adultCount: number;
  childCount: number;
  bookedAt: Date;
  departureId: bigint;
  departureCode: string;
  startDate: Date;
  endDate: Date;
  departureStatus: string;
  tourId: bigint;
  tourCode: string;
  tourName: string;
  guideName: string | null;
};

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, ["CUSTOMER"]);
  if (!auth.ok) {
    return fail(
      auth.reason === "UNAUTHORIZED"
        ? "Vui lòng đăng nhập để quản lý quyền riêng tư"
        : "Chỉ tài khoản khách hàng mới được truy cập mục này",
      auth.reason === "UNAUTHORIZED" ? 401 : 403
    );
  }

  try {
    const userId = BigInt(auth.user.userId);
    const customer = await prisma.customers.findFirst({
      where: { user_id: userId },
      select: { id: true },
    });

    if (!customer) {
      return ok(
        {
          schemaReady: await hasPrivacyConsentTable(),
          items: [],
        },
        "Lấy danh sách quyền chia sẻ dữ liệu thành công"
      );
    }

    const schemaReady = await hasPrivacyConsentTable();

    const rows = await prisma.$queryRaw<CustomerBookingConsentRow[]>`
      SELECT
        b.id AS bookingId,
        b.booking_code AS bookingCode,
        b.booking_status AS bookingStatus,
        b.contact_name AS contactName,
        b.contact_phone AS contactPhone,
        b.adult_count AS adultCount,
        b.child_count AS childCount,
        b.booked_at AS bookedAt,
        ds.id AS departureId,
        ds.departure_code AS departureCode,
        ds.start_date AS startDate,
        ds.end_date AS endDate,
        ds.booking_status AS departureStatus,
        t.id AS tourId,
        t.tour_code AS tourCode,
        t.tour_name AS tourName,
        gu.full_name AS guideName
      FROM dbo.bookings b
      INNER JOIN dbo.departure_schedules ds ON b.departure_id = ds.id
      INNER JOIN dbo.tours t ON b.tour_id = t.id
      LEFT JOIN dbo.tour_guides tg ON tg.id = ds.guide_id AND tg.status = 'ACTIVE'
      LEFT JOIN dbo.users gu ON gu.id = tg.user_id AND gu.status = 'ACTIVE'
      WHERE b.customer_id = ${customer.id}
      ORDER BY ds.start_date DESC, b.id DESC
    `;

    const consentMap = await resolveBookingPhoneConsentMap(
      rows.map((r) => ({
        bookingId: BigInt(r.bookingId),
        customerId: customer.id,
      }))
    );

    const items = rows.map((row) => {
      const bIdStr = String(row.bookingId);
      const consent = consentMap.get(bIdStr) ?? {
        phoneShared: false,
        consentStatus: schemaReady
          ? ("NOT_GRANTED" as const)
          : ("NO_CONSENT_SCHEMA" as const),
        updatedAt: null,
      };
      const windowEval = evaluateTripAccessWindow({
        startDate: row.startDate,
        endDate: row.endDate,
        bookingStatus: row.departureStatus,
      });
      const isCancelled =
        row.bookingStatus === "CANCELLED" || row.bookingStatus === "REFUNDED";

      return {
        bookingId: bIdStr,
        bookingCode: row.bookingCode,
        bookingStatus: row.bookingStatus,
        contactName: row.contactName,
        contactPhone: row.contactPhone,
        guestCount: Number(row.adultCount || 0) + Number(row.childCount || 0),
        bookedAt: row.bookedAt,
        departureId: String(row.departureId),
        departureCode: row.departureCode,
        startDate: row.startDate,
        endDate: row.endDate,
        tourId: String(row.tourId),
        tourCode: row.tourCode,
        tourName: row.tourName,
        guideName: row.guideName,
        phoneShared: consent.phoneShared,
        consentStatus: consent.consentStatus,
        consentUpdatedAt: consent.updatedAt ?? null,
        canGrantConsent: schemaReady && !isCancelled,
        canRevokeConsent: schemaReady,
        guideAccessWindowAllowed: windowEval.allowed,
        guideAccessWindowCode: windowEval.code,
        guideAccessWindowMessage: windowEval.message,
        allowedFrom: windowEval.allowedFrom,
        allowedUntil: windowEval.allowedUntil,
      };
    });

    return ok(
      serialize({
        schemaReady,
        items,
      }),
      "Lấy danh sách quyền chia sẻ dữ liệu thành công"
    );
  } catch (error) {
    console.error("GET /api/profile/privacy-consents error:", error);
    return fail("Không thể tải danh sách quyền chia sẻ dữ liệu", 500);
  }
}
