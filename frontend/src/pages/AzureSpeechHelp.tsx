import { DocumentNavigation } from "../components/DocumentNavigation";
import { useLanguage } from "../i18n";

type GuideSection = {
  title: string;
  paragraphs?: string[];
  steps?: string[];
};

const GUIDE: Record<"zh" | "en", { title: string; intro: string; sections: GuideSection[] }> = {
  zh: {
    title: "Azure Speech 配置与费用指南",
    intro: "Azure Speech 是可选的第三方角色语音服务。浏览器语音始终保留，未配置 Azure 或 Azure 暂时不可用时，应用会自动回退到浏览器语音。",
    sections: [
      {
        title: "开始前需要知道",
        paragraphs: [
          "你需要自己的 Microsoft Azure 账户和 Speech 资源。本项目不提供 Azure 账户、密钥或额度，也不代收费用；产生的费用由 Microsoft 直接计入你的 Azure 账户。",
          "只有角色需要朗读回复时才会调用 Azure。用户的麦克风录音不会因为启用 Azure TTS 而发送给 Azure Speech。",
        ],
      },
      {
        title: "创建与配置",
        steps: [
          "登录 Azure Portal，创建 Speech service 或包含 Speech 功能的 Azure AI services 资源。",
          "个人试用建议优先选择 Free F0 定价层；同一订阅通常只能创建有限数量的 F0 资源。",
          "资源部署完成后，进入 Keys and Endpoint，复制 KEY 1 或 KEY 2，并记录 Region，例如 eastus、southeastasia。不要填写完整 Endpoint URL。",
          "回到本应用的“设置 → 角色语音”，选择 Azure Speech，填写 Key、Region、Haru 音色和 Mao 音色，然后保存。",
          "先分别试听 Haru 与 Mao；确认语言和音色正确后再开始考试或自由对话。试听也会消耗 Azure 字符额度。",
        ],
      },
      {
        title: "推荐音色",
        paragraphs: [
          "Haru 默认使用 en-GB-SoniaNeural，语气较克制，适合英语考官。Mao 默认使用 en-US-AnaNeural，听感更年轻；也可以尝试 en-US-AvaNeural 或 en-US-AriaNeural。",
          "音色名称必须完整且受当前 Region 支持。为了获得最可靠的 Live2D viseme 口型，优先使用 en-US 神经音色；其他语言仍可播放，但可能使用基于实际播放进度的回退口型。",
        ],
      },
      {
        title: "费用与限额",
        paragraphs: [
          "截至本指南更新时，免费 F0 层每月包含 50 万个神经 TTS 字符，实时文字转语音限制为每 60 秒 20 次请求。免费额度不会结转。",
          "标准 S0 按合成字符计量，具体单价取决于区域、币种和账户协议。标点及部分 SSML 内容也可能计入字符；音色语言与文本不匹配时，即使未正常生成语音也可能计费。",
          "价格和额度可能调整。请以 Microsoft 官方价格页和 Azure Portal 中显示的信息为准。建议启用前在 Azure Cost Management 创建预算和费用提醒。",
        ],
      },
      {
        title: "密钥、隐私与数据流",
        paragraphs: [
          "Azure Key 保存在应用的本地后端配置中，不会直接返回给网页。页面只获取短期 Azure 授权令牌。请勿截图、分享或提交包含密钥的配置文件。若密钥泄露，应立即在 Azure Portal 重新生成。",
          "启用 Azure 后，Haru 或 Mao 要朗读的回复文本会发送给 Microsoft 进行语音合成。适用 Microsoft 自己的服务条款、隐私、数据保留和计费规则。",
        ],
      },
      {
        title: "常见问题",
        steps: [
          "401/403：Key 或 Region 不匹配、密钥无效，或资源权限异常。请从同一个资源页面重新复制两者。",
          "429：请求过于频繁，或该 Region/音色容量不足。稍后重试，必要时选择音色的常用区域。",
          "没有声音：检查音色名称和语言是否正确、系统输出设备及浏览器自动播放权限。应用随后会尝试浏览器语音回退。",
          "口型不精确：标准 viseme 主要支持 en-US 神经音色；更换为 en-US-AnaNeural、AvaNeural 或 AriaNeural 后再试。",
          "不想继续使用：在角色语音设置中选择“浏览器语音（免费）”。这不会自动删除 Azure 资源；如不再需要，请在 Azure Portal 中自行停用或删除资源。",
        ],
      },
    ],
  },
  en: {
    title: "Azure Speech setup and cost guide",
    intro: "Azure Speech is an optional third-party character voice service. Browser speech always remains available and is used automatically when Azure is not configured or temporarily unavailable.",
    sections: [
      { title: "Before you begin", paragraphs: ["You need your own Microsoft Azure account and Speech resource. This project does not provide or resell Azure access, keys, allowances, or billing.", "Azure is called only to read character replies. Enabling Azure TTS does not send the user's microphone recording to Azure Speech."] },
      { title: "Create and configure", steps: ["Sign in to Azure Portal and create a Speech service or an Azure AI services resource with Speech enabled.", "For personal evaluation, prefer the Free F0 tier when it is available.", "Open Keys and Endpoint, copy KEY 1 or KEY 2, and note the Region such as eastus or southeastasia. Enter the region name, not the full endpoint URL.", "In this app, open Settings → Character voices, select Azure Speech, and enter the key, region, and character voice names.", "Preview Haru and Mao before beginning. Preview synthesis also consumes the character allowance."] },
      { title: "Recommended voices", paragraphs: ["Haru defaults to en-GB-SoniaNeural. Mao defaults to en-US-AnaNeural; en-US-AvaNeural and en-US-AriaNeural are useful alternatives.", "For the most reliable Live2D viseme lip sync, prefer an en-US neural voice. Other locales can play normally but may use playback-timed fallback mouth movement."] },
      { title: "Costs and limits", paragraphs: ["At the time of this guide, Free F0 includes 500,000 neural TTS characters per month and permits 20 real-time text-to-speech transactions per 60 seconds.", "Standard S0 is metered by synthesized characters. Rates depend on region, currency, and account agreement. Punctuation and some SSML content can count, and language-mismatched requests can be billable even when speech is not produced.", "Allowances and prices can change. Verify the official pricing page and Azure Portal, and configure an Azure Cost Management budget and alert before enabling the service."] },
      { title: "Keys, privacy, and data flow", paragraphs: ["The Azure key is stored in the app's local backend configuration and is not returned directly to the page. The page receives only a short-lived authorization token. Regenerate the key in Azure Portal if it is exposed.", "The reply text spoken by Haru or Mao is sent to Microsoft for synthesis. Microsoft's terms, privacy, retention, and billing rules apply."] },
      { title: "Troubleshooting", steps: ["401/403: the key and region may not belong to the same resource, the key may be invalid, or the resource may lack access.", "429: requests are too frequent or the selected voice has limited capacity in that region. Wait and retry.", "No audio: verify the exact voice name, output device, and browser autoplay permission. The app will then try browser speech.", "Loose lip sync: standard visemes primarily support en-US neural voices. Try AnaNeural, AvaNeural, or AriaNeural.", "To stop using Azure, select Browser speech in Settings. This does not delete the Azure resource; disable or delete it separately in Azure Portal if required."] },
    ],
  },
};

export function AzureSpeechHelp() {
  const { lang } = useLanguage();
  const guide = GUIDE[lang];

  return (
    <div className="page legal-page">
      <DocumentNavigation fallback="/settings" />
      <main className="legal-container">
        <header className="legal-header">
          <p className="legal-kicker">IELTS Speaking Practice · Azure Speech</p>
          <h1>{guide.title}</h1>
          <p>{guide.intro}</p>
        </header>
        {guide.sections.map((section) => (
          <section className="legal-section" key={section.title}>
            <h2>{section.title}</h2>
            {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            {section.steps && <ol>{section.steps.map((step) => <li key={step}>{step}</li>)}</ol>}
          </section>
        ))}
        <section className="legal-section">
          <h2>{lang === "zh" ? "官方资源" : "Official resources"}</h2>
          <p className="legal-links">
            <a href="https://azure.microsoft.com/pricing/details/speech/" target="_blank" rel="noopener noreferrer">Azure Speech pricing</a>
            <a href="https://learn.microsoft.com/azure/ai-services/speech-service/overview" target="_blank" rel="noopener noreferrer">Speech documentation</a>
            <a href="https://learn.microsoft.com/azure/ai-services/speech-service/language-support" target="_blank" rel="noopener noreferrer">Voice and language list</a>
            <a href="https://learn.microsoft.com/azure/cost-management-billing/costs/tutorial-acm-create-budgets" target="_blank" rel="noopener noreferrer">Budgets and alerts</a>
          </p>
        </section>
      </main>
    </div>
  );
}
