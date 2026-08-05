import sys
import json
import logging
from pathlib import Path
from threading import Lock
from app.core.user_data import get_writable_dir, migrate_if_needed


logger = logging.getLogger("config")


class ConfigError(Exception):
    """User-facing error for configuration issues."""


def _get_readonly_data_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).parent / "data"
    return Path(__file__).parent.parent.parent / "data"


RO_DATA_DIR = _get_readonly_data_dir()
PROVIDERS_PATH = RO_DATA_DIR / "providers.json"
_lock = Lock()

# config.json lives in the writable user data directory
migrate_if_needed("config.json")
CONFIG_PATH = get_writable_dir() / "config.json"


DEFAULT_PROVIDER_PRESETS = {
    "deepseek-v4-pro": {
        "label": "DeepSeek V4 Pro",
        "base_url": "https://api.deepseek.com",
        "default_model": "deepseek-v4-pro",
    },
    "custom": {
        "label": "Custom",
        "base_url": "",
        "default_model": "",
    },
}


def _load_provider_presets() -> dict:
    try:
        if PROVIDERS_PATH.exists():
            with open(PROVIDERS_PATH, encoding="utf-8") as f:
                return json.load(f)
    except Exception as e:
        logger.warning("Failed to load providers.json, using defaults: %s", e)
    return dict(DEFAULT_PROVIDER_PRESETS)


def get_provider_presets():
    return _load_provider_presets()


DEFAULT_CONFIG = {
    "provider": "deepseek-v4-pro",
    "api_key": "",
    "base_url": "https://api.deepseek.com",
    "model": "deepseek-v4-pro",
}


def _ensure_config_file():
    if not CONFIG_PATH.exists():
        _save_config(DEFAULT_CONFIG)


def _load_config() -> dict:
    _ensure_config_file()
    try:
        with open(CONFIG_PATH, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        logger.warning("Config file not found, using defaults.")
        return dict(DEFAULT_CONFIG)
    except json.JSONDecodeError as e:
        logger.error("Config file is corrupted: %s", e)
        raise ConfigError(
            "The configuration file is corrupted. Please go to Settings and re-save your configuration."
        )
    except OSError as e:
        logger.error("Cannot read config file: %s", e)
        raise ConfigError(
            "Cannot read the configuration file. Please check file permissions."
        )


def _save_config(config: dict):
    try:
        CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
    except OSError as e:
        logger.error("Cannot write config file: %s", e)
        raise ConfigError(
            "Cannot save configuration. Please check that the application has write permissions."
        )


def get_config() -> dict:
    try:
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
    except ConfigError:
        raise
    except Exception as e:
        logger.error("Unexpected error reading config: %s", e)
        raise ConfigError("Failed to load configuration. Please try again.")


def update_config(
    provider: str = "",
    api_key: str = "",
    base_url: str = "",
    model: str = "",
) -> dict:
    try:
        with _lock:
            config = _load_config()
        if provider and provider in _load_provider_presets():
            preset = _load_provider_presets()[provider]
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
    except (ValueError, ConfigError):
        raise
    except Exception as e:
        logger.error("Unexpected error updating config: %s", e)
        raise ConfigError("Failed to save configuration. Please try again.")


def get_effective_api_key() -> str:
    try:
        user_key = _load_config().get("api_key", "")
        if user_key:
            return user_key
    except (ConfigError, Exception):
        pass

    import os
    from dotenv import load_dotenv
    load_dotenv()
    return os.getenv("LLM_API_KEY", os.getenv("DEEPSEEK_API_KEY", ""))


def get_effective_base_url() -> str:
    try:
        config = _load_config()
        if config.get("base_url"):
            return config["base_url"]
    except (ConfigError, Exception):
        pass

    import os
    return os.getenv("LLM_BASE_URL", os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com"))


def get_effective_model() -> str:
    try:
        config = _load_config()
        if config.get("model"):
            return config["model"]
    except (ConfigError, Exception):
        pass

    import os
    return os.getenv("LLM_MODEL", os.getenv("DEEPSEEK_MODEL", "deepseek-chat"))
