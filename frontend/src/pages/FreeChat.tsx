import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { startFreeChat, sendFreeChat } from "../api/client";
import { VoiceInput } from "../components/VoiceInput";
import { ChatBubble } from "../components/ChatBubble";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis";
import type { ChatMessage } from "../types";

export function FreeChat() {
  const navigate = useNavigate();
  const { speak, stop: stopSpeech, isSupported: ttsSupported } = useSpeechSynthesis();
  const chatRef = useRef<HTMLDivElement>(null);

  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
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
      if (ttsSupported) speak(data.reply);
    } catch (err) {
      console.error("Failed to start chat:", err);
    }
  };

  const handleUserMessage = async (text: string) => {
    if (!sessionId || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const result = await sendFreeChat(sessionId, text);
      if (result.reply) {
        const botMsg: ChatMessage = { role: "assistant", content: result.reply };
        setMessages((prev) => [...prev, botMsg]);
        if (ttsSupported) speak(result.reply);
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page free-chat-page">
      <div className="chat-header">
        <button className="back-btn" onClick={() => { stopSpeech(); navigate("/"); }}>
          ← Back
        </button>
        <h2>Free Chat</h2>
        <span className="chat-mode-badge">Practice Mode</span>
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

      <div className="chat-input-area">
        <VoiceInput onResult={handleUserMessage} disabled={loading} />
      </div>
    </div>
  );
}
