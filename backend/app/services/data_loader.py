from __future__ import annotations

import sys
import json
from pathlib import Path
from functools import lru_cache


def _get_data_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).parent / "data"
    return Path(__file__).parent.parent.parent / "data"


DATA_DIR = _get_data_dir()


def _read_text(path: Path) -> str:
    with open(path, encoding="utf-8") as f:
        return f.read()


def _read_json(path: Path) -> dict | list:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


@lru_cache(maxsize=1)
def get_registry() -> dict:
    return _read_json(DATA_DIR / "exams.json")


def get_available_exam_ids() -> list[str]:
    registry = get_registry()
    return [e["id"] for e in registry.get("exams", [])]


def get_exam_info(exam_id: str) -> dict:
    registry = get_registry()
    for e in registry.get("exams", []):
        if e["id"] == exam_id:
            return e
    raise ValueError(f"Exam '{exam_id}' not found in registry.")


class ExamDataLoader:
    """Load all data for a specific exam from its directory."""

    def __init__(self, exam_id: str):
        self.exam_id = exam_id
        self.exam_path = DATA_DIR / "exams" / exam_id
        if not self.exam_path.exists():
            raise ValueError(f"Exam directory not found: {self.exam_path}")

    def get_meta(self) -> dict:
        return _read_json(self.exam_path / "meta.json")

    def get_prompt(self, name: str) -> str:
        return _read_text(self.exam_path / "prompts" / f"{name}.txt")

    def get_questions(self, part: str) -> dict:
        return _read_json(self.exam_path / "questions" / f"{part}.json")

    def get_rubric(self, rubric_name: str = "band_descriptors") -> dict:
        return _read_json(self.exam_path / "rubrics" / f"{rubric_name}.json")

    def render_scoring_prompt(self) -> str:
        template = self.get_prompt("scoring")
        rubric = self.get_rubric()
        rubric_text = json.dumps(rubric, indent=2, ensure_ascii=False)
        return template.replace("{{RUBRICS}}", rubric_text)
