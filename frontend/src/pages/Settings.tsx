import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchConfig, fetchProviders, saveConfig, type AppConfig, type ProviderPreset } from "../api/config";
import { useLive2DBehavior, useLanguage } from "../i18n";
import { AsrSettings } from "../asr";

export function Settings() {
  const navigate = useNavigate();
  const { t, lang, setLanguage } = useLanguage();
  const [behavior, updateBehavior] = useLive2DBehavior();

  const [config, setConfig] = useState<AppConfig | null>(null);
  const [providers, setProviders] = useState<Record<string, ProviderPreset>>({});
  const [provider, setProvider] = useState("deepseek-v4-pro");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [cfg, pr] = await Promise.all([fetchConfig(), fetchProviders()]);
      setConfig(cfg);
      setProviders(pr);
      setProvider(cfg.provider || "deepseek-v4-pro");
      setBaseUrl(cfg.base_url);
      setModel(cfg.model);
    } catch {
      setMessage(t("loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleProviderChange = (value: string) => {
    setProvider(value);
    const preset = providers[value];
    if (preset) {
      setBaseUrl(preset.base_url);
      setModel(preset.default_model);
    }
  };

  const handleSave = async () => {
    if (!apiKey.trim() || apiKey.trim().length < 4) {
      setMessage(t("apiKey") + " required");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const result = await saveConfig({
        provider,
        api_key: apiKey.trim(),
        base_url: baseUrl.trim() || undefined,
        model: model.trim() || undefined,
      });
      setConfig(result);
      setApiKey("");
      setMessage(t("saved"));
    } catch {
      setMessage(t("saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="page settings-page"><p className="loading">Loading...</p></div>;
  }

  return (
    <div className="page settings-page">
      <button className="back-btn" onClick={() => navigate("/")}>{t("back")}</button>

      <div className="settings-container">
        <h1>{t("settings")}</h1>

        <div className="settings-section">
          <h3>{t("apiConfig")}</h3>
          <p className="settings-desc">{t("apiDesc")}</p>

          <div className="form-group">
            <label>{t("provider")}</label>
            <select value={provider} onChange={(e) => handleProviderChange(e.target.value)}>
              {Object.entries(providers).map(([id, preset]) => (
                <option key={id} value={id}>{preset.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>{t("apiKey")}</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={config?.is_configured ? t("leaveBlank") : t("hintApiKey")}
            />
          </div>

          <div className="form-group">
            <label>{t("baseUrl")}</label>
            <input type="text" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
          </div>

          <div className="form-group">
            <label>{t("model")}</label>
            <input type="text" value={model} onChange={(e) => setModel(e.target.value)} />
          </div>

          <div className="form-actions">
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? "..." : t("save")}
            </button>
          </div>

          {message && (
            <p className={`settings-message ${message.includes("save") || message.includes("成功") ? "success" : message.includes("failed") || message.includes("失败") ? "error" : ""}`}>
              {message}
            </p>
          )}

          {config?.is_configured && (
            <p className="settings-status">
              {t("statusConfigured")} ({config.api_key})
            </p>
          )}
        </div>

        <div className="settings-section">
          <h3>{t("live2dSection")}</h3>
          <p className="settings-desc">{t("live2dDesc")}</p>
          <div className="form-group">
            <label>{t("eyeBehavior")}</label>
            <select value={behavior} onChange={(e) => updateBehavior(e.target.value as "follow_mouse" | "look_forward")}>
              <option value="follow_mouse">{t("followMouse")}</option>
              <option value="look_forward">{t("lookForward")}</option>
            </select>
          </div>
        </div>

        <div className="settings-section">
          <h3>{t("languageSection")}</h3>
          <p className="settings-desc">{t("languageDesc")}</p>
          <div className="form-group">
            <label>{t("languageSection")}</label>
            <select value={lang} onChange={(e) => setLanguage(e.target.value as "zh" | "en")}>
              <option value="zh">中文</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>

        <AsrSettings />
      </div>
    </div>
  );
}
