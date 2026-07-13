import { z } from "zod";

export const chatSchema = z.object({
  sessionId: z.string().min(1, "Thiếu sessionId"),
  customerId: z.string().optional(),
  message: z.string().min(1, "Tin nhắn không được để trống"),
});

export const saveChatMessageSchema = z.object({
  sessionId: z.string().min(1),
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
});