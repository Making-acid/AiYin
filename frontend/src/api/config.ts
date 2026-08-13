import api from "./client";

export interface ProviderPreset {
  label: string;
  base_url: string;
  default_model: string;
}

export interface AppConfig {
  provider: string;
  api_key: string;
  base_url: string;
  model: string;
  is_configured: boolean;
}

export async function fetchProviders(): Promise<Record<string, ProviderPreset>> {
  const { data } = await api.get("/config/providers");
  return data;
}

export async function fetchConfig(): Promise<AppConfig> {
  const { data } = await api.get("/config");
  return data;
}

export async function saveConfig(config: {
  provider?: string;
  api_key?: string;
  base_url?: string;
  model?: string;
}): Promise<AppConfig> {
  const { data } = await api.post("/config", config);
  return data;
}

export async function clearLocalMemory(): Promise<void> {
  await api.delete("/config/local-memory");
}
