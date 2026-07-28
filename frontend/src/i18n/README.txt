This directory contains translations for the IELTS Speaking AI application.

Current languages:
  en.ts   — English (default)
  zh.ts   — Chinese (Simplified)

To add a new language:
  1. Copy _template.ts → {lang_code}.ts
  2. Translate all string values (keep keys unchanged)
  3. Import and add to index.ts STRINGS record:
       import xx from "./xx";
       const STRINGS = { en, zh, xx };
  4. Add the language option to the Language type and UI selector

String keys are used across the entire app — do not rename keys.
