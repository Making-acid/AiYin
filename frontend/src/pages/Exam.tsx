import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { advanceExam, startExam, submitAnswer, type ExamStepResponse } from "../api/exam";
import { Timer } from "../components/Timer";
import { HaruCharacter } from "../live2d";
import { useLive2DBehavior, useLanguage } from "../i18n";
import { useTrainingLanguage } from "../i18n/trainingLang";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis";
import { useDualRecording, type DualRecordingResult } from "../hooks/useDualRecording";
import { AsrProvider } from "../asr";

type Phase = "intro" | "part1" | "part2_prep" | "part2_speaking" | "part3" | "finished";

interface CueCard {
  topic: string;
  prompt_lines: string[];
  prep_seconds: number;
  speak_seconds: number;
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

export function Exam() {
  const navigate = useNavigate();
  const { trainingLang } = useTrainingLanguage();
  const { speak, stop: stopSpeech, isSupported: ttsSupported, mouthOpen } = useSpeechSynthesis("standard", trainingLang);
  const [behavior] = useLive2DBehavior();
  const { t } = useLanguage();
  const dual = useDualRecording();
  const stopDualRecording = dual.stop;
  const audioBlobsRef = useRef<Blob[]>([]);
  const timersRef = useRef<ReturnType<typeof setInterval>[]>([]);
  const sessionIdRef = useRef("");
  const loadingRef = useRef(false);
  const initRef = useRef(false);
  const speakSecondsRef = useRef(120);
  const handleTransitionRef = useRef<(result: ExamStepResponse) => void>(() => {});

  const [sessionId, setSessionId] = useState("");
  const [isFinished, setIsFinished] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendError, setSendError] = useState("");
  const [live2dState, setLive2dState] = useState<"idle" | "speaking" | "listening">("idle");
  const [phase, setPhase] = useState<Phase>("intro");
  const [cueCard, setCueCard] = useState<CueCard | null>(null);
  const [recordingActive, setRecordingActive] = useState(false);
  const [recordingTimeLeft, setRecordingTimeLeft] = useState(0);
  const [prepSeconds, setPrepSeconds] = useState(60);

  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);
  useEffect(() => { loadingRef.current = loading; }, [loading]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => {
      clearTimeout(id);
      clearInterval(id);
    });
    timersRef.current = [];
  }, []);

  const handleExaminerSpeak = useCallback(
    (text: string, onEnd?: () => void) => {
      if (!ttsSupported) { onEnd?.(); return; }
      setLive2dState("speaking");
      speak(text, undefined, () => { setLive2dState("idle"); onEnd?.(); });
    },
    [ttsSupported, speak]
  );

  const advanceToNextPrompt = useCallback(async () => {
    if (!sessionIdRef.current || loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setSendError("");
    try {
      const result = await advanceExam(sessionIdRef.current);
      handleTransitionRef.current(result);
    } catch (err) {
      console.error("Failed to advance exam:", err);
      loadingRef.current = false;
      setLoading(false);
      setSendError(t("asrServerConnectFailed"));
    }
  }, [t]);

  const sendAnswer = useCallback(
    async (text: string) => {
      if (!sessionIdRef.current || loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      setSendError("");
      try {
        const result = await submitAnswer(sessionIdRef.current, text);
        handleTransitionRef.current(result);
      } catch (err) {
        console.error("Failed to submit answer:", err);
        loadingRef.current = false;
        setLoading(false);
        setSendError(t("asrServerConnectFailed"));
      }
    },
    [t]
  );

  // Handle dual recording result: save audio, send text to LLM
  const handleDualResult = useCallback(
    (result: DualRecordingResult) => {
      setRecordingActive(false);
      if (result.audio.size > 100) audioBlobsRef.current.push(result.audio);
      if (result.text.trim()) sendAnswer(result.text.trim());
    },
    [sendAnswer]
  );

  // Auto-stop: timer expires → stop recording, save audio, submit
  const autoStopAndSend = useCallback(() => {
    dual.stop().then(handleDualResult);
    setRecordingTimeLeft(0);
  }, [dual, handleDualResult]);

  // Countdown timer: interval decrements the display, timeout auto-stops recording
  const startRecordingTimer = useCallback((seconds: number) => {
    clearTimers();
    setRecordingTimeLeft(seconds);
    setRecordingActive(true);
    dual.start();

    // UI countdown
    let remaining = seconds;
    const countdown = setInterval(() => {
      remaining--;
      setRecordingTimeLeft(Math.max(0, remaining));
      if (remaining <= 0) clearInterval(countdown);
    }, 1000);
    timersRef.current.push(countdown as unknown as ReturnType<typeof setTimeout>);

    // Auto-stop
    const autoStop = setTimeout(() => autoStopAndSend(), seconds * 1000);
    timersRef.current.push(autoStop);
  }, [clearTimers, dual, autoStopAndSend]);

  const handleTransition = useCallback((result: ExamStepResponse) => {
    setIsFinished(result.is_finished);
    setLoading(false);
    loadingRef.current = false;
    if (result.cue_card) {
      setCueCard(result.cue_card);
      setPrepSeconds(result.cue_card.prep_seconds);
      speakSecondsRef.current = result.cue_card.speak_seconds;
    } else {
      setCueCard(null);
    }
    if (result.is_finished) {
      setPhase("finished");
      setRecordingActive(false);
      if (result.next_question) handleExaminerSpeak(result.next_question);
      return;
    }

    const part = result.current_part;
    if (part === "part1") {
      setPhase("part1");
      handleExaminerSpeak(result.next_question, () => startRecordingTimer(45));
    } else if (part === "part2_prep") {
      const duration = result.cue_card?.prep_seconds ?? 60;
      setPhase("part2_prep");
      handleExaminerSpeak(result.next_question, () => {
        const prepTimer = setTimeout(() => {
          setCueCard(null);
          void advanceToNextPrompt();
        }, duration * 1000);
        timersRef.current.push(prepTimer);
      });
    } else if (part === "part2") {
      const duration = result.question_index === 0 ? speakSecondsRef.current : 45;
      setPhase("part2_speaking");
      handleExaminerSpeak(result.next_question, () => startRecordingTimer(duration));
    } else if (part === "part3_transition") {
      setPhase("part3");
      handleExaminerSpeak(result.next_question, () => { void advanceToNextPrompt(); });
    } else if (part === "part3") {
      setPhase("part3");
      handleExaminerSpeak(result.next_question, () => startRecordingTimer(60));
    }
  }, [advanceToNextPrompt, handleExaminerSpeak, startRecordingTimer]);

  useEffect(() => {
    handleTransitionRef.current = handleTransition;
  }, [handleTransition]);

  const initExam = useCallback(async () => {
    try {
      const data = await startExam();
      setSessionId(data.session_id);
      setPhase("part1");
      handleExaminerSpeak(data.examiner_message, () => startRecordingTimer(45));
    } catch (err) {
      console.error("Failed to start exam:", err);
    }
  }, [handleExaminerSpeak, startRecordingTimer]);

  useEffect(() => {
    if (!initRef.current) {
      initRef.current = true;
      void initExam();
    }
  }, [initExam]);

  useEffect(() => {
    return () => {
      clearTimers();
      void stopDualRecording().catch(() => {});
      stopSpeech();
    };
  }, [clearTimers, stopDualRecording, stopSpeech]);

  // Toggle mic button
  const handleMicToggle = () => {
    if (dual.isRecording) {
      dual.stop().then(handleDualResult);
    } else {
      dual.start();
      setRecordingActive(true);
    }
  };

  const handleViewReport = () => {
    clearTimers();
    stopSpeech();
    navigate(`/report/${sessionId}`);
  };

  const partLabels: Record<string, string> = {
    intro: t("intro"), part1: t("part1"), part2_prep: t("part2Prep"),
    part2_speaking: t("part2Speak"), part3: t("part3"), finished: t("finished"),
  };

  return (
    <AsrProvider mode="exam">
    <div className="page exam-fullscreen">
      <HaruCharacter
        state={loading && live2dState === "idle" ? "thinking" : live2dState}
        mouthOpen={mouthOpen}
        behavior={behavior}
      />

      <div className="exam-topbar">
        <button className="back-btn" onClick={() => { clearTimers(); stopSpeech(); navigate("/"); }}>
          {t("back")}
        </button>
        <span className="exam-phase-label">{partLabels[phase]}</span>
        <div className="exam-timers">
          {phase === "part2_prep" && <Timer seconds={prepSeconds} running={true} />}
          {recordingActive && phase !== "part2_prep" && (
            <div className={`timer ${recordingTimeLeft <= 30 ? "warning" : ""}`}>
              {formatTime(recordingTimeLeft)}
            </div>
          )}
        </div>
      </div>

      {cueCard && (
        <div className="exam-cuecard">
          <h3>{cueCard.topic}</h3>
          <ul>{cueCard.prompt_lines.map((line, i) => <li key={i}>{line}</li>)}</ul>
        </div>
      )}

      {loading && <div className="exam-thinking">{t("thinking")}</div>}
      {dual.error && <div className="exam-thinking error">{t(dual.error)}</div>}
      {sendError && <div className="exam-thinking error">{sendError}</div>}

      <div className="exam-bottombar">
        {isFinished ? (
          <button className="btn-primary" onClick={handleViewReport}>{t("viewReport")}</button>
        ) : (
          <>
            <button
              className={`mic-button ${dual.isRecording ? "recording" : ""}`}
              onClick={handleMicToggle}
              disabled={
                loading ||
                phase === "part2_prep" ||
                (live2dState === "speaking" && !dual.isRecording)
              }
            >
              {dual.isRecording ? t("stop") : t("speak")}
            </button>
            {recordingActive && (
              <button className="btn-primary" onClick={handleMicToggle}>{t("stopAndSend")}</button>
            )}
          </>
        )}
      </div>
    </div>
    </AsrProvider>
  );
}
