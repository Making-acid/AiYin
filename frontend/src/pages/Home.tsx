import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchConfig } from "../api/config";
import { useLanguage } from "../i18n";

export function Home() {
  const navigate = useNavigate();
  const { t } = useLanguage();
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
        <h1>IELTS Speaking Practice</h1>
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

      <div className="mode-cards">
        <div className="mode-card" onClick={() => navigate("/exam")}>
          <div className="mode-icon">📝</div>
          <h2>{t("examMode")}</h2>
          <p>
            Simulate a full IELTS Speaking test with Part 1, 2, and 3.
            Get an estimated band score and detailed feedback.
          </p>
          <span className="mode-action">{t("startExam")}</span>
        </div>

        <div className="mode-card" onClick={() => navigate("/free-chat")}>
          <div className="mode-icon">💬</div>
          <h2>{t("freeChat")}</h2>
          <p>
            Practice casual English conversation with an AI partner.
            No pressure, no scoring—just practice.
          </p>
          <span className="mode-action">{t("startChat")}</span>
        </div>
      </div>

      <button className="settings-link" onClick={() => navigate("/settings")}>
        ⚙ {t("settings")}
      </button>
    </div>
  );
}
