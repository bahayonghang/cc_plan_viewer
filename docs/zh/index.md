---
layout: home

hero:
  name: "Plan Viewer"
  text: "在 VS Code 中审查 Claude Code 计划"
  tagline: 在 VS Code 内浏览、阅读并注释 Claude Code 计划文件，支持内联评论、Mermaid 图表和实时文件监听。
  actions:
    - theme: brand
      text: 快速开始 →
      link: /zh/guide/
    - theme: alt
      text: 在 GitHub 上查看
      link: https://github.com/anthropic-community/plan-viewer-vscode

features:
  - icon: 📋
    title: 智能计划浏览器
    details: 自动从 ~/.claude/plans 发现 .md 计划文件，按项目名称组织到侧边栏树形视图中，并按修改时间排序。

  - icon: 💬
    title: 内联评论系统
    details: 使用键盘快捷键为任意章节标题或选中文本添加五种类型的评论：注释、建议、问题、批准、拒绝。

  - icon: 🔄
    title: 双写存储
    details: 评论持久化存储在 VS Code 的 globalState 中，也可选择直接嵌入 Markdown 文件，方便跨设备携带。

  - icon: 📊
    title: Mermaid 图表
    details: 内联渲染计划文件中的 Mermaid 图表，自动检测深色/浅色主题，与 VS Code 配色方案保持一致。

  - icon: 👁️
    title: 实时文件监听
    details: 当计划文件在磁盘上发生变化时，自动刷新计划列表和当前预览，采用 300 ms 防抖避免界面闪烁。

  - icon: 🎨
    title: 主题感知
    details: 在 Webview 中遵循 VS Code 当前配色主题，支持自定义字体大小（10–24 px）和行高（1.2–2.5）。
---
