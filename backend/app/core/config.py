import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    CORS_ORIGINS: list = ["http://localhost:5173", "http://127.0.0.1:5173"]

    @property
    def LLM_API_KEY(self) -> str:
        from app.services.config_service import get_effective_api_key
        return get_effective_api_key()

    @property
    def LLM_BASE_URL(self) -> str:
        from app.services.config_service import get_effective_base_url
        return get_effective_base_url()

    @property
    def LLM_MODEL(self) -> str:
        from app.services.config_service import get_effective_model
        return get_effective_model()


settings = Settings()
