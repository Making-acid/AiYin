import api from "./client";

export type TtsProvider = "browser" | "azure" | "kokoro" | "windows";

export interface TtsConfig {
  provider: TtsProvider;
  azure_key: string;
  azure_region: string;
  haru_voice: string;
  mao_voice: string;
  volume: number;
  azure_configured: boolean;
}

export interface AzureSpeechToken {
  token: string;
  region: string;
  expires_in: number;
}

export interface LocalTtsStatus {
  ready: boolean;
  runtime_available: boolean;
  model_installed: boolean;
  model_name: string;
  installed_bytes: number;
  reason: string;
  voices: { haru: string; mao: string };
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
  volume: number;
}>): Promise<TtsConfig> {
  const { data } = await api.post("/tts/config", config);
  return data;
}

export async function fetchAzureSpeechToken(): Promise<AzureSpeechToken> {
  const { data } = await api.post("/tts/azure-token");
  return data;
}

export async function fetchLocalTtsStatus(): Promise<LocalTtsStatus> {
  const { data } = await api.get<LocalTtsStatus>("/tts/local/status");
  return data;
}

export async function synthesizeLocalSpeech(text: string, character: "haru" | "mao"): Promise<Blob> {
  const { data } = await api.post(
    "/tts/local/synthesize",
    { text, character },
    { responseType: "blob", timeout: 0 },
  );
  return data;
}
