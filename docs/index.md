---
layout: home

hero:
  name: "Plan Viewer"
  text: "Claude Code Plans 桌面应用"
  tagline: 查看、批注和评论 Claude Code 计划，支持原生文件访问和实时 Mermaid 图表渲染
  image:
    src: /images/icon.svg
    alt: Plan Viewer Logo
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/
    - theme: alt
      text: 功能介绍
      link: /features/
    - theme: alt
      text: GitHub
      link: https://github.com/mekalz/plan_viewer

features:
  - icon: 🖥️
    title: 原生桌面应用
    details: 基于 Tauri 2.0 构建，Rust 后端提供高性能原生体验，无需 HTTP 服务器
  - icon: 📁
    title: 直接文件访问
    details: 通过 Rust 原生文件系统访问，实时监听计划文件变更并自动更新
  - icon: 📊
    title: Mermaid 图表渲染
    details: 实时渲染流程图、时序图、甘特图等多种 Mermaid 图表类型
  - icon: 💬
    title: 评论系统
    details: 支持章节级评论和文本选择内联评论，评论直接写入计划文件
  - icon: 🎨
    title: 主题切换
    details: 深色/浅色主题平滑切换，偏好设置持久化存储
  - icon: 🔍
    title: 语法高亮
    details: 代码块通过 highlight.js 实现主题自适应的语法高亮
---

<style>
:root {
  --vp-home-hero-name-color: transparent;
  --vp-home-hero-name-background: -webkit-linear-gradient(120deg, #7c3aed 30%, #a78bfa);
  --vp-home-hero-image-background-image: linear-gradient(-45deg, #7c3aed50 50%, #a78bfa50 50%);
  --vp-home-hero-image-filter: blur(44px);
}

@media (min-width: 640px) {
  :root {
    --vp-home-hero-image-filter: blur(56px);
  }
}

@media (min-width: 960px) {
  :root {
    --vp-home-hero-image-filter: blur(68px);
  }
}
</style>

## 应用截图

<div class="screenshot-grid">
  <img src="/images/screenshot-1.png" alt="Plan Viewer 主界面" />
  <img src="/images/screenshot-2.png" alt="Plan Viewer 评论功能" />
</div>

## 工作原理

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│                  │     │                  │     │                  │
│   Claude Code    │────▶│   Plan Viewer    │◀────│   Desktop App    │
│   (Terminal)     │     │   (Tauri/Rust)   │     │   (WebView2)     │
│                  │     │                  │     │                  │
│  创建/更新计划   │     │  Rust 直接访问   │     │  查看计划        │
│  读取评论        │     │  文件监听器      │     │  添加评论        │
│  修改计划        │     │  原生事件        │     │  Mermaid 渲染    │
│                  │     │                  │     │                  │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

## 快速开始

::: code-group
```powershell [使用 just (推荐)]
# 克隆项目
git clone git@github.com:mekalz/plan_viewer.git $HOME\plan-viewer
cd plan-viewer

# 安装依赖
just install-deps

# 启动开发模式
just tauri-dev
```

```powershell [手动安装]
# 克隆项目
git clone git@github.com:mekalz/plan_viewer.git $HOME\plan-viewer
cd plan-viewer

# 安装 Node.js 依赖
pnpm install

# 启动开发模式
pnpm tauri dev
```
:::

## 审阅循环

1. **Claude Code** 在 `~/.claude/plans/` 创建计划（使用计划模式：`Shift+Tab`）
2. **Plan Viewer** 自动检测文件并渲染 Mermaid 图表
3. **你** 审阅计划 — 点击章节 `+` 按钮添加章节评论，或选择文本添加内联评论
4. 评论被**写入计划 `.md` 文件**的 `## 📝 Review Comments` 部分
5. **Claude Code** 读取更新后的计划，看到你的评论并进行修改
6. 告诉 Claude：*"检查计划文件中的审阅评论并处理它们"*
