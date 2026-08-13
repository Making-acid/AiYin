import logging
from fastapi import APIRouter, HTTPException
from app.models.schemas import ConfigUpdateRequest
from app.services import config_service
from app.services import memory_store, session_manager


logger = logging.getLogger("api.config")
router = APIRouter(prefix="/config", tags=["config"])


@router.delete("/local-memory")
def clear_local_memory():
    try:
        result = memory_store.clear_all_memory()
        session_manager.clear_all()
        return {"deleted": result}
    except OSError as e:
        logger.error("Failed to clear local memory: %s", e)
        raise HTTPException(status_code=500, detail="Failed to clear local memory.")


@router.get("/providers")
def get_providers():
    try:
        return config_service.get_provider_presets()
    except Exception as e:
        logger.error("Failed to list providers: %s", e)
        raise HTTPException(status_code=500, detail="Failed to load provider list. Please try again.")


@router.get("")
def get_config():
    try:
        return config_service.get_config()
    except config_service.ConfigError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error("Failed to load config: %s", e)
        raise HTTPException(status_code=500, detail="Failed to load configuration. Please try again.")


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
    except config_service.ConfigError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error("Failed to save config: %s", e)
        raise HTTPException(status_code=500, detail="Failed to save configuration. Please try again.")
