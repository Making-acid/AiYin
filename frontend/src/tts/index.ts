export { TtsContext, useTts } from "./TtsProvider";
export type { TtsHandle, TtsProfile } from "./types";

// Re-export the main TTS hook for backward compatibility.
// For a new TTS backend (e.g. cloud TTS), implement the TtsHandle interface
// and switch providers via TtsContext.
export { useSpeechSynthesis } from "../hooks/useSpeechSynthesis";
