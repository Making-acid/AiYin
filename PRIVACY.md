# Privacy Notice / 隐私说明

Effective date: 14 August 2026
生效日期：2026 年 8 月 14 日

This notice describes the current Beta 1.2.1 desktop/local-web build. A modified or
hosted deployment may behave differently. / 本说明适用于当前 Beta 1.2.1 桌面版及本地网页版本；
经修改或部署到服务器后的版本可能存在不同的数据处理方式。

## English

### What the Software processes

- microphone audio while you hold or activate a recording control;
- recognised speech text, typed answers, and conversation history needed for
  the current session;
- AI-generated replies and estimated scoring reports;
- local preferences such as interface language, training language, Live2D gaze,
  tutorial state, and Whisper settings; and
- the AI-provider configuration entered in Settings.

The Software does not ask for an IELTS candidate number, passport, identity
document, payment card, or official test record. Do not enter these items into a
practice answer or chat.

### Where data goes

| Feature | Processing and destination |
|---|---|
| AI conversation and scoring | Required text and session context are sent through the local backend to the AI endpoint selected in Settings. The selected provider's own privacy policy and retention rules apply. |
| Browser speech recognition | Audio may be processed by the browser or operating-system vendor and may leave the device, depending on that implementation. |
| Local Whisper and optional enhanced analysis | Recorded audio is sent only to the Software's local backend. It is converted in a temporary file, transcribed or time-aligned locally, and the temporary file is deleted after processing. Enhanced analysis is intended to derive timing evidence such as speaking rate and pauses; it does not independently determine pronunciation quality. Model downloads contact the applicable model host. |
| Exam recording and scoring analysis | During the live test, captured audio remains in page memory and does not affect Part 3 questions or state transitions. After the test ends, if local exam analysis is enabled, response recordings are uploaded only to the local backend for Whisper transcription and optional WhisperX timing alignment. Raw audio is not sent to the AI scoring provider; the resulting transcript and aggregate timing evidence can be included in the scoring request. Temporary audio is deleted after local processing and the page buffer is discarded when the page/session is cleared. Browser recognition may still process the same speech as described above. |
| Free-chat history | Conversation text is saved locally so a conversation can be resumed. You can delete individual conversations from the History panel. |
| Exam memory | Completed scoring reports and the assessable Part 1–3 text transcript are saved locally to show past attempts, averages, and a long-term focus area. The identity-check exchange and raw audio are not stored in exam memory. |
| Text-to-speech | Bundled Kokoro mode sends reply text only to the Software's loopback backend and synthesizes audio locally with the installed model. Windows mode uses a system voice; browser mode depends on the browser implementation. If you explicitly enable Azure Speech, character reply text is sent to Microsoft for synthesis. The Azure key remains in the local backend configuration and the page receives only a short-lived authorization token. Microsoft's terms, billing, retention, and privacy rules apply. |

### Azure Speech costs

Azure Speech is optional and uses the user's own Microsoft Azure resource; this
project does not provide, resell, or collect payment for the service. At the
time of this notice, Microsoft's Free (F0) tier includes 500,000 neural
text-to-speech characters per month and allows 20 real-time synthesis
transactions per 60 seconds. Standard (S0) usage is metered by synthesized
characters, with prices depending on region, currency, and account agreement.
Microsoft states that a request can still be billable when the chosen voice
language does not match the input and speech is not produced. Allowances and
prices can change. Check the [official Azure Speech pricing page](https://azure.microsoft.com/pricing/details/speech/)
and configure Azure Cost Management budgets or alerts before enabling it.

### Local storage and retention

Preferences are stored in browser local storage until cleared. AI and Whisper
configuration files are stored in the application's writable configuration
directory. The installed Windows build uses the user's Local App Data folder;
the source/development build currently uses the backend project directory.
Active exam and chat sessions are held by the running local backend. Free-chat
history and completed exam memory are intentionally retained in local JSON files
until you delete them or remove the application's local data. There is no cloud
sync or user account provided by this project.

The project author does not receive this local data merely because you run the
Software. A third-party provider can receive the data described above when you
use its feature. Review that provider's policy and avoid sending data you are not
authorised to disclose.

### Your controls

You can deny microphone permission, use typed input where available, choose
local Whisper instead of browser recognition, choose a locally hosted compatible
AI endpoint such as Ollama, clear browser site data, remove local configuration,
or stop using the Software. Removing local files does not delete copies already
sent to a third-party provider; contact that provider for its access/deletion
process.

### Security and minors

No transmission or storage method is completely secure. Keep your device and
provider credentials protected. The Software is not designed to knowingly
collect children's personal information. A minor should use it only with the
involvement of a parent, guardian, or responsible educator and should not submit
personal or sensitive information.

## 中文

### 本软件处理哪些数据

- 用户主动开始录音期间的麦克风音频；
- 当前会话所需的语音识别文本、键入回答和对话历史；
- AI 生成的回复及预估评分报告；
- 界面语言、训练语言、Live2D 视线、教程状态和 Whisper 设置等本地偏好；
- 用户在“设置”中填写的 AI 服务商配置。

本软件不会要求 IELTS 考生号、护照、身份证件、银行卡或官方考试记录。请勿在练习回答或聊天
中输入此类信息。

### 数据去向

| 功能 | 处理方式与去向 |
|---|---|
| AI 对话与评分 | 必要文本和会话上下文经本地后端发送至“设置”中选择的 AI 接口；适用该服务商自己的隐私政策和保留规则。 |
| 浏览器语音识别 | 视浏览器或操作系统的实现方式，音频可能由其厂商处理并离开本机。 |
| 本地 Whisper 与可选增强分析 | 录音仅发送至本软件的本地后端；音频通过临时文件转换并在本机转写或进行时间对齐，处理后删除临时文件。增强分析用于提供语速、停顿等时间证据，并不独立判断发音质量。下载模型时会连接相应模型托管方。 |
| 考试录音与评分分析 | 考试进行期间，录音仅暂存在页面内存中，不会影响 Part 3 出题或考试状态转换。考试结束后，如启用本地考试分析，各段回答录音仅上传至本地后端，由 Whisper 转写并可选使用 WhisperX 进行时间对齐。原始音频不会发送给 AI 评分服务商，但所得转写文本及汇总时间指标可加入评分请求；本地处理后删除临时音频，页面或会话清除后丢弃页面缓冲。浏览器语音识别仍可能按上一项处理同一段语音。 |
| 自由对话历史 | 对话文字保存在本地，以便恢复会话；可在“历史对话”面板逐条删除。 |
| 考试记忆 | 完成后的评分报告及可评分的 Part 1–3 文字记录保存在本地，用于展示历次考试、平均表现与长期薄弱项；身份核验对话和原始音频不会写入考试记忆。 |
| 文字转语音 | 浏览器模式使用浏览器或操作系统提供的语音，是否联网取决于其具体实现。若你主动启用 Azure Speech，角色回复文本会发送给 Microsoft 合成语音；Azure 密钥保留在本地后端配置中，页面只获取短期授权令牌，并适用 Microsoft 自己的条款、计费、数据保留和隐私规则。 |

### Azure Speech 费用须知

Azure Speech 是可选功能，使用用户自己的 Microsoft Azure 资源；本项目不提供、转售该服务，
也不代收费用。编写本说明时，Microsoft 免费 F0 层每月包含 50 万个神经文字转语音字符，
实时合成限制为每 60 秒 20 次；标准 S0 按合成字符计量，实际单价取决于区域、币种和账户
协议。Microsoft 说明：如果所选音色语言与输入文本不匹配，即使未正常生成语音，请求仍
可能计费。额度和价格可能发生变化。启用前请查看
[Azure Speech 官方价格页](https://azure.microsoft.com/pricing/details/speech/)，并在 Azure Cost Management 中设置预算或费用提醒。

### 本地存储与保留

偏好设置保存在浏览器本地存储中，直至用户清除。AI 和 Whisper 配置文件保存在应用的可写配置
目录；Windows 安装版使用用户的 Local App Data 目录，源码/开发版目前使用后端项目目录。考试
当前考试与聊天会话由运行中的本地后端维护。自由对话历史和已完成的考试记忆会有意保留在本地
JSON 文件中，直至用户逐条删除或移除应用本地数据。本项目不提供云同步或用户账户。

仅仅运行本软件不会把这些本地数据发送给项目作者。使用第三方功能时，相应服务商可能收到上述
数据。请先阅读其政策，不要发送你无权披露的信息。

### 用户控制

你可以拒绝麦克风权限、在支持时改用键盘输入、以本地 Whisper 替代浏览器语音识别、选择
Ollama 等本地兼容 AI 接口、清除浏览器站点数据、删除本地配置或停止使用本软件。删除本地文件
不会删除已发送给第三方服务商的副本；相关访问或删除请求需按该服务商的流程提出。

### 安全与未成年人

任何传输或存储方式都无法保证绝对安全，请保护设备和服务商凭据。本软件并非以主动收集儿童
个人信息为目的；未成年人应在家长、监护人或负责教师参与下使用，且不应提交个人或敏感信息。
