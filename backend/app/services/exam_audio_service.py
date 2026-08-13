import logging
from copy import deepcopy

from app.services import session_manager, whisper_service


logger = logging.getLogger("exam_audio")
ASSESSABLE_STAGES = {"part1", "part2", "part3"}


class ExamAudioError(Exception):
    """Raised when post-exam audio cannot be attached safely."""


def _timing_metrics(responses: list[dict]) -> dict:
    words = [word for response in responses for word in response.get("words", [])]
    speech_seconds = sum(
        max(0.0, segment.get("end", 0.0) - segment.get("start", 0.0))
        for response in responses
        for segment in response.get("segments", [])
    )
    pauses = []
    for response in responses:
        response_words = response.get("words", [])
        for previous, current in zip(response_words, response_words[1:]):
            gap = float(current["start"]) - float(previous["end"])
            if gap >= 0.25:
                pauses.append(gap)
    word_count = len([word for word in words if word.get("word")])
    return {
        "response_count": len(responses),
        "word_count": word_count,
        "speech_seconds": round(speech_seconds, 2),
        "articulation_rate_wpm": round(word_count * 60 / speech_seconds, 1) if speech_seconds else None,
        "pause_count_over_0_25s": len(pauses),
        "long_pause_count_over_1s": sum(pause >= 1.0 for pause in pauses),
        "mean_internal_pause_seconds": round(sum(pauses) / len(pauses), 2) if pauses else 0.0,
    }


def analyze_completed_exam(session_id: str, recordings: list[dict], language: str = "en") -> dict:
    """Analyze audio only after the live exam has reached its terminal state."""
    with session_manager.session_lock(session_id):
        session = session_manager.get(session_id)
        if not session:
            raise ExamAudioError("Session not found. The exam session may have expired.")
        if session.get("mode") != "exam":
            raise ExamAudioError("Audio scoring analysis is only available for exam sessions.")
        if not session.get("finished"):
            raise ExamAudioError("Audio analysis is locked until the speaking test has ended.")
        if session.get("audio_analysis"):
            return deepcopy(session["audio_analysis"])

    assessable = [item for item in recordings if item.get("stage") in ASSESSABLE_STAGES]
    responses = []
    for index, item in enumerate(assessable):
        analysis = whisper_service.analyze_for_scoring(item["audio"], language)
        responses.append({
            "answer_index": int(item.get("answer_index", index)),
            "stage": item["stage"],
            **analysis,
        })

    result = {
        "status": "complete",
        "engine": "whisperx" if any(r.get("alignment") == "whisperx" for r in responses) else "faster_whisper",
        "responses": responses,
        "metrics": _timing_metrics(responses),
    }
    with session_manager.session_lock(session_id):
        session = session_manager.get(session_id)
        if not session or not session.get("finished"):
            raise ExamAudioError("The completed exam session is no longer available.")
        session["audio_analysis"] = result
    return deepcopy(result)
