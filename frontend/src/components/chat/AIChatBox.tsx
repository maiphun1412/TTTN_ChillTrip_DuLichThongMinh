"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  getOrCreateChatSessionId,
  listenChatMessages,
  saveChatMessage,
  type FirebaseChatMessage,
} from "@/lib/chat-firebase";

const quickSuggestions = [
  "Gợi ý tour Đà Lạt",
  "Tour biển giá tốt",
  "Có ưu đãi nào không?",
];

export default function AIChatBox() {
  const pathname = usePathname();
  const router = useRouter();
  const [showChat, setShowChat] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState<FirebaseChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const messageContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function loadFavorites() {
      const token = localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
      if (!token) return;
      try {
        const res = await fetch("/backend-api/favorites", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const json = await res.json();
        if (json.success) {
          setFavoriteIds(json.data.map((item: any) => String(item.tourId)));
        }
      } catch (e) {
        console.error("Load favorites count error:", e);
      }
    }
    if (isOpen) {
      loadFavorites();
    }
  }, [isOpen]);

  async function handleToggleFavorite(tourId: string) {
    const token = localStorage.getItem("access_token") || sessionStorage.getItem("access_token");

    if (!token) {
      alert("Vui lòng đăng nhập để lưu tour yêu thích.");
      router.push("/login");
      return;
    }

    const isFavorite = favoriteIds.includes(String(tourId));

    try {
      if (isFavorite) {
        const res = await fetch(`/backend-api/favorites/${tourId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          setFavoriteIds((prev) => prev.filter((id) => id !== String(tourId)));
          window.dispatchEvent(new Event("favorites-changed"));
        }
      } else {
        const res = await fetch("/backend-api/favorites", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ tourId }),
        });
        if (res.ok) {
          setFavoriteIds((prev) => [...prev, String(tourId)]);
          window.dispatchEvent(new Event("favorites-changed"));
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    // 1. Kiểm tra xem pathname hiện tại có thuộc các trang quản trị/nhân viên/hướng dẫn viên không
    const isAdminStaffGuidePath =
      pathname.startsWith("/admin") ||
      pathname.startsWith("/staff") ||
      pathname.startsWith("/guide");

    // Tạm ẩn ở trang đăng nhập, đăng ký
    const isAuthPath = pathname === "/login" || pathname === "/register";

    if (isAdminStaffGuidePath || isAuthPath) {
      setShowChat(false);
      return;
    }

    // 2. Kiểm tra role của user đăng nhập từ localStorage/sessionStorage
    const userJson =
      typeof window !== "undefined"
        ? localStorage.getItem("user") || sessionStorage.getItem("user")
        : null;

    if (userJson) {
      try {
        const user = JSON.parse(userJson);
        // Nếu user có role khác CUSTOMER (như ADMIN, STAFF, GUIDE) thì ẩn chat
        if (user && user.role && user.role !== "CUSTOMER") {
          setShowChat(false);
          return;
        }
      } catch (e) {
        console.error("Error parsing user role:", e);
      }
    }

    setShowChat(true);
  }, [pathname]);

  useEffect(() => {
    const id = getOrCreateChatSessionId();
    setSessionId(id);

    const unsubscribe = listenChatMessages(id, setMessages);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  }, [messages, isSending]);

  async function handleSend(customText?: string) {
    const text = (customText ?? input).trim();

    if (!text || !sessionId || isSending) return;

    setInput("");
    setIsSending(true);

    try {
      await saveChatMessage(sessionId, {
        role: "user",
        message: text,
      });

      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

      if (!apiBaseUrl) {
        throw new Error("Thiếu NEXT_PUBLIC_API_BASE_URL trong .env.local");
      }

      // ✅ Chỉ gửi tối đa 10 tin nhắn gần nhất để giữ ngữ cảnh hội thoại
      const chatHistory = messages
        .slice(-10)
        .map((m) => ({
          role: m.role,
          message: m.message,
        }));

      const response = await fetch(`${apiBaseUrl}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          message: text,
          history: chatHistory,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Có lỗi xảy ra khi gọi AI.");
      }

      await saveChatMessage(sessionId, {
        role: "assistant",
        message: data.reply || "Mình chưa có câu trả lời phù hợp.",
        tours: data.tours || null,
      });
    } catch (error) {
      console.error("Chat error:", error);

      await saveChatMessage(sessionId, {
        role: "assistant",
        message: "Xin lỗi, hiện tại mình chưa xử lý được câu hỏi này.",
      });
    } finally {
      setIsSending(false);
    }
  }

  if (!showChat) return null;

  if (!isOpen) {
    return (
      <>
        <style jsx global>{`
          @keyframes chill-icon-float {
            0%,
            100% {
              transform: scale(1) translateY(0);
            }
            50% {
              transform: scale(1.12) translateY(-7px);
            }
          }
        `}</style>

        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-8 right-8 z-50 flex h-20 w-20 items-center justify-center transition hover:scale-110"
          aria-label="Mở ChillTrip AI"
        >
          <img
            src="/icon.png"
            alt="ChillTrip AI"
            className="h-16 w-16 animate-[chill-icon-float_1.6s_ease-in-out_infinite] object-contain drop-shadow-[0_18px_28px_rgba(0,96,108,0.42)]"
          />
        </button>
      </>
    );
  }

  return (
    <>
      <style jsx global>{`
        @keyframes chill-panel-in {
          from {
            opacity: 0;
            transform: translateY(18px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>

      <div
        className={[
          "fixed bottom-5 right-5 z-50 overflow-hidden rounded-[34px]",
          "border border-white/70 bg-white/95 shadow-[0_35px_100px_rgba(0,42,51,0.42)] ring-1 ring-[#9defff]/45 backdrop-blur-2xl",
          "animate-[chill-panel-in_0.26s_ease-out] transition-all duration-300",
          isExpanded
            ? "h-[640px] w-[720px] max-h-[calc(100vh-32px)] max-w-[calc(100vw-32px)]"
            : "h-[560px] w-[390px] max-h-[calc(100vh-32px)] max-w-[calc(100vw-32px)]",
        ].join(" ")}
      >
        <div className="relative flex flex-col h-full min-h-0 overflow-hidden rounded-[34px]">
          <div className="absolute inset-0 bg-[#f6fafb]" />
          <div className="absolute -left-28 -top-28 h-72 w-72 rounded-full bg-[#9defff]/35 blur-3xl" />
          <div className="absolute -right-24 top-20 h-80 w-80 rounded-full bg-[#007b8a]/20 blur-3xl" />
          <div className="absolute -bottom-32 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-[#00606c]/15 blur-3xl" />

          <div className="relative overflow-hidden bg-[#071f25] px-5 py-4 text-white">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(157,239,255,0.28),transparent_30%),linear-gradient(135deg,#00343c_0%,#00606c_55%,#007b8a_100%)]" />
            <div className="absolute right-0 top-0 h-24 w-40 rounded-bl-full bg-white/10 blur-sm" />

            <div className="relative flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 shadow-inner backdrop-blur">
                  <img
                    src="/icon.png"
                    alt="ChillTrip AI"
                    className="h-9 w-9 rounded-full object-contain"
                  />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-base font-black tracking-[-0.02em]">
                      ChillTrip AI
                    </p>
                    <span className="rounded-full bg-[#9defff]/20 px-2 py-0.5 text-[10px] font-bold text-[#ddf9ff]">
                      Online
                    </span>
                  </div>
                  <p className="truncate text-xs font-medium text-[#ddf9ff]/85">
                    Tìm tour, hỏi giá, gợi ý lịch trình nhanh
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsExpanded((prev) => !prev)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/12 text-white transition hover:bg-white/22"
                  title={isExpanded ? "Thu nhỏ" : "Mở rộng"}
                >
                  {isExpanded ? <MinimizeIcon /> : <ExpandIcon />}
                </button>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/12 text-xl leading-none text-white transition hover:bg-white/22"
                  aria-label="Đóng chat"
                >
                  ×
                </button>
              </div>
            </div>
          </div>

          <div
            ref={messageContainerRef}
            className="relative flex-1 min-h-0 overflow-y-auto px-4 py-4 text-sm"
          >
            {/* ✅ Luôn hiển thị câu chào đầu tiên khi mở Chatbox */}
            <div className="mr-auto max-w-[88%] rounded-[24px] rounded-tl-md border border-white bg-white/90 px-4 py-3 leading-6 text-[#284247] shadow-[0_10px_28px_rgba(0,96,108,0.08)] mb-3">
              Xin chào, mình là trợ lý ChillTrip. Bạn muốn đi đâu hôm nay?
            </div>

            {/* ✅ Chỉ hiển thị gợi ý nhanh khi chưa có cuộc trò chuyện nào */}
            {messages.length === 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {quickSuggestions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handleSend(item)}
                    className="rounded-full border border-[#cfe5e8] bg-white/80 px-3 py-2 text-xs font-bold text-[#00606c] shadow-sm transition hover:-translate-y-0.5 hover:border-[#007b8a] hover:bg-white cursor-pointer"
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className="space-y-2">
                  <div
                    className={
                      msg.role === "user"
                        ? "ml-auto max-w-[82%] rounded-[24px] rounded-tr-md bg-[linear-gradient(135deg,#00606c_0%,#007b8a_100%)] px-4 py-3 leading-6 text-white shadow-[0_12px_28px_rgba(0,96,108,0.22)]"
                        : "mr-auto max-w-[88%] rounded-[24px] rounded-tl-md border border-white bg-white/90 px-4 py-3 leading-6 text-[#26383d] shadow-[0_10px_28px_rgba(0,96,108,0.08)]"
                    }
                  >
                    {msg.message}
                  </div>

                  {/* ✅ HIỂN THỊ DANH SÁCH CARD TOUR NẾU CÓ */}
                  {msg.tours && msg.tours.length > 0 && (
                    <div className="no-scrollbar flex gap-4 overflow-x-auto py-2 max-w-full">
                      {msg.tours.map((tour) => (
                        <TourCardInChat
                          key={tour.id}
                          tour={tour}
                          favoriteIds={favoriteIds}
                          onToggleFavorite={handleToggleFavorite}
                        />
                      ))}
                    </div>
                  )}

                  {/* ✅ GỢI Ý LIÊN HỆ TƯ VẤN KHI LỖI HOẶC AI KHÔNG XỬ LÝ ĐƯỢC */}
                  {msg.role === "assistant" && (
                    msg.message.includes("chưa xử lý được") ||
                    msg.message.includes("chưa có câu trả lời")
                  ) && (
                    <div className="mr-auto mt-1">
                      <button
                        type="button"
                        onClick={() => router.push("/consult")}
                        className="rounded-full bg-[#e5f7fa] border border-[#00606c]/20 px-4 py-2 text-xs font-bold text-[#00606c] hover:bg-[#00606c] hover:text-white transition-all shadow-sm cursor-pointer"
                      >
                        📞 Liên hệ nhân viên tư vấn
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {isSending && (
              <div className="mt-3 mr-auto flex max-w-[80%] items-center gap-2 rounded-[24px] rounded-tl-md border border-white bg-white/90 px-4 py-3 text-[#5f7378] shadow-sm">
                <span className="flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#007b8a]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#007b8a] [animation-delay:0.12s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#007b8a] [animation-delay:0.24s]" />
                </span>
                <span className="text-xs font-semibold">
                  Đang soạn trả lời...
                </span>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          <div className="relative border-t border-white/70 bg-white/90 p-3 backdrop-blur-xl">
            <div className="flex items-end gap-2 rounded-[24px] border border-[#cfe5e8] bg-white p-2 shadow-[0_10px_30px_rgba(0,96,108,0.08)] focus-within:border-[#007b8a]">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    handleSend();
                  }
                }}
                rows={1}
                placeholder="Nhập câu hỏi cho ChillTrip..."
                className="max-h-24 min-h-10 flex-1 resize-none bg-transparent px-3 py-2 text-sm font-medium leading-6 text-[#1f2a2d] outline-none placeholder:text-[#8ba0a5]"
              />

              <button
                type="button"
                onClick={() => handleSend()}
                disabled={isSending || !input.trim()}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#00606c] text-white shadow-[0_10px_22px_rgba(0,96,108,0.25)] transition hover:-translate-y-0.5 hover:bg-[#007b8a] disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Gửi tin nhắn"
              >
                <SendIcon />
              </button>
            </div>

            <p className="mt-2 text-center text-[10px] font-medium text-[#7a8f95]">
              Enter để gửi • Shift Enter để xuống dòng
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

function SendIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-[18px] w-[18px]"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 12h14M13 6l6 6-6 6"
      />
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-[18px] w-[18px]"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"
      />
    </svg>
  );
}

function MinimizeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-[18px] w-[18px]"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"
      />
    </svg>
  );
}

function TourCardInChat({
  tour,
  favoriteIds,
  onToggleFavorite,
}: {
  tour: {
    id: string;
    tourName: string;
    basePrice: number | string;
    imageUrl: string;
    startDate: string;
    availableSeats: number;
  };
  favoriteIds: string[];
  onToggleFavorite: (tourId: string) => void;
}) {
  const router = useRouter();
  const isFavorite = favoriteIds.includes(String(tour.id));

  return (
    <div className="w-56 shrink-0 overflow-hidden rounded-3xl border border-[#e3e7e8] bg-white shadow-sm transition hover:shadow-md">
      <div className="relative h-28 w-full bg-slate-100">
        <img
          src={tour.imageUrl || "/images/tours/dalat-cover.jpg"}
          alt={tour.tourName}
          className="h-full w-full object-cover"
        />
      </div>

      <div className="p-3">
        <h4 className="line-clamp-1 text-sm font-extrabold text-[#00606c]" title={tour.tourName}>
          {tour.tourName}
        </h4>
        <p className="mt-1 text-xs font-bold text-[#9b4500]">
          {Number(tour.basePrice || 0).toLocaleString("vi-VN")}đ
        </p>
        
        <div className="mt-2 space-y-1 text-[10px] text-slate-500 font-semibold">
          <p>📅 Ngày đi: {tour.startDate ? new Date(tour.startDate).toLocaleDateString("vi-VN") : "Đang cập nhật"}</p>
          <p>👥 Còn trống: {tour.availableSeats} chỗ</p>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => router.push(`/tours/${tour.id}`)}
            className="rounded-full bg-[#f1f4f5] py-1.5 text-[10px] font-bold text-[#3e494b] hover:bg-[#dfe3e4] transition text-center cursor-pointer"
          >
            Chi tiết
          </button>
          
          <button
            type="button"
            onClick={() => router.push(`/booking?tourId=${tour.id}`)}
            className="rounded-full bg-[#00606c] py-1.5 text-[10px] font-bold text-white hover:bg-[#007b8a] transition text-center cursor-pointer"
          >
            Đặt tour
          </button>
        </div>

        <button
          type="button"
          onClick={() => onToggleFavorite(tour.id)}
          className={`mt-2 flex w-full items-center justify-center gap-1 rounded-full border py-1.5 text-[10px] font-bold transition cursor-pointer ${
            isFavorite
              ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
              : "border-[#e3e7e8] bg-white text-[#6e797b] hover:bg-[#f1f4f5]"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill={isFavorite ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
            className="h-3 w-3 text-red-500"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z" />
          </svg>
          {isFavorite ? "Đã thích" : "Yêu thích"}
        </button>
      </div>
    </div>
  );
}