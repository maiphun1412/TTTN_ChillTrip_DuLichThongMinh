import { NextRequest, NextResponse } from "next/server";
import { chatService } from "@/server/services/chat.service";
import { prisma } from "@/lib/prisma";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders() });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const message = body.message;
    const history = body.history || [];

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { message: "Thiếu nội dung tin nhắn." },
        {
          status: 400,
          headers: corsHeaders(),
        }
      );
    }

    const reply = await chatService.createReply({
      message,
      history,
    });

    // ✅ Phân tích mã [TOURS: ...] từ câu trả lời của AI
    const toursMatch = reply.match(/\[TOURS:\s*([\d\s,]+)\]/);
    let tourObjects: any[] = [];
    let cleanReply = reply;

    if (toursMatch) {
      // ✅ Lọc sạch chuỗi [TOURS: ...] khỏi câu trả lời
      cleanReply = reply.replace(/\[TOURS:\s*([\d\s,]+)\]/g, "").trim();

      const tourIds = toursMatch[1]
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);

      if (tourIds.length > 0) {
        try {
          const dbTours = await prisma.tours.findMany({
            where: {
              id: {
                in: tourIds.map((id) => BigInt(id)),
              },
              status: "PUBLISHED",
            },
            include: {
              tour_images: {
                orderBy: [{ is_cover: "desc" }, { sort_order: "asc" }],
                take: 1,
              },
              departure_schedules: {
                where: {
                  booking_status: "OPEN",
                  available_seats: { gt: 0 },
                },
                orderBy: {
                  start_date: "asc",
                },
              },
            },
          });

          // ✅ Chỉ nhận tour có ID tồn tại trong DB, map giá trị an toàn
          tourObjects = dbTours.map((t) => {
            const coverImage =
              t.tour_images.find((img) => img.is_cover) || t.tour_images[0];
            const firstDep = t.departure_schedules[0];
            return {
              id: t.id.toString(),
              tourName: t.tour_name,
              basePrice: t.base_price.toString(),
              imageUrl: coverImage?.image_url || t.featured_image_url || null,
              startDate: firstDep
                ? firstDep.start_date.toISOString().split("T")[0]
                : null,
              availableSeats: firstDep ? firstDep.available_seats : 0,
            };
          });
        } catch (dbError) {
          console.error("Query tours for chat error:", dbError);
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        reply: cleanReply,
        tours: tourObjects,
      },
      {
        headers: corsHeaders(),
      }
    );
  } catch (error) {
    console.error("Chat API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Có lỗi xảy ra khi xử lý chat AI.",
      },
      {
        status: 500,
        headers: corsHeaders(),
      }
    );
  }
}