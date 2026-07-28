import { createContext, useContext, useState } from "react";
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

type BehaviorMode = "follow_mouse" | "look_forward";

const BehaviorContext = createContext<{
  behavior: BehaviorMode;
  setBehavior: (m: BehaviorMode) => void;
}>({ behavior: "follow_mouse", setBehavior: () => {} });

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
  const t = (key: string) => STRINGS[lang][key] || key;
  return { lang, setLanguage: setLang, t };
}
