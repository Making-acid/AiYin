# IELTS Speaking Practice — AI

雅思口语智能陪练助手。模拟完整雅思口语考试流程（Part 1 → Part 2 → Part 3 → 评分报告），支持 AI 自由对话。

![Mao 正在进行自由对话](frontend/public/media/mao-speaking-v0.6.png)

> 图中 Mao 为 Live2D Sample Data 衍生的 AI 生成发布插图；角色及衍生素材不包含在本项目代码的 MIT 授权中，详见 [NOTICE.md](./NOTICE.md)。

应用图标以“正在说话的 Mao”为主题，并已应用到网页、Windows EXE、安装器、桌面快捷方式和卸载项。

## 文档导航

- **普通用户**：[中文用户指南](docs/user/README.md)；安装版也可在首页 Q&A 或“设置 → 帮助”中打开离线指南。
- **开发者与贡献者**：[中文开发者指南](docs/developer/README.md)。
- **文档总目录**：[用户文档与开发者文档分类](docs/README.md)。
- **法律与隐私**：[免责声明](DISCLAIMER.md)、[隐私说明](PRIVACY.md)与[第三方声明](NOTICE.md)。

## Beta 1.1.1 重点

- 考试流程与评分彻底分离：Part 3 由考官现场追问，考试结束后才生成评估。
- 自由对话支持本地历史记录；考试模式保存本地 memory，便于查看长期表现。
- 可选 WhisperX 只参与考后时间对齐和流利度证据，绝不介入 Part 3 出题或状态机。
- Azure、随安装包提供的离线 Kokoro 神经语音、Windows 系统语音与浏览器 TTS 分层回退；Azure viseme 可驱动 Live2D 口型。
- Haru 与 Mao 使用独立角色定义、布局和行为配置，均采用更接近视频通话的半身构图。

## 快速开始

**Windows 用户**：双击运行根目录下的 `start.bat`，脚本会自动安装依赖、启动后端和前端、打开浏览器。

启动后访问 `http://localhost:5173`。

**macOS / Linux** 或 **Docker**：

```bash
docker compose up --build
```

**手动启动**（需要 Python 3.9+ / Node.js 18+）：

```bash
# 后端
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 前端（新终端）
cd frontend
npm install
npm run dev
```

### 可选：WhisperX 考后增强分析

WhisperX 只在考试结束后用于词级时间对齐和流利度时间证据，不参与 Part 3 出题或考试状态机。默认依赖仍使用 faster-whisper；如需启用 WhisperX，请使用 Python 3.10–3.13，并额外安装：

```powershell
pip install -r backend/requirements-whisperx.txt
python -m nltk.downloader punkt_tab
```

未安装、版本不兼容或处理失败时，评分会自动回退到 faster-whisper；若本地 Whisper 模型也不可用，则继续使用考试现场的浏览器转写。

首次使用需在页面 **Settings** 中配置 LLM API Key（支持 DeepSeek / OpenAI / Groq / OpenRouter / Ollama）。

---

## 项目结构（Beta 1.1.1）

```
IELTS/
├── frontend/                          # React 19 + Vite 8 + TypeScript
│   └── src/
│       ├── api/                       # API 客户端（按域拆分）
│       │   ├── client.ts              # Axios 实例
│       │   ├── config.ts              # LLM 配置 API
│       │   ├── exam.ts                # 考试 API
│       │   ├── chat.ts                # 聊天 API
│       │   └── tts.ts                 # Azure Speech 配置与令牌 API
│       ├── asr/                       # ASR 独立模块
│       │   ├── AsrProvider.tsx         # 统一 ASR 上下文（browser/whisper 切换）
│       │   ├── browserAsr.ts          # 浏览器 Web Speech API
│       │   ├── whisperAsr.ts          # Whisper 录音 + 转录
│       │   ├── whisperConfig.ts       # Whisper 配置管理
│       │   ├── AsrIndicator.tsx       # 状态指示器
│       │   └── AsrSettings.tsx        # 设置面板
│       ├── i18n/                      # 国际化独立模块
│       │   ├── index.tsx              # AppProvider + useLanguage + useLive2DBehavior
│       │   ├── en.ts / zh.ts          # 语言包
│       │   ├── trainingLang.tsx       # 训练语言上下文
│       │   └── _template.ts           # 新语言模板
│       ├── components/                # UI 组件
│       │   ├── VoiceInput.tsx         # 语音输入（依赖 useAsr()）
│       │   ├── ChatBubble.tsx
│       │   └── Timer.tsx
│       ├── live2d/                    # Live2D 通用渲染 + 独立角色模块
│       │   ├── Live2DCharacter.tsx    # 角色无关的 PixiJS 渲染引擎
│       │   ├── types.ts               # 角色定义与布局接口
│       │   ├── stateMachine.ts        # 通用状态机
│       │   ├── stateRunner.ts         # 状态驱动（表情/动作/嘴型）
│       │   └── characters/
│       │       ├── haru/              # Haru 模型、布局和行为配置
│       │       └── mao/               # Mao 模型、布局和行为配置
│       ├── hooks/
│       │   ├── useSpeechSynthesis.ts  # 浏览器 TTS
│       │   ├── useCharacterSpeech.ts  # 浏览器/Azure TTS 与 Live2D 口型
│       │   └── useDualRecording.ts    # 录音 + 浏览器 ASR 双重采集
│       └── pages/                     # 页面
│           ├── Home.tsx / Exam.tsx / FreeChat.tsx
│           ├── Report.tsx / Settings.tsx / Memory.tsx
│           └── AzureSpeechHelp.tsx     # Azure 配置、收费与隐私帮助
│
├── backend/                           # Python FastAPI
│   ├── app/
│   │   ├── main.py                    # 入口
│   │   ├── api/                       # 路由层
│   │   │   ├── exam.py                # 考试端点
│   │   │   ├── chat.py                # 聊天端点
│   │   │   ├── config.py              # 配置端点
│   │   │   ├── whisper.py             # Whisper ASR 端点（可选）
│   │   │   └── tts.py                 # Azure Speech 端点（可选）
│   │   ├── models/
│   │   │   └── schemas.py             # Pydantic 请求/响应模型
│   │   ├── services/                  # 业务逻辑
│   │   │   ├── llm_service.py         # LLM 客户端
│   │   │   ├── exam_service.py        # 会话管理 + 考试状态机
│   │   │   ├── scoring_service.py     # 评分报告生成
│   │   │   ├── memory_store.py        # 本地聊天历史与考试记忆
│   │   │   ├── exam_audio_service.py  # 考后音频分析
│   │   │   ├── tts_service.py         # Azure Speech 本地配置
│   │   │   ├── data_loader.py         # 题库加载
│   │   │   ├── config_service.py      # LLM 配置 CRUD
│   │   │   ├── whisper_service.py     # Whisper 模型 + 转录
│   │   │   ├── session_manager.py     # 会话存储（TTL + 清理）
│   │   │   └── providers/             # LLM Provider 抽象
│   │   │       └── openai_compatible.py
│   │   └── core/
│   │       └── config.py              # 环境变量设置
│   ├── data/                          # 数据文件
│   │   ├── exams.json                 # 考试注册表
│   │   ├── providers.json             # 模型供应商预设
│   │   └── exams/
│   │       ├── ielts/                 # IELTS
│   │       │   ├── source/            # 题库原始 PDF（2026年5-8月新东方）
│   │       │   ├── meta.json          # 考试配置
│   │       │   ├── dialogs.json       # 考官过渡台词
│   │       │   ├── prompts/           # AI 提示词
│   │       │   ├── questions/         # 题库（43 P1 + 73 P2 + 10 P3 类）
│   │       │   └── rubrics/           # 评分标准
│   │       └── _template/             # 新考试模板
│   └── models/whisper/                # Whisper 模型文件
│       ├── small/                     # 内置 small 模型
│       ├── tiny/ base/ ... large-v3/  # 可选下载
│       └── MODELS_README.txt
│
├── docker-compose.yml
├── start.bat                          # Windows 一键启动
└── setup.iss                          # Inno Setup 打包脚本
```

---

## 添加新考试

1. 复制 `backend/data/exams/_template/` → `exams/{exam_id}/`
2. 填写 `meta.json`、`prompts/`、`questions/`、`rubrics/`、`dialogs.json`
3. 在 `exams.json` 注册新考试
4. 重启服务，系统自动加载

## 添加新语言

1. 复制 `frontend/src/i18n/_template.ts` → `{lang_code}.ts`
2. 翻译所有值
3. 在 `i18n/index.tsx` 注册新语言

---

## WebView2 桌面版与打包

Windows 桌面版使用原生 WinForms + Microsoft WebView2 承载现有 React 页面，业务仍由
FastAPI 后端负责。宿主为后端分配随机回环端口，只向本地应用来源授予麦克风权限，外部
链接交给系统浏览器；关闭窗口时会同步回收后端进程。

开发运行：

```powershell
cd frontend
npm.cmd run build
cd ..
dotnet run --project desktop/IELTSSpeaking.Desktop
```

生成完整发布目录与覆盖安装包：

```powershell
./desktop/build-webview-release.ps1
```

脚本会构建前端、冻结独立 Python 后端、发布自包含的 x64 .NET 桌面宿主、下载微软官方
Evergreen WebView2 引导程序，并调用 Inno Setup。全部产物写入仓库同级目录
`IELTS-Speaking-WebView2-Beta-1.1.1-Release`，不会进入源码目录。详见
[`desktop/README.md`](desktop/README.md)。

---

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/health` | 健康检查 |
| `GET` | `/config` | 获取 LLM 配置 |
| `POST` | `/config` | 保存 LLM 配置 |
| `GET` | `/config/providers` | 可用模型供应商 |
| `GET` | `/exam/exams` | 考试列表 |
| `POST` | `/exam/start` | 开始考试 |
| `POST` | `/exam/answer` | 提交答案 |
| `POST` | `/exam/advance` | 推进无需作答的考试过渡阶段 |
| `GET` | `/exam/report/{id}` | 获取评分报告 |
| `POST` | `/chat/start` | 开始自由聊天 |
| `POST` | `/chat/send` | 发送聊天消息 |
| `GET` | `/chat/sessions` | 本地自由对话历史 |
| `GET` | `/chat/sessions/{id}` | 恢复自由对话 |
| `DELETE` | `/chat/sessions/{id}` | 删除自由对话 |
| `GET` | `/exam/memory` | 考试记忆与长期表现汇总 |
| `GET` | `/exam/memory/{id}` | 单次考试记忆 |
| `DELETE` | `/exam/memory/{id}` | 删除单次考试记忆 |
| `DELETE` | `/config/local-memory` | 清空全部本地记忆 |
| `GET` | `/whisper/config` | Whisper 配置 |
| `POST` | `/whisper/config` | 更新 Whisper 配置 |
| `GET` | `/whisper/models` | 模型列表 |
| `POST` | `/whisper/models/download` | 下载模型 |
| `POST` | `/whisper/transcribe` | 音频转录 |
| `GET` | `/tts/config` | 获取语音提供方与 Azure 配置状态 |
| `POST` | `/tts/config` | 保存 Azure/Kokoro/Windows/浏览器语音配置 |
| `POST` | `/tts/azure-token` | 获取短期 Azure Speech 授权令牌 |
| `GET` | `/tts/local/status` | 检查内置 Kokoro 模型与运行时 |
| `POST` | `/tts/local/synthesize` | 经本地服务层生成 Kokoro WAV 音频 |

---

## 技术栈

| 层 | 技术 |
|------|------|
| 前端 | React 19 / Vite 8 / TypeScript / React Router 7 / PixiJS 6 |
| 后端 | FastAPI / Uvicorn / OpenAI SDK |
| LLM | DeepSeek V4 / OpenAI / Groq / OpenRouter / Ollama |
| ASR | Web Speech API / faster-whisper（9 模型）/ 可选 WhisperX 考后增强 |
| TTS | Azure Speech / 内置 Kokoro+sherpa-onnx / Windows SAPI / Web Speech API |
| 打包 | PyInstaller / Inno Setup |
| 运维 | Docker + Docker Compose |

---

## 许可证

项目代码采用 [MIT License](./LICENSE)。题目、角色模型、商标及其他第三方材料不当然包含在 MIT 授权范围内。

本软件使用了 Live2D Cubism SDK、faster-whisper、OpenAI SDK 等第三方组件，各组件版权及许可证详见 [NOTICE.md](./NOTICE.md)。

AI 生成的评分和反馈仅供练习参考，不构成官方 IELTS 成绩。本项目与 British Council、IDP Education、Cambridge University Press & Assessment 或任何 IELTS 考点无官方关联。使用前请阅读 [免责声明与使用条款](./DISCLAIMER.md) 及 [隐私说明](./PRIVACY.md)。
