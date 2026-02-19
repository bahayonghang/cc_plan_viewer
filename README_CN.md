# Plan Viewer

一款用于 Claude Code 计划文件的 Tauri 桌面应用——支持原生文件访问、实时 Mermaid 图表渲染，可查看、批注和评论计划内容。

| | |
|---|---|
| ![截图 1](screenshot-1.png) | ![截图 2](screenshot-2.png) |

## 工作原理

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│                  │     │                  │     │                  │
│   Claude Code    │────▶│   Plan Viewer    │◀────│   Desktop App    │
│   (终端)         │     │   (Tauri/Rust)   │     │   (WebView2)     │
│                  │     │                  │     │                  │
│  创建/更新       │     │  通过 Rust 直接  │     │  查看计划        │
│  计划 .md 文件   │     │  访问文件系统    │     │  添加评论        │
│  读取评论        │     │  文件监视器      │     │  Mermaid 渲染    │
│  修改计划        │     │  原生事件        │     │                  │
│                  │     │                  │     │                  │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

### 审阅循环

1. **Claude Code** 在 `~/.claude/plans/` 目录创建计划（使用计划模式：`Shift+Tab`）
2. **Plan Viewer** 自动检测文件并渲染 Mermaid 图表
3. **你** 审阅计划——点击章节 `+` 按钮添加章节评论，或选择文本添加内联评论
4. 评论被 **写回计划 `.md` 文件** 的 `## 📝 Review Comments` 部分
5. **Claude Code** 读取更新后的计划，看到你的评论并进行修改
6. 告诉 Claude：*"检查计划文件中的审阅评论并处理它们"*

## 快速开始

### 环境要求

- **Node.js** (LTS 版本) — [下载地址](https://nodejs.org/)
- **pnpm** — `npm install -g pnpm`
- **Rust** — [通过 rustup 安装](https://rustup.rs/)
- **平台特定要求：**
  - **Windows:** [Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)（选择 Desktop development with C++ 工作负载）
  - **Linux:** `sudo apt install libwebkit2gtk-4.1-dev build-essential libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev`

### 使用 `just`（推荐）

首先[安装 `just`](https://github.com/casey/just#installation)，然后：

```powershell
# 克隆项目
git clone git@github.com:mekalz/plan_viewer.git $HOME\plan-viewer
cd plan-viewer

# 安装依赖
just install-deps

# 启动开发模式
just tauri-dev

# 查看所有命令
just --list
```

### 手动安装

```powershell
# 克隆项目
git clone git@github.com:mekalz/plan_viewer.git $HOME\plan-viewer
cd plan-viewer

# 安装 Node.js 依赖
pnpm install

# 启动开发模式
pnpm tauri dev
```

## 构建

### 开发版本

```bash
# 使用 just
just tauri-build-debug

# 或手动执行
pnpm tauri build --debug
```

### 生产版本

```bash
# 使用 just
just tauri-build

# 或手动执行
pnpm tauri build
```

构建输出位于 `src-tauri/target/release/bundle/` 目录。

## 使用工作流

### 典型会话

```powershell
# 终端 1: 启动 Plan Viewer（Tauri 桌面应用）
cd plan-viewer
pnpm tauri dev

# 终端 2: 以计划模式启动 Claude Code
cd my-project
claude
# 按 Shift+Tab 切换到计划模式
# 提问: "为认证系统创建架构计划"

# 在桌面应用中审阅计划，添加评论
# 回到终端 2:
# 告诉 Claude: "读取计划文件中的审阅评论并修改"
```

### 评论写入格式

添加章节评论时，内容会追加到审阅评论部分：

```markdown
---

## 📝 Review Comments

### 💬 COMMENT (re: "Database Design")

> 建议在 sessions 表添加 (user_id, created_at) 复合索引
> 以优化时间线查询。

_— Reviewer, 2026/01/15 15:30_
```

选择文本添加内联评论时，内容会插入到包含该选区的段落后：

```markdown
### 💬 COMMENT (on: "JWT-based session management")

> 是否考虑过令牌撤销策略来处理被泄露的令牌？

_— Reviewer, 2026/01/15 15:35_
```

Claude Code 会直接读取这些内容，因为它们是计划文件的一部分。

## 功能特性

- **原生桌面应用** — 基于 Tauri 2.0 和 Rust 后端
- **直接文件访问** — 无需 HTTP 服务器，原生文件系统访问
- **文件监视器** — 计划文件变更时实时更新（使用 `notify` crate）
- **实时 Mermaid 渲染** — 流程图、时序图、甘特图等
- **章节评论** — 点击任意标题的 `+` 按钮
- **文本选择评论** — 选择任意文本添加带上下文的内联评论
- **评论高亮** — 带评论的选中文本会高亮显示
- **深色/浅色主题** — 平滑切换，设置保存在 localStorage
- **语法高亮** — 代码块通过 highlight.js 高亮（跟随主题）
- **评论侧边栏** — 显示评论及其关联的上下文预览
- **双向评论同步** — JSON 元数据与 Markdown 块保持同步
- **自动重连** — 文件监视器断开后自动恢复

## 项目架构

```
plan-viewer/
├── src/                   # 前端 (Vite + Vanilla JS)
│   ├── index.html         # 主 HTML
│   ├── main.js            # 入口文件
│   ├── app.js             # 应用逻辑
│   └── styles/
│       └── main.css       # 样式
│
├── src-tauri/             # Tauri (Rust) 后端
│   ├── src/
│   │   └── main.rs        # Rust 后端与文件监视器
│   ├── icons/             # 应用图标
│   ├── Cargo.toml         # Rust 依赖
│   └── tauri.conf.json    # Tauri 配置
│
├── docs/                  # VitePress 文档
│   ├── guide/             # 使用指南
│   ├── features/          # 功能说明
│   └── development/       # 开发文档
│
├── index.html             # 单文件前端（开发用）
├── package.json           # Node.js 依赖
├── vite.config.js         # Vite 配置
├── justfile               # Just 命令
├── icon.svg               # 项目图标
├── LICENSE                # MIT 许可证
└── README.md              # 英文文档
```

### Tauri 命令

| 命令 | 描述 |
|---------|-------------|
| `get_plans` | 列出所有计划及其元数据 |
| `get_plan_by_id` | 获取计划内容和评论 |
| `add_comment_command` | 向计划添加评论 |
| `delete_comment_command` | 删除评论 |

## 自定义配置

### 修改窗口大小

编辑 `src-tauri/tauri.conf.json`：

```json
{
  "app": {
    "windows": [{
      "width": 1400,
      "height": 900
    }]
  }
}
```

### 修改应用名称

编辑 `src-tauri/tauri.conf.json`：

```json
{
  "productName": "你的应用名称"
}
```

### 可用的 `just` 命令

| 命令 | 描述 |
|---------|-------------|
| `just` | 显示帮助 |
| `just install-deps` | 安装 Node.js 依赖 |
| `just tauri-dev` | 启动 Tauri 开发模式 |
| `just tauri-build` | 构建生产版本 |
| `just tauri-build-debug` | 构建调试版本 |
| `just vite-dev` | 启动 Vite 开发服务器（仅前端） |
| `just vite-build` | 构建前端 |
| `just docs-dev` | 启动文档开发服务器 |
| `just docs-build` | 构建文档 |
| `just check-all` | 检查 Rust 和 Node.js |
| `just clean` | 清理构建产物 |

## 最佳实践

### 撰写有效评论

::: tip 具体明确
❌ "这部分需要改进"
✅ "建议在 sessions 表添加 (user_id, created_at) 复合索引以优化时间线查询"
:::

::: tip 提供上下文
❌ "为什么要用 JWT？"
✅ "考虑到需要支持移动端离线访问，JWT 是否是最佳选择？是否考虑过 session + refresh token 方案？"
:::

::: tip 一次一个主题
每条评论聚焦一个具体问题，便于 Claude 逐个处理。
:::

## 已知限制

- 评论会追加到计划文件——多轮审阅后文件会逐渐变大
- 无身份认证（仅桌面应用）
- Mermaid 渲染依赖 CDN 可用性
- 需要主动告诉 Claude 重新读取计划文件中的评论

## 致谢

本项目在实现过程中参考了以下资源：

- **[plan_viewer](https://github.com/mekalz/plan_viewer)** — 提供了 Claude Code 计划文件查看器的核心设计理念，包括：
  - 计划文件与评论的双向同步机制
  - Mermaid 图表实时渲染方案
  - 区块级评论与行内评论的交互设计
  - 评论写入 Markdown 文件的格式规范

## 许可证

[MIT](LICENSE)
