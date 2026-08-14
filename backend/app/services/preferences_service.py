import json
from pathlib import Path
from threading import Lock
from typing import Optional

from app.core.user_data import get_writable_dir


PREFERENCES_PATH = get_writable_dir() / "preferences.json"
_preferences_lock = Lock()

DEFAULT_PREFERENCES = {
    "ui_language": "zh",
    "live2d_behavior": "look_forward",
    "tutorial_seen_version": "",
}

VALID_UI_LANGUAGES = {"zh", "en"}
VALID_LIVE2D_BEHAVIORS = {"look_forward", "follow_mouse"}


def _load_unlocked() -> dict:
    try:
        if not PREFERENCES_PATH.exists():
            return dict(DEFAULT_PREFERENCES)
        raw = json.loads(PREFERENCES_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return dict(DEFAULT_PREFERENCES)

    result = dict(DEFAULT_PREFERENCES)
    if raw.get("ui_language") in VALID_UI_LANGUAGES:
        result["ui_language"] = raw["ui_language"]
    if raw.get("live2d_behavior") in VALID_LIVE2D_BEHAVIORS:
        result["live2d_behavior"] = raw["live2d_behavior"]
    if isinstance(raw.get("tutorial_seen_version"), str):
        result["tutorial_seen_version"] = raw["tutorial_seen_version"]
    return result


def get_preferences() -> dict:
    with _preferences_lock:
        return _load_unlocked()


def update_preferences(
    ui_language: Optional[str] = None,
    live2d_behavior: Optional[str] = None,
    tutorial_seen_version: Optional[str] = None,
) -> dict:
    with _preferences_lock:
        preferences = _load_unlocked()
        if ui_language is not None:
            if ui_language not in VALID_UI_LANGUAGES:
                raise ValueError("Unsupported UI language")
            preferences["ui_language"] = ui_language
        if live2d_behavior is not None:
            if live2d_behavior not in VALID_LIVE2D_BEHAVIORS:
                raise ValueError("Unsupported Live2D behavior")
            preferences["live2d_behavior"] = live2d_behavior
        if tutorial_seen_version is not None:
            preferences["tutorial_seen_version"] = tutorial_seen_version[:64]

        PREFERENCES_PATH.parent.mkdir(parents=True, exist_ok=True)
        temporary = Path(str(PREFERENCES_PATH) + ".tmp")
        try:
            temporary.write_text(
                json.dumps(preferences, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
            temporary.replace(PREFERENCES_PATH)
        except OSError:
            try:
                temporary.unlink()
            except OSError:
                pass
            raise
        return preferences
