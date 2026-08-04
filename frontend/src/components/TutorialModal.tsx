import { useLanguage } from "../i18n";

const TUTORIAL_KEY = "tutorialSeen";

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
