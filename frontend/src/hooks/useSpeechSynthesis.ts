import { useCallback, useRef, useEffect, useState } from "react";

type VoiceProfile = "standard" | "young";

const FEMALE_KEYWORDS = [
  "jenny", "aria", "ana", "sonia", "natasha", "michelle",
  "clara", "libby", "maisie", "emily", "molly", "rosa",
  "emma", "ava", "luna", "zira", "susan", "samantha", "fiona",
];

export function useSpeechSynthesis(profile: VoiceProfile = "standard", lang: string = "en") {
  const isSupported = typeof window !== "undefined" && "speechSynthesis" in window
    && (typeof window.speechSynthesis?.getVoices === "function");
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const langRef = useRef(lang);
  langRef.current = lang;
  const pulseRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [mouthOpen, setMouthOpen] = useState(false);

  const stopPulse = () => {
    if (pulseRef.current) {
      clearInterval(pulseRef.current);
      pulseRef.current = null;
    }
  };

  const startPulse = () => {
    stopPulse();
    setMouthOpen(true);
    let open = true;
    pulseRef.current = setInterval(() => {
      open = !open;
      setMouthOpen(open);
    }, 220);
  };

  useEffect(() => {
    return () => stopPulse();
  }, []);

  const findVoice = useCallback((): SpeechSynthesisVoice | null => {
    const all = window.speechSynthesis.getVoices();
    if (all.length === 0) return null;

    const targetLangVoices = all.filter((v) => v.lang.startsWith(langRef.current));

    for (const kw of FEMALE_KEYWORDS) {
      const found = targetLangVoices.find((v) => v.name.toLowerCase().includes(kw));
      if (found) return found;
    }

    return targetLangVoices[0] || null;
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

      u.onstart = () => {
        startPulse();
        onStart?.();
      };

      u.onend = () => {
        stopPulse();
        setMouthOpen(false);
        onEnd?.();
      };

      u.onerror = () => {
        stopPulse();
        setMouthOpen(false);
        onEnd?.();
      };

      window.speechSynthesis.cancel();
      setTimeout(() => window.speechSynthesis.speak(u), 50);
    },
    [isSupported, findVoice]
  );

  const stop = useCallback(() => {
    stopPulse();
    setMouthOpen(false);
    if (isSupported) window.speechSynthesis.cancel();
  }, [isSupported]);

  return { speak, stop, isSupported, mouthOpen };
}
