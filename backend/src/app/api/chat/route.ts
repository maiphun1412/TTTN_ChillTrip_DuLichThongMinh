import { NextRequest, NextResponse } from "next/server";
import { chatService } from "@/server/services/chat.service";

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
    });

    return NextResponse.json(
      {
        success: true,
        reply,
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