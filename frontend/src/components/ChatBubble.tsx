import type { ChatMessage } from "../types";
import { useLanguage } from "../i18n";

interface ChatBubbleProps {
  message: ChatMessage;
  assistantLabel?: string;
}

export function ChatBubble({ message, assistantLabel }: ChatBubbleProps) {
  const isUser = message.role === "user";
  const { t } = useLanguage();

  return (
    <div className={`chat-bubble ${isUser ? "user" : "examiner"}`}>
      <div className="bubble-avatar">
        {isUser ? "👤" : "🤖"}
      </div>
      <div className="bubble-content">
        <div className="bubble-role">{isUser ? t("you") : assistantLabel || t("examiner")}</div>
        <div className="bubble-text">{message.content}</div>
      </div>
    </div>
  );
}
