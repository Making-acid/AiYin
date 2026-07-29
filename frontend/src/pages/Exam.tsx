import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { startExam, submitAnswer } from "../api/exam";
import { VoiceInput } from "../components/VoiceInput";
import type { VoiceInputHandle } from "../components/VoiceInput";
import { ChatBubble } from "../components/ChatBubble";
import { Timer } from "../components/Timer";
import { Live2DCharacter } from "../components/Live2DCharacter";
import { useLive2DBehavior, useLanguage } from "../i18n";
import { useTrainingLanguage } from "../i18n/trainingLang";
import { AsrIndicator } from "../asr";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis";
import type { ChatMessage } from "../types";

type Phase = "intro" | "part1" | "part2_prep" | "part2_speaking" | "part3" | "finished";

interface CueCard {
  topic: string;
  prompt_lines: string[];
}

export function Exam() {
  const navigate = useNavigate();
  const { speak, stop: stopSpeech, isSupported: ttsSupported } = useSpeechSynthesis("standard", trainingLang);
  const [behavior] = useLive2DBehavior();
  const { t } = useLanguage();
  const { trainingLang } = useTrainingLanguage();
  const voiceRef = useRef<VoiceInputHandle>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const autoTimerRef = useRef<any>(null);
  const initRef = useRef(false);

  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [_currentPart, setCurrentPart] = useState("");
  const [isFinished, setIsFinished] = useState(false);
  const [loading, setLoading] = useState(false);
  const [live2dState, setLive2dState] = useState<"idle" | "speaking" | "listening">("idle");
  const [phase, setPhase] = useState<Phase>("intro");
  const [cueCard, setCueCard] = useState<CueCard | null>(null);
  const [recordingActive, setRecordingActive] = useState(false);
  const [recordingTimeLeft, setRecordingTimeLeft] = useState(0);
  const [prepSeconds, setPrepSeconds] = useState(60);
  const [speakSeconds, setSpeakSeconds] = useState(120);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    initExam();
  }, []);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const clearTimers = () => {
    if (autoTimerRef.current) {
      clearTimeout(autoTimerRef.current);
      autoTimerRef.current = null;
    }
  };

  const autoStopAndSend = useCallback(() => {
    if (voiceRef.current) {
      voiceRef.current.stop();
    }
    setRecordingActive(false);
    setRecordingTimeLeft(0);
  }, []);

  const startRecordingTimer = useCallback((seconds: number) => {
    setRecordingTimeLeft(seconds);
    setRecordingActive(true);
    clearTimers();

    if (voiceRef.current) {
      voiceRef.current.start();
    }

    autoTimerRef.current = setTimeout(() => {
      autoStopAndSend();
    }, seconds * 1000);
  }, [autoStopAndSend, clearTimers]);

  const handleExaminerSpeak = useCallback(
    (text: string, onEnd?: () => void) => {
      if (!ttsSupported) {
        onEnd?.();
        return;
      }
      setLive2dState("speaking");
      speak(text, undefined, () => {
        setLive2dState("idle");
        onEnd?.();
      });
    },
    [ttsSupported, speak]
  );

  const initExam = async () => {
    try {
      const data = await startExam();
      setSessionId(data.session_id);
      setCurrentPart(data.current_part);
      const msg: ChatMessage = { role: "examiner", content: data.examiner_message };
      setMessages([msg]);
      setPhase("part1");
      handleExaminerSpeak(data.examiner_message, () => {
        startRecordingTimer(45);
      });
    } catch (err) {
      console.error("Failed to start exam:", err);
    }
  };

  const sendAnswer = useCallback(
    async (text: string) => {
      if (!sessionId || loading) return;
      clearTimers();
      setRecordingActive(false);

      const userMsg: ChatMessage = { role: "user", content: text };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);

      try {
        const result = await submitAnswer(sessionId, text);

        if (result.next_question) {
          const examinerMsg: ChatMessage = { role: "examiner", content: result.next_question };
          setMessages((prev) => [...prev, examinerMsg]);
          handleTransition(result, examinerMsg);
        }
      } catch (err) {
        console.error("Failed to submit answer:", err);
        setLoading(false);
      }
    },
    [sessionId, loading, clearTimers, handleExaminerSpeak]
  );

  const handleTransition = (result: any, _examinerMsg: ChatMessage) => {
    setCurrentPart(result.current_part);
    setIsFinished(result.is_finished);
    setLoading(false);

    if (result.cue_card) {
      setCueCard(result.cue_card);
    } else {
      setCueCard(null);
    }

    if (result.is_finished) {
      setPhase("finished");
      return;
    }

    const part = result.current_part;

    if (part === "part1") {
      setPhase("part1");
      handleExaminerSpeak(result.next_question, () => {
        startRecordingTimer(45);
      });
    } else if (part === "part2_prep") {
      setPhase("part2_prep");
      setPrepSeconds(60);
      handleExaminerSpeak(result.next_question, () => {
        // Start 60s preparation countdown, then auto-start 120s speaking
        setTimeout(() => {
          setPhase("part2_speaking");
          setCueCard(null);
          setSpeakSeconds(120);
          // Send blank answer to trigger the "begin speaking" response
          submitAnswer(sessionId, "[preparation complete]").then((r) => {
            const beginMsg: ChatMessage = {
              role: "examiner",
              content: r.next_question || t("youMayBegin"),
            };
            setMessages((prev) => [...prev, beginMsg]);
            startRecordingTimer(120);
          });
        }, 60000);
      });
    } else if (part === "part2") {
      setPhase("part2_speaking");
      setSpeakSeconds(120);
      handleExaminerSpeak(result.next_question, () => {
        startRecordingTimer(120);
      });
    } else if (part === "part3_transition" || part === "part3") {
      setPhase("part3");
      handleExaminerSpeak(result.next_question, () => {
        startRecordingTimer(60);
      });
    }
  };

  const handleViewReport = () => {
    clearTimers();
    stopSpeech();
    navigate(`/report/${sessionId}`);
  };

  const handleStopRecording = () => {
    autoStopAndSend();
  };

  const partLabels: Record<string, string> = {
    intro: t("intro"),
    part1: t("part1"),
    part2_prep: t("part2Prep"),
    part2_speaking: t("part2Speak"),
    part3: t("part3"),
    finished: t("finished"),
  };

  return (
    <div className="page exam-page-split">
      <div className="live2d-panel">
        <Live2DCharacter
          modelPath="/third_party/live2d/models/haru/haru_greeter_t05.model3.json"
          state={live2dState}
          behavior={behavior}
          scale={0.85}
        />
      </div>

      <div className="chat-panel">
        <div className="exam-header">
          <button className="back-btn" onClick={() => { clearTimers(); stopSpeech(); navigate("/"); }}>
            {t("back")}
          </button>
          <h2>{partLabels[phase]}</h2>
          {phase === "part2_prep" && (
            <Timer seconds={prepSeconds} running={true} onComplete={() => {}} />
          )}
          {phase === "part2_speaking" && recordingActive && (
            <Timer seconds={speakSeconds} running={true} onComplete={() => {}} />
          )}
          {recordingActive && phase !== "part2_prep" && (
            <Timer seconds={recordingTimeLeft} running={true} onComplete={() => {}} />
          )}
        </div>

        {cueCard && (
          <div className="cue-card">
            <h3>{cueCard.topic}</h3>
            <ul>
              {cueCard.prompt_lines.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="chat-container" ref={chatRef}>
          {messages.map((msg, i) => (
            <ChatBubble key={i} message={msg} />
          ))}
          {loading && (
            <div className="chat-bubble examiner">
              <div className="bubble-avatar"></div>
              <div className="bubble-content">
                <div className="bubble-text typing">{t("thinking")}</div>
              </div>
            </div>
          )}
        </div>

        <div className="exam-input-area">
          {isFinished ? (
            <button className="btn-primary" onClick={handleViewReport}>
              {t("viewReport")}
            </button>
          ) : (
            <VoiceInput
              ref={voiceRef}
              onResult={sendAnswer}
              disabled={loading}
              onStart={() => setLive2dState("listening")}
              onEnd={() => setLive2dState("idle")}
            />
          )}
          {recordingActive && (
            <button className="btn-primary stop-record-btn" onClick={handleStopRecording}>
              {t("stopAndSend")}
            </button>
          )}
        </div>
      </div>
      <AsrIndicator />
    </div>
  );
}
