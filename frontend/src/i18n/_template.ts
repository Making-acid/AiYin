// Copy this file, rename to {lang_code}.ts, translate all values.
// See README.txt for integration steps.

const template: Record<string, string> = {
  examMode: "IELTS Exam", freeChat: "Free Chat", settings: "Settings",
  back: "← Back", home: "Home", startExam: "Start Exam →",
  startChat: "Start Chat →", apiConfig: "LLM API Configuration",
  apiDesc: "Select provider and enter API key. Key is stored server-side.",
  provider: "Provider", apiKey: "API Key", baseUrl: "Base URL",
  model: "Model", save: "Save Configuration", saved: "Configuration saved.",
  live2dSection: "Live2D Character", live2dDesc: "Control virtual character behavior.",
  eyeBehavior: "Eye Behavior", followMouse: "Follow Mouse", lookForward: "Look Forward",
  languageSection: "Language", languageDesc: "Switch UI language.",
  statusConfigured: "Status: configured", viewReport: "View Score Report →",
  configure: "Configure API Key", notConfigured: "API key not configured.",
  subtitle: "AI-Powered IELTS Speaking Assistant",
  desc: "Practice English speaking with an AI examiner. Choose a mode below.",
  intro: "Introduction", part1: "Part 1: Interview", part2Prep: "Part 2: Preparation",
  part2Speak: "Part 2: Long Turn", part3: "Part 3: Discussion", finished: "Test Complete",
  practiceMode: "Practice Mode", thinking: "Thinking...",
  speak: "🎤 Speak", stop: "⏹ Stop", listening: "Listening...",
  hintApiKey: "sk-xxxxxxxxxxxx", leaveBlank: "(leave blank to keep current)",
  saveFailed: "Failed to save configuration.", loadFailed: "Failed to load configuration.",
  whisperSection: "Whisper ASR",
  whisperDesc: "Use local Whisper AI for speech recognition.",
  whisperEnable: "Enable Whisper",
  whisperEnabled: "Enabled (replaces browser ASR)",
  whisperDisabled: "Disabled (use browser ASR)",
  whisperModel: "Model",
  whisperActive: "Active",
  whisperSwitch: "Switch",
  whisperDownload: "Download",
  whisperUsing: "Using",
  whisperChange: "Change",
};

export default template;
