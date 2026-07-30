import { StateMachine } from "./stateMachine";

type ModelRef = { current: any };

export interface CharacterState {
  expression: string | string[];
  motion?: string | string[];
  duration?: number;
}

export interface CharacterConfig {
  layout: { scale: number; offsetX: number; offsetY: number };
  states: Record<string, CharacterState>;
  transitions: Record<string, Record<string, string>>;
  initial: string;
}

const MAO_EXPR: Record<string, string> = {
  "neutral":    "exp_01",
  "smile":      "exp_02",
  "closedEyes": "exp_03",
  "happy":      "exp_04",
  "surprised":  "exp_07",
};

const HARU_PARAMS: Record<string, Record<string, number>> = {
  "neutral":    { EyeLSmile: 0, EyeRSmile: 0, EyeLOpen: 0, EyeROpen: 0, BrowLAngle: 0, BrowRAngle: 0, BrowLForm: 0, BrowRForm: 0, EyeBallY: 0 },
  "smile":      { EyeLSmile: 0.3, EyeRSmile: 0.3 },
  "interested": { EyeLOpen: 0.12, EyeROpen: 0.12, BrowLAngle: 0.2, BrowRAngle: 0.2 },
  "thinking":   { BrowLAngle: -0.15, BrowRAngle: -0.15, EyeBallY: 0.08 },
  "surprised":  { EyeLOpen: 0.3, EyeROpen: 0.3, BrowLAngle: 0.35, BrowRAngle: 0.35, BrowLForm: 0.2, BrowRForm: 0.2 },
};

const SPEAK_CYCLE = ["happy", "smile", "surprised", "happy", "smile", "closedEyes", "happy"];
const IDLE_EXPR =  ["happy", "smile", "happy", "surprised", "closedEyes"];

export class StateRunner {
  sm: StateMachine;
  private model: ModelRef;
  private hasExpr: boolean;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  // Speaking cycle
  private speakIdx = 0;
  private speakNextSec = 0;
  // Idle expression cycling
  private idleNextSec = 0;
  // Listening fade
  private listenFaded = false;

  constructor(model: ModelRef, config: CharacterConfig) {
    this.model = model;
    this.hasExpr = typeof model.current?.expression === "function";

    const handlers: Record<string, any> = {};
    for (const [name, cs] of Object.entries(config.states)) {
      handlers[name] = {
        enter: () => this.onEnter(name, cs),
        exit: () => this.onExit(name),
        duration: cs.duration,
      };
    }

    this.sm = new StateMachine({
      states: handlers,
      transitions: config.transitions,
      initial: config.initial,
    });
    this.sm.start();

    try { model.current?.focus?.(0, 0, true); } catch { /* nop */ }
  }

  send(event: string): void { this.sm.send(event); }

  tick(dt: number, mouthOpen: boolean): void {
    this.sm.update(dt);

    const st = this.sm.state;
    const smElapsed = (this.sm as any).elapsed ?? 0;

    // Per-frame behavior by state
    if (st === "SPEAKING") {
      this.tickSpeaking(smElapsed);
      this.updateMouth(mouthOpen);
    } else {
      this.updateMouth(false);
    }

    if (st === "IDLE" && this.hasExpr) {
      this.tickIdleExpr(smElapsed);
    }
    if (st === "LISTENING" && this.hasExpr && !this.listenFaded) {
      if (smElapsed > 1.5) {
        this.listenFaded = true;
        this.applyExpression("happy");
      }
    }

    // Idle motion cycling
    if (st === "IDLE") {
      this.maybePlayIdle();
    }
  }

  destroy(): void {
    this.stopIdleTimer();
    this.sm.destroy();
  }

  // ---- State transitions ----

  private onEnter(stateName: string, cs: CharacterState): void {
    const expr = Array.isArray(cs.expression)
      ? cs.expression[Math.floor(Math.random() * cs.expression.length)]
      : cs.expression;
    this.applyExpression(expr);

    if (cs.motion && cs.motion !== "") {
      const mot = Array.isArray(cs.motion)
        ? cs.motion[Math.floor(Math.random() * cs.motion.length)]
        : cs.motion;
      if (mot) this.playMotion(mot);
    }

    if (stateName === "SPEAKING") {
      this.speakIdx = 0;
      this.speakNextSec = 1.2;
    }
    if (stateName === "LISTENING") this.listenFaded = false;
    // Haru: on REACTING with "nod", play reaction
    if (stateName === "REACTING" && !this.hasExpr && (cs.motion === "nod" || (Array.isArray(cs.motion) && cs.motion.includes("nod")))) {
      // handled by onEnter above which calls playMotion
    }
  }

  private onExit(_stateName: string): void {
    this.stopIdleTimer();
  }

  // ---- Per-frame handlers ----

  private tickSpeaking(elapsed: number): void {
    if (!this.hasExpr) return;
    if (elapsed >= this.speakNextSec) {
      this.speakNextSec = elapsed + 1.2 + Math.random() * 1.3;
      this.speakIdx = (this.speakIdx + 1) % SPEAK_CYCLE.length;
      this.applyExpression(SPEAK_CYCLE[this.speakIdx]);
      // Gesture every ~2nd expression
      if (this.speakIdx % 2 === 1 && Math.random() < 0.5) {
        this.playMotion("gesture");
      }
    }
  }

  private tickIdleExpr(elapsed: number): void {
    if (elapsed >= this.idleNextSec) {
      this.idleNextSec = elapsed + 3.5 + Math.random() * 4;
      const e = IDLE_EXPR[Math.floor(Math.random() * IDLE_EXPR.length)];
      this.applyExpression(e);
      if (e === "closedEyes") this.playMotion("gesture");
    }
  }

  private maybePlayIdle(): void {
    // Idle motion cycling via timer
    if (this.idleTimer) return;
    const delay = this.hasExpr
      ? 3000 + Math.random() * 4000
      : 4500 + Math.random() * 7500;
    this.idleTimer = setTimeout(() => {
      this.idleTimer = null;
      this.playMotion("idle");
    }, delay);
  }

  // ---- Expression / Motion ----

  private applyExpression(name: string): void {
    const model = this.model.current;
    if (!model) return;

    if (this.hasExpr) {
      const expId = MAO_EXPR[name] || name;
      try { model.expression?.(expId); } catch { /* nop */ }
    } else {
      const params = HARU_PARAMS[name] || HARU_PARAMS["neutral"];
      const core = model.internalModel?.coreModel;
      if (!core) return;
      for (const [pid, val] of Object.entries(params)) {
        try { core.setParameterValueById("Param" + pid, val); } catch { /* nop */ }
      }
    }
  }

  private playMotion(type: string): void {
    const model = this.model.current;
    if (!model || !type) return;
    const mgr = model.internalModel?.motionManager;
    if (!mgr) return;
    const groups: Record<string, any> = mgr.groups || {};

    const priorities: Record<string, number> = { idle: 1, nod: 2, gesture: 2, special: 3 };
    const filters: Record<string, (k: string) => boolean> = {
      idle:    (k) => k.toLowerCase().includes("idle"),
      nod:     (_k) => true,
      gesture: (k) => !k.toLowerCase().includes("idle"),
      special: (k) => !k.toLowerCase().includes("idle"),
    };

    const priority = priorities[type] ?? 1;
    const filter = filters[type] ?? ((_k) => true);

    const keys = Object.keys(groups).filter(filter);
    if (keys.length === 0) return;

    const group = keys[Math.floor(Math.random() * keys.length)];
    const motions = groups[group];
    if (!motions?.length) return;

    const idx = Math.floor(Math.random() * motions.length);
    mgr.startMotion(group, idx, priority as any)?.catch(() => {});
  }

  private updateMouth(open: boolean): void {
    try {
      const model = this.model.current;
      if (!model || model.destroyed) return;
      const core = model.internalModel?.coreModel;
      if (!core) return;
      const params = core.getParameterIds?.() || [];
      const val = open ? 0.6 : 0;
      if (params.includes("ParamMouthOpenY")) {
        core.setParameterValueById("ParamMouthOpenY", val);
      } else if (params.includes("ParamA")) {
        core.setParameterValueById("ParamA", val);
      }
    } catch { /* skip */ }
  }

  private stopIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }
}
