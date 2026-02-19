# Plan Viewer

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-blue.svg)](https://tauri.app/)
[![Rust](https://img.shields.io/badge/Rust-1.70+-orange.svg)](https://www.rust-lang.org/)
[![Node](https://img.shields.io/badge/Node-18+-green.svg)](https://nodejs.org/)

**[English](README_EN.md) | 简体中文**

一款专为 Claude Code 计划文件设计的桌面查看器——支持原生文件访问、实时 Mermaid 图表渲染，可查看、批注和评论计划内容。

![Screenshot](docs/public/images/screenshot-1.png)

---

## 目录

- [功能特性](#功能特性)
- [工作原理](#工作原理)
- [快速开始](#快速开始)
- [使用指南](#使用指南)
- [项目架构](#项目架构)
- [自定义配置](#自定义配置)
- [开发指南](#开发指南)
- [已知限制](#已知限制)
- [致谢](#致谢)
- [许可证](#许可证)

---

## 功能特性

### 核心能力

- **原生桌面应用** — 基于 Tauri 2.0 和 Rust 后端，轻量高效
- **直接文件访问** — 无需 HTTP 服务器，原生文件系统访问
- **实时文件监视** — 计划文件变更时自动更新（使用 `notify` crate）

### Markdown 渲染

- **实时 Mermaid 渲染** — 支持流程图、时序图、甘特图、类图、ER 图等
- **语法高亮** — 代码块通过 highlight.js 高亮，跟随主题切换
- **GitHub 风格 Markdown** — 兼容 GitHub Markdown 语法

### 评论系统

- **章节评论** — 点击任意标题旁的 `+` 按钮添加评论
- **文本选择评论** — 选择任意文本添加带上下文的内联评论
- **评论高亮** — 带评论的选中文本会高亮显示
- **评论侧边栏** — 显示评论及其关联的上下文预览
- **双向同步** — JSON 元数据与 Markdown 块保持同步

### 用户体验

- **深色/浅色主题** — 平滑切换，设置保存在 localStorage
- **响应式布局** — 适配不同屏幕尺寸
- **键盘快捷键** — `Ctrl/Cmd + Enter` 快速提交评论，`Esc` 取消

---

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

---

## 快速开始

### 环境要求

| 依赖 | 版本要求 | 安装方式 |
|------|----------|----------|
| Node.js | LTS 版本 | [下载地址](https://nodejs.org/) |
| pnpm | 最新版 | `npm install -g pnpm` |
| Rust | 1.70+ | [通过 rustup 安装](https://rustup.rs/) |

#### 平台特定要求

**Windows:**
- [Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)（选择 Desktop development with C++ 工作负载）

**Linux (Debian/Ubuntu):**
```bash
sudo apt install libwebkit2gtk-4.1-dev build-essential libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
```

**macOS:**
- Xcode Command Line Tools: `xcode-select --install`

### 安装

#### 使用 `just`（推荐）

[安装 `just`](https://github.com/casey/just#installation) 后执行：

```bash
# 克隆项目
git clone https://github.com/mekalz/plan_viewer.git
cd plan_viewer

# 安装依赖并启动
just install-deps
just tauri-dev
```

#### 手动安装

```bash
# 克隆项目
git clone https://github.com/mekalz/plan_viewer.git
cd plan_viewer

# 安装依赖
pnpm install

# 启动开发模式
pnpm tauri dev
```

---

## 使用指南

### 典型工作流

```bash
# 终端 1: 启动 Plan Viewer
cd plan_viewer
pnpm tauri dev

# 终端 2: 启动 Claude Code（计划模式）
cd your-project
claude
# 按 Shift+Tab 切换到计划模式
# 提问: "为认证系统创建架构计划"

# 在桌面应用中审阅计划，添加评论
# 回到终端 2:
# 告诉 Claude: "读取计划文件中的审阅评论并修改"
```

### 评论格式

**章节评论：**

```markdown
---

## 📝 Review Comments

### 💬 COMMENT (re: "Database Design")

> 建议在 sessions 表添加 (user_id, created_at) 复合索引
> 以优化时间线查询。

_— Reviewer, 2026/01/15 15:30_
```

**内联评论：**

```markdown
### 💬 COMMENT (on: "JWT-based session management")

> 是否考虑过令牌撤销策略来处理被泄露的令牌？

_— Reviewer, 2026/01/15 15:35_
```

### 评论类型

| 类型 | 图标 | 用途 |
|------|------|------|
| `comment` | 💬 | 一般性评论 |
| `suggestion` | 💡 | 改进建议 |
| `question` | ❓ | 疑问或需要澄清 |
| `approve` | ✅ | 认可/通过 |
| `reject` | ❌ | 不认可/需要修改 |

---

## 项目架构

```
plan_viewer/
├── src/                   # 前端 (Vite + Vanilla JS)
│   ├── main.js            # 入口文件
│   ├── app.js             # 应用逻辑
│   └── styles/
│       └── main.css       # 样式文件
│
├── src-tauri/             # Tauri (Rust) 后端
│   ├── src/
│   │   └── main.rs        # Rust 核心逻辑
│   ├── icons/             # 应用图标
│   ├── Cargo.toml         # Rust 依赖配置
│   └── tauri.conf.json    # Tauri 配置
│
├── docs/                  # VitePress 文档站点
│   ├── guide/             # 使用指南
│   ├── features/          # 功能说明
│   └── development/       # 开发文档
│
├── index.html             # 开发用 HTML 入口
├── package.json           # Node.js 依赖配置
├── vite.config.js         # Vite 配置
├── justfile               # Just 命令定义
└── LICENSE                # MIT 许可证
```

### Tauri 命令 API

| 命令 | 描述 |
|------|------|
| `get_plans` | 列出所有计划及其元数据 |
| `get_plan_by_id` | 获取指定计划的内容和评论 |
| `add_comment_command` | 向计划添加新评论 |
| `delete_comment_command` | 删除指定评论 |

---

## 自定义配置

### 窗口设置

编辑 `src-tauri/tauri.conf.json`：

```json
{
  "app": {
    "windows": [{
      "title": "Plan Viewer",
      "width": 1400,
      "height": 900,
      "minWidth": 800,
      "minHeight": 600
    }]
  }
}
```

### 应用信息

```json
{
  "productName": "Plan Viewer",
  "version": "1.0.0",
  "identifier": "com.plan-viewer.app"
}
```

---

## 开发指南

### 可用命令

| 命令 | 描述 |
|------|------|
| `just tauri-dev` | 启动 Tauri 开发模式 |
| `just tauri-build` | 构建生产版本 |
| `just tauri-build-debug` | 构建调试版本 |
| `just vite-dev` | 启动 Vite 开发服务器（仅前端） |
| `just docs-dev` | 启动文档开发服务器 |
| `just docs-build` | 构建文档站点 |
| `just ci` | 运行所有 CI 检查 |
| `just clean` | 清理构建产物 |

### 构建发布

```bash
# 生产版本
just tauri-build

# 输出位置
# Windows: src-tauri/target/release/bundle/msi/
#          src-tauri/target/release/bundle/nsis/
# macOS:   src-tauri/target/release/bundle/dmg/
# Linux:   src-tauri/target/release/bundle/deb/
#          src-tauri/target/release/bundle/appimage/
```

---

## 已知限制

- 评论会追加到计划文件——多轮审阅后文件会逐渐变大
- 无身份认证（仅桌面应用）
- Mermaid 渲染依赖 CDN 可用性
- 需要主动告诉 Claude 重新读取计划文件中的评论

---

## 致谢

本项目在实现过程中参考了以下资源：

- **[plan_viewer](https://github.com/mekalz/plan_viewer)** — 提供了 Claude Code 计划文件查看器的核心设计理念，包括：
  - 计划文件与评论的双向同步机制
  - Mermaid 图表实时渲染方案
  - 区块级评论与行内评论的交互设计
  - 评论写入 Markdown 文件的格式规范

---

## 许可证

[MIT License](LICENSE) © 2026 Plan Viewer Contributors
