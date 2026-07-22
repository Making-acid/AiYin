import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchConfig, fetchProviders, saveConfig, type AppConfig, type ProviderPreset } from "../api/client";

export function Settings() {
  const navigate = useNavigate();
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
      setProvider(cfg.provider || "deepseek");
      setBaseUrl(cfg.base_url);
      setModel(cfg.model);
    } catch {
      setMessage("Failed to load configuration.");
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
      setMessage("Please enter a valid API key.");
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
      setMessage("Configuration saved successfully.");
    } catch {
      setMessage("Failed to save configuration.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="page settings-page"><p className="loading">Loading...</p></div>;
  }

  return (
    <div className="page settings-page">
      <button className="back-btn" onClick={() => navigate("/")}>← Back</button>

      <div className="settings-container">
        <h1>Settings</h1>

        <div className="settings-section">
          <h3>LLM API Configuration</h3>
          <p className="settings-desc">
            Select your model provider and enter the API key.
            Your key is stored locally on the server and never shared.
          </p>

          <div className="form-group">
            <label>Provider</label>
            <select
              value={provider}
              onChange={(e) => handleProviderChange(e.target.value)}
            >
              {Object.entries(providers).map(([id, preset]) => (
                <option key={id} value={id}>{preset.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={config?.is_configured ? "•••••••• (leave blank to keep current)" : "sk-xxxxxxxxxxxxxxxx"}
            />
          </div>

          <div className="form-group">
            <label>Base URL</label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.deepseek.com"
            />
          </div>

          <div className="form-group">
            <label>Model</label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="deepseek-chat"
            />
          </div>

          <div className="form-actions">
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Configuration"}
            </button>
          </div>

          {message && (
            <p className={`settings-message ${message.includes("success") ? "success" : "error"}`}>
              {message}
            </p>
          )}

          {config?.is_configured && (
            <p className="settings-status">
              Status: {providers[config.provider]?.label || config.provider} ({config.api_key})
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
