import api from "./client";

export interface ExamCueCard {
  topic: string;
  prompt_lines: string[];
  prep_seconds: number;
  speak_seconds: number;
}

export interface ExamStepResponse {
  next_question: string;
  is_finished: boolean;
  current_part: string;
  question_index: number;
  cue_card?: ExamCueCard;
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
  return data as ExamStepResponse;
}

export async function advanceExam(sessionId: string) {
  const { data } = await api.post("/exam/advance", {
    session_id: sessionId,
  });
  return data as ExamStepResponse;
}

export async function getReport(sessionId: string) {
  const { data } = await api.get(`/exam/report/${sessionId}`);
  return data;
}
