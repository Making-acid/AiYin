const zh: Record<string, string> = {
  // Navigation & general
  title: "IELTS 口语练习",
  examMode: "雅思考试", freeChat: "自由聊天", settings: "设置",
  back: "← 返回", home: "首页", startExam: "开始考试 →",
  startChat: "开始聊天 →",
  configure: "配置 API Key", notConfigured: "API Key 未配置，请先设置。",
  subtitle: "AI 雅思口语陪练助手", desc: "通过 AI 考官练习英语口语。选择一个模式开始。",
  loading: "加载中...",
  tryAgain: "重试",
  reportNotFound: "未找到报告。",
  trainingLanguage: "训练语言",

  // Home page
  examModeDesc: "模拟完整的雅思口语考试，包含 Part 1、2、3。获取预估分数和详细反馈。",
  freeChatDesc: "与 AI 伙伴进行轻松的英语对话。无压力，无评分——纯粹练习。",

  // Settings
  apiConfig: "LLM API 配置",
  apiDesc: "选择模型供应商并输入 API Key。Key 保存在服务器本地。",
  provider: "供应商", apiKey: "API Key", baseUrl: "Base URL",
  model: "Model", save: "保存配置", saved: "配置已保存。",
  apiKeyRequired: "API Key 不能为空",
  live2dSection: "Live2D 角色", live2dDesc: "控制虚拟角色的行为。",
  eyeBehavior: "视线行为", followMouse: "跟随鼠标", lookForward: "目视前方",
  languageSection: "界面语言", languageDesc: "切换界面显示语言。",
  langZh: "中文", langEn: "English",
  trainingLangSection: "训练语言",
  trainingLangDesc: "设置口语练习和考试使用的语言。此设置控制语音识别、语音输出和可用考试。",
  statusConfigured: "状态：已配置",
  hintApiKey: "sk-xxxxxxxxxxxx", leaveBlank: "（留空保持当前）",
  saveFailed: "保存失败。", loadFailed: "加载配置失败。",

  // Exam page
  intro: "介绍", part1: "第1部分：访谈", part2Prep: "第2部分：准备",
  part2Speak: "第2部分：陈述", part3: "第3部分：讨论", finished: "测试结束",
  viewReport: "查看评分报告 →",
  stopAndSend: "停止并发送",
  youMayBegin: "请开始发言。",
  thinking: "思考中...",

  // Free chat
  practiceMode: "练习模式",
  mao: "Mao",
  chatStartFailed: "启动自由聊天失败，请重试。",
  chatSendFailed: "发送消息失败，请重试。",

  // Voice input
  speak: "🎤 说话", stop: "⏹ 停止", listening: "聆听中...",
  stopRecording: "停止录音", startRecording: "开始录音",
  voiceNotSupported: "您的浏览器不支持语音输入。",
  voiceUseChrome: "请使用 Chrome 或 Edge 浏览器。",

  // Chat bubble
  you: "你", examiner: "考官",

  // Report page
  reportTitle: "IELTS 口语评分报告",
  estimatedBand: "预估分数",
  fluencyCoherence: "流利度与连贯性",
  lexicalResource: "词汇能力",
  grammarAccuracy: "语法能力",
  pronunciation: "发音",
  summary: "总结",
  suggestions: "改进建议",
  takeAnotherTest: "再考一次",
  practiceFreeChat: "自由对话练习",
  generatingReport: "正在生成评分报告...",
  reportLoadFailed: "加载报告失败，请重试。",

  // Whisper / ASR
  whisperSection: "Whisper 语音识别",
  whisperSectionExam: "考试模式 — Whisper 语音识别",
  whisperSectionFreeChat: "自由聊天 — Whisper 语音识别",
  whisperDesc: "使用本地 Whisper AI 进行语音识别。比浏览器 ASR 更精准，但需下载模型。",
  whisperEnable: "启用 Whisper",
  whisperEnabled: "已启用（替换浏览器 ASR）",
  whisperDisabled: "已禁用（使用浏览器 ASR）",
  whisperModel: "模型",
  whisperActive: "使用中",
  whisperSwitch: "切换",
  whisperDownload: "下载",
  whisperUsing: "当前使用",
  whisperChange: "更换",
  asrProviderNotFound: "未找到 ASR 提供程序",

  // ASR error messages
  asrMicDenied: "麦克风权限被拒绝，请在浏览器设置中允许麦克风访问。",
  asrNoMic: "未检测到麦克风，请连接麦克风设备。",
  asrRecordError: "录音出错，请检查麦克风是否正常。",
  asrNotSupported: "当前浏览器不支持录音功能。",
  asrNoAudio: "未检测到音频，请大声说话或检查麦克风。",
  asrTranscribeFailed: "语音转写失败。",
  asrEmptyText: "Whisper 返回空白文本，音频可能不够清晰。",
  asrServerConnectFailed: "无法连接服务器，请检查网络连接。",
  asrSpeechNotSupported: "当前浏览器不支持语音识别。",
  asrSpeechError: "语音识别错误。",
  asrStartFailed: "启动录音失败。",

  // Live2D
  modelLoadFailed: "模型加载失败",

  // Tutorial
  tutorialTitle: "欢迎使用 IELTS 口语练习！",
  tutorialStep1Title: "配置 API Key",
  tutorialStep1Desc: "前往设置页面，填入你的 LLM API Key。支持 DeepSeek、OpenAI、Groq、OpenRouter、Ollama。",
  tutorialStep2Title: "选择模式",
  tutorialStep2Desc: "考试模式模拟完整雅思口语考试并生成评分报告。自由聊天模式可随意用英语交流。",
  tutorialStep3Title: "使用语音输入",
  tutorialStep3Desc: "点击麦克风按钮开始说话，系统会识别你的语音，AI 考官将以语音回复。",
  tutorialStep4Title: "获取反馈",
  tutorialStep4Desc: "考试结束后会生成 0-9 分的预估分数，包含四项评分标准和个性化提升建议。",
  tutorialTip: "提示",
  tutorialTipDesc: "推荐使用 Chrome 或 Edge 浏览器以获得最佳体验。可在设置中开启 Whisper 本地 ASR 提高识别精度。",
  tutorialDismiss: "知道了！",

  // Help
  helpTitle: "帮助",
  helpOpenPdf: "打开用户指南 (PDF)",

  // Misc
  whisperDownloadConfirm: "下载模型 {modelId}？该模型大小约 {size}。下载可能需要几分钟时间。",
};

export default zh;
