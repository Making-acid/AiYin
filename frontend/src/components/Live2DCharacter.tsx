import { useEffect, useRef, useCallback, useState, createContext, useContext } from "react";

type CharacterState = "idle" | "speaking" | "listening";
type BehaviorMode = "follow_mouse" | "look_forward";
type Language = "zh" | "en";

let pixiReady = false;

async function ensurePixi() {
  if (pixiReady) return;
  const PIXI = await import("pixi.js");
  (window as any).PIXI = PIXI;
  pixiReady = true;
}

const BehaviorContext = createContext<{
  behavior: BehaviorMode;
  setBehavior: (m: BehaviorMode) => void;
}>({ behavior: "follow_mouse", setBehavior: () => {} });

const LanguageContext = createContext<{
  lang: Language;
  setLang: (l: Language) => void;
}>({ lang: "en", setLang: () => {} });

function getLS(key: string, fallback: string) {
  return localStorage.getItem(key) || fallback;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [behavior, setBehavior] = useState<BehaviorMode>(
    () => getLS("live2d_behavior", "follow_mouse") as BehaviorMode
  );
  const [lang, setLang] = useState<Language>(
    () => getLS("ui_language", "en") as Language
  );

  const handleBehavior = (m: BehaviorMode) => {
    setBehavior(m);
    localStorage.setItem("live2d_behavior", m);
  };

  const handleLang = (l: Language) => {
    setLang(l);
    localStorage.setItem("ui_language", l);
  };

  return (
    <BehaviorContext.Provider value={{ behavior, setBehavior: handleBehavior }}>
      <LanguageContext.Provider value={{ lang, setLang: handleLang }}>
        {children}
      </LanguageContext.Provider>
    </BehaviorContext.Provider>
  );
}

export function useLive2DBehavior() {
  const ctx = useContext(BehaviorContext);
  return [ctx.behavior, ctx.setBehavior] as const;
}

export function useLanguage() {
  const { lang, setLang } = useContext(LanguageContext);

  const STRINGS: Record<Language, Record<string, string>> = {
    zh: {
      examMode: "雅思考试", freeChat: "自由聊天", settings: "设置",
      back: "← 返回", home: "首页", startExam: "开始考试 →",
      startChat: "开始聊天 →", apiConfig: "LLM API 配置",
      apiDesc: "选择模型供应商并输入 API Key。Key 保存在服务器本地。",
      provider: "供应商", apiKey: "API Key", baseUrl: "Base URL",
      model: "Model", save: "保存配置", saved: "配置已保存。",
      live2dSection: "Live2D 角色", live2dDesc: "控制虚拟角色的行为。",
      eyeBehavior: "视线行为", followMouse: "跟随鼠标", lookForward: "目视前方",
      languageSection: "界面语言", languageDesc: "切换界面显示语言。",
      statusConfigured: "状态：已配置", viewReport: "查看评分报告 →",
      configure: "配置 API Key", notConfigured: "API Key 未配置，请先设置。",
      subtitle: "AI 雅思口语陪练助手", desc: "通过 AI 考官练习英语口语。选择一个模式开始。",
      intro: "介绍", part1: "第1部分：访谈", part2Prep: "第2部分：准备",
      part2Speak: "第2部分：陈述", part3: "第3部分：讨论", finished: "测试结束",
      practiceMode: "练习模式", thinking: "思考中...",
      speak: "🎤 说话", stop: "⏹ 停止", listening: "聆听中...",
      hintApiKey: "sk-xxxxxxxxxxxx", leaveBlank: "（留空保持当前）",
      saveFailed: "保存失败。", loadFailed: "加载配置失败。",
    },
    en: {
      examMode: "IELTS Exam", freeChat: "Free Chat", settings: "Settings",
      back: "← Back", home: "Home", startExam: "Start Exam →",
      startChat: "Start Chat →", apiConfig: "LLM API Configuration",
      apiDesc: "Select provider and enter API key. Key is stored server-side.",
      provider: "Provider", apiKey: "API Key", baseUrl: "Base URL",
      model: "Model", save: "Save Configuration", saved: "Configuration saved.",
      live2dSection: "Live2D Character", live2dDesc: "Control virtual character behavior.",
      eyeBehavior: "Eye Behavior", followMouse: "Follow Mouse", lookForward: "Look Forward",
      languageSection: "Language", languageDesc: "Switch UI language.",
      statusConfigured: "Status: configured", viewReport: "View Score Report →",
      configure: "Configure API Key", notConfigured: "API key not configured.",
      subtitle: "AI-Powered IELTS Speaking Assistant",
      desc: "Practice English speaking with an AI examiner. Choose a mode below.",
      intro: "Introduction", part1: "Part 1: Interview", part2Prep: "Part 2: Preparation",
      part2Speak: "Part 2: Long Turn", part3: "Part 3: Discussion", finished: "Test Complete",
      practiceMode: "Practice Mode", thinking: "Thinking...",
      speak: "🎤 Speak", stop: "⏹ Stop", listening: "Listening...",
      hintApiKey: "sk-xxxxxxxxxxxx", leaveBlank: "(leave blank to keep current)",
      saveFailed: "Failed to save configuration.", loadFailed: "Failed to load configuration.",
    },
  };

  const t = (key: string) => STRINGS[lang][key] || key;
  return { lang, setLanguage: setLang, t };
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
      const fitScale = (h * 0.75) / modelHeight;
      model.scale.set(fitScale);
      pixiContainer.x = w * 0.15;
      pixiContainer.y = h * 0.45;
      modelRef.current = model;

      startIdleMotion(model);

      app.ticker.add(() => {
        if (!model || model.destroyed) return;
        if (behaviorRef.current === "look_forward") {
          model.focus(0, 0, true);
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
        model.scale.set((nh * 0.75) / mh);
        pixiContainer.x = nw * 0.15;
        pixiContainer.y = nh * 0.45;
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
    // Haru uses ParamMouthOpenY, Mao uses ParamA
    if (params.includes("ParamMouthOpenY")) {
      core.setParameterValueById("ParamMouthOpenY", 0.3 + 0.7 * Math.sin(t));
    } else if (params.includes("ParamA")) {
      core.setParameterValueById("ParamA", 0.3 + 0.7 * Math.sin(t));
    }
  } catch { /* skip */ }
}
