import json
import re
from typing import Optional
from app.services.llm_service import chat_simple
from app.services.data_loader import ExamDataLoader
from app.services.exam_service import sessions


def _get_loader(exam_id: str) -> ExamDataLoader:
    return ExamDataLoader(exam_id)


def generate_score_report(session_id: str) -> Optional[dict]:
    session = sessions.get(session_id)
    if not session or not session["finished"]:
        return None

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
            result = {
                "overall_band": 6.0,
                "fluency_coherence": 6.0,
                "lexical_resource": 6.0,
                "grammatical_range_accuracy": 6.0,
                "pronunciation": 6.0,
                "summary": "Unable to generate detailed report.",
                "suggestions": ["Practice more speaking exercises.", "Expand your vocabulary.", "Focus on grammar accuracy."]
            }

    return {
        "session_id": session_id,
        "report": result,
        "conversation": session["conversation"],
    }
