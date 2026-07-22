from pydantic import BaseModel
from typing import Optional


class ChatRequest(BaseModel):
    message: str
    mode: str = "free_chat"
    history: list[dict] = []


class ChatResponse(BaseModel):
    reply: str
    audio_url: Optional[str] = None


class ExamStartRequest(BaseModel):
    part: str = "part1"


class ExamStartResponse(BaseModel):
    session_id: str
    examiner_message: str
    current_part: str
    question_index: int


class ExamAnswerRequest(BaseModel):
    session_id: str
    answer: str


class ExamAnswerResponse(BaseModel):
    next_question: str = ""
    is_finished: bool = False
    current_part: str = ""
    question_index: int = 0


class ScoreReport(BaseModel):
    overall_band: float
    fluency_coherence: float
    lexical_resource: float
    grammatical_range_accuracy: float
    pronunciation: float
    summary: str
    suggestions: list[str]


class ExamReportResponse(BaseModel):
    session_id: str
    report: ScoreReport
    conversation: list[dict]
