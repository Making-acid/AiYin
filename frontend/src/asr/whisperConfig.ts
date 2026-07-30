import { useState, useEffect, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "";

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
        fetch(`${API_BASE}/whisper/config`),
        fetch(`${API_BASE}/whisper/models`),
      ]);
      setConfig(await cfgRes.json());
      setModels(await modRes.json());
    } catch {
      // whisper not available
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleEnabled = async (enabled: boolean) => {
    setLocalEnabled(enabled);
    localStorage.setItem(storageKey, String(enabled));
    await fetch(`${API_BASE}/whisper/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    }).catch(() => {});
  };

  const switchModel = async (modelId: string, confirmMessage?: string) => {
    setDownloading(modelId);

    const model = models.find((m) => m.id === modelId);
    if (model?.downloaded) {
      const res = await fetch(`${API_BASE}/whisper/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: modelId }),
      });
      setConfig(await res.json());
      setDownloading("");
      return true;
    }

    if (confirmMessage && !window.confirm(confirmMessage)) { setDownloading(""); return false; }

    try {
      await fetch(`${API_BASE}/whisper/models/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model_id: modelId }),
      });
      const switchRes = await fetch(`${API_BASE}/whisper/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: modelId }),
      });
      setConfig(await switchRes.json());
      await load();
      return true;
    } catch {
      setDownloading("");
      return false;
    }
  };

  return { config: effectiveConfig, models, loading, downloading, toggleEnabled, switchModel, refresh: load };
}
