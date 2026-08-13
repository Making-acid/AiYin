import json
import random
import uuid
import logging
from app.services.llm_service import chat, LLMError
from app.services.data_loader import ExamDataLoader, DataError
from app.services import session_manager
from app.services import memory_store


logger = logging.getLogger("exam")


class ExamError(Exception):
    """User-facing error for exam service failures."""


def _get_loader(exam_id: str) -> ExamDataLoader:
    try:
        return ExamDataLoader(exam_id)
    except DataError:
        raise
    except Exception as e:
        logger.error("Failed to create data loader for '%s': %s", exam_id, e)
        raise ExamError("Failed to load exam data. Please check your installation.")


def create_session(exam_id: str, mode: str, session_id: str = None) -> str:
    session_id = session_id or str(uuid.uuid4())
    session_manager.create(session_id, {
        "exam_id": exam_id,
        "mode": mode,
        "current_part": "identity" if mode == "exam" else "free_chat",
        "question_index": 0,
        "conversation": [],
        "part2_topic": None,
        "part1_topics": [],
        "part3_questions": [],
        "finished": False,
    })
    return session_id


def get_examiner_intro(session_id: str) -> str:
    with session_manager.session_lock(session_id):
        return _get_examiner_intro_locked(session_id)


def _get_examiner_intro_locked(session_id: str) -> str:
    session = session_manager.get(session_id)
    if not session:
        raise ExamError("Session not found. Please restart the exam.")

    try:
        loader = _get_loader(session["exam_id"])
        dialogs = loader.get_dialogs()

        if session["mode"] == "exam":
            return dialogs.get("intro", "Let's begin the speaking test.")
        else:
            return dialogs.get("free_chat_intro", "Hi! What would you like to talk about?")
    except (DataError, ExamError):
        raise
    except Exception as e:
        logger.error("Failed to get examiner intro: %s", e)
        raise ExamError("Failed to load examiner introduction. Please try again.")


def restore_chat_session(session_id: str) -> dict:
    record = memory_store.get_chat_session(session_id)
    if not record:
        raise ExamError("Saved conversation not found.")
    create_session(record.get("exam_id", "ielts"), "free_chat", session_id=session_id)
    session = session_manager.get(session_id)
    session["conversation"] = record.get("messages", [])
    return record


def get_next_question(session_id: str, user_answer: str) -> dict:
    with session_manager.session_lock(session_id):
        return _get_next_question_locked(session_id, user_answer)


def _get_next_question_locked(session_id: str, user_answer: str) -> dict:
    session = session_manager.get(session_id)
    if not session:
        raise ExamError("Session not found. Please restart the exam.")
    if session["finished"]:
        return {"next_question": "", "is_finished": True, "current_part": "", "question_index": 0}

    if session["mode"] == "exam" and session["current_part"] in {"part2_prep", "part3_transition"}:
        raise ExamError("The exam is waiting for a transition, not an answer.")

    session["conversation"].append({
        "role": "user",
        "content": user_answer,
        "stage": session["current_part"],
    })
    if session["mode"] == "free_chat":
        memory_store.save_chat_session(session)

    try:
        if session["mode"] == "exam":
            return _handle_exam_flow(session)
        else:
            return _handle_free_chat_flow(session, user_answer)
    except LLMError as e:
        return {
            "next_question": f"I'm sorry, {e}",
            "is_finished": False,
            "current_part": session["current_part"],
            "question_index": session["question_index"],
        }
    except (DataError, ExamError):
        raise
    except Exception as e:
        logger.error("Unexpected error in exam flow: %s", e)
        raise ExamError("An unexpected error occurred. Please try again.")


def advance_session(session_id: str) -> dict:
    """Advance an exam-only transition without adding a candidate answer."""
    with session_manager.session_lock(session_id):
        return _advance_session_locked(session_id)


def _advance_session_locked(session_id: str) -> dict:
    session = session_manager.get(session_id)
    if not session:
        raise ExamError("Session not found. Please restart the exam.")
    if session["mode"] != "exam":
        raise ExamError("Only exam sessions can be advanced.")
    if session["finished"]:
        return {"next_question": "", "is_finished": True, "current_part": "finished", "question_index": 0}
    if session["current_part"] not in {"part2_prep", "part3_transition"}:
        raise ExamError("The exam is not waiting at a transition.")

    try:
        return _handle_exam_flow(session)
    except (DataError, ExamError):
        raise
    except Exception as e:
        logger.error("Unexpected error advancing exam flow: %s", e)
        raise ExamError("An unexpected error occurred. Please try again.")


# ---- Exam flow state machine ----

def _handle_exam_flow(session: dict) -> dict:
    part = session["current_part"]
    idx = session["question_index"]
    exam_id = session["exam_id"]
    loader = _get_loader(exam_id)
    meta = loader.get_meta()
    part_config = meta["parts"]

    if part == "identity":
        return _handle_identity(session, loader)

    if part == "part1":
        return _handle_part1(session, idx, loader, part_config)

    elif part == "part2_prep":
        session["current_part"] = "part2"
        dialogs = loader.get_dialogs()
        text = dialogs.get("part2_begin", "You may begin speaking now.")
        session["conversation"].append({"role": "examiner", "content": text})
        return {"next_question": text, "is_finished": False, "current_part": "part2", "question_index": 0}

    elif part == "part2":
        return _handle_part2(session, idx, part_config, loader)

    elif part == "part3_transition":
        return _handle_part3_start(session, loader)

    elif part == "part3":
        return _handle_part3(session, idx, loader, part_config)

    return {"next_question": "", "is_finished": True, "current_part": "finished", "question_index": 0}


def _handle_identity(session: dict, loader: ExamDataLoader) -> dict:
    session["current_part"] = "part1"
    session["question_index"] = 0
    session["candidate_name"] = next(
        (message["content"] for message in reversed(session["conversation"]) if message["role"] == "user"),
        "",
    )
    text = loader.get_dialogs().get(
        "part1_intro",
        "Thank you. In this first part, I'd like to ask you some questions about yourself.",
    )
    session["conversation"].append({"role": "examiner", "content": text, "stage": "identity"})
    return _handle_part1(session, 0, loader, loader.get_meta()["parts"], prefix=text)


def _select_part1_topics(session: dict, topics: list[dict], count: int) -> list[dict]:
    if session.get("part1_topics"):
        return session["part1_topics"]
    if not topics:
        selected = [{"topic": "Personal information", "questions": ["Do you work or are you a student?"]}]
    else:
        anchor = next(
            (topic for topic in topics if topic.get("topic") in {"Study & Work", "Work & Study"}),
            topics[0],
        )
        remaining = [topic for topic in topics if topic is not anchor]
        extra_count = min(max(0, count - 1), len(remaining))
        selected = [anchor, *random.sample(remaining, k=extra_count)]
    session["part1_topics"] = selected
    return selected


def _handle_part1(session: dict, idx: int, loader: ExamDataLoader, part_config: dict, prefix: str = "") -> dict:
    config = part_config.get("part1", {})
    topic_count = config.get("topic_count", 2)
    questions_per_topic = config.get("questions_per_topic", 3)
    data = loader.get_questions("part1")
    topics = data.get("topics", [])
    selected = _select_part1_topics(session, topics, topic_count)
    questions = []
    for topic in selected:
        available = topic.get("questions", [])
        questions.extend(available[:questions_per_topic])

    if idx < len(questions):
        question = questions[idx]
        session["question_index"] = idx + 1
        session["conversation"].append({"role": "examiner", "content": question, "stage": "part1"})
        spoken = f"{prefix} {question}".strip()
        return {"next_question": spoken, "is_finished": False, "current_part": "part1", "question_index": idx + 1}
    else:
        session["current_part"] = "part2_prep"
        session["question_index"] = 0
        return _start_part2(session, loader)


def _start_part2(session: dict, loader: ExamDataLoader) -> dict:
    data = loader.get_questions("part2")
    topics = data.get("topics", [])
    if not topics:
        topic = {"topic": "Describe something important to you.", "prompt_lines": [], "follow_up": []}
    else:
        topic = random.choice(topics)

    session["part2_topic"] = topic
    dialogs = loader.get_dialogs()
    short_intro = dialogs.get("part2_intro",
        "Now let's move on to Part 2. I'm going to give you a topic. "
        "You have one minute to prepare, then you will speak for one to two minutes. "
        "Please look at the topic on your screen."
    )
    meta = loader.get_meta()
    part_config = meta["parts"]
    prep_seconds = part_config.get("part2", {}).get("prep_seconds", 60)
    speak_seconds = part_config.get("part2", {}).get("speak_seconds", 120)
    session["conversation"].append({"role": "examiner", "content": short_intro})
    return {
        "next_question": short_intro,
        "is_finished": False,
        "current_part": "part2_prep",
        "question_index": 0,
        "cue_card": {
            "topic": topic["topic"],
            "prompt_lines": topic.get("prompt_lines", []),
            "prep_seconds": prep_seconds,
            "speak_seconds": speak_seconds,
        },
    }


def _handle_part2(session: dict, idx: int, part_config: dict, loader: ExamDataLoader) -> dict:
    fc = part_config.get("part2", {}).get("follow_up_count", 1)
    topic = session["part2_topic"]
    follow_ups = topic.get("follow_up", []) if topic else []

    if idx < fc and idx < len(follow_ups):
        question = follow_ups[idx]
        session["question_index"] = idx + 1
        session["conversation"].append({"role": "examiner", "content": question})
        return {"next_question": question, "is_finished": False, "current_part": "part2", "question_index": idx + 1}
    else:
        session["current_part"] = "part3_transition"
        session["question_index"] = 0
        dialogs = loader.get_dialogs()
        transition = dialogs.get("part3_intro",
            "Thank you. Now let's move on to Part 3, where we'll discuss some more general questions related to the topic."
        )
        session["conversation"].append({"role": "examiner", "content": transition})
        return {"next_question": transition, "is_finished": False, "current_part": "part3_transition", "question_index": 0}


def _handle_part3_start(session: dict, loader: ExamDataLoader) -> dict:
    session["current_part"] = "part3"
    question = _generate_part3_question(session, loader, latest_answer="")
    session["question_index"] = 1
    session["part3_questions"].append(question)
    session["conversation"].append({"role": "examiner", "content": question, "stage": "part3"})
    return {"next_question": question, "is_finished": False, "current_part": "part3", "question_index": 1}


def _handle_part3(session: dict, idx: int, loader: ExamDataLoader, part_config: dict) -> dict:
    count = part_config.get("part3", {}).get("question_count", 5)
    if idx < count:
        latest_answer = next(
            (message["content"] for message in reversed(session["conversation"]) if message["role"] == "user"),
            "",
        )
        question = _generate_part3_question(session, loader, latest_answer)
        session["question_index"] = idx + 1
        session["part3_questions"].append(question)
        session["conversation"].append({"role": "examiner", "content": question, "stage": "part3"})
        return {"next_question": question, "is_finished": False, "current_part": "part3", "question_index": idx + 1}
    else:
        dialogs = loader.get_dialogs()
        closing = dialogs.get("closing", "Thank you. That is the end of the speaking test.")
        session["conversation"].append({"role": "examiner", "content": closing})
        session["finished"] = True
        return {"next_question": closing, "is_finished": True, "current_part": "finished", "question_index": idx}


def _generate_part3_question(session: dict, loader: ExamDataLoader, latest_answer: str) -> str:
    asked = session.get("part3_questions", [])
    try:
        prompt = loader.render_part3_prompt(session.get("part2_topic") or {}, asked, latest_answer)
        question = chat([{"role": "system", "content": prompt}]).strip().strip('"')
        if not question or len(question) > 300:
            raise ExamError("The examiner did not produce a usable Part 3 question.")
        prohibited = (
            "band ", "score", "your grammar", "your vocabulary", "your pronunciation",
            "good answer", "well done", "that's interesting", "that is interesting", "thank you",
        )
        if (
            question in asked
            or question.count("?") > 1
            or "\n" in question
            or any(term in question.lower() for term in prohibited)
        ):
            raise ExamError("The examiner produced an invalid or repeated Part 3 question.")
        if not question.endswith("?"):
            question = question.rstrip(".! ") + "?"
        return question
    except (LLMError, ExamError, DataError) as exc:
        logger.warning("Dynamic Part 3 question failed; using question bank: %s", exc)
        return _fallback_part3_question(session, loader)


def _fallback_part3_question(session: dict, loader: ExamDataLoader) -> str:
    del loader  # The fallback is deliberately independent of potentially noisy source data.
    questions = [
        "Why do you think this subject is important to people today?",
        "How have people's attitudes towards this subject changed over time?",
        "Do younger and older people tend to see this issue differently?",
        "What effects can this issue have on society as a whole?",
        "How do you think this issue might develop in the future?",
    ]
    asked = set(session.get("part3_questions", []))
    return next((question for question in questions if question not in asked), questions[-1])


# ---- Free chat flow ----

def _handle_free_chat_flow(session: dict, user_answer: str) -> dict:
    loader = _get_loader(session["exam_id"])
    system_prompt = loader.get_prompt("free_chat")

    messages = [{"role": "system", "content": system_prompt}]
    for msg in session["conversation"]:
        if msg["role"] == "user":
            messages.append({"role": "user", "content": msg["content"]})
        else:
            messages.append({"role": "assistant", "content": msg["content"]})

    reply = chat(messages)
    session["conversation"].append({"role": "assistant", "content": reply})
    memory_store.save_chat_session(session)
    return {"next_question": reply, "is_finished": False, "current_part": "free_chat", "question_index": 0}


def end_chat_session(session_id: str) -> dict:
    with session_manager.session_lock(session_id):
        session = session_manager.get(session_id)
        if not session:
            raise ExamError("Session not found.")
        if session["mode"] != "free_chat":
            raise ExamError("This endpoint is only available for free chat sessions.")
        session["finished"] = True
        memory_store.save_chat_session(session)
        session_manager.delete(session_id)
        return {"session_id": session_id, "finished": True}
