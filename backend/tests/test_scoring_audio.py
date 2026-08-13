import json
import sys
import types
import unittest
from unittest.mock import Mock, patch


llm_stub = sys.modules.get("app.services.llm_service")
if llm_stub is None:
    llm_stub = types.ModuleType("app.services.llm_service")

    class LLMError(Exception):
        recoverable = True

    sys.modules["app.services.llm_service"] = llm_stub

if not hasattr(llm_stub, "LLMError"):
    class LLMError(Exception):
        recoverable = True

    llm_stub.LLMError = LLMError
if not hasattr(llm_stub, "chat"):
    llm_stub.chat = lambda _messages: "stub reply"
if not hasattr(llm_stub, "chat_simple"):
    llm_stub.chat_simple = lambda _prompt, _content: "{}"

from app.services import scoring_service, session_manager


class ScoringAudioTests(unittest.TestCase):
    def setUp(self):
        session_manager.clear_all()

    def test_post_exam_audio_evidence_is_used_only_for_scoring(self):
        session_id = "completed-audio-exam"
        original_conversation = [
            {"role": "examiner", "content": "What do you do?", "stage": "part1"},
            {"role": "user", "content": "browser transcript", "stage": "part1"},
        ]
        session_manager.create(session_id, {
            "exam_id": "ielts",
            "mode": "exam",
            "current_part": "part3",
            "question_index": 5,
            "conversation": original_conversation.copy(),
            "finished": True,
            "audio_analysis": {
                "status": "complete",
                "engine": "whisperx",
                "responses": [{"answer_index": 0, "text": "local Whisper transcript"}],
                "metrics": {"articulation_rate_wpm": 123.4, "long_pause_count_over_1s": 2},
            },
        })
        report_json = json.dumps({
            "overall_band": 6.5,
            "fluency_coherence": 6.5,
            "lexical_resource": 6.5,
            "grammatical_range_accuracy": 6.5,
            "pronunciation": 6.5,
            "summary": "Summary.",
            "suggestions": ["One", "Two", "Three"],
        })
        loader = Mock()
        loader.render_scoring_prompt.return_value = "POST-TEST SCORING ONLY"
        captured = {}

        def score(prompt, _content):
            captured["prompt"] = prompt
            return report_json

        with (
            patch.object(scoring_service.memory_store, "get_exam_memory", return_value=None),
            patch.object(scoring_service.memory_store, "save_exam_memory") as save,
            patch.object(scoring_service, "_get_loader", return_value=loader),
            patch.object(scoring_service, "chat_simple", side_effect=score),
        ):
            response = scoring_service.generate_score_report(session_id)

        self.assertIn("local Whisper transcript", captured["prompt"])
        self.assertNotIn("browser transcript", captured["prompt"])
        self.assertIn("articulation_rate_wpm", captured["prompt"])
        self.assertEqual(response["audio_analysis"]["engine"], "whisperx")
        self.assertEqual(session_manager.get(session_id)["conversation"], original_conversation)
        save.assert_called_once()


if __name__ == "__main__":
    unittest.main()
