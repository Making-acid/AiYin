import { useCallback, useRef, useEffect } from "react";

type VoiceProfile = "standard" | "young";

const FEMALE_KEYWORDS = [
  "jenny", "aria", "ana", "sonia", "natasha", "michelle",
  "clara", "libby", "maisie", "emily", "molly", "rosa",
  "emma", "ava", "luna", "zira", "susan", "samantha", "fiona",
];

export function useSpeechSynthesis(profile: VoiceProfile = "standard") {
  const isSupported = typeof window !== "undefined" && "speechSynthesis" in window;
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const profileRef = useRef(profile);
  profileRef.current = profile;

  const findVoice = useCallback((): SpeechSynthesisVoice | null => {
    const all = window.speechSynthesis.getVoices();
    if (all.length === 0) return null;

    const en = all.filter((v) => v.lang.startsWith("en"));

    // log for debugging
    if (!voiceRef.current) {
      console.log(
        "[TTS] en-US voices:",
        en.filter((v) => v.lang === "en-US").map((v) => v.name).join(", ")
      );
    }

    for (const kw of FEMALE_KEYWORDS) {
      const found = en.find((v) => v.name.toLowerCase().includes(kw));
      if (found) {
        console.log("[TTS] Selected:", found.name, found.lang);
        return found;
      }
    }

    const fallback = en[0] || null;
    if (fallback) console.log("[TTS] Fallback:", fallback.name);
    return fallback;
  }, []);

  useEffect(() => {
    if (!isSupported) return;

    const load = () => {
      const v = findVoice();
      if (v) voiceRef.current = v;
    };

    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    const id = setInterval(() => { if (!voiceRef.current) load(); }, 500);

    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", load);
      clearInterval(id);
    };
  }, [isSupported, findVoice]);

  const speak = useCallback(
    (text: string, onStart?: () => void, onEnd?: () => void) => {
      if (!isSupported) return;

      let v = voiceRef.current || findVoice();
      if (!v) return;

      const u = new SpeechSynthesisUtterance(text);
      u.voice = v;
      u.rate = 1.05;
      u.pitch = profileRef.current === "young" ? 1.4 : 1.1;
      u.onstart = () => onStart?.();
      u.onend = () => onEnd?.();

      window.speechSynthesis.cancel();
      setTimeout(() => window.speechSynthesis.speak(u), 50);
    },
    [isSupported, findVoice]
  );

  const stop = useCallback(() => {
    if (isSupported) window.speechSynthesis.cancel();
  }, [isSupported]);

  return { speak, stop, isSupported };
}
