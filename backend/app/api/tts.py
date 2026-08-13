import logging

from fastapi import APIRouter, HTTPException

from app.models.schemas import TtsConfigRequest
from app.services import tts_service


logger = logging.getLogger("api.tts")
router = APIRouter(prefix="/tts", tags=["tts"])


@router.get("/config")
def get_tts_config():
    try:
        return tts_service.get_config()
    except tts_service.TtsConfigError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/config")
def save_tts_config(request: TtsConfigRequest):
    try:
        return tts_service.update_config(
            provider=request.provider,
            azure_key=request.azure_key,
            azure_region=request.azure_region,
            haru_voice=request.haru_voice,
            mao_voice=request.mao_voice,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except tts_service.TtsConfigError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/azure-token")
def get_azure_token():
    try:
        return tts_service.issue_azure_token()
    except tts_service.TtsConfigError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
