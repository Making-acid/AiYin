from pathlib import Path
from unittest.mock import Mock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import tts as tts_api
from app.services import local_tts_service


router_app = FastAPI()
router_app.include_router(tts_api.router)


def _create_model_layout(root: Path) -> None:
    root.mkdir(parents=True)
    (root / "model.int8.onnx").write_bytes(b"model")
    (root / "voices.bin").write_bytes(b"voices")
    (root / "tokens.txt").write_text("tokens", encoding="utf-8")
    (root / "espeak-ng-data").mkdir()


def test_status_reports_missing_bundled_model(monkeypatch, tmp_path):
    monkeypatch.setattr(local_tts_service, "MODEL_ROOT", tmp_path / "missing")
    monkeypatch.setattr(local_tts_service, "_runtime_available", lambda: (True, ""))
    status = local_tts_service.get_status()
    assert status["ready"] is False
    assert status["reason"] == "model_missing"


def test_status_reports_character_voices(monkeypatch, tmp_path):
    model = tmp_path / "model"
    _create_model_layout(model)
    monkeypatch.setattr(local_tts_service, "MODEL_ROOT", model)
    monkeypatch.setattr(local_tts_service, "_runtime_available", lambda: (True, ""))
    status = local_tts_service.get_status()
    assert status["ready"] is True
    assert status["voices"] == {"haru": "bf_vale", "mao": "af_sol"}


def test_synthesis_uses_separate_character_speakers(monkeypatch):
    engine = Mock()
    engine.generate.return_value = Mock(samples=[0.0, 0.5, -0.5], sample_rate=24000)
    monkeypatch.setattr(local_tts_service, "_get_engine", lambda: engine)

    haru = local_tts_service.synthesize("Good morning", "haru")
    mao = local_tts_service.synthesize("Hello", "mao")

    assert haru.startswith(b"RIFF")
    assert mao.startswith(b"RIFF")
    assert engine.generate.call_args_list[0].kwargs["sid"] == 2
    assert engine.generate.call_args_list[1].kwargs["sid"] == 1


def test_synthesis_rejects_unknown_character():
    with pytest.raises(ValueError, match="Unknown"):
        local_tts_service.synthesize("Hello", "unknown")


def test_http_endpoint_delegates_synthesis_to_service(monkeypatch):
    synthesized = b"RIFFservice-layer-wave"
    call = Mock(return_value=synthesized)
    monkeypatch.setattr(local_tts_service, "synthesize", call)

    response = TestClient(router_app).post(
        "/tts/local/synthesize",
        json={"text": "Good morning", "character": "haru"},
    )

    assert response.status_code == 200
    assert response.headers["content-type"] == "audio/wav"
    assert response.content == synthesized
    call.assert_called_once_with("Good morning", "haru")


def test_sherpa_runtime_is_confined_to_service_layer():
    app_root = Path(__file__).parents[1] / "app"
    users = []
    for source in app_root.rglob("*.py"):
        if "sherpa_onnx" in source.read_text(encoding="utf-8"):
            users.append(source.relative_to(app_root).as_posix())
    assert sorted(users) == ["services/local_tts_service.py"]
