import type { Live2DState, StateEvent } from "./stateMachine";

export type FaceIntent =
  | "neutral"
  | "attentive"
  | "soft_smile"
  | "eyes_closed"
  | "excited"
  | "sad"
  | "embarrassed"
  | "surprised"
  | "pout";

export type MotionIntent =
  | "settled_idle"
  | "acknowledge_small"
  | "present_question"
  | "considering"
  | "speaking_accent"
  | "soft_reaction"
  | "special_create"
  | "special_affection"
  | "special_showcase";

export type FaceDefinition =
  | { kind: "expression"; id: string }
  | { kind: "parameters"; values: Record<string, number> };

export interface MotionAsset {
  group: string;
  index: number;
  /** Runtime cutoff. Source files incorrectly mark every motion as looping. */
  durationMs?: number;
  loop?: boolean;
  priority?: number;
}

export interface SpeakingAccentPolicy {
  motions: MotionIntent[];
  faces?: FaceIntent[];
  intervalMs: [number, number];
  faceHoldMs?: number;
}

export interface CharacterStatePresentation {
  face: FaceIntent;
  motion?: MotionIntent;
  gaze?: { x: number; y: number };
  duration?: number;
  after?: Live2DState;
  speakingAccent?: SpeakingAccentPolicy;
}

export interface CharacterBehaviorConfig {
  initial: Live2DState;
  faces: Partial<Record<FaceIntent, FaceDefinition>>;
  motions: Partial<Record<MotionIntent, MotionAsset[]>>;
  states: Record<Live2DState, CharacterStatePresentation>;
  transitions: Record<Live2DState, Partial<Record<StateEvent, Live2DState>>>;
}
