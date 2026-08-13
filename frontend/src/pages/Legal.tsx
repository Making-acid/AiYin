import { useNavigate } from "react-router-dom";
import { useLanguage } from "../i18n";

type LegalCopy = {
  title: string;
  updated: string;
  intro: string;
  sections: Array<{ title: string; paragraphs: string[]; bullets?: string[] }>;
  privacyTitle: string;
  privacyIntro: string;
  flows: Array<{ feature: string; detail: string }>;
  controlsTitle: string;
  controls: string[];
  acknowledgement: string;
};

const COPY: Record<"zh" | "en", LegalCopy> = {
  en: {
    title: "Legal, Disclaimer & Privacy",
    updated: "Effective 14 August 2026 · v0.6.0",
    intro: "Please read this before using the microphone, AI conversation, or estimated scoring features.",
    sections: [
      {
        title: "Independent practice tool",
        paragraphs: [
          "This application is an independent, AI-assisted educational practice tool. It is not an examination, booking, tutoring, or score-verification service and does not issue an official result or qualification.",
          "It is not affiliated with, authorised by, sponsored by, or endorsed by the British Council, IDP Education, Cambridge University Press & Assessment, or any IELTS test centre. IELTS, the IELTS logos, and 雅思 are registered trade marks of their respective owners.",
        ],
      },
      {
        title: "AI results are estimates",
        paragraphs: [
          "Automated scores, transcripts, corrections, sample answers, and feedback may be incomplete, inconsistent, biased, or incorrect. Pronunciation may be inferred partly from a transcript and cannot reproduce an in-person assessment.",
          "Do not present a result as an official IELTS score or rely on it for admissions, immigration or visas, employment, professional registration, appeals, or another high-stakes decision.",
        ],
      },
      {
        title: "Your responsibilities",
        paragraphs: ["Check important information against official sources and comply with the terms of every AI, browser, model, and content provider you choose."],
        bullets: [
          "Do not enter identity documents, candidate numbers, payment details, or information you are not authorised to disclose.",
          "Obtain permission before recording another person.",
          "Do not use the app to impersonate an examiner, issue credentials, deceive an institution, or infringe intellectual-property rights.",
        ],
      },
      {
        title: "Warranty and liability",
        paragraphs: [
          "The software is provided as is and as available, without a promise of accuracy, uninterrupted operation, fitness for a particular purpose, or a particular exam outcome. Liability is limited to the maximum extent permitted by applicable law; rights and liabilities that cannot lawfully be excluded remain unaffected.",
        ],
      },
    ],
    privacyTitle: "How data is handled",
    privacyIntro: "Running the local application does not by itself send your local data to the project author. Features you choose can send data to other services as described below.",
    flows: [
      { feature: "AI conversation and scoring", detail: "Required text and session context are sent through the local backend to the AI endpoint configured in Settings. That provider's terms, privacy policy, fees, and retention rules apply." },
      { feature: "Browser speech recognition", detail: "Audio may be processed by the browser or operating-system vendor and may leave the device, depending on its implementation." },
      { feature: "Character speech", detail: "Browser mode uses a browser or operating-system voice. If Azure Speech is enabled, character reply text is sent to Microsoft for synthesis. The Azure key remains in the local backend and the page receives a short-lived token; Microsoft's terms, privacy, retention, and billing rules apply." },
      { feature: "Azure Speech charges", detail: "Azure uses your own account. Free F0 currently includes 500,000 neural TTS characters per month and 20 real-time transactions per 60 seconds. Standard S0 is metered by synthesized characters; rates vary by region, currency, and agreement. Language-mismatched requests can still be billable even when speech is not produced. Check current official pricing and set an Azure budget alert before enabling it." },
      { feature: "Local Whisper and optional enhanced analysis", detail: "Audio is sent to the app's local backend, converted in a temporary file, and transcribed or time-aligned locally before that temporary file is deleted. Enhanced analysis provides timing evidence such as speaking rate and pauses; it does not independently determine pronunciation quality. Model downloads contact the applicable model host." },
      { feature: "Exam recording and scoring analysis", detail: "During the live test, audio remains in page memory and does not affect Part 3 or exam transitions. After the test, enabled local analysis sends recordings only to the local backend for Whisper transcription and optional WhisperX alignment. Raw audio is not sent to the scoring provider, but the resulting transcript and aggregate timing evidence can be included in the scoring request. Temporary audio is deleted after local processing." },
      { feature: "Local settings", detail: "Preferences remain in browser local storage; AI and Whisper configuration remain in the application's local user-data folder until cleared." },
    ],
    controlsTitle: "Your choices",
    controls: [
      "Deny microphone access or use typed input where available.",
      "Use local Whisper instead of browser recognition.",
      "Choose a locally hosted compatible AI endpoint, such as Ollama.",
      "Clear browser site data and local application configuration.",
    ],
    acknowledgement: "By installing or using the application, you acknowledge these limitations and data flows. If you do not agree, do not use it.",
  },
  zh: {
    title: "法律说明、免责声明与隐私",
    updated: "2026 年 8 月 14 日生效 · v0.6.0",
    intro: "使用麦克风、AI 对话或预估评分功能前，请先阅读以下内容。",
    sections: [
      {
        title: "独立的练习工具",
        paragraphs: [
          "本应用是独立开发的 AI 辅助教育练习工具，不提供考试、报名预约、人工辅导或成绩核验服务，也不会签发官方成绩或资质。",
          "本应用与 British Council、IDP Education、Cambridge University Press & Assessment 及任何 IELTS 考点均无隶属、授权、赞助或认可关系。IELTS、IELTS 标识及“雅思”是其各自权利人的注册商标。",
        ],
      },
      {
        title: "AI 结果仅为估算",
        paragraphs: [
          "自动生成的分数、转写、纠错、示例答案和反馈可能不完整、不一致、带有偏差或存在错误。发音可能部分依据转写文本推断，不能复现真人面对面评估。",
          "请勿将结果表述为官方 IELTS 成绩，也不要用于院校录取、移民或签证、求职、职业注册、申诉及其他高风险决定。",
        ],
      },
      {
        title: "用户责任",
        paragraphs: ["重要信息应通过官方来源核实，并请遵守所选 AI、浏览器、模型和内容服务商的条款。"],
        bullets: [
          "不要输入身份证件、考生号、支付信息或无权披露的内容。",
          "录制他人声音前应取得必要许可。",
          "不得利用本应用冒充考官、签发资质、欺骗机构或侵犯知识产权。",
        ],
      },
      {
        title: "保证与责任限制",
        paragraphs: [
          "本软件按现状和可用状态提供，不承诺准确、持续可用、适合特定用途或带来特定考试结果。责任在适用法律允许的最大范围内受到限制；依法不得排除的权利或责任不受影响。",
        ],
      },
    ],
    privacyTitle: "数据如何处理",
    privacyIntro: "仅运行本地应用不会把本地数据发送给项目作者；你主动使用的功能可能按下述方式把数据交给其他服务。",
    flows: [
      { feature: "AI 对话与评分", detail: "必要文本和会话上下文经本地后端发送至“设置”中配置的 AI 接口；适用该服务商自己的条款、隐私政策、收费及保留规则。" },
      { feature: "浏览器语音识别", detail: "视具体实现，音频可能由浏览器或操作系统厂商处理并离开本机。" },
      { feature: "角色语音", detail: "浏览器模式使用浏览器或操作系统音色。若启用 Azure Speech，角色回复文本会发送给 Microsoft 合成语音；Azure 密钥留在本地后端，页面只获取短期令牌，并适用 Microsoft 的条款、隐私、保留及计费规则。" },
      { feature: "Azure Speech 费用", detail: "Azure 使用你自己的账户。当前免费 F0 每月含 50 万个神经 TTS 字符，实时合成限制为每 60 秒 20 次；标准 S0 按合成字符计量，费率随区域、币种和协议变化。语言不匹配的请求即使未生成语音也可能收费。启用前请核对官方最新价格并设置 Azure 预算提醒。" },
      { feature: "本地 Whisper 与可选增强分析", detail: "音频发送至应用的本地后端，以临时文件转换并在本机转写或进行时间对齐，处理后删除临时文件。增强分析用于提供语速、停顿等时间证据，并不独立判断发音质量；下载模型时会连接相应模型托管方。" },
      { feature: "考试录音与评分分析", detail: "考试进行期间，录音仅暂存在页面内存中，不影响 Part 3 或考试状态转换。考试结束后，启用的本地分析会把录音仅交给本地后端，由 Whisper 转写并可选经 WhisperX 对齐。原始音频不会发送给评分服务商，但所得转写文本及汇总时间指标可加入评分请求；本地处理后删除临时音频。" },
      { feature: "本地设置", detail: "偏好保留在浏览器本地存储中；AI 与 Whisper 配置保留在应用的本地用户数据目录，直至用户清除。" },
    ],
    controlsTitle: "你的选择",
    controls: [
      "拒绝麦克风权限，或在支持时使用键盘输入。",
      "以本地 Whisper 替代浏览器语音识别。",
      "选择 Ollama 等本地兼容 AI 接口。",
      "清除浏览器站点数据及应用本地配置。",
    ],
    acknowledgement: "安装或使用本应用即表示你知悉上述限制和数据流。如不同意，请勿使用。",
  },
};

export function Legal() {
  const navigate = useNavigate();
  const { lang, t } = useLanguage();
  const copy = COPY[lang];

  return (
    <div className="page legal-page">
      <button className="back-btn" onClick={() => navigate(-1)}>{t("back")}</button>
      <main className="legal-container">
        <header className="legal-header">
          <p className="legal-kicker">IELTS Speaking Practice</p>
          <h1>{copy.title}</h1>
          <p className="legal-updated">{copy.updated}</p>
          <p>{copy.intro}</p>
        </header>

        {copy.sections.map((section) => (
          <section className="legal-section" key={section.title}>
            <h2>{section.title}</h2>
            {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            {section.bullets && <ul>{section.bullets.map((item) => <li key={item}>{item}</li>)}</ul>}
          </section>
        ))}

        <section className="legal-section">
          <h2>{copy.privacyTitle}</h2>
          <p>{copy.privacyIntro}</p>
          <div className="legal-flow-list">
            {copy.flows.map((flow) => (
              <div className="legal-flow" key={flow.feature}>
                <h3>{flow.feature}</h3>
                <p>{flow.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="legal-section">
          <h2>{copy.controlsTitle}</h2>
          <ul>{copy.controls.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>

        <aside className="legal-acknowledgement">{copy.acknowledgement}</aside>
        <p className="legal-links">
          <a href="https://ielts.org/legal" target="_blank" rel="noopener noreferrer">IELTS legal & policies</a>
          <span aria-hidden="true">·</span>
          <a href="https://www.live2d.com/en/learn/sample/model-terms/" target="_blank" rel="noopener noreferrer">Live2D sample terms</a>
        </p>
      </main>
    </div>
  );
}
