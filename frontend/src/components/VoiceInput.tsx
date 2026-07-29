import { useState, useImperativeHandle, forwardRef } from "react";
import { useAsr } from "../asr";
import { useLanguage } from "../i18n";

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
    const { isActive, interimText, errorCode, isSupported, start: asrStart, stop: asrStop } = useAsr();
    const [isProcessing, setIsProcessing] = useState(false);
    const { t } = useLanguage();

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
          <p>{t("voiceNotSupported")}</p>
          <p>{t("voiceUseChrome")}</p>
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
        {errorCode && <div className="voice-error">{t(errorCode)}</div>}
        {isActive && interimText && (
          <div className="voice-transcript">{interimText}</div>
        )}
        {isActive && !interimText && (
          <div className="voice-transcript">{t("listening")}</div>
        )}
        <button
          className={`mic-button ${isActive ? "recording" : ""}`}
          onClick={handleToggle}
          disabled={disabled || isProcessing}
          title={isActive ? t("stopRecording") : t("startRecording")}
        >
          {isActive ? t("stop") : t("speak")}
        </button>
      </div>
    );
  }
);
