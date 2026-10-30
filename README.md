# guitar

吉他和弦练习合集：以首页为功能入口，各功能独立目录、独立页面，共享和弦知识库与音频采样。

## ⚠️ 运行方式（重要）
浏览器禁止在 `file://`（直接双击 HTML）下通过 `fetch` 读取本地文件，因此**必须用本地 HTTP 服务器打开**，真实采样才能正常加载。项目内置的 `server.py` 还提供了写配置能力，是推荐启动方式。

### 方式一：一键启动脚本（推荐）
- macOS / Linux：终端运行 `./start.sh`（或 `bash start.sh`），默认访问 http://localhost:8000
- Windows：双击 `start.bat`

`server.py` 除静态服务外，还提供 `POST /api/tasks`，让浏览器可以**直接写入任务配置文件**。

### 方式二：VS Code Live Server（只读）
1. 安装 “Live Server” 插件；
2. 打开 `src/index.html`，右键 → “Open with Live Server”。

> 只读服务器下，任务仍可用，改动会暂存在浏览器 localStorage，但不会写入 `src/config/tasks.json`（页面会给出黄色提示）。

## 任务数据与配置文件
- **配置文件**：`src/config/tasks.json`，是任务数据的唯一持久化来源，可随项目提交到 git。
- 浏览器默认从 `GET /api/tasks` 读取该文件；点击「💾 保存配置」把当前任务写回文件，「📂 载入配置」重新读取文件。
- 「♻️ 重置预制」使用内置 `presets.js` 生成全部预制任务并写入配置文件，适合配置文件丢失后一键重建。
- 数据降级顺序：配置文件 → localStorage → 内置预制。

## 项目结构
```
server.py                # 本地服务器（静态服务 + 写任务配置）
src/
├── index.html            # 首页（功能入口）
├── css/home.css          # 首页样式
├── config/tasks.json     # 任务配置文件（可版本控制）
├── shared/               # 跨功能共享层
│   ├── css/common.css    # 主题变量 + 通用组件
│   └── js/
│       ├── data.js       # 和弦知识库（调式/和弦/指法/分解和弦/扫弦节奏）
│       └── audio.js      # 吉他真实采样播放器（三种音色）
└── chord-switch/         # 功能一：吉他和弦转换练习
    ├── index.html
    ├── css/style.css     # 功能专用样式
    ├── js/presets.js     # 预制任务单一数据源（可生成配置文件）
    ├── js/app.js         # 功能逻辑
    └── audio/samples/    # 三组吉他采样（尼龙弦/钢弦/电吉他）
```

## 现有功能
- 🎸 **吉他和弦转换练习**（`chord-switch/`）
  - 9 个大调（C / G / D / A / E / F / Bb / Eb / Ab）× 13 个和弦，共 117 个，全部经过音高校验
  - 真实采样（tonejs-instruments 吉他采样），三种音色：尼龙弦 / 民谣钢弦 / 电吉他，本地打包
  - 任务可配置：转换模式、速度、预览、显示内容、和弦走向介绍、是否加入常用
  - 任务仓库 + 常用列表双视图：仓库含全部任务，每条可点亮 ★ 加入常用列表

## 如何新增一个功能
1. 新建 `src/<feature-name>/` 目录，包含 `index.html`、`css/`、`js/`，资源自包含；
2. 需要共享能力时引用共享层：`../shared/css/common.css`、`../shared/js/data.js`、`../shared/js/audio.js`；
3. 在 `src/index.html` 的功能卡片区复制一张卡片并修改 `href` / 标题 / 描述 / 图标。

> 旧版任务数据保存在浏览器 localStorage（键 `guitar_practice_tasks`），首次进入会自动迁移到新结构并写回配置文件。
