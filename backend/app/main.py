import sys
import webbrowser
import threading
import logging
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api import chat, exam, config

logger = logging.getLogger("main")

app = FastAPI(title="IELTS Speaking Practice", version="0.3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router)
app.include_router(exam.router)
app.include_router(config.router)

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


if getattr(sys, "frozen", False):
    STATIC_DIR = Path(sys._MEIPASS) / "static"
else:
    STATIC_DIR = Path(__file__).parent.parent / "static"

if STATIC_DIR.exists() and (STATIC_DIR / "index.html").exists():
    app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="static")


def open_browser():
    webbrowser.open("http://localhost:8000")


def main():
    import uvicorn

    if getattr(sys, "frozen", False):
        threading.Timer(1.5, open_browser).start()

    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")


if __name__ == "__main__":
    main()
