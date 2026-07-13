import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/permissions";

function serialize<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);

  if (!auth) {
    return NextResponse.json(
      {
        success: false,
        message: "Chưa đăng nhập",
      },
      { status: 401 }
    );
  }

  try {
    const notifications = await prisma.notifications.findMany({
      where: {
        user_id: BigInt(auth.userId),
      },
      orderBy: {
        created_at: "desc",
      },
    });

    const unreadCount = await prisma.notifications.count({
  where: {
    user_id: BigInt(auth.userId),
    is_read: false,
  },
});

    return NextResponse.json({
  success: true,
  message: "Lấy danh sách thông báo thành công",
  data: serialize({
    notifications: notifications.map((item) => ({
      id: item.id,
      title: item.title,
      content: item.content,
      notificationType: item.notification_type,
      isRead: item.is_read,
      createdAt: item.created_at,
    })),
    unreadCount,
  }),
});
  } catch (error) {
    console.error("GET /api/notifications error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Không lấy được danh sách thông báo",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const auth = requireAuth(req);

  if (!auth) {
    return NextResponse.json(
      {
        success: false,
        message: "Chưa đăng nhập",
      },
      { status: 401 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const notificationId = body.notificationId;

    if (notificationId) {
      await prisma.notifications.updateMany({
        where: {
          id: BigInt(notificationId),
          user_id: BigInt(auth.userId),
        },
        data: {
          is_read: true,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Đã đánh dấu thông báo là đã đọc",
      });
    }

    await prisma.notifications.updateMany({
      where: {
        user_id: BigInt(auth.userId),
        is_read: false,
      },
      data: {
        is_read: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Đã đánh dấu tất cả thông báo là đã đọc",
    });
  } catch (error) {
    console.error("PATCH /api/notifications error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Không thể cập nhật thông báo",
      },
      { status: 500 }
    );
  }
}