import { useRef, useCallback, useState, useEffect } from "react";

export function useWhisperAsr(lang: string = "en") {
  const [isRecording, setIsRecording] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const resolveRef = useRef<((text: string) => void) | null>(null);
  const timerRef = useRef<any>(null);
  const langRef = useRef(lang);
  langRef.current = lang;

  const isSupported = typeof window !== "undefined" &&
    !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

  const clearError = useCallback(() => setErrorCode(null), []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const start = useCallback(async (): Promise<void> => {
    if (!isSupported) {
      setErrorCode("asrNotSupported");
      return;
    }

    setErrorCode(null);
    setRecordingSeconds(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onerror = () => {
        setErrorCode("asrRecordError");
        setIsRecording(false);
        setRecordingSeconds(0);
      };

      recorder.start();
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch (err: any) {
      console.error("[Recorder] Failed to start:", err);
      const code = err?.name === "NotAllowedError"
        ? "asrMicDenied"
        : err?.name === "NotFoundError"
        ? "asrNoMic"
        : "asrStartFailed";
      setErrorCode(code);
    }
  }, [isSupported]);

  const stop = useCallback(async (): Promise<string> => {
    return new Promise((resolve) => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        setIsRecording(false);
        setRecordingSeconds(0);
        resolve("");
        return;
      }

      resolveRef.current = resolve;

      recorder.onstop = async () => {
        setIsRecording(false);
        setRecordingSeconds(0);
        recorder.stream.getTracks().forEach((t) => t.stop());

        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size < 100) {
          setErrorCode("asrNoAudio");
          resolve("");
          return;
        }

        try {
          const formData = new FormData();
          formData.append("file", blob, "recording.webm");
          formData.append("language", langRef.current);

          const baseUrl = import.meta.env.VITE_API_BASE || "";
          const resp = await fetch(`${baseUrl}/whisper/transcribe`, {
            method: "POST",
            body: formData,
          });

          if (!resp.ok) {
            const errData = await resp.json().catch(() => ({}));
            const detail = errData.detail || `HTTP ${resp.status}`;
            setErrorCode("asrTranscribeFailed");
            resolve("");
            return;
          }

          const data = await resp.json();
          const text = data.text || "";
          if (!text.trim()) {
            setErrorCode("asrEmptyText");
          }
          resolve(text);
        } catch (err: any) {
          console.error("[Recorder] Upload failed:", err);
          setErrorCode("asrServerConnectFailed");
          resolve("");
        }
      };

      recorder.stop();
    });
  }, []);

  const interimText = isRecording ? `Recording: ${recordingSeconds}s` : "";

  return { isRecording, interimText, errorCode, start, stop, isSupported, clearError };
}
