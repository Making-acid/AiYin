import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchConfig, fetchProviders, saveConfig, clearLocalMemory, type AppConfig, type ProviderPreset } from "../api/config";
import { useLive2DBehavior, useLanguage } from "../i18n";
import { useTrainingLanguage } from "../i18n/trainingLang";
import { AsrSettings } from "../asr";
import { fetchLocalTtsStatus, fetchTtsConfig, saveTtsConfig, type LocalTtsStatus, type TtsConfig, type TtsProvider } from "../api/tts";
import { clearTtsConfigCache, useCharacterSpeech } from "../hooks/useCharacterSpeech";

export function Settings() {
  const navigate = useNavigate();
  const { t, lang, setLanguage, preferencesReady } = useLanguage();
  const [behavior, updateBehavior] = useLive2DBehavior();
  const { trainingLang } = useTrainingLanguage();

  const [config, setConfig] = useState<AppConfig | null>(null);
  const [providers, setProviders] = useState<Record<string, ProviderPreset>>({});
  const [provider, setProvider] = useState("deepseek-v4-pro");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [ttsConfig, setTtsConfig] = useState<TtsConfig | null>(null);
  const [ttsProvider, setTtsProvider] = useState<TtsProvider>("kokoro");
  const [localTtsStatus, setLocalTtsStatus] = useState<LocalTtsStatus | null>(null);
  const [azureKey, setAzureKey] = useState("");
  const [azureRegion, setAzureRegion] = useState("");
  const [haruVoice, setHaruVoice] = useState("en-GB-SoniaNeural");
  const [maoVoice, setMaoVoice] = useState("en-US-AnaNeural");
  const [ttsVolume, setTtsVolume] = useState(70);
  const [ttsSaving, setTtsSaving] = useState(false);
  const [ttsMessage, setTtsMessage] = useState("");
  const haruPreview = useCharacterSpeech("haru", trainingLang);
  const maoPreview = useCharacterSpeech("mao", trainingLang);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [configResult, providersResult, speechResult, localSpeechResult] = await Promise.allSettled([
      fetchConfig(),
      fetchProviders(),
      fetchTtsConfig(),
      fetchLocalTtsStatus(),
    ]);
    if (configResult.status === "fulfilled") {
      const cfg = configResult.value;
      setConfig(cfg);
      setProvider(cfg.provider || "deepseek-v4-pro");
      setBaseUrl(cfg.base_url);
      setModel(cfg.model);
    } else {
      setMessage(t("loadFailed"));
    }
    if (providersResult.status === "fulfilled") {
      setProviders(providersResult.value);
    } else {
      setMessage(t("loadFailed"));
    }
    if (speechResult.status === "fulfilled") {
      const speech = speechResult.value;
      setTtsConfig(speech);
      setTtsProvider(speech.provider);
      setAzureRegion(speech.azure_region);
      setHaruVoice(speech.haru_voice);
      setMaoVoice(speech.mao_voice);
      setTtsVolume(speech.volume);
    } else {
      setTtsMessage(t("ttsLoadFailed"));
    }
    if (localSpeechResult.status === "fulfilled") {
      setLocalTtsStatus(localSpeechResult.value);
    }
    setLoading(false);
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
    const trimmedApiKey = apiKey.trim();
    if ((!config?.is_configured && !trimmedApiKey) || (trimmedApiKey && trimmedApiKey.length < 4)) {
      setMessage(t("apiKeyRequired"));
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const result = await saveConfig({
        provider,
        api_key: trimmedApiKey || undefined,
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

  const handleSaveTts = async () => {
    setTtsSaving(true);
    setTtsMessage("");
    try {
      const result = await saveTtsConfig({
        provider: ttsProvider,
        ...(ttsProvider === "azure" ? {
          azure_key: azureKey.trim() || undefined,
          azure_region: azureRegion.trim(),
        } : {}),
        haru_voice: haruVoice.trim(),
        mao_voice: maoVoice.trim(),
        volume: ttsVolume,
      });
      clearTtsConfigCache();
      setTtsConfig(result);
      setAzureKey("");
      setTtsMessage(t("ttsSaved"));
      return true;
    } catch {
      setTtsMessage(t("ttsSaveFailed"));
      return false;
    } finally {
      setTtsSaving(false);
    }
  };

  const previewVoice = async (character: "haru" | "mao") => {
    setTtsMessage("");
    try {
      if (!await handleSaveTts()) return;
      const preview = character === "haru" ? haruPreview : maoPreview;
      await preview.speak(
        character === "haru"
          ? "Good morning. My name is Haru. Can you tell me your full name, please?"
          : "Hey! I'm Mao. Let's have a relaxed English conversation together!",
      );
    } catch {
      setTtsMessage(t("ttsPreviewFailed"));
    }
  };

  const handleClearMemory = async () => {
    if (!window.confirm(t("clearMemoryConfirm"))) return;
    try {
      await clearLocalMemory();
      setMessage(t("memoryCleared"));
    } catch {
      setMessage(t("memoryClearFailed"));
    }
  };

  if (loading) {
    return <div className="page settings-page"><p className="loading">{t("loading")}</p></div>;
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
              {saving ? t("loading") : t("save")}
            </button>
          </div>

          {message && (
            <p className={`settings-message ${message === t("saved") ? "success" : "error"}`}>
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
            <select disabled={!preferencesReady} value={behavior} onChange={(e) => updateBehavior(e.target.value as "follow_mouse" | "look_forward")}>
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
            <select disabled={!preferencesReady} value={lang} onChange={(e) => setLanguage(e.target.value as "zh" | "en")}>
              <option value="zh">{t("langZh")}</option>
              <option value="en">{t("langEn")}</option>
            </select>
          </div>
        </div>

        <div className="settings-section">
          <h3>{t("helpTitle")}</h3>
          <p className="settings-desc">{t("helpDesc")}</p>
          <div className="form-actions">
            <a
              href="/help/user-guide.html"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}
            >
              {t("helpOpenPdf")}
            </a>
            <button className="btn-secondary" onClick={() => navigate("/legal") }>
              {t("legalLink")}
            </button>
          </div>
        </div>

        <div className="settings-section">
          <h3>{t("ttsSection")}</h3>
          <p className="settings-desc">{t("ttsDesc")}</p>
          <button className="btn-secondary" onClick={() => navigate("/help/azure-speech")}>
            {t("ttsAzureHelp")}
          </button>
          <div className="form-group">
            <label>{t("ttsProvider")}</label>
            <select value={ttsProvider} onChange={(event) => setTtsProvider(event.target.value as TtsProvider)}>
              <option value="azure">{t("ttsAzure")}</option>
              <option value="kokoro">{t("ttsKokoro")}</option>
              <option value="windows">{t("ttsWindows")}</option>
              <option value="browser">{t("ttsBrowser")}</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="tts-volume">{t("ttsVolume")}：{ttsVolume}%</label>
            <input
              id="tts-volume"
              type="range"
              min="0"
              max="100"
              step="1"
              value={ttsVolume}
              onInput={(event) => setTtsVolume(Number(event.currentTarget.value))}
              aria-valuetext={`${ttsVolume}%`}
            />
            <p className="settings-desc">{t("ttsVolumeDesc")}</p>
          </div>
          {ttsProvider === "kokoro" && (
            <div className={`tts-provider-status ${localTtsStatus?.ready ? "ready" : "warning"}`}>
              <strong>{t("ttsKokoroBundled")}</strong>
              <p>{localTtsStatus?.ready ? t("ttsKokoroReady") : t("ttsKokoroUnavailable")}</p>
              {localTtsStatus?.ready && (
                <p>
                  Haru: {localTtsStatus.voices.haru} · Mao: {localTtsStatus.voices.mao} · {Math.max(1, Math.round(localTtsStatus.installed_bytes / 1024 / 1024))} MB
                </p>
              )}
            </div>
          )}
          {ttsProvider === "windows" && (
            <div className="tts-provider-status">
              <strong>{t("ttsWindows")}</strong>
              <p>{t("ttsWindowsDesc")}</p>
            </div>
          )}
          {ttsProvider === "browser" && (
            <div className="tts-provider-status">
              <strong>{t("ttsBrowser")}</strong>
              <p>{t("ttsBrowserDesc")}</p>
            </div>
          )}
          {ttsProvider === "azure" && (
            <>
              <div className="tutorial-tip">
                <strong>{t("ttsAzureBillingTitle")}</strong>
                <p>{t("ttsAzureBillingDesc")}</p>
                <a href="https://azure.microsoft.com/pricing/details/speech/" target="_blank" rel="noopener noreferrer">
                  {t("ttsAzurePricingLink")}
                </a>
              </div>
              <p className="settings-desc">{t("ttsAzurePrivacy")}</p>
              <div className="form-group">
                <label>{t("ttsAzureKey")}</label>
                <input
                  type="password"
                  value={azureKey}
                  onChange={(event) => setAzureKey(event.target.value)}
                  placeholder={ttsConfig?.azure_configured ? t("leaveBlank") : t("ttsAzureKeyHint")}
                />
              </div>
              <div className="form-group">
                <label>{t("ttsAzureRegion")}</label>
                <input value={azureRegion} onChange={(event) => setAzureRegion(event.target.value)} placeholder="eastus" />
              </div>
              <div className="form-group">
                <label>{t("ttsHaruVoice")}</label>
                <input value={haruVoice} onChange={(event) => setHaruVoice(event.target.value)} />
              </div>
              <div className="form-group">
                <label>{t("ttsMaoVoice")}</label>
                <input value={maoVoice} onChange={(event) => setMaoVoice(event.target.value)} />
              </div>
            </>
          )}
          <div className="form-actions">
            <button className="btn-primary" onClick={handleSaveTts} disabled={ttsSaving}>
              {ttsSaving ? t("loading") : t("save")}
            </button>
            <button className="btn-secondary" onClick={() => void previewVoice("haru")} disabled={ttsSaving}>
              {t("ttsPreviewHaru")}
            </button>
            <button className="btn-secondary" onClick={() => void previewVoice("mao")} disabled={ttsSaving}>
              {t("ttsPreviewMao")}
            </button>
          </div>
          {ttsMessage && (
            <p className={`settings-message ${ttsMessage === t("ttsSaved") ? "success" : "error"}`}>
              {ttsMessage}
            </p>
          )}
        </div>

        <div className="settings-section">
          <h3>{t("localMemory")}</h3>
          <p className="settings-desc">{t("localMemoryDesc")}</p>
          <button className="btn-danger" onClick={handleClearMemory}>{t("clearLocalMemory")}</button>
        </div>

        <AsrSettings />
      </div>
    </div>
  );
}
