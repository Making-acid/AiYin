from __future__ import annotations

import os
from contextlib import suppress
from pathlib import Path


def configured_port() -> int:
    """Return the requested loopback port; zero asks the OS to assign one."""
    raw_port = os.environ.get("IELTS_PORT", "8000")
    try:
        port = int(raw_port)
    except ValueError as exc:
        raise RuntimeError("IELTS_PORT must be an integer between 0 and 65535") from exc
    if not 0 <= port <= 65535:
        raise RuntimeError("IELTS_PORT must be an integer between 0 and 65535")
    return port


def write_port_file(port: int) -> Path | None:
    """Atomically publish the actual port for a native desktop host."""
    raw_path = os.environ.get("IELTS_PORT_FILE")
    if not raw_path:
        return None
    path = Path(raw_path)
    temporary = path.with_suffix(path.suffix + ".tmp")
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        temporary.write_text(str(port), encoding="ascii")
        temporary.replace(path)
    except OSError as exc:
        with suppress(OSError):
            temporary.unlink()
        raise RuntimeError(f"Unable to publish the backend port file: {path}") from exc
    return path
