import { z } from "zod";

export const registerSchema = z.object({
  fullName: z.string().min(2, "Họ tên tối thiểu 2 ký tự"),
  email: z.string().email("Email không hợp lệ").optional().or(z.literal("")),
  phone: z.string().min(8, "Số điện thoại không hợp lệ").optional().or(z.literal("")),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
});

export const loginSchema = z.object({
  email: z.string().optional(),
  phone: z.string().optional(),
  password: z.string().min(1, "Mật khẩu không được để trống"),
});