import { useWhisperConfig } from "./whisperConfig";
import { useLanguage } from "../i18n";

function AsrModeSettings({ mode, label }: { mode: "exam" | "free_chat"; label: string }) {
  const { t } = useLanguage();
  const { config: whisperCfg, models, downloading, operationError, toggleEnabled, switchModel, updateEnhancementMode } = useWhisperConfig(mode);

  const enhancementStatus = !whisperCfg
    ? t("examEnhancementUnavailable")
    : whisperCfg.whisperx.available
      ? t("examEnhancementReady")
      : whisperCfg.whisperx.reason === "python_unsupported"
        ? t("examEnhancementPythonUnsupported")
            .replace("{current}", whisperCfg.whisperx.python_version)
            .replace("{supported}", whisperCfg.whisperx.supported_python)
        : whisperCfg.whisperx.reason === "integration_pending"
          ? t("examEnhancementIntegrationPending")
          : whisperCfg.whisperx.reason === "model_missing"
            ? t("examEnhancementModelMissing")
          : t("examEnhancementNotInstalled");

  return (
    <div className="settings-section">
      <h3>{label}</h3>
      <p className="settings-desc">
        {t(mode === "exam" ? "whisperUsageExam" : "whisperUsageFreeChat")}
      </p>
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
              <div key={m.id} className={`model-item ${m.id === whisperCfg.model && m.downloaded ? "active" : ""} ${m.downloaded ? "downloaded" : ""}`}>
                <div className="model-info">
                  <span className="model-name">{m.name}</span>
                  <span className="model-size">
                    {m.size}
                    {m.bundled && ` · ${t("whisperBundled")}`}
                    {m.profile === "performance" && ` · ${t("whisperPerformanceProfile")}`}
                    {m.profile === "quality" && ` · ${t("whisperQualityProfile")}`}
                  </span>
                  {m.download_requires_external_access && (
                    <span className="model-network-warning">{t("whisperExternalDownloadWarning")}</span>
                  )}
                </div>
                <button
                  className={`btn-small ${m.id === whisperCfg.model && m.downloaded ? "btn-active" : m.downloaded ? "btn-switch" : "btn-download"}`}
                  onClick={() => {
                    const msg = m.downloaded ? "" : t("whisperDownloadConfirm")
                      .replace("{modelId}", m.name)
                      .replace("{size}", m.size);
                    void switchModel(m.id, msg);
                  }}
                  disabled={Boolean(downloading)}
                >
                  {downloading === m.id
                    ? t("whisperDownloading")
                    : m.id === whisperCfg.model && m.downloaded
                      ? t("whisperActive")
                      : m.downloaded
                        ? t("whisperSwitch")
                        : t("whisperDownload")}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      {downloading && <p className="enhancement-status fallback">{t("whisperDownloadWait")}</p>}
      {operationError && (
        <p className="settings-message error">
          {t("whisperOperationFailed").replace("{error}", operationError)}
        </p>
      )}
      {mode === "exam" && (
        <div className="exam-enhancement-settings">
          <h4>{t("examEnhancementTitle")}</h4>
          <p className="settings-desc">{t("examEnhancementDesc")}</p>
          <div className="form-group">
            <label>{t("examEnhancementMode")}</label>
            <select
              value={whisperCfg?.exam_enhancement ?? "auto"}
              disabled={!whisperCfg}
              onChange={(event) => void updateEnhancementMode(event.target.value as "auto" | "on" | "off")}
            >
              <option value="auto">{t("examEnhancementAuto")}</option>
              <option value="on">{t("examEnhancementOn")}</option>
              <option value="off">{t("examEnhancementOff")}</option>
            </select>
          </div>
          <p className={`enhancement-status ${whisperCfg?.whisperx.available ? "ready" : "fallback"}`}>
            {enhancementStatus}
          </p>
          <p className="settings-desc">{t("examEnhancementPrivacy")}</p>
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
