import { createContext, useContext, useState, useEffect } from "react";
import type { Live2DBehavior } from "../live2d/types";
import en from "./en";
import zh from "./zh";

export type Language = "zh" | "en";

const STRINGS: Record<Language, Record<string, string>> = { en, zh };

const LanguageContext = createContext<{
  lang: Language;
  setLang: (l: Language) => void;
}>({ lang: "en", setLang: () => {} });

function getLS(key: string, fallback: string) {
  return localStorage.getItem(key) || fallback;
}

const BehaviorContext = createContext<{
  behavior: Live2DBehavior;
  setBehavior: (m: Live2DBehavior) => void;
}>({ behavior: "look_forward", setBehavior: () => {} });

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [behavior, setBehavior] = useState<Live2DBehavior>(
    () => getLS("live2d_behavior", "look_forward") as Live2DBehavior
  );
  const [lang, setLang] = useState<Language>(
    () => getLS("ui_language", "en") as Language
  );

  useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : lang;
    document.title = STRINGS[lang]?.["title"] || "IELTS Speaking Practice";
  }, [lang]);

  const handleBehavior = (m: Live2DBehavior) => {
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
  const t = (key: string) => STRINGS[lang][key] || key;
  return { lang, setLanguage: setLang, t };
}
