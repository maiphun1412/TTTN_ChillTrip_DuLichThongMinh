"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import HomeHeader from "@/components/home/HomeHeader";
import {
  getNotificationsApi,
  markNotificationReadApi,
  type NotificationItem,
} from "@/lib/api/notification.api";

type FilterKey = "ALL" | "PROMOTION" | "TRIP" | "BOOKING" | "SYSTEM";

const tabs: { key: FilterKey; label: string }[] = [
  { key: "ALL", label: "Tất cả" },
  { key: "PROMOTION", label: "Ưu đãi" },
  { key: "TRIP", label: "Chuyến đi" },
  { key: "BOOKING", label: "Đặt tour" },
  { key: "SYSTEM", label: "Hệ thống" },
];

function formatTime(date: string) {
  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    return "Đang cập nhật";
  }

  return value.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activeTab, setActiveTab] = useState<FilterKey>("ALL");
  const [loading, setLoading] = useState(true);

  async function loadNotifications() {
    try {
      setLoading(true);
      const data = await getNotificationsApi();
      setNotifications(data.notifications);
    } catch (error) {
      console.error("Load notifications error:", error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  const unreadCount = notifications.filter((item) => !item.isRead).length;

  const filteredNotifications = useMemo(() => {
    if (activeTab === "ALL") return notifications;

    return notifications.filter(
      (item) => item.notificationType === activeTab
    );
  }, [notifications, activeTab]);

  async function handleMarkAllRead() {
  try {
    await markNotificationReadApi();

    setNotifications((prev) =>
      prev.map((item) => ({
        ...item,
        isRead: true,
      }))
    );

    window.dispatchEvent(new Event("notifications-changed"));
  } catch (error) {
    console.error("Mark all read error:", error);
  }
}

  async function handleMarkRead(id: string) {
  try {
    await markNotificationReadApi(id);

    setNotifications((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              isRead: true,
            }
          : item
      )
    );

    window.dispatchEvent(new Event("notifications-changed"));
  } catch (error) {
    console.error("Mark read error:", error);
  }
}

  return (
    <main className="min-h-screen bg-[#f6fafb] text-[#181c1d]">
      <HomeHeader />

      <section className="mx-auto max-w-6xl px-4 pb-20 pt-28 md:px-8">
        <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="mb-4 flex gap-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
              <Link href="/" className="hover:text-[#00606c]">
                Trang chủ
              </Link>
              <span>/</span>
              <span className="text-[#00606c]">Thông báo</span>
            </div>

            <h1 className="text-4xl font-black tracking-tight text-[#00606c] md:text-5xl">
              Thông báo
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500 md:text-base">
              Cập nhật trạng thái đặt tour, vé điện tử, ưu đãi và thông báo hệ
              thống dành riêng cho bạn.
            </p>
          </div>

          <button
            type="button"
            onClick={handleMarkAllRead}
            className="inline-flex w-fit items-center gap-2 rounded-full border border-[#dfe3e4] bg-white px-6 py-3 text-sm font-bold text-[#00606c] shadow-sm transition hover:bg-[#eef8fa]"
          >
            <DoneAllIcon />
            Đánh dấu tất cả là đã đọc
          </button>
        </div>

        <div className="mb-8 flex flex-wrap gap-3">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={
                activeTab === tab.key
                  ? "rounded-full bg-[#9defff] px-6 py-2.5 text-sm font-extrabold text-[#001f24]"
                  : "rounded-full bg-[#e5e9ea] px-6 py-2.5 text-sm font-bold text-slate-600 hover:bg-[#dfe3e4]"
              }
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mb-5 rounded-[2rem] bg-white px-6 py-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">
            Bạn có{" "}
            <span className="font-extrabold text-[#00606c]">
              {unreadCount}
            </span>{" "}
            thông báo chưa đọc.
          </p>
        </div>

        {loading ? (
          <EmptyBox text="Đang tải thông báo..." />
        ) : filteredNotifications.length === 0 ? (
          <EmptyBox text="Không có thông báo trong mục này." />
        ) : (
          <div className="space-y-5">
            {filteredNotifications.map((item) => (
              <NotificationCard
                key={item.id}
                item={item}
                onMarkRead={() => handleMarkRead(item.id)}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function NotificationCard({
  item,
  onMarkRead,
}: {
  item: NotificationItem;
  onMarkRead: () => void;
}) {
  return (
    <article
      className={`relative overflow-hidden rounded-[2rem] bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        item.isRead ? "opacity-70" : ""
      }`}
    >
      <div className="flex gap-5">
        <div
          className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full ${getIconBoxClass(
            item.notificationType
          )}`}
        >
          <NotificationTypeIcon type={item.notificationType} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <h2 className="text-lg font-extrabold text-slate-900">
              {item.title}
            </h2>

            <span className="w-fit rounded-full bg-[#f1f4f5] px-3 py-1 text-xs font-semibold text-slate-500">
              {formatTime(item.createdAt)}
            </span>
          </div>

          <p className="text-sm leading-7 text-slate-500">{item.content}</p>

          {!item.isRead ? (
            <button
              type="button"
              onClick={onMarkRead}
              className="mt-5 text-sm font-bold text-slate-500 hover:text-[#00606c]"
            >
              Đánh dấu đã đọc
            </button>
          ) : null}
        </div>

        {!item.isRead ? (
          <div className="mt-2 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-[#fc8a40]" />
        ) : null}
      </div>
    </article>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-[2rem] bg-white p-12 text-center shadow-sm">
      <p className="text-lg font-bold text-[#00606c]">{text}</p>
    </div>
  );
}

function getIconBoxClass(type?: string | null) {
  if (type === "PROMOTION") {
    return "bg-[#fff1e8] text-[#9b4500]";
  }

  if (type === "TRIP" || type === "BOOKING") {
    return "bg-[#e5faff] text-[#00606c]";
  }

  return "bg-[#f1f4f5] text-slate-600";
}

function NotificationTypeIcon({ type }: { type?: string | null }) {
  if (type === "PROMOTION") return <GiftIcon />;
  if (type === "TRIP" || type === "BOOKING") return <TicketIcon />;
  return <BellIcon />;
}

function BellIcon() {
  return (
    <svg
      className="h-6 w-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 17H5l1.4-1.4A2 2 0 0 0 7 14.2V11a5 5 0 1 1 10 0v3.2a2 2 0 0 0 .6 1.4L19 17h-4"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10 20a2 2 0 0 0 4 0"
      />
    </svg>
  );
}

function GiftIcon() {
  return (
    <svg
      className="h-6 w-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 12v8H4v-8" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2 7h20v5H2z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v13" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 7H8.5A2.5 2.5 0 1 1 11 4.5L12 7Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 7h3.5A2.5 2.5 0 1 0 13 4.5L12 7Z"
      />
    </svg>
  );
}

function TicketIcon() {
  return (
    <svg
      className="h-6 w-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 8.5A2.5 2.5 0 0 1 6.5 6h11A2.5 2.5 0 0 1 20 8.5V10a2 2 0 0 0 0 4v1.5A2.5 2.5 0 0 1 17.5 18h-11A2.5 2.5 0 0 1 4 15.5V14a2 2 0 0 0 0-4V8.5Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6v12" />
    </svg>
  );
}

function DoneAllIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m3 12 4 4L17 6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m11 16 2 2 8-10" />
    </svg>
  );
}