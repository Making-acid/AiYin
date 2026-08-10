import type { Live2DCharacterDefinition } from "../../types";

export const haruDefinition: Live2DCharacterDefinition = {
  id: "haru",
  modelPath: "/third_party/live2d/models/haru/haru_greeter_t05.model3.json",
  layout: {
    // Waist-up framing for the examiner's full-width video-call stage.
    heightRatio: 2.55,
    x: 0.5,
    y: 1.22,
    anchorX: 0.5,
    anchorY: 0.5,
  },
  behavior: {
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
  },
};
