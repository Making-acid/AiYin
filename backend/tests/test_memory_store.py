import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from app.services import memory_store


class MemoryStoreTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        root = Path(self.temp_dir.name)
        self.chat_path = root / "chat.json"
        self.exam_path = root / "exam.json"
        self.patchers = [
            patch.object(memory_store, "_CHAT_PATH", self.chat_path),
            patch.object(memory_store, "_EXAM_PATH", self.exam_path),
        ]
        for patcher in self.patchers:
            patcher.start()

    def tearDown(self):
        for patcher in reversed(self.patchers):
            patcher.stop()
        self.temp_dir.cleanup()

    def test_chat_can_be_saved_restored_listed_and_deleted(self):
        session = {
            "session_id": "chat-1",
            "exam_id": "ielts",
            "mode": "free_chat",
            "conversation": [
                {"role": "assistant", "content": "Hello"},
                {"role": "user", "content": "Let's discuss learning languages"},
                {"role": "assistant", "content": "Sure"},
            ],
        }
        saved = memory_store.save_chat_session(session)
        self.assertEqual(saved["title"], "Let's discuss learning languages")
        self.assertEqual(memory_store.get_chat_session("chat-1")["messages"], session["conversation"])
        self.assertEqual(memory_store.list_chat_sessions()[0]["message_count"], 3)
        self.assertTrue(memory_store.delete_chat_session("chat-1"))
        self.assertIsNone(memory_store.get_chat_session("chat-1"))

    def test_exam_memory_is_idempotent_and_summarised(self):
        first = {
            "overall_band": 6.0, "fluency_coherence": 5.5,
            "lexical_resource": 6.5, "grammatical_range_accuracy": 6.0,
            "pronunciation": 6.0, "summary": "First", "suggestions": [],
        }
        second = dict(first, overall_band=7.0, fluency_coherence=6.5, summary="Second")
        memory_store.save_exam_memory("exam-1", "ielts", first, [])
        memory_store.save_exam_memory("exam-1", "ielts", second, [])
        memory_store.save_exam_memory("exam-2", "ielts", second, [])

        summary = memory_store.get_exam_memory_summary()
        self.assertEqual(summary["attempt_count"], 2)
        self.assertEqual(summary["averages"]["overall_band"], 6.5)
        self.assertEqual(summary["weakest_criterion"], "fluency_coherence")
        self.assertEqual(memory_store.get_exam_memory("exam-1")["report"]["summary"], "First")

    def test_clear_all_memory_removes_both_stores(self):
        memory_store.save_chat_session({
            "session_id": "chat-1", "exam_id": "ielts", "mode": "free_chat",
            "conversation": [{"role": "assistant", "content": "Hello"}],
        })
        memory_store.save_exam_memory("exam-1", "ielts", {"overall_band": 6.0}, [])
        deleted = memory_store.clear_all_memory()
        self.assertEqual(deleted, {"chat_sessions": 1, "exam_attempts": 1})
        self.assertEqual(memory_store.list_chat_sessions(), [])
        self.assertEqual(memory_store.get_exam_memory_summary()["attempt_count"], 0)


if __name__ == "__main__":
    unittest.main()
