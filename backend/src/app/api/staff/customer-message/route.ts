import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAccessToken } from "@/lib/auth";

type CurrentUserRow = {
  id: bigint;
  roleCode: string;
};

type CustomerRow = {
  id: bigint;
  userId: bigint | null;
  fullName: string;
  email: string | null;
};

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  return authHeader.replace("Bearer ", "");
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
        { success: false, message: "Bạn không có quyền gửi thông báo" },
        { status: 403 }
      ),
      user: null,
    };
  }

  return { error: null, user };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getCurrentStaff(request);
    if (auth.error) return auth.error;

    const body = await request.json();

    const customerId = String(body.customerId || "").trim();
    const title = String(body.title || "").trim();
    const content = String(body.content || "").trim();

    if (!customerId || customerId === "undefined") {
      return NextResponse.json(
        { success: false, message: "Thiếu mã khách hàng" },
        { status: 400 }
      );
    }

    if (!title) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập tiêu đề" },
        { status: 400 }
      );
    }

    if (!content) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập nội dung tin nhắn" },
        { status: 400 }
      );
    }

    const customers = await prisma.$queryRaw<CustomerRow[]>`
      SELECT
        id,
        user_id AS userId,
        full_name AS fullName,
        email
      FROM customers
      WHERE id = ${BigInt(customerId)}
    `;

    const customer = customers[0];

    if (!customer) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy khách hàng" },
        { status: 404 }
      );
    }

    if (customer.userId) {
      await prisma.$executeRaw`
        INSERT INTO notifications (
          user_id,
          title,
          content,
          notification_type,
          is_read,
          created_at
        )
        VALUES (
          ${customer.userId},
          ${title},
          ${content},
          'CUSTOMER_CARE',
          0,
          GETDATE()
        )
      `;
    }

    if (customer.email) {
      await prisma.$executeRaw`
        INSERT INTO email_logs (
          customer_id,
          recipient_email,
          subject,
          body,
          send_status,
          created_at
        )
        VALUES (
          ${customer.id},
          ${customer.email},
          ${title},
          ${content},
          'PENDING',
          GETDATE()
        )
      `;
    }

    return NextResponse.json({
      success: true,
      message: "Đã tạo thông báo / email chăm sóc khách hàng",
      data: {
        sent: true,
      },
    });
  } catch (error) {
    console.error("POST /api/staff/customer-message error:", error);

    return NextResponse.json(
      { success: false, message: "Không gửi được tin nhắn khách hàng" },
      { status: 500 }
    );
  }
}