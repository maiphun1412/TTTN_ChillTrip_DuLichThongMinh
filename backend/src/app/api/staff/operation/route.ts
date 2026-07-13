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
        { success: false, message: "Bạn không có quyền xem vận hành tour" },
        { status: 403 }
      ),
      user: null,
    };
  }

  return { error: null, user };
}

function calculateReadyPercent(item: any) {
  let percent = 20;

  if (item.guideName) percent += 20;
  if (toNumber(item.bookedSeats) > 0) percent += 20;
  if (toNumber(item.pickupCount) > 0) percent += 20;
  if (item.operationStatus && item.operationStatus !== "PREPARING") percent += 20;

  return Math.min(percent, 100);
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getCurrentStaff(request);
    if (auth.error) return auth.error;

    const summaryRows = await prisma.$queryRaw<any[]>`
      SELECT
        (
          SELECT COUNT(*)
          FROM bookings
          WHERE booking_status = 'PENDING'
        )
        +
        (
          SELECT COUNT(*)
          FROM email_logs
          WHERE send_status = 'PENDING'
        )
        +
        (
          SELECT COUNT(*)
          FROM passenger_documents
          WHERE status = 'PENDING'
        )
        +
        (
          SELECT COUNT(*)
          FROM departure_operations
          WHERE operation_status IN ('PREPARING', 'PROCESSING')
        ) AS todayTasks,

        (
          SELECT COUNT(*)
          FROM departure_schedules
          WHERE start_date >= CAST(GETDATE() AS DATE)
            AND start_date <= DATEADD(DAY, 1, CAST(GETDATE() AS DATE))
        ) AS upcomingTours,

        (
          SELECT COUNT(*)
          FROM cancellation_requests
          WHERE request_status = 'PENDING'
        ) AS supportRequests,

        (
          SELECT COUNT(*)
          FROM email_logs
          WHERE send_status = 'PENDING'
        ) AS pendingEmails,

        (
          SELECT COUNT(*)
          FROM passenger_documents
          WHERE status = 'PENDING'
        )
        +
        (
          SELECT COUNT(*)
          FROM cancellation_requests
          WHERE request_status = 'PENDING'
        ) AS urgentTasks
    `;

    const taskRows = await prisma.$queryRaw<any[]>`
      SELECT TOP 80 *
      FROM (
        SELECT
          CAST(b.id AS VARCHAR(50)) AS id,
          'BOOKING_CONFIRM' AS taskType,
          CAST(b.id AS VARCHAR(50)) AS refId,
          N'Xác nhận booking mới' AS title,
          t.tour_name AS tourName,
          c.full_name AS customerName,
          b.booked_at AS deadline,
          N'Cần xử lý' AS status,
          1 AS priority,
          'BOOKING' AS icon
        FROM bookings b
        INNER JOIN tours t ON t.id = b.tour_id
        INNER JOIN customers c ON c.id = b.customer_id
        WHERE b.booking_status = 'PENDING'

        UNION ALL

        SELECT
          CAST(e.id AS VARCHAR(50)) AS id,
          'EMAIL_RESEND' AS taskType,
          CAST(e.id AS VARCHAR(50)) AS refId,
          N'Gửi lại email cho khách hàng' AS title,
          t.tour_name AS tourName,
          c.full_name AS customerName,
          e.created_at AS deadline,
          N'Chờ gửi' AS status,
          2 AS priority,
          'MAIL' AS icon
        FROM email_logs e
        LEFT JOIN bookings b ON b.id = e.booking_id
        LEFT JOIN tours t ON t.id = b.tour_id
        LEFT JOIN customers c ON c.id = e.customer_id
        WHERE e.send_status = 'PENDING'

        UNION ALL

        SELECT
          CAST(pd.id AS VARCHAR(50)) AS id,
          'DOCUMENT_CHECK' AS taskType,
          CAST(pd.id AS VARCHAR(50)) AS refId,
          N'Kiểm tra hồ sơ hành khách' AS title,
          t.tour_name AS tourName,
          bp.full_name AS customerName,
          GETDATE() AS deadline,
          N'Cần kiểm tra' AS status,
          1 AS priority,
          'DOC' AS icon
        FROM passenger_documents pd
        INNER JOIN booking_passengers bp ON bp.id = pd.booking_passenger_id
        INNER JOIN bookings b ON b.id = bp.booking_id
        INNER JOIN tours t ON t.id = b.tour_id
        WHERE pd.status = 'PENDING'

        UNION ALL

        SELECT
          CAST(do.id AS VARCHAR(50)) AS id,
          'OPERATION_READY' AS taskType,
          CAST(do.id AS VARCHAR(50)) AS refId,
          N'Hoàn tất checklist vận hành tour' AS title,
          t.tour_name AS tourName,
          NULL AS customerName,
          ds.start_date AS deadline,
          N'Đang chuẩn bị' AS status,
          3 AS priority,
          'OPERATION' AS icon
        FROM departure_operations do
        INNER JOIN departure_schedules ds ON ds.id = do.departure_id
        INNER JOIN tours t ON t.id = ds.tour_id
        WHERE do.operation_status IN ('PREPARING', 'PROCESSING')
      ) tasks
      ORDER BY priority ASC, deadline ASC
    `;

    const upcomingRows = await prisma.$queryRaw<any[]>`
      SELECT TOP 20
        ds.id,
        ds.departure_code AS departureCode,
        t.tour_name AS tourName,
        ds.start_date AS startDate,
        ds.end_date AS endDate,
        u.full_name AS guideName,
        ds.booked_seats AS bookedSeats,
        ds.max_seats AS maxSeats,
        do.operation_status AS operationStatus,
        (
          SELECT COUNT(*)
          FROM pickup_points pp
          WHERE pp.departure_id = ds.id
        ) AS pickupCount
      FROM departure_schedules ds
      INNER JOIN tours t ON t.id = ds.tour_id
      LEFT JOIN tour_guides tg ON tg.id = ds.guide_id
      LEFT JOIN users u ON u.id = tg.user_id
      LEFT JOIN departure_operations do ON do.departure_id = ds.id
      WHERE ds.start_date >= CAST(GETDATE() AS DATE)
      ORDER BY ds.start_date ASC
    `;

    const incidentRows = await prisma.$queryRaw<any[]>`
  SELECT TOP 50 *
  FROM (
    SELECT
      CAST(cr.id AS VARCHAR(50)) AS id,
      N'Hỗ trợ khách hàng' AS type,
      N'Khách yêu cầu hủy / đổi tour' AS title,
      ISNULL(cr.reason, N'Yêu cầu hủy tour đang chờ xử lý') AS description,
      cr.requested_at AS createdAt
    FROM cancellation_requests cr
    WHERE cr.request_status = 'PENDING'

    UNION ALL

    SELECT
      CAST(pd.id AS VARCHAR(50)) AS id,
      N'Hồ sơ khách' AS type,
      N'Thiếu hoặc chờ duyệt hồ sơ hành khách' AS title,
      bp.full_name + N' cần kiểm tra giấy tờ: ' + pd.document_type AS description,
      GETDATE() AS createdAt
    FROM passenger_documents pd
    INNER JOIN booking_passengers bp ON bp.id = pd.booking_passenger_id
    WHERE pd.status = 'PENDING'

    UNION ALL

    SELECT
      CAST(e.id AS VARCHAR(50)) AS id,
      N'Email & yêu cầu' AS type,
      N'Email chưa gửi cho khách hàng' AS title,
      ISNULL(e.subject, N'Email đang chờ gửi lại') AS description,
      e.created_at AS createdAt
    FROM email_logs e
    WHERE e.send_status = 'PENDING'
  ) incidents
  ORDER BY createdAt DESC
`;

    const summary = summaryRows[0] || {};

    return NextResponse.json({
      success: true,
      message: "Lấy dữ liệu vận hành thành công",
      data: {
        summary: {
          todayTasks: toNumber(summary.todayTasks),
          urgentTasks: toNumber(summary.urgentTasks),
          upcomingTours: toNumber(summary.upcomingTours),
          supportRequests: toNumber(summary.supportRequests),
          pendingEmails: toNumber(summary.pendingEmails),
        },
        tasks: taskRows.map((item) => ({
          id: item.id,
          taskType: item.taskType,
          refId: item.refId,
          title: item.title,
          tourName: item.tourName,
          customerName: item.customerName,
          deadline: formatDate(item.deadline),
          status: item.status,
          priority: toNumber(item.priority),
          icon: item.icon,
        })),
        upcomingTours: upcomingRows.map((item) => ({
          id: toStringId(item.id),
          departureCode: item.departureCode,
          tourName: item.tourName,
          startDate: formatDate(item.startDate),
          endDate: formatDate(item.endDate),
          guideName: item.guideName,
          bookedSeats: toNumber(item.bookedSeats),
          maxSeats: toNumber(item.maxSeats),
          operationStatus: item.operationStatus,
          pickupCount: toNumber(item.pickupCount),
          readyPercent: calculateReadyPercent(item),
        })),
       incidents: incidentRows.map((item) => ({
  id: item.id,
  type: item.type,
  title: item.title,
  desc: item.description,
  createdAt: formatDate(item.createdAt),
})),
      },
    });
  } catch (error) {
    console.error("GET /api/staff/operation error:", error);

    return NextResponse.json(
      { success: false, message: "Không lấy được dữ liệu vận hành" },
      { status: 500 }
    );
  }
}