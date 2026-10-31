import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/permissions";

/**
 * Hai loại nhật ký, đều chỉ ghi thêm (trigger trong DB chặn sửa/xóa):
 *  - privacy_access_logs: ai XEM dữ liệu cá nhân của ai (ALLOWED / DENIED)
 *  - audit_logs:          ai THAY ĐỔI gì (tạo, sửa, xóa, đổi role, khóa, đăng nhập...)
 *
 * Người thao tác luôn lấy từ token + database, không lấy từ dữ liệu client gửi lên.
 * Dữ liệu ghi vào log được làm sạch: bỏ mật khẩu/token, che CCCD, hộ chiếu, SĐT, email.
 * Ghi log lỗi thì chỉ in ra console, không làm hỏng API (chấp nhận đánh đổi: ưu tiên
 * hệ thống chạy tiếp hơn là chặn người dùng vì không ghi được log).
 */

export type AccessResult = "ALLOWED" | "DENIED";
type Id = bigint | number | string | null | undefined;

export type PrivacyAccessEntry = {
  /** CUSTOMER_LIST, CUSTOMER_PROFILE, CONTACT_INFO, IDENTITY_DOC, HEALTH_NOTE, MESSAGE, STAFF_LIST, STAFF_PROFILE... */
  dataType: string;
  result: AccessResult;
  /** Lý do cho phép/từ chối, ví dụ GUIDE_NOT_ASSIGNED, TRIP_EXPIRED, ROLE_NOT_ALLOWED */
  reason?: string | null;
  /** Mục đích sử dụng, ví dụ TOUR_OPERATION, CUSTOMER_SUPPORT, ADMINISTRATION */
  purpose?: string | null;
  action?: string;
  dataOwnerUserId?: Id;
  dataOwnerCustomerId?: Id;
  departureId?: Id;
  bookingId?: Id;
};

export type AuditEntry = {
  /** CUSTOMER_MANAGEMENT, USER_MANAGEMENT, AUTH, GUIDE_TRIP... */
  module: string;
  /** CREATE, UPDATE, DELETE, CHANGE_ROLE, LOCK, UNLOCK, LOGIN_SUCCESS, LOGIN_FAILED... */
  action: string;
  entityName: string;
  entityId?: Id;
  oldData?: unknown;
  newData?: unknown;
  /** Chỉ dùng khi chưa có token (đăng nhập): người thao tác đã được xác minh bằng mật khẩu */
  actorUserId?: Id;
};

function toBigInt(value: Id): bigint | null {
  if (value === null || value === undefined || value === "") return null;
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

// Lưu ý: IP lấy từ header có thể bị giả mạo nếu không đứng sau proxy tin cậy.
function getClientIp(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || req.headers.get("x-real-ip") || null;
  return ip ? ip.slice(0, 50) : null;
}

async function resolveActor(req: Request) {
  const auth = requireAuth(req);
  const userId = toBigInt(auth?.userId);
  if (!userId) return { userId: null, role: null };

  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: { roles: { select: { code: true } } },
  });

  return user
    ? { userId, role: user.roles?.code ?? null }
    : { userId: null, role: null };
}

const DROP_KEY = /pass(word)?|hash|token|secret|otp/i;
const ID_DOC_KEY = /id_?number|passport|cccd|citizen/i;

function maskTail(value: string, keep = 3) {
  return "*".repeat(Math.max(value.length - keep, 0)) + value.slice(-keep);
}

function maskPhone(value: string) {
  if (value.length <= 5) return maskTail(value, 2);
  return value.slice(0, 2) + "*".repeat(value.length - 5) + value.slice(-3);
}

function maskEmail(value: string) {
  const [local, domain] = value.split("@");
  if (!domain) return maskTail(value, 2);
  return `${local.slice(0, 2)}***@${domain}`;
}

/** Làm sạch dữ liệu trước khi ghi log: bỏ trường bí mật, che dữ liệu định danh. */
export function sanitizeForLog(value: unknown, key = "", depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (depth > 6) return "[...]";
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();

  if (typeof value === "string") {
    if (ID_DOC_KEY.test(key)) return maskTail(value);
    if (/phone/i.test(key)) return maskPhone(value);
    if (/email/i.test(key)) return maskEmail(value);
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForLog(item, key, depth + 1));
  }

  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (DROP_KEY.test(k)) continue;
      out[k] = sanitizeForLog(v, k, depth + 1);
    }
    return out;
  }

  return value;
}

function toJson(value: unknown) {
  if (value === undefined) return null;
  return JSON.stringify(sanitizeForLog(value));
}

type Owner = { customerId?: Id; userId?: Id };
type Actor = Awaited<ReturnType<typeof resolveActor>>;

async function insertAccessRow(
  actor: Actor,
  ip: string | null,
  entry: PrivacyAccessEntry,
  ownerUserId: bigint | null,
  customerId: bigint | null
) {
  // created_at lưu theo giờ UTC (SYSUTCDATETIME) giống Prisma, để giao diện đổi sang giờ Việt Nam đúng
  await prisma.$executeRaw`
    INSERT INTO privacy_access_logs
      (accessor_user_id, accessor_role, data_owner_user_id, data_owner_customer_id,
       data_type, action, result, reason, purpose, departure_id, booking_id, ip_address, created_at)
    VALUES
      (${actor.userId}, ${actor.role}, ${ownerUserId}, ${customerId},
       ${entry.dataType}, ${entry.action ?? "VIEW"}, ${entry.result},
       ${entry.reason ?? null}, ${entry.purpose ?? null},
       ${toBigInt(entry.departureId)}, ${toBigInt(entry.bookingId)}, ${ip}, SYSUTCDATETIME())
  `;
}

/** Ghi 1 dòng vào privacy_access_logs (ai xem dữ liệu cá nhân của ai). */
export async function logPrivacyAccess(req: Request, entry: PrivacyAccessEntry) {
  await logPrivacyAccessMany(req, entry, [
    { customerId: entry.dataOwnerCustomerId, userId: entry.dataOwnerUserId },
  ]);
}

/**
 * Ghi mỗi chủ dữ liệu 1 dòng (ví dụ Admin mở danh sách 10 khách -> 10 dòng),
 * để từng khách biết chính xác ai đã xem dữ liệu của mình.
 */
export async function logPrivacyAccessMany(
  req: Request,
  entry: PrivacyAccessEntry,
  owners: Owner[]
) {
  try {
    const actor = await resolveActor(req);
    const ip = getClientIp(req);
    const rows = owners.length ? owners.slice(0, 200) : [{}];

    const customerIds = rows
      .map((owner) => toBigInt(owner.customerId))
      .filter((id): id is bigint => id !== null);
    const customers = customerIds.length
      ? await prisma.customers.findMany({
          where: { id: { in: customerIds } },
          select: { id: true, user_id: true },
        })
      : [];
    const userOfCustomer = new Map(customers.map((c) => [c.id.toString(), c.user_id]));

    for (const owner of rows) {
      const customerId = toBigInt(owner.customerId);
      const ownerUserId =
        toBigInt(owner.userId) ??
        (customerId ? userOfCustomer.get(customerId.toString()) ?? null : null);
      await insertAccessRow(actor, ip, entry, ownerUserId, customerId);
    }
  } catch (error) {
    console.error("[privacy-log] Không ghi được privacy_access_logs:", error);
  }
}

/** Lấy mảng bản ghi từ body JSON của API danh sách. */
function listFromBody(body: unknown): Record<string, unknown>[] {
  const data = (body as { data?: unknown } | undefined)?.data;
  if (Array.isArray(data)) return data;
  for (const key of ["items", "customers", "users", "data", "rows"]) {
    const value = (data as Record<string, unknown> | undefined)?.[key];
    if (Array.isArray(value)) return value as Record<string, unknown>[];
  }
  return [];
}

/** Ghi 1 dòng vào audit_logs (ai thay đổi gì). */
export async function logAudit(req: Request, entry: AuditEntry) {
  try {
    const actorUserId =
      entry.actorUserId !== undefined
        ? toBigInt(entry.actorUserId)
        : (await resolveActor(req)).userId;

    await prisma.audit_logs.create({
      data: {
        user_id: actorUserId,
        module_name: entry.module,
        action_name: entry.action,
        entity_name: entry.entityName,
        entity_id: toBigInt(entry.entityId),
        old_data: toJson(entry.oldData),
        new_data: toJson(entry.newData),
        ip_address: getClientIp(req),
      },
    });
  } catch (error) {
    console.error("[audit-log] Không ghi được audit_logs:", error);
  }
}

type RouteHandler<R extends Request, C> = (req: R, ctx: C) => Promise<Response>;

function deniedReason(status: number) {
  return status === 401 ? "UNAUTHENTICATED" : "ROLE_NOT_ALLOWED";
}

async function safely<T>(fn: () => T | Promise<T>): Promise<T | undefined> {
  try {
    return await fn();
  } catch {
    return undefined;
  }
}

/** Lấy [id] từ URL của route động. */
export async function paramId(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  return (await ctx.params).id;
}

/**
 * Bọc một API "xem dữ liệu cá nhân": thành công -> ALLOWED, bị 401/403 -> DENIED.
 */
export function withPrivacyAccessLog<R extends Request, C>(
  handler: RouteHandler<R, C>,
  options: {
    dataType: string;
    purpose?: string;
    owner?: (req: R, ctx: C) => Promise<Owner>;
    /** API danh sách: ghi mỗi bản ghi trả về 1 dòng (id là id khách hàng hoặc id tài khoản) */
    listOwners?: "customer" | "user";
  }
): RouteHandler<R, C> {
  return async (req, ctx) => {
    const res = await handler(req, ctx);
    const denied = res.status === 401 || res.status === 403;
    if (!res.ok && !denied) return res;

    const entry: PrivacyAccessEntry = {
      dataType: options.dataType,
      purpose: options.purpose,
      result: res.ok ? "ALLOWED" : "DENIED",
      reason: denied ? deniedReason(res.status) : null,
    };

    if (res.ok && options.listOwners) {
      const body = await safely(() => res.clone().json());
      const owners = listFromBody(body)
        .filter((item) => item?.id !== undefined && item?.id !== null)
        .map((item) =>
          options.listOwners === "customer"
            ? { customerId: item.id as Id }
            : { userId: item.id as Id }
        );
      if (owners.length) await logPrivacyAccessMany(req, entry, owners);
      return res;
    }

    const owner = options.owner ? await safely(() => options.owner!(req, ctx)) : undefined;
    await logPrivacyAccessMany(req, entry, owner ? [owner] : []);
    return res;
  };
}

/**
 * Bọc một API "thay đổi dữ liệu": chụp dữ liệu trước/sau và ghi audit_logs.
 * Thao tác bị từ chối (401/403) cũng được ghi với hậu tố _DENIED.
 */
export function withAuditLog<R extends Request, C>(
  handler: RouteHandler<R, C>,
  options: {
    module: string;
    entityName: string;
    action: string | ((before: unknown, after: unknown) => string);
    getId?: (req: R, ctx: C) => Promise<string | undefined>;
    load?: (id: string) => Promise<unknown>;
  }
): RouteHandler<R, C> {
  return async (req, ctx) => {
    const id = options.getId ? await safely(() => options.getId!(req, ctx)) : undefined;
    const before = id && options.load ? await safely(() => options.load!(id)) : undefined;

    const res = await handler(req, ctx);
    const baseAction =
      typeof options.action === "string" ? options.action : null;

    if (res.status === 401 || res.status === 403) {
      await logAudit(req, {
        module: options.module,
        action: `${baseAction ?? "CHANGE"}_DENIED`,
        entityName: options.entityName,
        entityId: id,
        newData: { reason: deniedReason(res.status) },
      });
      return res;
    }

    if (!res.ok) return res;

    let entityId = id;
    if (!entityId) {
      const body = await safely(() => res.clone().json());
      const created = (body as { data?: { id?: unknown } } | undefined)?.data?.id;
      entityId = created !== undefined && created !== null ? String(created) : undefined;
    }

    const after =
      entityId && options.load ? await safely(() => options.load!(entityId!)) : undefined;
    const action =
      typeof options.action === "function"
        ? options.action(before, after)
        : options.action;

    await logAudit(req, {
      module: options.module,
      action,
      entityName: options.entityName,
      entityId,
      oldData: before ?? undefined,
      newData: after ?? undefined,
    });

    return res;
  };
}
