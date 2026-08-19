import { useState } from "react";
import { useLanguage } from "../i18n";
import { useWhisperConfig } from "../asr";
import { saveTtsConfig } from "../api/tts";
import { clearTtsConfigCache } from "../hooks/useCharacterSpeech";

export const TUTORIAL_VERSION = "4";

interface Props {
  onClose: () => void;
}

export function TutorialModal({ onClose }: Props) {
  const { t, markTutorialSeen } = useLanguage();
  const { config, loading, updateEnhancementMode } = useWhisperConfig("exam");
  const [azureKey, setAzureKey] = useState("");
  const [azureRegion, setAzureRegion] = useState("");
  const [voiceSaving, setVoiceSaving] = useState(false);
  const [voiceError, setVoiceError] = useState("");

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

  const finishTutorial = () => {
    markTutorialSeen(TUTORIAL_VERSION);
    onClose();
  };

  const chooseLocalVoice = async () => {
    setVoiceSaving(true);
    setVoiceError("");
    try {
      await saveTtsConfig({ provider: "kokoro" });
      clearTtsConfigCache();
      finishTutorial();
    } catch {
      setVoiceError(t("ttsSaveFailed"));
    } finally {
      setVoiceSaving(false);
    }
  };

  const chooseAzureVoice = async () => {
    setVoiceSaving(true);
    setVoiceError("");
    try {
      await saveTtsConfig({
        provider: "azure",
        azure_key: azureKey.trim(),
        azure_region: azureRegion.trim(),
      });
      clearTtsConfigCache();
      finishTutorial();
    } catch {
      setVoiceError(t("tutorialAzureInvalid"));
    } finally {
      setVoiceSaving(false);
    }
  };

  return (
    <div className="tutorial-overlay" onClick={() => void chooseLocalVoice()}>
      <div className="tutorial-modal" onClick={(e) => e.stopPropagation()}>
        <h2>{t("tutorialTitle")}</h2>

        <div className="tutorial-enhancement tutorial-voice-choice">
          <strong>{t("tutorialVoiceTitle")}</strong>
          <p>{t("tutorialVoiceDesc")}</p>
          <p className="enhancement-privacy">{t("tutorialVoicePrivacy")}</p>
          <p className="enhancement-privacy">{t("tutorialVoiceBilling")}</p>
          <div className="tutorial-azure-fields">
            <label htmlFor="tutorial-azure-key">{t("ttsAzureKey")}</label>
            <input
              id="tutorial-azure-key"
              type="password"
              value={azureKey}
              onChange={(event) => setAzureKey(event.target.value)}
              placeholder={t("ttsAzureKeyHint")}
            />
            <label htmlFor="tutorial-azure-region">{t("ttsAzureRegion")}</label>
            <input
              id="tutorial-azure-region"
              value={azureRegion}
              onChange={(event) => setAzureRegion(event.target.value)}
              placeholder="eastus"
            />
          </div>
          <a href="https://azure.microsoft.com/pricing/details/speech/" target="_blank" rel="noopener noreferrer">
            {t("ttsAzurePricingLink")}
          </a>
          <div className="tutorial-voice-actions">
            <button className="btn-primary" disabled={voiceSaving} onClick={() => void chooseAzureVoice()}>
              {t("tutorialUseAzure")}
            </button>
            <button className="btn-secondary" disabled={voiceSaving} onClick={() => void chooseLocalVoice()}>
              {t("tutorialUseKokoro")}
            </button>
          </div>
          {voiceError && <p className="settings-message error">{voiceError}</p>}
        </div>

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

        <div className="tutorial-tip">
          <strong>{t("tutorialTip")}</strong>
          <p>{t("tutorialTipDesc")}</p>
        </div>

        <button className="btn-secondary tutorial-dismiss" disabled={voiceSaving} onClick={() => void chooseLocalVoice()}>
          {t("tutorialDismiss")}
        </button>
      </div>
    </div>
  );
}
