export type Live2DState = "IDLE" | "LISTENING" | "REACTING" | "THINKING" | "SPEAKING";
export type StateEvent = "START_LISTENING" | "STOP_LISTENING" | "TTS_START" | "TTS_DONE";

type TickFn = (dt: number, elapsed: number) => void;
type StateHandler = { enter?: () => void; exit?: () => void; tick?: TickFn; duration?: number };

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
  private timerId: ReturnType<typeof setTimeout> | null = null;

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

  start(): void {
    const h = this.states.get(this.current);
    h?.enter?.();
    this.scheduleAutoAdvance();
  }

  send(event: string): void {
    const tmap = this.transitions.get(this.current);
    const next = tmap?.get(event);
    if (!next || next === this.current) return;
    this.transitionTo(next);
  }

  update(dt: number): void {
    this.states.get(this.current)?.tick?.(dt, this.elapsed);
    this.elapsed += dt;
    this.checkAutoAdvance();
  }

  destroy(): void {
    if (this.timerId) clearTimeout(this.timerId);
  }

  private transitionTo(next: string): void {
    this.states.get(this.current)?.exit?.();
    if (this.timerId) clearTimeout(this.timerId);
    this.elapsed = 0;
    this.current = next;
    this.states.get(next)?.enter?.();
    this.scheduleAutoAdvance();
  }

  private scheduleAutoAdvance(): void {
    const d = this.states.get(this.current)?.duration;
    if (d && d > 0) {
      this.timerId = setTimeout(() => this.autoAdvance(), d);
    }
  }

  private checkAutoAdvance(): void {
    const d = this.states.get(this.current)?.duration;
    if (d && d > 0 && this.elapsed >= d / 1000) {
      this.autoAdvance();
    }
  }

  private autoAdvance(): void {
    this.transitionTo("IDLE");
  }
}
