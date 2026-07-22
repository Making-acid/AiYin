import { useState } from "react";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";

interface VoiceInputProps {
  onResult: (text: string) => void;
  disabled?: boolean;
}

export function VoiceInput({ onResult, disabled }: VoiceInputProps) {
  const { isListening, transcript, startListening, stopListening, error, isSupported } =
    useSpeechRecognition();
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isSupported) {
    return (
      <div className="voice-input unsupported">
        <p>Your browser does not support speech recognition.</p>
        <p>Please use Chrome or Edge.</p>
      </div>
    );
  }

  const handleToggle = async () => {
    if (isListening) {
      setIsProcessing(true);
      const text = await stopListening();
      setIsProcessing(false);
      if (text.trim()) {
        onResult(text.trim());
      }
    } else {
      startListening();
    }
  };

  return (
    <div className="voice-input">
      {error && <div className="voice-error">{error}</div>}
      {isListening && (
        <div className="voice-transcript">
          {transcript || "Listening..."}
        </div>
      )}
      <button
        className={`mic-button ${isListening ? "recording" : ""}`}
        onClick={handleToggle}
        disabled={disabled || isProcessing}
        title={isListening ? "Stop recording" : "Start recording"}
      >
        {isListening ? "⏹ Stop" : "🎤 Speak"}
      </button>
    </div>
  );
}
