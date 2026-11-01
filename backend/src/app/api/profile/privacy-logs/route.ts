import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api-response";
import { requireRole } from "@/lib/permissions";
import { parsePositiveBigInt } from "@/lib/guide-privacy";

function serialize<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

type CustomerAccessLogRow = {
  id: bigint;
  createdAt: Date;
  accessorRole: string | null;
  accessorName: string | null;
  dataType: string;
  action: string;
  result: "ALLOWED" | "DENIED";
  reason: string | null;
  purpose: string | null;
  departureId: bigint | null;
  departureCode: string | null;
  startDate: Date | null;
  endDate: Date | null;
  bookingId: bigint | null;
  bookingCode: string | null;
  tourName: string | null;
  tourCode: string | null;
};

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, ["CUSTOMER"]);
  if (!auth.ok) {
    return fail(
      auth.reason === "UNAUTHORIZED"
        ? "Vui lòng đăng nhập để xem lịch sử truy cập dữ liệu cá nhân"
        : "Chỉ tài khoản khách hàng mới được truy cập mục này",
      auth.reason === "UNAUTHORIZED" ? 401 : 403
    );
  }

  try {
    const userId = BigInt(auth.user.userId);
    const customer = await prisma.customers.findFirst({
      where: { user_id: userId },
      select: { id: true, full_name: true, customer_code: true },
    });

    const { searchParams } = new URL(req.url);
    const resultFilter = searchParams.get("result")?.trim().toUpperCase() || "";
    const keyword = searchParams.get("q")?.trim() || "";
    const bookingIdParam = searchParams.get("bookingId");
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(
      50,
      Math.max(5, Number(searchParams.get("pageSize")) || 15)
    );
    const offset = (page - 1) * pageSize;

    let filterBookingId: bigint | null = null;
    if (bookingIdParam !== null && bookingIdParam.trim() !== "") {
      filterBookingId = parsePositiveBigInt(bookingIdParam);
      if (filterBookingId === null) {
        return fail("Tham số bookingId không hợp lệ", 400);
      }
    }

    // Ràng buộc quyền sở hữu dữ liệu chặt chẽ từ phiên đăng nhập trên Server
    const ownerCondition = customer
      ? Prisma.sql`(l.data_owner_user_id = ${userId} OR l.data_owner_customer_id = ${customer.id})`
      : Prisma.sql`(l.data_owner_user_id = ${userId})`;

    const whereParts: Prisma.Sql[] = [ownerCondition];

    if (resultFilter === "ALLOWED" || resultFilter === "DENIED") {
      whereParts.push(Prisma.sql`l.result = ${resultFilter}`);
    }

    if (filterBookingId !== null) {
      whereParts.push(Prisma.sql`l.booking_id = ${filterBookingId}`);
    }

    if (keyword) {
      const like = `%${keyword}%`;
      whereParts.push(
        Prisma.sql`(
          au.full_name LIKE ${like}
          OR b.booking_code LIKE ${like}
          OR ds.departure_code LIKE ${like}
          OR t.tour_name LIKE ${like}
          OR l.data_type LIKE ${like}
          OR l.reason LIKE ${like}
        )`
      );
    }

    const whereClause = Prisma.sql`WHERE ${Prisma.join(whereParts, " AND ")}`;
    const fromClause = Prisma.sql`
      FROM dbo.privacy_access_logs l
      LEFT JOIN dbo.users au ON au.id = l.accessor_user_id
      LEFT JOIN dbo.bookings b ON b.id = l.booking_id
      LEFT JOIN dbo.departure_schedules ds ON ds.id = COALESCE(l.departure_id, b.departure_id)
      LEFT JOIN dbo.tours t ON t.id = COALESCE(ds.tour_id, b.tour_id)
    `;

    const rows = await prisma.$queryRaw<CustomerAccessLogRow[]>`
      SELECT
        l.id,
        l.created_at AS createdAt,
        l.accessor_role AS accessorRole,
        au.full_name AS accessorName,
        l.data_type AS dataType,
        l.action AS action,
        l.result AS result,
        l.reason AS reason,
        l.purpose AS purpose,
        COALESCE(l.departure_id, b.departure_id) AS departureId,
        ds.departure_code AS departureCode,
        ds.start_date AS startDate,
        ds.end_date AS endDate,
        l.booking_id AS bookingId,
        b.booking_code AS bookingCode,
        t.tour_name AS tourName,
        t.tour_code AS tourCode
      ${fromClause}
      ${whereClause}
      ORDER BY l.created_at DESC, l.id DESC
      OFFSET ${offset} ROWS FETCH NEXT ${pageSize} ROWS ONLY
    `;

    const [{ totalCount }] = await prisma.$queryRaw<{ totalCount: number }[]>`
      SELECT COUNT(*) AS totalCount
      ${fromClause}
      ${whereClause}
    `;

    const [statsRow] = await prisma.$queryRaw<
      Array<{
        totalAccess: number;
        allowedCount: number;
        deniedCount: number;
        guideAccessCount: number;
      }>
    >`
      SELECT
        COUNT(*) AS totalAccess,
        SUM(CASE WHEN l.result = 'ALLOWED' THEN 1 ELSE 0 END) AS allowedCount,
        SUM(CASE WHEN l.result = 'DENIED' THEN 1 ELSE 0 END) AS deniedCount,
        SUM(CASE WHEN l.accessor_role = 'GUIDE' THEN 1 ELSE 0 END) AS guideAccessCount
      FROM dbo.privacy_access_logs l
      WHERE ${ownerCondition}
    `;

    // DTO allowlist tường minh: không bao giờ trả ip_address nội bộ hay ID tài khoản nội bộ của nhân sự
    const items = rows.map((row) => ({
      id: String(row.id),
      createdAt: row.createdAt,
      accessorRole: row.accessorRole,
      accessorName: row.accessorName,
      dataType: row.dataType,
      action: row.action,
      result: row.result,
      reason: row.reason,
      purpose: row.purpose,
      departureId: row.departureId ? String(row.departureId) : null,
      departureCode: row.departureCode,
      startDate: row.startDate,
      endDate: row.endDate,
      bookingId: row.bookingId ? String(row.bookingId) : null,
      bookingCode: row.bookingCode,
      tourName: row.tourName,
      tourCode: row.tourCode,
    }));

    return ok(
      serialize({
        items,
        total: Number(totalCount || 0),
        page,
        pageSize,
        stats: {
          totalAccess: Number(statsRow?.totalAccess || 0),
          allowedCount: Number(statsRow?.allowedCount || 0),
          deniedCount: Number(statsRow?.deniedCount || 0),
          guideAccessCount: Number(statsRow?.guideAccessCount || 0),
        },
      }),
      "Lấy lịch sử truy cập dữ liệu cá nhân thành công"
    );
  } catch (error) {
    console.error("GET /api/profile/privacy-logs error:", error);
    return fail("Không thể tải lịch sử truy cập dữ liệu cá nhân", 500);
  }
}

