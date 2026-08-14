import { useCallback, useEffect, useRef, useState } from "react";

export interface DualRecordingResult {
  text: string;
  audio: Blob;
}

const EMPTY_AUDIO = new Blob([], { type: "audio/webm" });

export function useDualRecording(lang: string = "en-US") {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const finalTranscriptRef = useRef("");
  const startPromiseRef = useRef<Promise<boolean> | null>(null);
  const resultPromiseRef = useRef<Promise<DualRecordingResult> | null>(null);
  const resolveResultRef = useRef<((result: DualRecordingResult) => void) | null>(null);
  const completedResultRef = useRef<DualRecordingResult | null>(null);
  const generationRef = useRef(0);

  const SpeechRecognition = typeof window !== "undefined"
    ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
    : null;
  const isSupported = typeof window !== "undefined"
    && !!navigator.mediaDevices?.getUserMedia
    && !!SpeechRecognition
    && typeof MediaRecorder !== "undefined";

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const publishResult = useCallback((result: DualRecordingResult) => {
    completedResultRef.current = result;
    resolveResultRef.current?.(result);
    resolveResultRef.current = null;
    resultPromiseRef.current = null;
  }, []);

  const start = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError("asrNotSupported");
      return false;
    }
    if (startPromiseRef.current) return startPromiseRef.current;
    if (mediaRecorderRef.current?.state === "recording") return true;

    const generation = ++generationRef.current;
    const operation = (async () => {
      setError(null);
      setTranscript("");
      finalTranscriptRef.current = "";
      audioChunksRef.current = [];
      completedResultRef.current = null;

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
        const recognition = new SpeechRecognition();
        mediaRecorderRef.current = recorder;
        recognitionRef.current = recognition;

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };
        recorder.onerror = () => {
          setError("asrRecordError");
          setIsRecording(false);
          stopTracks();
        };
        recorder.onstop = () => {
          const result = {
            text: finalTranscriptRef.current.trim(),
            audio: new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" }),
          };
          setIsRecording(false);
          stopTracks();
          publishResult(result);
        };

        recognition.lang = lang;
        recognition.interimResults = true;
        recognition.continuous = true;
        recognition.onresult = (event: any) => {
          let interim = "";
          for (let index = event.resultIndex; index < event.results.length; index += 1) {
            if (event.results[index].isFinal) {
              finalTranscriptRef.current += `${event.results[index][0].transcript} `;
            } else {
              interim += event.results[index][0].transcript;
            }
          }
          setTranscript(finalTranscriptRef.current + interim);
        };
        recognition.onerror = () => {
          setError("asrSpeechError");
          if (recorder.state === "recording") recorder.stop();
        };
        recognition.onend = () => {
          recognitionRef.current = null;
        };

        recorder.start();
        try {
          recognition.start();
        } catch (cause) {
          if (recorder.state === "recording") recorder.stop();
          throw cause;
        }
        setIsRecording(true);
        return true;
      } catch (cause: any) {
        stream?.getTracks().forEach((track) => track.stop());
        stopTracks();
        mediaRecorderRef.current = null;
        recognitionRef.current = null;
        setIsRecording(false);
        setError(cause?.name === "NotFoundError" ? "asrNoMic" : cause?.name === "NotAllowedError" ? "asrMicDenied" : "asrStartFailed");
        return false;
      }
    })();

    startPromiseRef.current = operation;
    try {
      return await operation;
    } finally {
      if (startPromiseRef.current === operation) startPromiseRef.current = null;
    }
  }, [SpeechRecognition, isSupported, lang, publishResult, stopTracks]);

  const stop = useCallback(async (): Promise<DualRecordingResult> => {
    if (startPromiseRef.current) await startPromiseRef.current;
    if (completedResultRef.current) {
      const result = completedResultRef.current;
      completedResultRef.current = null;
      return result;
    }

    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      stopTracks();
      setIsRecording(false);
      return { text: finalTranscriptRef.current.trim(), audio: EMPTY_AUDIO };
    }
    if (resultPromiseRef.current) return resultPromiseRef.current;

    const resultPromise = new Promise<DualRecordingResult>((resolve) => {
      resolveResultRef.current = resolve;
    });
    resultPromiseRef.current = resultPromise;

    try {
      recognitionRef.current?.stop();
    } catch {
      recognitionRef.current = null;
    }
    if (recorder.state === "recording") recorder.stop();
    return resultPromise;
  }, [stopTracks]);

  useEffect(() => () => {
    generationRef.current += 1;
    try { recognitionRef.current?.abort(); } catch { /* already stopped */ }
    const recorder = mediaRecorderRef.current;
    if (recorder?.state === "recording") recorder.stop();
    stopTracks();
    resolveResultRef.current?.({ text: finalTranscriptRef.current.trim(), audio: EMPTY_AUDIO });
    resolveResultRef.current = null;
  }, [stopTracks]);

  return { isRecording, transcript, error, start, stop, isSupported };
}
