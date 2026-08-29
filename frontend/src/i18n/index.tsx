import { createContext, useContext, useState, useEffect, useRef } from "react";
import { fetchPreferences, savePreferences } from "../api/config";
import type { Live2DBehavior } from "../live2d/types";
import en from "./en";
import zh from "./zh";

export type Language = "zh" | "en";

const STRINGS: Record<Language, Record<string, string>> = { en, zh };

const LanguageContext = createContext<{
  lang: Language;
  setLang: (l: Language) => void;
  preferencesReady: boolean;
  tutorialSeenVersion: string;
  markTutorialSeen: (version: string) => void;
}>({ lang: "zh", setLang: () => {}, preferencesReady: false, tutorialSeenVersion: "", markTutorialSeen: () => {} });

const BehaviorContext = createContext<{
  behavior: Live2DBehavior;
  setBehavior: (m: Live2DBehavior) => void;
}>({ behavior: "look_forward", setBehavior: () => {} });

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [behavior, setBehavior] = useState<Live2DBehavior>("look_forward");
  const [lang, setLang] = useState<Language>("zh");
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [tutorialSeenVersion, setTutorialSeenVersion] = useState("");
  const [preferencesSaveFailed, setPreferencesSaveFailed] = useState(false);
  const behaviorSaveVersion = useRef(0);
  const languageSaveVersion = useRef(0);
  const tutorialSaveVersion = useRef(0);

  useEffect(() => {
    let active = true;
    void fetchPreferences()
      .then((preferences) => {
        if (!active) return;
        setLang(preferences.ui_language);
        setBehavior(preferences.live2d_behavior);
        setTutorialSeenVersion(preferences.tutorial_seen_version);
      })
      .catch(() => { if (active) setPreferencesSaveFailed(true); })
      .finally(() => { if (active) setPreferencesReady(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : lang;
    document.title = STRINGS[lang]?.["title"] || "爱音";
  }, [lang]);

  const handleBehavior = (m: Live2DBehavior) => {
    const previous = behavior;
    const version = ++behaviorSaveVersion.current;
    setBehavior(m);
    void savePreferences({ live2d_behavior: m })
      .then(() => { if (version === behaviorSaveVersion.current) setPreferencesSaveFailed(false); })
      .catch(() => {
        if (version !== behaviorSaveVersion.current) return;
        setBehavior(previous);
        setPreferencesSaveFailed(true);
      });
  };

  const handleLang = (l: Language) => {
    const previous = lang;
    const version = ++languageSaveVersion.current;
    setLang(l);
    void savePreferences({ ui_language: l })
      .then(() => { if (version === languageSaveVersion.current) setPreferencesSaveFailed(false); })
      .catch(() => {
        if (version !== languageSaveVersion.current) return;
        setLang(previous);
        setPreferencesSaveFailed(true);
      });
  };

  const markTutorialSeen = (version: string) => {
    const requestVersion = ++tutorialSaveVersion.current;
    setTutorialSeenVersion(version);
    void savePreferences({ tutorial_seen_version: version })
      .then(() => { if (requestVersion === tutorialSaveVersion.current) setPreferencesSaveFailed(false); })
      .catch(() => {
        if (requestVersion === tutorialSaveVersion.current) setPreferencesSaveFailed(true);
      });
  };

  return (
    <BehaviorContext.Provider value={{ behavior, setBehavior: handleBehavior }}>
      <LanguageContext.Provider value={{ lang, setLang: handleLang, preferencesReady, tutorialSeenVersion, markTutorialSeen }}>
        {children}
        {preferencesSaveFailed && (
          <div className="preference-save-alert" role="alert">
            <span>{STRINGS[lang]["preferencesSaveFailed"]}</span>
            <button type="button" onClick={() => setPreferencesSaveFailed(false)} aria-label={STRINGS[lang]["dismiss"]}>×</button>
          </div>
        )}
      </LanguageContext.Provider>
    </BehaviorContext.Provider>
  );
}

export function useLive2DBehavior() {
  const ctx = useContext(BehaviorContext);
  return [ctx.behavior, ctx.setBehavior] as const;
}

export function useLanguage() {
  const { lang, setLang, preferencesReady, tutorialSeenVersion, markTutorialSeen } = useContext(LanguageContext);
  const t = (key: string) => STRINGS[lang][key] || key;
  return { lang, setLanguage: setLang, preferencesReady, tutorialSeenVersion, markTutorialSeen, t };
}
