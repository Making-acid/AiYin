import json
import re
import logging
from copy import deepcopy
from typing import Optional
from app.services.llm_service import chat_simple, LLMError
from app.services.data_loader import ExamDataLoader, DataError
from app.services import session_manager
from app.services import memory_store


logger = logging.getLogger("scoring")


class ScoringError(Exception):
    """User-facing error for scoring service failures."""


class ScoringSessionNotFoundError(ScoringError):
    """The requested scoring session does not exist or has expired."""


class ReportNotReadyError(ScoringError):
    """The session exists but the exam is not complete."""


class ScoringProviderError(ScoringError):
    """The upstream AI provider could not produce a report."""


def _get_loader(exam_id: str) -> ExamDataLoader:
    try:
        return ExamDataLoader(exam_id)
    except DataError:
        raise
    except Exception as e:
        logger.error("Failed to create scoring data loader for '%s': %s", exam_id, e)
        raise ScoringError("Failed to load exam data for scoring. Please try again.")


def generate_score_report(session_id: str) -> Optional[dict]:
    saved = memory_store.get_exam_memory(session_id)
    if saved:
        return {
            "session_id": saved["session_id"],
            "report": saved["report"],
            "conversation": saved["conversation"],
            "audio_analysis": saved.get("audio_analysis") or {
                "status": "not_provided",
                "engine": None,
                "metrics": None,
            },
        }

    with session_manager.session_lock(session_id):
        current_session = session_manager.get(session_id)
        if not current_session:
            raise ScoringSessionNotFoundError("Session not found. The exam session may have expired.")
        if not current_session["finished"]:
            raise ReportNotReadyError("The exam is not yet finished. Complete all parts to get your score report.")
        session = deepcopy(current_session)

    try:
        loader = _get_loader(session["exam_id"])

        assessable_conversation = [
            message for message in session["conversation"]
            if message.get("stage") != "identity"
        ]
        audio_analysis = session.get("audio_analysis") or {}
        audio_responses = {
            int(response.get("answer_index", index)): response
            for index, response in enumerate(audio_analysis.get("responses", []))
        }
        candidate_index = 0
        transcript_lines = []
        for message in assessable_conversation:
            content = message["content"]
            source = "live browser transcript"
            if message["role"] == "user":
                audio_response = audio_responses.get(candidate_index)
                candidate_index += 1
                if audio_response and audio_response.get("text", "").strip():
                    content = audio_response["text"].strip()
                    source = "post-test local Whisper transcript"
            speaker = "Examiner" if message["role"] == "examiner" else "Candidate"
            transcript_lines.append(f"{speaker} ({source}): {content}" if speaker == "Candidate" else f"{speaker}: {content}")
        transcript = "\n".join(transcript_lines)

        scoring_prompt = loader.render_scoring_prompt()
        metrics = audio_analysis.get("metrics")
        timing_context = ""
        if metrics:
            timing_context = (
                "\n\nPost-test local audio timing evidence (use only as supporting evidence for "
                "Fluency and Coherence; it does not directly measure pronunciation):\n"
                f"{json.dumps(metrics, ensure_ascii=False)}"
            )
        prompt = f"{scoring_prompt}\n\nHere is the conversation transcript:\n\n{transcript}{timing_context}"
        result_text = chat_simple(prompt, "")

        try:
            result = json.loads(result_text)
        except json.JSONDecodeError:
            match = re.search(r'\{.*\}', result_text, re.DOTALL)
            if match:
                result = json.loads(match.group())
            else:
                logger.warning("Could not parse LLM scoring response as JSON")
                result = {
                    "overall_band": 6.0,
                    "fluency_coherence": 6.0,
                    "lexical_resource": 6.0,
                    "grammatical_range_accuracy": 6.0,
                    "pronunciation": 6.0,
                    "summary": "Unable to generate a detailed report at this time.",
                    "suggestions": [
                        "Practice more speaking exercises.",
                        "Expand your vocabulary.",
                        "Focus on grammar accuracy.",
                    ],
                }

        response = {
            "session_id": session_id,
            "report": result,
            "conversation": assessable_conversation,
            "audio_analysis": {
                "status": audio_analysis.get("status", "not_provided"),
                "engine": audio_analysis.get("engine"),
                "metrics": metrics,
            },
        }
        memory_store.save_exam_memory(
            session_id,
            session["exam_id"],
            result,
            assessable_conversation,
            response["audio_analysis"],
        )
        return response
    except LLMError as e:
        if e.recoverable:
            raise ScoringProviderError(f"Could not generate the score report: {e}")
        raise ScoringProviderError("Failed to generate score report due to an AI service error. Please try again later.")
    except DataError:
        raise
    except ScoringError:
        raise
    except Exception as e:
        logger.error("Unexpected error generating score report: %s", e)
        raise ScoringError("An unexpected error occurred while generating your score report. Please try again.")
