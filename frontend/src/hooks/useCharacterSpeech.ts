import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchAzureSpeechToken, fetchTtsConfig, synthesizeLocalSpeech, type TtsConfig } from "../api/tts";
import { useSpeechSynthesis } from "./useSpeechSynthesis";
import { toSpeechText } from "../utils/speechText";

export type CharacterVoice = "haru" | "mao";

export interface VisemeFrame {
  offsetMs: number;
  value: number;
}

const VISEME_OPEN: Record<number, number> = {
  0: 0, 1: 0.18, 2: 0.72, 3: 0.66, 4: 0.44, 5: 0.34,
  6: 0.22, 7: 0.3, 8: 0.42, 9: 0.5, 10: 0.6, 11: 0.7,
  12: 0.76, 13: 0.62, 14: 0.5, 15: 0.38, 16: 0.26,
  17: 0.2, 18: 0.16, 19: 0.28, 20: 0.48, 21: 0.58,
};

let cachedConfig: TtsConfig | null = null;
let cachedConfigPromise: Promise<TtsConfig> | null = null;
let configCacheGeneration = 0;

async function loadConfig() {
  if (cachedConfig) return cachedConfig;
  if (!cachedConfigPromise) {
    const generation = configCacheGeneration;
    const request = fetchTtsConfig().then((config) => {
      if (generation === configCacheGeneration) cachedConfig = config;
      return config;
    });
    cachedConfigPromise = request;
    try {
      return await request;
    } catch (error) {
      if (cachedConfigPromise === request) cachedConfigPromise = null;
      throw error;
    }
  }
  return cachedConfigPromise;
}

export function clearTtsConfigCache() {
  configCacheGeneration += 1;
  cachedConfig = null;
  cachedConfigPromise = null;
}

export function useCharacterSpeech(character: CharacterVoice, lang: string) {
  const browser = useSpeechSynthesis(character === "mao" ? "young" : "standard", lang);
  const browserSpeak = browser.speak;
  const browserStop = browser.stop;
  const [mouthValue, setMouthValue] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef("");
  const animationRef = useRef<number | null>(null);
  const disposedRef = useRef(false);
  const speechGenerationRef = useRef(0);

  const desktopTts = useMemo(() => {
    if (typeof window === "undefined") return null;
    if (window.__IELTS_DESKTOP__?.host !== "webview2") return null;
    const host = window.chrome?.webview?.hostObjects?.desktopTts;
    return typeof host?.SpeakAsync === "function" ? host : null;
  }, []);

  const clearAzurePlayback = useCallback(() => {
    if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
    animationRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = "";
    setMouthValue(0);
  }, []);

  const stopLocalPlayback = useCallback(() => {
    browserStop();
    clearAzurePlayback();
  }, [browserStop, clearAzurePlayback]);

  const stopDesktopPlayback = useCallback(async () => {
    if (!desktopTts) return;
    try {
      await desktopTts.Stop();
    } catch {
      // Host object may be tearing down during shutdown. Browser and Azure
      // playback remain available even when the native bridge disappears.
    }
  }, [desktopTts]);

  const stop = useCallback(() => {
    speechGenerationRef.current += 1;
    stopLocalPlayback();
    void stopDesktopPlayback();
  }, [stopDesktopPlayback, stopLocalPlayback]);

  useEffect(() => {
    disposedRef.current = false;
    return () => {
      disposedRef.current = true;
      speechGenerationRef.current += 1;
      browserStop();
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
      audioRef.current?.pause();
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      void stopDesktopPlayback();
    };
  }, [browserStop, stopDesktopPlayback]);

  const playAzure = useCallback(async (
    text: string,
    config: TtsConfig,
    volume: number,
    onStart?: () => void,
    onEnd?: () => void,
  ) => {
    const SpeechSDK = await import("microsoft-cognitiveservices-speech-sdk");
    const auth = await fetchAzureSpeechToken();
    const speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(auth.token, auth.region);
    speechConfig.speechSynthesisOutputFormat = SpeechSDK.SpeechSynthesisOutputFormat.Audio24Khz48KBitRateMonoMp3;
    speechConfig.speechSynthesisVoiceName = character === "haru" ? config.haru_voice : config.mao_voice;
    const synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig, undefined);
    const visemes: VisemeFrame[] = [];
    synthesizer.visemeReceived = (_sender, event) => {
      visemes.push({ offsetMs: event.audioOffset / 10_000, value: VISEME_OPEN[event.visemeId] ?? 0.35 });
    };

    const result = await new Promise<ArrayBuffer>((resolve, reject) => {
      synthesizer.speakTextAsync(
        text,
        (speechResult) => {
          try {
            if (speechResult.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
              const bytes = speechResult.audioData;
              resolve(bytes.slice(0));
            } else {
              reject(new Error(speechResult.errorDetails || "Azure speech synthesis failed"));
            }
          } finally {
            synthesizer.close();
          }
        },
        (error) => {
          synthesizer.close();
          reject(new Error(String(error)));
        },
      );
    });
    if (disposedRef.current) return;

    const blob = new Blob([result], { type: "audio/mpeg" });
    const url = URL.createObjectURL(blob);
    objectUrlRef.current = url;
    const audio = new Audio(url);
    audio.volume = Math.max(0, Math.min(1, volume / 100));
    audioRef.current = audio;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      clearAzurePlayback();
      onEnd?.();
    };
    audio.onended = finish;
    audio.onerror = finish;
    audio.onplay = () => {
      onStart?.();
      const animate = () => {
        if (!audioRef.current || audio.paused || audio.ended) return;
        const now = audio.currentTime * 1000;
        let value = 0.22;
        for (let index = visemes.length - 1; index >= 0; index -= 1) {
          if (visemes[index].offsetMs <= now) {
            value = visemes[index].value;
            break;
          }
        }
        // Unsupported locales can return no visemes. Use the real playback clock,
        // rather than synthesis completion, for a restrained fallback cadence.
        if (visemes.length === 0) value = 0.3 + Math.sin(now / 85) * 0.22;
        setMouthValue(Math.max(0, Math.min(1, value)));
        animationRef.current = requestAnimationFrame(animate);
      };
      animate();
    };
    await audio.play();
  }, [character, clearAzurePlayback]);

  const playKokoro = useCallback(async (
    text: string,
    volume: number,
    onStart?: () => void,
    onEnd?: () => void,
  ) => {
    const blob = await synthesizeLocalSpeech(text, character);
    if (disposedRef.current) return;
    const url = URL.createObjectURL(blob);
    objectUrlRef.current = url;
    const audio = new Audio(url);
    audio.volume = Math.max(0, Math.min(1, volume / 100));
    audioRef.current = audio;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      clearAzurePlayback();
      onEnd?.();
    };
    audio.onended = finish;
    audio.onerror = finish;
    audio.onplay = () => {
      onStart?.();
      const animate = () => {
        if (!audioRef.current || audio.paused || audio.ended) return;
        const now = audio.currentTime * 1000;
        setMouthValue(0.3 + Math.sin(now / 82) * 0.22);
        animationRef.current = requestAnimationFrame(animate);
      };
      animate();
    };
    await audio.play();
  }, [character, clearAzurePlayback]);

  const runClockMouth = useCallback(() => {
    const started = Date.now();
    const tick = () => {
      const elapsed = (Date.now() - started) / 1000;
      const value = 0.35 + Math.sin(elapsed * 7.5) * 0.2;
      setMouthValue(Math.max(0.12, Math.min(1, value)));
      animationRef.current = requestAnimationFrame(tick);
    };
    animationRef.current = requestAnimationFrame(tick);
  }, []);

  const speakViaDesktop = useCallback(async (
    text: string,
    volume: number,
    onStart?: () => void,
    onEnd?: () => void,
  ) => {
    if (!desktopTts) return false;
    onStart?.();
    runClockMouth();
    try {
      await desktopTts.SpeakAsync(text, volume);
    } catch (error) {
      console.warn("[TTS] Desktop host speech failed; falling back.", error);
      return false;
    } finally {
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
      setMouthValue(0);
    }
    onEnd?.();
    return true;
  }, [desktopTts, runClockMouth]);

  const speak = useCallback(async (text: string, onStart?: () => void, onEnd?: () => void) => {
    const generation = speechGenerationRef.current + 1;
    speechGenerationRef.current = generation;
    stopLocalPlayback();
    // WebView2 host-object calls are asynchronous. Waiting here prevents an
    // older Stop call from arriving after the new SpeakAsync call.
    await stopDesktopPlayback();
    if (disposedRef.current || generation !== speechGenerationRef.current) return;

    const spokenText = toSpeechText(text);
    if (!spokenText) {
      setTimeout(() => onEnd?.(), 0);
      return;
    }

    let started = false;
    let ended = false;
    const notifyStart = () => {
      if (started || generation !== speechGenerationRef.current) return;
      started = true;
      onStart?.();
    };
    const notifyEnd = () => {
      if (ended || generation !== speechGenerationRef.current) return;
      ended = true;
      onEnd?.();
    };

    let config: TtsConfig | null = null;
    try {
      config = await loadConfig();
      if (config.provider === "azure" && config.azure_configured) {
        try {
          await playAzure(spokenText, config, config.volume, notifyStart, notifyEnd);
          return;
        } catch (error) {
          console.warn("[TTS] Azure Speech failed; trying bundled Kokoro.", error);
          clearAzurePlayback();
        }
      }
    } catch (error) {
      console.warn("[TTS] Speech configuration failed; using a local fallback.", error);
      clearAzurePlayback();
    }
    if (disposedRef.current || generation !== speechGenerationRef.current) return;

    if (!config || config.provider === "kokoro" || config.provider === "azure") {
      try {
        await playKokoro(spokenText, config?.volume ?? 70, notifyStart, notifyEnd);
        return;
      } catch (error) {
        console.warn("[TTS] Bundled Kokoro failed; trying Windows speech.", error);
        clearAzurePlayback();
      }
    }
    if (disposedRef.current || generation !== speechGenerationRef.current) return;

    // In the packaged desktop app, Windows SAPI is more reliable than
    // WebView2 speechSynthesis. It is only a local fallback: a configured
    // Azure provider above always keeps priority, and regular browsers never
    // see this host object.
    if (desktopTts && config?.provider !== "browser") {
      const handled = await speakViaDesktop(spokenText, config?.volume ?? 70, notifyStart, notifyEnd);
      if (handled || generation !== speechGenerationRef.current) return;
    }

    if (browser.isSupported) {
      browserSpeak(spokenText, notifyStart, notifyEnd, config?.volume ?? 70);
      return;
    }
    setTimeout(notifyEnd, 0);
  }, [browser.isSupported, browserSpeak, clearAzurePlayback, desktopTts, playAzure, playKokoro, speakViaDesktop, stopDesktopPlayback, stopLocalPlayback]);

  return {
    speak,
    stop,
    isSupported: Boolean(desktopTts) || browser.isSupported,
    mouthValue: mouthValue || (browser.mouthOpen ? 0.62 : 0),
  };
}
