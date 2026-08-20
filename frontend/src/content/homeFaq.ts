import type { Language } from "../i18n";

export interface HomeFaqItem {
  question: string;
  answer: string;
}

const zh: HomeFaqItem[] = [
  {
    question: "我完全不懂技术，第一次应该做什么？",
    answer: "先打开“设置”，选择一个 AI 服务商并填写该服务商提供的 API Key，保存后返回首页。然后允许麦克风权限，先用“自由聊天”试说一句；确认能识别和播放声音后，再开始考试。",
  },
  {
    question: "API Key 是什么？软件会免费提供吗？",
    answer: "API Key 相当于你在 AI 服务商处申请的个人通行证。本软件不附送 Key，也不会代收 AI 费用。你需要自行在所选服务商处注册、查看价格并充值；Key 只保存在本机，请不要发送给别人。",
  },
  {
    question: "没有 API Key 能使用吗？",
    answer: "考试问答、自由聊天和评分需要连接 AI，通常必须配置 Key。你仍可以打开设置、阅读帮助和查看本地资料。熟悉本地模型的用户也可以自行配置 Ollama。",
  },
  {
    question: "点击开始后没有反应，或提示连接失败怎么办？",
    answer: "先回到设置确认已显示“已配置”，再检查电脑网络。若刚修改过 Key、模型或服务商，请保存后重试。仍失败时，关闭应用再重新打开；不要同时启动多个旧版本。",
  },
  {
    question: "麦克风没有声音或一直识别不到我说话？",
    answer: "在系统隐私设置中允许本应用使用麦克风，并确认选择了正确的输入设备。说话时靠近麦克风、保持环境安静。若使用网页版本，建议使用最新版 Edge 或 Chrome，并在地址栏权限中允许麦克风。",
  },
  {
    question: "角色不说话，但文字回复正常，怎么办？",
    answer: "先检查系统音量和输出设备。默认浏览器语音无需额外付费，但可用音色取决于 Windows 和 WebView2。设置中的 Azure Speech 是可选项，配置错误或余额不足时会自动回退；不影响文字对话。",
  },
  {
    question: "Whisper、WhisperX 和浏览器识别有什么区别？",
    answer: "桌面版已预装 Whisper Small English 与 Medium English，无需下载；首次打开时可按电脑配置选择。WhisperX 英文对齐模型同样预装，只在考试结束后补充词级时间、语速和停顿证据，不参与 Part 3 出题。",
  },
  {
    question: "为什么其他模型下载很慢、卡住或失败？",
    answer: "预装的 Small English 与 Medium English 不需要下载。列表中的其他模型位于外部模型源，部分网络环境可能需要 VPN；下载失败时直接切回预装模型即可。",
  },
  {
    question: "考试过程中应该怎样操作？可以中途暂停吗？",
    answer: "按考官提示回答并在每次说完后停止录音。Part 2 会先准备再进行个人陈述，Part 3 由考官根据现场回答追问。完整模拟不建议暂停；退出页面可能导致本次考试无法继续。",
  },
  {
    question: "为什么考试结束前看不到分数？",
    answer: "这是刻意设计的。模拟考试和评分相互分离，考官不会在 Part 1、2、3 中现场打分。完成全部流程后，系统才根据本次答案和可用的录音证据生成练习报告。",
  },
  {
    question: "报告中的分数是官方 IELTS 成绩吗？",
    answer: "不是。它只是 AI 生成的练习参考，可能不准确或不一致，不能用于报名、留学、签证、求职或其他正式用途。真实成绩只能来自获授权的正式考试。",
  },
  {
    question: "我的录音、聊天和 Key 会上传到哪里？",
    answer: "聊天所需文本会发送给你选择的 AI 服务商；启用 Azure 语音时，角色回复文本会发送给 Microsoft。自由聊天历史、考试记忆和服务密钥保存在本机。考试录音由本地语音组件处理时，临时音频会在分析后删除。",
  },
  {
    question: "Azure Speech 必须开吗？会收费吗？",
    answer: "不是必须。默认浏览器语音可以直接使用。Azure Speech 使用你自己的 Azure 账户，可能产生费用；免费额度、限制和价格可能变化。不了解 Azure 时建议保持关闭。",
  },
  {
    question: "人物消失、动作卡顿或电脑很卡怎么办？",
    answer: "先关闭其他占用显卡或内存的软件，再重启应用。更新显卡驱动和 WebView2 Runtime 也可能有帮助。Live2D 只影响画面，不影响文字练习；低配置电脑可以优先保证录音和对话。",
  },
  {
    question: "覆盖安装新版本会丢失历史记录吗？",
    answer: "正常覆盖安装不会主动删除保存在本机用户目录中的配置、自由聊天和考试记忆。不要手动删除本机的 IELTS Speaking 用户数据目录；重要内容仍建议自行截图或备份。",
  },
];

const en: HomeFaqItem[] = [
  { question: "I have no technical experience. What should I do first?", answer: "Open Settings, choose an AI provider, enter the API key issued by that provider, and save. Allow microphone access and test one sentence in Free Chat before starting an exam." },
  { question: "What is an API key, and is one included?", answer: "An API key is a private credential from an AI provider. The app does not include one or collect provider charges. Register with your chosen provider, review its prices, and keep the key private." },
  { question: "Can I use the app without an API key?", answer: "AI conversation and scoring normally require a configured provider. Help, settings, and local records remain available. Experienced users may configure a local Ollama service." },
  { question: "Nothing happens, or the app says it cannot connect. What now?", answer: "Confirm Settings shows that the provider is configured, check your internet connection, save any changed provider settings, and retry. If needed, close and reopen the app and avoid running multiple old versions." },
  { question: "Why can the app not hear me?", answer: "Allow microphone access in Windows, select the correct input device, move closer to the microphone, and reduce background noise. For the web version, use a current Edge or Chrome and allow microphone access for the page." },
  { question: "Text appears but the character has no voice. What should I check?", answer: "Check system volume and the selected output device. Browser speech depends on voices installed in Windows and WebView2. Azure Speech is optional; a failure there falls back without blocking text conversation." },
  { question: "What are browser recognition, Whisper, and WhisperX?", answer: "The desktop app bundles Whisper Small English and Medium English. The bundled WhisperX English aligner only adds post-exam timing evidence and never controls Part 3 questions." },
  { question: "Why is another model download slow or failing?", answer: "The two bundled English models need no download. Other models use an external model host and may require a VPN on some networks; switch back to either bundled model if a download fails." },
  { question: "How do I operate the exam? Can I pause it?", answer: "Answer each prompt and stop recording when finished. Part 2 includes preparation and a long turn; Part 3 follows up on your answers. Leaving the page may end the current mock exam, so pausing is not recommended." },
  { question: "Why is there no score during the exam?", answer: "The mock exam and scoring are deliberately separated. The examiner does not score during Parts 1–3. A practice report is generated only after the complete test ends." },
  { question: "Is the report an official IELTS result?", answer: "No. It is AI-generated practice feedback and may be inaccurate or inconsistent. It cannot be used for admissions, visas, employment, registration, or any other official purpose." },
  { question: "Where do my audio, chats, and keys go?", answer: "Required text is sent to your selected AI provider. Azure mode sends reply text to Microsoft. Keys, chat history, and exam memory are stored locally. Temporary exam audio processed locally is deleted after analysis." },
  { question: "Is Azure Speech required, and can it cost money?", answer: "It is optional. Browser speech works without Azure. Azure uses your own account and may incur charges; leave it disabled if you are unfamiliar with the service." },
  { question: "The character is missing or animation is slow. What can I do?", answer: "Restart the app, close other graphics-heavy programs, and update graphics drivers and WebView2 Runtime. Live2D affects visuals only; text practice can continue." },
  { question: "Will an upgrade remove my history?", answer: "A normal in-place upgrade does not intentionally remove configuration, chat history, or exam memory stored in your local user profile. Avoid manually deleting the IELTS Speaking user-data directory." },
];

export const homeFaq: Record<Language, HomeFaqItem[]> = { zh, en };
