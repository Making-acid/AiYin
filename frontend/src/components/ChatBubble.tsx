import type { ChatMessage } from "../types";

interface ChatBubbleProps {
  message: ChatMessage;
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={`chat-bubble ${isUser ? "user" : "examiner"}`}>
      <div className="bubble-avatar">
        {isUser ? "👤" : "🤖"}
      </div>
      <div className="bubble-content">
        <div className="bubble-role">{isUser ? "You" : "Examiner"}</div>
        <div className="bubble-text">{message.content}</div>
      </div>
    </div>
  );
}
