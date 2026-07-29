from __future__ import annotations

import sys
import json
import logging
from pathlib import Path
from functools import lru_cache


logger = logging.getLogger("data_loader")


class DataError(Exception):
    """User-facing error for data loading failures."""


def _get_data_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).parent / "data"
    return Path(__file__).parent.parent.parent / "data"


DATA_DIR = _get_data_dir()


def _read_text(path: Path) -> str:
    try:
        with open(path, encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        logger.error("Data file not found: %s", path)
        raise DataError(f"Required data file is missing: {path.name}. Please reinstall the application.")
    except OSError as e:
        logger.error("Cannot read data file %s: %s", path, e)
        raise DataError(f"Cannot read data file: {path.name}. Please check file permissions.")


def _read_json(path: Path) -> dict | list:
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        logger.error("Data file not found: %s", path)
        raise DataError(f"Required data file is missing: {path.name}. Please reinstall the application.")
    except json.JSONDecodeError as e:
        logger.error("Data file is corrupted %s: %s", path, e)
        raise DataError(f"Data file is corrupted: {path.name}. Please reinstall the application.")
    except OSError as e:
        logger.error("Cannot read data file %s: %s", path, e)
        raise DataError(f"Cannot read data file: {path.name}. Please check file permissions.")


@lru_cache(maxsize=1)
def get_registry() -> dict:
    registry_path = DATA_DIR / "exams.json"
    try:
        return _read_json(registry_path)
    except DataError:
        raise
    except Exception as e:
        logger.error("Failed to load exam registry: %s", e)
        raise DataError("Failed to load exam registry. The application data may be corrupted.")


def get_available_exam_ids() -> list[str]:
    registry = get_registry()
    return [e["id"] for e in registry.get("exams", [])]


def get_exam_info(exam_id: str) -> dict:
    registry = get_registry()
    for e in registry.get("exams", []):
        if e["id"] == exam_id:
            return e
    raise DataError(f"Exam '{exam_id}' not found. Please check that the exam data is installed correctly.")


class ExamDataLoader:
    """Load all data for a specific exam from its directory."""

    def __init__(self, exam_id: str):
        self.exam_id = exam_id
        self.exam_path = DATA_DIR / "exams" / exam_id
        if not self.exam_path.exists():
            raise DataError(f"Exam directory not found for '{exam_id}'. Please reinstall the application.")

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

    def get_dialogs(self) -> dict:
        path = self.exam_path / "dialogs.json"
        if path.exists():
            return _read_json(path)
        return {}
