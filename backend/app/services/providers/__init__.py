from abc import ABC, abstractmethod
from typing import Iterator


class BaseLLMProvider(ABC):
    """Abstract base class for LLM providers.

    All LLM access in the application goes through this interface.
    To add a new provider (e.g., Anthropic, Claude), subclass and implement
    the abstract methods, then register it in the provider factory.
    """

    @abstractmethod
    def chat(self, messages: list[dict], stream: bool = False) -> str:
        """Send a conversation and get a response.

        Args:
            messages: List of {"role": str, "content": str} dicts.
            stream: If True, return an iterator of deltas (not yet implemented).

        Returns:
            The assistant's response text.
        """
        ...

    @abstractmethod
    def chat_simple(self, user_message: str, system_prompt: str = "") -> str:
        """Convenience method for single-turn conversations."""
        ...
