import logging
from fastapi import APIRouter, HTTPException, Query
from app.models.schemas import ExamStartRequest, ExamAnswerRequest
from app.services.exam_service import create_session, get_examiner_intro, get_next_question, ExamError
from app.services.scoring_service import generate_score_report, ScoringError
from app.services.data_loader import get_registry, DataError


logger = logging.getLogger("api.exam")
router = APIRouter(prefix="/exam", tags=["exam"])


@router.get("/exams")
def list_exams(language: str = Query(None, description="Filter exams by training language")):
    try:
        registry = get_registry()
        exams = registry.get("exams", [])
        if language:
            exams = [e for e in exams if e.get("language", "") == language]
        return {"exams": exams}
    except DataError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error("Failed to list exams: %s", e)
        raise HTTPException(status_code=500, detail="Failed to load exam list. Please try again.")


@router.post("/start")
def start_exam(request: ExamStartRequest):
    try:
        # Validate exam_id exists before creating session
        registry = get_registry()
        valid_ids = [e["id"] for e in registry.get("exams", [])]
        if request.exam_id not in valid_ids:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown exam '{request.exam_id}'. Available exams: {', '.join(valid_ids)}",
            )

        session_id = create_session(request.exam_id, "exam")
        intro = get_examiner_intro(session_id)
        return {
            "session_id": session_id,
            "examiner_message": intro,
            "current_part": "part1",
            "question_index": 0,
            "exam_id": request.exam_id,
        }
    except HTTPException:
        raise
    except ExamError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except DataError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error("Failed to start exam: %s", e)
        raise HTTPException(status_code=500, detail="Failed to start the exam. Please try again.")


@router.post("/answer")
def submit_answer(request: ExamAnswerRequest):
    try:
        result = get_next_question(request.session_id, request.answer)
        return result
    except ExamError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except DataError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error("Failed to process answer: %s", e)
        raise HTTPException(status_code=500, detail="Failed to process your answer. Please try again.")


@router.get("/report/{session_id}")
def get_report(session_id: str):
    try:
        report = generate_score_report(session_id)
        return report
    except ScoringError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ExamError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except DataError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error("Failed to generate report: %s", e)
        raise HTTPException(status_code=500, detail="Failed to generate the score report. Please try again.")
