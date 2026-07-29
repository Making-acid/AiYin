import { createContext, useContext } from "react";
import type { TtsHandle } from "./types";

const noopTts: TtsHandle = {
    speak: () => {},
    stop: () => {},
    isSupported: false,
    isSpeaking: false,
};

const TtsContext = createContext<TtsHandle>(noopTts);

export { TtsContext };
export type { TtsHandle, TtsProfile } from "./types";

export function useTts(): TtsHandle {
    const ctx = useContext(TtsContext);
    if (!ctx) {
        return noopTts;
    }
    return ctx;
}
