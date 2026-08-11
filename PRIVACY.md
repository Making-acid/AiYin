# Privacy Notice / 隐私说明

Effective date: 11 August 2026
生效日期：2026 年 8 月 11 日

This notice describes the current v0.5.0 desktop/local-web build. A modified or
hosted deployment may behave differently. / 本说明适用于当前 v0.5.0 桌面版及本地网页版本；
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
| Local Whisper | Recorded audio is sent only to the Software's local backend. It is converted in a temporary file, transcribed locally, and the temporary file is deleted after processing. Model downloads contact the model host. |
| Exam recording buffer | The current build keeps captured exam audio only in page memory and does not include it in AI requests or reports. It is discarded when the page/session is cleared. Browser recognition may still process the same speech as described above. |
| Text-to-speech | The browser or operating system supplies the voice. Network use depends on the selected voice implementation. |

### Local storage and retention

Preferences are stored in browser local storage until cleared. AI and Whisper
configuration files are stored in the application's writable configuration
directory. The installed Windows build uses the user's Local App Data folder;
the source/development build currently uses the backend project directory.
Exam and chat sessions are held temporarily by the running local backend and are
not designed as a permanent account history. Closing/restarting the application,
session expiry, or clearing browser/site data may remove them.

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
| 本地 Whisper | 录音仅发送至本软件的本地后端；音频通过临时文件转换并在本机转写，处理后删除临时文件。下载模型时会连接模型托管方。 |
| 考试录音缓冲 | 当前版本仅在页面内存中暂存考试录音，不会把音频加入 AI 请求或报告；页面或会话清除后即丢弃。浏览器语音识别仍可能按上一项处理同一段语音。 |
| 文字转语音 | 语音由浏览器或操作系统提供；是否联网取决于所选语音的具体实现。 |

### 本地存储与保留

偏好设置保存在浏览器本地存储中，直至用户清除。AI 和 Whisper 配置文件保存在应用的可写配置
目录；Windows 安装版使用用户的 Local App Data 目录，源码/开发版目前使用后端项目目录。考试
与聊天会话由运行中的本地后端临时保存，并非永久账户历史；关闭或重启应用、
会话过期或清除浏览器站点数据后可能被删除。

仅仅运行本软件不会把这些本地数据发送给项目作者。使用第三方功能时，相应服务商可能收到上述
数据。请先阅读其政策，不要发送你无权披露的信息。

### 用户控制

你可以拒绝麦克风权限、在支持时改用键盘输入、以本地 Whisper 替代浏览器语音识别、选择
Ollama 等本地兼容 AI 接口、清除浏览器站点数据、删除本地配置或停止使用本软件。删除本地文件
不会删除已发送给第三方服务商的副本；相关访问或删除请求需按该服务商的流程提出。

### 安全与未成年人

任何传输或存储方式都无法保证绝对安全，请保护设备和服务商凭据。本软件并非以主动收集儿童
个人信息为目的；未成年人应在家长、监护人或负责教师参与下使用，且不应提交个人或敏感信息。
