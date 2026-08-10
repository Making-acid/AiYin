import type {
  CharacterBehaviorConfig,
  CharacterStatePresentation,
  FaceIntent,
  MotionAsset,
  MotionIntent,
  SpeakingAccentPolicy,
} from "./behavior";
import { StateMachine, type Live2DState } from "./stateMachine";
import type { Live2DVisualState } from "./types";

type ModelRef = { current: any };

const VISUAL_TO_INTERNAL: Record<Live2DVisualState, Live2DState> = {
  idle: "IDLE",
  listening: "LISTENING",
  thinking: "THINKING",
  speaking: "SPEAKING",
};

const CADENCE_PATTERN = [0.25, 0.72, 0.43, 0.86, 0.58];

export class StateRunner {
  readonly sm: StateMachine;

  private readonly model: ModelRef;
  private readonly config: CharacterBehaviorConfig;
  private motionTimer: ReturnType<typeof setTimeout> | null = null;
  private faceTimer: ReturnType<typeof setTimeout> | null = null;
  private motionCursor = new Map<MotionIntent, number>();
  private accentCursor = 0;
  private accentNextSec = Number.POSITIVE_INFINITY;

  constructor(model: ModelRef, config: CharacterBehaviorConfig) {
    this.model = model;
    this.config = config;

    const handlers = Object.fromEntries(
      Object.entries(config.states).map(([name, presentation]) => [
        name,
        {
          enter: () => this.onEnter(name as Live2DState, presentation),
          exit: () => this.onExit(),
          duration: presentation.duration,
          after: presentation.after,
        },
      ]),
    );

    this.sm = new StateMachine({
      states: handlers,
      transitions: config.transitions,
      initial: config.initial,
    });
    this.sm.start();
  }

  send(event: string): void {
    this.sm.send(event);
  }

  setVisualState(state: Live2DVisualState): void {
    const next = VISUAL_TO_INTERNAL[state];
    if (next === "IDLE" && this.sm.state === "LISTENING") {
      this.sm.send("STOP_LISTENING");
      return;
    }
    this.sm.setState(next);
  }

  tick(dt: number, mouthOpen: boolean, lockGaze: boolean): void {
    this.sm.update(dt);

    const state = this.sm.state as Live2DState;
    const presentation = this.config.states[state];
    if (lockGaze) this.updateGaze(presentation);
    this.updateMouth(state === "SPEAKING" && mouthOpen);

    if (state === "SPEAKING" && presentation.speakingAccent) {
      this.tickSpeakingAccent(presentation.speakingAccent);
    }
  }

  destroy(): void {
    this.clearMotionTimer();
    this.clearFaceTimer();
    this.stopAllMotions();
    this.sm.destroy();
  }

  private onEnter(state: Live2DState, presentation: CharacterStatePresentation): void {
    this.clearFaceTimer();
    this.stopBodyChannel();
    this.applyFace(presentation.face);

    if (presentation.motion) this.playMotion(presentation.motion);

    if (state === "SPEAKING" && presentation.speakingAccent) {
      this.accentCursor = 0;
      this.accentNextSec = this.nextAccentDelay(presentation.speakingAccent) / 1000;
    } else {
      this.accentNextSec = Number.POSITIVE_INFINITY;
    }
  }

  private onExit(): void {
    this.clearFaceTimer();
    this.stopBodyChannel();
  }

  private tickSpeakingAccent(policy: SpeakingAccentPolicy): void {
    const elapsed = this.sm.elapsedSeconds;
    if (elapsed < this.accentNextSec || policy.motions.length === 0) return;

    const index = this.accentCursor % policy.motions.length;
    const durationMs = this.playMotion(policy.motions[index]);
    if (policy.faces?.length) {
      this.applyFace(policy.faces[index % policy.faces.length]);
      this.scheduleFaceReset(policy.faceHoldMs ?? 1000);
    }

    this.accentCursor += 1;
    this.accentNextSec = elapsed + (durationMs + this.nextAccentDelay(policy)) / 1000;
  }

  private nextAccentDelay(policy: SpeakingAccentPolicy): number {
    const [min, max] = policy.intervalMs;
    const ratio = CADENCE_PATTERN[this.accentCursor % CADENCE_PATTERN.length];
    return min + (max - min) * ratio;
  }

  private applyFace(intent: FaceIntent): void {
    const model = this.model.current;
    const definition = this.config.faces[intent];
    if (!model || !definition) return;

    if (definition.kind === "expression") {
      try { model.expression?.(definition.id); } catch { /* optional model feature */ }
      return;
    }

    const core = model.internalModel?.coreModel;
    if (!core) return;
    for (const [parameterId, value] of Object.entries(definition.values)) {
      try { core.setParameterValueById(parameterId, value); } catch { /* optional parameter */ }
    }
  }

  private scheduleFaceReset(delayMs: number): void {
    this.clearFaceTimer();
    this.faceTimer = setTimeout(() => {
      this.faceTimer = null;
      const state = this.sm.state as Live2DState;
      this.applyFace(this.config.states[state].face);
    }, delayMs);
  }

  private playMotion(intent: MotionIntent): number {
    const assets = this.config.motions[intent];
    if (!assets?.length) return 0;

    const cursor = this.motionCursor.get(intent) ?? 0;
    const asset = assets[cursor % assets.length];
    this.motionCursor.set(intent, cursor + 1);
    this.startMotion(asset);
    return asset.durationMs ?? 0;
  }

  private startMotion(asset: MotionAsset): void {
    const manager = this.model.current?.internalModel?.motionManager;
    if (!manager) return;

    this.clearMotionTimer();
    manager.stopAllMotions?.();
    manager.startMotion(asset.group, asset.index, asset.priority ?? 1)?.catch(() => {});

    if (asset.loop || !asset.durationMs) return;
    this.motionTimer = setTimeout(() => {
      this.motionTimer = null;
      manager.stopAllMotions?.();
    }, asset.durationMs);
  }

  private stopBodyChannel(): void {
    this.clearMotionTimer();
    this.stopAllMotions();
  }

  private stopAllMotions(): void {
    try { this.model.current?.internalModel?.motionManager?.stopAllMotions?.(); } catch { /* destroyed */ }
  }

  private updateGaze(presentation: CharacterStatePresentation): void {
    const gaze = presentation.gaze ?? { x: 0, y: 0 };
    try {
      this.model.current?.internalModel?.focusController?.focus(gaze.x, gaze.y, false);
    } catch { /* destroyed */ }
  }

  private updateMouth(open: boolean): void {
    try {
      const model = this.model.current;
      if (!model || model.destroyed) return;
      const core = model.internalModel?.coreModel;
      if (!core) return;
      const parameterIds = core.getParameterIds?.() || [];
      const value = open ? 0.6 : 0;
      if (parameterIds.includes("ParamMouthOpenY")) {
        core.setParameterValueById("ParamMouthOpenY", value);
      } else if (parameterIds.includes("ParamA")) {
        core.setParameterValueById("ParamA", value);
      }
    } catch { /* destroyed */ }
  }

  private clearMotionTimer(): void {
    if (!this.motionTimer) return;
    clearTimeout(this.motionTimer);
    this.motionTimer = null;
  }

  private clearFaceTimer(): void {
    if (!this.faceTimer) return;
    clearTimeout(this.faceTimer);
    this.faceTimer = null;
  }
}
