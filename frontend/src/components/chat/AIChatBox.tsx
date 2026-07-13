"use client";

import { useEffect, useRef, useState } from "react";
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
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState<FirebaseChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const id = getOrCreateChatSessionId();
    setSessionId(id);

    const unsubscribe = listenChatMessages(id, setMessages);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
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

      const response = await fetch(`${apiBaseUrl}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          message: text,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Có lỗi xảy ra khi gọi AI.");
      }

      await saveChatMessage(sessionId, {
        role: "assistant",
        message: data.reply || "Mình chưa có câu trả lời phù hợp.",
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
        <div className="relative grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-[34px]">
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

          <div className="relative min-h-0 overflow-y-auto px-4 py-4 text-sm">
            {messages.length === 0 && (
              <div className="space-y-3">
                <div className="mr-auto max-w-[88%] rounded-[24px] rounded-tl-md border border-white bg-white/90 px-4 py-3 leading-6 text-[#284247] shadow-[0_10px_28px_rgba(0,96,108,0.08)]">
                  Xin chào, mình là trợ lý ChillTrip. Bạn muốn đi đâu hôm nay?
                </div>

                <div className="flex flex-wrap gap-2">
                  {quickSuggestions.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => handleSend(item)}
                      className="rounded-full border border-[#cfe5e8] bg-white/80 px-3 py-2 text-xs font-bold text-[#00606c] shadow-sm transition hover:-translate-y-0.5 hover:border-[#007b8a] hover:bg-white"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={
                    msg.role === "user"
                      ? "ml-auto max-w-[82%] rounded-[24px] rounded-tr-md bg-[linear-gradient(135deg,#00606c_0%,#007b8a_100%)] px-4 py-3 leading-6 text-white shadow-[0_12px_28px_rgba(0,96,108,0.22)]"
                      : "mr-auto max-w-[88%] rounded-[24px] rounded-tl-md border border-white bg-white/90 px-4 py-3 leading-6 text-[#26383d] shadow-[0_10px_28px_rgba(0,96,108,0.08)]"
                  }
                >
                  {msg.message}
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