import { useNavigate } from "react-router-dom";
import { useWhisperConfig } from "./whisperConfig";
import { useLanguage } from "../i18n";

export function AsrIndicator() {
  const navigate = useNavigate();
  const { config } = useWhisperConfig();
  const { t } = useLanguage();

  if (!config?.enabled) return null;

  return (
    <div className="whisper-indicator">
      <span className="whisper-dot"></span>
      {t("whisperUsing")} {config.model_name}
      <button className="whisper-change-btn" onClick={() => navigate("/settings")}>
        {t("whisperChange")}
      </button>
    </div>
  );
}
