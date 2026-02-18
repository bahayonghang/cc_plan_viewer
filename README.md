# Plan Viewer

A Tauri desktop application for Claude Code plans — view, annotate, and comment on plans with native file access and live Mermaid diagram rendering.

| | |
|---|---|
| ![Screenshot 1](screenshot-1.png) | ![Screenshot 2](screenshot-2.png) |

## How It Works

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│                  │     │                  │     │                  │
│   Claude Code    │────▶│   Plan Viewer    │◀────│   Desktop App    │
│   (Terminal)     │     │   (Tauri/Rust)   │     │   (WebView2)     │
│                  │     │                  │     │                  │
│  Creates/updates │     │  Direct file     │     │  View plans      │
│  plan .md files  │     │  access via Rust │     │  Add comments    │
│  Reads comments  │     │  File watcher    │     │  Mermaid render  │
│  Revises plans   │     │  Native events   │     │                  │
│                  │     │                  │     │                  │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

### The Review Loop

1. **Claude Code** creates a plan in `~/.claude/plans/` (use plan mode: `Shift+Tab`)
2. **Plan Viewer** auto-detects the file and renders it with Mermaid diagrams
3. **You** review the plan — click section `+` buttons for section-level comments, or select text for inline comments
4. Comments are **written back into the plan `.md` file** under a `## 📝 Review Comments` section
5. **Claude Code** reads the updated plan (it re-reads plan files), sees your comments, and revises accordingly
6. Tell Claude: *"Check the plan file for review comments and address them"*

## Quick Start

### Prerequisites

- **Node.js** (LTS) — [Download](https://nodejs.org/)
- **pnpm** — `npm install -g pnpm`
- **Rust** — [Install via rustup](https://rustup.rs/)
- **Platform-specific:**
  - **Windows:** [Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (Desktop development with C++ workload)
  - **Linux:** `sudo apt install libwebkit2gtk-4.1-dev build-essential libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev`

### Using `just` (Recommended)

[Install `just`](https://github.com/casey/just#installation) first, then:

```powershell
# Clone to your machine
git clone git@github.com:mekalz/plan_viewer.git $HOME\plan-viewer
cd plan-viewer

# Install dependencies
just install-deps

# Start development
just tauri-dev

# See all commands
just --list
```

### Manual

```powershell
# Clone to your machine
git clone git@github.com:mekalz/plan_viewer.git $HOME\plan-viewer
cd plan-viewer

# Install Node.js dependencies
pnpm install

# Start development
pnpm tauri dev
```

## Building

### Development Build

```bash
# Using just
just tauri-build-debug

# Or manually
pnpm tauri build --debug
```

### Production Build

```bash
# Using just
just tauri-build

# Or manually
pnpm tauri build
```

Build output will be in `src-tauri/target/release/bundle/`

## Usage Workflow

### Typical Session

```powershell
# Terminal 1: Start Plan Viewer (Tauri desktop app)
cd plan-viewer
pnpm tauri dev

# Terminal 2: Start Claude Code in plan mode
cd my-project
claude
# Press Shift+Tab to switch to plan mode
# Ask: "Create an architecture plan for the auth system"

# Review the plan in the desktop app, add comments
# Back in Terminal 2:
# Tell Claude: "Read the review comments in the plan file and revise"
```

### What Gets Written to Plan Files

When you add a section-level comment, it's appended under a Review Comments section:

```markdown
---

## 📝 Review Comments

### 💬 COMMENT (re: "Database Design")

> Consider using a composite index on (user_id, created_at)
> for the sessions table to optimize timeline queries.

_— Reviewer, 2026/01/15 15:30_
```

When you select text and add an inline comment, it's inserted right after the paragraph containing the selection:

```markdown
### 💬 COMMENT (on: "JWT-based session management")

> Have we considered token revocation strategies for compromised tokens?

_— Reviewer, 2026/01/15 15:35_
```

Claude Code reads these directly since they're part of the plan file.

## Features

- **Native desktop app** — Tauri 2.0 with Rust backend
- **Direct file access** — No HTTP server needed, native file system access
- **File watcher** — Real-time updates when plan files change (using `notify` crate)
- **Live Mermaid rendering** — Flowcharts, sequence diagrams, Gantt charts, etc.
- **Section-level comments** — Click the `+` button on any heading
- **Text-selection comments** — Select any text to add an inline comment with context
- **Comment highlighting** — Selected text with comments is highlighted
- **Dark / Light themes** — Toggle with smooth transitions, persisted in localStorage
- **Syntax highlighting** — Code blocks highlighted via highlight.js (theme-aware)
- **Comment sidebar** — Comments displayed with linked context previews
- **Bidirectional comment sync** — JSON metadata and markdown blocks kept in sync
- **Auto-reconnect** — File watcher auto-recovers on disconnect

## Architecture

```
plan-viewer/
├── src/                   # Frontend (Vite + Vanilla JS)
│   ├── index.html         # Main HTML
│   ├── main.js            # Entry point
│   ├── app.js             # Application logic
│   └── styles/
│       └── main.css       # Styles
│
├── src-tauri/             # Tauri (Rust) backend
│   ├── src/
│   │   └── main.rs        # Rust backend with file watcher
│   ├── icons/             # App icons
│   ├── Cargo.toml         # Rust dependencies
│   └── tauri.conf.json    # Tauri config
│
├── index.html             # Single-file frontend (dev)
├── package.json           # Node.js dependencies
├── vite.config.js         # Vite config
├── justfile               # Just commands
├── icon.svg               # Project logo
├── plan_viewer.md         # Review instructions for Claude Code
├── CONTRIBUTING.md        # Contribution guidelines
├── LICENSE                # MIT License
└── README.md
```

### Tauri Commands

| Command | Description |
|---------|-------------|
| `get_plans` | List all plans with metadata |
| `get_plan_by_id` | Get plan content and comments |
| `add_comment_command` | Add a comment to a plan |
| `delete_comment_command` | Delete a comment |

## Customization

### Change Window Size

Edit `src-tauri/tauri.conf.json`:

```json
{
  "app": {
    "windows": [{
      "width": 1400,
      "height": 900
    }]
  }
}
```

### Change App Name

Edit `src-tauri/tauri.conf.json`:

```json
{
  "productName": "Your App Name"
}
```

### Available `just` Commands

| Command | Description |
|---------|-------------|
| `just` | Show help |
| `just install-deps` | Install Node.js dependencies |
| `just tauri-dev` | Start Tauri development |
| `just tauri-build` | Build production release |
| `just tauri-build-debug` | Build debug release |
| `just vite-dev` | Start Vite dev server (frontend only) |
| `just vite-build` | Build frontend |
| `just check-all` | Check Rust and Node.js |
| `just clean` | Clean build artifacts |

## Limitations

- Comments are appended to plan files — the file grows over multiple review rounds
- No authentication (desktop app only)
- Mermaid rendering depends on CDN availability
- Claude Code needs to be told to re-read the plan file for comments

## License

MIT
