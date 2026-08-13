import json
import logging
from pathlib import Path
from threading import Lock

import httpx

from app.core.user_data import get_writable_dir, migrate_if_needed


logger = logging.getLogger("tts")
_lock = Lock()

migrate_if_needed("tts_config.json")
CONFIG_PATH = get_writable_dir() / "tts_config.json"

DEFAULT_CONFIG = {
    "provider": "browser",
    "azure_key": "",
    "azure_region": "",
    "haru_voice": "en-GB-SoniaNeural",
    "mao_voice": "en-US-AnaNeural",
}

SUPPORTED_PROVIDERS = {"browser", "azure"}


class TtsConfigError(Exception):
    """User-facing TTS configuration error."""


def _load_config() -> dict:
    if not CONFIG_PATH.exists():
        return dict(DEFAULT_CONFIG)
    try:
        with open(CONFIG_PATH, encoding="utf-8") as file:
            stored = json.load(file)
        return {**DEFAULT_CONFIG, **stored}
    except (OSError, json.JSONDecodeError) as exc:
        logger.error("Cannot read TTS configuration: %s", exc)
        raise TtsConfigError("The speech configuration could not be read.") from exc


def _save_config(config: dict) -> None:
    try:
        CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(CONFIG_PATH, "w", encoding="utf-8") as file:
            json.dump(config, file, indent=2, ensure_ascii=False)
    except OSError as exc:
        logger.error("Cannot save TTS configuration: %s", exc)
        raise TtsConfigError("The speech configuration could not be saved.") from exc


def _public_config(config: dict) -> dict:
    key = config.get("azure_key", "")
    masked = key[:4] + "****" + key[-4:] if len(key) > 8 else ("****" if key else "")
    return {
        "provider": config.get("provider", "browser"),
        "azure_key": masked,
        "azure_region": config.get("azure_region", ""),
        "haru_voice": config.get("haru_voice", DEFAULT_CONFIG["haru_voice"]),
        "mao_voice": config.get("mao_voice", DEFAULT_CONFIG["mao_voice"]),
        "azure_configured": bool(key and config.get("azure_region")),
    }


def get_config() -> dict:
    with _lock:
        return _public_config(_load_config())


def update_config(
    provider: str | None = None,
    azure_key: str | None = None,
    azure_region: str | None = None,
    haru_voice: str | None = None,
    mao_voice: str | None = None,
) -> dict:
    with _lock:
        config = _load_config()
        if provider is not None:
            normalized_provider = provider.strip().lower()
            if normalized_provider not in SUPPORTED_PROVIDERS:
                raise ValueError("Unsupported TTS provider.")
            config["provider"] = normalized_provider
        if azure_key is not None and azure_key.strip():
            if len(azure_key.strip()) < 12:
                raise ValueError("Azure Speech key is too short.")
            config["azure_key"] = azure_key.strip()
        if azure_region is not None:
            config["azure_region"] = azure_region.strip().lower()
        if haru_voice is not None and haru_voice.strip():
            config["haru_voice"] = haru_voice.strip()
        if mao_voice is not None and mao_voice.strip():
            config["mao_voice"] = mao_voice.strip()

        if config["provider"] == "azure" and not (
            config.get("azure_key") and config.get("azure_region")
        ):
            raise ValueError("Azure Speech requires both a key and a region.")

        _save_config(config)
        return _public_config(config)


def issue_azure_token() -> dict:
    with _lock:
        config = _load_config()
    key = config.get("azure_key", "")
    region = config.get("azure_region", "")
    if not key or not region:
        raise TtsConfigError("Azure Speech is not configured.")

    endpoint = f"https://{region}.api.cognitive.microsoft.com/sts/v1.0/issueToken"
    try:
        response = httpx.post(
            endpoint,
            headers={"Ocp-Apim-Subscription-Key": key},
            timeout=10.0,
        )
        response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        logger.warning("Azure Speech rejected the configured credentials: %s", exc.response.status_code)
        raise TtsConfigError("Azure Speech rejected the key or region.") from exc
    except httpx.HTTPError as exc:
        logger.warning("Azure Speech token request failed: %s", exc)
        raise TtsConfigError("Azure Speech could not be reached.") from exc

    return {"token": response.text, "region": region, "expires_in": 540}
