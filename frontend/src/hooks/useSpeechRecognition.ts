import { useState, useRef, useCallback } from "react";

interface UseSpeechRecognitionReturn {
  isListening: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => Promise<string>;
  error: string | null;
  isSupported: boolean;
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const resolveRef = useRef<((text: string) => void) | null>(null);

  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  const isSupported = !!SpeechRecognition;

  const startListening = useCallback(() => {
    if (!SpeechRecognition) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;

    let finalTranscript = "";

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + " ";
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setTranscript(finalTranscript + interim);
    };

    recognition.onerror = (event: any) => {
      setError(`Speech recognition error: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (resolveRef.current) {
        resolveRef.current(finalTranscript.trim());
        resolveRef.current = null;
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    setTranscript("");
    setError(null);
  }, [SpeechRecognition]);

  const stopListening = useCallback((): Promise<string> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    });
  }, []);

  return { isListening, transcript, startListening, stopListening, error, isSupported };
}
