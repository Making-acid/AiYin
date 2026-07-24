import { useState, useImperativeHandle, forwardRef } from "react";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";

interface VoiceInputProps {
  onResult: (text: string) => void;
  disabled?: boolean;
  onStart?: () => void;
  onEnd?: () => void;
  autoStopMs?: number;
}

export interface VoiceInputHandle {
  start: () => void;
  stop: () => void;
}

export const VoiceInput = forwardRef<VoiceInputHandle, VoiceInputProps>(
  function VoiceInput({ onResult, disabled, onStart, onEnd, autoStopMs }, ref) {
    const { isListening, transcript, startListening, stopListening, error, isSupported } =
      useSpeechRecognition();
    const [isProcessing, setIsProcessing] = useState(false);

    useImperativeHandle(ref, () => ({
      start: () => {
        if (!isListening && !isProcessing) {
          startListening();
          onStart?.();
        }
      },
      stop: async () => {
        if (isListening) {
          setIsProcessing(true);
          const text = await stopListening();
          setIsProcessing(false);
          onEnd?.();
          if (text.trim()) {
            onResult(text.trim());
          }
        }
      },
    }));

    // auto-stop timer
    if (autoStopMs && autoStopMs > 0 && ref) {
      // Handled externally via timer in parent for more control
    }

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
        onEnd?.();
        if (text.trim()) {
          onResult(text.trim());
        }
      } else {
        startListening();
        onStart?.();
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
);
