from fastapi import APIRouter, HTTPException
from app.models.schemas import ConfigUpdateRequest
from app.services import config_service

router = APIRouter(prefix="/config", tags=["config"])


@router.get("/providers")
def get_providers():
    return config_service.get_provider_presets()


@router.get("")
def get_config():
    return config_service.get_config()


@router.post("")
def save_config(request: ConfigUpdateRequest):
    try:
        return config_service.update_config(
            provider=request.provider,
            api_key=request.api_key,
            base_url=request.base_url,
            model=request.model,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
