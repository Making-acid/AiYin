# 前端开发说明

本目录是 IELTS Speaking 的 React + TypeScript + Vite 前端。普通用户无需在此执行任何命令，请阅读[中文用户指南](../docs/user/README.md)。

## 开发命令

```powershell
npm install
npm run dev
npm run build
npm run lint
```

- `npm run dev`：启动开发服务器。
- `npm run build`：执行 TypeScript 检查并生成 `dist/`。
- `npm run lint`：运行 Oxlint。

## 目录职责

- `src/pages/`：页面。
- `src/components/`：通用界面组件。
- `src/live2d/`：角色无关渲染、状态执行和独立角色定义。
- `src/asr/`：浏览器识别、Whisper 与录音入口。
- `src/i18n/`：中文和英文界面文本；首次默认语言为中文，用户选择保存在本机。
- `src/content/`：面向用户的结构化内容，例如首页 Q&A。
- `public/help/`：安装版可离线访问的用户文档。

完整架构、测试和发布要求见[开发者指南](../docs/developer/README.md)。
