import { useCallback } from "react";

export function useSpeechSynthesis() {
  const isSupported = typeof window !== "undefined" && "speechSynthesis" in window;

  const speak = useCallback((text: string) => {
    if (!isSupported) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    utterance.pitch = 1;

    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(
      (v) => v.lang.startsWith("en") && v.name.includes("Female")
    ) || voices.find((v) => v.lang.startsWith("en"));

    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    window.speechSynthesis.speak(utterance);
  }, [isSupported]);

  const stop = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel();
    }
  }, [isSupported]);

  return { speak, stop, isSupported };
}
