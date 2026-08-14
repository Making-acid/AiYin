import { createContext, useContext, useCallback } from "react";

export type TrainingLanguage = "en" | "zh" | "ja" | "ko" | "fr" | "de" | "es";

interface LangEntry {
    code: TrainingLanguage;
    label: string;
    nativeLabel: string;
    asrCode: string;
}

const SUPPORTED: LangEntry[] = [
    { code: "en", label: "English", nativeLabel: "English", asrCode: "en-US" },
];

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
    const trainingLang: TrainingLanguage = "en";
    const setTrainingLang = useCallback((_l: TrainingLanguage) => {}, []);

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
