import sys
import os
import asyncio
import webbrowser
import threading
import logging
import tempfile
from contextlib import asynccontextmanager, suppress
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import chat, exam, config, tts
from app.core.config import settings
from app.core.paths import get_resource_dir
from app.core.spa_static import SPAStaticFiles

logger = logging.getLogger("main")


async def _periodic_session_cleanup():
    from app.services.session_manager import cleanup_expired

    while True:
        await asyncio.sleep(1800)
        cleanup_expired()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    cleanup_task = asyncio.create_task(_periodic_session_cleanup())
    try:
        yield
    finally:
        cleanup_task.cancel()
        with suppress(asyncio.CancelledError):
            await cleanup_task

# When running as packaged exe (--windowed), redirect logs to a user-writable location
if getattr(sys, "frozen", False):
    log_dir = Path(os.environ.get("LOCALAPPDATA", tempfile.gettempdir())) / "IELTS Speaking"
    log_dir.mkdir(parents=True, exist_ok=True)
    log_path = log_dir / "ielts.log"
    try:
        logging.basicConfig(
            filename=str(log_path),
            level=logging.INFO,
            format="%(asctime)s [%(name)s] %(levelname)s: %(message)s"
        )
        logger.info("Running frozen — logging to %s", log_path)
    except PermissionError:
        pass  # fall back to console-only logging

app = FastAPI(title="IELTS Speaking Practice", version="0.6.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router)
app.include_router(exam.router)
app.include_router(config.router)
app.include_router(tts.router)

# Whisper is an optional module — skip if not installed
try:
    from app.api import whisper
    app.include_router(whisper.router)
    logger.info("Whisper ASR module loaded.")
except Exception as e:
    logger.warning("Whisper ASR module skipped: %s", e)


@app.get("/health")
def health_check():
    return {"status": "ok"}


STATIC_DIR = get_resource_dir("static")

if STATIC_DIR.exists() and (STATIC_DIR / "index.html").exists():
    app.mount("/", SPAStaticFiles(directory=str(STATIC_DIR), html=True), name="static")


def open_browser():
    webbrowser.open("http://localhost:8000")


def main():
    import uvicorn

    if getattr(sys, "frozen", False):
        if os.environ.get("IELTS_NO_BROWSER") != "1":
            threading.Timer(1.5, open_browser).start()
        # --windowed mode has no console handles; uvicorn needs them alive
        if sys.stderr is None:
            sys.stderr = open(os.devnull, "w")
        if sys.stdout is None:
            sys.stdout = open(os.devnull, "w")

    uvicorn.run(
        app, host="127.0.0.1", port=8000,
        log_level="info",
        # Disable coloured logging in frozen mode (stderr may not support it)
        use_colors=False,
    )


if __name__ == "__main__":
    main()
