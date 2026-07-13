import { onValue, push, ref, set } from "firebase/database";
import { db } from "./firebase";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  createdAt?: number;
};

export async function saveChatMessage(
  sessionId: string,
  message: ChatMessage
) {
  const messagesRef = ref(db, `chat_sessions/${sessionId}/messages`);
  const newMessageRef = push(messagesRef);

  await set(newMessageRef, {
    role: message.role,
    content: message.content,
    createdAt: Date.now(),
  });
}

export function subscribeChatMessages(
  sessionId: string,
  callback: (messages: Array<ChatMessage & { id: string }>) => void
) {
  const messagesRef = ref(db, `chat_sessions/${sessionId}/messages`);

  return onValue(messagesRef, (snapshot) => {
    const value = snapshot.val();

    if (!value) {
      callback([]);
      return;
    }

    const messages = Object.entries(value).map(([id, item]) => ({
      id,
      ...(item as ChatMessage),
    }));

    callback(messages);
  });
}