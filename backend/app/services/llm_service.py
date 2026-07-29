import logging
from typing import Optional
from app.core.config import settings
from app.services.providers.openai_compatible import OpenAICompatibleProvider, LLMProviderError

# Re-export for backward compatibility
logger = logging.getLogger("llm")
LLMError = LLMProviderError

_provider: Optional[OpenAICompatibleProvider] = None


def _get_provider() -> OpenAICompatibleProvider:
    global _provider
    if _provider is None:
        _provider = OpenAICompatibleProvider(
            api_key=settings.LLM_API_KEY,
            base_url=settings.LLM_BASE_URL,
            model=settings.LLM_MODEL,
        )
    return _provider


def reset_client():
    global _provider
    if _provider is not None:
        _provider.reset()
    _provider = None


def chat(messages: list[dict], stream: bool = False):
    return _get_provider().chat(messages, stream=stream)


def chat_simple(user_message: str, system_prompt: str = "") -> str:
    return _get_provider().chat_simple(user_message, system_prompt)
