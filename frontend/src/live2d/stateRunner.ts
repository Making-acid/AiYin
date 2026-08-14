import type {
  AccentPolicy,
  CharacterBehaviorConfig,
  CharacterStatePresentation,
  FaceIntent,
  MotionAsset,
  MotionIntent,
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
  private motionGeneration = 0;
  private motionCursor = new Map<MotionIntent, number>();
  private accentCursor = 0;
  private accentNextSec = Number.POSITIVE_INFINITY;
  private activeFace: FaceIntent;
  private mouthValue = 0;
  private preserveBodyTransition = false;

  constructor(model: ModelRef, config: CharacterBehaviorConfig) {
    this.model = model;
    this.config = config;
    this.activeFace = config.states[config.initial].face;

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
    const currentPresentation = this.config.states[this.sm.state as Live2DState];
    const nextPresentation = this.config.states[next];
    const preserveBody = Boolean(
      currentPresentation?.baseMotion
      && currentPresentation.baseMotion === nextPresentation?.baseMotion
      && !nextPresentation?.entryMotion,
    );
    this.preserveBodyTransition = preserveBody;
    try {
      if (next === "IDLE" && this.sm.state === "LISTENING") {
        this.sm.send("STOP_LISTENING");
        return;
      }
      this.sm.setState(next);
    } finally {
      this.preserveBodyTransition = false;
    }
  }

  tick(dt: number, mouthValue: number, lockGaze: boolean): void {
    this.sm.update(dt);

    const state = this.sm.state as Live2DState;
    const presentation = this.config.states[state];
    if (presentation.accents) this.tickAccents(presentation.accents);

    this.enforceParameterFace();
    if (lockGaze) this.updateGaze(presentation);
    this.updateMouth(state === "SPEAKING" ? mouthValue : 0, dt);
  }

  destroy(): void {
    this.clearMotionTimer();
    this.clearFaceTimer();
    this.stopAllMotions();
    this.sm.destroy();
  }

  private onEnter(_state: Live2DState, presentation: CharacterStatePresentation): void {
    this.clearFaceTimer();
    if (!this.preserveBodyTransition) this.stopBodyChannel();

    if (presentation.baseMotion && !this.preserveBodyTransition) this.playMotion(presentation.baseMotion);
    if (presentation.entryMotion) this.playMotion(presentation.entryMotion, true);
    this.setFace(presentation.face);

    if (presentation.accents) {
      this.accentCursor = 0;
      const range = presentation.accents.initialDelayMs ?? presentation.accents.intervalMs;
      this.accentNextSec = this.cadenceDelay(range) / 1000;
    } else {
      this.accentNextSec = Number.POSITIVE_INFINITY;
    }
  }

  private onExit(): void {
    this.clearFaceTimer();
    if (!this.preserveBodyTransition) this.stopBodyChannel();
  }

  private tickAccents(policy: AccentPolicy): void {
    const elapsed = this.sm.elapsedSeconds;
    if (elapsed < this.accentNextSec || policy.motions.length === 0) return;

    const index = this.accentCursor % policy.motions.length;
    const durationMs = this.playMotion(policy.motions[index], true);
    if (policy.faces?.length) {
      this.setFace(policy.faces[index % policy.faces.length]);
      this.scheduleFaceReset(policy.faceHoldMs ?? 1000);
    }

    this.accentCursor += 1;
    this.accentNextSec = elapsed + (durationMs + this.cadenceDelay(policy.intervalMs)) / 1000;
  }

  private cadenceDelay([min, max]: [number, number]): number {
    const ratio = CADENCE_PATTERN[this.accentCursor % CADENCE_PATTERN.length];
    return min + (max - min) * ratio;
  }

  private setFace(intent: FaceIntent): void {
    this.activeFace = intent;
    this.applyFace(intent);
  }

  private applyFace(intent: FaceIntent): void {
    const model = this.model.current;
    const definition = this.config.faces[intent];
    if (!model || !definition) return;

    if (definition.kind === "expression") {
      try { model.expression?.(definition.id); } catch { /* optional model feature */ }
      return;
    }

    this.applyParameters(definition.values);
  }

  private enforceParameterFace(): void {
    const definition = this.config.faces[this.activeFace];
    if (definition?.kind === "parameters") this.applyParameters(definition.values);
  }

  private applyParameters(values: Record<string, number>): void {
    const core = this.model.current?.internalModel?.coreModel;
    if (!core) return;
    for (const [parameterId, value] of Object.entries(values)) {
      try { core.setParameterValueById(parameterId, value); } catch { /* optional parameter */ }
    }
  }

  private scheduleFaceReset(delayMs: number): void {
    this.clearFaceTimer();
    this.faceTimer = setTimeout(() => {
      this.faceTimer = null;
      const state = this.sm.state as Live2DState;
      this.setFace(this.config.states[state].face);
    }, delayMs);
  }

  private playMotion(intent: MotionIntent, resumeBase = false): number {
    const assets = this.config.motions[intent];
    if (!assets?.length) return 0;

    const cursor = this.motionCursor.get(intent) ?? 0;
    const asset = assets[cursor % assets.length];
    this.motionCursor.set(intent, cursor + 1);
    const expectedState = this.sm.state;
    this.startMotion(asset, resumeBase ? () => this.resumeBaseMotion(expectedState) : undefined);
    return asset.durationMs ?? 0;
  }

  private startMotion(asset: MotionAsset, onComplete?: () => void): void {
    const manager = this.model.current?.internalModel?.motionManager;
    if (!manager) return;

    this.clearMotionTimer();
    const generation = ++this.motionGeneration;
    manager.stopAllMotions?.();
    manager.startMotion(asset.group, asset.index, asset.priority ?? 1)?.catch(() => {});

    if (asset.loop || !asset.durationMs) return;
    this.motionTimer = setTimeout(() => {
      if (generation !== this.motionGeneration) return;
      this.motionTimer = null;
      manager.stopAllMotions?.();
      onComplete?.();
    }, asset.durationMs);
  }

  private resumeBaseMotion(expectedState: string): void {
    if (this.sm.state !== expectedState) return;
    const presentation = this.config.states[expectedState as Live2DState];
    if (presentation.baseMotion) this.playMotion(presentation.baseMotion);
  }

  private stopBodyChannel(): void {
    this.clearMotionTimer();
    this.stopAllMotions();
  }

  private stopAllMotions(): void {
    try { this.model.current?.internalModel?.motionManager?.stopAllMotions?.(); } catch { /* destroyed */ }
  }

  private updateGaze(presentation: CharacterStatePresentation): void {
    const gaze = presentation.gaze ?? { x: 0, y: 0, drift: 0, headLock: 0.45 };
    const elapsed = this.sm.elapsedSeconds;
    const drift = gaze.drift ?? 0;
    const x = gaze.x + Math.sin(elapsed * 0.73) * drift;
    const y = gaze.y + Math.sin(elapsed * 0.47 + 0.8) * drift * 0.55;
    const model = this.model.current;

    try { model?.internalModel?.focusController?.focus(x, y, false); } catch { /* destroyed */ }

    const core = model?.internalModel?.coreModel;
    if (!core) return;
    try { core.setParameterValueById("ParamEyeBallX", x); } catch { /* optional parameter */ }
    try { core.setParameterValueById("ParamEyeBallY", y); } catch { /* optional parameter */ }

    const headLock = Math.min(1, Math.max(0, gaze.headLock ?? 0.45));
    this.blendParameter(core, "ParamAngleX", x * 24, headLock);
    this.blendParameter(core, "ParamAngleY", y * 18, headLock);
  }

  private blendParameter(core: any, parameterId: string, target: number, strength: number): void {
    try {
      const current = core.getParameterValueById(parameterId);
      core.setParameterValueById(parameterId, current + (target - current) * strength);
    } catch { /* optional parameter */ }
  }

  private updateMouth(value: number, dt: number): void {
    try {
      const model = this.model.current;
      if (!model || model.destroyed) return;
      const core = model.internalModel?.coreModel;
      if (!core) return;
      const target = Math.max(0, Math.min(1, value));
      const blend = 1 - Math.exp(-Math.max(0, dt) * (target > this.mouthValue ? 18 : 22));
      this.mouthValue += (target - this.mouthValue) * blend;
      const parameterIds = core.getParameterIds?.() || [];
      if (parameterIds.includes("ParamMouthOpenY")) {
        core.setParameterValueById("ParamMouthOpenY", this.mouthValue);
      } else if (parameterIds.includes("ParamA")) {
        core.setParameterValueById("ParamA", this.mouthValue);
      }
    } catch { /* destroyed */ }
  }

  private clearMotionTimer(): void {
    this.motionGeneration += 1;
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
