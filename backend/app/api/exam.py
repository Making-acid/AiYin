from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.scoring_service import create_session, get_examiner_intro, get_next_question, generate_score_report
from app.services.data_loader import get_registry


class ExamStartRequest(BaseModel):
    exam_id: str = "ielts"


class ExamAnswerRequest(BaseModel):
    session_id: str
    answer: str


router = APIRouter(prefix="/exam", tags=["exam"])


@router.get("/exams")
def list_exams():
    return get_registry()


@router.post("/start")
def start_exam(request: ExamStartRequest):
    session_id = create_session(request.exam_id, "exam")
    intro = get_examiner_intro(session_id)
    return {
        "session_id": session_id,
        "examiner_message": intro,
        "current_part": "part1",
        "question_index": 0,
        "exam_id": request.exam_id,
    }


@router.post("/answer")
def submit_answer(request: ExamAnswerRequest):
    result = get_next_question(request.session_id, request.answer)
    return result


@router.get("/report/{session_id}")
def get_report(session_id: str):
    report = generate_score_report(session_id)
    if report is None:
        raise HTTPException(status_code=400, detail="Exam not finished or session not found")
    return report
