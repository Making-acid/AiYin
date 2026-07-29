import { createContext, useContext, useState, useCallback } from "react";

export type TrainingLanguage = "en" | "zh" | "ja" | "ko" | "fr" | "de" | "es";

interface LangEntry {
    code: TrainingLanguage;
    label: string;
    nativeLabel: string;
    asrCode: string;
}

const SUPPORTED: LangEntry[] = [
    { code: "en", label: "English", nativeLabel: "English", asrCode: "en-US" },
    { code: "zh", label: "Chinese (中文)", nativeLabel: "中文", asrCode: "zh-CN" },
    { code: "ja", label: "Japanese (日本語)", nativeLabel: "日本語", asrCode: "ja-JP" },
    { code: "ko", label: "Korean (한국어)", nativeLabel: "한국어", asrCode: "ko-KR" },
    { code: "fr", label: "French (Français)", nativeLabel: "Français", asrCode: "fr-FR" },
    { code: "de", label: "German (Deutsch)", nativeLabel: "Deutsch", asrCode: "de-DE" },
    { code: "es", label: "Spanish (Español)", nativeLabel: "Español", asrCode: "es-ES" },
];

function getLS(key: string, fallback: string): string {
    return localStorage.getItem(key) || fallback;
}

interface TrainingLangContextValue {
    trainingLang: TrainingLanguage;
    setTrainingLang: (l: TrainingLanguage) => void;
    supported: LangEntry[];
    getAsrCode: (l: TrainingLanguage) => string;
}

const TrainingLangContext = createContext<TrainingLangContextValue>({
    trainingLang: "en",
    setTrainingLang: () => {},
    supported: SUPPORTED,
    getAsrCode: (l: TrainingLanguage) => SUPPORTED.find((s) => s.code === l)?.asrCode || "en-US",
});

export function TrainingLanguageProvider({ children }: { children: React.ReactNode }) {
    const [trainingLang, setTrainingLangState] = useState<TrainingLanguage>(
        () => getLS("training_language", "en") as TrainingLanguage,
    );

    const setTrainingLang = useCallback((l: TrainingLanguage) => {
        setTrainingLangState(l);
        localStorage.setItem("training_language", l);
    }, []);

    const getAsrCode = useCallback(
        (l: TrainingLanguage) => SUPPORTED.find((s) => s.code === l)?.asrCode || "en-US",
        [],
    );

    return (
        <TrainingLangContext.Provider value={{ trainingLang, setTrainingLang, supported: SUPPORTED, getAsrCode }}>
            {children}
        </TrainingLangContext.Provider>
    );
}

export function useTrainingLanguage() {
    return useContext(TrainingLangContext);
}
