import sys
import types
import unittest
from unittest.mock import patch


if "app.services.llm_service" not in sys.modules:
    llm_stub = types.ModuleType("app.services.llm_service")

    class LLMError(Exception):
        recoverable = True

    llm_stub.LLMError = LLMError
    llm_stub.chat = lambda _messages: "stub reply"
    llm_stub.chat_simple = lambda _prompt, _content: "{}"
    sys.modules["app.services.llm_service"] = llm_stub

from app.services import exam_audio_service, exam_service, session_manager


class ExamAudioServiceTests(unittest.TestCase):
    def setUp(self):
        session_manager.clear_all()

    def test_live_exam_cannot_run_scoring_audio_analysis(self):
        session_id = exam_service.create_session("ielts", "exam")
        with (
            patch.object(exam_audio_service.whisper_service, "analyze_for_scoring") as analyze,
            self.assertRaisesRegex(exam_audio_service.ExamAudioError, "locked until"),
        ):
            exam_audio_service.analyze_completed_exam(
                session_id,
                [{"stage": "part3", "answer_index": 0, "audio": b"audio"}],
            )
        analyze.assert_not_called()

    def test_finished_exam_stores_only_assessable_recordings(self):
        session_id = exam_service.create_session("ielts", "exam")
        session_manager.get(session_id)["finished"] = True
        fake_analysis = {
            "text": "A locally transcribed answer.",
            "segments": [{"start": 0.0, "end": 2.0, "text": "A locally transcribed answer."}],
            "words": [
                {"start": 0.0, "end": 0.4, "word": "A", "score": 0.9},
                {"start": 0.7, "end": 1.2, "word": "locally", "score": 0.9},
            ],
            "language": "en",
            "alignment": "faster_whisper",
        }
        with patch.object(
            exam_audio_service.whisper_service,
            "analyze_for_scoring",
            return_value=fake_analysis,
        ) as analyze:
            result = exam_audio_service.analyze_completed_exam(
                session_id,
                [
                    {"stage": "identity", "answer_index": -1, "audio": b"skip"},
                    {"stage": "part1", "answer_index": 0, "audio": b"score"},
                ],
            )

        analyze.assert_called_once_with(b"score", "en")
        self.assertEqual(result["responses"][0]["answer_index"], 0)
        self.assertEqual(result["metrics"]["response_count"], 1)
        self.assertEqual(session_manager.get(session_id)["current_part"], "identity")


if __name__ == "__main__":
    unittest.main()
