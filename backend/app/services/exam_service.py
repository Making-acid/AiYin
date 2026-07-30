import json
import random
import uuid
import logging
from app.services.llm_service import chat, LLMError
from app.services.data_loader import ExamDataLoader, DataError
from app.services import session_manager


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


def create_session(exam_id: str, mode: str) -> str:
    session_id = str(uuid.uuid4())
    session_manager.create(session_id, {
        "exam_id": exam_id,
        "mode": mode,
        "current_part": "part1",
        "question_index": 0,
        "conversation": [],
        "part2_topic": None,
        "finished": False,
    })
    return session_id


def get_examiner_intro(session_id: str) -> str:
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


def get_next_question(session_id: str, user_answer: str) -> dict:
    session = session_manager.get(session_id)
    if not session:
        raise ExamError("Session not found. Please restart the exam.")
    if session["finished"]:
        return {"next_question": "", "is_finished": True, "current_part": "", "question_index": 0}

    session["conversation"].append({"role": "user", "content": user_answer})

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


# ---- Exam flow state machine ----

def _handle_exam_flow(session: dict) -> dict:
    part = session["current_part"]
    idx = session["question_index"]
    exam_id = session["exam_id"]
    loader = _get_loader(exam_id)
    meta = loader.get_meta()
    part_config = meta["parts"]

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


def _handle_part1(session: dict, idx: int, loader: ExamDataLoader, part_config: dict) -> dict:
    count = part_config.get("part1", {}).get("question_count", 3)
    data = loader.get_questions("part1")
    topics = data.get("topics", [])
    topic = random.choice(topics) if topics else {"questions": ["Tell me about yourself."]}
    questions = topic.get("questions", [])

    if idx < count and idx < len(questions):
        question = questions[idx]
        session["question_index"] = idx + 1
        session["conversation"].append({"role": "examiner", "content": question})
        return {"next_question": question, "is_finished": False, "current_part": "part1", "question_index": idx + 1}
    else:
        session["current_part"] = "part2"
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
    data = loader.get_questions("part3")
    topics = data.get("topics", [])
    topic = random.choice(topics) if topics else {"questions": ["What is your opinion on this?"]}
    session["part3_topic_data"] = topic
    questions = topic.get("questions", [])
    question = questions[0] if questions else "What is your opinion on this?"
    session["question_index"] = 1
    session["conversation"].append({"role": "examiner", "content": question})
    return {"next_question": question, "is_finished": False, "current_part": "part3", "question_index": 1}


def _handle_part3(session: dict, idx: int, loader: ExamDataLoader, part_config: dict) -> dict:
    count = part_config.get("part3", {}).get("question_count", 3)
    topic_data = session.get("part3_topic_data", {})
    questions = topic_data.get("questions", [])

    if idx < count and idx < len(questions):
        question = questions[idx]
        session["question_index"] = idx + 1
        session["conversation"].append({"role": "examiner", "content": question})
        return {"next_question": question, "is_finished": False, "current_part": "part3", "question_index": idx + 1}
    else:
        dialogs = loader.get_dialogs()
        closing = dialogs.get("closing", "Thank you. That is the end of the speaking test.")
        session["conversation"].append({"role": "examiner", "content": closing})
        session["finished"] = True
        return {"next_question": closing, "is_finished": True, "current_part": "finished", "question_index": idx}


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
    return {"next_question": reply, "is_finished": False, "current_part": "free_chat", "question_index": 0}


def end_chat_session(session_id: str) -> dict:
    session = session_manager.get(session_id)
    if not session:
        raise ExamError("Session not found.")
    if session["mode"] != "free_chat":
        raise ExamError("This endpoint is only available for free chat sessions.")
    session["finished"] = True
    session_manager.delete(session_id)
    return {"session_id": session_id, "finished": True}
