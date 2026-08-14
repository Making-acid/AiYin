import { useRef, useCallback, useState, useEffect } from "react";

const MAX_DURATION_SECONDS = 180;

export function useWhisperAsr(lang: string = "en") {
  const [isRecording, setIsRecording] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPromiseRef = useRef<Promise<boolean> | null>(null);
  const resultPromiseRef = useRef<Promise<string> | null>(null);
  const resolveResultRef = useRef<((text: string) => void) | null>(null);
  const completedTextRef = useRef<string | null>(null);
  const generationRef = useRef(0);
  const mountedRef = useRef(true);
  const langRef = useRef(lang);
  langRef.current = lang;

  const isSupported = typeof window !== "undefined"
    && !!navigator.mediaDevices?.getUserMedia
    && typeof MediaRecorder !== "undefined";

  const clearError = useCallback(() => setErrorCode(null), []);

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (maxTimerRef.current) clearTimeout(maxTimerRef.current);
    timerRef.current = null;
    maxTimerRef.current = null;
  }, []);

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const transcribe = useCallback(async (blob: Blob): Promise<string> => {
    if (blob.size < 100) {
      if (mountedRef.current) setErrorCode("asrNoAudio");
      return "";
    }
    try {
      const formData = new FormData();
      formData.append("file", blob, "recording.webm");
      formData.append("language", langRef.current);
      const baseUrl = import.meta.env.VITE_API_BASE || "";
      const response = await fetch(`${baseUrl}/whisper/transcribe`, { method: "POST", body: formData });
      if (!response.ok) {
        if (mountedRef.current) setErrorCode("asrTranscribeFailed");
        return "";
      }
      const data = await response.json();
      const text = data.text || "";
      if (!text.trim() && mountedRef.current) setErrorCode("asrEmptyText");
      return text;
    } catch (cause) {
      console.error("[Recorder] Upload failed:", cause);
      if (mountedRef.current) setErrorCode("asrServerConnectFailed");
      return "";
    }
  }, []);

  const start = useCallback(async (): Promise<void> => {
    if (!isSupported) {
      setErrorCode("asrNotSupported");
      return;
    }
    if (startPromiseRef.current) {
      await startPromiseRef.current;
      return;
    }
    if (mediaRecorderRef.current?.state === "recording") return;

    const generation = ++generationRef.current;
    const operation = (async () => {
      setErrorCode(null);
      setRecordingSeconds(0);
      completedTextRef.current = null;
      chunksRef.current = [];
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (generation !== generationRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return false;
        }
        streamRef.current = stream;
        const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm";
        const recorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = recorder;
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunksRef.current.push(event.data);
        };
        recorder.onerror = () => {
          if (mountedRef.current) {
            setErrorCode("asrRecordError");
            setIsRecording(false);
            setRecordingSeconds(0);
          }
          clearTimers();
          stopTracks();
          resolveResultRef.current?.("");
          resolveResultRef.current = null;
          resultPromiseRef.current = null;
        };
        recorder.onstop = () => {
          clearTimers();
          stopTracks();
          if (generation !== generationRef.current) {
            resolveResultRef.current?.("");
            resolveResultRef.current = null;
            resultPromiseRef.current = null;
            return;
          }
          if (mountedRef.current) {
            setIsRecording(false);
            setRecordingSeconds(0);
          }
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
          const task = transcribe(blob);
          resultPromiseRef.current = task;
          void task.then((text) => {
            completedTextRef.current = text;
            resolveResultRef.current?.(text);
            resolveResultRef.current = null;
            if (resultPromiseRef.current === task) resultPromiseRef.current = null;
          });
        };

        recorder.start();
        setIsRecording(true);
        timerRef.current = setInterval(() => setRecordingSeconds((seconds) => seconds + 1), 1000);
        maxTimerRef.current = setTimeout(() => {
          if (recorder.state === "recording") recorder.stop();
        }, MAX_DURATION_SECONDS * 1000);
        return true;
      } catch (cause: any) {
        stream?.getTracks().forEach((track) => track.stop());
        stopTracks();
        if (mountedRef.current) {
          setErrorCode(cause?.name === "NotAllowedError" ? "asrMicDenied" : cause?.name === "NotFoundError" ? "asrNoMic" : "asrStartFailed");
        }
        return false;
      }
    })();

    startPromiseRef.current = operation;
    try {
      await operation;
    } finally {
      if (startPromiseRef.current === operation) startPromiseRef.current = null;
    }
  }, [clearTimers, isSupported, stopTracks, transcribe]);

  const stop = useCallback(async (): Promise<string> => {
    if (startPromiseRef.current) await startPromiseRef.current;
    if (completedTextRef.current !== null) {
      const text = completedTextRef.current;
      completedTextRef.current = null;
      return text;
    }
    if (resultPromiseRef.current) return resultPromiseRef.current;

    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      clearTimers();
      stopTracks();
      setIsRecording(false);
      setRecordingSeconds(0);
      return "";
    }
    const resultPromise = new Promise<string>((resolve) => {
      resolveResultRef.current = resolve;
    });
    resultPromiseRef.current = resultPromise;
    recorder.stop();
    return resultPromise;
  }, [clearTimers, stopTracks]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      generationRef.current += 1;
      clearTimers();
      const recorder = mediaRecorderRef.current;
      if (recorder?.state === "recording") recorder.stop();
      stopTracks();
      resolveResultRef.current?.("");
      resolveResultRef.current = null;
    };
  }, [clearTimers, stopTracks]);

  const interimText = isRecording ? `Recording: ${recordingSeconds}s` : "";
  return { isRecording, interimText, errorCode, start, stop, isSupported, clearError };
}
