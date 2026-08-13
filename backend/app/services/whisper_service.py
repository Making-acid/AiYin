import io
import importlib.util
import json
import logging
import os
import shutil
import sys
import tempfile
from pathlib import Path
from threading import Lock
from typing import Optional
from app.core.user_data import get_writable_dir, migrate_if_needed

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

_MODELS_DIR = get_writable_dir() / "models" / "whisper"
_MODELS_DIR.mkdir(parents=True, exist_ok=True)
CONFIG_PATH = get_writable_dir() / "whisper_config.json"
migrate_if_needed("whisper_config.json")

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

EXAM_ENHANCEMENT_MODES = {"auto", "on", "off"}
WHISPERX_PIPELINE_IMPLEMENTED = True


def _whisperx_capability() -> dict:
    """Report capability without importing the heavyweight torch stack."""
    python_compatible = (3, 10) <= sys.version_info[:2] < (3, 14)
    try:
        installed = importlib.util.find_spec("whisperx") is not None
    except (ImportError, ValueError):
        installed = False

    if not python_compatible:
        reason = "python_unsupported"
    elif not installed:
        reason = "not_installed"
    elif not WHISPERX_PIPELINE_IMPLEMENTED:
        reason = "integration_pending"
    else:
        reason = "ready"

    return {
        "installed": installed,
        "available": installed and python_compatible and WHISPERX_PIPELINE_IMPLEMENTED,
        "reason": reason,
        "python_version": ".".join(str(part) for part in sys.version_info[:3]),
        "minimum_python": "3.10",
        "supported_python": "3.10–3.13",
    }


def _get_config() -> dict:
    try:
        if CONFIG_PATH.exists():
            with open(CONFIG_PATH, encoding="utf-8") as f:
                return json.load(f)
        return {"model": "small", "enabled": False, "language": "en", "exam_enhancement": "auto"}
    except json.JSONDecodeError as e:
        logger.error("Whisper config file is corrupted: %s", e)
        return {"model": "small", "enabled": False, "language": "en", "exam_enhancement": "auto"}
    except OSError as e:
        logger.error("Cannot read whisper config: %s", e)
        return {"model": "small", "enabled": False, "language": "en", "exam_enhancement": "auto"}


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
    enhancement_mode = config.get("exam_enhancement", "auto")
    if enhancement_mode not in EXAM_ENHANCEMENT_MODES:
        enhancement_mode = "auto"
    capability = _whisperx_capability()
    return {
        "enabled": config.get("enabled", True),
        "model": current,
        "model_name": WHISPER_MODELS.get(current, {}).get("name", current),
        "is_downloaded": is_model_downloaded(current),
        "language": config.get("language", "en"),
        "exam_enhancement": enhancement_mode,
        "whisperx": {
            **capability,
            "active": enhancement_mode != "off" and capability["available"],
            "fallback": enhancement_mode != "off" and not capability["available"],
        },
    }


def update_whisper_config(
    enabled: bool = None,
    model: str = None,
    language: str = None,
    exam_enhancement: str = None,
) -> dict:
    config = _get_config()
    if enabled is not None:
        config["enabled"] = enabled
    if language is not None:
        config["language"] = language
    if exam_enhancement is not None:
        if exam_enhancement not in EXAM_ENHANCEMENT_MODES:
            raise ValueError(f"Unknown exam enhancement mode: {exam_enhancement}")
        config["exam_enhancement"] = exam_enhancement
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
    path = _MODELS_DIR / model_id
    return (path / "model.bin").exists()


def download_model(model_id: str) -> dict:
    if model_id not in WHISPER_MODELS:
        raise ValueError(f"Unknown model: {model_id}")


    try:
        from faster_whisper import download_model as dm
    except ImportError:
        raise RuntimeError("faster-whisper is not installed. Run: pip install faster-whisper")

    import requests

    path = str(_MODELS_DIR / model_id)
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

        model_path = str(_MODELS_DIR / model_id) if is_model_downloaded(model_id) else model_id
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


def _transcribe_wav(wav_path: str, language: str = None, word_timestamps: bool = False) -> dict:
    config = _get_config()
    transcribe_lang = language or config.get("language", "en")
    model = _get_model()
    segments_iter, info = model.transcribe(
        wav_path,
        language=transcribe_lang,
        beam_size=5,
        word_timestamps=word_timestamps,
    )
    segments = []
    words = []
    for segment in segments_iter:
        item = {
            "start": float(segment.start),
            "end": float(segment.end),
            "text": segment.text.strip(),
        }
        segments.append(item)
        if word_timestamps:
            for word in segment.words or []:
                if word.start is None or word.end is None:
                    continue
                words.append({
                    "start": float(word.start),
                    "end": float(word.end),
                    "word": word.word.strip(),
                    "score": float(word.probability) if word.probability is not None else None,
                })
    text = " ".join(segment["text"] for segment in segments if segment["text"])
    return {
        "text": text,
        "segments": segments,
        "words": words,
        "language": info.language,
    }


def align_with_whisperx(wav_path: str, transcription: dict, language: str = "en") -> dict:
    """Optionally refine word timings; never used by the live exam state machine."""
    capability = _whisperx_capability()
    if not capability["available"]:
        raise RuntimeError(f"WhisperX is unavailable: {capability['reason']}")

    import whisperx
    import numpy as np

    device = "cpu"
    # The file is already 16 kHz mono PCM. Reading it through PyAV avoids
    # WhisperX's ffmpeg executable dependency on Windows desktop builds.
    container = _get_av().open(wav_path)
    samples = []
    try:
        for frame in container.decode(audio=0):
            array = frame.to_ndarray()
            samples.append(array.reshape(-1))
    finally:
        container.close()
    if not samples:
        raise RuntimeError("WhisperX alignment received an empty WAV file.")
    audio = np.concatenate(samples).astype(np.float32) / 32768.0
    align_model, metadata = whisperx.load_align_model(language_code=language, device=device)
    aligned = whisperx.align(
        transcription["segments"],
        align_model,
        metadata,
        audio,
        device,
        return_char_alignments=False,
    )
    words = []
    for segment in aligned.get("segments", []):
        for word in segment.get("words", []):
            if word.get("start") is None or word.get("end") is None:
                continue
            words.append({
                "start": float(word["start"]),
                "end": float(word["end"]),
                "word": str(word.get("word", "")).strip(),
                "score": word.get("score"),
            })
    return {"segments": aligned.get("segments", []), "words": words}


def analyze_for_scoring(audio_bytes: bytes, language: str = None) -> dict:
    """Transcribe one completed-exam response and optionally refine its timings."""
    if not audio_bytes:
        return {"text": "", "segments": [], "words": [], "alignment": "none"}

    config = _get_config()
    model_id = config.get("model", "small")
    if not is_model_downloaded(model_id):
        raise RuntimeError(
            f"Model '{model_id}' is not downloaded. "
            f"Please go to Settings → Whisper ASR → download the model (e.g. 'small')."
        )

    tmp_wav = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    try:
        tmp_wav.close()
        _convert_to_wav(audio_bytes, tmp_wav.name)

        result = _transcribe_wav(tmp_wav.name, language, word_timestamps=True)
        result["alignment"] = "faster_whisper"
        enhancement_mode = config.get("exam_enhancement", "auto")
        if enhancement_mode != "off" and result["segments"]:
            try:
                aligned = align_with_whisperx(tmp_wav.name, result, result["language"])
                result.update(aligned)
                result["alignment"] = "whisperx"
            except Exception as exc:
                logger.warning("WhisperX alignment skipped; using faster-whisper timings: %s", exc)
        logger.info("Post-exam transcription produced %d chars", len(result["text"]))
        return result
    except Exception as e:
        logger.error("Transcription failed: %s", e)
        raise RuntimeError(str(e))
    finally:
        try:
            os.unlink(tmp_wav.name)
        except OSError:
            pass


def transcribe(audio_bytes: bytes, language: str = None) -> str:
    """Standard local transcription used by the optional free-chat ASR path."""
    if not audio_bytes:
        return ""
    config = _get_config()
    model_id = config.get("model", "small")
    if not is_model_downloaded(model_id):
        raise RuntimeError(
            f"Model '{model_id}' is not downloaded. "
            "Please go to Settings → Whisper ASR → download a model."
        )
    tmp_wav = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    try:
        tmp_wav.close()
        _convert_to_wav(audio_bytes, tmp_wav.name)
        return _transcribe_wav(tmp_wav.name, language, word_timestamps=False)["text"]
    except Exception as exc:
        logger.error("Transcription failed: %s", exc)
        raise RuntimeError(str(exc))
    finally:
        try:
            os.unlink(tmp_wav.name)
        except OSError:
            pass
