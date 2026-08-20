"""Prepare release-only Whisper and WhisperX assets outside the source tree."""

from __future__ import annotations

import argparse
import hashlib
import os
import shutil
import sys
import urllib.request
import zipfile
from pathlib import Path

from faster_whisper import download_model


BUNDLED_WHISPER_MODELS = ("small.en", "medium.en")
ALIGNMENT_FILENAME = "wav2vec2_fairseq_base_ls960_asr_ls960.pth"
ALIGNMENT_URL = f"https://download.pytorch.org/torchaudio/models/{ALIGNMENT_FILENAME}"
ALIGNMENT_SHA256 = "488fd4f16de84438ffc945334278c1b9fb9b7159a806c1080b16111a958c945d"
PUNKT_URL = "https://raw.githubusercontent.com/nltk/nltk_data/gh-pages/packages/tokenizers/punkt_tab.zip"
PUNKT_SHA256 = "e57f64187974277726a3417ca6f181ec5403676c717672eef6a748a7b20e0106"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def prepare_whisper(root: Path) -> None:
    root.mkdir(parents=True, exist_ok=True)
    for model_id in BUNDLED_WHISPER_MODELS:
        destination = root / model_id
        if (destination / "model.bin").is_file():
            print(f"Using cached Whisper model: {model_id}")
            continue
        print(f"Downloading bundled Whisper model: {model_id}")
        destination.mkdir(parents=True, exist_ok=True)
        download_model(model_id, output_dir=str(destination))
        if not (destination / "model.bin").is_file():
            raise RuntimeError(f"Whisper model is incomplete: {model_id}")


def prepare_whisperx(root: Path) -> None:
    root.mkdir(parents=True, exist_ok=True)
    alignment_path = root / ALIGNMENT_FILENAME
    if not alignment_path.is_file() or sha256(alignment_path) != ALIGNMENT_SHA256:
        temporary_path = alignment_path.with_suffix(".download")
        temporary_path.unlink(missing_ok=True)
        print("Downloading bundled WhisperX English alignment model")
        urllib.request.urlretrieve(ALIGNMENT_URL, temporary_path)
        if sha256(temporary_path) != ALIGNMENT_SHA256:
            temporary_path.unlink(missing_ok=True)
            raise RuntimeError("WhisperX alignment model checksum verification failed")
        os.replace(temporary_path, alignment_path)
    else:
        print("Using cached WhisperX English alignment model")

    nltk_root = root / "nltk_data"
    english_punkt = nltk_root / "tokenizers" / "punkt_tab" / "english"
    if not english_punkt.is_dir():
        installed_punkt = Path(sys.prefix) / "nltk_data" / "tokenizers" / "punkt_tab" / "english"
        if installed_punkt.is_dir():
            print("Copying installed English sentence tokenizer data")
            shutil.copytree(installed_punkt, english_punkt, dirs_exist_ok=True)
        else:
            print("Downloading bundled English sentence tokenizer data")
            archive = root / "punkt_tab.zip"
            urllib.request.urlretrieve(PUNKT_URL, archive)
            if sha256(archive) != PUNKT_SHA256:
                archive.unlink(missing_ok=True)
                raise RuntimeError("NLTK punkt_tab checksum verification failed")
            with zipfile.ZipFile(archive) as source:
                for member in source.infolist():
                    if member.filename.startswith("punkt_tab/english/"):
                        source.extract(member, nltk_root / "tokenizers")
            archive.unlink(missing_ok=True)
    if not english_punkt.is_dir():
        raise RuntimeError("NLTK English punkt_tab data is incomplete")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("output_root", type=Path)
    args = parser.parse_args()
    prepare_whisper(args.output_root / "whisper")
    prepare_whisperx(args.output_root / "whisperx")


if __name__ == "__main__":
    main()
