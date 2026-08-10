import type { Live2DCharacterDefinition } from "../../types";

export const maoDefinition: Live2DCharacterDefinition = {
  id: "mao",
  modelPath: "/third_party/live2d/models/mao/mao_pro.model3.json",
  layout: {
    // Waist-up framing for the narrower free-chat video-call stage.
    heightRatio: 2.02,
    x: 0.48,
    y: 1.02,
    anchorX: 0.5,
    anchorY: 0.5,
  },
  behavior: {
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
  },
};
