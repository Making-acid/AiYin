from fastapi import APIRouter, HTTPException, UploadFile
from app.models.schemas import DownloadModelRequest
from app.services import whisper_service

router = APIRouter(prefix="/whisper", tags=["whisper"])


@router.get("/config")
def get_config():
    return whisper_service.get_whisper_config()


@router.post("/config")
def update_config(enabled: bool = None, model: str = None):
    try:
        return whisper_service.update_whisper_config(enabled=enabled, model=model)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/models")
def list_models():
    return whisper_service.list_models()


@router.post("/models/download")
def download_model(request: DownloadModelRequest):
    try:
        return whisper_service.download_model(request.model_id)
    except (ValueError, RuntimeError) as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/transcribe")
async def transcribe_audio(file: UploadFile):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No audio file provided")

    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file")

    text = whisper_service.transcribe(audio_bytes)
    return {"text": text}
