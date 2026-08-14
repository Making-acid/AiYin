# WebView2 桌面宿主开发说明

本目录只处理原生桌面职责。React 前端与 FastAPI 后端仍是产品行为的来源。普通用户请阅读[中文用户指南](../docs/user/README.md)。

## 开发运行

先在 `frontend/` 执行 `npm run build`，然后从仓库根目录运行：

```powershell
dotnet run --project desktop/IELTSSpeaking.Desktop
```

宿主会寻找 `backend/run.py`，在系统分配的本地回环端口启动后端，等待 `/health` 成功后再打开 WebView2。

- `IELTS_WEBVIEW_DEVTOOLS=1`：开发运行时开启开发者工具。
- `IELTS_WEBVIEW_DIAGNOSTICS_FILE=<路径>`：把首次导航后的录音能力探测结果写入 JSON。
- 打包后端应位于桌面 EXE 同级的 `backend/` 目录中。

## 发布构建

```powershell
.\desktop\build-webview-release.ps1
```

脚本会把正式发布目录、中间文件、微软 WebView2 Evergreen 引导程序和 Inno Setup 安装包写入仓库外的 `IELTS-Speaking-WebView2-Beta-1.1-Release`。使用 `-SkipInstaller` 可只生成应用目录。

## 运行边界

- WebView2 只允许当前 `http://127.0.0.1:<动态端口>` 应用来源。
- 外部 HTTP(S) 链接交给系统浏览器。
- 麦克风只授权给本地应用来源，摄像头默认拒绝。
- WebView2 配置保存在 `%LOCALAPPDATA%\IELTS Speaking\WebView2`。
- 关闭或重启窗口时回收整个后端进程树；Windows Job Object 负责异常退出兜底。

完整架构、测试和版本要求见[中文开发者指南](../docs/developer/README.md)。
