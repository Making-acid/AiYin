import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { startExam, submitAnswer } from "../api/exam";
import { Timer } from "../components/Timer";
import { Live2DCharacter } from "../live2d";
import { useLive2DBehavior, useLanguage } from "../i18n";
import { useTrainingLanguage } from "../i18n/trainingLang";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis";
import { useDualRecording, type DualRecordingResult } from "../hooks/useDualRecording";
import { AsrProvider } from "../asr";

type Phase = "intro" | "part1" | "part2_prep" | "part2_speaking" | "part3" | "finished";

interface CueCard {
  topic: string;
  prompt_lines: string[];
}

export function Exam() {
  const navigate = useNavigate();
  const { trainingLang } = useTrainingLanguage();
  const { speak, stop: stopSpeech, isSupported: ttsSupported, mouthOpen } = useSpeechSynthesis("standard", trainingLang);
  const [behavior] = useLive2DBehavior();
  const { t } = useLanguage();
  const dual = useDualRecording();
  const audioBlobsRef = useRef<Blob[]>([]);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const initRef = useRef(false);

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
  const [speakSeconds, setSpeakSeconds] = useState(120);

  useEffect(() => { if (!initRef.current) { initRef.current = true; initExam(); } }, []);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
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

  const initExam = async () => {
    try {
      const data = await startExam();
      setSessionId(data.session_id);
      setPhase("part1");
      handleExaminerSpeak(data.examiner_message, () => startRecordingTimer(45));
    } catch (err) { console.error("Failed to start exam:", err); }
  };

  const handleTransition = (result: any) => {
    setIsFinished(result.is_finished);
    setLoading(false);
    if (result.cue_card) setCueCard(result.cue_card); else setCueCard(null);
    if (result.is_finished) { setPhase("finished"); return; }

    const part = result.current_part;
    if (part === "part1") {
      setPhase("part1");
      handleExaminerSpeak(result.next_question, () => startRecordingTimer(45));
    } else if (part === "part2_prep") {
      setPhase("part2_prep"); setPrepSeconds(60);
      handleExaminerSpeak(result.next_question, () => {
        const prepTimer = setTimeout(() => {
          setPhase("part2_speaking"); setCueCard(null); setSpeakSeconds(120);
          submitAnswer(sessionId, "[preparation complete]")
            .then(() => startRecordingTimer(120))
            .catch(() => startRecordingTimer(120));
        }, 60000);
        timersRef.current.push(prepTimer);
      });
    } else if (part === "part2") {
      setPhase("part2_speaking"); setSpeakSeconds(120);
      handleExaminerSpeak(result.next_question, () => startRecordingTimer(120));
    } else if (part === "part3_transition" || part === "part3") {
      setPhase("part3");
      handleExaminerSpeak(result.next_question, () => startRecordingTimer(60));
    }
  };

  const sendAnswer = useCallback(
    async (text: string) => {
      if (!sessionId || loading) return;
      setLoading(true);
      try {
        const result = await submitAnswer(sessionId, text);
        if (result.next_question) handleTransition(result);
      } catch (err) {
        console.error("Failed to submit answer:", err);
        setLoading(false);
        setSendError(t("asrServerConnectFailed"));
      }
    },
    [sessionId, loading]
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
      <Live2DCharacter
        modelPath="/third_party/live2d/models/haru/haru_greeter_t05.model3.json"
        mode="exam"
        state={live2dState}
        mouthOpen={mouthOpen}
        behavior={behavior}
      />

      <div className="exam-topbar">
        <button className="back-btn" onClick={() => { clearTimers(); stopSpeech(); navigate("/"); }}>
          {t("back")}
        </button>
        <span className="exam-phase-label">{partLabels[phase]}</span>
        <div className="exam-timers">
          {phase === "part2_prep" && <Timer seconds={prepSeconds} running={true} onComplete={() => {}} />}
          {phase === "part2_speaking" && recordingActive && <Timer seconds={speakSeconds} running={true} onComplete={() => {}} />}
          {recordingActive && phase !== "part2_prep" && <Timer seconds={recordingTimeLeft} running={true} onComplete={() => {}} />}
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
              disabled={loading}
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
