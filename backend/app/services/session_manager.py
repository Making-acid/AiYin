import logging
from typing import Optional


logger = logging.getLogger("session_manager")

# In-memory session store. Replace with Redis/DB for multi-process deployments.
_sessions: dict = {}


def create( session_id: str, session_data: dict):
    session_data["session_id"] = session_id
    _sessions[session_id] = session_data
    logger.info("Session created: %s", session_id)


def get(session_id: str) -> Optional[dict]:
    return _sessions.get(session_id)


def update(session_id: str, session_data: dict):
    if session_id not in _sessions:
        raise KeyError(f"Session not found: {session_id}")
    _sessions[session_id] = session_data


def delete(session_id: str):
    _sessions.pop(session_id, None)
    logger.info("Session deleted: %s", session_id)


def exists(session_id: str) -> bool:
    return session_id in _sessions
