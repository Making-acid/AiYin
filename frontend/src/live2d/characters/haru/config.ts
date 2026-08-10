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
        { group: "", index: 2, durationMs: 1200, priority: 2 },
      ],
      present_question: [
        { group: "", index: 7, durationMs: 1800, priority: 2 },
      ],
    },
    states: {
      IDLE: {
        face: "neutral",
        motion: "settled_idle",
      },
      LISTENING: {
        face: "attentive",
      },
      REACTING: {
        face: "soft_smile",
        motion: "acknowledge_small",
        duration: 900,
        after: "IDLE",
      },
      THINKING: {
        // API latency must not look like judging or confusion.
        face: "neutral",
      },
      SPEAKING: {
        face: "neutral",
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
