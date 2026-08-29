# 爱音

> 利用 AI 与 Live2D 进行轻松愉快的口语训练。

爱音（AiYin）是一款面向 Windows 的本地桌面口语练习工具。你可以和 Mao 自由聊天，也可以由 Haru 陪你完成一场结构化的雅思口语模拟，并在模拟结束后查看非官方练习报告。

![Mao 正在进行自由对话](frontend/public/media/mao-speaking-v0.6.png)

> 本项目是独立开发的练习工具，不提供官方 IELTS 考试、报名或成绩，与 British Council、IDP Education、Cambridge University Press & Assessment 及任何 IELTS 考点均无隶属或认可关系。AI 评分只能用于练习参考。

## 下载与使用

普通用户请从 GitHub 的 [Releases](https://github.com/Making-acid/爱音/releases) 下载最新安装包。安装版面向 Windows 10/11 x64，并保留原安装器 AppId，可覆盖升级旧版；正常覆盖安装不会主动删除本地配置、聊天记录和历史模拟报告。

首次使用：

1. 打开“选项”，选择 AI 服务商并填写自己的 API Key。
2. 根据电脑配置选择预装的 Whisper Small English 或 Medium English。
3. 先在“自由聊天”中测试麦克风和角色声音。
4. 进入“雅思模拟”完成 Part 1、Part 2 和 Part 3，结束后生成练习报告。

详细步骤、常见问题与故障排查请阅读[中文用户指南](docs/user/README.md)。安装版也可以从首页 Q&A 或“选项 → 帮助”打开离线指南。

## 主要能力

- **雅思模拟**：按 Part 1、Part 2、Part 3 推进；考试流程与评分流程分离，Part 3 不读取现场分数。
- **自由聊天**：与 Mao 进行无评分的口语对话，并在本机保存历史记录。
- **历史报告**：本地保存已生成的模拟报告，展示历次成绩、平均表现与长期薄弱项。
- **本地语音识别**：安装包预装 Whisper Small English、Medium English 与 WhisperX 英文对齐模型；正式模拟无需临时下载。
- **多层语音输出**：支持 Azure Speech、内置 Kokoro、Windows 系统语音与浏览器语音，并统一提供音量控制和兼容性回退。
- **Live2D 角色**：Haru 与 Mao 使用相互独立的角色配置、布局和行为模块，采用视频通话式半身构图。
- **本地优先**：配置、自由聊天和历史模拟报告保存在当前 Windows 用户目录；第三方 AI 与 Azure 的数据边界详见隐私说明。

## 使用须知

- AI 对话和评分通常需要用户自行准备 DeepSeek、OpenAI、Groq、OpenRouter 或兼容服务的 API Key；本软件不附送 Key，也不代收相关费用。
- Azure Speech 是可选云服务，使用用户自己的 Azure 账户并可能产生费用；不了解时可以使用内置 Kokoro。
- 预装模型可以离线使用。只有主动下载其他模型时才需要访问外部模型托管方，部分网络环境可能受限。
- 不要输入身份证件、准考证号、支付信息、机密信息或无权披露的内容。

请同时阅读[免责声明与使用条款](DISCLAIMER.md)、[隐私说明](PRIVACY.md)、[第三方声明](NOTICE.md)和[许可证](LICENSE)。

## 致谢

感谢 OpenCode 和 Codex，没有你们，我不可能完成这项任务。

感谢微软、OpenAI、Live2D 以及其他一切开源项目的帮助，并衷心赞美此前开源社区的开发者们。你们是开源世界的榜样，是我愿意一生追随的优秀先行者。

## 开发者文档

- [开发者指南](docs/developer/README.md)：架构边界、开发环境、测试与发行流程。
- [WebView2 桌面宿主说明](desktop/README.md)：桌面生命周期、权限与构建参数。
- [前端说明](frontend/README.md)：React 前端目录、命令和约束。
- [文档中心](docs/README.md)：用户文档与开发者文档的分类入口。

### 源码开发

环境要求：Node.js 18+、Python 3.9+；桌面宿主还需要 .NET 10 SDK，安装包需要 Inno Setup。

```powershell
# 后端
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000

# 前端（另开终端）
cd frontend
npm install
npm run dev
```

前端默认地址为 `http://127.0.0.1:5173`，开发服务器会把 API 请求代理到本地后端。也可以在项目根目录运行 `start.bat`，或使用 `docker compose up --build` 启动网页版本。

### 质量检查

```powershell
cd frontend
npm run build
npm run lint

cd ..\backend
python -m pytest tests -q

cd ..
dotnet build desktop\IELTSSpeaking.Desktop\IELTSSpeaking.Desktop.csproj --configuration Release
```

### 架构摘要

```text
frontend/                 React、TypeScript、Live2D、ASR/TTS 交互
backend/app/api/          FastAPI 路由层
backend/app/services/     考试、评分、记忆、LLM、ASR 与 TTS 服务层
backend/data/             结构化题库、提示词与评分标准
desktop/                  WinForms + WebView2 桌面宿主和发布脚本
docs/                     用户与开发者文档
```

WebView2 只负责桌面生命周期、权限、导航和本地后端进程管理；React 负责界面交互，FastAPI 服务层负责考试、对话、语音与持久化。考试状态机和评分服务必须保持分离，WhisperX 只可用于考后增强分析。

生成 Windows 发行版：

```powershell
.\desktop\build-webview-release.ps1
```

产物会写入仓库外的 `AiYin-WebView2-Beta-1.3-Release`，不会污染源码目录。`AppStage` 是完整便携版目录，不能只分发其中单个 EXE；`Installer` 中为覆盖安装包。

## 许可证与第三方内容

项目代码采用 [MIT License](LICENSE)。Live2D Cubism SDK、Haru、Niziiro Mao、题库内容、模型权重、商标和其他第三方材料分别受其自身条款约束，不当然包含在 MIT 授权范围内。发布或再分发前请完整阅读 [NOTICE.md](NOTICE.md)。
