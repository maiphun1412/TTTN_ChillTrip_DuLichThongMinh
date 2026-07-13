const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

export type RegisterPayload = {
  fullName: string;
  email?: string;
  phone?: string;
  password: string;
};

export type RegisterResponse = {
  success: boolean;
  message: string;
  data?: {
    token?: string;
  };
  errors?: unknown;
};

export type CurrentUserResponse = {
  success: boolean;
  message: string;
  data?: {
    user: {
      id: string;
      fullName: string;
      email: string | null;
      phone: string | null;
      avatarUrl: string | null;
      status: string;
      lastLoginAt?: string | null;
      role?: {
        id: string;
        code: string;
        name: string;
        description?: string | null;
      } | null;
    };

    customer: {
      id: string;
      userId: string | null;
      customerCode: string;
      fullName: string;
      gender: string | null;
      dateOfBirth: string | null;
      email: string | null;
      phone: string | null;
      address: string | null;
      customerType: string;
      notes?: string | null;
      createdAt?: string;
      updatedAt?: string;
    } | null;

    summary?: {
      totalBookings: number;
      rewardPoints: number;
      availablePromotions: number;
    };
  };
  errors?: unknown;
};

export async function registerApi(payload: RegisterPayload) {
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const result: RegisterResponse = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Đăng ký thất bại");
  }

  return result;
}

export async function getCurrentUserApi() {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("access_token") ||
        sessionStorage.getItem("access_token")
      : null;

  if (!token) {
    throw new Error("Chưa đăng nhập");
  }

  const response = await fetch("/backend-api/auth/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const result: CurrentUserResponse = await response.json();

  if (!response.ok || !result.success || !result.data) {
    throw new Error(result.message || "Không lấy được thông tin người dùng");
  }

  return result.data;
}
export async function uploadAvatarApi(file: File) {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("access_token") ||
        sessionStorage.getItem("access_token")
      : null;

  if (!token) {
    throw new Error("Chưa đăng nhập");
  }

  const formData = new FormData();
  formData.append("avatar", file);

  const response = await fetch("/backend-api/profile/avatar", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
    cache: "no-store",
  });

  const text = await response.text();

  let result: any;

  try {
    result = text ? JSON.parse(text) : {};
  } catch {
    throw new Error("API trả về HTML/không phải JSON. Kiểm tra route backend.");
  }

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Không cập nhật được avatar");
  }

  return result.data as {
    avatarUrl: string;
  };
}