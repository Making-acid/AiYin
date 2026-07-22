from openai import OpenAI
from app.core.config import settings

_client = None


def get_client():
    global _client
    if _client is None:
        _client = OpenAI(
            api_key=settings.DEEPSEEK_API_KEY,
            base_url=settings.DEEPSEEK_BASE_URL,
        )
    return _client


def reset_client():
    global _client
    _client = None


def chat(messages: list[dict], stream: bool = False):
    response = get_client().chat.completions.create(
        model=settings.DEEPSEEK_MODEL,
        messages=messages,
        stream=stream,
    )
    if stream:
        return response
    return response.choices[0].message.content


def chat_simple(user_message: str, system_prompt: str = "") -> str:
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": user_message})
    return chat(messages)
