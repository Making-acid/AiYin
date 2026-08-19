import { useCallback, useEffect, useRef, useState } from "react";

type VoiceProfile = "standard" | "young";

interface SpeechProfile {
  preferredNames: string[];
  rate: number;
  pitch: number;
}

const SPEECH_PROFILES: Record<VoiceProfile, SpeechProfile> = {
  // Haru: restrained, clear and close to a real IELTS examiner.
  standard: {
    preferredNames: [
      "sonia", "libby", "maisie", "ryan", "natasha", "jenny",
      "aria", "samantha", "fiona", "zira",
    ],
    rate: 0.98,
    pitch: 1,
  },
  // Mao: youthful and lively, but without the artificial chipmunk effect.
  young: {
    preferredNames: [
      "ana", "ava multilingual", "ava", "aria", "jenny", "emma",
      "michelle", "luna", "zira", "samantha",
    ],
    rate: 1.06,
    pitch: 1.12,
  },
};

function normalizeLanguage(lang: string) {
  return lang.trim().toLowerCase().replace("_", "-");
}

function voiceScore(voice: SpeechSynthesisVoice, profile: SpeechProfile, lang: string) {
  const name = voice.name.toLowerCase();
  const voiceLang = normalizeLanguage(voice.lang);
  const targetLang = normalizeLanguage(lang);
  const targetBase = targetLang.split("-")[0];
  let score = 0;

  if (voiceLang === targetLang) score += 60;
  else if (voiceLang.startsWith(`${targetBase}-`) || voiceLang === targetBase) score += 40;
  else return -1;

  // Prefer modern system/online voices over legacy "Desktop" voices.
  if (name.includes("natural") || name.includes("neural")) score += 35;
  if (name.includes("online")) score += 10;
  if (name.includes("desktop")) score -= 20;
  if (voice.default) score += 3;

  const preferredIndex = profile.preferredNames.findIndex((candidate) => name.includes(candidate));
  if (preferredIndex >= 0) score += 30 - preferredIndex;

  return score;
}

function selectVoice(voices: SpeechSynthesisVoice[], profile: SpeechProfile, lang: string) {
  return voices
    .map((voice) => ({ voice, score: voiceScore(voice, profile, lang) }))
    .filter(({ score }) => score >= 0)
    .sort((a, b) => b.score - a.score)[0]?.voice ?? null;
}

export function useSpeechSynthesis(profile: VoiceProfile = "standard", lang: string = "en") {
  const isSupported = typeof window !== "undefined" && "speechSynthesis" in window
    && typeof window.speechSynthesis?.getVoices === "function";
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const pulseRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [mouthOpen, setMouthOpen] = useState(false);

  const stopPulse = useCallback(() => {
    if (pulseRef.current) {
      clearInterval(pulseRef.current);
      pulseRef.current = null;
    }
  }, []);

  const startPulse = useCallback(() => {
    stopPulse();
    setMouthOpen(true);
    let open = true;
    pulseRef.current = setInterval(() => {
      open = !open;
      setMouthOpen(open);
    }, 220);
  }, [stopPulse]);

  const findVoice = useCallback(() => {
    if (!isSupported) return null;
    return selectVoice(window.speechSynthesis.getVoices(), SPEECH_PROFILES[profile], lang);
  }, [isSupported, lang, profile]);

  useEffect(() => {
    if (!isSupported) return;
    voiceRef.current = null;

    const load = () => {
      const voice = findVoice();
      if (voice) voiceRef.current = voice;
    };

    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    const id = setInterval(() => { if (!voiceRef.current) load(); }, 500);

    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", load);
      clearInterval(id);
    };
  }, [findVoice, isSupported]);

  useEffect(() => () => stopPulse(), [stopPulse]);

  const speak = useCallback(
    (text: string, onStart?: () => void, onEnd?: () => void, volume: number = 70) => {
      if (!isSupported) {
        setTimeout(() => onEnd?.(), 0);
        return;
      }

      // Chrome/Edge quirk: the engine can stall in a paused state after idling.
      // Resume before queuing anything, otherwise speak() is silently ignored.
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      const voice = voiceRef.current || findVoice();
      const speechProfile = SPEECH_PROFILES[profile];
      const utterance = new SpeechSynthesisUtterance(text);
      if (voice) {
        voiceRef.current = voice;
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else {
        // No matching voice yet (voices load asynchronously, or the OS has no
        // voice for this language). Fall back to the browser default voice so
        // speech still happens instead of failing silently.
        utterance.lang = normalizeLanguage(lang);
      }
      utterance.rate = speechProfile.rate;
      utterance.pitch = speechProfile.pitch;
      utterance.volume = Math.max(0, Math.min(1, volume / 100));

      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        stopPulse();
        setMouthOpen(false);
        onEnd?.();
      };

      utterance.onstart = () => {
        startPulse();
        onStart?.();
      };
      utterance.onend = finish;
      utterance.onerror = (event) => {
        if (!voice) {
          console.warn("[TTS] No voice available for language '" + lang + "'; browser used its default voice instead.", event.error);
        }
        finish();
      };

      window.speechSynthesis.cancel();
      // Chrome can drop an utterance queued immediately after cancel(); give it
      // a short delay and resume once more in case cancel() re-paused the engine.
      setTimeout(() => {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.speak(utterance);
      }, 100);
    },
    [findVoice, isSupported, lang, profile, startPulse, stopPulse],
  );

  const stop = useCallback(() => {
    stopPulse();
    setMouthOpen(false);
    if (isSupported) window.speechSynthesis.cancel();
  }, [isSupported, stopPulse]);

  return { speak, stop, isSupported, mouthOpen };
}
