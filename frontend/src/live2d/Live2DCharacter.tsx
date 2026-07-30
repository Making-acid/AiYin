import { useEffect, useRef, useCallback, useState } from "react";
import { useLanguage } from "../i18n";
import { StateRunner, type CharacterConfig } from "./stateRunner";
import { haruExam } from "./haruExam";
import { maoChat } from "./maoChat";
import type { Live2DMode, StateEvent } from "./stateMachine";

type BehaviorMode = "follow_mouse" | "look_forward";

let pixiReady = false;

async function ensurePixi() {
  if (pixiReady) return;
  const PIXI = await import("pixi.js");
  (window as any).PIXI = PIXI;
  pixiReady = true;
}

export interface Live2DCharacterProps {
  modelPath: string;
  mode: Live2DMode;
  state?: "idle" | "speaking" | "listening";
  event?: StateEvent | null;
  mouthOpen?: boolean;
  behavior?: BehaviorMode;
  className?: string;
}

export function Live2DCharacter({
  modelPath,
  mode,
  state: visualState = "idle",
  event,
  mouthOpen = false,
  behavior = "follow_mouse",
  className = "",
}: Live2DCharacterProps) {
  const { t } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const domRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<any>(null);
  const modelRef = useRef<any>(null);
  const runnerRef = useRef<StateRunner | null>(null);
  const behaviorRef = useRef<BehaviorMode>(behavior);
  const mouthOpenRef = useRef(mouthOpen);
  const [error, setError] = useState<string | null>(null);

  behaviorRef.current = behavior;
  mouthOpenRef.current = mouthOpen;

  // External events
  useEffect(() => {
    if (event && runnerRef.current) {
      runnerRef.current.send(event);
    }
  }, [event]);

  // Visual state → events
  const prevState = useRef(visualState);
  useEffect(() => {
    if (!runnerRef.current) return;
    const prev = prevState.current;
    prevState.current = visualState;
    if (prev === visualState) return;

    if (visualState === "listening") runnerRef.current.send("START_LISTENING");
    else if (visualState === "speaking" && prev === "listening") {
      runnerRef.current.send("STOP_LISTENING");
      runnerRef.current.send("TTS_START");
    } else if (visualState === "idle" && prev === "speaking") {
      runnerRef.current.send("TTS_DONE");
    }
  }, [visualState]);

  const initLive2D = useCallback(async () => {
    const canvas = canvasRef.current;
    const domEl = domRef.current;
    if (!canvas || !domEl) return;

    const w = domEl.clientWidth || window.innerWidth * 0.55;
    const h = domEl.clientHeight || window.innerHeight;
    canvas.width = w;
    canvas.height = h;

    try {
      await ensurePixi();
      const { Live2DModel } = await import("pixi-live2d-display/cubism4");
      const PIXI = (window as any).PIXI;

      const app = new PIXI.Application({
        view: canvas, width: w, height: h, backgroundAlpha: 0,
        antialias: true, resolution: window.devicePixelRatio || 1, autoDensity: true,
      });
      appRef.current = app;

      const model = await Live2DModel.from(modelPath);
      const container = new PIXI.Container();
      app.stage.addChild(container);
      container.addChild(model);

      // Create state runner
      const config: CharacterConfig = mode === "exam" ? haruExam : maoChat;

      const { scale, offsetX, offsetY } = config.layout;
      const modelHeight = model.internalModel?.height || model.height || 2000;
      model.scale.set((h * scale) / modelHeight);
      container.x = w * offsetX;
      container.y = h * offsetY;
      modelRef.current = model;

      const runner = new StateRunner(modelRef, config);
      runnerRef.current = runner;

      // Main loop
      app.ticker.add(() => {
        if (!model || model.destroyed) return;

        if (behaviorRef.current === "look_forward") {
          model.focus(0, 0, false);
        }

        runner.tick(app.ticker.deltaMS / 1000, mouthOpenRef.current);
      });

      // Resize
      const handleResize = () => {
        if (!domEl) return;
        const nw = domEl.clientWidth || window.innerWidth * 0.55;
        const nh = domEl.clientHeight || window.innerHeight;
        app.renderer.resize(nw, nh);
        const mh = model.internalModel?.height || model.height || 2000;
        model.scale.set((nh * scale) / mh);
        container.x = nw * offsetX;
        container.y = nh * offsetY;
      };
      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
      };
    } catch (err: any) {
      console.error("[Live2D] Init failed:", err.message || err);
      setError(err.message || String(err));
    }
  }, [modelPath, mode]);

  useEffect(() => {
    const promise = initLive2D();
    return () => {
      promise?.then?.((fn: any) => fn?.());
      runnerRef.current?.destroy();
      runnerRef.current = null;
      if (appRef.current) {
        try { appRef.current.destroy(true, { children: true }); } catch { /* ok */ }
        appRef.current = null;
      }
      modelRef.current = null;
    };
  }, [initLive2D]);

  return (
    <div ref={domRef} className={`live2d-character ${className}`}>
      <canvas ref={canvasRef} className="live2d-canvas" />
      {error && <div className="live2d-error"><p>{t("modelLoadFailed")}</p><small>{error}</small></div>}
    </div>
  );
}
