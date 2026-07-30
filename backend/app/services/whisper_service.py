import io
import json
import logging
import os
import shutil
import sys
import tempfile
from pathlib import Path
from threading import Lock
from typing import Optional

logger = logging.getLogger("whisper")

# Lazy imports for optional dependencies
_av = None
_faster_whisper = None

def _get_av():
    global _av
    if _av is None:
        import av as _mod
        _av = _mod
    return _av

def _get_faster_whisper():
    global _faster_whisper
    if _faster_whisper is None:
        import faster_whisper as _mod
        _faster_whisper = _mod
    return _faster_whisper

MODELS_DIR = (Path(sys.executable).parent if getattr(sys, "frozen", False) else Path(__file__).parent.parent.parent) / "models" / "whisper"
CONFIG_PATH = (Path(sys.executable).parent if getattr(sys, "frozen", False) else Path(__file__).parent.parent.parent) / "data" / "whisper_config.json"

_model = None
_model_lock = Lock()
_current_model_name: Optional[str] = None

WHISPER_MODELS = {
    "tiny": {"name": "Whisper Tiny", "size": "~75MB", "english_only": False},
    "tiny.en": {"name": "Whisper Tiny (English)", "size": "~75MB", "english_only": True},
    "base": {"name": "Whisper Base", "size": "~145MB", "english_only": False},
    "base.en": {"name": "Whisper Base (English)", "size": "~145MB", "english_only": True},
    "small": {"name": "Whisper Small", "size": "~460MB", "english_only": False},
    "small.en": {"name": "Whisper Small (English)", "size": "~460MB", "english_only": True},
    "medium": {"name": "Whisper Medium", "size": "~1.5GB", "english_only": False},
    "medium.en": {"name": "Whisper Medium (English)", "size": "~1.5GB", "english_only": True},
    "large-v3": {"name": "Whisper Large V3", "size": "~2.9GB", "english_only": False},
}


def _get_config() -> dict:
    try:
        if CONFIG_PATH.exists():
            with open(CONFIG_PATH, encoding="utf-8") as f:
                return json.load(f)
        return {"model": "small", "enabled": False, "language": "en"}
    except json.JSONDecodeError as e:
        logger.error("Whisper config file is corrupted: %s", e)
        return {"model": "small", "enabled": False, "language": "en"}
    except OSError as e:
        logger.error("Cannot read whisper config: %s", e)
        return {"model": "small", "enabled": False, "language": "en"}


def _save_config(config: dict):
    try:
        CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(config, f, indent=2)
    except OSError as e:
        logger.error("Cannot write whisper config: %s", e)
        raise RuntimeError("Cannot save Whisper configuration. Please check file permissions.")


def get_whisper_config() -> dict:
    config = _get_config()
    current = config.get("model", "small")
    return {
        "enabled": config.get("enabled", True),
        "model": current,
        "model_name": WHISPER_MODELS.get(current, {}).get("name", current),
        "is_downloaded": is_model_downloaded(current),
        "language": config.get("language", "en"),
    }


def update_whisper_config(enabled: bool = None, model: str = None, language: str = None) -> dict:
    config = _get_config()
    if enabled is not None:
        config["enabled"] = enabled
    if language is not None:
        config["language"] = language
    if model is not None:
        if model not in WHISPER_MODELS:
            raise ValueError(f"Unknown model: {model}")
        if not is_model_downloaded(model):
            raise ValueError(f"Model {model} is not downloaded")
        config["model"] = model
        global _model, _current_model_name
        with _model_lock:
            _model = None
            _current_model_name = None
    _save_config(config)
    return get_whisper_config()


def list_models() -> list:
    result = []
    for model_id, info in WHISPER_MODELS.items():
        result.append({
            "id": model_id,
            "name": info["name"],
            "size": info["size"],
            "english_only": info["english_only"],
            "downloaded": is_model_downloaded(model_id),
        })
    return result


def is_model_downloaded(model_id: str) -> bool:
    path = MODELS_DIR / model_id
    return (path / "model.bin").exists()


def download_model(model_id: str) -> dict:
    if model_id not in WHISPER_MODELS:
        raise ValueError(f"Unknown model: {model_id}")

    os.environ.setdefault("HF_ENDPOINT", "https://hf-mirror.com")

    try:
        from faster_whisper import download_model as dm
    except ImportError:
        raise RuntimeError("faster-whisper is not installed. Run: pip install faster-whisper")

    import requests

    path = str(MODELS_DIR / model_id)
    os.makedirs(path, exist_ok=True)

    try:
        dm.download_model(model_id, output_dir=path)
    except (requests.exceptions.ConnectionError, requests.exceptions.Timeout, OSError) as e:
        raise RuntimeError(f"Network error downloading {model_id}: {e}. Please check your internet connection or try a different network.")

    if not is_model_downloaded(model_id):
        raise RuntimeError(f"Download completed but model files not found. Please try again.")

    config = _get_config()
    current = config.get("model", "")
    if not current or not is_model_downloaded(current):
        config["model"] = model_id
        _save_config(config)

    return {"id": model_id, "name": WHISPER_MODELS[model_id]["name"], "downloaded": True}


def _get_model():
    global _model, _current_model_name
    config = _get_config()
    model_id = config.get("model", "small")

    if _model is not None and _current_model_name == model_id:
        return _model

    with _model_lock:
        if _model is not None and _current_model_name == model_id:
            return _model

        try:
            from faster_whisper import WhisperModel
        except ImportError:
            raise RuntimeError("faster-whisper is not installed. Run: pip install faster-whisper")

        model_path = str(MODELS_DIR / model_id) if is_model_downloaded(model_id) else model_id
        _model = WhisperModel(model_path, device="cpu", compute_type="int8")
        _current_model_name = model_id
        return _model


def _convert_to_wav(audio_bytes: bytes, output_path: str):
    """Convert browser-recorded WebM/Opus audio to 16kHz mono WAV."""
    try:
        av = _get_av()
    except ImportError:
        raise RuntimeError(
            "Audio conversion requires 'av' package. Run: pip install av"
        )

    try:
        input_container = av.open(io.BytesIO(audio_bytes))
    except Exception as e:
        raise RuntimeError(
            f"Cannot read audio format. Make sure you are using Chrome or Edge. "
            f"Detail: {e}"
        )

    audio_stream = next((s for s in input_container.streams if s.type == "audio"), None)
    if not audio_stream:
        input_container.close()
        raise RuntimeError("No audio stream found in recording.")

    try:
        resampler = av.audio.resampler.AudioResampler(
            format="s16", layout="mono", rate=16000
        )
    except Exception:
        resampler = None

    output_container = av.open(output_path, "w", format="wav")
    output_stream = output_container.add_stream("pcm_s16le", rate=16000)
    output_stream.layout = "mono"

    for frame in input_container.decode(audio=0):
        if resampler:
            frames = list(resampler.resample(frame))
        else:
            frames = [frame]
        for rf in frames:
            for packet in output_stream.encode(rf):
                output_container.mux(packet)

    for packet in output_stream.encode(None):
        if packet:
            output_container.mux(packet)

    output_container.close()
    input_container.close()


def transcribe(audio_bytes: bytes, language: str = None) -> str:
    if not audio_bytes:
        return ""

    config = _get_config()
    model_id = config.get("model", "small")
    transcribe_lang = language or config.get("language", "en")
    if not is_model_downloaded(model_id):
        raise RuntimeError(
            f"Model '{model_id}' is not downloaded. "
            f"Please go to Settings → Whisper ASR → download the model (e.g. 'small')."
        )

    tmp_wav = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    try:
        tmp_wav.close()
        _convert_to_wav(audio_bytes, tmp_wav.name)

        model = _get_model()
        segments, info = model.transcribe(tmp_wav.name, language=transcribe_lang, beam_size=5)

        text = " ".join(seg.text.strip() for seg in segments)
        logger.info("Transcribed %d chars, detected language: %s", len(text), info.language)
        return text
    except Exception as e:
        logger.error("Transcription failed: %s", e)
        raise RuntimeError(str(e))
    finally:
        try:
            os.unlink(tmp_wav.name)
        except OSError:
            pass
