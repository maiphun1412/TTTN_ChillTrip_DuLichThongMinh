import OpenAI from "openai";
import { prisma } from "@/lib/prisma";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type CreateChatReplyParams = {
  message: string;
  history?: Array<{
    role: "user" | "assistant";
    message: string;
  }>;
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
  departure_schedules?: Array<{
    start_date: Date;
    available_seats: number;
  }>;
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
  async createReply({ message, history }: CreateChatReplyParams) {
    let tourContext = "Hiện chưa có dữ liệu tour.";

    try {
      const tours = (await prisma.tours.findMany({
        where: {
          status: "PUBLISHED",
          departure_schedules: {
            some: {
              booking_status: "OPEN",
              available_seats: { gt: 0 }
            }
          }
        },
        take: 15,
        select: {
          id: true,
          tour_name: true,
          tour_code: true,
          tour_type: true,
          duration_days: true,
          duration_nights: true,
          base_price: true,
          short_description: true,
          departure_schedules: {
            where: {
              booking_status: "OPEN",
              available_seats: { gt: 0 }
            },
            orderBy: {
              start_date: "asc"
            },
            select: {
              start_date: true,
              available_seats: true
            }
          }
        }
      })) as TourForPrompt[];

      if (tours.length > 0) {
        tourContext = tours
          .map((tour, index) => {
            const firstDeparture = tour.departure_schedules?.[0];
            const startDateStr = firstDeparture
              ? firstDeparture.start_date.toISOString().split("T")[0]
              : "Đang cập nhật";
            const seats = firstDeparture ? firstDeparture.available_seats : 0;
            return `${index + 1}. Tour: ${tour.tour_name} (ID: ${tour.id})
- Mã tour: ${tour.tour_code || "Đang cập nhật"}
- Loại tour: ${formatTourType(tour.tour_type)}
- Thời gian: ${tour.duration_days || 0} ngày ${tour.duration_nights || 0} đêm
- Giá từ: ${formatPrice(tour.base_price)}
- Ngày khởi hành gần nhất: ${startDateStr}
- Số chỗ còn trống: ${seats}
- Mô tả: ${tour.short_description || "Đang cập nhật"}`;
          })
          .join("\n\n");
      }
    } catch (error) {
      console.error("Load tours for AI error:", error);
    }

    const historyContext = history && history.length > 0
      ? history.map((h: any) => `${h.role === "user" ? "Khách" : "AI"}: ${h.message}`).join("\n")
      : "";

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

Dữ liệu tour hiện có trên ChillTrip (được lấy trực tiếp từ database thật):
${tourContext}

Phong cách:
- Trả lời bằng tiếng Việt.
- Thân thiện, chuyên nghiệp.
- Xưng "ChillTrip" hoặc "mình".
- Ưu tiên trả lời ngắn gọn, dưới 150 từ.

Quy tắc bắt buộc:
1. Khi khách hỏi gợi ý tour, hãy tư vấn tour phù hợp nhất dựa vào ngân sách, địa điểm, số người và thời gian.
2. Nếu khách hỏi chung chung, hãy chủ động hỏi thêm nhu cầu (điểm đến, ngày đi, ngân sách, số người) để tư vấn chính xác hơn.
3. Khi bạn gợi ý một hoặc nhiều tour cụ thể trong danh sách trên, bạn BẮT BUỘC phải ghi mã tour theo định dạng này ở dòng cuối cùng của câu trả lời:
   [TOURS: id1, id2, ...]
   Ví dụ: "Dưới đây là các tour bạn có thể tham khảo: [TOURS: 5, 9]"
4. Chỉ sử dụng ID thực tế được cung cấp trong danh sách tour ở trên. Tuyệt đối KHÔNG tự tạo ID tour giả lập.
5. Nếu khách muốn đặt tour, hãy hướng dẫn khách bấm vào nút "Đặt tour" trên Card tour hiển thị bên dưới.
6. Nếu khách hỏi các câu hỏi không liên quan đến du lịch, hãy lịch sự hướng dẫn khách quay về chủ đề du lịch và tour của ChillTrip.
7. Nếu không xử lý được yêu cầu hoặc khách cần nhân viên tư vấn trực tiếp, hãy đề xuất khách liên hệ nhân viên và hướng dẫn bấm nút liên hệ nhân viên.

Lịch sử hội thoại trước đó (nếu có):
${historyContext}

Câu hỏi mới nhất của khách:
Khách: ${message}
AI:
      `,
    });

    return response.output_text;
  },
};