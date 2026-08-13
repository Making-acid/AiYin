import api from "./client";
import type { ChatMessage } from "../types";

export interface SavedChatSummary {
  session_id: string;
  exam_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  preview: string;
}

export interface SavedChat {
  session_id: string;
  exam_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: ChatMessage[];
}

export async function startFreeChat(examId: string = "ielts"): Promise<{
  session_id: string;
  reply: string;
  mode: string;
  exam_id: string;
}> {
  const { data } = await api.post("/chat/start", { exam_id: examId, mode: "free_chat" });
  return data;
}

export async function sendFreeChat(sessionId: string, text: string) {
  const { data } = await api.post("/chat/send", {
    session_id: sessionId,
    text,
  });
  return data;
}

export async function listFreeChats(): Promise<SavedChatSummary[]> {
  const { data } = await api.get("/chat/sessions");
  return data.sessions;
}

export async function loadFreeChat(sessionId: string): Promise<SavedChat> {
  const { data } = await api.get(`/chat/sessions/${sessionId}`);
  return data;
}

export async function deleteFreeChat(sessionId: string): Promise<void> {
  await api.delete(`/chat/sessions/${sessionId}`);
}
