import api from "./client";

export type TtsProvider = "browser" | "azure";

export interface TtsConfig {
  provider: TtsProvider;
  azure_key: string;
  azure_region: string;
  haru_voice: string;
  mao_voice: string;
  azure_configured: boolean;
}

export interface AzureSpeechToken {
  token: string;
  region: string;
  expires_in: number;
}

export async function fetchTtsConfig(): Promise<TtsConfig> {
  const { data } = await api.get("/tts/config");
  return data;
}

export async function saveTtsConfig(config: Partial<{
  provider: TtsProvider;
  azure_key: string;
  azure_region: string;
  haru_voice: string;
  mao_voice: string;
}>): Promise<TtsConfig> {
  const { data } = await api.post("/tts/config", config);
  return data;
}

export async function fetchAzureSpeechToken(): Promise<AzureSpeechToken> {
  const { data } = await api.post("/tts/azure-token");
  return data;
}
