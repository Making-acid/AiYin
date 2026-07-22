import { useEffect, useState } from "react";

interface TimerProps {
  seconds: number;
  onComplete?: () => void;
  running: boolean;
}

export function Timer({ seconds, onComplete, running }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState(seconds);

  useEffect(() => {
    setTimeLeft(seconds);
  }, [seconds]);

  useEffect(() => {
    if (!running || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onComplete?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [running, timeLeft, onComplete]);

  const minutes = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const isWarning = timeLeft <= 30 && running;

  return (
    <div className={`timer ${isWarning ? "warning" : ""}`}>
      {minutes}:{secs.toString().padStart(2, "0")}
    </div>
  );
}
