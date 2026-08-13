import logging
from fastapi import APIRouter, HTTPException, UploadFile, Form
from starlette.concurrency import run_in_threadpool
from app.models.schemas import DownloadModelRequest, WhisperConfigRequest
from app.services import whisper_service


logger = logging.getLogger("api.whisper")
router = APIRouter(prefix="/whisper", tags=["whisper"])
MAX_AUDIO_BYTES = 25 * 1024 * 1024


@router.get("/config")
def get_config():
    try:
        return whisper_service.get_whisper_config()
    except Exception as e:
        logger.error("Failed to get whisper config: %s", e)
        raise HTTPException(status_code=500, detail="Failed to load Whisper configuration.")


@router.post("/config")
def update_config(request: WhisperConfigRequest):
    try:
        return whisper_service.update_whisper_config(
            enabled=request.enabled,
            model=request.model,
            language=request.language,
            exam_enhancement=request.exam_enhancement,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Failed to update whisper config: %s", e)
        raise HTTPException(status_code=500, detail="Failed to save Whisper configuration.")


@router.get("/models")
def list_models():
    try:
        return whisper_service.list_models()
    except Exception as e:
        logger.error("Failed to list whisper models: %s", e)
        raise HTTPException(status_code=500, detail="Failed to load Whisper model list.")


@router.post("/models/download")
def download_model(request: DownloadModelRequest):
    try:
        return whisper_service.download_model(request.model_id)
    except (ValueError, RuntimeError) as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/transcribe")
async def transcribe_audio(file: UploadFile, language: str = Form(None)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No audio file provided")

    audio_bytes = await file.read(MAX_AUDIO_BYTES + 1)
    if len(audio_bytes) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="Audio file is too large (maximum 25 MB)")
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file")

    try:
        text = await run_in_threadpool(whisper_service.transcribe, audio_bytes, language)
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"text": text}
