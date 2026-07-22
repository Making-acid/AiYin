import sys
import json
from pathlib import Path
from threading import Lock


def _get_data_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).parent / "data"
    return Path(__file__).parent.parent.parent / "data"


DATA_DIR = _get_data_dir()
CONFIG_PATH = DATA_DIR / "config.json"
_lock = Lock()

PROVIDER_PRESETS = {
    "deepseek-v4-flash": {
        "label": "DeepSeek V4 Flash",
        "base_url": "https://api.deepseek.com",
        "default_model": "deepseek-v4-flash",
    },
    "deepseek-v4-pro": {
        "label": "DeepSeek V4 Pro",
        "base_url": "https://api.deepseek.com",
        "default_model": "deepseek-v4-pro",
    },
    "openai": {
        "label": "OpenAI",
        "base_url": "https://api.openai.com/v1",
        "default_model": "gpt-4o-mini",
    },
    "groq": {
        "label": "Groq",
        "base_url": "https://api.groq.com/openai/v1",
        "default_model": "llama-3.3-70b-versatile",
    },
    "openrouter": {
        "label": "OpenRouter",
        "base_url": "https://openrouter.ai/api/v1",
        "default_model": "openai/gpt-4o-mini",
    },
    "ollama": {
        "label": "Ollama (Local)",
        "base_url": "http://localhost:11434/v1",
        "default_model": "llama3",
    },
    "custom": {
        "label": "Custom",
        "base_url": "",
        "default_model": "",
    },
}

DEFAULT_CONFIG = {
    "provider": "deepseek-v4-pro",
    "api_key": "",
    "base_url": "https://api.deepseek.com",
    "model": "deepseek-v4-pro",
}


def get_provider_presets():
    return PROVIDER_PRESETS


def _ensure_config_file():
    if not CONFIG_PATH.exists():
        _save_config(DEFAULT_CONFIG)


def _load_config() -> dict:
    _ensure_config_file()
    with open(CONFIG_PATH, encoding="utf-8") as f:
        return json.load(f)


def _save_config(config: dict):
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2, ensure_ascii=False)


def get_config() -> dict:
    with _lock:
        config = _load_config()
        key = config.get("api_key", "")
        masked = key[:4] + "****" + key[-4:] if len(key) > 8 else ("****" if key else "")
        return {
            "provider": config.get("provider", "deepseek"),
            "api_key": masked,
            "base_url": config.get("base_url", DEFAULT_CONFIG["base_url"]),
            "model": config.get("model", DEFAULT_CONFIG["model"]),
            "is_configured": bool(key),
        }


def update_config(
    provider: str = "",
    api_key: str = "",
    base_url: str = "",
    model: str = "",
) -> dict:
    with _lock:
        config = _load_config()
        if provider and provider in PROVIDER_PRESETS:
            preset = PROVIDER_PRESETS[provider]
            config["provider"] = provider
            config["base_url"] = preset["base_url"]
            config["model"] = preset["default_model"]
        if api_key:
            new_key = api_key.strip()
            if len(new_key) < 4:
                raise ValueError("API key is too short")
            config["api_key"] = new_key
        if base_url:
            config["base_url"] = base_url.strip()
        if model:
            config["model"] = model.strip()
        _save_config(config)

    from app.services.llm_service import reset_client
    reset_client()

    return get_config()


def get_effective_api_key() -> str:
    user_key = _load_config().get("api_key", "")
    if user_key:
        return user_key

    import os
    from dotenv import load_dotenv
    load_dotenv()
    return os.getenv("DEEPSEEK_API_KEY", "")


def get_effective_base_url() -> str:
    config = _load_config()
    if config.get("base_url"):
        return config["base_url"]

    import os
    return os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")


def get_effective_model() -> str:
    config = _load_config()
    if config.get("model"):
        return config["model"]

    import os
    return os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
