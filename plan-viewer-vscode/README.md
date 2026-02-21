# Plan Viewer for VS Code

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/anthropic-community.plan-viewer)](https://marketplace.visualstudio.com/items?itemName=anthropic-community.plan-viewer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

View and review [Claude Code](https://claude.ai/code) plan files directly in VS Code — with inline commenting, text-selection annotations, Mermaid diagram support, and bidirectional comment sync.

## Features

### 📋 Plan Browser
- Activity bar sidebar lists all plans in `~/.claude/plans/`
- Displays plan name, relative time (e.g. "2 hours ago"), and file size
- Auto-refreshes when plan files change (FileSystemWatcher)
- Manual refresh button in the panel title bar

### 📖 Markdown Viewer
- Full Markdown rendering via [marked](https://marked.js.org/) with syntax highlighting ([highlight.js](https://highlightjs.org/))
- Lazy-loaded [Mermaid](https://mermaid.js.org/) diagram rendering with dark/light theme detection
- Section-by-section layout with per-section comment triggers
- Follows your VS Code color theme automatically

### 💬 Comment System

Five comment types to express feedback:

| Type | Emoji | Usage |
|------|-------|-------|
| Comment | 💬 | General remarks |
| Suggestion | 💡 | Improvement ideas |
| Question | ❓ | Clarifications needed |
| Approve | ✅ | Explicit approval |
| Reject | ❌ | Concerns or objections |

**Section comments** — Click the `+` button at the end of any section.

**Text-selection comments** — Select any text in the plan; a tooltip appears to add an annotation pinned to that excerpt.

### 📌 Comment Panel
- Toggle the right-hand panel to see all comments grouped by section
- Click any comment to jump to its location in the plan
- Delete comments directly from the panel

### 🔄 Bidirectional Comment Sync
When `embedCommentsInMarkdown` is enabled (default), comments are written back into the plan Markdown file under a `## 📝 Review Comments` section — giving Claude Code a feedback loop to read and act on.

Comments can also be added/edited directly in the Markdown file and will be picked up on next load.

## Installation

**From VS Code Marketplace:**

1. Open VS Code
2. Press `Ctrl+P` (or `Cmd+P` on macOS)
3. Run: `ext install anthropic-community.plan-viewer`

**From VSIX (manual):**

1. Download the `.vsix` from the [releases page](https://github.com/anthropic-community/plan-viewer-vscode/releases)
2. In VS Code: `Extensions` → `...` → `Install from VSIX...`

## Usage

1. Open VS Code with [Claude Code](https://claude.ai/code) installed
2. Click the **Plan Viewer** icon in the Activity Bar (clipboard icon)
3. Your plans from `~/.claude/plans/` appear in the sidebar
4. Click any plan to open it in the viewer
5. Use `+` buttons to add section comments, or select text to annotate

### Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Submit comment | `Ctrl+Enter` |
| Cancel comment form | `Esc` |

### Context Menu

Right-click a plan in the sidebar to **Open in Editor** (opens the raw `.md` file).

## Configuration

Open VS Code Settings (`Ctrl+,`) and search for **Plan Viewer**:

| Setting | Default | Description |
|---------|---------|-------------|
| `planViewer.plansDirectory` | `""` | Custom path to plans directory. Leave empty to use `~/.claude/plans` |
| `planViewer.fontSize` | `14` | Font size for plan content (10–24 px) |
| `planViewer.lineHeight` | `1.7` | Line height for plan content (1.2–2.5) |
| `planViewer.embedCommentsInMarkdown` | `true` | Write comments back into the plan `.md` file |

## Requirements

- VS Code 1.85.0 or later
- [Claude Code](https://claude.ai/code) with plans in `~/.claude/plans/` (or custom directory)

## Development

```bash
# Clone the repo
git clone https://github.com/anthropic-community/plan-viewer-vscode
cd plan-viewer-vscode

# Install dependencies
npm install

# Build (Extension Host + Webview)
npm run build

# Watch mode (both targets)
npm run dev

# Run unit tests
npm test

# Package for distribution
npm run package
```

### Project Structure

```
plan-viewer-vscode/
├── src/
│   ├── extension.ts          # Extension entry point
│   ├── types.ts              # Shared TypeScript interfaces
│   ├── constants.ts          # Comment emoji mappings, markers
│   ├── services/             # Business logic (Rust port)
│   │   ├── planService.ts    # Plan listing and loading
│   │   ├── commentService.ts # Comment CRUD with Markdown embedding
│   │   ├── fileWatcher.ts    # FSWatcher with 300ms debounce
│   │   ├── commentBuilder.ts # Comment → Markdown block
│   │   ├── commentParser.ts  # Markdown → Comment[]
│   │   ├── commentInjector.ts# Inline comment injection/removal
│   │   └── commentSync.ts    # Bidirectional sync algorithm
│   ├── providers/            # VS Code API implementations
│   │   ├── planTreeProvider.ts   # TreeDataProvider
│   │   ├── planTreeItem.ts       # TreeItem with metadata
│   │   └── webviewPanelManager.ts# WebviewPanel lifecycle
│   ├── test/                 # Vitest unit tests (32 tests)
│   └── webview/              # Preact webview application
│       ├── App.tsx
│       ├── components/       # UI components
│       ├── lib/              # markdown, icons, utils
│       └── styles/           # CSS with VS Code variable mapping
├── l10n/                     # Localization (en, zh-cn)
├── media/                    # Extension icon
└── dist/                     # Built Extension Host
    dist-webview/             # Built Webview
```

### Architecture

The extension uses a **dual-process architecture**:

- **Extension Host** (Node.js, esbuild): VS Code API calls — file I/O, TreeView, globalState
- **Webview** (Preact, Vite): UI rendering — Markdown, comments, Mermaid

Communication is via typed `postMessage` protocol defined in `src/webview/lib/messageProtocol.ts`.

Comment storage uses **VS Code `globalState`** as the primary store, with optional embedding back into the Markdown file for Claude Code consumption.

## License

[MIT](LICENSE)

## Contributing

Issues and PRs welcome at [github.com/anthropic-community/plan-viewer-vscode](https://github.com/anthropic-community/plan-viewer-vscode).
