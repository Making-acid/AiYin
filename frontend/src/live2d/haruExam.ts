import type { CharacterConfig } from "./stateRunner";

export const haruExam: CharacterConfig = {
  layout: { scale: 2.2, offsetX: 0.0, offsetY: 0.55 },
  initial: "IDLE",
  states: {
    IDLE: {
      expression: "neutral",
      motion: "idle",
    },
    LISTENING: {
      expression: "interested",
    },
    REACTING: {
      expression: "smile",
      motion: "nod",
      duration: 600,
    },
    THINKING: {
      expression: "thinking",
    },
    SPEAKING: {
      expression: "neutral",
    },
  },
  transitions: {
    IDLE:      { START_LISTENING: "LISTENING" },
    LISTENING: { STOP_LISTENING: "REACTING" },
    REACTING:  { TTS_START: "SPEAKING", TTS_DONE: "SPEAKING" },
    THINKING:  { TTS_START: "SPEAKING" },
    SPEAKING:  { TTS_DONE: "IDLE" },
  },
};
