export interface ChatMessage {
  role: "user" | "examiner" | "assistant";
  content: string;
}

export interface ExamState {
  sessionId: string;
  currentPart: string;
  questionIndex: number;
  isFinished: boolean;
  messages: ChatMessage[];
}

export interface ScoreReport {
  overall_band: number;
  fluency_coherence: number;
  lexical_resource: number;
  grammatical_range_accuracy: number;
  pronunciation: number;
  summary: string;
  suggestions: string[];
}

export interface ExamReport {
  session_id: string;
  report: ScoreReport;
  conversation: { role: string; content: string }[];
}
