from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.scoring_service import create_session, get_examiner_intro, get_next_question


class ChatStartRequest(BaseModel):
    exam_id: str = "ielts"
    mode: str = "free_chat"


class ChatSendRequest(BaseModel):
    session_id: str
    text: str


router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/start")
def start_chat(request: ChatStartRequest):
    session_id = create_session(request.exam_id, request.mode)
    intro = get_examiner_intro(session_id)
    return {"session_id": session_id, "reply": intro, "mode": request.mode, "exam_id": request.exam_id}


@router.post("/send")
def send_message(request: ChatSendRequest):
    result = get_next_question(request.session_id, request.text)
    return {
        "reply": result["next_question"],
        "is_finished": result["is_finished"],
        "current_part": result["current_part"],
        "question_index": result["question_index"],
    }
