import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/permissions";
import { sanitizeForLog, type AccessResult } from "@/lib/privacy/log";

export type TripWindowCode =
  | "ALLOWED"
  | "TRIP_NOT_YET_IN_WINDOW"
  | "TRIP_EXPIRED"
  | "TRIP_CANCELLED";

export type TripWindowEvaluation = {
  allowed: boolean;
  code: TripWindowCode;
  /** Mã lý do chuẩn tương thích với AdminPrivacyLogs của Tú */
  logReason: "TRIP_EXPIRED" | null;
  message: string;
  allowedFrom: string | null;
  allowedUntil: string | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const DAYS_BEFORE_START = 3;
const DAYS_AFTER_END = 1;
const MAX_OPERATIONAL_NOTE_LENGTH = 500;

/**
 * Trích xuất chuỗi YYYY-MM-DD từ cột DATE của SQL Server hoặc chuỗi ngày.
 */
export function extractDateYmd(
  value: Date | string | null | undefined
): string | null {
  if (!value) return null;

  if (typeof value === "string") {
    const trimmed = value.trim();
    const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  return null;
}

/**
 * Kiểm tra cửa sổ thời gian HDV được phép xem dữ liệu hành khách:
 * - Từ 00:00:00.000 (Asia/Ho_Chi_Minh, UTC+7) của 3 ngày trước start_date
 * - Đến 23:59:59.999 (Asia/Ho_Chi_Minh, UTC+7) của 1 ngày sau end_date
 * - Chặn ngay nếu chuyến đi có booking_status = 'CANCELLED' hoặc operation_status = 'CANCELLED'
 */
export function evaluateTripAccessWindow(params: {
  startDate: Date | string | null | undefined;
  endDate: Date | string | null | undefined;
  bookingStatus?: string | null;
  operationStatus?: string | null;
  now?: Date;
}): TripWindowEvaluation {
  const bookingStatus = String(params.bookingStatus || "")
    .trim()
    .toUpperCase();
  const operationStatus = String(params.operationStatus || "")
    .trim()
    .toUpperCase();

  if (bookingStatus === "CANCELLED" || operationStatus === "CANCELLED") {
    return {
      allowed: false,
      code: "TRIP_CANCELLED",
      logReason: "TRIP_EXPIRED",
      message:
        "Chuyến đi đã bị hủy nên quyền xem dữ liệu cá nhân của hành khách đã bị thu hồi.",
      allowedFrom: null,
      allowedUntil: null,
    };
  }

  const startYmd = extractDateYmd(params.startDate);
  const endYmd = extractDateYmd(params.endDate);

  if (!startYmd || !endYmd) {
    return {
      allowed: false,
      code: "TRIP_EXPIRED",
      logReason: "TRIP_EXPIRED",
      message: "Không xác định được thời gian khởi hành hợp lệ của chuyến đi.",
      allowedFrom: null,
      allowedUntil: null,
    };
  }

  // Múi giờ cố định Asia/Ho_Chi_Minh (UTC+07:00)
  const startOfStartDateVn = new Date(`${startYmd}T00:00:00.000+07:00`);
  const endOfEndDateVn = new Date(`${endYmd}T23:59:59.999+07:00`);

  if (
    Number.isNaN(startOfStartDateVn.getTime()) ||
    Number.isNaN(endOfEndDateVn.getTime())
  ) {
    return {
      allowed: false,
      code: "TRIP_EXPIRED",
      logReason: "TRIP_EXPIRED",
      message: "Thời gian chuyến đi không hợp lệ.",
      allowedFrom: null,
      allowedUntil: null,
    };
  }

  const allowedFromDate = new Date(
    startOfStartDateVn.getTime() - DAYS_BEFORE_START * DAY_MS
  );
  const allowedUntilDate = new Date(
    endOfEndDateVn.getTime() + DAYS_AFTER_END * DAY_MS
  );

  const now = params.now ?? new Date();

  if (now.getTime() < allowedFromDate.getTime()) {
    return {
      allowed: false,
      code: "TRIP_NOT_YET_IN_WINDOW",
      logReason: "TRIP_EXPIRED",
      message:
        "Chỉ được phép truy cập danh sách hành khách trong vòng 3 ngày trước ngày khởi hành.",
      allowedFrom: allowedFromDate.toISOString(),
      allowedUntil: allowedUntilDate.toISOString(),
    };
  }

  if (now.getTime() > allowedUntilDate.getTime()) {
    return {
      allowed: false,
      code: "TRIP_EXPIRED",
      logReason: "TRIP_EXPIRED",
      message:
        "Chuyến đi đã kết thúc quá 1 ngày, quyền truy cập dữ liệu hành khách đã đóng.",
      allowedFrom: allowedFromDate.toISOString(),
      allowedUntil: allowedUntilDate.toISOString(),
    };
  }

  return {
    allowed: true,
    code: "ALLOWED",
    logReason: null,
    message: "Trong thời gian được phép xem thông tin hành khách.",
    allowedFrom: allowedFromDate.toISOString(),
    allowedUntil: allowedUntilDate.toISOString(),
  };
}

/**
 * Làm sạch và giới hạn an toàn cho các ghi chú vận hành chuyến đi (không dùng cho ghi chú cá nhân của hành khách,
 * vì ghi chú cá nhân của hành khách đã bị loại bỏ hoàn toàn khỏi SQL SELECT của HDV).
 */
export function redactSensitiveNotes(
  text: string | null | undefined,
  maxLength = MAX_OPERATIONAL_NOTE_LENGTH
): string | null {
  if (!text) return null;
  let cleaned = String(text).trim();
  if (!cleaned) return null;

  // Che email
  cleaned = cleaned.replace(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    "[Email đã ẩn]"
  );

  // Che CCCD / CMND (dãy 9 đến 12 chữ số liên tiếp)
  cleaned = cleaned.replace(/\b\d{9,12}\b/g, "[Số giấy tờ đã ẩn]");

  // Che số hộ chiếu phổ biến (1-2 chữ cái đầu + 6-8 chữ số)
  cleaned = cleaned.replace(/\b[A-Z]{1,2}\d{6,8}\b/gi, "[Hộ chiếu đã ẩn]");

  // Che số điện thoại Việt Nam (0xxxxxxxxx hoặc +84xxxxxxxxx)
  cleaned = cleaned.replace(
    /(?:\+?84|0)(?:[\s.-]*\d){8,10}\b/g,
    "[SĐT đã ẩn]"
  );

  // Che ngày sinh dạng dd/mm/yyyy hoặc yyyy-mm-dd đi kèm ngữ cảnh sinh/DOB
  cleaned = cleaned.replace(
    /(?:ng[aà]y\s*sinh|sinh\s*ng[aà]y|dob|birth)\s*[:=-]?\s*\d{1,4}[/-]\d{1,2}[/-]\d{1,4}/gi,
    "[Ngày sinh đã ẩn]"
  );

  if (cleaned.length > maxLength) {
    cleaned = `${cleaned.slice(0, maxLength)}...`;
  }

  return cleaned;
}

export type ConsentStatusCode =
  | "GRANTED"
  | "DENIED"
  | "REVOKED"
  | "NOT_GRANTED"
  | "NO_CONSENT_SCHEMA";

export type CustomerConsentStatus = {
  phoneShared: boolean;
  consentStatus: ConsentStatusCode;
  updatedAt?: Date | string | null;
};

function normalizePhoneForComparison(phone?: string | null): string {
  if (!phone) return "";
  return String(phone).replace(/[\s.()-]/g, "").trim();
}

/**
 * Kiểm tra SĐT trên bản ghi booking_passengers có thuộc quyền kiểm soát hợp lệ của chủ booking hay không:
 * - Bắt buộc dòng hành khách đó phải là người liên hệ chính của đơn (isBookingContact === true)
 * - Và SĐT hành khách phải trùng khớp với SĐT liên hệ của đơn (bookingContactPhone) hoặc SĐT hồ sơ chủ đơn (customerPhone).
 * - Không tự động cho phép xem SĐT cá nhân của các hành khách khác trong đoàn; nếu chưa xác minh được quyền sở hữu SĐT thì mặc định ẩn (false).
 */
export function canSharePassengerPhoneByBookingConsent(params: {
  bookingConsentShared: boolean;
  isBookingContact?: boolean | number | null;
  passengerPhone?: string | null;
  bookingContactPhone?: string | null;
  customerPhone?: string | null;
}): boolean {
  if (!params.bookingConsentShared) return false;
  if (!params.isBookingContact) return false;

  const pPhone = normalizePhoneForComparison(params.passengerPhone);
  if (!pPhone) return false;

  const cPhone = normalizePhoneForComparison(params.bookingContactPhone);
  const ownerPhone = normalizePhoneForComparison(params.customerPhone);

  return (
    (Boolean(cPhone) && pPhone === cPhone) ||
    (Boolean(ownerPhone) && pPhone === ownerPhone)
  );
}

export async function hasPrivacyConsentTable(): Promise<boolean> {
  try {
    const columns = await prisma.$queryRaw<
      { column_name: string }[]
    >`
      SELECT COLUMN_NAME AS column_name
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'dbo'
        AND TABLE_NAME = 'privacy_consents'
        AND COLUMN_NAME IN ('booking_id', 'customer_id', 'status')
    `;
    return Array.isArray(columns) && columns.length >= 3;
  } catch {
    return false;
  }
}

/**
 * Kiểm tra quyền đồng ý chia sẻ số điện thoại theo phạm vi từng Booking + chủ sở hữu Customer.
 * - Chỉ trả phoneShared = true khi:
 *   1) Bảng dbo.privacy_consents tồn tại thật trong DB
 *   2) Có bản ghi khớp đúng booking_id VÀ customer_id của chủ đơn đặt chỗ
 *   3) Trạng thái hiện hành là GRANTED
 * - Khi Customer từ chối (DENIED), thu hồi (REVOKED) hoặc chưa cấp (NOT_GRANTED) -> phoneShared = false.
 */
export async function resolveBookingPhoneConsentMap(
  items: Array<{ bookingId: bigint; customerId: bigint }>
): Promise<Map<string, CustomerConsentStatus>> {
  const result = new Map<string, CustomerConsentStatus>();
  const ownerByBooking = new Map<string, bigint>();

  for (const item of items) {
    const bKey = item.bookingId.toString();
    ownerByBooking.set(bKey, item.customerId);
    result.set(bKey, {
      phoneShared: false,
      consentStatus: "NO_CONSENT_SCHEMA",
    });
  }

  if (ownerByBooking.size === 0) {
    return result;
  }

  try {
    const tableReady = await hasPrivacyConsentTable();
    if (!tableReady) {
      return result;
    }

    for (const bKey of ownerByBooking.keys()) {
      result.set(bKey, {
        phoneShared: false,
        consentStatus: "NOT_GRANTED",
      });
    }

    const bookingIds = Array.from(ownerByBooking.keys()).map((k) => BigInt(k));
    const rows = await prisma.$queryRaw<
      Array<{
        bookingId: bigint;
        customerId: bigint;
        status: string;
        updatedAt: Date | null;
      }>
    >`
      SELECT
        pc.booking_id AS bookingId,
        pc.customer_id AS customerId,
        pc.status AS status,
        pc.updated_at AS updatedAt
      FROM dbo.privacy_consents pc
      WHERE pc.booking_id IN (${Prisma.join(bookingIds)})
        AND pc.consent_type = 'SHARE_PHONE_WITH_GUIDE'
      ORDER BY pc.updated_at DESC, pc.id DESC
    `;

    const seenBookings = new Set<string>();
    for (const row of rows) {
      const bKey = String(row.bookingId);
      if (seenBookings.has(bKey)) continue;

      const expectedCustomer = ownerByBooking.get(bKey);
      if (!expectedCustomer || BigInt(row.customerId) !== expectedCustomer) {
        continue;
      }

      seenBookings.add(bKey);
      const normalized = String(row.status || "")
        .trim()
        .toUpperCase();

      if (normalized === "GRANTED") {
        result.set(bKey, {
          phoneShared: true,
          consentStatus: "GRANTED",
          updatedAt: row.updatedAt,
        });
      } else if (normalized === "DENIED") {
        result.set(bKey, {
          phoneShared: false,
          consentStatus: "DENIED",
          updatedAt: row.updatedAt,
        });
      } else if (normalized === "REVOKED") {
        result.set(bKey, {
          phoneShared: false,
          consentStatus: "REVOKED",
          updatedAt: row.updatedAt,
        });
      } else {
        result.set(bKey, {
          phoneShared: false,
          consentStatus: "NOT_GRANTED",
          updatedAt: row.updatedAt,
        });
      }
    }
  } catch {
    // Nếu truy vấn gặp lỗi, giữ nguyên mặc định Fail-Closed phoneShared = false
  }

  return result;
}

/**
 * Kiểm tra quyền đồng ý chia sẻ số điện thoại từ dữ liệu thực tế của Customer.
 * Tuyệt đối không tạo consent giả hoặc mặc định cho phép chia sẻ khi chưa có bản ghi đồng ý hợp lệ.
 */
export async function resolveCustomerPhoneConsentMap(
  customerIds: bigint[]
): Promise<Map<string, CustomerConsentStatus>> {
  const result = new Map<string, CustomerConsentStatus>();
  const uniqueIds = Array.from(
    new Set(customerIds.map((id) => id.toString()))
  );

  for (const idStr of uniqueIds) {
    result.set(idStr, {
      phoneShared: false,
      consentStatus: "NO_CONSENT_SCHEMA",
    });
  }

  if (uniqueIds.length === 0) {
    return result;
  }

  try {
      const tableReady = await hasPrivacyConsentTable();
      if (!tableReady) {
        return result;
      }

        for (const idStr of uniqueIds) {
          result.set(idStr, {
            phoneShared: false,
            consentStatus: "NOT_GRANTED",
          });
        }
      } catch {
        // Nếu không truy vấn được metadata, giữ nguyên mặc định an toàn phoneShared = false
      }

      return result;
    }

    function getClientIp(req: Request): string | null {
      const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
      const ip = forwarded || req.headers.get("x-real-ip") || null;
      return ip ? ip.slice(0, 50) : null;
    }

    function toBigIntOrNull(
      value: bigint | number | string | null | undefined
    ): bigint | null {
      if (value === null || value === undefined || value === "") return null;
      try {
        return BigInt(value);
      } catch {
        return null;
      }
    }

    export type GuidePrivacyLogOwner = {
      customerId?: bigint | number | string | null;
      userId?: bigint | number | string | null;
      bookingId?: bigint | number | string | null;
    };

    export type GuidePrivacyLogParams = {
      accessorUserId?: bigint | number | string | null;
      accessorRole?: string | null;
      dataType:
      | "PASSENGER_LIST"
      | "CONTACT_INFO"
      | "IDENTITY_DOC"
      | "HEALTH_NOTE"
      | string;
      action?: string;
      result: AccessResult;
      reason?:
      | "UNAUTHENTICATED"
      | "ROLE_NOT_ALLOWED"
      | "GUIDE_NOT_ASSIGNED"
      | "TRIP_EXPIRED"
      | "CUSTOMER_NOT_IN_TRIP"
      | string
      | null;
      purpose?: "TOUR_OPERATION" | string | null;
      departureId?: bigint | number | string | null;
      bookingId?: bigint | number | string | null;
      owners?: GuidePrivacyLogOwner[];
    };

    async function resolveActorForLog(
      req: Request,
      explicitUserId?: bigint | number | string | null,
      explicitRole?: string | null
    ): Promise<{ userId: bigint | null; role: string | null }> {
      const providedId = toBigIntOrNull(explicitUserId);
      if (providedId && explicitRole) {
        return { userId: providedId, role: explicitRole };
      }

      const auth = requireAuth(req);
      const userId = providedId ?? toBigIntOrNull(auth?.userId);
      if (!userId) {
        return { userId: null, role: null };
      }

      const user = await prisma.users.findUnique({
        where: { id: userId },
        select: { roles: { select: { code: true } } },
      });

      return {
        userId: user ? userId : null,
        role: user?.roles?.code ?? explicitRole ?? null,
      };
    }

    /**
     * Ghi nhật ký truy cập dữ liệu cá nhân theo cơ chế Fail-Closed (KHÔNG nuốt lỗi):
     * - Dùng đúng cấu trúc bảng privacy_access_logs của Tú.
     * - Khi gọi cho truy cập ALLOWED:
     *   + Chỉ ghi log khi thực sự có chủ dữ liệu (owners) được truy cập (không ghi log ALLOWED giả khi không có khách).
     *   + Kiểm tra số dòng INSERT thực tế (> 0); nếu INSERT thất bại hoặc không ghi được dòng nào thì ném lỗi để API chặn trả dữ liệu khách.
     */
    export async function recordGuidePrivacyAccessStrict(
      req: Request,
      params: GuidePrivacyLogParams
    ): Promise<number> {
      const actor = await resolveActorForLog(
        req,
        params.accessorUserId,
        params.accessorRole
      );
      const ip = getClientIp(req);

      if (params.result === "ALLOWED") {
        const validOwners = (params.owners ?? []).filter(
          (o) =>
            toBigIntOrNull(o.customerId) !== null ||
            toBigIntOrNull(o.userId) !== null ||
            toBigIntOrNull(o.bookingId) !== null
        );

        // Không ghi log ALLOWED giả khi chuyến đi chưa có hành khách / chủ dữ liệu nào
        if (validOwners.length === 0) {
          return 0;
        }

        const boundedOwners = validOwners.slice(0, 200);
        const customerIds = Array.from(
          new Set(
            boundedOwners
              .map((o) => toBigIntOrNull(o.customerId))
              .filter((id): id is bigint => id !== null)
          )
        );

        const customers = customerIds.length
          ? await prisma.customers.findMany({
            where: { id: { in: customerIds } },
            select: { id: true, user_id: true },
          })
          : [];

        const userOfCustomer = new Map(
          customers.map((c) => [c.id.toString(), c.user_id])
        );

        const departureId = toBigIntOrNull(params.departureId);
        const defaultBookingId = toBigIntOrNull(params.bookingId);
        const action = params.action ?? "VIEW";
        const purpose = params.purpose ?? "TOUR_OPERATION";
        const reason = params.reason ?? null;

        let insertedTotal = 0;

        for (const owner of boundedOwners) {
          const customerId = toBigIntOrNull(owner.customerId);
          const ownerUserId =
            toBigIntOrNull(owner.userId) ??
            (customerId ? userOfCustomer.get(customerId.toString()) ?? null : null);
          const bookingId = toBigIntOrNull(owner.bookingId) ?? defaultBookingId;

          const affected = await prisma.$executeRaw`
        INSERT INTO privacy_access_logs
          (accessor_user_id, accessor_role, data_owner_user_id, data_owner_customer_id,
           data_type, action, result, reason, purpose, departure_id, booking_id, ip_address, created_at)
        VALUES
          (${actor.userId}, ${actor.role}, ${ownerUserId}, ${customerId},
           ${params.dataType}, ${action}, ${params.result},
           ${reason}, ${purpose},
           (${departureId}), (${bookingId}), ${ip}, SYSUTCDATETIME())
      `;

          if (Number(affected) <= 0) {
            throw new Error(
              "Không thể ghi nhận dòng nhật ký ALLOWED vào privacy_access_logs"
            );
          }
          insertedTotal += Number(affected);
        }

        return insertedTotal;
      }

      // Trường hợp DENIED: tuyệt đối không gắn chủ dữ liệu (customerId / userId / bookingId) để không làm lộ thông tin khách hoặc chuyến của HDV khác
      const safeDepartureId =
        params.reason === "GUIDE_NOT_ASSIGNED"
          ? null
          : toBigIntOrNull(params.departureId);
      const action = params.action ?? "VIEW";
      const purpose = params.purpose ?? "TOUR_OPERATION";
      const reason = params.reason ?? null;

      const affected = await prisma.$executeRaw`
    INSERT INTO privacy_access_logs
      (accessor_user_id, accessor_role, data_owner_user_id, data_owner_customer_id,
       data_type, action, result, reason, purpose, departure_id, booking_id, ip_address, created_at)
    VALUES
      (${actor.userId}, ${actor.role}, ${null}, ${null},
       ${params.dataType}, ${action}, ${"DENIED"},
       ${reason}, ${purpose},
       (${safeDepartureId}), ${null}, ${ip}, SYSUTCDATETIME())
  `;

      return Number(affected);
    }

    /**
     * Ghi nhật ký khi truy cập bị TỪ CHỐI (DENIED).
     * - Không gắn thông tin hành khách hoặc departureId nội bộ của chuyến thuộc HDV khác.
     * - Nếu lỗi DB thì báo lỗi nội bộ ra console và trả false.
     */
    export async function recordGuidePrivacyDeniedSafe(
      req: Request,
      params: Omit<GuidePrivacyLogParams, "result" | "owners" | "bookingId">
    ): Promise<boolean> {
      try {
        await recordGuidePrivacyAccessStrict(req, {
          ...params,
          result: "DENIED",
          owners: [],
          bookingId: null,
        });
        return true;
      } catch (error) {
        console.error(
          "[guide-privacy] Lỗi nội bộ khi ghi privacy_access_logs (DENIED):",
          error
        );
        return false;
      }
    }

    export type GuideAuditLogParams = {
      actorUserId?: bigint | number | string | null;
      module: string;
      action: string;
      entityName: string;
      entityId?: bigint | number | string | null;
      oldData?: unknown;
      newData?: unknown;
    };

    function sanitizeAuditPayload(value: unknown, key = "", depth = 0): unknown {
      if (value === null || value === undefined) return value;
      if (depth > 6) return "[...]";

      // Loại bỏ hoàn toàn các trường ghi chú tự do hoặc thông tin cá nhân khỏi nội dung audit log
      if (
        /^(note|notes|description|content|summary|special_?notes|meal_?note|health_?note|room_?preference)$/i.test(
          key
        )
      ) {
        return "[REDACTED_NOTE]";
      }

      const baseSanitized = sanitizeForLog(value, key, depth);
      if (typeof baseSanitized === "string") {
        return redactSensitiveNotes(baseSanitized, 200);
      }
      if (Array.isArray(baseSanitized)) {
        return baseSanitized.map((item) =>
          sanitizeAuditPayload(item, key, depth + 1)
        );
      }
      if (baseSanitized && typeof baseSanitized === "object") {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(
          baseSanitized as Record<string, unknown>
        )) {
          if (
            /^(note|notes|description|content|summary|special_?notes|meal_?note|health_?note|room_?preference)$/i.test(
              k
            )
          ) {
            continue;
          }
          out[k] = sanitizeAuditPayload(v, k, depth + 1);
        }
        return out;
      }
      return baseSanitized;
    }

    /**
     * Ghi nhật ký thao tác của HDV vào bảng audit_logs (làm sạch dữ liệu nhạy cảm và loại bỏ ghi chú tự do).
     */
    export async function recordGuideAuditLog(
      req: Request,
      params: GuideAuditLogParams
    ): Promise<boolean> {
      try {
        const actor = await resolveActorForLog(req, params.actorUserId, "GUIDE");
        const ip = getClientIp(req);

        const isDeniedAction = params.action.endsWith("_DENIED");

        const serializedOld =
          !isDeniedAction && params.oldData !== undefined
            ? JSON.stringify(sanitizeAuditPayload(params.oldData))
            : null;
        const serializedNew =
          params.newData !== undefined
            ? JSON.stringify(sanitizeAuditPayload(params.newData))
            : null;

        // Khi thao tác bị từ chối vì không thuộc phân công, không lưu entity_id nội bộ của chuyến thuộc HDV khác
        const safeEntityId = isDeniedAction
          ? null
          : toBigIntOrNull(params.entityId);

        await prisma.audit_logs.create({
          data: {
            user_id: actor.userId,
            module_name: params.module,
            action_name: params.action,
            entity_name: params.entityName,
            entity_id: safeEntityId,
            old_data: serializedOld,
            new_data: serializedNew,
            ip_address: ip,
          },
        });
        return true;
      } catch (error) {
        console.error("[guide-privacy] Lỗi nội bộ khi ghi audit_logs:", error);
        return false;
      }
    }

    export type AssignmentCheckOutcome =
      | {
        status: "NOT_FOUND";
      }
      | {
        status: "FORBIDDEN_NOT_ASSIGNED";
        assignmentId: bigint;
        departureId: bigint;
        revokedOrUnconfirmed: boolean;
      }
      | {
        status: "ASSIGNED";
        assignmentId: bigint;
        departureId: bigint;
        guideId: bigint;
        startDate: Date | string;
        endDate: Date | string;
        bookingStatus: string;
        operationStatus: string | null;
      };

    /**
     * Kiểm tra quyền sở hữu phân công theo assignmentId (ga.id):
     * - Bắt buộc có bản ghi trong guide_assignments với ga.guide_id = @guideId.
     * - Bắt buộc lịch khởi hành departure_schedules phải có ds.guide_id IS NOT NULL VÀ ds.guide_id = ga.guide_id.
     *   (Nếu Admin/Staff thu hồi phân công bằng cách đặt ds.guide_id = NULL hoặc đổi sang HDV khác,
     *    bản ghi guide_assignments cũ sẽ bị chặn hoàn toàn).
     */
    export async function checkGuideAssignmentOwnership(
      assignmentId: bigint,
      guideId: bigint
    ): Promise<AssignmentCheckOutcome> {
      const rows = await prisma.$queryRaw<
        {
          assignmentId: bigint;
          departureId: bigint;
          assignedGuideId: bigint;
          scheduleGuideId: bigint | null;
          startDate: Date;
          endDate: Date;
          bookingStatus: string;
          operationStatus: string | null;
        }[]
      >`
    SELECT
      ga.id AS assignmentId,
      ga.departure_id AS departureId,
      ga.guide_id AS assignedGuideId,
      ds.guide_id AS scheduleGuideId,
      ds.start_date AS startDate,
      ds.end_date AS endDate,
      ds.booking_status AS bookingStatus,
      dope.operation_status AS operationStatus
    FROM guide_assignments ga
    INNER JOIN departure_schedules ds ON ga.departure_id = ds.id
    LEFT JOIN departure_operations dope ON dope.departure_id = ds.id
    WHERE ga.id = ${assignmentId}
  `;

      if (!rows.length) {
        return { status: "NOT_FOUND" };
      }

      const row = rows[0];
      const isAssignedInTable = BigInt(row.assignedGuideId) === guideId;
      const isConfirmedAndActiveOnSchedule =
        row.scheduleGuideId !== null &&
        row.scheduleGuideId !== undefined &&
        BigInt(row.scheduleGuideId) === guideId;

      if (!isAssignedInTable || !isConfirmedAndActiveOnSchedule) {
        return {
          status: "FORBIDDEN_NOT_ASSIGNED",
          assignmentId: BigInt(row.assignmentId),
          departureId: BigInt(row.departureId),
          revokedOrUnconfirmed:
            isAssignedInTable &&
            (row.scheduleGuideId === null || row.scheduleGuideId === undefined),
        };
      }

      return {
        status: "ASSIGNED",
        assignmentId: BigInt(row.assignmentId),
        departureId: BigInt(row.departureId),
        guideId,
        startDate: row.startDate,
        endDate: row.endDate,
        bookingStatus: row.bookingStatus,
        operationStatus: row.operationStatus,
      };
    }

    /**
     * Kiểm tra quyền sở hữu phân công theo departureId (ds.id):
     * - Bắt buộc có bản ghi trong guide_assignments (ga.guide_id = @guideId)
     * - Đồng thời ds.guide_id IS NOT NULL VÀ ds.guide_id = @guideId.
     */
    export async function checkGuideDepartureOwnership(
      departureId: bigint,
      guideId: bigint
    ): Promise<AssignmentCheckOutcome> {
      const rows = await prisma.$queryRaw<
        {
          departureId: bigint;
          assignmentId: bigint | null;
          assignedGuideId: bigint | null;
          scheduleGuideId: bigint | null;
          startDate: Date;
          endDate: Date;
          bookingStatus: string;
          operationStatus: string | null;
        }[]
      >`
    SELECT
      ds.id AS departureId,
      ga.id AS assignmentId,
      ga.guide_id AS assignedGuideId,
      ds.guide_id AS scheduleGuideId,
      ds.start_date AS startDate,
      ds.end_date AS endDate,
      ds.booking_status AS bookingStatus,
      dope.operation_status AS operationStatus
    FROM departure_schedules ds
    LEFT JOIN guide_assignments ga
      ON ga.departure_id = ds.id AND ga.guide_id = ${guideId}
    LEFT JOIN departure_operations dope ON dope.departure_id = ds.id
    WHERE ds.id = ${departureId}
  `;

      if (!rows.length) {
        return { status: "NOT_FOUND" };
      }

      const row = rows[0];
      const hasAssignmentRecord =
        row.assignmentId !== null &&
        row.assignedGuideId !== null &&
        BigInt(row.assignedGuideId) === guideId;
      const isConfirmedAndActiveOnSchedule =
        row.scheduleGuideId !== null &&
        row.scheduleGuideId !== undefined &&
        BigInt(row.scheduleGuideId) === guideId;

      if (!hasAssignmentRecord || !isConfirmedAndActiveOnSchedule) {
        return {
          status: "FORBIDDEN_NOT_ASSIGNED",
          assignmentId:
            row.assignmentId !== null ? BigInt(row.assignmentId) : BigInt(-1),
          departureId: BigInt(row.departureId),
          revokedOrUnconfirmed:
            hasAssignmentRecord &&
            (row.scheduleGuideId === null || row.scheduleGuideId === undefined),
        };
      }

      return {
        status: "ASSIGNED",
        assignmentId: BigInt(row.assignmentId!),
        departureId: BigInt(row.departureId),
        guideId,
        startDate: row.startDate,
        endDate: row.endDate,
        bookingStatus: row.bookingStatus,
        operationStatus: row.operationStatus,
      };
    }

    /**
     * Parse ID phân công (chấp nhận số nguyên >= 0 vì trong DB có bản ghi guide_assignments.id = 0).
     */
    export function parseAssignmentId(raw: unknown): bigint | null {
      if (raw === null || raw === undefined) return null;
      const str = String(raw).trim();
      if (!/^\d+$/.test(str)) return null;
      try {
        return BigInt(str);
      } catch {
        return null;
      }
    }

    /**
     * Parse ID dương (> 0) cho departureId, bookingId, userId.
     */
    export function parsePositiveBigInt(raw: unknown): bigint | null {
      const val = parseAssignmentId(raw);
      if (val === null || val <= BigInt(0)) return null;
      return val;
    }
