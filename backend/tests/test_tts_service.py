from unittest.mock import Mock, patch

import pytest

from app.services import tts_service


def test_default_config_uses_browser(monkeypatch, tmp_path):
    monkeypatch.setattr(tts_service, "CONFIG_PATH", tmp_path / "tts_config.json")
    config = tts_service.get_config()
    assert config["provider"] == "browser"
    assert config["azure_configured"] is False
    assert config["azure_key"] == ""


def test_azure_requires_key_and_region(monkeypatch, tmp_path):
    monkeypatch.setattr(tts_service, "CONFIG_PATH", tmp_path / "tts_config.json")
    with pytest.raises(ValueError, match="both a key and a region"):
        tts_service.update_config(provider="azure")


def test_config_masks_azure_key(monkeypatch, tmp_path):
    monkeypatch.setattr(tts_service, "CONFIG_PATH", tmp_path / "tts_config.json")
    result = tts_service.update_config(
        provider="azure",
        azure_key="1234567890abcdef",
        azure_region="eastus",
    )
    assert result["azure_key"] == "1234****cdef"
    assert result["azure_configured"] is True


def test_issue_token_keeps_key_server_side(monkeypatch, tmp_path):
    monkeypatch.setattr(tts_service, "CONFIG_PATH", tmp_path / "tts_config.json")
    tts_service.update_config(
        provider="azure",
        azure_key="1234567890abcdef",
        azure_region="eastus",
    )
    response = Mock(text="short-lived-token")
    response.raise_for_status.return_value = None
    with patch("app.services.tts_service.httpx.post", return_value=response) as post:
        result = tts_service.issue_azure_token()
    assert result["token"] == "short-lived-token"
    assert result["region"] == "eastus"
    assert post.call_args.kwargs["headers"]["Ocp-Apim-Subscription-Key"] == "1234567890abcdef"
