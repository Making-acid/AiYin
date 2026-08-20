import { useState, useEffect, useCallback } from "react";
import api from "../api/client";

type AsrMode = "exam" | "free_chat";

interface WhisperModel {
  id: string;
  name: string;
  size: string;
  downloaded: boolean;
  bundled: boolean;
  profile: "performance" | "quality" | null;
  download_requires_external_access: boolean;
}

interface WhisperConfig {
  enabled: boolean;
  mode: AsrMode;
  model: string;
  model_name: string;
  is_downloaded: boolean;
  exam_enhancement: "auto" | "on" | "off";
  whisperx: {
    installed: boolean;
    available: boolean;
    active: boolean;
    fallback: boolean;
    reason: "ready" | "not_installed" | "python_unsupported" | "integration_pending" | "model_missing";
    python_version: string;
    minimum_python: string;
    supported_python: string;
    alignment_model_bundled: boolean;
  };
}

function errorDetail(error: unknown): string {
  const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  return typeof detail === "string" && detail.trim() ? detail : "Unknown error";
}

export function useWhisperConfig(mode: AsrMode) {
  const [config, setConfig] = useState<WhisperConfig | null>(null);
  const [models, setModels] = useState<WhisperModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState("");
  const [operationError, setOperationError] = useState("");

  const load = useCallback(async () => {
    try {
      const [cfgRes, modRes] = await Promise.all([
        api.get<WhisperConfig>("/whisper/config", { params: { mode } }),
        api.get<WhisperModel[]>("/whisper/models"),
      ]);
      setConfig(cfgRes.data);
      setModels(modRes.data);
      setOperationError("");
    } catch (error) {
      setOperationError(errorDetail(error));
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => { load(); }, [load]);

  const toggleEnabled = async (enabled: boolean) => {
    if (!config) return false;
    const previous = config;
    setConfig({ ...config, enabled });
    setOperationError("");
    try {
      const response = await api.post<WhisperConfig>("/whisper/config", { mode, enabled });
      setConfig(response.data);
      return true;
    } catch (error) {
      setConfig(previous);
      setOperationError(errorDetail(error));
      return false;
    }
  };

  const switchModel = async (modelId: string, confirmMessage?: string) => {
    const model = models.find((m) => m.id === modelId);
    if (!model) return false;
    if (!model.downloaded && confirmMessage && !window.confirm(confirmMessage)) return false;

    setDownloading(modelId);
    setOperationError("");
    try {
      if (!model.downloaded) {
        await api.post("/whisper/models/download", { model_id: modelId }, { timeout: 0 });
      }
      const switchRes = await api.post<WhisperConfig>("/whisper/config", { mode, model: modelId });
      setConfig(switchRes.data);
      if (!model.downloaded) await load();
      return true;
    } catch (error) {
      setOperationError(errorDetail(error));
      return false;
    } finally {
      setDownloading("");
    }
  };

  const updateEnhancementMode = async (enhancementMode: "auto" | "on" | "off") => {
    if (!config) return false;
    const previous = config;
    setConfig({ ...config, exam_enhancement: enhancementMode });
    setOperationError("");
    try {
      const response = await api.post<WhisperConfig>("/whisper/config", { mode: "exam", exam_enhancement: enhancementMode });
      setConfig(response.data);
      return true;
    } catch (error) {
      setConfig(previous);
      setOperationError(errorDetail(error));
      return false;
    }
  };

  return { config, models, loading, downloading, operationError, toggleEnabled, switchModel, updateEnhancementMode, refresh: load };
}
