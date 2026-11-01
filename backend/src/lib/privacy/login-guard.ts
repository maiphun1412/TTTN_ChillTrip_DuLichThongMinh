import { createHmac } from "crypto";
import { prisma } from "@/lib/prisma";

/**
 * Chống dò mật khẩu: nhập sai tên đăng nhập hoặc mật khẩu 5 lần trong 60 phút
 * thì tạm khóa đăng nhập 60 phút. Số lần sai được đếm từ chính nhật ký audit_logs
 * (không cần bảng mới, và nhật ký không sửa/xóa được nên không ai "xóa lượt sai" được).
 *
 * Khóa theo "tên đăng nhập đã gõ" (email/SĐT), nên tên đăng nhập không tồn tại cũng bị khóa
 * giống hệt tài khoản thật: kẻ dò không phân biệt được tài khoản nào có tồn tại.
 */

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCK_MINUTES = 60;

const WINDOW_MS = LOCK_MINUTES * 60 * 1000;

/** Mã định danh của tên đăng nhập, dạng băm (không lưu email/SĐT gốc vào log). */
export function accountKey(identifier: string) {
  return createHmac("sha256", process.env.JWT_SECRET || "chilltrip-login-guard")
    .update(identifier.trim().toLowerCase())
    .digest("hex")
    .slice(0, 32);
}

export type LoginLockState = {
  locked: boolean;
  lockedUntil: Date | null;
  /** Số lần sai liên tiếp còn tính (trong 60 phút gần nhất) */
  failures: number;
};

export async function getLoginLockState(
  key: string,
  userId: bigint | null
): Promise<LoginLockState> {
  const since = new Date(Date.now() - 2 * WINDOW_MS);

  const events = await prisma.audit_logs.findMany({
    where: {
      module_name: "AUTH",
      action_name: { in: ["LOGIN_FAILED", "LOGIN_SUCCESS"] },
      created_at: { gte: since },
      OR: [
        { new_data: { contains: `"accountKey":"${key}"` } },
        ...(userId ? [{ user_id: userId }] : []),
      ],
    },
    select: { created_at: true, action_name: true },
    orderBy: { created_at: "asc" },
  });

  let failures: number[] = [];
  let lockedUntil = 0;

  for (const event of events) {
    const t = event.created_at.getTime();
    if (t < lockedUntil) continue;

    if (event.action_name === "LOGIN_SUCCESS") {
      failures = [];
      continue;
    }

    failures = failures.filter((f) => t - f < WINDOW_MS);
    failures.push(t);

    if (failures.length >= MAX_FAILED_ATTEMPTS) {
      lockedUntil = t + WINDOW_MS;
      failures = [];
    }
  }

  const now = Date.now();
  if (now < lockedUntil) {
    return { locked: true, lockedUntil: new Date(lockedUntil), failures: MAX_FAILED_ATTEMPTS };
  }

  return {
    locked: false,
    lockedUntil: null,
    failures: failures.filter((f) => now - f < WINDOW_MS).length,
  };
}

/** Giờ mở khóa theo giờ Việt Nam, ví dụ "21:35 ngày 01/11/2026". */
export function formatUnlockTime(date: Date) {
  const time = date.toLocaleTimeString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const day = date.toLocaleDateString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  return `${time} ngày ${day}`;
}

export function lockedMessage(lockedUntil: Date) {
  const minutesLeft = Math.max(1, Math.ceil((lockedUntil.getTime() - Date.now()) / 60000));
  return `Tài khoản đang bị tạm khóa do nhập sai quá ${MAX_FAILED_ATTEMPTS} lần. Vui lòng thử lại sau ${minutesLeft} phút (lúc ${formatUnlockTime(lockedUntil)}).`;
}
