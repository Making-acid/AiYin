import { useRef, useCallback, useState } from "react";

export interface DualRecordingResult {
  text: string;
  audio: Blob;
}

export function useDualRecording(lang: string = "en-US") {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const resolveRef = useRef<((result: DualRecordingResult) => void) | null>(null);
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef("");

  const isSupported = typeof window !== "undefined" &&
    !!(navigator.mediaDevices?.getUserMedia) &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  const start = useCallback(async () => {
    if (!isSupported) {
      setError("asrNotSupported");
      return;
    }
    setError(null);
    setTranscript("");
    finalTranscriptRef.current = "";

    try {
      // 1. Start MediaRecorder for audio capture
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus" : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.start();

      // 2. Start browser ASR
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SR();
      recognition.lang = lang;
      recognition.interimResults = true;
      recognition.continuous = true;
      recognition.onresult = (event: any) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscriptRef.current += event.results[i][0].transcript + " ";
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        setTranscript(finalTranscriptRef.current + interim);
      };
      recognition.onerror = (_event: any) => {
        setError("asrSpeechError");
      };
      recognition.onend = () => {
        setIsRecording(false);
        const text = finalTranscriptRef.current.trim();
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (resolveRef.current) {
          resolveRef.current({ text, audio: blob });
          resolveRef.current = null;
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsRecording(true);
    } catch (err) {
      setError("asrMicDenied");
      console.error("[DualRecording] Start failed:", err);
    }
  }, [isSupported, lang]);

  const stop = useCallback(async (): Promise<DualRecordingResult> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      recognitionRef.current?.stop();
      mediaRecorderRef.current?.stop();
      // Cleanup stream tracks
      try { mediaRecorderRef.current?.stream?.getTracks()?.forEach((t: any) => t.stop()); } catch { /* ok */ }
    });
  }, []);

  return { isRecording, transcript, error, start, stop, isSupported };
}
