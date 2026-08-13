from __future__ import annotations

import sys
from pathlib import Path


def get_resource_dir(name: str) -> Path:
    """Return a bundled read-only resource directory in source and frozen builds."""
    if getattr(sys, "frozen", False):
        return Path(sys._MEIPASS) / name
    return Path(__file__).parent.parent.parent / name
