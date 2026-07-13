import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";

export type JwtPayload = {
  userId: string;
  roleCode: string;
  email?: string | null;
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(raw: string, hashed: string) {
  const looksHashed =
    hashed.startsWith("$2a$") ||
    hashed.startsWith("$2b$") ||
    hashed.startsWith("$2y$");

  if (!looksHashed) return raw === hashed;

  return bcrypt.compare(raw, hashed);
}

export function signAccessToken(payload: JwtPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyAccessToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}