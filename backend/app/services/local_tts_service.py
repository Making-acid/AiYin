from __future__ import annotations

import io
import logging
import os
import wave
from array import array
from pathlib import Path
from threading import Lock

from app.core.user_data import get_writable_dir


logger = logging.getLogger("local_tts")
MODEL_FOLDER_NAME = "kokoro-int8-multi-lang-v1_1"
MODEL_ROOT = Path(
    os.environ.get(
        "IELTS_TTS_MODEL_DIR",
        str(get_writable_dir() / "models" / "tts" / MODEL_FOLDER_NAME),
    )
)

CHARACTER_VOICES = {
    "haru": {"sid": 2, "name": "bf_vale", "speed": 0.96},
    "mao": {"sid": 1, "name": "af_sol", "speed": 1.05},
}

_engine_lock = Lock()
_engine = None
_engine_model_dir: Path | None = None


class LocalTtsError(Exception):
    """A local neural speech operation could not be completed."""


def _model_directory() -> Path | None:
    candidates = [MODEL_ROOT]
    try:
        if MODEL_ROOT.exists():
            candidates.extend(path for path in MODEL_ROOT.iterdir() if path.is_dir())
    except OSError as exc:
        logger.warning("Cannot inspect bundled Kokoro model directory: %s", exc)
        return None
    for candidate in candidates:
        if (
            any(candidate.glob("*.onnx"))
            and (candidate / "voices.bin").is_file()
            and (candidate / "tokens.txt").is_file()
            and (candidate / "espeak-ng-data").is_dir()
        ):
            return candidate
    return None


def _runtime_available() -> tuple[bool, str]:
    try:
        import sherpa_onnx  # noqa: F401
    except (ImportError, OSError) as exc:
        logger.warning("sherpa-onnx is unavailable: %s", exc)
        return False, "runtime_unavailable"
    return True, ""


def get_status() -> dict:
    model_dir = _model_directory()
    runtime_available, reason = _runtime_available()
    if model_dir is None:
        reason = "model_missing"
    installed_bytes = 0
    if model_dir is not None:
        try:
            installed_bytes = sum(path.stat().st_size for path in model_dir.rglob("*") if path.is_file())
        except OSError:
            installed_bytes = 0
    return {
        "ready": runtime_available and model_dir is not None,
        "runtime_available": runtime_available,
        "model_installed": model_dir is not None,
        "model_name": MODEL_FOLDER_NAME,
        "installed_bytes": installed_bytes,
        "reason": reason,
        "voices": {
            character: data["name"] for character, data in CHARACTER_VOICES.items()
        },
    }


def _create_engine(model_dir: Path):
    try:
        import sherpa_onnx
    except (ImportError, OSError) as exc:
        raise LocalTtsError("The bundled local speech runtime is unavailable.") from exc

    model_files = sorted(model_dir.glob("*int8*.onnx")) or sorted(model_dir.glob("*.onnx"))
    if not model_files:
        raise LocalTtsError("The bundled Kokoro model is incomplete.")
    lexicons = [model_dir / "lexicon-us-en.txt", model_dir / "lexicon-zh.txt"]
    lexicon = ",".join(str(path) for path in lexicons if path.is_file())
    config = sherpa_onnx.OfflineTtsConfig(
        model=sherpa_onnx.OfflineTtsModelConfig(
            kokoro=sherpa_onnx.OfflineTtsKokoroModelConfig(
                model=str(model_files[0]),
                voices=str(model_dir / "voices.bin"),
                tokens=str(model_dir / "tokens.txt"),
                data_dir=str(model_dir / "espeak-ng-data"),
                lexicon=lexicon,
            ),
            num_threads=max(1, min(4, os.cpu_count() or 1)),
            debug=False,
            provider="cpu",
        ),
    )
    if not config.validate():
        raise LocalTtsError("The bundled Kokoro model configuration is invalid.")
    return sherpa_onnx.OfflineTts(config)


def _get_engine():
    global _engine, _engine_model_dir
    model_dir = _model_directory()
    if model_dir is None:
        raise LocalTtsError("The bundled Kokoro model was not found.")
    if _engine is None or _engine_model_dir != model_dir:
        _engine = _create_engine(model_dir)
        _engine_model_dir = model_dir
    return _engine


def _encode_wav(samples, sample_rate: int) -> bytes:
    pcm = array(
        "h",
        (
            max(-32768, min(32767, round(float(sample) * 32767)))
            for sample in samples
        ),
    )
    output = io.BytesIO()
    with wave.open(output, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(sample_rate)
        wav.writeframes(pcm.tobytes())
    return output.getvalue()


def synthesize(text: str, character: str) -> bytes:
    normalized_text = text.strip()
    if not normalized_text:
        raise ValueError("Speech text cannot be empty.")
    if len(normalized_text) > 4000:
        raise ValueError("Speech text is too long.")
    voice = CHARACTER_VOICES.get(character)
    if voice is None:
        raise ValueError("Unknown speech character.")

    with _engine_lock:
        try:
            audio = _get_engine().generate(
                text=normalized_text,
                sid=voice["sid"],
                speed=voice["speed"],
            )
        except LocalTtsError:
            raise
        except Exception as exc:
            logger.exception("Kokoro synthesis failed")
            raise LocalTtsError("Local neural speech synthesis failed.") from exc
    return _encode_wav(audio.samples, audio.sample_rate)
