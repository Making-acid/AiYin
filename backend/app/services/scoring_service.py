import json
import re
import logging
from copy import deepcopy
from typing import Optional
from app.services.llm_service import chat_simple, LLMError
from app.services.data_loader import ExamDataLoader, DataError
from app.services import session_manager


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
    with session_manager.session_lock(session_id):
        current_session = session_manager.get(session_id)
        if not current_session:
            raise ScoringSessionNotFoundError("Session not found. The exam session may have expired.")
        if not current_session["finished"]:
            raise ReportNotReadyError("The exam is not yet finished. Complete all parts to get your score report.")
        session = deepcopy(current_session)

    try:
        loader = _get_loader(session["exam_id"])

        transcript = "\n".join([
            f"{'Examiner' if m['role'] == 'examiner' else 'Candidate'}: {m['content']}"
            for m in session["conversation"]
        ])

        scoring_prompt = loader.render_scoring_prompt()
        prompt = f"{scoring_prompt}\n\nHere is the conversation transcript:\n\n{transcript}"
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

        return {
            "session_id": session_id,
            "report": result,
            "conversation": session["conversation"],
        }
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
