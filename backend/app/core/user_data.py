import os
import sys
import shutil
import logging
import tempfile
from pathlib import Path

logger = logging.getLogger("user_data")

_APP_NAME = "IELTS Speaking"


def _get_install_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).parent
    return Path(__file__).parent.parent.parent


def get_writable_dir() -> Path:
    if getattr(sys, "frozen", False):
        base = Path(os.environ.get("LOCALAPPDATA", tempfile.gettempdir())) / _APP_NAME
    else:
        base = Path(__file__).parent.parent.parent
    base.mkdir(parents=True, exist_ok=True)
    return base


def migrate_if_needed(filename: str) -> bool:
    install_dir = _get_install_dir()
    writable_dir = get_writable_dir()
    src = install_dir / filename
    dst = writable_dir / filename
    if src.exists() and not dst.exists():
        try:
            shutil.copy2(src, dst)
            logger.info("Migrated %s from install dir to user dir", filename)
            return True
        except OSError as e:
            logger.warning("Could not migrate %s: %s", filename, e)
    return False
