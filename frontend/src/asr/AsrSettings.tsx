import { useWhisperConfig } from "./whisperConfig";
import { useLanguage } from "../i18n";

function AsrModeSettings({ mode, label }: { mode: "exam" | "free_chat"; label: string }) {
  const { t } = useLanguage();
  const { config: whisperCfg, models, downloading, toggleEnabled, switchModel } = useWhisperConfig(mode);

  return (
    <div className="settings-section">
      <h3>{label}</h3>
      <div className="form-group">
        <label>{t("whisperEnable")}</label>
        <select
          value={whisperCfg?.enabled ? "true" : "false"}
          onChange={(e) => toggleEnabled(e.target.value === "true")}
        >
          <option value="true">{t("whisperEnabled")}</option>
          <option value="false">{t("whisperDisabled")}</option>
        </select>
      </div>
      {whisperCfg?.enabled && (
        <div className="form-group">
          <label>{t("whisperModel")} ({whisperCfg.model_name})</label>
          <div className="model-list">
            {models.map((m) => (
              <div key={m.id} className={`model-item ${m.id === whisperCfg.model ? "active" : ""} ${m.downloaded ? "downloaded" : ""}`}>
                <div className="model-info">
                  <span className="model-name">{m.name}</span>
                  <span className="model-size">{m.size}</span>
                </div>
                <button
                  className={`btn-small ${m.id === whisperCfg.model ? "btn-active" : m.downloaded ? "btn-switch" : "btn-download"}`}
                  onClick={() => {
                    const msg = m.downloaded ? "" : t("whisperDownloadConfirm")
                      .replace("{modelId}", m.name)
                      .replace("{size}", m.size);
                    switchModel(m.id, msg);
                  }}
                  disabled={downloading === m.id}
                >
                  {downloading === m.id ? "..." : m.id === whisperCfg.model ? t("whisperActive") : m.downloaded ? t("whisperSwitch") : t("whisperDownload")}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function AsrSettings() {
  const { t } = useLanguage();
  return (
    <>
      <AsrModeSettings mode="exam" label={t("whisperSectionExam")} />
      <AsrModeSettings mode="free_chat" label={t("whisperSectionFreeChat")} />
    </>
  );
}
