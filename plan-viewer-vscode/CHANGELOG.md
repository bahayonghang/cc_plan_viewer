# Changelog

All notable changes to **Plan Viewer** are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-02-21

### Added

#### Core Features
- **Plan Browser** — Activity bar sidebar listing all `~/.claude/plans/*.md` files with name, relative time, and file size
- **Markdown Viewer** — Full rendering via `marked` + `highlight.js` with 190+ language syntax highlighting
- **Mermaid Diagrams** — Lazy-loaded diagram rendering with automatic dark/light theme detection
- **Auto-refresh** — `FileSystemWatcher` with 300ms debounce refreshes plans when files change on disk
- **Open in Editor** — Right-click context menu to open raw plan Markdown in VS Code text editor

#### Comment System
- **Five comment types**: Comment (💬), Suggestion (💡), Question (❓), Approve (✅), Reject (❌)
- **Section comments** — `+` trigger button at the end of each Markdown section
- **Text-selection comments** — Select any text to pin an annotation with quoted excerpt
- **Comment Panel** — Right-hand accordion panel grouping comments by section with navigation
- **Inline display** — Comments shown inline within the relevant Markdown section
- **Delete** — Remove comments from both inline view and panel
- **Toast notifications** — Feedback messages for comment add/delete operations
- **Keyboard shortcuts** — `Ctrl+Enter` to submit, `Esc` to cancel

#### Bidirectional Comment Sync
- Comments written back to plan Markdown under `## 📝 Review Comments` section (when `embedCommentsInMarkdown` is enabled)
- Inline selection comments injected directly after the matching paragraph
- Sync algorithm reconciles `globalState` ↔ Markdown on every plan load
- Full port of the original Rust (`plan.rs`) bidirectional sync algorithm in TypeScript

#### Configuration
- `planViewer.plansDirectory` — Custom plans directory path (default: `~/.claude/plans`)
- `planViewer.fontSize` — Font size for plan content (10–24 px, default: 14)
- `planViewer.lineHeight` — Line height (1.2–2.5, default: 1.7)
- `planViewer.embedCommentsInMarkdown` — Toggle Markdown file embedding (default: true)

#### Theming & i18n
- Automatic VS Code theme following via CSS variable mapping
- Dark and light theme support for both syntax highlighting and Mermaid diagrams
- Localization support for English (`bundle.l10n.json`) and Simplified Chinese (`bundle.l10n.zh-cn.json`)

#### Developer Experience
- 32 unit tests (Vitest) covering `commentBuilder`, `commentParser`, `commentInjector`, `commentSync`
- Dual-build system: esbuild (Extension Host) + Vite/Preact (Webview)
- CSP-compliant webview with nonce-based script policy
- `.vscodeignore` configured for minimal VSIX size

[0.1.0]: https://github.com/anthropic-community/plan-viewer-vscode/releases/tag/v0.1.0
