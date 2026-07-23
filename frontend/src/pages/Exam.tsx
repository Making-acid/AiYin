import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { startExam, submitAnswer } from "../api/client";
import { VoiceInput } from "../components/VoiceInput";
import { ChatBubble } from "../components/ChatBubble";
import { Timer } from "../components/Timer";
import { Live2DCharacter, useLive2DBehavior, useLanguage } from "../components/Live2DCharacter";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis";
import type { ChatMessage } from "../types";

export function Exam() {
  const navigate = useNavigate();
  const { speak, stop: stopSpeech, isSupported: ttsSupported } = useSpeechSynthesis("standard");
  const [behavior] = useLive2DBehavior();
  const initRef = useRef(false);
  const { t } = useLanguage();
  const chatRef = useRef<HTMLDivElement>(null);

  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentPart, setCurrentPart] = useState("");
  const [isFinished, setIsFinished] = useState(false);
  const [loading, setLoading] = useState(false);
  const [live2dState, setLive2dState] = useState<"idle" | "speaking" | "listening">("idle");
  const [phase, setPhase] = useState<"intro" | "part1" | "part2_prep" | "part2_speaking" | "part3" | "finished">("intro");

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

  const initExam = async () => {
    try {
      const data = await startExam();
      setSessionId(data.session_id);
      setCurrentPart(data.current_part);
      const msg: ChatMessage = { role: "examiner", content: data.examiner_message };
      setMessages([msg]);
      setPhase("intro");
      if (ttsSupported) {
        setLive2dState("speaking");
        speak(data.examiner_message, undefined, () => setLive2dState("idle"));
      }
    } catch (err) {
      console.error("Failed to start exam:", err);
    }
  };

  const handleUserAnswer = useCallback(
    async (text: string) => {
      if (!sessionId || loading) return;
      setLive2dState("idle");

      const userMsg: ChatMessage = { role: "user", content: text };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);

      try {
        const result = await submitAnswer(sessionId, text);

        if (result.next_question) {
          const examinerMsg: ChatMessage = { role: "examiner", content: result.next_question };
          setMessages((prev) => [...prev, examinerMsg]);
          if (ttsSupported) {
            setLive2dState("speaking");
            speak(result.next_question, undefined, () => setLive2dState("idle"));
          }
        }

        setCurrentPart(result.current_part);
        setIsFinished(result.is_finished);

        if (result.current_part === "part1") setPhase("part1");
        else if (result.current_part === "part2_prep") setPhase("part2_prep");
        else if (result.current_part === "part2") setPhase("part2_speaking");
        else if (result.current_part === "part3" || result.current_part === "part3_transition") setPhase("part3");
        else if (result.is_finished) setPhase("finished");
      } catch (err) {
        console.error("Failed to submit answer:", err);
      } finally {
        setLoading(false);
      }
    },
    [sessionId, loading, ttsSupported, speak]
  );

  const handleViewReport = () => {
    stopSpeech();
    navigate(`/report/${sessionId}`);
  };

  const handleVoiceStart = () => setLive2dState("listening");
  const handleVoiceEnd = () => setLive2dState("idle");

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
          modelPath="/live2d/haru/haru_greeter_t05.model3.json"
          state={live2dState}
          behavior={behavior}
          scale={0.85}
        />
      </div>

      <div className="chat-panel">
        <div className="exam-header">
          <button className="back-btn" onClick={() => { stopSpeech(); navigate("/"); }}>
            {t("back")}
          </button>
          <h2>{partLabels[phase]}</h2>
          {phase === "part2_prep" && <Timer seconds={60} running={true} onComplete={() => {}} />}
          {phase === "part2_speaking" && <Timer seconds={120} running={true} onComplete={() => {}} />}
        </div>

        <div className="chat-container" ref={chatRef}>
          {messages.map((msg, i) => (
            <ChatBubble key={i} message={msg} />
          ))}
          {loading && (
            <div className="chat-bubble examiner">
              <div className="bubble-avatar">🤖</div>
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
            <VoiceInput onResult={handleUserAnswer} disabled={loading} onStart={handleVoiceStart} onEnd={handleVoiceEnd} />
          )}
        </div>
      </div>
    </div>
  );
}
