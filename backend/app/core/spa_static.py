from __future__ import annotations

from starlette.exceptions import HTTPException
from starlette.responses import Response
from starlette.staticfiles import StaticFiles


class SPAStaticFiles(StaticFiles):
    """Serve index.html for client routes while preserving API-style 404s."""

    _API_PREFIXES = ("exam", "chat", "config", "whisper", "tts", "health")

    @classmethod
    def _is_client_route(cls, path: str) -> bool:
        # StaticFiles normalizes URL paths to OS separators before this hook.
        # Convert back so the API-prefix rule behaves identically on Windows.
        normalized = path.replace("\\", "/").strip("/")
        first_segment = normalized.split("/", 1)[0]
        return "." not in normalized.rsplit("/", 1)[-1] and first_segment not in cls._API_PREFIXES

    async def get_response(self, path: str, scope) -> Response:
        try:
            response = await super().get_response(path, scope)
        except HTTPException as exc:
            if exc.status_code != 404 or not self._is_client_route(path):
                raise
            return await super().get_response("index.html", scope)

        if response.status_code == 404 and self._is_client_route(path):
            return await super().get_response("index.html", scope)
        return response
