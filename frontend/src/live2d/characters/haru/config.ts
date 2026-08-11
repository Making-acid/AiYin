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
    faces: {
      neutral: {
        kind: "parameters",
        values: {
          ParamTere: 0,
          ParamEyeLSmile: 0,
          ParamEyeRSmile: 0,
          ParamEyeForm: 0,
          ParamBrowLAngle: 0,
          ParamBrowRAngle: 0,
          ParamBrowLForm: 0,
          ParamBrowRForm: 0,
          ParamMouthForm: 0,
        },
      },
      attentive: {
        kind: "parameters",
        values: {
          ParamTere: 0,
          ParamEyeLSmile: 0.08,
          ParamEyeRSmile: 0.08,
          ParamBrowLAngle: 0.08,
          ParamBrowRAngle: 0.08,
          ParamMouthForm: 0.03,
        },
      },
      soft_smile: {
        kind: "parameters",
        values: {
          ParamTere: 0,
          ParamEyeLSmile: 0.18,
          ParamEyeRSmile: 0.18,
          ParamMouthForm: 0.12,
        },
      },
    },
    // Exam-safe whitelist. The remaining source motions stay available as
    // assets, but are deliberately unreachable from the examiner policy.
    motions: {
      settled_idle: [
        { group: "", index: 0, loop: true, priority: 1 },
      ],
      acknowledge_small: [
        { group: "", index: 2, durationMs: 1900, priority: 2 },
      ],
      present_question: [
        { group: "", index: 7, durationMs: 3700, priority: 2 },
      ],
    },
    states: {
      IDLE: {
        face: "neutral",
        baseMotion: "settled_idle",
        gaze: { x: 0, y: 0, drift: 0.012, headLock: 0.42 },
      },
      LISTENING: {
        face: "attentive",
        baseMotion: "settled_idle",
        gaze: { x: 0, y: 0, drift: 0.008, headLock: 0.52 },
        accents: {
          motions: ["acknowledge_small"],
          intervalMs: [9000, 13500],
          initialDelayMs: [6500, 9500],
        },
      },
      REACTING: {
        face: "soft_smile",
        entryMotion: "acknowledge_small",
        gaze: { x: 0, y: 0, drift: 0.006, headLock: 0.5 },
        duration: 1500,
        after: "IDLE",
      },
      THINKING: {
        // API latency must not look like judging or confusion.
        face: "neutral",
        baseMotion: "settled_idle",
        gaze: { x: 0, y: 0, drift: 0.01, headLock: 0.46 },
      },
      SPEAKING: {
        face: "neutral",
        baseMotion: "settled_idle",
        entryMotion: "present_question",
        gaze: { x: 0, y: 0, drift: 0.008, headLock: 0.5 },
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
