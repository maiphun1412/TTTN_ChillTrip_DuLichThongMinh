import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api-response";
import { requireRole } from "@/lib/permissions";
import { logAudit } from "@/lib/privacy/log";

// Chỉ có GET: nhật ký chỉ được đọc, không có API sửa hay xóa.

const SENSITIVE_ACTIONS = ["CHANGE_ROLE", "LOCK", "UNLOCK", "DELETE"];

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
    const from = parseDate(searchParams.get("from"));
    const to = parseDate(searchParams.get("to"), true);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(5, Number(searchParams.get("pageSize")) || 20));
    const offset = (page - 1) * pageSize;
    const like = `%${keyword}%`;

    let items: unknown[] = [];
    let total = 0;

    if (type === "access") {
      const parts: Prisma.Sql[] = [];
      if (result === "ALLOWED" || result === "DENIED") parts.push(Prisma.sql`l.result = ${result}`);
      if (from) parts.push(Prisma.sql`l.created_at >= ${from}`);
      if (to) parts.push(Prisma.sql`l.created_at < ${to}`);
      if (keyword) {
        parts.push(
          Prisma.sql`(au.full_name LIKE ${like} OR ou.full_name LIKE ${like} OR oc.full_name LIKE ${like} OR l.data_type LIKE ${like} OR l.reason LIKE ${like})`
        );
      }
      const where = whereSql(parts);
      const from_ = Prisma.sql`
        FROM privacy_access_logs l
        LEFT JOIN users au ON au.id = l.accessor_user_id
        LEFT JOIN users ou ON ou.id = l.data_owner_user_id
        LEFT JOIN customers oc ON oc.id = l.data_owner_customer_id`;

      items = await prisma.$queryRaw`
        SELECT l.id, l.created_at AS createdAt, l.accessor_user_id AS accessorUserId,
               au.full_name AS accessorName, l.accessor_role AS accessorRole,
               l.data_owner_user_id AS ownerUserId,
               COALESCE(oc.full_name, ou.full_name) AS ownerName,
               l.data_type AS dataType, l.action, l.result, l.reason, l.purpose,
               l.departure_id AS departureId, l.ip_address AS ipAddress
        ${from_} ${where}
        ORDER BY l.created_at DESC, l.id DESC
        OFFSET ${offset} ROWS FETCH NEXT ${pageSize} ROWS ONLY`;
      const [{ count }] = await prisma.$queryRaw<{ count: number }[]>`
        SELECT COUNT(*) AS count ${from_} ${where}`;
      total = Number(count);
    } else {
      const parts: Prisma.Sql[] = [];
      if (action === "SENSITIVE") {
        parts.push(
          Prisma.sql`(a.action_name IN (${Prisma.join(SENSITIVE_ACTIONS)}) OR a.action_name LIKE ${"%_DENIED"})`
        );
      } else if (action) {
        parts.push(Prisma.sql`a.action_name = ${action}`);
      }
      if (from) parts.push(Prisma.sql`a.created_at >= ${from}`);
      if (to) parts.push(Prisma.sql`a.created_at < ${to}`);
      if (keyword) {
        parts.push(
          Prisma.sql`(u.full_name LIKE ${like} OR a.module_name LIKE ${like} OR a.action_name LIKE ${like} OR a.entity_name LIKE ${like})`
        );
      }
      const where = whereSql(parts);
      const from_ = Prisma.sql`
        FROM audit_logs a
        LEFT JOIN users u ON u.id = a.user_id
        LEFT JOIN roles r ON r.id = u.role_id
        LEFT JOIN users eu ON a.entity_name = 'users' AND eu.id = a.entity_id
        LEFT JOIN customers ec ON a.entity_name IN ('customers', 'customer_messages') AND ec.id = a.entity_id`;

      items = await prisma.$queryRaw`
        SELECT a.id, a.created_at AS createdAt, a.user_id AS actorUserId,
               u.full_name AS actorName, r.code AS actorRole,
               a.module_name AS module, a.action_name AS action,
               a.entity_name AS entityName, a.entity_id AS entityId,
               COALESCE(eu.full_name, ec.full_name) AS entityLabel,
               a.old_data AS oldData, a.new_data AS newData, a.ip_address AS ipAddress
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
        message: `${row.name || "Người dùng #" + row.userId} bị từ chối truy cập dữ liệu khách ${row.count} lần trong 24 giờ`,
      })),
      ...loginBursts.map((row) => ({
        level: "danger",
        message: `${row.name || "Tài khoản #" + row.userId} đăng nhập sai ${row.count} lần trong 24 giờ`,
      })),
      ...(Number(roleChanges[0]?.count) > 0
        ? [{ level: "warning", message: `Có ${roleChanges[0].count} lần đổi quyền tài khoản trong 24 giờ` }]
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
