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
    faces: {
      neutral: { kind: "expression", id: "exp_01" },
      soft_smile: { kind: "expression", id: "exp_02" },
      eyes_closed: { kind: "expression", id: "exp_03" },
      excited: { kind: "expression", id: "exp_04" },
      sad: { kind: "expression", id: "exp_05" },
      embarrassed: { kind: "expression", id: "exp_06" },
      surprised: { kind: "expression", id: "exp_07" },
      pout: { kind: "expression", id: "exp_08" },
    },
    motions: {
      settled_idle: [
        { group: "Idle", index: 0, loop: true, priority: 1 },
      ],
      speaking_accent: [
        { group: "", index: 0, durationMs: 3400, priority: 2 },
      ],
      soft_reaction: [
        { group: "", index: 1, durationMs: 4200, priority: 2 },
      ],
      considering: [
        { group: "", index: 2, durationMs: 4000, priority: 2 },
      ],
      special_create: [
        { group: "", index: 3, durationMs: 7600, priority: 3 },
      ],
      special_affection: [
        { group: "", index: 4, durationMs: 9100, priority: 3 },
      ],
      special_showcase: [
        { group: "", index: 5, durationMs: 9000, priority: 3 },
      ],
    },
    states: {
      IDLE: {
        face: "neutral",
        motion: "settled_idle",
      },
      LISTENING: {
        face: "neutral",
      },
      REACTING: {
        face: "soft_smile",
        motion: "soft_reaction",
        duration: 1200,
        after: "IDLE",
      },
      THINKING: {
        face: "eyes_closed",
        motion: "considering",
      },
      SPEAKING: {
        face: "neutral",
        speakingAccent: {
          motions: ["speaking_accent", "soft_reaction"],
          faces: ["soft_smile", "neutral"],
          intervalMs: [5200, 7600],
          faceHoldMs: 1100,
        },
      },
    },
    transitions: {
      IDLE:      { START_LISTENING: "LISTENING", TTS_START: "SPEAKING" },
      LISTENING: { STOP_LISTENING: "REACTING", TTS_START: "SPEAKING" },
      REACTING:  { START_LISTENING: "LISTENING", TTS_START: "SPEAKING", TTS_DONE: "IDLE" },
      THINKING:  { START_LISTENING: "LISTENING", TTS_START: "SPEAKING", TTS_DONE: "IDLE" },
      SPEAKING:  { START_LISTENING: "LISTENING", TTS_DONE: "IDLE" },
    },
  },
};
