import { useState, useImperativeHandle, forwardRef } from "react";
import { useAsr } from "../asr";

interface VoiceInputProps {
  onResult: (text: string) => void;
  disabled?: boolean;
  onStart?: () => void;
  onEnd?: () => void;
}

export interface VoiceInputHandle {
  start: () => void;
  stop: () => void;
}

export const VoiceInput = forwardRef<VoiceInputHandle, VoiceInputProps>(
  function VoiceInput({ onResult, disabled, onStart, onEnd }, ref) {
    const { isActive, interimText, error, isSupported, start: asrStart, stop: asrStop } = useAsr();
    const [isProcessing, setIsProcessing] = useState(false);

    useImperativeHandle(ref, () => ({
      start: () => {
        if (isActive || isProcessing) return;
        onStart?.();
        asrStart();
      },
      stop: async () => {
        if (!isActive) return;
        setIsProcessing(true);
        onEnd?.();
        const text = await asrStop();
        setIsProcessing(false);
        if (text.trim()) onResult(text.trim());
      },
    }));

    if (!isSupported) {
      return (
        <div className="voice-input unsupported">
          <p>Your browser does not support voice input.</p>
          <p>Please use Chrome or Edge.</p>
        </div>
      );
    }

    const handleToggle = async () => {
      if (isActive) {
        setIsProcessing(true);
        onEnd?.();
        const text = await asrStop();
        setIsProcessing(false);
        if (text.trim()) onResult(text.trim());
      } else {
        onStart?.();
        asrStart();
      }
    };

    return (
      <div className="voice-input">
        {error && <div className="voice-error">{error}</div>}
        {isActive && interimText && (
          <div className="voice-transcript">{interimText}</div>
        )}
        {isActive && !interimText && (
          <div className="voice-transcript">Listening...</div>
        )}
        <button
          className={`mic-button ${isActive ? "recording" : ""}`}
          onClick={handleToggle}
          disabled={disabled || isProcessing}
          title={isActive ? "Stop recording" : "Start recording"}
        >
          {isActive ? "Stop" : "Speak"}
        </button>
      </div>
    );
  }
);
