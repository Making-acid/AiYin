import json
import random
import uuid
import re
from typing import Optional
from app.services.llm_service import chat, chat_simple
from app.services.data_loader import ExamDataLoader


sessions: dict = {}


def create_session(exam_id: str, mode: str) -> str:
    session_id = str(uuid.uuid4())
    sessions[session_id] = {
        "exam_id": exam_id,
        "mode": mode,
        "current_part": "part1",
        "question_index": 0,
        "conversation": [],
        "part2_topic": None,
        "finished": False,
    }
    return session_id


def get_examiner_intro(session_id: str) -> str:
    session = sessions.get(session_id)
    if not session:
        return "Session not found."

    if session["mode"] == "exam":
        return (
            "Good morning/afternoon. My name is Alex, and I'll be your IELTS examiner today. "
            "Could you tell me your full name, please? ... Thank you. "
            "Now, let's begin with Part 1. I'm going to ask you some questions about yourself."
        )
    else:
        return "Hi there! I'm your English practice partner. Feel free to talk about anything you'd like. What's on your mind today?"


def get_next_question(session_id: str, user_answer: str) -> dict:
    session = sessions.get(session_id)
    if not session or session["finished"]:
        return {"next_question": "", "is_finished": True, "current_part": "", "question_index": 0}

    session["conversation"].append({"role": "user", "content": user_answer})

    if session["mode"] == "exam":
        return _handle_exam_flow(session)
    else:
        return _handle_free_chat_flow(session, user_answer)


def _get_loader(exam_id: str) -> ExamDataLoader:
    return ExamDataLoader(exam_id)


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
        text = "You may begin speaking now."
        session["conversation"].append({"role": "examiner", "content": text})
        return {"next_question": text, "is_finished": False, "current_part": "part2", "question_index": 0}

    elif part == "part2":
        return _handle_part2(session, idx, part_config)

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
    short_intro = (
        "Now let's move on to Part 2. I'm going to give you a topic. "
        "You have one minute to prepare, then you will speak for one to two minutes. "
        "Please look at the topic on your screen."
    )
    session["conversation"].append({"role": "examiner", "content": short_intro})
    return {
        "next_question": short_intro,
        "is_finished": False,
        "current_part": "part2_prep",
        "question_index": 0,
        "cue_card": {
            "topic": topic["topic"],
            "prompt_lines": topic.get("prompt_lines", []),
        },
    }


def _handle_part2(session: dict, idx: int, part_config: dict) -> dict:
    fc = part_config.get("part2", {}).get("follow_up_count", 1)
    topic = session["part2_topic"]
    follow_ups = topic.get("follow_up", []) if topic else []

    if idx < fc and idx < len(follow_ups):
        question = follow_ups[idx]
        session["question_index"] = idx + 1
        session["conversation"].append({"role": "examiner", "content": question})
        return {"next_question": question, "is_finished": False, "current_part": "part2", "question_index": idx + 1}
    else:
        session["current_part"] = "part3"
        session["question_index"] = 0
        transition = "Thank you. Now let's move on to Part 3, where we'll discuss some more general questions related to the topic."
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
        closing = "Thank you. That is the end of the speaking test."
        session["conversation"].append({"role": "examiner", "content": closing})
        session["finished"] = True
        return {"next_question": closing, "is_finished": True, "current_part": "finished", "question_index": idx}


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
