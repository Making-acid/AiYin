import { useState, useEffect, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "";

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

export function useWhisperConfig() {
  const [config, setConfig] = useState<WhisperConfig | null>(null);
  const [models, setModels] = useState<WhisperModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState("");

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
    const params = new URLSearchParams({ enabled: String(enabled) });
    const res = await fetch(`${API_BASE}/whisper/config?${params}`, { method: "POST" });
    setConfig(await res.json());
  };

  const switchModel = async (modelId: string, confirmMessage: string = "") => {
    setDownloading(modelId);

    const model = models.find((m) => m.id === modelId);
    if (model?.downloaded) {
      const params = new URLSearchParams({ model: modelId });
      const res = await fetch(`${API_BASE}/whisper/config?${params}`, { method: "POST" });
      setConfig(await res.json());
      setDownloading("");
      return true;
    }

    if (confirmMessage && !window.confirm(confirmMessage)) {
      setDownloading("");
      return false;
    }

    try {
      await fetch(`${API_BASE}/whisper/models/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model_id: modelId }),
      });

      const switchParams = new URLSearchParams({ model: modelId });
      const switchRes = await fetch(`${API_BASE}/whisper/config?${switchParams}`, { method: "POST" });
      setConfig(await switchRes.json());
      await load();
      return true;
    } catch {
      setDownloading("");
      return false;
    }
  };

  return { config, models, loading, downloading, toggleEnabled, switchModel, refresh: load };
}
