"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Mail,
  Phone,
  Send,
  Search,
  Paperclip,
  Smile,
  MessageCircle,
  CheckCheck,
  User,
  CalendarDays,
  Eye,
} from "lucide-react";

const API_BASE_URL = "/backend-api";

type Customer = {
  id: string | number;
  customer_code: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  total_spent?: string | number;
  booking_count?: string | number;
};

type ApiMessage = {
  id: string | number;
  customer_id: string | number;
  sender_type: "ADMIN" | "CUSTOMER";
  message_content: string;
  is_read?: boolean;
  created_at: string;
};

function getInitials(name?: string | null) {
  if (!name) return "KH";

  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function getAvatarColor(name?: string | null) {
  const colors = [
    "bg-cyan-100 text-cyan-700",
    "bg-orange-100 text-orange-700",
    "bg-sky-100 text-sky-700",
    "bg-emerald-100 text-emerald-700",
    "bg-violet-100 text-violet-700",
  ];

  if (!name) return colors[0];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}

function formatTime(value?: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMoney(value?: string | number | null) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

export default function AdminCustomerMessages({
  customerId,
}: {
  customerId: string;
}) {
  const router = useRouter();
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const quickMessages = useMemo(
    () => [
      "Chào anh/chị, ChillTrip xin hỗ trợ thông tin đặt tour ạ.",
      "Anh/chị vui lòng kiểm tra lại thông tin liên hệ giúp em nhé.",
      "ChillTrip đã ghi nhận yêu cầu và sẽ phản hồi sớm nhất.",
      "Cảm ơn anh/chị đã tin tưởng sử dụng dịch vụ của ChillTrip.",
    ],
    []
  );

  async function loadData() {
    try {
      setLoading(true);

      const [customerRes, messagesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/customers/${customerId}`, {
          method: "GET",
          cache: "no-store",
        }),
        fetch(`${API_BASE_URL}/admin/customers/${customerId}/messages`, {
          method: "GET",
          cache: "no-store",
        }),
      ]);

      if (!customerRes.ok) {
        setCustomer(null);
        return;
      }

      const customerJson = await customerRes.json();
      setCustomer(customerJson.data?.customer || null);

      if (messagesRes.ok) {
        const messagesJson = await messagesRes.json();
        setMessages(messagesJson.data || []);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error("LOAD_CUSTOMER_MESSAGES_ERROR:", error);
      setCustomer(null);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSend() {
    const text = content.trim();
    if (!text || sending) return;

    try {
      setSending(true);

      const res = await fetch(
        `${API_BASE_URL}/admin/customers/${customerId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ content: text }),
        }
      );

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        alert(json?.message || "Gửi tin nhắn thất bại");
        return;
      }

      const created = Array.isArray(json?.data) ? json.data[0] : json?.data;

      if (created) {
        setMessages((prev) => [...prev, created]);
      } else {
        await loadData();
      }

      setContent("");
    } catch (error) {
      console.error("SEND_MESSAGE_ERROR:", error);
      alert("Không thể gửi tin nhắn");
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [customerId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (loading) {
    return (
      <div className="rounded-[2rem] bg-white p-10 text-center font-bold text-[#00606c]">
        Đang tải khung nhắn tin...
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="rounded-[2rem] bg-white p-10 text-center font-bold text-[#ba1a1a]">
        Không tìm thấy khách hàng.
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-110px)] min-h-[720px] flex-col overflow-hidden rounded-[2.5rem] border border-[#dfe3e4] bg-white shadow-[0_18px_50px_rgba(0,0,0,0.06)]">
      <header className="flex items-center justify-between border-b border-[#ebeeef] bg-[#f8fbfc] px-6 py-5">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/admin/customers")}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#00606c] shadow-sm transition hover:bg-[#9defff]/30"
            title="Quay lại"
          >
            <ArrowLeft size={20} />
          </button>

          <div
            className={`flex h-14 w-14 items-center justify-center rounded-full text-lg font-black ${getAvatarColor(
              customer.full_name
            )}`}
          >
            {getInitials(customer.full_name)}
          </div>

          <div>
            <h1 className="text-xl font-black text-[#00606c]">
              {customer.full_name}
            </h1>
            <p className="text-xs font-semibold text-[#6e797b]">
              #{customer.customer_code} • {customer.email || "Chưa có email"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={customer.phone ? `tel:${customer.phone}` : undefined}
            onClick={(e) => {
              if (!customer.phone) {
                e.preventDefault();
                alert("Khách hàng chưa có số điện thoại.");
              }
            }}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#00606c] shadow-sm hover:bg-[#9defff]/30"
            title="Gọi khách hàng"
          >
            <Phone size={18} />
          </a>

          <a
            href={customer.email ? `mailto:${customer.email}` : undefined}
            onClick={(e) => {
              if (!customer.email) {
                e.preventDefault();
                alert("Khách hàng chưa có email.");
              }
            }}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#00606c] shadow-sm hover:bg-[#9defff]/30"
            title="Gửi email"
          >
            <Mail size={18} />
          </a>

          <button
            onClick={() => router.push(`/admin/customers/${customerId}`)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#00606c] shadow-sm hover:bg-[#9defff]/30"
            title="Xem hồ sơ"
          >
            <Eye size={18} />
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[330px_1fr]">
        <aside className="hidden border-r border-[#ebeeef] bg-[#f8fbfc] p-5 lg:block">
          <div className="mb-5 flex items-center rounded-2xl bg-white px-4 py-3 shadow-sm">
            <Search size={17} className="mr-2 text-[#00606c]" />
            <input
              placeholder="Tìm trong hội thoại..."
              className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-[#9aa4a6]"
            />
          </div>

          <div className="rounded-[2rem] bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-full text-lg font-black ${getAvatarColor(
                  customer.full_name
                )}`}
              >
                {getInitials(customer.full_name)}
              </div>
              <div>
                <p className="font-black text-[#181c1d]">
                  {customer.full_name}
                </p>
                <p className="text-xs text-[#6e797b]">Khách hàng</p>
              </div>
            </div>

            <InfoLine label="Số điện thoại" value={customer.phone || "-"} />
            <InfoLine label="Email" value={customer.email || "-"} />
            <InfoLine
              label="Tổng đặt tour"
              value={`${Number(customer.booking_count || 0)} chuyến`}
            />
            <InfoLine
              label="Tổng chi tiêu"
              value={formatMoney(customer.total_spent)}
            />
          </div>

          <div className="mt-5 rounded-[2rem] bg-[#00606c] p-5 text-white">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
              <MessageCircle size={22} />
            </div>
            <h3 className="mb-2 font-black">Gợi ý chăm sóc</h3>
            <p className="text-sm leading-6 text-[#ddf9ff]">
              Ưu tiên phản hồi nhanh các câu hỏi về thanh toán, lịch khởi hành
              và giấy tờ hành khách.
            </p>
          </div>
        </aside>

        <main className="flex min-h-0 min-w-0 flex-col bg-white">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto bg-[radial-gradient(circle_at_top_left,_rgba(157,239,255,0.25),_transparent_30%),linear-gradient(180deg,_#ffffff,_#f8fbfc)] px-6 py-7">
            <div className="text-center">
              <span className="rounded-full bg-[#f1f4f5] px-4 py-2 text-xs font-bold text-[#6e797b]">
                Hội thoại với khách hàng
              </span>
            </div>

            {messages.length === 0 ? (
              <div className="flex h-full min-h-[300px] items-center justify-center">
                <div className="max-w-sm rounded-[2rem] bg-white p-8 text-center shadow-sm">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#9defff] text-[#00606c]">
                    <MessageCircle size={28} />
                  </div>
                  <h3 className="mb-2 text-lg font-black text-[#00606c]">
                    Chưa có tin nhắn
                  </h3>
                  <p className="text-sm leading-6 text-[#6e797b]">
                    Bắt đầu gửi tin nhắn để lưu lịch sử chăm sóc khách hàng.
                  </p>
                </div>
              </div>
            ) : (
              messages.map((message) => {
                const isAdmin = message.sender_type === "ADMIN";

                return (
                  <div
                    key={message.id}
                    className={`flex ${
                      isAdmin ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`flex max-w-[78%] gap-3 ${
                        isAdmin ? "flex-row-reverse" : "flex-row"
                      }`}
                    >
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                          isAdmin
                            ? "bg-[#00606c] text-white"
                            : getAvatarColor(customer.full_name)
                        }`}
                      >
                        {isAdmin ? "AD" : getInitials(customer.full_name)}
                      </div>

                      <div>
                        <div
                          className={`rounded-[1.5rem] px-5 py-3 text-sm font-medium leading-6 shadow-sm ${
                            isAdmin
                              ? "rounded-tr-md bg-[#00606c] text-white"
                              : "rounded-tl-md border border-[#ebeeef] bg-white text-[#181c1d]"
                          }`}
                        >
                          {message.message_content}
                        </div>

                        <div
                          className={`mt-1 flex items-center gap-1 text-[11px] text-[#6e797b] ${
                            isAdmin ? "justify-end" : "justify-start"
                          }`}
                        >
                          <CalendarDays size={12} />
                          <span>{formatTime(message.created_at)}</span>
                          {isAdmin && <CheckCheck size={13} />}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            <div ref={bottomRef} />
          </div>

          <footer className="shrink-0 border-t border-[#ebeeef] bg-white p-5">
            <div className="mb-4 flex gap-2 overflow-x-auto">
              {quickMessages.map((item) => (
                <button
                  key={item}
                  onClick={() => setContent(item)}
                  className="shrink-0 rounded-full bg-[#f1f4f5] px-4 py-2 text-xs font-bold text-[#00606c] transition hover:bg-[#9defff]/40"
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="flex items-end gap-3 rounded-[2rem] border border-[#dfe3e4] bg-[#f8fbfc] p-3 transition focus-within:border-[#00606c] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#00606c]/10">
              <button
                type="button"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#6e797b] hover:bg-[#f1f4f5] hover:text-[#00606c]"
                title="Đính kèm"
              >
                <Paperclip size={20} />
              </button>

              <textarea
                rows={1}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Nhập nội dung tin nhắn..."
                className="max-h-32 min-h-11 flex-1 resize-none bg-transparent py-3 text-sm font-semibold leading-6 text-[#181c1d] outline-none placeholder:text-[#9aa4a6]"
              />

              <button
                type="button"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#6e797b] hover:bg-[#f1f4f5] hover:text-[#00606c]"
                title="Biểu cảm"
              >
                <Smile size={20} />
              </button>

              <button
                type="button"
                onClick={handleSend}
                disabled={!content.trim() || sending}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#00606c] text-white shadow-lg shadow-[#00606c]/20 transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40"
                title="Gửi tin nhắn"
              >
                <Send size={19} />
              </button>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-t border-[#ebeeef] py-3 text-sm">
      <span className="font-bold text-[#6e797b]">{label}</span>
      <span className="text-right font-black text-[#181c1d]">{value}</span>
    </div>
  );
}