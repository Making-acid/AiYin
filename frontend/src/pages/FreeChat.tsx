import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { startFreeChat, sendFreeChat } from "../api/chat";
import { VoiceInput } from "../components/VoiceInput";
import { ChatBubble } from "../components/ChatBubble";
import { Live2DCharacter } from "../live2d";
import { useLive2DBehavior, useLanguage } from "../i18n";
import { useTrainingLanguage } from "../i18n/trainingLang";
import { AsrIndicator } from "../asr";
import { AsrProvider } from "../asr";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis";
import type { ChatMessage } from "../types";

export function FreeChat() {
  const navigate = useNavigate();
  const { trainingLang } = useTrainingLanguage();
  const { speak, stop: stopSpeech, isSupported: ttsSupported, mouthOpen } = useSpeechSynthesis("young", trainingLang);
  const [behavior] = useLive2DBehavior();
  const initRef = useRef(false);
  const { t } = useLanguage();
  const chatRef = useRef<HTMLDivElement>(null);

  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [live2dState, setLive2dState] = useState<"idle" | "speaking" | "listening">("idle");

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    initChat();
  }, []);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const initChat = async () => {
    try {
      const data = await startFreeChat();
      setSessionId(data.session_id);
      const msg: ChatMessage = { role: "assistant", content: data.reply };
      setMessages([msg]);
      if (ttsSupported) {
        setLive2dState("speaking");
        speak(data.reply, undefined, () => setLive2dState("idle"));
      }
    } catch (err) {
      console.error("Failed to start chat:", err);
    }
  };

  const handleUserMessage = useCallback(
    async (text: string) => {
      if (!sessionId || loading) return;
      setLive2dState("idle");

      const userMsg: ChatMessage = { role: "user", content: text };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);

      try {
        const result = await sendFreeChat(sessionId, text);
        if (result.reply) {
          const botMsg: ChatMessage = { role: "assistant", content: result.reply };
          setMessages((prev) => [...prev, botMsg]);
          if (ttsSupported) {
            setLive2dState("speaking");
            speak(result.reply, undefined, () => setLive2dState("idle"));
          }
        }
      } catch (err) {
        console.error("Failed to send message:", err);
      } finally {
        setLoading(false);
      }
    },
    [sessionId, loading, ttsSupported, speak]
  );

  const handleVoiceStart = () => setLive2dState("listening");
  const handleVoiceEnd = () => setLive2dState("idle");

  return (
    <AsrProvider mode="free_chat">
    <div className="page free-chat-page-split">
      <div className="live2d-panel">
        <Live2DCharacter
          modelPath="/third_party/live2d/models/mao/mao_pro.model3.json"
          mode="free_chat"
          state={live2dState}
          mouthOpen={mouthOpen}
          behavior={behavior}
        />
      </div>

      <div className="chat-panel">
        <div className="chat-header">
          <button className="back-btn" onClick={() => { stopSpeech(); navigate("/"); }}>
            {t("back")}
          </button>
          <h2>{t("freeChat")}</h2>
          <span className="chat-mode-badge">{t("practiceMode")}</span>
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

        <div className="chat-input-area">
          <VoiceInput onResult={handleUserMessage} disabled={loading} onStart={handleVoiceStart} onEnd={handleVoiceEnd} />
        </div>
      </div>
      <AsrIndicator mode="free_chat" />
    </div>
    </AsrProvider>
  );
}
