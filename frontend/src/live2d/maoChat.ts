import type { CharacterConfig } from "./stateRunner";

export const maoChat: CharacterConfig = {
  layout: { scale: 2.2, offsetX: -0.12, offsetY: 0.28 },
  initial: "IDLE",
  states: {
    IDLE: {
      expression: ["happy", "smile", "happy", "surprised", "happy", "smile", "closedEyes"],
      motion: "idle",
    },
    LISTENING: {
      expression: ["surprised", "happy"],
    },
    REACTING: {
      expression: ["happy", "surprised", "happy", "smile", "closedEyes", "surprised", "happy"],
      motion: ["special", "gesture", "gesture", "gesture", "special", "gesture"],
      duration: 700,
    },
    THINKING: {
      expression: "closedEyes",
    },
    SPEAKING: {
      expression: ["happy", "smile", "surprised", "happy", "smile", "closedEyes", "happy"],
      motion: ["gesture", "", "", "gesture", "", "", "gesture"],
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
