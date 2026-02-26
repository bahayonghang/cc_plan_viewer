# Features Overview

Plan Viewer is purpose-built for reviewing Claude Code plan files inside VS Code. Here's what it can do.

## Feature Summary

| Feature | Description |
|---|---|
| [Comment System](./comments) | Add 5 comment types to sections or selected text; dual-write storage |
| [Mermaid Diagrams](./mermaid) | Render Mermaid diagrams inline with theme-aware colors |
| [File Watcher](./file-watcher) | Auto-refresh plan list and preview when files change on disk |
| [Themes](./themes) | Follows VS Code's active color theme; configurable font and line height |

## At a Glance

### Plan Discovery
- Reads `.md` files from `~/.claude/plans` (configurable)
- Extracts project names from plan content for automatic grouping
- Auto-extracts simplified names and renders dynamic colorful icons for listing components
- Sorted by modification time, newest first
- Toggle OpenSpec ↔ Claude Plans views with quick switch icon

### Inline Reviewing
- Section-level and text-selection comment triggers
- Comment panel for navigating all comments at once
- Keyboard shortcuts: `Ctrl+Enter` to submit, `Esc` to cancel

### Persistence
- Primary storage: VS Code `globalState` (survives restarts)
- Optional secondary storage: embedded in the `.md` file itself
- Bidirectional sync on every plan load — neither source can diverge

### Rendering
- Full Markdown rendering via `marked`
- Syntax highlighting via `highlight.js`
- Mermaid diagram support (lazy-loaded)
- Respects VS Code dark/light theme
