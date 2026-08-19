from pydantic import BaseModel, Field
from typing import Optional


# ---- Config ----

class ConfigUpdateRequest(BaseModel):
    provider: str = ""
    api_key: str = ""
    base_url: str = ""
    model: str = ""


class PreferencesUpdateRequest(BaseModel):
    ui_language: Optional[str] = None
    live2d_behavior: Optional[str] = None
    tutorial_seen_version: Optional[str] = None


# ---- Exam ----

class ExamStartRequest(BaseModel):
    exam_id: str = "ielts"


class ExamAnswerRequest(BaseModel):
    session_id: str
    answer: str


class ExamAdvanceRequest(BaseModel):
    session_id: str


# ---- Chat ----

class ChatStartRequest(BaseModel):
    exam_id: str = "ielts"
    mode: str = "free_chat"


class ChatSendRequest(BaseModel):
    session_id: str
    text: str


class ChatEndRequest(BaseModel):
    session_id: str


# ---- Whisper ----

class DownloadModelRequest(BaseModel):
    model_config = {"protected_namespaces": ()}
    model_id: str


class WhisperConfigRequest(BaseModel):
    mode: str = "exam"
    enabled: Optional[bool] = None
    model: Optional[str] = None
    language: Optional[str] = None
    exam_enhancement: Optional[str] = None


# ---- Text to speech ----

class TtsConfigRequest(BaseModel):
    provider: Optional[str] = None
    azure_key: Optional[str] = None
    azure_region: Optional[str] = None
    haru_voice: Optional[str] = None
    mao_voice: Optional[str] = None
    volume: Optional[int] = Field(default=None, ge=0, le=100)


class LocalTtsSynthesisRequest(BaseModel):
    text: str
    character: str


# ---- Response types (documentation) ----

class ScoreReport(BaseModel):
    overall_band: float
    fluency_coherence: float
    lexical_resource: float
    grammatical_range_accuracy: float
    pronunciation: float
    summary: str
    suggestions: list[str]
