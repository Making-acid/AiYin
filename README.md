# IELTS Speaking Practice — AI

## 用户使用

### 安装方式

**方式 A：安装包**（推荐）
- 运行 `IELTS-Speaking-v0.3-Setup.exe`，按向导安装
- 桌面自动生成快捷方式，双击启动

**方式 B：便携版**
- 解压 ZIP，双击 `IELTS Speaking v0.3.exe`
- 命令行窗口显示启动信息，浏览器自动打开

### 配置 API Key

首次使用需配置 LLM API Key：
1. 打开页面后点击 **Settings**
2. Provider 选择模型供应商
3. 填入 API Key
4. 点击 **Save Configuration**

### 语音输入

| 方式 | 说明 |
|------|------|
| **浏览器 ASR**（默认） | Chrome/Edge 内置语音识别，无需额外配置 |
| **Whisper 本地 ASR** | Settings → Whisper → Enabled → 选择模型（已内置 small） |

### 功能

| 模式 | 说明 |
|------|------|
| **Exam Mode** | 模拟完整雅思口语考试（Part 1 → Part 2 → Part 3 → 评分报告）|
| **Free Chat** | AI 英语自由对话，不评分 |

---

## FAQ

**Q: 启动后浏览器没有自动打开？**
A: 手动访问 `http://localhost:8000`

**Q: AI 不回复？**
A: 检查 Settings 中 API Key 是否已配置、余额是否充足

**Q: 端口被占用？**
A: 检查是否已有程序占用 8000 端口

---

## 开发者文档

### 项目结构 (v0.3)

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
│       │   └── _template.ts           # 新语言模板
│       ├── components/                # UI 组件
│       │   ├── VoiceInput.tsx         # 语音输入（只依赖 useAsr()）
│       │   ├── Live2DCharacter.tsx    # Live2D 渲染（不含 i18n）
│       │   ├── ChatBubble.tsx
│       │   └── Timer.tsx
│       ├── hooks/
│       │   └── useSpeechSynthesis.ts  # TTS（非 ASR）
│       └── pages/                     # 页面
│           ├── Home.tsx / Exam.tsx / FreeChat.tsx
│           ├── Report.tsx / Settings.tsx
│
├── backend/                           # Python FastAPI
│   ├── app/
│   │   ├── main.py                    # 入口 + 条件注册 Whisper 路由
│   │   ├── api/                       # 路由层
│   │   │   ├── exam.py                # 考试端点
│   │   │   ├── chat.py                # 聊天端点
│   │   │   ├── config.py              # 配置端点
│   │   │   └── whisper.py             # Whisper ASR 端点（可选）
│   │   ├── models/
│   │   │   └── schemas.py             # 全部 Pydantic 请求/响应模型
│   │   ├── services/                  # 业务逻辑
│   │   │   ├── llm_service.py         # LLM 客户端
│   │   │   ├── exam_service.py        # 会话管理 + 考试状态机
│   │   │   ├── scoring_service.py     # 评分报告生成
│   │   │   ├── data_loader.py         # 题库加载
│   │   │   ├── config_service.py      # LLM 配置 CRUD
│   │   │   └── whisper_service.py     # Whisper 模型 + 转录
│   │   └── core/
│   │       └── config.py              # 环境变量设置
│   ├── data/                          # 数据文件
│   │   ├── exams.json                 # 考试注册表
│   │   └── exams/
│   │       ├── ielts/                 # IELTS（完整）
│   │       │   ├── meta.json          # 考试配置
│   │       │   ├── dialogs.json       # 考官过渡台词
│   │       │   ├── prompts/           # AI 提示词
│   │       │   ├── questions/         # 题库
│   │       │   └── rubrics/           # 评分标准
│   │       ├── toefl/                 # TOEFL（规划中）
│   │       └── _template/             # 新考试模板
│   └── models/whisper/                # Whisper 模型文件
│       ├── small/                     # 内置 small 模型
│       ├── tiny/ base/ ... large-v3/  # 可选下载
│       └── MODELS_README.txt
│
├── docker-compose.yml
├── start.bat                          # Windows 一键启动
└── .env                               # 环境变量（API Key）
```

### 本地开发

**依赖**：Python 3.9+ / Node.js 18+

```bash
# 后端
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 前端
cd frontend
npm install
npm run dev
```

- 后端：`http://localhost:8000`
- 前端：`http://localhost:5173`（Vite 开发服务器，反向代理到后端）

### Docker

```bash
cp .env.example .env
docker compose up --build
```

### 添加新考试

1. 复制 `backend/data/exams/_template/` → `exams/{exam_id}/`
2. 填写 `meta.json`、`prompts/`、`questions/`、`rubrics/`、`dialogs.json`
3. 在 `exams.json` 注册新考试
4. 重启服务，系统自动加载

### 添加新语言

1. 复制 `frontend/src/i18n/_template.ts` → `{lang_code}.ts`
2. 翻译所有值
3. 在 `i18n/index.tsx` 注册新语言

### 打包 EXE

```bash
# 1. 构建前端（relative URL）
cd frontend
$env:VITE_API_BASE=""; npm run build

# 2. 复制到 backend/static
Remove-Item -Recurse -Force backend\static -ErrorAction SilentlyContinue
Copy-Item -Recurse frontend\dist backend\static

# 3. PyInstaller 打包
cd backend
pyinstaller --onedir --name "IELTS Speaking v0.3" --add-data "static;static" run.py

# 4. 复制数据 + 模型
Copy-Item -Recurse data "dist\IELTS Speaking v0.3\data"
# 模型目录结构已通过 PLACEHOLDER.txt 管理，如需内嵌模型需手动复制
```

### 打包安装包（Inno Setup）

1. 准备好 EXE 文件夹
2. 运行 `ISCC.exe setup.iss`（脚本示例见项目根目录）

### API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/health` | 健康检查 |
| `GET` | `/config` | 获取 LLM 配置 |
| `POST` | `/config` | 保存 LLM 配置 |
| `GET` | `/config/providers` | 可用模型供应商 |
| `GET` | `/exam/exams` | 考试列表 |
| `POST` | `/exam/start` | 开始考试 `{"exam_id":"ielts"}` |
| `POST` | `/exam/answer` | 提交答案 `{"session_id":"...","answer":"..."}` |
| `GET` | `/exam/report/{id}` | 获取评分报告 |
| `POST` | `/chat/start` | 开始自由聊天 |
| `POST` | `/chat/send` | 发送聊天消息 |
| `GET` | `/whisper/config` | Whisper 配置 |
| `POST` | `/whisper/config` | 更新 Whisper 配置 |
| `GET` | `/whisper/models` | 模型列表 |
| `POST` | `/whisper/models/download` | 下载模型 |
| `POST` | `/whisper/transcribe` | 音频转录 |

### 技术栈

| 层 | 技术 |
|------|------|
| 前端 | React 19 / Vite 8 / TypeScript / React Router 7 / PixiJS 6 |
| 后端 | FastAPI / Uvicorn / OpenAI SDK |
| LLM | DeepSeek V4 / OpenAI / Groq / OpenRouter / Ollama |
| ASR | Web Speech API / faster-whisper (9 模型) |
| TTS | Web Speech API (Edge 自然语音) |
| 打包 | PyInstaller / Inno Setup |
| 运维 | Docker + Docker Compose |
