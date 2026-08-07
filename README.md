# guitar
吉他和弦转换练习

## ⚠️ 运行方式（重要）
浏览器禁止在 `file://`（直接双击 HTML）下通过 `fetch` 读取本地文件，因此**必须用本地 HTTP 服务器打开**，真实采样才能正常加载。

### 方式一：一键启动脚本（推荐）
- macOS / Linux：终端运行 `./start.sh`（或 `bash start.sh`），默认访问 http://localhost:8000
- Windows：双击 `start.bat`

### 方式二：命令行
```bash
cd src/practice
python3 -m http.server 8000
```
浏览器访问 http://localhost:8000

### 方式三：VS Code Live Server
1. 安装 “Live Server” 插件；
2. 打开 `src/practice/index.html`，右键 → “Open with Live Server”。

## 功能
- 8 个大调（C / G / D / A / E / F / Bb / Eb）× 13 个和弦，共 104 个，全部经过音高校验
- 播放方式：真实采样（tonejs-instruments 吉他采样），三种音色：尼龙弦 / 民谣钢弦 / 电吉他，本地打包于 `src/practice/audio/samples/`
- 任务可配置：转换模式、速度、预览、显示内容（基本属性 / 详细解析 / 分解和弦）


