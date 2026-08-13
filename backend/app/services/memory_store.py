import json
import logging
import os
import tempfile
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from threading import RLock
from typing import Optional

from app.core.user_data import get_writable_dir


logger = logging.getLogger("memory_store")

_MEMORY_DIR = get_writable_dir() / "memory"
_CHAT_PATH = _MEMORY_DIR / "chat_sessions.json"
_EXAM_PATH = _MEMORY_DIR / "exam_memory.json"
_lock = RLock()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _read(path: Path, default: dict) -> dict:
    if not path.exists():
        return deepcopy(default)
    try:
        with path.open(encoding="utf-8") as handle:
            data = json.load(handle)
        return data if isinstance(data, dict) else deepcopy(default)
    except (OSError, json.JSONDecodeError) as exc:
        logger.error("Could not read memory file %s: %s", path, exc)
        return deepcopy(default)


def _write(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary_name = tempfile.mkstemp(
        prefix=f".{path.name}.", suffix=".tmp", dir=path.parent
    )
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(data, handle, ensure_ascii=False, indent=2)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary_name, path)
    except Exception:
        try:
            os.unlink(temporary_name)
        except OSError:
            pass
        raise


def _chat_title(messages: list[dict]) -> str:
    first_user = next(
        (m.get("content", "").strip() for m in messages if m.get("role") == "user"),
        "",
    )
    if not first_user:
        return "New conversation"
    compact = " ".join(first_user.split())
    return compact[:48] + ("…" if len(compact) > 48 else "")


def save_chat_session(session: dict) -> dict:
    if session.get("mode") != "free_chat":
        raise ValueError("Only free-chat sessions can be persisted here.")
    with _lock:
        store = _read(_CHAT_PATH, {"version": 1, "sessions": {}})
        sessions = store.setdefault("sessions", {})
        session_id = session["session_id"]
        existing = sessions.get(session_id, {})
        now = _now()
        record = {
            "session_id": session_id,
            "exam_id": session.get("exam_id", "ielts"),
            "title": _chat_title(session.get("conversation", [])),
            "created_at": existing.get("created_at", now),
            "updated_at": now,
            "messages": deepcopy(session.get("conversation", [])),
        }
        sessions[session_id] = record
        _write(_CHAT_PATH, store)
        return deepcopy(record)


def list_chat_sessions() -> list[dict]:
    with _lock:
        sessions = _read(_CHAT_PATH, {"version": 1, "sessions": {}}).get("sessions", {})
        summaries = [
            {
                "session_id": item["session_id"],
                "exam_id": item.get("exam_id", "ielts"),
                "title": item.get("title", "New conversation"),
                "created_at": item.get("created_at", ""),
                "updated_at": item.get("updated_at", ""),
                "message_count": len(item.get("messages", [])),
                "preview": next(
                    (m.get("content", "") for m in reversed(item.get("messages", [])) if m.get("content")),
                    "",
                )[:100],
            }
            for item in sessions.values()
        ]
        return sorted(summaries, key=lambda item: item["updated_at"], reverse=True)


def get_chat_session(session_id: str) -> Optional[dict]:
    with _lock:
        record = _read(_CHAT_PATH, {"version": 1, "sessions": {}}).get("sessions", {}).get(session_id)
        return deepcopy(record) if record else None


def delete_chat_session(session_id: str) -> bool:
    with _lock:
        store = _read(_CHAT_PATH, {"version": 1, "sessions": {}})
        removed = store.setdefault("sessions", {}).pop(session_id, None)
        if removed is not None:
            _write(_CHAT_PATH, store)
        return removed is not None


def save_exam_memory(
    session_id: str,
    exam_id: str,
    report: dict,
    conversation: list[dict],
    audio_analysis: Optional[dict] = None,
) -> dict:
    with _lock:
        store = _read(_EXAM_PATH, {"version": 1, "attempts": {}})
        attempts = store.setdefault("attempts", {})
        existing = attempts.get(session_id)
        if existing:
            return deepcopy(existing)
        record = {
            "session_id": session_id,
            "exam_id": exam_id,
            "completed_at": _now(),
            "report": deepcopy(report),
            "conversation": deepcopy(conversation),
            "audio_analysis": deepcopy(audio_analysis) if audio_analysis else None,
        }
        attempts[session_id] = record
        _write(_EXAM_PATH, store)
        return deepcopy(record)


def get_exam_memory(session_id: str) -> Optional[dict]:
    with _lock:
        record = _read(_EXAM_PATH, {"version": 1, "attempts": {}}).get("attempts", {}).get(session_id)
        return deepcopy(record) if record else None


def delete_exam_memory(session_id: str) -> bool:
    with _lock:
        store = _read(_EXAM_PATH, {"version": 1, "attempts": {}})
        removed = store.setdefault("attempts", {}).pop(session_id, None)
        if removed is not None:
            _write(_EXAM_PATH, store)
        return removed is not None


def clear_all_memory() -> dict:
    with _lock:
        chat_count = len(_read(_CHAT_PATH, {"version": 1, "sessions": {}}).get("sessions", {}))
        exam_count = len(_read(_EXAM_PATH, {"version": 1, "attempts": {}}).get("attempts", {}))
        _write(_CHAT_PATH, {"version": 1, "sessions": {}})
        _write(_EXAM_PATH, {"version": 1, "attempts": {}})
        return {"chat_sessions": chat_count, "exam_attempts": exam_count}


def get_exam_memory_summary() -> dict:
    with _lock:
        attempts = list(_read(_EXAM_PATH, {"version": 1, "attempts": {}}).get("attempts", {}).values())
    attempts.sort(key=lambda item: item.get("completed_at", ""), reverse=True)
    criteria = [
        "overall_band",
        "fluency_coherence",
        "lexical_resource",
        "grammatical_range_accuracy",
        "pronunciation",
    ]
    averages = {}
    for criterion in criteria:
        values = [
            float(item.get("report", {}).get(criterion))
            for item in attempts
            if isinstance(item.get("report", {}).get(criterion), (int, float))
        ]
        averages[criterion] = round(sum(values) / len(values), 2) if values else None
    scored = [(key, value) for key, value in averages.items() if key != "overall_band" and value is not None]
    weakest = min(scored, key=lambda pair: pair[1])[0] if scored else None
    return {
        "attempt_count": len(attempts),
        "averages": averages,
        "weakest_criterion": weakest,
        "attempts": [
            {
                "session_id": item["session_id"],
                "exam_id": item.get("exam_id", "ielts"),
                "completed_at": item.get("completed_at", ""),
                "report": item.get("report", {}),
            }
            for item in attempts
        ],
    }
