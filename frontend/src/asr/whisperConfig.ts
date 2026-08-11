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

  return { config: effectiveConfig, models, loading, downloading, toggleEnabled, switchModel, refresh: load };
}
