import { useState, useEffect, useCallback } from "react";
import api from "../api/client";

type AsrMode = "exam" | "free_chat";

interface WhisperModel {
  id: string;
  name: string;
  size: string;
  downloaded: boolean;
}

interface WhisperConfig {
  enabled: boolean;
  model: string;
  model_name: string;
  is_downloaded: boolean;
  exam_enhancement: "auto" | "on" | "off";
  whisperx: {
    installed: boolean;
    available: boolean;
    active: boolean;
    fallback: boolean;
    reason: "ready" | "not_installed" | "python_unsupported" | "integration_pending";
    python_version: string;
    minimum_python: string;
    supported_python: string;
  };
}

export function useWhisperConfig(mode: AsrMode) {
  const storageKey = `asr_${mode}_enabled`;
  const defaultEnabled = mode === "exam";

  const [config, setConfig] = useState<WhisperConfig | null>(null);
  const [models, setModels] = useState<WhisperModel[]>([]);
  const [localEnabled, setLocalEnabled] = useState(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored !== null) return stored === "true";
    return defaultEnabled;
  });
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState("");

  const effectiveConfig = config ? { ...config, enabled: localEnabled } : null;

  const load = useCallback(async () => {
    try {
      const [cfgRes, modRes] = await Promise.all([
        api.get<WhisperConfig>("/whisper/config"),
        api.get<WhisperModel[]>("/whisper/models"),
      ]);
      setConfig(cfgRes.data);
      setModels(modRes.data);
    } catch {
      // whisper not available
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleEnabled = async (enabled: boolean) => {
    const previous = localEnabled;
    setLocalEnabled(enabled);
    localStorage.setItem(storageKey, String(enabled));
    try {
      await api.post("/whisper/config", { enabled });
    } catch {
      setLocalEnabled(previous);
      localStorage.setItem(storageKey, String(previous));
    }
  };

  const switchModel = async (modelId: string, confirmMessage?: string) => {
    const model = models.find((m) => m.id === modelId);
    if (!model) return false;
    if (!model.downloaded && confirmMessage && !window.confirm(confirmMessage)) return false;

    setDownloading(modelId);
    try {
      if (!model.downloaded) {
        await api.post("/whisper/models/download", { model_id: modelId }, { timeout: 0 });
      }
      const switchRes = await api.post<WhisperConfig>("/whisper/config", { model: modelId });
      setConfig(switchRes.data);
      if (!model.downloaded) await load();
      return true;
    } catch {
      return false;
    } finally {
      setDownloading("");
    }
  };

  const updateEnhancementMode = async (mode: "auto" | "on" | "off") => {
    if (!config) return false;
    const previous = config;
    setConfig({ ...config, exam_enhancement: mode });
    try {
      const response = await api.post<WhisperConfig>("/whisper/config", { exam_enhancement: mode });
      setConfig(response.data);
      return true;
    } catch {
      setConfig(previous);
      return false;
    }
  };

  return { config: effectiveConfig, models, loading, downloading, toggleEnabled, switchModel, updateEnhancementMode, refresh: load };
}
