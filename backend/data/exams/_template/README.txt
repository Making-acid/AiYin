Exam Template — Starting Point for New Exams
=============================================

Copy this folder to create a new exam type.

Directory structure:
  _template/
  ├── meta.json          # Exam config (parts, scoring, timing)
  ├── dialogs.json       # Examiner scripted transitions
  ├── prompts/
  │   ├── examiner.txt   # AI examiner system prompt
  │   ├── scoring.txt    # Scoring prompt template (use {{RUBRICS}})
  │   └── free_chat.txt  # Free chat mode prompt (optional)
  ├── questions/
  │   ├── part1.json     # Part 1 question bank
  │   ├── part2.json     # Part 2 cue cards
  │   └── part3.json     # Part 3 discussion topics
  └── rubrics/
      └── band_descriptors.json  # Scoring criteria

Steps to add a new exam (e.g. CELPIP, PTE):
  1. Copy _template/ → exams/{exam_id}/
  2. Fill all files with real content
  3. Add entry to exams.json registry
  4. The system auto-loads it on next restart

Current status: TEMPLATE — no real exam data.
