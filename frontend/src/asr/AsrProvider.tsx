import { createContext, useContext, useMemo } from "react";
import { useBrowserAsr } from "./browserAsr";
import { useWhisperAsr } from "./whisperAsr";
import { useWhisperConfig } from "./whisperConfig";
import { useTrainingLanguage } from "../i18n/trainingLang";

export interface AsrHandle {
  isActive: boolean;
  interimText: string;
  errorCode: string | null;
  isSupported: boolean;
  start: () => void;
  stop: () => Promise<string>;
  clearError: () => void;
}

const AsrContext = createContext<AsrHandle | null>(null);

export function AsrProvider({ children }: { children: React.ReactNode }) {
  const { config: whisperCfg } = useWhisperConfig();
  const useWhisper = whisperCfg?.enabled ?? false;
  const { trainingLang, getAsrCode } = useTrainingLanguage();

  const asrCode = getAsrCode(trainingLang);
  const whisperLang = trainingLang;

  const browser = useBrowserAsr(asrCode);
  const whisper = useWhisperAsr(whisperLang);

  const value: AsrHandle = useMemo(() => {
    if (useWhisper) {
      return {
        isActive: whisper.isRecording,
        interimText: whisper.interimText,
        errorCode: whisper.errorCode,
        isSupported: whisper.isSupported,
        start: () => whisper.start(),
        stop: async () => whisper.stop(),
        clearError: whisper.clearError,
      };
    }
    return {
      isActive: browser.isListening,
      interimText: browser.transcript,
      errorCode: browser.errorCode,
      isSupported: browser.isSupported,
      start: () => browser.startListening(),
      stop: async () => browser.stopListening(),
      clearError: browser.clearError,
    };
  }, [useWhisper, whisper, browser]);

  return (
    <AsrContext.Provider value={value}>
      {children}
    </AsrContext.Provider>
  );
}

export function useAsr() {
  const ctx = useContext(AsrContext);
  if (!ctx) {
    return {
      isActive: false,
      interimText: "",
      errorCode: "asrProviderNotFound" as const,
      isSupported: false,
      start: () => {},
      stop: async () => "",
      clearError: () => {},
    } satisfies AsrHandle;
  }
  return ctx;
}
