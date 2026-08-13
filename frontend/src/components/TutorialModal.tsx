import { useLanguage } from "../i18n";
import { useWhisperConfig } from "../asr";

// Version the guide so existing users see important capability/privacy changes once.
const TUTORIAL_KEY = "tutorialSeenV3";

export function hasSeenTutorial(): boolean {
  return localStorage.getItem(TUTORIAL_KEY) === "1";
}

export function markTutorialSeen(): void {
  localStorage.setItem(TUTORIAL_KEY, "1");
}

interface Props {
  onClose: () => void;
}

export function TutorialModal({ onClose }: Props) {
  const { t } = useLanguage();
  const { config, loading, updateEnhancementMode } = useWhisperConfig("exam");

  const enhancementStatus = !config
    ? t("examEnhancementUnavailable")
    : config.whisperx.available
      ? t("examEnhancementReady")
      : config.whisperx.reason === "python_unsupported"
        ? t("examEnhancementPythonUnsupported")
            .replace("{current}", config.whisperx.python_version)
            .replace("{supported}", config.whisperx.supported_python)
        : config.whisperx.reason === "integration_pending"
          ? t("examEnhancementIntegrationPending")
          : t("examEnhancementNotInstalled");

  const handleClose = () => {
    markTutorialSeen();
    onClose();
  };

  return (
    <div className="tutorial-overlay" onClick={handleClose}>
      <div className="tutorial-modal" onClick={(e) => e.stopPropagation()}>
        <h2>{t("tutorialTitle")}</h2>

        <div className="tutorial-steps">
          <div className="tutorial-step">
            <span className="tutorial-num">1</span>
            <div>
              <strong>{t("tutorialStep1Title")}</strong>
              <p>{t("tutorialStep1Desc")}</p>
            </div>
          </div>

          <div className="tutorial-step">
            <span className="tutorial-num">2</span>
            <div>
              <strong>{t("tutorialStep2Title")}</strong>
              <p>{t("tutorialStep2Desc")}</p>
            </div>
          </div>

          <div className="tutorial-step">
            <span className="tutorial-num">3</span>
            <div>
              <strong>{t("tutorialStep3Title")}</strong>
              <p>{t("tutorialStep3Desc")}</p>
            </div>
          </div>

          <div className="tutorial-step">
            <span className="tutorial-num">4</span>
            <div>
              <strong>{t("tutorialStep4Title")}</strong>
              <p>{t("tutorialStep4Desc")}</p>
            </div>
          </div>
        </div>

        <div className="tutorial-enhancement">
          <strong>{t("examEnhancementTitle")}</strong>
          <p>{t("examEnhancementIntro")}</p>
          <label htmlFor="tutorial-exam-enhancement">{t("examEnhancementMode")}</label>
          <select
            id="tutorial-exam-enhancement"
            value={config?.exam_enhancement ?? "auto"}
            disabled={loading || !config}
            onChange={(event) => void updateEnhancementMode(event.target.value as "auto" | "on" | "off")}
          >
            <option value="auto">{t("examEnhancementAuto")}</option>
            <option value="on">{t("examEnhancementOn")}</option>
            <option value="off">{t("examEnhancementOff")}</option>
          </select>
          <p className={`enhancement-status ${config?.whisperx.available ? "ready" : "fallback"}`}>
            {enhancementStatus}
          </p>
          <p className="enhancement-privacy">{t("examEnhancementPrivacy")}</p>
        </div>

        <div className="tutorial-enhancement">
          <strong>{t("tutorialVoiceTitle")}</strong>
          <p>{t("tutorialVoiceDesc")}</p>
          <p className="enhancement-privacy">{t("tutorialVoicePrivacy")}</p>
          <p className="enhancement-privacy">{t("tutorialVoiceBilling")}</p>
          <a href="https://azure.microsoft.com/pricing/details/speech/" target="_blank" rel="noopener noreferrer">
            {t("ttsAzurePricingLink")}
          </a>
        </div>

        <div className="tutorial-tip">
          <strong>{t("tutorialTip")}</strong>
          <p>{t("tutorialTipDesc")}</p>
        </div>

        <button className="btn-primary tutorial-dismiss" onClick={handleClose}>
          {t("tutorialDismiss")}
        </button>
      </div>
    </div>
  );
}
