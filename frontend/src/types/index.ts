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
  audio_analysis?: {
    status: "complete" | "not_provided";
    engine?: "faster_whisper" | "whisperx" | null;
    metrics?: {
      response_count: number;
      word_count: number;
      speech_seconds: number;
      articulation_rate_wpm: number | null;
      pause_count_over_0_25s: number;
      long_pause_count_over_1s: number;
      mean_internal_pause_seconds: number;
    } | null;
  };
}

export interface ExamMemoryAttempt {
  session_id: string;
  exam_id: string;
  completed_at: string;
  report: ScoreReport;
}

export interface ExamMemorySummary {
  attempt_count: number;
  averages: Record<ScoreCriterion, number | null>;
  weakest_criterion: Exclude<ScoreCriterion, "overall_band"> | null;
  attempts: ExamMemoryAttempt[];
}

export type ScoreCriterion =
  | "overall_band"
  | "fluency_coherence"
  | "lexical_resource"
  | "grammatical_range_accuracy"
  | "pronunciation";
