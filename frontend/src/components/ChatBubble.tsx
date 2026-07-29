import type { ChatMessage } from "../types";
import { useLanguage } from "../i18n";

interface ChatBubbleProps {
  message: ChatMessage;
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === "user";
  const { t } = useLanguage();

  return (
    <div className={`chat-bubble ${isUser ? "user" : "examiner"}`}>
      <div className="bubble-avatar">
        {isUser ? "👤" : "🤖"}
      </div>
      <div className="bubble-content">
        <div className="bubble-role">{isUser ? t("you") : t("examiner")}</div>
        <div className="bubble-text">{message.content}</div>
      </div>
    </div>
  );
}
