import { useState, useRef, useCallback } from "react";

export function useBrowserAsr(lang: string = "en-US") {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const resolveRef = useRef<((text: string) => void) | null>(null);
  const langRef = useRef(lang);
  langRef.current = lang;

  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  const isSupported = !!SpeechRecognition;
  const clearError = useCallback(() => setErrorCode(null), []);

  const startListening = useCallback(() => {
    if (!SpeechRecognition) {
      setErrorCode("asrSpeechNotSupported");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = langRef.current;
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

    recognition.onerror = (_event: any) => {
      setErrorCode("asrSpeechError");
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
    setErrorCode(null);
  }, [SpeechRecognition]);

  const stopListening = useCallback((): Promise<string> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    });
  }, []);

  return { isListening, transcript, errorCode, startListening, stopListening, isSupported, clearError };
}
