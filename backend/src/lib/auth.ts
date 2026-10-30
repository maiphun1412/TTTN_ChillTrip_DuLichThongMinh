import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_ALGORITHM = "HS256" as const;
const MIN_SECRET_LENGTH = 32;

// Không có khóa dự phòng: thiếu JWT_SECRET thì báo lỗi ngay,
// tránh việc ai cũng tự ký được token bằng một khóa đoán trước được.
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET chưa được cấu hình hoặc ngắn hơn ${MIN_SECRET_LENGTH} ký tự (kiểm tra backend/.env)`
    );
  }

  return secret;
}

export type JwtPayload = {
  userId: string;
  roleCode: string;
  email?: string | null;
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

// Chỉ chấp nhận mật khẩu đã băm bằng bcrypt. Mật khẩu lưu dạng thô
// trong DB coi như không hợp lệ thay vì so sánh chuỗi trực tiếp.
export async function comparePassword(raw: string, hashed: string) {
  if (!/^\$2[aby]\$/.test(hashed)) return false;

  return bcrypt.compare(raw, hashed);
}

export function signAccessToken(payload: JwtPayload) {
  return jwt.sign(payload, getJwtSecret(), {
    algorithm: JWT_ALGORITHM,
    expiresIn: "7d",
  });
}

export function verifyAccessToken(token: string): JwtPayload | null {
  const secret = getJwtSecret();

  try {
    // Cố định thuật toán để token tự khai báo thuật toán khác bị từ chối
    return jwt.verify(token, secret, {
      algorithms: [JWT_ALGORITHM],
    }) as JwtPayload;
  } catch {
    return null;
  }
}