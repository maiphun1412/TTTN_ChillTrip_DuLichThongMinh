export type NotificationItem = {
  id: string;
  title: string;
  content: string;
  notificationType: string | null;
  isRead: boolean;
  createdAt: string;
};

export type NotificationResponse = {
  success: boolean;
  message: string;
  data?: {
    notifications: NotificationItem[];
    unreadCount: number;
  };
};

function getToken() {
  if (typeof window === "undefined") return null;

  return (
    localStorage.getItem("access_token") ||
    sessionStorage.getItem("access_token")
  );
}

export async function getNotificationsApi() {
  const token = getToken();

  if (!token) {
    throw new Error("Chưa đăng nhập");
  }

  const res = await fetch("/backend-api/notifications", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const json: NotificationResponse = await res.json();

  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.message || "Không lấy được thông báo");
  }

  return json.data;
}

export async function markNotificationReadApi(notificationId?: string) {
  const token = getToken();

  if (!token) {
    throw new Error("Chưa đăng nhập");
  }

  const res = await fetch("/backend-api/notifications", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(
      notificationId
        ? {
            notificationId,
          }
        : {}
    ),
  });

  const json = await res.json();

  if (!res.ok || !json.success) {
    throw new Error(json.message || "Không cập nhật được thông báo");
  }

  return json;
}