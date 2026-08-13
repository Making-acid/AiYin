import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { startFreeChat, sendFreeChat, listFreeChats, loadFreeChat, deleteFreeChat, type SavedChatSummary } from "../api/chat";
import { VoiceInput } from "../components/VoiceInput";
import { ChatBubble } from "../components/ChatBubble";
import { MaoCharacter } from "../live2d";
import { useLive2DBehavior, useLanguage } from "../i18n";
import { useTrainingLanguage } from "../i18n/trainingLang";
import { AsrIndicator } from "../asr";
import { AsrProvider } from "../asr";
import { useCharacterSpeech } from "../hooks/useCharacterSpeech";
import type { ChatMessage } from "../types";

export function FreeChat() {
  const navigate = useNavigate();
  const { trainingLang } = useTrainingLanguage();
  const { speak, stop: stopSpeech, isSupported: ttsSupported, mouthValue } = useCharacterSpeech("mao", trainingLang);
  const [behavior] = useLive2DBehavior();
  const initRef = useRef(false);
  const { t } = useLanguage();
  const chatRef = useRef<HTMLDivElement>(null);

  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [live2dState, setLive2dState] = useState<"idle" | "speaking" | "listening">("idle");
  const [savedChats, setSavedChats] = useState<SavedChatSummary[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    bootstrapChat();
  }, []);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const initChat = async () => {
    setError("");
    try {
      const data = await startFreeChat();
      setSessionId(data.session_id);
      const msg: ChatMessage = { role: "assistant", content: data.reply };
      setMessages([msg]);
      await refreshHistory();
      if (ttsSupported) {
        setLive2dState("speaking");
        speak(data.reply, undefined, () => setLive2dState("idle"));
      }
    } catch (err) {
      console.error("Failed to start chat:", err);
      setError(t("chatStartFailed"));
    }
  };

  const bootstrapChat = async () => {
    try {
      const history = await listFreeChats();
      setSavedChats(history);
      if (history.length > 0) {
        const saved = await loadFreeChat(history[0].session_id);
        setSessionId(saved.session_id);
        setMessages(saved.messages);
        return;
      }
    } catch (err) {
      console.error("Failed to restore latest chat:", err);
    }
    await initChat();
  };

  const refreshHistory = async () => {
    try {
      setSavedChats(await listFreeChats());
    } catch (err) {
      console.error("Failed to load saved chats:", err);
    }
  };

  const handleNewChat = async () => {
    stopSpeech();
    setLoading(false);
    await initChat();
  };

  const handleLoadChat = async (id: string) => {
    if (id === sessionId) return;
    stopSpeech();
    setError("");
    setLoading(true);
    try {
      const saved = await loadFreeChat(id);
      setSessionId(saved.session_id);
      setMessages(saved.messages);
      setHistoryOpen(false);
    } catch (err) {
      console.error("Failed to restore chat:", err);
      setError(t("chatLoadFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteChat = async (id: string) => {
    if (!window.confirm(t("deleteChatConfirm"))) return;
    try {
      await deleteFreeChat(id);
      if (id === sessionId) await initChat();
      else await refreshHistory();
    } catch (err) {
      console.error("Failed to delete chat:", err);
      setError(t("chatDeleteFailed"));
    }
  };

  const handleUserMessage = useCallback(
    async (text: string) => {
      if (!sessionId || loading) return;
      setError("");
      setLive2dState("idle");

      const userMsg: ChatMessage = { role: "user", content: text };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);

      try {
        const result = await sendFreeChat(sessionId, text);
        if (result.reply) {
          const botMsg: ChatMessage = { role: "assistant", content: result.reply };
          setMessages((prev) => [...prev, botMsg]);
          refreshHistory();
          if (ttsSupported) {
            setLive2dState("speaking");
            speak(result.reply, undefined, () => setLive2dState("idle"));
          }
        }
      } catch (err) {
        console.error("Failed to send message:", err);
        setError(t("chatSendFailed"));
        setLive2dState("idle");
      } finally {
        setLoading(false);
      }
    },
    [sessionId, loading, ttsSupported, speak, t]
  );

  const handleVoiceStart = () => setLive2dState("listening");
  const handleVoiceEnd = () => setLive2dState("idle");

  return (
    <AsrProvider mode="free_chat">
    <div className="page free-chat-page-split">
      <div className="live2d-panel">
        <MaoCharacter
          state={loading && live2dState === "idle" ? "thinking" : live2dState}
          mouthValue={mouthValue}
          behavior={behavior}
        />
      </div>

      <div className="chat-panel">
        <div className="chat-header">
          <button className="back-btn" onClick={() => { stopSpeech(); navigate("/"); }}>
            {t("back")}
          </button>
          <h2>{t("freeChat")}</h2>
          <button className="chat-history-btn" onClick={() => { setHistoryOpen((open) => !open); refreshHistory(); }}>
            {t("chatHistory")}
          </button>
          <button className="chat-new-btn" onClick={handleNewChat}>{t("newChat")}</button>
          <span className="chat-mode-badge">{t("practiceMode")}</span>
        </div>

        {historyOpen && (
          <aside className="chat-history" aria-label={t("chatHistory")}>
            {savedChats.length === 0 && <p className="chat-history-empty">{t("noSavedChats")}</p>}
            {savedChats.map((chat) => (
              <div className={`chat-history-item ${chat.session_id === sessionId ? "active" : ""}`} key={chat.session_id}>
                <button className="chat-history-main" onClick={() => handleLoadChat(chat.session_id)}>
                  <strong>{chat.title}</strong>
                  <span>{new Date(chat.updated_at).toLocaleString()}</span>
                </button>
                <button className="chat-history-delete" onClick={() => handleDeleteChat(chat.session_id)} aria-label={t("deleteChat")}>×</button>
              </div>
            ))}
          </aside>
        )}

        <div className="chat-container" ref={chatRef}>
          {messages.map((msg, i) => (
            <ChatBubble key={i} message={msg} assistantLabel={t("mao")} />
          ))}
          {error && <div className="chat-error">{error}</div>}
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
