import { useRef, useCallback, useState } from "react";

export function useWhisperAsr() {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const resolveRef = useRef<((text: string) => void) | null>(null);

  const isSupported = typeof window !== "undefined" &&
    !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

  const clearError = useCallback(() => setError(null), []);

  const start = useCallback(async (): Promise<void> => {
    if (!isSupported) {
      setError("Audio recording is not supported in this browser.");
      return;
    }

    setError(null);

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
        setError("Audio recording error. Please check your microphone.");
        setIsRecording(false);
      };

      recorder.start();
      setIsRecording(true);
    } catch (err: any) {
      console.error("[Recorder] Failed to start:", err);
      const msg = err?.name === "NotAllowedError"
        ? "Microphone access denied. Please allow microphone permission."
        : err?.name === "NotFoundError"
        ? "No microphone found. Please connect a microphone."
        : `Failed to start recording: ${err.message || err}`;
      setError(msg);
    }
  }, [isSupported]);

  const stop = useCallback(async (): Promise<string> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        resolve("");
        return;
      }

      resolveRef.current = resolve;

      recorder.onstop = async () => {
        setIsRecording(false);
        recorder.stream.getTracks().forEach((t) => t.stop());

        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size < 100) {
          setError("No audio detected. Please speak louder or check your microphone.");
          resolve("");
          return;
        }

        try {
          const formData = new FormData();
          formData.append("file", blob, "recording.webm");

          const baseUrl = import.meta.env.VITE_API_BASE || "";
          const resp = await fetch(`${baseUrl}/whisper/transcribe`, {
            method: "POST",
            body: formData,
          });

          if (!resp.ok) {
            const errData = await resp.json().catch(() => ({}));
            const detail = errData.detail || `HTTP ${resp.status}`;
            setError(`Transcription failed: ${detail}`);
            resolve("");
            return;
          }

          const data = await resp.json();
          const text = data.text || "";
          if (!text.trim()) {
            setError("Whisper returned empty text. The audio may not be clear enough.");
          }
          resolve(text);
        } catch (err: any) {
          console.error("[Recorder] Upload failed:", err);
          setError(`Failed to connect to server: ${err.message || err}`);
          resolve("");
        }
      };

      recorder.stop();
    });
  }, []);

  return { isRecording, start, stop, isSupported, error, clearError };
}
