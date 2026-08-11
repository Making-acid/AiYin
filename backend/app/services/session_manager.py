import logging
import time
from contextlib import contextmanager
from threading import RLock
from typing import Optional


logger = logging.getLogger("session_manager")

# Session expiry in seconds (1 hour by default)
SESSION_TTL = 3600

# In-memory session store. Replace with Redis/DB for multi-process deployments.
_sessions: dict = {}
_timestamps: dict[str, float] = {}
_store_lock = RLock()
_session_locks: dict[str, RLock] = {}


def _is_expired(session_id: str) -> bool:
    created = _timestamps.get(session_id, 0)
    return (time.time() - created) > SESSION_TTL


def create(session_id: str, session_data: dict):
    with _store_lock:
        session_data["session_id"] = session_id
        _sessions[session_id] = session_data
        _timestamps[session_id] = time.time()
        _session_locks.setdefault(session_id, RLock())
    logger.info("Session created: %s", session_id)


def get(session_id: str) -> Optional[dict]:
    with _store_lock:
        session = _sessions.get(session_id)
        if session is None:
            return None
        if _is_expired(session_id):
            delete(session_id)
            logger.info("Session expired: %s", session_id)
            return None
        return session


def update(session_id: str, session_data: dict):
    with _store_lock:
        if session_id not in _sessions:
            raise KeyError(f"Session not found: {session_id}")
        _sessions[session_id] = session_data
        _timestamps[session_id] = time.time()


def delete(session_id: str):
    with _store_lock:
        _sessions.pop(session_id, None)
        _timestamps.pop(session_id, None)
    logger.info("Session deleted: %s", session_id)


def exists(session_id: str) -> bool:
    with _store_lock:
        if session_id not in _sessions:
            return False
        if _is_expired(session_id):
            delete(session_id)
            return False
        return True


@contextmanager
def session_lock(session_id: str):
    """Serialize mutations for one session while allowing other sessions to run."""
    with _store_lock:
        lock = _session_locks.setdefault(session_id, RLock())
    with lock:
        yield


def cleanup_expired() -> int:
    """Remove all expired sessions. Returns count of removed sessions."""
    with _store_lock:
        expired = [sid for sid in list(_sessions.keys()) if _is_expired(sid)]
        for sid in expired:
            delete(sid)
    if expired:
        logger.info("Cleaned up %d expired sessions", len(expired))
    return len(expired)


def clear_all() -> None:
    """Clear in-memory sessions. Intended for tests and controlled shutdowns."""
    with _store_lock:
        _sessions.clear()
        _timestamps.clear()
        _session_locks.clear()
