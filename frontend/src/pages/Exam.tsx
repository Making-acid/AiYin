import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { startExam, submitAnswer } from "../api/client";
import { VoiceInput } from "../components/VoiceInput";
import { ChatBubble } from "../components/ChatBubble";
import { Timer } from "../components/Timer";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis";
import type { ChatMessage } from "../types";

export function Exam() {
  const navigate = useNavigate();
  const { speak, stop: stopSpeech, isSupported: ttsSupported } = useSpeechSynthesis();
  const chatRef = useRef<HTMLDivElement>(null);

  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentPart, setCurrentPart] = useState("");
  const [isFinished, setIsFinished] = useState(false);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<"intro" | "part1" | "part2_prep" | "part2_speaking" | "part3" | "finished">("intro");

  useEffect(() => {
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
      if (ttsSupported) speak(data.examiner_message);
      setPhase("intro");
    } catch (err) {
      console.error("Failed to start exam:", err);
    }
  };

  const handleUserAnswer = async (text: string) => {
    if (!sessionId || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const result = await submitAnswer(sessionId, text);

      if (result.next_question) {
        const examinerMsg: ChatMessage = { role: "examiner", content: result.next_question };
        setMessages((prev) => [...prev, examinerMsg]);
        if (ttsSupported) speak(result.next_question);
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
  };

  const handleViewReport = () => {
    stopSpeech();
    navigate(`/report/${sessionId}`);
  };

  const partLabels: Record<string, string> = {
    intro: "Introduction",
    part1: "Part 1: Interview",
    part2_prep: "Part 2: Preparation",
    part2_speaking: "Part 2: Long Turn",
    part3: "Part 3: Discussion",
    finished: "Test Complete",
  };

  return (
    <div className="page exam-page">
      <div className="exam-header">
        <button className="back-btn" onClick={() => { stopSpeech(); navigate("/"); }}>
          ← Back
        </button>
        <h2>{partLabels[phase]}</h2>
        {phase === "part2_prep" && (
          <Timer seconds={60} running={true} onComplete={() => {}} />
        )}
        {phase === "part2_speaking" && (
          <Timer seconds={120} running={true} onComplete={() => {}} />
        )}
      </div>

      <div className="chat-container" ref={chatRef}>
        {messages.map((msg, i) => (
          <ChatBubble key={i} message={msg} />
        ))}
        {loading && (
          <div className="chat-bubble examiner">
            <div className="bubble-avatar">🤖</div>
            <div className="bubble-content">
              <div className="bubble-text typing">Thinking...</div>
            </div>
          </div>
        )}
      </div>

      <div className="exam-input-area">
        {isFinished ? (
          <button className="btn-primary" onClick={handleViewReport}>
            View Score Report →
          </button>
        ) : (
          <VoiceInput onResult={handleUserAnswer} disabled={loading} />
        )}
      </div>
    </div>
  );
}
