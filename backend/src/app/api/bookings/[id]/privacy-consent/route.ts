import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api-response";
import { requireRole } from "@/lib/permissions";
import { logAudit, sanitizeForLog } from "@/lib/privacy/log";
import {
  evaluateTripAccessWindow,
  hasPrivacyConsentTable,
  parsePositiveBigInt,
  resolveBookingPhoneConsentMap,
} from "@/lib/guide-privacy";

function serialize<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

function getClientIp(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || req.headers.get("x-real-ip") || null;
  return ip ? ip.slice(0, 50) : null;
}

type BookingOwnershipRow = {
  bookingId: bigint;
  bookingCode: string;
  bookingStatus: string;
  customerId: bigint;
  departureId: bigint;
  departureCode: string;
  startDate: Date;
  endDate: Date;
  departureStatus: string;
  tourName: string;
  guideName: string | null;
};

async function findOwnedBookingOrCheckIdor(
  bookingId: bigint,
  customerId: bigint
): Promise<
  | { status: "FOUND"; booking: BookingOwnershipRow }
  | { status: "FORBIDDEN_OTHER_OWNER" }
  | { status: "NOT_FOUND" }
> {
  const rows = await prisma.$queryRaw<BookingOwnershipRow[]>`
    SELECT
      b.id AS bookingId,
      b.booking_code AS bookingCode,
      b.booking_status AS bookingStatus,
      b.customer_id AS customerId,
      ds.id AS departureId,
      ds.departure_code AS departureCode,
      ds.start_date AS startDate,
      ds.end_date AS endDate,
      ds.booking_status AS departureStatus,
      t.tour_name AS tourName,
      gu.full_name AS guideName
    FROM dbo.bookings b
    INNER JOIN dbo.departure_schedules ds ON b.departure_id = ds.id
    INNER JOIN dbo.tours t ON b.tour_id = t.id
    LEFT JOIN dbo.tour_guides tg ON tg.id = ds.guide_id AND tg.status = 'ACTIVE'
    LEFT JOIN dbo.users gu ON gu.id = tg.user_id AND gu.status = 'ACTIVE'
    WHERE b.id = ${bookingId}
  `;

  const row = rows[0];
  if (!row) {
    return { status: "NOT_FOUND" };
  }

  if (BigInt(row.customerId) !== customerId) {
    return { status: "FORBIDDEN_OTHER_OWNER" };
  }

  return { status: "FOUND", booking: row };
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(req, ["CUSTOMER"]);
  if (!auth.ok) {
    return fail(
      auth.reason === "UNAUTHORIZED"
        ? "Vui lòng đăng nhập để xem trạng thái quyền riêng tư"
        : "Chỉ tài khoản khách hàng mới được truy cập mục này",
      auth.reason === "UNAUTHORIZED" ? 401 : 403
    );
  }

  try {
    const { id } = await context.params;
    const bookingId = parsePositiveBigInt(id);
    if (!bookingId) {
      return fail("ID đơn đặt chỗ không hợp lệ", 400);
    }

    const userId = BigInt(auth.user.userId);
    const customer = await prisma.customers.findFirst({
      where: { user_id: userId },
      select: { id: true },
    });

    if (!customer) {
      return fail("Không tìm thấy hồ sơ khách hàng", 404);
    }

    const ownership = await findOwnedBookingOrCheckIdor(bookingId, customer.id);
    if (ownership.status === "NOT_FOUND") {
      return fail("Không tìm thấy đơn đặt chỗ", 404);
    }
    if (ownership.status === "FORBIDDEN_OTHER_OWNER") {
      await logAudit(req, {
        module: "PRIVACY_CONSENT",
        action: "VIEW_CONSENT_DENIED",
        entityName: "bookings",
        entityId: bookingId,
        newData: { reason: "NOT_BOOKING_OWNER" },
      });
      return fail("Bạn không có quyền truy cập đơn đặt chỗ của khách hàng khác", 403);
    }

    const schemaReady = await hasPrivacyConsentTable();
    const consentMap = await resolveBookingPhoneConsentMap([
      { bookingId, customerId: customer.id },
    ]);
    const consent = consentMap.get(String(bookingId)) ?? {
      phoneShared: false,
      consentStatus: schemaReady
        ? ("NOT_GRANTED" as const)
        : ("NO_CONSENT_SCHEMA" as const),
      updatedAt: null,
    };

    const { booking } = ownership;
    const windowEval = evaluateTripAccessWindow({
      startDate: booking.startDate,
      endDate: booking.endDate,
      bookingStatus: booking.departureStatus,
    });
    const isCancelled =
      booking.bookingStatus === "CANCELLED" ||
      booking.bookingStatus === "REFUNDED";

    return ok(
      serialize({
        schemaReady,
        bookingId: String(booking.bookingId),
        bookingCode: booking.bookingCode,
        bookingStatus: booking.bookingStatus,
        departureId: String(booking.departureId),
        departureCode: booking.departureCode,
        startDate: booking.startDate,
        endDate: booking.endDate,
        tourName: booking.tourName,
        guideName: booking.guideName,
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
      }),
      "Lấy trạng thái đồng ý chia sẻ số điện thoại thành công"
    );
  } catch (error) {
    console.error("GET /api/bookings/[id]/privacy-consent error:", error);
    return fail("Không thể lấy trạng thái quyền chia sẻ số điện thoại", 500);
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(req, ["CUSTOMER"]);
  if (!auth.ok) {
    return fail(
      auth.reason === "UNAUTHORIZED"
        ? "Vui lòng đăng nhập để cập nhật quyền riêng tư"
        : "Chỉ tài khoản khách hàng mới được cập nhật quyền chia sẻ dữ liệu",
      auth.reason === "UNAUTHORIZED" ? 401 : 403
    );
  }

  try {
    const { id } = await context.params;
    const bookingId = parsePositiveBigInt(id);
    if (!bookingId) {
      return fail("ID đơn đặt chỗ không hợp lệ", 400);
    }

    const body = await req.json().catch(() => null);
    const requestedStatus = String(body?.status || "")
      .trim()
      .toUpperCase();

    if (
      requestedStatus !== "GRANTED" &&
      requestedStatus !== "DENIED" &&
      requestedStatus !== "REVOKED"
    ) {
      return fail(
        "Trạng thái consent không hợp lệ (chỉ chấp nhận GRANTED, DENIED hoặc REVOKED)",
        400
      );
    }

    const userId = BigInt(auth.user.userId);
    const customer = await prisma.customers.findFirst({
      where: { user_id: userId },
      select: { id: true },
    });

    if (!customer) {
      return fail("Không tìm thấy hồ sơ khách hàng", 404);
    }

    const ownership = await findOwnedBookingOrCheckIdor(bookingId, customer.id);
    if (ownership.status === "NOT_FOUND") {
      return fail("Không tìm thấy đơn đặt chỗ", 404);
    }
    if (ownership.status === "FORBIDDEN_OTHER_OWNER") {
      await logAudit(req, {
        module: "PRIVACY_CONSENT",
        action: "CHANGE_CONSENT_DENIED",
        entityName: "bookings",
        entityId: bookingId,
        newData: {
          requestedStatus,
          reason: "NOT_BOOKING_OWNER",
        },
      });
      return fail("Bạn không có quyền thay đổi quyền riêng tư của đơn đặt chỗ khác", 403);
    }

    const { booking } = ownership;
    const isCancelled =
      booking.bookingStatus === "CANCELLED" ||
      booking.bookingStatus === "REFUNDED";

    if (requestedStatus === "GRANTED" && isCancelled) {
      return fail(
        "Không thể cấp quyền chia sẻ số điện thoại cho đơn đặt chỗ đã hủy hoặc hoàn tiền",
        400
      );
    }

    const schemaReady = await hasPrivacyConsentTable();
    if (!schemaReady) {
      return fail(
        "Bảng lưu trữ đồng ý quyền riêng tư (dbo.privacy_consents) chưa được khởi tạo trên cơ sở dữ liệu.",
        503
      );
    }

    const prevMap = await resolveBookingPhoneConsentMap([
      { bookingId, customerId: customer.id },
    ]);
    const previousConsent = prevMap.get(String(bookingId))?.consentStatus ?? "NOT_GRANTED";
    const ip = getClientIp(req);

    const auditAction =
      requestedStatus === "GRANTED"
        ? "GRANT_CONSENT"
        : requestedStatus === "REVOKED"
          ? "REVOKE_CONSENT"
          : "DENY_CONSENT";

    const oldDataJson = JSON.stringify(
      sanitizeForLog({
        bookingCode: booking.bookingCode,
        consentType: "SHARE_PHONE_WITH_GUIDE",
        status: previousConsent,
      })
    );

    const newDataJson = JSON.stringify(
      sanitizeForLog({
        bookingCode: booking.bookingCode,
        departureCode: booking.departureCode,
        consentType: "SHARE_PHONE_WITH_GUIDE",
        status: requestedStatus,
      })
    );

    // Thực thi MERGE consent và ghi audit_logs trong cùng 1 transaction nguyên tử (Fail-Closed):
    // Nếu bước ghi audit_logs thất bại, toàn bộ thay đổi trên dbo.privacy_consents bị rollback ngay lập tức.
    await prisma.$transaction(async (tx) => {
      const consentAffected = await tx.$executeRaw`
        MERGE dbo.privacy_consents AS target
        USING (
          SELECT
            ${bookingId} AS booking_id,
            'SHARE_PHONE_WITH_GUIDE' AS consent_type
        ) AS src
        ON target.booking_id = src.booking_id
           AND target.consent_type = src.consent_type
        WHEN MATCHED THEN
          UPDATE SET
            customer_id = ${customer.id},
            user_id = ${userId},
            departure_id = ${booking.departureId},
            status = ${requestedStatus},
            granted_at = CASE WHEN ${requestedStatus} = 'GRANTED' THEN SYSUTCDATETIME() ELSE target.granted_at END,
            revoked_at = CASE WHEN ${requestedStatus} IN ('DENIED', 'REVOKED') THEN SYSUTCDATETIME() ELSE NULL END,
            ip_address = ${ip},
            updated_at = SYSUTCDATETIME()
        WHEN NOT MATCHED THEN
          INSERT (
            customer_id,
            user_id,
            booking_id,
            departure_id,
            consent_type,
            status,
            granted_at,
            revoked_at,
            ip_address,
            created_at,
            updated_at
          )
          VALUES (
            ${customer.id},
            ${userId},
            ${bookingId},
            ${booking.departureId},
            'SHARE_PHONE_WITH_GUIDE',
            ${requestedStatus},
            CASE WHEN ${requestedStatus} = 'GRANTED' THEN SYSUTCDATETIME() ELSE NULL END,
            CASE WHEN ${requestedStatus} IN ('DENIED', 'REVOKED') THEN SYSUTCDATETIME() ELSE NULL END,
            ${ip},
            SYSUTCDATETIME(),
            SYSUTCDATETIME()
          );
      `;

      if (Number(consentAffected) <= 0) {
        throw new Error("Không thể lưu trạng thái consent vào dbo.privacy_consents");
      }

      const auditAffected = await tx.$executeRaw`
        INSERT INTO dbo.audit_logs
          (user_id, module_name, action_name, entity_name, entity_id, old_data, new_data, ip_address, created_at)
        VALUES
          (${userId}, 'PRIVACY_CONSENT', ${auditAction}, 'bookings', ${bookingId}, ${oldDataJson}, ${newDataJson}, ${ip}, SYSUTCDATETIME())
      `;

      if (Number(auditAffected) <= 0) {
        throw new Error("Không thể ghi nhận nhật ký audit_logs cho thao tác consent");
      }
    });

    const updatedMap = await resolveBookingPhoneConsentMap([
      { bookingId, customerId: customer.id },
    ]);
    const updatedConsent = updatedMap.get(String(bookingId)) ?? {
      phoneShared: requestedStatus === "GRANTED",
      consentStatus: requestedStatus as "GRANTED" | "DENIED" | "REVOKED",
      updatedAt: new Date(),
    };

    const message =
      requestedStatus === "GRANTED"
        ? `Đã cấp quyền chia sẻ số điện thoại với Hướng dẫn viên cho đơn ${booking.bookingCode}.`
        : requestedStatus === "REVOKED"
          ? `Đã thu hồi quyền chia sẻ số điện thoại với Hướng dẫn viên cho đơn ${booking.bookingCode}.`
          : `Đã từ chối chia sẻ số điện thoại với Hướng dẫn viên cho đơn ${booking.bookingCode}.`;

    return ok(
      serialize({
        schemaReady: true,
        bookingId: String(booking.bookingId),
        bookingCode: booking.bookingCode,
        departureId: String(booking.departureId),
        departureCode: booking.departureCode,
        phoneShared: updatedConsent.phoneShared,
        consentStatus: updatedConsent.consentStatus,
        consentUpdatedAt: updatedConsent.updatedAt ?? new Date(),
      }),
      message
    );
  } catch (error) {
    console.error("PATCH /api/bookings/[id]/privacy-consent error:", error);
    return fail("Không thể cập nhật quyền chia sẻ số điện thoại", 500);
  }
}
