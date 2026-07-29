import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchConfig } from "../api/config";
import { useLanguage } from "../i18n";
import { useTrainingLanguage } from "../i18n/trainingLang";

export function Home() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { trainingLang, setTrainingLang, supported } = useTrainingLanguage();
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    checkConfig();
  }, []);

  const checkConfig = async () => {
    try {
      const config = await fetchConfig();
      setIsConfigured(config.is_configured);
    } catch {
      setIsConfigured(false);
    }
  };

  return (
    <div className="page home-page">
      <div className="home-hero">
        <h1>{t("title")}</h1>
        <p className="home-subtitle">{t("subtitle")}</p>
        <p className="home-desc">{t("desc")}</p>
      </div>

      {isConfigured === false && (
        <div className="setup-banner">
          <p>{t("notConfigured")}</p>
          <button className="btn-primary" onClick={() => navigate("/settings")}>
            {t("configure")}
          </button>
        </div>
      )}

      <div className="training-lang-selector">
        <label>{t("trainingLanguage")}</label>
        <select
          value={trainingLang}
          onChange={(e) => setTrainingLang(e.target.value as typeof trainingLang)}
        >
          {supported.map((s) => (
            <option key={s.code} value={s.code}>
              {s.nativeLabel}
            </option>
          ))}
        </select>
      </div>

      <div className="mode-cards">
        <div className="mode-card" onClick={() => navigate("/exam")}>
          <div className="mode-icon">📝</div>
          <h2>{t("examMode")}</h2>
          <p>{t("examModeDesc")}</p>
          <span className="mode-action">{t("startExam")}</span>
        </div>

        <div className="mode-card" onClick={() => navigate("/free-chat")}>
          <div className="mode-icon">💬</div>
          <h2>{t("freeChat")}</h2>
          <p>{t("freeChatDesc")}</p>
          <span className="mode-action">{t("startChat")}</span>
        </div>
      </div>

      <button className="settings-link" onClick={() => navigate("/settings")}>
        ⚙ {t("settings")}
      </button>
    </div>
  );
}
