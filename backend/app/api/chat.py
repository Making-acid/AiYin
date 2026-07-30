import logging
from fastapi import APIRouter, HTTPException
from app.models.schemas import ChatStartRequest, ChatSendRequest, ChatEndRequest
from app.services.exam_service import create_session, get_examiner_intro, get_next_question, end_chat_session, ExamError
from app.services.data_loader import DataError, validate_exam_id


logger = logging.getLogger("api.chat")
router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/start")
def start_chat(request: ChatStartRequest):
    try:
        validate_exam_id(request.exam_id)
        session_id = create_session(request.exam_id, request.mode)
        intro = get_examiner_intro(session_id)
        return {
            "session_id": session_id,
            "reply": intro,
            "mode": request.mode,
            "exam_id": request.exam_id,
        }
    except ExamError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except DataError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error("Failed to start chat: %s", e)
        raise HTTPException(status_code=500, detail="Failed to start the chat session. Please try again.")


@router.post("/send")
def send_message(request: ChatSendRequest):
    try:
        result = get_next_question(request.session_id, request.text)
        return {
            "reply": result["next_question"],
            "is_finished": result["is_finished"],
            "current_part": result["current_part"],
            "question_index": result["question_index"],
        }
    except ExamError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except DataError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error("Failed to send chat message: %s", e)
        raise HTTPException(status_code=500, detail="Failed to send message. Please try again.")


@router.post("/end")
def end_chat(request: ChatEndRequest):
    try:
        return end_chat_session(request.session_id)
    except ExamError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except DataError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error("Failed to end chat: %s", e)
        raise HTTPException(status_code=500, detail="Failed to end chat session. Please try again.")
