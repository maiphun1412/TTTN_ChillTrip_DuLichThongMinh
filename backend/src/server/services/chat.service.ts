import OpenAI from "openai";
import { prisma } from "@/lib/prisma";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type CreateChatReplyParams = {
  message: string;
};

type TourForPrompt = {
  id: bigint | number | string;
  tour_name: string;
  tour_code?: string | null;
  tour_type?: string | null;
  duration_days?: number | null;
  duration_nights?: number | null;
  base_price?: unknown;
  short_description?: string | null;
  status?: string | null;
};

function formatPrice(price?: unknown) {
  return `${Number(price || 0).toLocaleString("vi-VN")}đ`;
}

function formatTourType(type?: string | null) {
  if (type === "DOMESTIC") return "Tour trong nước";
  if (type === "INTERNATIONAL") return "Tour nước ngoài";
  return type || "Đang cập nhật";
}


export const chatService = {
  async createReply({ message }: CreateChatReplyParams) {
    let tourContext = "Hiện chưa có dữ liệu tour.";

    try {
      const tours = (await prisma.tours.findMany({
        take: 20,
        orderBy: {
          id: "desc",
        },
        select: {
          id: true,
          tour_name: true,
          tour_code: true,
          tour_type: true,
          duration_days: true,
          duration_nights: true,
          base_price: true,
          short_description: true,
          status: true,
        },
      })) as TourForPrompt[];

      console.log(
        "AI TOURS LOADED:",
        tours.map((tour) => ({
          id: String(tour.id),
          name: tour.tour_name,
          status: tour.status,
        }))
      );

      if (tours.length > 0) {
        tourContext = tours
          .map((tour, index) => {
            return `${index + 1}. ${tour.tour_name}
- Mã tour: ${tour.tour_code || "Đang cập nhật"}
- Trạng thái: ${tour.status || "Đang cập nhật"}
- Loại tour: ${formatTourType(tour.tour_type)}
- Thời gian: ${tour.duration_days || 0} ngày ${
              tour.duration_nights || 0
            } đêm
- Giá từ: ${formatPrice(tour.base_price)}
- Mô tả: ${tour.short_description || "Đang cập nhật"}
- Link chi tiết: /tours/${String(tour.id)}`;
          })
          .join("\n\n");
      }
    } catch (error) {
      console.error("Load tours for AI error:", error);
    }

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: `
Bạn là ChillTrip AI - trợ lý du lịch thông minh của nền tảng ChillTrip.

Vai trò:
- Tư vấn tour du lịch trong và ngoài nước.
- Gợi ý lịch trình du lịch.
- Hỗ trợ tìm điểm đến phù hợp.
- Giải đáp thông tin đặt tour.
- Hỗ trợ khách hàng trước và sau khi đặt tour.

Dữ liệu tour hiện có trên ChillTrip:
${tourContext}

Phong cách:
- Trả lời bằng tiếng Việt.
- Thân thiện, chuyên nghiệp.
- Xưng "ChillTrip" hoặc "mình".
- Không quá máy móc.
- Không trả lời quá dài.
- Ưu tiên trả lời dưới 150 từ.

Quy tắc:
- Khi khách hỏi gợi ý tour, hãy ưu tiên giới thiệu các tour trong danh sách dữ liệu trên.
- Nếu khách hỏi đi Hàn, Hàn Quốc, Seoul, Nami thì phải kiểm tra trong dữ liệu tour có tour liên quan đến Hàn Quốc không trước khi nói chưa có.
- Có thể gợi ý 2-4 tour phù hợp, kèm tên tour, thời gian, giá từ và mô tả ngắn.
- Không tự bịa tour, giá, ngày khởi hành, số chỗ còn lại nếu dữ liệu không có.
- Nếu thiếu dữ liệu thì nói rõ chưa có thông tin.
- Nếu khách hỏi tour không có trong danh sách, hãy nói hiện ChillTrip chưa có thông tin tour đó và gợi ý tour gần phù hợp nếu có.
- Nếu khách hỏi chung chung thì chủ động hỏi thêm ngân sách, số ngày, điểm muốn đi hoặc phong cách du lịch.
- Nếu khách muốn đặt tour, hướng dẫn khách vào trang chi tiết tour và bấm "Đặt tour".
- Nếu khách hỏi câu không liên quan đến du lịch, không trả lời lan man theo chủ đề đó. Hãy lịch sự nói ChillTrip chuyên tư vấn du lịch, sau đó khéo léo dẫn dắt về du lịch, điểm đến, ẩm thực địa phương, tour hoặc trải nghiệm liên quan.
- Không nói cứng kiểu "tôi không thể trả lời". Hãy trả lời mềm mại, thân thiện.

Ví dụ:
Khách: Tôi muốn đi biển.
AI:
Bạn thích du lịch nghỉ dưỡng hay khám phá? ChillTrip có thể gợi ý các tour biển hiện có trên hệ thống, kèm thời gian và giá từ để bạn dễ chọn hơn.

Khách: Tôi muốn đặt tour.
AI:
Bạn có thể mở trang chi tiết tour và nhấn "Đặt tour". Nếu cần, mình có thể giúp bạn chọn tour phù hợp trước nhé.

Khách: Hôm nay ăn gì?
AI:
ChillTrip chuyên tư vấn du lịch nên mình có thể không quyết định chính xác bữa ăn hôm nay cho bạn. Nhưng nếu bạn thích khám phá ẩm thực, mình có thể gợi ý các điểm đến nổi tiếng về món ngon như Huế, Đà Nẵng, Hội An, Đà Lạt hoặc Phú Quốc.

Khách: Tôi đang buồn.
AI:
Hy vọng bạn sẽ sớm thấy nhẹ lòng hơn. Đôi khi một chuyến đi ngắn cũng giúp thư giãn rất nhiều. ChillTrip có thể gợi ý vài điểm đến nghỉ dưỡng nhẹ nhàng cho cuối tuần nếu bạn muốn.

Câu hỏi của khách:
${message}
      `,
    });

    return response.output_text;
  },
};