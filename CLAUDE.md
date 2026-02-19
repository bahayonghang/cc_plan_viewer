# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Plan Viewer is a Tauri 2.0 desktop app for viewing and reviewing Claude Code plan files (`~/.claude/plans/*.md`). Users can add section-level or text-selection comments that are written back into the plan Markdown file, enabling a feedback loop with Claude Code.

## Development Commands

```bash
# Install dependencies
pnpm install

# Full Tauri desktop app (frontend + Rust backend)
just tauri-dev          # dev mode
just tauri-build        # production build
just tauri-build-debug  # debug build

# Frontend only (degrades gracefully without Tauri)
pnpm dev                # or: just vite-dev

# Documentation site (VitePress)
pnpm docs:dev

# CI checks
just ci                 # full: sync-version + frontend build + cargo check/clippy/fmt
just ci-rust            # cargo check + clippy + fmt --check
just ci-frontend        # vite build only
just ci-fix             # auto-fix Rust formatting

# Version management (package.json is source of truth)
just sync-version       # propagate version to tauri.conf.json and Cargo.toml
just check-version      # CI: verify version consistency without writing
```

## Architecture

### Dual-Mode Frontend (Vanilla JS + Vite)

The frontend is vanilla ES module JavaScript with no framework. Libraries (marked, highlight.js, beautiful-mermaid) are loaded from CDN, not bundled.

`src/main.js` bootstraps the app by attempting to import `@tauri-apps/api/core`. If successful, IPC calls go through Tauri's `invoke`; otherwise, it falls back to HTTP fetch, allowing frontend-only development with `pnpm dev`.

`src/app.js` contains all application logic in a single file:
- **`api()` function** — unified API abstraction routing to Tauri IPC or HTTP
- **`renderMarkdown()`** — parses markdown, wraps sections in `.md-section` divs, injects comment trigger buttons, detects and lazy-loads Mermaid diagrams
- **Text selection highlighting** — uses TreeWalker to find and wrap commented text in `<mark>` elements
- **Comment CRUD** — loadPlan, openCommentForm, submitGlobalComment, deleteComment

### Rust Backend (`src-tauri/src/main.rs`)

Four Tauri commands exposed to frontend: `get_plans`, `get_plan_by_id`, `add_comment_command`, `delete_comment_command`.

**File locations:**
- Plans: `~/.claude/plans/*.md`
- Comment sidecars: `~/.claude/plan-reviews/<name>.comments.json`

**Bidirectional comment sync** (`sync_comments_with_plan()`): On every `get_plan` call, comments are reconciled between the JSON sidecar and the embedded `## 📝 Review Comments` section in the plan Markdown file. Comments can be added/removed from either source.

**Comment injection**: Inline comments (with `selected_text`) are inserted after the matching paragraph in the plan file. Section-level comments are appended to the Review Comments section at the bottom.

### Theming

CSS custom properties with two themes (dark default, light). Theme state persisted in `localStorage`. Highlight.js and Mermaid themes are swapped via CDN URL replacement.

### Window Startup

The window starts with `visible: false` in `tauri.conf.json`. After `initApp()` completes rendering, it calls `getCurrentWindow().show()` to prevent white flash.

## Key Conventions

- **Language**: Code comments and git commits in Chinese
- **Version source of truth**: `package.json` — use `just sync-version` after bumping
- **No file watcher**: Despite README mentions, `notify` crate is not included; refresh is manual
- **Tauri capabilities**: Defined in `src-tauri/capabilities/default.json` — grants `core:default`, `core:window:allow-show`, `shell:allow-open`
- **CSP disabled**: `security.csp` is null in `tauri.conf.json` to allow CDN script loading
