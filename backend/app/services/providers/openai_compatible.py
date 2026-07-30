import logging
from typing import Optional
from openai import OpenAI, APIError, APIConnectionError, RateLimitError, AuthenticationError
from . import BaseLLMProvider


logger = logging.getLogger("llm")


class LLMProviderError(Exception):
    """User-facing error for LLM service failures."""

    def __init__(self, message: str, recoverable: bool = True):
        super().__init__(message)
        self.recoverable = recoverable


class OpenAICompatibleProvider(BaseLLMProvider):
    """LLM provider for any OpenAI-compatible API (DeepSeek, Groq, OpenRouter, Ollama, etc.)."""

    def __init__(self, api_key: str, base_url: str, model: str):
        self._api_key = api_key
        self._base_url = base_url
        self._model = model
        self._client: Optional[OpenAI] = None

    def _get_client(self) -> OpenAI:
        if self._client is None:
            try:
                self._client = OpenAI(
                    api_key=self._api_key,
                    base_url=self._base_url,
                )
            except Exception as e:
                logger.error("Failed to initialize LLM client: %s", e)
                raise LLMProviderError(
                    "Failed to connect to the AI service. Please check your API configuration in Settings.",
                    recoverable=True,
                )
        return self._client

    def reset(self):
        self._client = None

    def chat(self, messages: list[dict], stream: bool = False) -> str:
        try:
            response = self._get_client().chat.completions.create(
                model=self._model,
                messages=messages,
                stream=stream,
            )
            if stream:
                return response  # Return stream object for advanced usage
            if not response.choices:
                logger.error("LLM returned empty choices")
                raise LLMProviderError(
                    "AI service returned an empty response. Please try again.",
                    recoverable=True,
                )
            return response.choices[0].message.content
        except AuthenticationError:
            logger.error("LLM authentication failed")
            raise LLMProviderError(
                "API Key is invalid or expired. Please check your API Key in Settings and try again.",
                recoverable=True,
            )
        except RateLimitError:
            logger.error("LLM rate limit exceeded")
            raise LLMProviderError(
                "The AI service is temporarily busy (rate limit). Please wait a moment and try again.",
                recoverable=True,
            )
        except APIConnectionError:
            logger.error("LLM connection failed")
            raise LLMProviderError(
                "Cannot connect to the AI service. Please check your network connection and Base URL in Settings.",
                recoverable=True,
            )
        except APIError as e:
            logger.error("LLM API error: %s", e)
            raise LLMProviderError(
                f"AI service returned an error. Please try again later.",
                recoverable=True,
            )
        except LLMProviderError:
            raise
        except Exception as e:
            logger.error("Unexpected LLM error: %s", e)
            raise LLMProviderError(
                "An unexpected error occurred while contacting the AI service. Please try again.",
                recoverable=True,
            )

    def chat_simple(self, user_message: str, system_prompt: str = "") -> str:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": user_message})
        return self.chat(messages)
