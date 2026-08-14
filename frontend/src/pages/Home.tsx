import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchConfig } from "../api/config";
import { useLanguage } from "../i18n";
import { TutorialModal, TUTORIAL_VERSION } from "../components/TutorialModal";
import { homeFaq } from "../content/homeFaq";

export function Home() {
  const navigate = useNavigate();
  const { lang, preferencesReady, tutorialSeenVersion, t } = useLanguage();
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    checkConfig();
  }, []);

  useEffect(() => {
    if (preferencesReady && tutorialSeenVersion !== TUTORIAL_VERSION) {
      setShowTutorial(true);
    }
  }, [preferencesReady, tutorialSeenVersion]);

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

      <section className="quick-start" aria-labelledby="quick-start-title">
        <div className="quick-start-heading">
          <span aria-hidden="true">👋</span>
          <h2 id="quick-start-title">{t("quickStartTitle")}</h2>
        </div>
        <ol>
          <li>{t("quickStartStep1")}</li>
          <li>{t("quickStartStep2")}</li>
          <li>{t("quickStartStep3")}</li>
        </ol>
      </section>

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

      <section className="home-faq" aria-labelledby="home-faq-title">
        <div className="home-faq-heading">
          <div>
            <span className="home-faq-kicker">Q&amp;A</span>
            <h2 id="home-faq-title">{t("homeFaqTitle")}</h2>
            <p>{t("homeFaqIntro")}</p>
          </div>
          <a className="btn-secondary home-guide-link" href="/help/user-guide.html" target="_blank" rel="noopener noreferrer">
            {t("userGuide")}
          </a>
        </div>
        <div className="home-faq-list">
          {homeFaq[lang].map((item, index) => (
            <details key={item.question} open={index === 0}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <button className="settings-link" onClick={() => navigate("/settings")}>
        ⚙ {t("settings")}
      </button>
      <button className="settings-link" onClick={() => navigate("/memory")}>
        ◷ {t("examMemory")}
      </button>
      <button className="legal-link" onClick={() => navigate("/legal")}>
        {t("legalLink")}
      </button>

      {showTutorial && <TutorialModal onClose={() => setShowTutorial(false)} />}
    </div>
  );
}
