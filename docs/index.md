---
layout: home

hero:
  name: "Plan Viewer"
  text: "Review Claude Code Plans in VS Code"
  tagline: Browse, read, and annotate Claude Code plan files with inline commenting, Mermaid diagrams, and real-time file watching — all inside VS Code.
  actions:
    - theme: brand
      text: Get Started →
      link: /guide/
    - theme: alt
      text: View on GitHub
      link: https://github.com/anthropic-community/plan-viewer-vscode

features:
  - icon: 📋
    title: Smart Plan Browser
    details: Automatically discovers .md plan files from ~/.claude/plans and organizes them by project name. Lists feature cleaned-up plan names and dynamic colorful icons based on the plan's type (e.g., Fix, Feature).

  - icon: 💬
    title: Inline Comment System
    details: Add five types of comments — comment, suggestion, question, approve, reject — to any section heading or selected text with keyboard shortcuts.

  - icon: 🔄
    title: Dual-Write Storage
    details: Comments persist in VS Code's globalState and can optionally be embedded directly into the Markdown file for portability across machines.

  - icon: 📊
    title: Mermaid Diagrams
    details: Renders Mermaid diagrams embedded in plan files, with automatic dark/light theme detection that matches your VS Code color theme.

  - icon: 👁️
    title: Live File Watching
    details: Automatically refreshes the plan list and current preview when plan files change on disk, with a 300 ms debounce to prevent flicker.

  - icon: 🎨
    title: Theme Aware
    details: Respects VS Code's active color theme in the webview, with configurable font size (10–24 px) and line height (1.2–2.5) to suit your preference.
---
