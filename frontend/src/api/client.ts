import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

export interface ProviderPreset {
  label: string;
  base_url: string;
  default_model: string;
}

export interface AppConfig {
  provider: string;
  api_key: string;
  base_url: string;
  model: string;
  is_configured: boolean;
}

export async function fetchProviders(): Promise<Record<string, ProviderPreset>> {
  const { data } = await api.get("/config/providers");
  return data;
}

export async function fetchConfig(): Promise<AppConfig> {
  const { data } = await api.get("/config");
  return data;
}

export async function saveConfig(config: {
  provider?: string;
  api_key?: string;
  base_url?: string;
  model?: string;
}): Promise<AppConfig> {
  const { data } = await api.post("/config", config);
  return data;
}

export async function fetchExams() {
  const { data } = await api.get("/exam/exams");
  return data;
}

export async function startExam(examId: string = "ielts"): Promise<{
  session_id: string;
  examiner_message: string;
  current_part: string;
  question_index: number;
  exam_id: string;
}> {
  const { data } = await api.post("/exam/start", { exam_id: examId });
  return data;
}

export async function submitAnswer(sessionId: string, answer: string) {
  const { data } = await api.post("/exam/answer", {
    session_id: sessionId,
    answer,
  });
  return data;
}

export async function getReport(sessionId: string) {
  const { data } = await api.get(`/exam/report/${sessionId}`);
  return data;
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
