import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function serialize(data: any) {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const promotionId = Number(id);
    const body = await req.json();

    const tourIds: number[] = Array.isArray(body.tourIds)
      ? body.tourIds.map((item: any) => Number(item)).filter(Boolean)
      : [];

    if (!promotionId) {
      return NextResponse.json(
        { success: false, message: "ID khuyến mãi không hợp lệ" },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        DELETE FROM promotion_tours
        WHERE promotion_id = ${promotionId}
      `;

      for (const tourId of tourIds) {
        await tx.$executeRaw`
          INSERT INTO promotion_tours (
            promotion_id,
            tour_id
          )
          VALUES (
            ${promotionId},
            ${tourId}
          )
        `;
      }
    });

    const tours = await prisma.$queryRaw`
      SELECT
        t.id,
        t.tour_code,
        t.tour_name,
        t.tour_type,
        t.base_price,
        t.status
      FROM promotion_tours pt
      INNER JOIN tours t ON t.id = pt.tour_id
      WHERE pt.promotion_id = ${promotionId}
      ORDER BY t.tour_name ASC
    `;

    return NextResponse.json({
      success: true,
      message: "Cập nhật tour áp dụng khuyến mãi thành công",
      data: serialize(tours),
    });
  } catch (error) {
    console.error("UPDATE_PROMOTION_TOURS_ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Không cập nhật được tour áp dụng" },
      { status: 500 }
    );
  }
}