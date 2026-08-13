from pydantic import BaseModel
from typing import Optional


# ---- Config ----

class ConfigUpdateRequest(BaseModel):
    provider: str = ""
    api_key: str = ""
    base_url: str = ""
    model: str = ""


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


# ---- Response types (documentation) ----

class ScoreReport(BaseModel):
    overall_band: float
    fluency_coherence: float
    lexical_resource: float
    grammatical_range_accuracy: float
    pronunciation: float
    summary: str
    suggestions: list[str]
