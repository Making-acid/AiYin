# IELTS Speaking Practice — AI

雅思口语智能陪练助手。模拟完整雅思口语考试流程（Part 1 → Part 2 → Part 3 → 评分报告），支持 AI 自由对话。

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

首次使用需在页面 **Settings** 中配置 LLM API Key（支持 DeepSeek / OpenAI / Groq / OpenRouter / Ollama）。

---

## 项目结构 (v0.5)

```
IELTS/
├── frontend/                          # React 19 + Vite 8 + TypeScript
│   └── src/
│       ├── api/                       # API 客户端（按域拆分）
│       │   ├── client.ts              # Axios 实例
│       │   ├── config.ts              # LLM 配置 API
│       │   ├── exam.ts                # 考试 API
│       │   └── chat.ts                # 聊天 API
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
│       │   ├── useSpeechSynthesis.ts  # TTS（Web Speech API）
│       │   └── useDualRecording.ts    # 录音 + 浏览器 ASR 双重采集
│       └── pages/                     # 页面
│           ├── Home.tsx / Exam.tsx / FreeChat.tsx
│           ├── Report.tsx / Settings.tsx
│
├── backend/                           # Python FastAPI
│   ├── app/
│   │   ├── main.py                    # 入口
│   │   ├── api/                       # 路由层
│   │   │   ├── exam.py                # 考试端点
│   │   │   ├── chat.py                # 聊天端点
│   │   │   ├── config.py              # 配置端点
│   │   │   └── whisper.py             # Whisper ASR 端点（可选）
│   │   ├── models/
│   │   │   └── schemas.py             # Pydantic 请求/响应模型
│   │   ├── services/                  # 业务逻辑
│   │   │   ├── llm_service.py         # LLM 客户端
│   │   │   ├── exam_service.py        # 会话管理 + 考试状态机
│   │   │   ├── scoring_service.py     # 评分报告生成
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

## 打包 EXE

```bash
# 1. 构建前端（relative URL）
cd frontend
$env:VITE_API_BASE=""; npm run build

# 2. 复制到 backend/static
Remove-Item -Recurse -Force backend\static -ErrorAction SilentlyContinue
Copy-Item -Recurse frontend\dist backend\static

# 3. PyInstaller 打包
cd backend
pyinstaller --onedir --name "IELTS Speaking v0.5.0" --add-data "static;static" run.py

# 4. 复制数据
Copy-Item -Recurse data "dist\IELTS Speaking v0.5.0\data"
```

打包安装包：准备好 EXE 文件夹后运行 `ISCC.exe setup.iss`。

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
| `GET` | `/whisper/config` | Whisper 配置 |
| `POST` | `/whisper/config` | 更新 Whisper 配置 |
| `GET` | `/whisper/models` | 模型列表 |
| `POST` | `/whisper/models/download` | 下载模型 |
| `POST` | `/whisper/transcribe` | 音频转录 |

---

## 技术栈

| 层 | 技术 |
|------|------|
| 前端 | React 19 / Vite 8 / TypeScript / React Router 7 / PixiJS 6 |
| 后端 | FastAPI / Uvicorn / OpenAI SDK |
| LLM | DeepSeek V4 / OpenAI / Groq / OpenRouter / Ollama |
| ASR | Web Speech API / faster-whisper (9 模型) |
| TTS | Web Speech API (Edge 自然语音) |
| 打包 | PyInstaller / Inno Setup |
| 运维 | Docker + Docker Compose |

---

## 许可证

项目代码采用 [MIT License](./LICENSE)。题目、角色模型、商标及其他第三方材料不当然包含在 MIT 授权范围内。

本软件使用了 Live2D Cubism SDK、faster-whisper、OpenAI SDK 等第三方组件，各组件版权及许可证详见 [NOTICE.md](./NOTICE.md)。

AI 生成的评分和反馈仅供练习参考，不构成官方 IELTS 成绩。本项目与 British Council、IDP Education、Cambridge University Press & Assessment 或任何 IELTS 考点无官方关联。使用前请阅读 [免责声明与使用条款](./DISCLAIMER.md) 及 [隐私说明](./PRIVACY.md)。
