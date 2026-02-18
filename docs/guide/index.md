# 快速开始

欢迎使用 Plan Viewer！本指南将帮助你快速上手。

## 前置要求

### 必需软件

| 软件 | 版本要求 | 安装方式 |
|------|----------|----------|
| Node.js | LTS 版本 | [下载](https://nodejs.org/) |
| pnpm | 最新版 | `npm install -g pnpm` |
| Rust | 最新稳定版 | [rustup](https://rustup.rs/) |

### 平台特定要求

::: code-group
```powershell [Windows]
# 安装 Visual Studio C++ Build Tools
# 选择 "Desktop development with C++" 工作负载
winget install Microsoft.VisualStudio.2022.BuildTools
```

```bash [macOS]
# 安装 Xcode Command Line Tools
xcode-select --install
```

```bash [Linux (Debian/Ubuntu)]
sudo apt update
sudo apt install -y libwebkit2gtk-4.1-dev build-essential libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
```
:::

## 安装步骤

### 使用 just（推荐）

[安装 just](https://github.com/casey/just#installation) 后：

::: code-group
```powershell [Windows]
# 克隆项目
git clone git@github.com:mekalz/plan_viewer.git $HOME\plan-viewer
cd plan-viewer

# 安装依赖
just install-deps

# 启动开发模式
just tauri-dev
```

```bash [macOS/Linux]
# 克隆项目
git clone git@github.com:mekalz/plan_viewer.git ~/plan-viewer
cd plan-viewer

# 安装依赖
just install-deps

# 启动开发模式
just tauri-dev
```
:::

### 手动安装

::: code-group
```powershell [Windows]
# 克隆项目
git clone git@github.com:mekalz/plan_viewer.git $HOME\plan-viewer
cd plan-viewer

# 安装 Node.js 依赖
pnpm install

# 启动开发模式
pnpm tauri dev
```

```bash [macOS/Linux]
# 克隆项目
git clone git@github.com:mekalz/plan_viewer.git ~/plan-viewer
cd plan-viewer

# 安装 Node.js 依赖
pnpm install

# 启动开发模式
pnpm tauri dev
```
:::

## 验证安装

启动后，你应该看到 Plan Viewer 窗口打开。如果 `~/.claude/plans/` 目录中有计划文件，它们会自动显示在列表中。

## 下一步

- [安装配置](/guide/installation) - 详细安装说明
- [基础使用](/guide/basic-usage) - 学习基本操作
- [评论工作流](/guide/review-workflow) - 掌握评论系统
