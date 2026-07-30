import logging
import time
from typing import Optional


logger = logging.getLogger("session_manager")

# Session expiry in seconds (1 hour by default)
SESSION_TTL = 3600

# In-memory session store. Replace with Redis/DB for multi-process deployments.
_sessions: dict = {}
_timestamps: dict[str, float] = {}


def _is_expired(session_id: str) -> bool:
    created = _timestamps.get(session_id, 0)
    return (time.time() - created) > SESSION_TTL


def create(session_id: str, session_data: dict):
    session_data["session_id"] = session_id
    _sessions[session_id] = session_data
    _timestamps[session_id] = time.time()
    logger.info("Session created: %s", session_id)


def get(session_id: str) -> Optional[dict]:
    session = _sessions.get(session_id)
    if session is None:
        return None
    if _is_expired(session_id):
        delete(session_id)
        logger.info("Session expired: %s", session_id)
        return None
    return session


def update(session_id: str, session_data: dict):
    if session_id not in _sessions:
        raise KeyError(f"Session not found: {session_id}")
    _sessions[session_id] = session_data
    _timestamps[session_id] = time.time()


def delete(session_id: str):
    _sessions.pop(session_id, None)
    _timestamps.pop(session_id, None)
    logger.info("Session deleted: %s", session_id)


def exists(session_id: str) -> bool:
    if session_id not in _sessions:
        return False
    if _is_expired(session_id):
        delete(session_id)
        return False
    return True


def cleanup_expired() -> int:
    """Remove all expired sessions. Returns count of removed sessions."""
    expired = [sid for sid in list(_sessions.keys()) if _is_expired(sid)]
    for sid in expired:
        delete(sid)
    if expired:
        logger.info("Cleaned up %d expired sessions", len(expired))
    return len(expired)
