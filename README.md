# guitar

吉他和弦练习合集：以首页为功能入口，各功能独立目录、独立页面，共享和弦知识库与音频采样。

## ⚠️ 运行方式（重要）
浏览器禁止在 `file://`（直接双击 HTML）下通过 `fetch` 读取本地文件，因此**必须用本地 HTTP 服务器打开**，真实采样才能正常加载。

### 方式一：一键启动脚本（推荐）
- macOS / Linux：终端运行 `./start.sh`（或 `bash start.sh`），默认访问 http://localhost:8000
- Windows：双击 `start.bat`

### 方式二：命令行
```bash
cd src
python3 -m http.server 8000
```
浏览器访问 http://localhost:8000

### 方式三：VS Code Live Server
1. 安装 “Live Server” 插件；
2. 打开 `src/index.html`，右键 → “Open with Live Server”。

## 项目结构
```
src/
├── index.html            # 首页（功能入口）
├── css/home.css          # 首页样式
├── shared/               # 跨功能共享层
│   ├── css/common.css    # 主题变量 + 通用组件（弹窗/抽屉/表单/toast/返回首页链接）
│   └── js/
│       ├── data.js       # 和弦知识库（调式/和弦/指法/分解和弦/扫弦节奏）
│       └── audio.js      # 吉他真实采样播放器（三种音色）
└── chord-switch/         # 功能一：吉他和弦转换练习
    ├── index.html
    ├── css/style.css     # 功能专用样式
    ├── js/app.js         # 功能逻辑
    └── audio/samples/    # 三组吉他采样（尼龙弦/钢弦/电吉他）
```

## 现有功能
- 🎸 **吉他和弦转换练习**（`chord-switch/`）
  - 9 个大调（C / G / D / A / E / F / Bb / Eb / Ab）× 13 个和弦，共 117 个，全部经过音高校验
  - 播放方式：真实采样（tonejs-instruments 吉他采样），三种音色：尼龙弦 / 民谣钢弦 / 电吉他，本地打包于 `src/chord-switch/audio/samples/`
  - 任务可配置：转换模式、速度、预览、显示内容（基本属性 / 详细解析 / 分解和弦）

## 如何新增一个功能
1. 新建 `src/<feature-name>/` 目录，包含 `index.html`、`css/`、`js/`，资源自包含；
2. 需要共享能力时引用共享层：`../shared/css/common.css`、`../shared/js/data.js`、`../shared/js/audio.js`；
3. 在 `src/index.html` 的功能卡片区复制一张卡片并修改 `href` / 标题 / 描述 / 图标；
4. 启动脚本自动以 `src/` 为根目录，无需改动。

> 说明：用户任务数据保存在浏览器 localStorage（键 `guitar_practice_tasks`），重构不影响已保存的任务。
