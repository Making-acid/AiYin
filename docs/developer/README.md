# IELTS Speaking Beta 1.0 开发者指南

本文档面向参与开发、测试和发布的贡献者。普通用户请阅读[用户指南](../user/README.md)。

## 一、架构概览

- `frontend/`：React、TypeScript、Vite、PixiJS 与 Live2D 界面。
- `backend/`：FastAPI、考试状态机、LLM、ASR/TTS、本地记忆和评分。
- `desktop/`：WinForms + WebView2 原生桌面宿主。
- `backend/data/`：考试注册、题库、提示词和评分标准。
- `docs/`：按用户与开发者分类的文档。

WebView2 宿主只负责桌面生命周期、权限、导航和后端进程管理；产品行为仍由 React 与 FastAPI 实现。

## 二、开发环境

- Node.js 18 以上版本。
- Python 3.9 以上版本；可选 WhisperX 建议使用项目当前支持的 Python 版本。
- .NET 10 SDK，用于 WebView2 桌面宿主。
- Inno Setup 7，用于生成 Windows 安装包。

开发启动：

```powershell
# 后端
cd backend
python -m uvicorn app.main:app --reload --port 8000

# 前端（另一个终端）
cd frontend
npm install
npm run dev
```

## 三、质量检查

```powershell
cd frontend
npm run build
npm run lint

cd ..\backend
python -m pytest tests -q

cd ..
dotnet build desktop\IELTSSpeaking.Desktop\IELTSSpeaking.Desktop.csproj --configuration Release
```

提交前至少运行与改动相关的测试。涉及考试流程、评分边界、录音、文件迁移或桌面进程生命周期时，应增加针对性回归测试。

## 四、关键设计边界

- 考试流程与评分严格分离；Part 3 现场追问不得读取或生成现场分数。
- WhisperX 只做考后增强分析，不得侵入 Part 3 或考试状态机。
- Haru 与 Mao 的角色定义、布局和行为应保持独立模块。
- 配置、聊天历史和考试记忆写入用户目录，不写入安装目录。
- 桌面后端仅绑定 `127.0.0.1`，WebView2 麦克风权限只授予当前本地来源。
- 外部 HTTP(S) 链接交给系统浏览器，摄像头默认拒绝。

## 五、版本与发布

Beta 1.0 的内部语义版本为 `1.0.0-beta.1`。版本目前由测试约束在后端、前端、桌面项目、安装器和发布脚本之间保持一致。

```powershell
.\desktop\build-webview-release.ps1
```

发布脚本会在仓库外创建 `IELTS-Speaking-WebView2-Beta-1.0-Release`，其中：

- `AppStage/`：便携桌面发布目录，不能只复制其中一个 EXE。
- `Installer/`：Inno Setup 覆盖安装包。
- `Prerequisites/`：微软 WebView2 Evergreen 引导程序。
- `Build/` 与 `BackendStage/`：中间构建产物。

安装器必须保持既有 AppId，才能覆盖安装旧版本。正式分发前应检查版本属性、SHA-256、数字签名状态，并实际启动应用验证 `/health` 与退出后的进程清理。

## 六、文档维护

- 面向用户的说明以中文为主，避免假设读者懂 API、模型或命令行。
- 新增设置或第三方服务时，同步更新首页 Q&A、应用内用户指南、隐私说明和费用提示。
- 开发实现、构建参数和架构约束写入开发者文档，不混入普通用户的首次使用流程。
