import { useNavigate } from "react-router-dom";
import { useWhisperConfig } from "./whisperConfig";
import { useLanguage } from "../i18n";

type AsrMode = "exam" | "free_chat";

export function AsrIndicator({ mode }: { mode: AsrMode }) {
  const navigate = useNavigate();
  const { config } = useWhisperConfig(mode);
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
