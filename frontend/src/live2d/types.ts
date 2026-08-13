import type { CharacterBehaviorConfig } from "./behavior";
import type { StateEvent } from "./stateMachine";

export type Live2DVisualState = "idle" | "speaking" | "listening" | "thinking";
export type Live2DBehavior = "follow_mouse" | "look_forward";

export interface CharacterLayout {
  /** Character height relative to the render viewport height. */
  heightRatio: number;
  /** Normalized position inside the render viewport. */
  x: number;
  y: number;
  /** Anchor point inside the Live2D model. */
  anchorX: number;
  anchorY: number;
}

export interface Live2DCharacterDefinition {
  id: string;
  modelPath: string;
  layout: CharacterLayout;
  behavior: CharacterBehaviorConfig;
}

export interface CharacterViewProps {
  state?: Live2DVisualState;
  event?: StateEvent | null;
  /** Normalized 0..1 mouth opening supplied by the active speech provider. */
  mouthValue?: number;
  behavior?: Live2DBehavior;
  className?: string;
}
