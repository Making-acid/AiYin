from unittest.mock import Mock, patch

import pytest

from app.services import tts_service


def test_default_config_uses_bundled_kokoro(monkeypatch, tmp_path):
    monkeypatch.setattr(tts_service, "CONFIG_PATH", tmp_path / "tts_config.json")
    config = tts_service.get_config()
    assert config["provider"] == "kokoro"
    assert config["azure_configured"] is False
    assert config["azure_key"] == ""
    assert config["volume"] == 70


@pytest.mark.parametrize("provider", ["kokoro", "windows", "browser"])
def test_local_and_fallback_providers_do_not_require_credentials(monkeypatch, tmp_path, provider):
    monkeypatch.setattr(tts_service, "CONFIG_PATH", tmp_path / "tts_config.json")
    assert tts_service.update_config(provider=provider)["provider"] == provider


def test_volume_is_saved_and_returned(monkeypatch, tmp_path):
    monkeypatch.setattr(tts_service, "CONFIG_PATH", tmp_path / "tts_config.json")
    assert tts_service.update_config(volume=42)["volume"] == 42
    assert tts_service.get_config()["volume"] == 42


@pytest.mark.parametrize("volume", [-1, 101])
def test_volume_outside_supported_range_is_rejected(monkeypatch, tmp_path, volume):
    monkeypatch.setattr(tts_service, "CONFIG_PATH", tmp_path / "tts_config.json")
    with pytest.raises(ValueError, match="between 0 and 100"):
        tts_service.update_config(volume=volume)


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


def test_issue_token_reuses_cached_token(monkeypatch, tmp_path):
    monkeypatch.setattr(tts_service, "CONFIG_PATH", tmp_path / "tts_config.json")
    tts_service.update_config(
        provider="azure",
        azure_key="1234567890abcdef",
        azure_region="eastus",
    )
    response = Mock(text="cached-token")
    response.raise_for_status.return_value = None
    with patch("app.services.tts_service.httpx.post", return_value=response) as post:
        first = tts_service.issue_azure_token()
        second = tts_service.issue_azure_token()

    assert first["token"] == second["token"] == "cached-token"
    assert second["expires_in"] <= first["expires_in"]
    assert post.call_count == 1


def test_changing_azure_credentials_invalidates_cached_token(monkeypatch, tmp_path):
    monkeypatch.setattr(tts_service, "CONFIG_PATH", tmp_path / "tts_config.json")
    tts_service.update_config(
        provider="azure",
        azure_key="1234567890abcdef",
        azure_region="eastus",
    )
    first_response = Mock(text="first-token")
    first_response.raise_for_status.return_value = None
    second_response = Mock(text="second-token")
    second_response.raise_for_status.return_value = None

    with patch(
        "app.services.tts_service.httpx.post",
        side_effect=[first_response, second_response],
    ) as post:
        first = tts_service.issue_azure_token()
        tts_service.update_config(azure_region="westus")
        second = tts_service.issue_azure_token()

    assert first["token"] == "first-token"
    assert second["token"] == "second-token"
    assert second["region"] == "westus"
    assert post.call_count == 2


def test_issue_token_refreshes_before_cached_token_expires(monkeypatch, tmp_path):
    monkeypatch.setattr(tts_service, "CONFIG_PATH", tmp_path / "tts_config.json")
    tts_service.update_config(
        provider="azure",
        azure_key="1234567890abcdef",
        azure_region="eastus",
    )
    first_response = Mock(text="first-token")
    first_response.raise_for_status.return_value = None
    second_response = Mock(text="refreshed-token")
    second_response.raise_for_status.return_value = None

    with patch(
        "app.services.tts_service.time.monotonic",
        side_effect=[100.0, 581.0],
    ):
        with patch(
            "app.services.tts_service.httpx.post",
            side_effect=[first_response, second_response],
        ) as post:
            first = tts_service.issue_azure_token()
            second = tts_service.issue_azure_token()

    assert first["token"] == "first-token"
    assert second["token"] == "refreshed-token"
    assert post.call_count == 2
