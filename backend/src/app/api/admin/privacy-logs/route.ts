import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api-response";
import { requireRole } from "@/lib/permissions";
import { logAudit, maskEmail, maskPhone } from "@/lib/privacy/log";

// Chỉ có GET: nhật ký chỉ được đọc, không có API sửa hay xóa.

const SENSITIVE_ACTIONS = ["CHANGE_ROLE", "LOCK", "UNLOCK", "DELETE", "REFUND_BOOKING"];

type Row = Record<string, unknown>;

type OwnerInfo = {
  name: string;
  type: string;
  code: string | null;
  phone: string | null;
  email: string | null;
};

function serialize<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

function parseDate(value: string | null, endOfDay = false) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  if (endOfDay) date.setDate(date.getDate() + 1);
  return date;
}

function whereSql(parts: Prisma.Sql[]) {
  return parts.length ? Prisma.sql`WHERE ${Prisma.join(parts, " AND ")}` : Prisma.empty;
}

/**
 * Lấy thông tin chủ dữ liệu cho các dòng nhật ký đang hiển thị.
 * Che SĐT, email ngay tại server: trang nhật ký chỉ cần nhận ra đúng người,
 * không cần (và không được) thấy đầy đủ thông tin liên lạc.
 */
async function loadOwners(customerIds: bigint[], userIds: bigint[]) {
  const byCustomer = new Map<string, OwnerInfo>();
  const byUser = new Map<string, OwnerInfo>();

  if (customerIds.length) {
    const customers = await prisma.customers.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, full_name: true, customer_code: true, phone: true, email: true },
    });
    for (const c of customers) {
      byCustomer.set(String(c.id), {
        name: c.full_name,
        type: "Khách hàng",
        code: c.customer_code,
        phone: c.phone ? maskPhone(c.phone) : null,
        email: c.email ? maskEmail(c.email) : null,
      });
    }
  }

  if (userIds.length) {
    const users = await prisma.users.findMany({
      where: { id: { in: userIds } },
      select: { id: true, full_name: true, phone: true, email: true, roles: { select: { code: true } } },
    });
    for (const u of users) {
      byUser.set(String(u.id), {
        name: u.full_name,
        type: u.roles?.code ?? "",
        code: null,
        phone: u.phone ? maskPhone(u.phone) : null,
        email: u.email ? maskEmail(u.email) : null,
      });
    }
  }

  return { byCustomer, byUser };
}

export async function GET(req: Request) {
  const auth = await requireRole(req, ["ADMIN"]);
  if (!auth.ok) {
    return fail(
      auth.reason === "UNAUTHORIZED" ? "Chưa đăng nhập" : "Không có quyền",
      auth.reason === "UNAUTHORIZED" ? 401 : 403
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") === "audit" ? "audit" : "access";
    const keyword = searchParams.get("q")?.trim() || "";
    const result = searchParams.get("result")?.trim() || "";
    const action = searchParams.get("action")?.trim() || "";
    const role = searchParams.get("role")?.trim() || "";
    const from = parseDate(searchParams.get("from"));
    const to = parseDate(searchParams.get("to"), true);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(5, Number(searchParams.get("pageSize")) || 20));
    const offset = (page - 1) * pageSize;
    const like = `%${keyword}%`;
    const validRole = ["ADMIN", "STAFF", "GUIDE", "CUSTOMER"].includes(role) ? role : "";

    let items: Row[] = [];
    let total = 0;

    if (type === "access") {
      const parts: Prisma.Sql[] = [];
      if (result === "ALLOWED" || result === "DENIED") parts.push(Prisma.sql`l.result = ${result}`);
      if (validRole) parts.push(Prisma.sql`l.accessor_role = ${validRole}`);
      if (from) parts.push(Prisma.sql`l.created_at >= ${from}`);
      if (to) parts.push(Prisma.sql`l.created_at < ${to}`);
      if (keyword) {
        parts.push(
          Prisma.sql`(au.full_name LIKE ${like} OR ou.full_name LIKE ${like} OR oc.full_name LIKE ${like})`
        );
      }

      // Một lần mở danh sách ghi mỗi người 1 dòng (để từng khách biết ai đã xem mình).
      // Trên trang Admin, gộp các dòng cùng người xem, cùng loại dữ liệu, cùng giây thành 1 lượt.
      const grouped = Prisma.sql`
        SELECT MIN(l.id) AS id, MAX(l.created_at) AS createdAt,
               l.accessor_user_id AS accessorUserId, l.accessor_role AS accessorRole,
               l.data_type AS dataType, l.result, l.reason, l.purpose, l.departure_id AS departureId,
               STRING_AGG(CONCAT(ISNULL(CAST(l.data_owner_customer_id AS varchar(20)), ''), ':',
                                 ISNULL(CAST(l.data_owner_user_id AS varchar(20)), '')), ',') AS ownerKeys
        FROM privacy_access_logs l
        LEFT JOIN users au ON au.id = l.accessor_user_id
        LEFT JOIN users ou ON ou.id = l.data_owner_user_id
        LEFT JOIN customers oc ON oc.id = l.data_owner_customer_id
        ${whereSql(parts)}
        GROUP BY l.accessor_user_id, l.accessor_role, l.data_type, l.result, l.reason, l.purpose,
                 l.departure_id, DATEADD(second, DATEDIFF(second, '2020-01-01', l.created_at), CAST('2020-01-01' AS datetime2))`;

      const rows = await prisma.$queryRaw<Row[]>`
        SELECT g.*, au.full_name AS accessorName, t.tour_name AS tourName, ds.departure_code AS departureCode
        FROM (${grouped}) g
        LEFT JOIN users au ON au.id = g.accessorUserId
        LEFT JOIN departure_schedules ds ON ds.id = g.departureId
        LEFT JOIN tours t ON t.id = ds.tour_id
        ORDER BY g.createdAt DESC, g.id DESC
        OFFSET ${offset} ROWS FETCH NEXT ${pageSize} ROWS ONLY`;

      const [{ count }] = await prisma.$queryRaw<{ count: number }[]>`
        SELECT COUNT(*) AS count FROM (${grouped}) g`;
      total = Number(count);

      const keysOf = (row: Row) =>
        Array.from(new Set(String(row.ownerKeys ?? "").split(",").filter((k) => k && k !== ":")));

      const customerIds = new Set<bigint>();
      const userIds = new Set<bigint>();
      for (const row of rows) {
        for (const key of keysOf(row)) {
          const [customerId, userId] = key.split(":");
          if (customerId) customerIds.add(BigInt(customerId));
          else if (userId) userIds.add(BigInt(userId));
        }
      }

      const { byCustomer, byUser } = await loadOwners([...customerIds], [...userIds]);

      items = rows.map((row) => {
        const owners: OwnerInfo[] = [];
        const seen = new Set<string>();
        for (const key of keysOf(row)) {
          const [customerId, userId] = key.split(":");
          const owner = customerId ? byCustomer.get(customerId) : userId ? byUser.get(userId) : undefined;
          const id = customerId ? `c${customerId}` : `u${userId}`;
          if (owner && !seen.has(id)) {
            seen.add(id);
            owners.push(owner);
          }
        }
        const { ownerKeys: _ownerKeys, ...rest } = row;
        return { ...rest, owners, ownerCount: owners.length };
      });
    } else {
      const parts: Prisma.Sql[] = [];
      if (action === "SENSITIVE") {
        parts.push(
          Prisma.sql`(a.action_name IN (${Prisma.join(SENSITIVE_ACTIONS)}) OR a.action_name LIKE ${"%_DENIED"})`
        );
      } else if (action) {
        parts.push(Prisma.sql`a.action_name = ${action}`);
      }
      if (validRole) parts.push(Prisma.sql`r.code = ${validRole}`);
      if (from) parts.push(Prisma.sql`a.created_at >= ${from}`);
      if (to) parts.push(Prisma.sql`a.created_at < ${to}`);
      if (keyword) {
        parts.push(
          Prisma.sql`(u.full_name LIKE ${like} OR eu.full_name LIKE ${like} OR ec.full_name LIKE ${like} OR ebc.full_name LIKE ${like})`
        );
      }
      const from_ = Prisma.sql`
        FROM audit_logs a
        LEFT JOIN users u ON u.id = a.user_id
        LEFT JOIN roles r ON r.id = u.role_id
        LEFT JOIN users eu ON a.entity_name = 'users' AND eu.id = a.entity_id
        LEFT JOIN customers ec ON a.entity_name IN ('customers', 'customer_messages') AND ec.id = a.entity_id
        LEFT JOIN bookings eb ON a.entity_name = 'bookings' AND eb.id = a.entity_id
        LEFT JOIN customers ebc ON ebc.id = eb.customer_id
        LEFT JOIN departure_schedules eds ON a.entity_name = 'departure_schedules' AND eds.id = a.entity_id
        LEFT JOIN tours et ON et.id = eds.tour_id`;
      const where = whereSql(parts);

      items = await prisma.$queryRaw<Row[]>`
        SELECT a.id, a.created_at AS createdAt, a.user_id AS actorUserId,
               u.full_name AS actorName, r.code AS actorRole,
               a.module_name AS module, a.action_name AS action,
               a.entity_name AS entityName, a.entity_id AS entityId,
               COALESCE(eu.full_name, ec.full_name,
                 CASE WHEN eb.id IS NOT NULL THEN CONCAT(eb.booking_code, N' của ', ebc.full_name) END,
                 CASE WHEN eds.id IS NOT NULL THEN CONCAT(et.tour_name, N' (', eds.departure_code, N')') END
               ) AS entityLabel,
               a.old_data AS oldData, a.new_data AS newData
        ${from_} ${where}
        ORDER BY a.created_at DESC, a.id DESC
        OFFSET ${offset} ROWS FETCH NEXT ${pageSize} ROWS ONLY`;
      const [{ count }] = await prisma.$queryRaw<{ count: number }[]>`
        SELECT COUNT(*) AS count ${from_} ${where}`;
      total = Number(count);
    }

    const [stats] = await prisma.$queryRaw<
      { accessTotal: number; denied: number; sensitive: number; loginFailed: number }[]
    >`
      SELECT
        (SELECT COUNT(*) FROM privacy_access_logs) AS accessTotal,
        (SELECT COUNT(*) FROM privacy_access_logs WHERE result = 'DENIED') AS denied,
        (SELECT COUNT(*) FROM audit_logs
           WHERE action_name IN (${Prisma.join(SENSITIVE_ACTIONS)}) OR action_name LIKE ${"%_DENIED"}) AS sensitive,
        (SELECT COUNT(*) FROM audit_logs
           WHERE action_name IN ('LOGIN_FAILED', 'LOGIN_BLOCKED')) AS loginFailed`;

    // Cảnh báo bất thường trong 24 giờ gần nhất
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const deniedBursts = await prisma.$queryRaw<{ userId: bigint; name: string | null; count: number }[]>`
      SELECT l.accessor_user_id AS userId, u.full_name AS name, COUNT(*) AS count
      FROM privacy_access_logs l LEFT JOIN users u ON u.id = l.accessor_user_id
      WHERE l.result = 'DENIED' AND l.created_at >= ${since} AND l.accessor_user_id IS NOT NULL
      GROUP BY l.accessor_user_id, u.full_name
      HAVING COUNT(*) >= 3`;
    const loginBursts = await prisma.$queryRaw<{ userId: bigint; name: string | null; count: number }[]>`
      SELECT a.user_id AS userId, u.full_name AS name, COUNT(*) AS count
      FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id
      WHERE a.action_name = 'LOGIN_FAILED' AND a.created_at >= ${since} AND a.user_id IS NOT NULL
      GROUP BY a.user_id, u.full_name
      HAVING COUNT(*) >= 5`;
    const roleChanges = await prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*) AS count FROM audit_logs
      WHERE action_name = 'CHANGE_ROLE' AND created_at >= ${since}`;

    const alerts = [
      ...deniedBursts.map((row) => ({
        level: "danger",
        message: `${row.name || "Người dùng #" + row.userId} bị chặn khi truy cập dữ liệu khách ${row.count} lần trong 24 giờ`,
      })),
      ...loginBursts.map((row) => ({
        level: "danger",
        message: `${row.name || "Tài khoản #" + row.userId} đăng nhập sai ${row.count} lần trong 24 giờ`,
      })),
      ...(Number(roleChanges[0]?.count) > 0
        ? [{ level: "warning", message: `Có ${roleChanges[0].count} lần đổi vai trò tài khoản trong 24 giờ` }]
        : []),
    ];

    // Việc Admin đọc nhật ký cũng được ghi lại. Server tự giới hạn 1 lần / 5 phút / người
    // (trang tự làm mới mỗi 10 giây), không cho client tự xin bỏ qua việc ghi.
    const recentView = await prisma.audit_logs.findFirst({
      where: {
        user_id: BigInt(auth.user.userId),
        action_name: "VIEW_LOGS",
        created_at: { gte: new Date(Date.now() - 5 * 60 * 1000) },
      },
      select: { id: true },
    });

    if (page === 1 && !recentView) {
      await logAudit(req, {
        module: "PRIVACY_LOG",
        action: "VIEW_LOGS",
        entityName: type === "access" ? "privacy_access_logs" : "audit_logs",
        newData: { q: keyword || undefined, result: result || undefined, action: action || undefined },
      });
    }

    return ok(
      serialize({
        type,
        items,
        total,
        page,
        pageSize,
        stats: {
          accessTotal: Number(stats.accessTotal),
          denied: Number(stats.denied),
          sensitive: Number(stats.sensitive),
          loginFailed: Number(stats.loginFailed),
        },
        alerts,
      }),
      "Lấy nhật ký thành công"
    );
  } catch (error) {
    console.error("GET /api/admin/privacy-logs error:", error);
    return fail("Không thể lấy nhật ký", 500);
  }
}
