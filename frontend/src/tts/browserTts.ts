import { useCallback, useRef, useEffect, useState } from "react";
import type { TtsHandle, TtsProfile } from "./types";

const FEMALE_KEYWORDS = [
    "jenny", "aria", "ana", "sonia", "natasha", "michelle",
    "clara", "libby", "maisie", "emily", "molly", "rosa",
    "emma", "ava", "luna", "zira", "susan", "samantha", "fiona",
];

const PITCH_MAP: Record<string, number> = {
    standard: 1.1,
    young: 1.4,
};

const DEFAULT_RATE = 1.05;
const VOICE_RETRY_MS = 500;
const CANCEL_DELAY_MS = 50;

export function useBrowserTts(lang: string = "en"): TtsHandle {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
    const onEndRef = useRef<(() => void) | undefined>(undefined);
    const langRef = useRef(lang);
    langRef.current = lang;

    const isSupported = typeof window !== "undefined" && !!window.speechSynthesis;

    useEffect(() => {
        if (!isSupported) return;

        const trySelectVoice = () => {
            const voices = window.speechSynthesis.getVoices();
            if (voices.length === 0) return;

            const targetVoices = voices.filter((v) => v.lang.startsWith(langRef.current));
            if (targetVoices.length === 0) return;

            const female = targetVoices.find((v) =>
                FEMALE_KEYWORDS.some((k) => v.name.toLowerCase().includes(k))
            );

            voiceRef.current = female || targetVoices[0];
        };

        trySelectVoice();
        window.speechSynthesis.onvoiceschanged = trySelectVoice;

        const interval = setInterval(trySelectVoice, VOICE_RETRY_MS);

        return () => {
            clearInterval(interval);
            window.speechSynthesis.onvoiceschanged = null;
        };
    }, [isSupported]);

    const stop = useCallback(() => {
        if (!isSupported) return;
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
    }, [isSupported]);

    const speak = useCallback(
        (text: string, profile: TtsProfile = "standard", onEnd?: () => void) => {
            if (!isSupported || !text) return;
            onEndRef.current = onEnd;

            window.speechSynthesis.cancel();

            setTimeout(() => {
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.rate = DEFAULT_RATE;
                utterance.pitch = PITCH_MAP[profile] || PITCH_MAP.standard;

                if (voiceRef.current) {
                    utterance.voice = voiceRef.current;
                }

                utterance.onstart = () => setIsSpeaking(true);

                utterance.onend = () => {
                    setIsSpeaking(false);
                    onEndRef.current?.();
                    onEndRef.current = undefined;
                };

                utterance.onerror = () => {
                    setIsSpeaking(false);
                    onEndRef.current?.();
                    onEndRef.current = undefined;
                };

                utteranceRef.current = utterance;
                window.speechSynthesis.speak(utterance);
            }, CANCEL_DELAY_MS);
        },
        [isSupported],
    );

    return { speak, stop, isSupported, isSpeaking };
}
