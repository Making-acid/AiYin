export type Live2DState = "IDLE" | "LISTENING" | "REACTING" | "THINKING" | "SPEAKING";
export type StateEvent = "START_LISTENING" | "STOP_LISTENING" | "TTS_START" | "TTS_DONE";

type TickFn = (dt: number, elapsed: number) => void;
type StateHandler = {
  enter?: () => void;
  exit?: () => void;
  tick?: TickFn;
  duration?: number;
  after?: string;
};

interface StateMachineConfig {
  states: Record<string, StateHandler>;
  transitions: Record<string, Record<string, string>>;
  initial: string;
}

export class StateMachine {
  private states: Map<string, StateHandler> = new Map();
  private transitions: Map<string, Map<string, string>> = new Map();
  private current: string;
  private elapsed = 0;
  private started = false;

  constructor(config: StateMachineConfig) {
    this.current = config.initial;
    for (const [name, handler] of Object.entries(config.states)) {
      this.states.set(name, handler);
    }
    for (const [from, map] of Object.entries(config.transitions)) {
      const tmap = new Map<string, string>();
      for (const [event, to] of Object.entries(map)) {
        tmap.set(event, to);
      }
      this.transitions.set(from, tmap);
    }
  }

  get state(): string {
    return this.current;
  }

  get elapsedSeconds(): number {
    return this.elapsed;
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    const h = this.states.get(this.current);
    h?.enter?.();
  }

  send(event: string): void {
    const tmap = this.transitions.get(this.current);
    const next = tmap?.get(event);
    if (!next || next === this.current) return;
    this.transitionTo(next);
  }

  setState(next: string): void {
    if (!this.states.has(next) || next === this.current) return;
    this.transitionTo(next);
  }

  update(dt: number): void {
    this.states.get(this.current)?.tick?.(dt, this.elapsed);
    this.elapsed += dt;
    this.checkAutoAdvance();
  }

  destroy(): void {
    if (!this.started) return;
    this.states.get(this.current)?.exit?.();
    this.started = false;
  }

  private transitionTo(next: string): void {
    this.states.get(this.current)?.exit?.();
    this.elapsed = 0;
    this.current = next;
    this.states.get(next)?.enter?.();
  }

  private checkAutoAdvance(): void {
    const d = this.states.get(this.current)?.duration;
    if (d && d > 0 && this.elapsed >= d / 1000) {
      this.autoAdvance();
    }
  }

  private autoAdvance(): void {
    const next = this.states.get(this.current)?.after ?? "IDLE";
    this.transitionTo(next);
  }
}
