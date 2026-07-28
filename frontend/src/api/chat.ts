import api from "./client";

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
