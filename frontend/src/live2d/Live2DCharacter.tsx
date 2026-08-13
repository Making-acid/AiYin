import { useEffect, useRef, useCallback, useState } from "react";
import { useLanguage } from "../i18n";
import { StateRunner } from "./stateRunner";
import { validateBehaviorConfig } from "./behavior";
import type {
  CharacterViewProps,
  Live2DCharacterDefinition,
} from "./types";

let pixiReady = false;

function lookAtCamera(model: any, instant = false) {
  // Live2DModel.focus(x, y) expects a point in canvas coordinates. The
  // FocusController, however, uses normalized gaze coordinates where 0, 0 is
  // straight ahead, so it is the correct API for eye contact with the user.
  model.internalModel?.focusController?.focus(0, 0, instant);
}

async function ensurePixi() {
  if (pixiReady) return;
  const PIXI = await import("pixi.js");
  (window as any).PIXI = PIXI;
  pixiReady = true;
}

export interface Live2DCharacterProps extends CharacterViewProps {
  character: Live2DCharacterDefinition;
}

export function Live2DCharacter({
  character,
  state: visualState = "idle",
  event,
  mouthValue = 0,
  behavior = "look_forward",
  className = "",
}: Live2DCharacterProps) {
  const { t } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const domRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<any>(null);
  const modelRef = useRef<any>(null);
  const runnerRef = useRef<StateRunner | null>(null);
  const initTokenRef = useRef(0);
  const resourceTokenRef = useRef(0);
  const behaviorRef = useRef(behavior);
  const mouthValueRef = useRef(mouthValue);
  const visualStateRef = useRef(visualState);
  const [error, setError] = useState<string | null>(null);

  behaviorRef.current = behavior;
  mouthValueRef.current = mouthValue;
  visualStateRef.current = visualState;

  useEffect(() => {
    if (behavior === "look_forward" && modelRef.current) {
      lookAtCamera(modelRef.current, true);
    }
  }, [behavior]);

  // External events
  useEffect(() => {
    if (event && runnerRef.current) {
      runnerRef.current.send(event);
    }
  }, [event]);

  // The page owns conversational state; the runner handles visual transitions.
  useEffect(() => {
    runnerRef.current?.setVisualState(visualState);
  }, [visualState]);

  const initLive2D = useCallback(async (token: number) => {
    const canvas = canvasRef.current;
    const domEl = domRef.current;
    if (!canvas || !domEl) return;

    if (import.meta.env.DEV) {
      const behaviorIssues = validateBehaviorConfig(character.behavior);
      if (behaviorIssues.length) console.warn(`[Live2D:${character.id}] Invalid behavior config`, behaviorIssues);
    }

    const w = domEl.clientWidth || window.innerWidth * 0.55;
    const h = domEl.clientHeight || window.innerHeight;
    canvas.width = w;
    canvas.height = h;
    if (token === initTokenRef.current) setError(null);

    let app: any = null;
    try {
      await ensurePixi();
      if (token !== initTokenRef.current) return;
      const { Live2DModel } = await import("pixi-live2d-display/cubism4");
      const PIXI = (window as any).PIXI;

      app = new PIXI.Application({
        view: canvas, width: w, height: h, backgroundAlpha: 0,
        antialias: true, resolution: window.devicePixelRatio || 1, autoDensity: true,
      });
      // Pointer tracking is handled locally below. Disabling the library's
      // global interaction hook keeps each character canvas self-contained.
      const model = await Live2DModel.from(character.modelPath, {
        autoInteract: false,
      });
      if (token !== initTokenRef.current) {
        try { model.destroy?.(); } catch { /* stale initialization */ }
        try { app.destroy(true, { children: true }); } catch { /* stale initialization */ }
        return;
      }
      app.stage.addChild(model);

      const layout = character.layout;
      const modelHeight = model.internalModel?.height || model.height || 2000;
      const applyLayout = (width: number, height: number) => {
        model.anchor?.set(layout.anchorX, layout.anchorY);
        model.scale.set((height * layout.heightRatio) / modelHeight);
        model.position.set(width * layout.x, height * layout.y);
      };
      applyLayout(w, h);
      appRef.current = app;
      modelRef.current = model;
      resourceTokenRef.current = token;
      lookAtCamera(model, true);

      const handlePointerMove = (pointerEvent: PointerEvent) => {
        if (behaviorRef.current !== "follow_mouse") return;
        const bounds = canvas.getBoundingClientRect();
        if (!bounds.width || !bounds.height) return;
        const x = ((pointerEvent.clientX - bounds.left) / bounds.width) * app.renderer.screen.width;
        const y = ((pointerEvent.clientY - bounds.top) / bounds.height) * app.renderer.screen.height;
        model.focus(x, y, false);
      };
      canvas.addEventListener("pointermove", handlePointerMove);

      const runner = new StateRunner(modelRef, character.behavior);
      runner.setVisualState(visualStateRef.current);
      runnerRef.current = runner;

      // Main loop
      app.ticker.add(() => {
        if (!model || model.destroyed) return;

        runner.tick(
          app.ticker.deltaMS / 1000,
          mouthValueRef.current,
          behaviorRef.current === "look_forward",
        );
      }, undefined, PIXI.UPDATE_PRIORITY.LOW);

      // Resize
      const handleResize = () => {
        if (!domEl) return;
        const nw = domEl.clientWidth || window.innerWidth * 0.55;
        const nh = domEl.clientHeight || window.innerHeight;
        app.renderer.resize(nw, nh);
        applyLayout(nw, nh);
      };
      const resizeObserver = typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(handleResize)
        : null;
      if (resizeObserver) resizeObserver.observe(domEl);
      else window.addEventListener("resize", handleResize);

      return () => {
        resizeObserver?.disconnect();
        if (!resizeObserver) window.removeEventListener("resize", handleResize);
        canvas.removeEventListener("pointermove", handlePointerMove);
      };
    } catch (err: any) {
      console.error("[Live2D] Init failed:", err.message || err);
      if (resourceTokenRef.current === token) {
        runnerRef.current?.destroy();
        runnerRef.current = null;
        appRef.current = null;
        modelRef.current = null;
        resourceTokenRef.current = 0;
      }
      if (app) {
        try { app.destroy(true, { children: true }); } catch { /* failed initialization */ }
      }
      if (token === initTokenRef.current) setError(err.message || String(err));
    }
  }, [character]);

  useEffect(() => {
    const token = ++initTokenRef.current;
    let disposed = false;
    let initCleanup: (() => void) | undefined;

    const dispose = () => {
      initCleanup?.();
      initCleanup = undefined;
      if (resourceTokenRef.current !== token) return;
      runnerRef.current?.destroy();
      runnerRef.current = null;
      if (appRef.current) {
        try { appRef.current.destroy(true, { children: true }); } catch { /* ok */ }
        appRef.current = null;
      }
      modelRef.current = null;
      resourceTokenRef.current = 0;
    };

    void initLive2D(token).then((cleanup) => {
      initCleanup = cleanup;
      if (disposed) dispose();
    });

    return () => {
      disposed = true;
      if (initTokenRef.current === token) initTokenRef.current += 1;
      dispose();
    };
  }, [initLive2D]);

  return (
    <div
      ref={domRef}
      className={`live2d-character live2d-character--${character.id} ${className}`}
      data-live2d-character={character.id}
      data-live2d-state={visualState}
    >
      <canvas ref={canvasRef} className="live2d-canvas" />
      {error && <div className="live2d-error"><p>{t("modelLoadFailed")}</p><small>{error}</small></div>}
    </div>
  );
}
