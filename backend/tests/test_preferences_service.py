import json
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

import pytest

from app.services import preferences_service


def test_preferences_have_chinese_first_defaults():
    with TemporaryDirectory() as tmp:
        path = Path(tmp) / "preferences.json"
        with patch.object(preferences_service, "PREFERENCES_PATH", path):
            preferences = preferences_service.get_preferences()

    assert preferences == {
        "ui_language": "zh",
        "live2d_behavior": "look_forward",
        "tutorial_seen_version": "",
    }


def test_preferences_are_persisted_and_invalid_values_are_rejected():
    with TemporaryDirectory() as tmp:
        path = Path(tmp) / "preferences.json"
        with patch.object(preferences_service, "PREFERENCES_PATH", path):
            updated = preferences_service.update_preferences(
                ui_language="en",
                live2d_behavior="follow_mouse",
                tutorial_seen_version="3",
            )
            saved = json.loads(path.read_text(encoding="utf-8"))
            loaded = preferences_service.get_preferences()
            with pytest.raises(ValueError):
                preferences_service.update_preferences(ui_language="ja")

    assert updated == saved == loaded
