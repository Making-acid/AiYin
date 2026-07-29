export interface TtsHandle {
    speak: (text: string, profile?: string, onEnd?: () => void) => void;
    stop: () => void;
    isSupported: boolean;
    isSpeaking: boolean;
}

export type TtsProfile = "standard" | "young" | string;

export type TtsProviderType = "browser" | string;
