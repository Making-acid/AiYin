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

export interface AccentPolicy {
  motions: MotionIntent[];
  faces?: FaceIntent[];
  intervalMs: [number, number];
  initialDelayMs?: [number, number];
  faceHoldMs?: number;
}

export interface GazePolicy {
  /** Normalized focus target. 0, 0 means eye contact with the camera. */
  x: number;
  y: number;
  /** Small deterministic movement around the target to avoid a fixed stare. */
  drift?: number;
  /** How strongly head angles are pulled back toward the camera (0-1). */
  headLock?: number;
}

export interface CharacterStatePresentation {
  face: FaceIntent;
  /** Continuous motion used while the state is active. */
  baseMotion?: MotionIntent;
  /** One-shot motion played on entry, then the base motion resumes. */
  entryMotion?: MotionIntent;
  gaze?: GazePolicy;
  duration?: number;
  after?: Live2DState;
  accents?: AccentPolicy;
}

export interface CharacterBehaviorConfig {
  initial: Live2DState;
  faces: Partial<Record<FaceIntent, FaceDefinition>>;
  motions: Partial<Record<MotionIntent, MotionAsset[]>>;
  states: Record<Live2DState, CharacterStatePresentation>;
  transitions: Record<Live2DState, Partial<Record<StateEvent, Live2DState>>>;
}

export function validateBehaviorConfig(config: CharacterBehaviorConfig): string[] {
  const issues: string[] = [];
  const hasMotion = (intent: MotionIntent) => Boolean(config.motions[intent]?.length);

  for (const [state, presentation] of Object.entries(config.states)) {
    for (const intent of [presentation.baseMotion, presentation.entryMotion]) {
      if (intent && !hasMotion(intent)) issues.push(`${state} references missing motion: ${intent}`);
    }
    for (const intent of presentation.accents?.motions ?? []) {
      if (!hasMotion(intent)) issues.push(`${state} accent references missing motion: ${intent}`);
    }
    const [min, max] = presentation.accents?.intervalMs ?? [0, 0];
    if (presentation.accents && (min <= 0 || max < min)) {
      issues.push(`${state} has an invalid accent interval`);
    }
  }

  for (const [state, transitions] of Object.entries(config.transitions)) {
    for (const target of Object.values(transitions)) {
      if (target && !config.states[target]) issues.push(`${state} transitions to missing state: ${target}`);
    }
  }

  return issues;
}
