import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from app.services import whisper_service


class WhisperConfigTests(unittest.TestCase):
    def test_default_enhancement_is_auto_and_reports_fallback(self):
        with tempfile.TemporaryDirectory() as tmp:
            config_path = Path(tmp) / "whisper_config.json"
            with (
                patch.object(whisper_service, "CONFIG_PATH", config_path),
                patch.object(whisper_service, "is_model_downloaded", return_value=False),
                patch.object(
                    whisper_service,
                    "_whisperx_capability",
                    return_value={
                        "installed": False,
                        "available": False,
                        "reason": "not_installed",
                        "python_version": "3.11.0",
                        "minimum_python": "3.10",
                        "supported_python": "3.10–3.13",
                    },
                ),
            ):
                config = whisper_service.get_whisper_config()

        self.assertEqual(config["exam_enhancement"], "auto")
        self.assertFalse(config["whisperx"]["active"])
        self.assertTrue(config["whisperx"]["fallback"])

    def test_enhancement_mode_is_persisted(self):
        with tempfile.TemporaryDirectory() as tmp:
            config_path = Path(tmp) / "whisper_config.json"
            with (
                patch.object(whisper_service, "CONFIG_PATH", config_path),
                patch.object(whisper_service, "is_model_downloaded", return_value=False),
                patch.object(
                    whisper_service,
                    "_whisperx_capability",
                    return_value={
                        "installed": False,
                        "available": False,
                        "reason": "not_installed",
                        "python_version": "3.11.0",
                        "minimum_python": "3.10",
                        "supported_python": "3.10–3.13",
                    },
                ),
            ):
                result = whisper_service.update_whisper_config(exam_enhancement="off")
                saved = json.loads(config_path.read_text(encoding="utf-8"))

        self.assertEqual(result["exam_enhancement"], "off")
        self.assertEqual(saved["exam_enhancement"], "off")
        self.assertFalse(result["whisperx"]["fallback"])

    def test_rejects_unknown_enhancement_mode(self):
        with tempfile.TemporaryDirectory() as tmp:
            with patch.object(whisper_service, "CONFIG_PATH", Path(tmp) / "whisper_config.json"):
                with self.assertRaises(ValueError):
                    whisper_service.update_whisper_config(exam_enhancement="sometimes")


if __name__ == "__main__":
    unittest.main()
