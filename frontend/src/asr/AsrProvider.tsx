import { createContext, useContext, useMemo } from "react";
import { useBrowserAsr } from "./browserAsr";
import { useWhisperAsr } from "./whisperAsr";
import { useWhisperConfig } from "./whisperConfig";

export interface AsrHandle {
  isActive: boolean;
  interimText: string;
  error: string | null;
  isSupported: boolean;
  start: () => void;
  stop: () => Promise<string>;
  clearError: () => void;
}

const AsrContext = createContext<AsrHandle | null>(null);

export function AsrProvider({ children }: { children: React.ReactNode }) {
  const { config: whisperCfg } = useWhisperConfig();
  const useWhisper = whisperCfg?.enabled ?? false;

  const browser = useBrowserAsr();
  const whisper = useWhisperAsr();

  const value: AsrHandle = useMemo(() => {
    if (useWhisper) {
      return {
        isActive: whisper.isRecording,
        interimText: "",
        error: whisper.error,
        isSupported: whisper.isSupported,
        start: () => whisper.start(),
        stop: async () => whisper.stop(),
        clearError: whisper.clearError,
      };
    }
    return {
      isActive: browser.isListening,
      interimText: browser.transcript,
      error: browser.error,
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
      error: "ASR provider not found",
      isSupported: false,
      start: () => {},
      stop: async () => "",
      clearError: () => {},
    } satisfies AsrHandle;
  }
  return ctx;
}
