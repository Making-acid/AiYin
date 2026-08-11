import sys
import types
import unittest
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from unittest.mock import patch


# The exam state machine only needs the LLM in free-chat mode. Stub that module
# so these flow tests remain fast and never call an external provider.
llm_stub = types.ModuleType("app.services.llm_service")


class LLMError(Exception):
    recoverable = True


llm_stub.LLMError = LLMError
llm_stub.chat = lambda _messages: "stub reply"
sys.modules["app.services.llm_service"] = llm_stub

from app.services import exam_service, session_manager  # noqa: E402


class ExamFlowTests(unittest.TestCase):
    def setUp(self):
        session_manager.clear_all()

    def test_transitions_do_not_create_candidate_answers(self):
        with patch.object(exam_service.random, "choice", side_effect=lambda items: items[0]):
            session_id = exam_service.create_session("ielts", "exam")

            # Identity answer, followed by all three Part 1 answers.
            first = exam_service.get_next_question(session_id, "Test Candidate")
            self.assertEqual(first["current_part"], "part1")
            for answer in ("Part 1 answer one", "Part 1 answer two"):
                result = exam_service.get_next_question(session_id, answer)
                self.assertEqual(result["current_part"], "part1")
            prep = exam_service.get_next_question(session_id, "Part 1 answer three")

            self.assertEqual(prep["current_part"], "part2_prep")
            self.assertIn("cue_card", prep)
            self.assertEqual(
                session_manager.get(session_id)["current_part"],
                "part2_prep",
            )
            with self.assertRaises(exam_service.ExamError):
                exam_service.get_next_question(session_id, "not a real answer")

            # Advancing preparation produces the start cue without a fake answer.
            part2_start = exam_service.advance_session(session_id)
            self.assertEqual(part2_start["current_part"], "part2")
            self.assertEqual(part2_start["question_index"], 0)
            self.assertEqual(self._candidate_messages(session_id), 4)

            follow_up = exam_service.get_next_question(session_id, "Part 2 long turn")
            self.assertEqual(follow_up["current_part"], "part2")
            self.assertEqual(follow_up["question_index"], 1)

            transition = exam_service.get_next_question(session_id, "Part 2 follow-up")
            self.assertEqual(transition["current_part"], "part3_transition")
            self.assertEqual(self._candidate_messages(session_id), 6)

            # Advancing the transition returns the first actual Part 3 question.
            part3_start = exam_service.advance_session(session_id)
            self.assertEqual(part3_start["current_part"], "part3")
            self.assertEqual(part3_start["question_index"], 1)
            self.assertEqual(self._candidate_messages(session_id), 6)

            for index in range(3):
                result = exam_service.get_next_question(
                    session_id,
                    f"Part 3 answer {index + 1}",
                )

            self.assertTrue(result["is_finished"])
            self.assertEqual(result["current_part"], "finished")
            self.assertEqual(self._candidate_messages(session_id), 9)

    def test_advance_is_rejected_during_a_question(self):
        session_id = exam_service.create_session("ielts", "exam")
        with self.assertRaises(exam_service.ExamError):
            exam_service.advance_session(session_id)

    def test_concurrent_answers_are_serialized_per_session(self):
        session_id = exam_service.create_session("ielts", "exam")
        start = Barrier(3)

        def submit(answer: str) -> dict:
            start.wait()
            return exam_service.get_next_question(session_id, answer)

        with patch.object(exam_service.random, "choice", side_effect=lambda items: items[0]):
            with ThreadPoolExecutor(max_workers=2) as pool:
                futures = [pool.submit(submit, answer) for answer in ("first", "second")]
                start.wait()
                results = [future.result(timeout=2) for future in futures]

        self.assertEqual(sorted(result["question_index"] for result in results), [1, 2])
        self.assertEqual(self._candidate_messages(session_id), 2)
        examiner_questions = [
            message["content"]
            for message in session_manager.get(session_id)["conversation"]
            if message["role"] == "examiner"
        ]
        self.assertEqual(len(examiner_questions), 2)
        self.assertNotEqual(examiner_questions[0], examiner_questions[1])

    @staticmethod
    def _candidate_messages(session_id: str) -> int:
        conversation = session_manager.get(session_id)["conversation"]
        return sum(message["role"] == "user" for message in conversation)


if __name__ == "__main__":
    unittest.main()
