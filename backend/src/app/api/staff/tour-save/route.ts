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

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toNumber(value: unknown) {
  const number = Number(value);
  if (Number.isNaN(number)) return 0;
  return number;
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
        { success: false, message: "Bạn không có quyền cập nhật tour" },
        { status: 403 }
      ),
      user: null,
    };
  }

  return { error: null, user };
}

async function readPayload(request: NextRequest) {
  const body = await request.json();

  const tourName = String(body.tourName || "").trim();
  const tourType = String(body.tourType || "DOMESTIC").trim();
  const durationDays = toNumber(body.durationDays);
  const durationNights = toNumber(body.durationNights);
  const basePrice = toNumber(body.basePrice);
  const childPrice = toNumber(body.childPrice);
  const maxCapacity = toNumber(body.maxCapacity);

  if (!tourName) throw new Error("Tên tour không được để trống");
  if (durationDays <= 0) throw new Error("Số ngày tour phải lớn hơn 0");
  if (basePrice < 0) throw new Error("Giá tour không hợp lệ");
  if (childPrice < 0) throw new Error("Giá trẻ em không hợp lệ");
  if (maxCapacity <= 0) throw new Error("Sức chứa phải lớn hơn 0");

  return {
    id: body.id ? String(body.id) : "",
    tourCode: body.tourCode ? String(body.tourCode).trim() : "",
    tourName,
    tourType,
    durationDays,
    durationNights,
    transportType: body.transportType ? String(body.transportType).trim() : "",
    basePrice,
    childPrice,
    maxCapacity,
    shortDescription: body.shortDescription ? String(body.shortDescription).trim() : "",
    description: body.description ? String(body.description).trim() : "",
    featuredImageUrl: body.featuredImageUrl ? String(body.featuredImageUrl).trim() : "",
    includedServices: body.includedServices ? String(body.includedServices).trim() : "",
    excludedServices: body.excludedServices ? String(body.excludedServices).trim() : "",
    status: body.status ? String(body.status) : "DRAFT",
    isFeatured: Boolean(body.isFeatured),
  };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getCurrentStaff(request);
    if (auth.error) return auth.error;

    const body = await readPayload(request);
    const tourCode = body.tourCode || `TOUR${Date.now()}`;
    const slug = `${slugify(body.tourName)}-${Date.now()}`;

    const rows = await prisma.$queryRaw<{ id: bigint }[]>`
      INSERT INTO tours (
        tour_code,
        tour_name,
        slug,
        tour_type,
        duration_days,
        duration_nights,
        transport_type,
        base_price,
        child_price,
        max_capacity,
        short_description,
        description,
        featured_image_url,
        included_services,
        excluded_services,
        status,
        is_featured,
        created_by,
        updated_by,
        created_at,
        updated_at
      )
      OUTPUT INSERTED.id
      VALUES (
        ${tourCode},
        ${body.tourName},
        ${slug},
        ${body.tourType},
        ${body.durationDays},
        ${body.durationNights},
        ${body.transportType || null},
        ${body.basePrice},
        ${body.childPrice},
        ${body.maxCapacity},
        ${body.shortDescription || null},
        ${body.description || null},
        ${body.featuredImageUrl || null},
        ${body.includedServices || null},
        ${body.excludedServices || null},
        ${body.status},
        ${body.isFeatured ? 1 : 0},
        ${auth.user!.id},
        ${auth.user!.id},
        GETDATE(),
        GETDATE()
      )
    `;

    return NextResponse.json({
      success: true,
      message: "Tạo tour thành công",
      data: {
        id: rows[0].id.toString(),
      },
    });
  } catch (error) {
    console.error("POST /api/staff/tour-save error:", error);

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Không tạo được tour",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getCurrentStaff(request);
    if (auth.error) return auth.error;

    const body = await readPayload(request);

    if (!body.id || body.id === "undefined") {
      return NextResponse.json(
        { success: false, message: "Thiếu mã tour cần cập nhật" },
        { status: 400 }
      );
    }

    const tourId = BigInt(body.id);

    await prisma.$executeRaw`
      UPDATE tours
      SET
        tour_code = ${body.tourCode || `TOUR${body.id}`},
        tour_name = ${body.tourName},
        tour_type = ${body.tourType},
        duration_days = ${body.durationDays},
        duration_nights = ${body.durationNights},
        transport_type = ${body.transportType || null},
        base_price = ${body.basePrice},
        child_price = ${body.childPrice},
        max_capacity = ${body.maxCapacity},
        short_description = ${body.shortDescription || null},
        description = ${body.description || null},
        featured_image_url = ${body.featuredImageUrl || null},
        included_services = ${body.includedServices || null},
        excluded_services = ${body.excludedServices || null},
        status = ${body.status},
        is_featured = ${body.isFeatured ? 1 : 0},
        updated_by = ${auth.user!.id},
        updated_at = GETDATE()
      WHERE id = ${tourId}
    `;

    return NextResponse.json({
      success: true,
      message: "Cập nhật tour thành công",
      data: {
        id: body.id,
      },
    });
  } catch (error) {
    console.error("PATCH /api/staff/tour-save error:", error);

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Không cập nhật được tour",
      },
      { status: 500 }
    );
  }
}