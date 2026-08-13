import json
import logging
from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile
from starlette.concurrency import run_in_threadpool
from app.models.schemas import ExamStartRequest, ExamAnswerRequest, ExamAdvanceRequest
from app.services.exam_service import (
    create_session,
    get_examiner_intro,
    get_next_question,
    advance_session,
    ExamError,
)
from app.services.scoring_service import (
    generate_score_report,
    ScoringError,
    ScoringProviderError,
    ScoringSessionNotFoundError,
    ReportNotReadyError,
)
from app.services.data_loader import get_registry, DataError, InvalidExamError, validate_exam_id
from app.services import memory_store
from app.services.exam_audio_service import analyze_completed_exam, ExamAudioError


logger = logging.getLogger("api.exam")
router = APIRouter(prefix="/exam", tags=["exam"])
MAX_EXAM_AUDIO_BYTES = 100 * 1024 * 1024
MAX_EXAM_RECORDINGS = 20


@router.get("/memory")
def get_memory_summary():
    return memory_store.get_exam_memory_summary()


@router.get("/memory/{session_id}")
def get_memory_attempt(session_id: str):
    memory = memory_store.get_exam_memory(session_id)
    if not memory:
        raise HTTPException(status_code=404, detail="Saved exam memory not found.")
    return memory


@router.delete("/memory/{session_id}")
def delete_memory_attempt(session_id: str):
    if not memory_store.delete_exam_memory(session_id):
        raise HTTPException(status_code=404, detail="Saved exam memory not found.")
    return {"session_id": session_id, "deleted": True}


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
        validate_exam_id(request.exam_id)
        session_id = create_session(request.exam_id, "exam")
        intro = get_examiner_intro(session_id)
        return {
            "session_id": session_id,
            "examiner_message": intro,
            "current_part": "identity",
            "question_index": 0,
            "exam_id": request.exam_id,
        }
    except HTTPException:
        raise
    except InvalidExamError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except DataError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except ExamError as e:
        raise HTTPException(status_code=400, detail=str(e))
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


@router.post("/advance")
def advance_exam(request: ExamAdvanceRequest):
    try:
        return advance_session(request.session_id)
    except ExamError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except DataError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error("Failed to advance exam: %s", e)
        raise HTTPException(status_code=500, detail="Failed to advance the exam. Please try again.")


@router.post("/analysis/{session_id}")
async def analyze_exam_audio(
    session_id: str,
    files: list[UploadFile] = File(...),
    stages: str = Form(...),
    answer_indices: str = Form(...),
    language: str = Form("en"),
):
    """Run scoring-only audio analysis after the live test has finished."""
    if not files or len(files) > MAX_EXAM_RECORDINGS:
        raise HTTPException(status_code=400, detail="Invalid number of exam recordings.")
    try:
        parsed_stages = json.loads(stages)
        parsed_indices = json.loads(answer_indices)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid recording stage metadata.")
    if (
        not isinstance(parsed_stages, list)
        or not isinstance(parsed_indices, list)
        or len(parsed_stages) != len(files)
        or len(parsed_indices) != len(files)
    ):
        raise HTTPException(status_code=400, detail="Recording stages do not match uploaded files.")

    recordings = []
    total_bytes = 0
    for upload, stage, answer_index in zip(files, parsed_stages, parsed_indices):
        remaining = MAX_EXAM_AUDIO_BYTES - total_bytes
        audio = await upload.read(remaining + 1)
        total_bytes += len(audio)
        if total_bytes > MAX_EXAM_AUDIO_BYTES:
            raise HTTPException(status_code=413, detail="Exam recordings exceed the 100 MB limit.")
        if audio:
            recordings.append({"stage": str(stage), "answer_index": int(answer_index), "audio": audio})
    try:
        result = await run_in_threadpool(analyze_completed_exam, session_id, recordings, language)
        return {
            "status": result["status"],
            "engine": result["engine"],
            "metrics": result["metrics"],
        }
    except ExamAudioError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/report/{session_id}")
def get_report(session_id: str):
    try:
        report = generate_score_report(session_id)
        return report
    except ScoringSessionNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ReportNotReadyError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except ScoringProviderError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except ScoringError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except ExamError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except DataError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error("Failed to generate report: %s", e)
        raise HTTPException(status_code=500, detail="Failed to generate the score report. Please try again.")
