# Architecture

Plan Viewer uses a **dual-process architecture** with two independently built processes that communicate via VS Code's message-passing API.

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        VS Code Host                             │
│                                                                 │
│  ┌─────────────────────────────┐   ┌─────────────────────────┐ │
│  │      Extension Host         │   │        Webview          │ │
│  │   (Node.js / TypeScript)    │   │  (Browser sandbox)      │ │
│  │                             │   │  Preact + TypeScript     │ │
│  │  extension.ts               │   │                         │ │
│  │  ├── PlanService            │   │  App.tsx                │ │
│  │  ├── CommentService         │   │  ├── Toolbar            │ │
│  │  ├── FileWatcher            │   │  ├── MarkdownViewer     │ │
│  │  ├── PlanTreeProvider       │   │  │   ├── CommentForm    │ │
│  │  └── WebviewPanelManager ───┼───┼──│   └── CommentCard   │ │
│  │                         ↑   │   │  └── CommentPanel       │ │
│  │   postMessage / onMessage   │   │                         │ │
│  └─────────────────────────────┘   └─────────────────────────┘ │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────────────────────────┐ │
│  │   Plans Sidebar   │  │           Filesystem                │ │
│  │  (TreeDataProvider│  │  ~/.claude/plans/*.md               │ │
│  │   + TreeItem)     │  │  VSCode globalState (comments)      │ │
│  └──────────────────┘  └──────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Extension Host

**Entry point:** `src/extension.ts`
**Build:** esbuild → `dist/extension.js` (CommonJS)
**Runtime:** Node.js with full VS Code API access

Responsibilities:
- Register commands, tree view, and file watcher
- Read/write plan files and comment data
- Manage the webview panel lifecycle
- Route messages between the webview and services

## Webview

**Entry point:** `src/webview/App.tsx`
**Build:** Vite → `dist-webview/`
**Runtime:** Sandboxed browser environment (no Node.js, no direct filesystem)

Responsibilities:
- Render Markdown and Mermaid diagrams
- Display and manage comments in the UI
- Send user actions to the extension host via `postMessage`

## Message Protocol

All communication is typed in `src/webview/lib/messageProtocol.ts`.

### Extension → Webview

| Message | Payload | Description |
|---|---|---|
| `loadPlan` | `Plan` object | Load (or reload) a plan in the webview |
| `planList` | `PlanInfo[]` | Update the plan list (unused in webview currently) |
| `commentAdded` | `Comment` | A new comment was saved — update UI |
| `commentDeleted` | `{ commentId }` | A comment was deleted — remove from UI |
| `configChanged` | `{ fontSize, lineHeight }` | Config changed — update CSS variables |

### Webview → Extension

| Message | Payload | Description |
|---|---|---|
| `addComment` | comment data | User submitted a comment form |
| `deleteComment` | `{ planId, commentId }` | User clicked delete on a comment |
| `openPlan` | `{ planId }` | User selected a plan (unused; tree handles this) |
| `requestPlanList` | — | Request an updated plan list |
| `openInEditor` | `{ planId }` | User clicked "Editor" button |
| `showToast` | `{ message }` | Show a VS Code information message |

### Initial Plan Injection

To avoid a race condition between webview load and the first `loadPlan` message, the extension injects the initial plan directly into `window.__INITIAL_PLAN__` when creating the webview HTML. `App.tsx` reads this value on mount.

## Service Layer

### PlanService (`src/services/planService.ts`)

- `getPlansDir()` — Returns the configured or default plans directory
- `listPlans()` — Lists all `.md` files as `PlanInfo[]`, sorted by mtime
- `getPlan(planId)` — Loads full plan content + runs bidirectional comment sync
- `loadComments(planId)` / `saveComments(planId, comments)` — globalState I/O
- `extractProject(content)` — Heuristic project name extraction with 4-level fallback; cached by `planId:mtime`

### CommentService (`src/services/commentService.ts`)

- `addComment(planId, data)` — Creates comment, writes to globalState, optionally injects into `.md`
- `deleteComment(planId, commentId)` — Removes from globalState and optionally from `.md`

### Comment Pipeline

Four services handle the comment ↔ Markdown conversion:

```
Comment object
    │
    ▼ commentBuilder.ts       → Markdown block text
    │
    ▼ commentInjector.ts      → Insert/remove blocks in .md file
    │
    ▼ commentParser.ts        → Markdown block → Comment object
    │
    ▼ commentSync.ts          → Orchestrate bidirectional sync
```

### FileWatcher (`src/services/fileWatcher.ts`)

Wraps a VS Code `FileSystemWatcher` on `**/*.md` with a 300 ms debounce. Exposes `onCreate`, `onDelete`, `onChanged` callbacks wired to tree refresh and webview reload.

## Tree View

**Provider:** `src/providers/planTreeProvider.ts`

Two-level tree:
- **Top level:** `ProjectGroupItem` (folder icon, one per project) or flat `PlanTreeItem` list
- **Second level:** `PlanTreeItem` leaves sorted by mtime descending

**Toggle:** `planViewer.toggleGrouping` command flips `groupByProject` config and calls `refresh()`.

## Build System

| Process | Tool | Input | Output |
|---|---|---|---|
| Extension host | esbuild (`esbuild.mjs`) | `src/extension.ts` | `dist/extension.js` |
| Webview | Vite + `@preact/preset-vite` | `src/webview/App.tsx` | `dist-webview/` |

Both processes run in parallel during development via `concurrently`.

## File Layout

```
plan-viewer-vscode/
├── src/
│   ├── extension.ts              # Activation, command registration
│   ├── types.ts                  # Shared interfaces (PlanInfo, Plan, Comment)
│   ├── services/
│   │   ├── planService.ts        # List/load plans, extractProject, cache
│   │   ├── commentService.ts     # Add/delete comments, dual-write
│   │   ├── commentSync.ts        # Bidirectional JSON ↔ Markdown sync
│   │   ├── commentBuilder.ts     # Comment → Markdown block
│   │   ├── commentParser.ts      # Markdown block → Comment
│   │   ├── commentInjector.ts    # Inject/remove blocks in .md files
│   │   └── fileWatcher.ts        # Auto-refresh (300ms debounce)
│   ├── providers/
│   │   ├── planTreeProvider.ts   # TreeDataProvider, ProjectGroupItem
│   │   ├── planTreeItem.ts       # Individual plan TreeItem
│   │   └── webviewPanelManager.ts# Singleton webview lifecycle, message routing
│   └── webview/                  # Preact frontend (separate Vite build)
│       ├── App.tsx               # Root component, message handler
│       ├── lib/
│       │   └── messageProtocol.ts# Typed message definitions
│       └── components/           # Toolbar, MarkdownViewer, CommentPanel, etc.
└── l10n/
    ├── bundle.l10n.json          # English strings
    └── bundle.l10n.zh-cn.json   # Chinese (Simplified) strings
```
