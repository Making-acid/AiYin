# Third-Party Notices

This project, IELTS Speaking Practice (the "Software"), incorporates the following
third-party software and content under their respective licenses.

---

## Frontend Dependencies

| Package | Version | License | Homepage |
|---------|---------|---------|----------|
| React | 19 | MIT | https://react.dev |
| React Router | 7 | MIT | https://reactrouter.com |
| PixiJS | 6 | MIT | https://pixijs.com |
| pixi-live2d-display | 0.4 | MIT | https://github.com/guansss/pixi-live2d-display |
| Axios | 1 | MIT | https://axios-http.com |
| Vite | 8 | MIT | https://vite.dev |
| TypeScript | 5 | Apache 2.0 | https://www.typescriptlang.org |
| @vitejs/plugin-react | 6 | MIT | https://github.com/vitejs/vite-plugin-react |

## Backend Dependencies

| Package | Version | License | Homepage |
|---------|---------|---------|----------|
| FastAPI | 0.1 | MIT | https://fastapi.tiangolo.com |
| Uvicorn | 0.3 | BSD-3 | https://www.uvicorn.org |
| OpenAI Python SDK | 1 | Apache 2.0 | https://github.com/openai/openai-python |
| Pydantic | 2 | MIT | https://docs.pydantic.dev |
| httpx | 0.2 | BSD-3 | https://www.python-httpx.org |
| python-dotenv | 1 | BSD-3 | https://github.com/theskumar/python-dotenv |
| faster-whisper | 1 | MIT | https://github.com/SYSTRAN/faster-whisper |
| PyAV | 11 | BSD-3 | https://pyav.org |
| requests | 2 | Apache 2.0 | https://requests.readthedocs.io |
| PyInstaller | 6 | GPL | https://pyinstaller.org |

---

## Live2D Cubism SDK

This Software uses the **Live2D Cubism SDK** for rendering 2D character models.

Live2D Cubism Core and related libraries are the proprietary property of
Live2D Inc. and are provided under the Live2D Proprietary License Agreement:

https://www.live2d.com/en/download/cubism-sdk/license/

### Live2D Sample Models

The following Live2D sample models are included for character display:

- **Haru** (receptionist version) — Live2D sample model, free for use per Live2D terms
  https://www.live2d.com/en/learn/sample/haru-receptionist/
- **Niziiro Mao** — Live2D sample model, free for use per Live2D terms
  https://www.live2d.com/en/learn/sample/niziiro-mao/

These models are the copyright of Live2D Inc. and are redistributed under the
terms of the Live2D Free Material License.

---

## Speech / ASR / TTS

### Web Speech API

Speech recognition and text-to-speech are provided in-browser by the
**W3C Web Speech API**, implemented natively by Chromium-based browsers
(Google Chrome, Microsoft Edge). No additional third-party library is bundled.

### faster-whisper

Transcription uses **faster-whisper** (MIT License), a reimplementation of
OpenAI's Whisper model using CTranslate2.

Copyright (c) 2023 SYSTRAN

---

## Question Bank

The IELTS speaking question bank data in `backend/data/exams/ielts/questions/`
is adapted from the **New Oriental (新东方) IELTS Speaking Question Bank
2026 May–August (Version 2)**, under fair use for educational and research
purposes. The original PDF is archived in `backend/data/exams/ielts/source/`.

Copyright of the original question collection belongs to New Oriental
Education & Technology Group Inc.

---

## Full License Texts

### MIT License

Applies to: React, React Router, PixiJS, pixi-live2d-display, Axios, Vite,
FastAPI, Pydantic, faster-whisper

See [LICENSE](./LICENSE) for the full text used by this project.

### Apache License 2.0

Applies to: OpenAI Python SDK, TypeScript, requests

http://www.apache.org/licenses/LICENSE-2.0

### BSD 3-Clause License

Applies to: Uvicorn, httpx, python-dotenv, PyAV

https://opensource.org/license/bsd-3-clause

### GNU General Public License

Applies to: PyInstaller

https://www.gnu.org/licenses/gpl-3.0.html

---

*This file was generated on 2026-08-04. If you believe any attribution is
missing or incorrect, please open an issue at
https://github.com/Making-acid/ielts-speaking-ai.*
