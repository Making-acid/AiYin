import { useEffect, useRef, useCallback, useState } from "react";

type CharacterState = "idle" | "speaking" | "listening";
type BehaviorMode = "follow_mouse" | "look_forward";

let pixiReady = false;

async function ensurePixi() {
  if (pixiReady) return;
  const PIXI = await import("pixi.js");
  (window as any).PIXI = PIXI;
  pixiReady = true;
}

interface Live2DCharacterProps {
  modelPath: string;
  state?: CharacterState;
  behavior?: BehaviorMode;
  scale?: number;
  className?: string;
}

export function Live2DCharacter({
  modelPath,
  state = "idle",
  behavior = "follow_mouse",
  scale = 1.0,
  className = "",
}: Live2DCharacterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const domRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<any>(null);
  const modelRef = useRef<any>(null);
  const pixiContainerRef = useRef<any>(null);
  const stateRef = useRef<CharacterState>(state);
  const behaviorRef = useRef<BehaviorMode>(behavior);
  const [error, setError] = useState<string | null>(null);

  stateRef.current = state;
  behaviorRef.current = behavior;

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
      const pixiContainer = new PIXI.Container();
      app.stage.addChild(pixiContainer);
      pixiContainer.addChild(model);
      pixiContainerRef.current = pixiContainer;

      const modelHeight = model.internalModel?.height || model.height || 2000;
      const fitScale = (h * 1.15) / modelHeight;
      model.scale.set(fitScale);
      pixiContainer.x = w * 0.15;
      pixiContainer.y = h * 0.55;
      modelRef.current = model;

      startIdleMotion(model);

      app.ticker.add(() => {
        if (!model || model.destroyed) return;
        if (behaviorRef.current === "look_forward") {
          model.focus(0, 200, true);
        }
        if (stateRef.current === "speaking") updateMouthOpen(model);
      });

      let blinkTimer: any;
      const scheduleBlink = () => {
        blinkTimer = setTimeout(() => {
          if (model && !model.destroyed) doBlink(model);
          scheduleBlink();
        }, 2000 + Math.random() * 4000);
      };
      scheduleBlink();

      const handleResize = () => {
        if (!domEl) return;
        const nw = domEl.clientWidth || window.innerWidth * 0.55;
        const nh = domEl.clientHeight || window.innerHeight;
        app.renderer.resize(nw, nh);
        const mh = model.internalModel?.height || model.height || 2000;
        model.scale.set((nh * 1.15) / mh);
        pixiContainer.x = nw * 0.15;
        pixiContainer.y = nh * 0.55;
      };
      window.addEventListener("resize", handleResize);

      return () => {
        clearTimeout(blinkTimer);
        window.removeEventListener("resize", handleResize);
      };
    } catch (err: any) {
      console.error("[Live2D] Init failed:", err.message || err);
      setError(err.message || String(err));
    }
  }, [modelPath]);

  useEffect(() => {
    const promise = initLive2D();
    return () => {
      promise?.then?.((fn: any) => fn?.());
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
      {error && <div className="live2d-error"><p>Failed to load model</p><small>{error}</small></div>}
    </div>
  );
}

function startIdleMotion(model: any) {
  try {
    const mgr = model.internalModel?.motionManager;
    if (!mgr) return;
    const groups = mgr.groups || {};
    const keys = Object.keys(groups).filter(k => k.toLowerCase().includes("idle") || k.toLowerCase().includes("breath"));
    if (keys.length > 0) mgr.startRandomMotion(keys[0]);
    else if (Object.keys(groups).length > 0) mgr.startRandomMotion(Object.keys(groups)[0]);
  } catch { /* skip */ }
}

function doBlink(model: any) {
  try {
    if (!model || model.destroyed) return;
    const core = model.internalModel?.coreModel;
    if (!core) return;
    core.setParameterValueById("ParamEyeLOpen", 0);
    core.setParameterValueById("ParamEyeROpen", 0);
    setTimeout(() => {
      try { if (!model.destroyed) { core.setParameterValueById("ParamEyeLOpen", 1); core.setParameterValueById("ParamEyeROpen", 1); } } catch { /* skip */ }
    }, 120);
  } catch { /* skip */ }
}

function updateMouthOpen(model: any) {
  try {
    if (!model || model.destroyed) return;
    const core = model.internalModel?.coreModel;
    if (!core) return;
    const t = Date.now() / 150;
    const params = core.getParameterIds?.() || [];
    if (params.includes("ParamMouthOpenY")) {
      core.setParameterValueById("ParamMouthOpenY", 0.3 + 0.7 * Math.sin(t));
    } else if (params.includes("ParamA")) {
      core.setParameterValueById("ParamA", 0.3 + 0.7 * Math.sin(t));
    }
  } catch { /* skip */ }
}
