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
        baseMotion: "settled_idle",
        gaze: { x: 0, y: 0, drift: 0.025, headLock: 0.58 },
      },
      LISTENING: {
        face: "neutral",
        baseMotion: "settled_idle",
        gaze: { x: 0, y: 0, drift: 0.018, headLock: 0.66 },
        accents: {
          motions: ["soft_reaction"],
          faces: ["soft_smile"],
          intervalMs: [8500, 12500],
          initialDelayMs: [5500, 8000],
          faceHoldMs: 1200,
        },
      },
      REACTING: {
        face: "soft_smile",
        entryMotion: "soft_reaction",
        gaze: { x: 0, y: 0, drift: 0.015, headLock: 0.62 },
        duration: 1800,
        after: "IDLE",
      },
      THINKING: {
        face: "eyes_closed",
        baseMotion: "settled_idle",
        entryMotion: "considering",
        gaze: { x: -0.08, y: 0.04, drift: 0.012, headLock: 0.34 },
      },
      SPEAKING: {
        face: "neutral",
        baseMotion: "settled_idle",
        gaze: { x: 0, y: 0, drift: 0.02, headLock: 0.6 },
        accents: {
          motions: ["speaking_accent", "soft_reaction"],
          faces: ["soft_smile", "neutral"],
          intervalMs: [5200, 7600],
          initialDelayMs: [1800, 3000],
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
