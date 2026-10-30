import {
  onValue,
  orderByChild,
  push,
  query,
  ref,
  serverTimestamp,
  set,
} from "firebase/database";
import { realtimeDb } from "./firebase";

export type FirebaseChatMessage = {
  id?: string;
  role: "user" | "assistant";
  message: string;
  createdAt?: number | object;
  tours?: Array<{
    id: string;
    tourName: string;
    basePrice: number | string;
    imageUrl: string;
    startDate: string;
    availableSeats: number;
  }>;
};

const BASE_PATH = "chilltrip/chats";

export function getOrCreateChatSessionId() {
  if (typeof window === "undefined") return "";

  const key = "chilltrip_chat_session_id";
  const currentSessionId = localStorage.getItem(key);

  if (currentSessionId) return currentSessionId;

  const newSessionId = crypto.randomUUID();
  localStorage.setItem(key, newSessionId);

  return newSessionId;
}

export async function saveChatMessage(
  sessionId: string,
  data: Omit<FirebaseChatMessage, "id" | "createdAt">
) {
  const messagesRef = ref(realtimeDb, `${BASE_PATH}/${sessionId}/messages`);
  const newMessageRef = push(messagesRef);

  await set(newMessageRef, {
    ...data,
    createdAt: serverTimestamp(),
  });
}

export function listenChatMessages(
  sessionId: string,
  callback: (messages: FirebaseChatMessage[]) => void
) {
  const messagesRef = query(
    ref(realtimeDb, `${BASE_PATH}/${sessionId}/messages`),
    orderByChild("createdAt")
  );

  return onValue(messagesRef, (snapshot) => {
    const value = snapshot.val();

    if (!value) {
      callback([]);
      return;
    }

    const messages = Object.entries(value).map(([id, item]) => ({
      id,
      ...(item as Omit<FirebaseChatMessage, "id">),
    }));

    callback(messages);
  });
}