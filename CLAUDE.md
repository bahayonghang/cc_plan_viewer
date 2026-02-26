# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands are run from the repository root via `just` (requires [just](https://just.systems)):

```bash
just install      # Install npm dependencies in plan-viewer-vscode/
just dev          # Start watch mode (extension + webview in parallel)
just build        # Production build (extension + webview)
just type-check   # TypeScript check without emitting files (tsc --noEmit)
just test         # Run tests (vitest)
just package      # Build .vsix → outputs/
just clean        # Remove dist/, dist-webview/, node_modules/, outputs/
```

All npm scripts live in `plan-viewer-vscode/package.json` and can also be run directly with `cd plan-viewer-vscode && npm run <script>`.

## Architecture

This is a VSCode extension with two independently built processes that communicate via message passing.

### Two Build Processes

**Extension Host** (`src/` → `dist/extension.js`): Built by esbuild (`esbuild.mjs`). Runs in Node.js, has access to the full VSCode API and filesystem.

**Webview** (`src/webview/` → `dist-webview/`): Built by Vite with Preact. Runs sandboxed in a browser-like iframe, can only communicate with the extension via `postMessage`.

### Message Protocol

`src/webview/lib/messageProtocol.ts` defines all typed messages between the two processes:
- **Extension → Webview**: `loadPlan`, `planList`, `commentAdded`, `commentDeleted`, `configChanged`
- **Webview → Extension**: `addComment`, `deleteComment`, `openPlan`, `requestPlanList`, `openInEditor`, `showToast`

The extension injects the initial plan into `window.__INITIAL_PLAN__` at webview creation time to avoid a race condition between webview load and the first `loadPlan` message.

### Comment Storage (Dual Write)

Comments have two storage locations managed by `CommentService`:
1. **Primary**: VSCode `globalState` (key: `planViewer.comments.<planId>`)
2. **Optional**: Embedded directly into the plan `.md` file under a `## 📝 Review Comments` section (controlled by `planViewer.embedCommentsInMarkdown` config)

On every `getPlan()` call, `commentSync.ts` runs a bidirectional sync: it reconciles JSON-stored comments with any comment blocks found in the Markdown content, so neither source can diverge.

### Comment Markdown Pipeline

Four services handle comment ↔ Markdown conversion:
- `commentBuilder.ts` — `Comment` object → Markdown block text
- `commentInjector.ts` — inserts/removes Markdown blocks in `.md` files
- `commentParser.ts` — parses `### 💬 COMMENT` blocks back to `Comment` objects
- `commentSync.ts` — orchestrates bidirectional sync between JSON and Markdown

### TreeView Grouping

`planTreeProvider.ts` implements a two-level tree:
- **Top level**: `ProjectGroupItem` (folder icon) or flat `PlanTreeItem` list, toggled by `planViewer.toggleGrouping` command
- **Second level**: `PlanTreeItem` leaves within each group

Project names are extracted by `extractProject()` in `planService.ts` with a 4-level fallback:
1. `cwd:` / `Working directory:` / `Project:` metadata line → path basename
2. First absolute path in content → basename
3. First `# heading` → text before `:` / `-` / `–` (max 20 chars)
4. Empty string → displayed as `(未分组)`

Results are cached in-memory keyed by `planId:mtime` to avoid re-reading files on every refresh.

### Key Configuration

| Setting | Default | Description |
|---|---|---|
| `planViewer.plansDirectory` | `~/.claude/plans` | Where plan `.md` files are read from |
| `planViewer.groupByProject` | `true` | Group sidebar by extracted project name |
| `planViewer.embedCommentsInMarkdown` | `true` | Write comments back into `.md` files |
| `planViewer.fontSize` | `14` | Webview font size (px) |
| `planViewer.lineHeight` | `1.7` | Webview line height |

### File Layout

```
plan-viewer-vscode/
├── src/
│   ├── extension.ts          # Activation, command registration
│   ├── types.ts              # Shared interfaces (PlanInfo, Plan, Comment)
│   ├── services/
│   │   ├── planService.ts    # List/load plans, extractProject(), in-memory cache
│   │   ├── commentService.ts # Add/delete comments, dual-write logic
│   │   ├── commentSync.ts    # Bidirectional JSON ↔ Markdown sync
│   │   ├── commentBuilder.ts # Comment → Markdown block
│   │   ├── commentParser.ts  # Markdown block → Comment
│   │   ├── commentInjector.ts# Inject/remove blocks in .md files
│   │   └── fileWatcher.ts    # Auto-refresh on plan file changes (300ms debounce)
│   ├── providers/
│   │   ├── planTreeProvider.ts   # TreeDataProvider, ProjectGroupItem
│   │   ├── planTreeItem.ts       # Individual plan TreeItem with dynamic ThemeIcon colors
│   │   └── webviewPanelManager.ts# Singleton webview lifecycle, message routing
│   └── webview/              # Preact frontend (separate Vite build)
│       ├── App.tsx           # Root component, message handler
│       ├── lib/
│       │   └── messageProtocol.ts
│       └── components/       # MarkdownViewer, CommentPanel, Toolbar, etc.
└── l10n/
    ├── bundle.l10n.json      # English strings
    └── bundle.l10n.zh-cn.json# Chinese strings
```
