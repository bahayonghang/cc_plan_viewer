# Basic Usage

## Interface Overview

Plan Viewer adds a dedicated icon to the VS Code Activity Bar. Click it to reveal the **Plans** sidebar.

```
┌─ Activity Bar ──────────────────────────────────────────────────┐
│  [📋]  ← Plan Viewer icon                                        │
└──────────────────────────────────────────────────────────────────┘

┌─ Plans Sidebar ─────────┐  ┌─ Webview Panel ──────────────────────┐
│  PLANS              [↺] │  │  ┌─ Toolbar ──────────────────────┐  │
│                         │  │  │  plan-name.md   💬 3  [Editor] │  │
│  ▼ my-project           │  │  └─────────────────────────────────┘  │
│    ├─ plan-2024.md      │  │                                        │
│    └─ plan-draft.md  ←──┼──┼──(click to open)                      │
│                         │  │  # Plan Title                         │
│  ▼ other-project        │  │                                        │
│    └─ feature.md        │  │  Section content…                     │
│                         │  │                                [+ 💬]  │
│  (Ungrouped)            │  │  ┌─ Comment Card ──────────────────┐  │
│    └─ misc.md           │  │  │ 💬 "This looks good"  🗑         │  │
│                         │  │  └────────────────────────────────┘  │
└─────────────────────────┘  └────────────────────────────────────────┘
```

## Plans Sidebar

### Toolbar Actions

| Icon | Command | Description |
|---|---|---|
| `↺` | Refresh Plans | Manually refresh the plan list |
| `⚙` | Settings | Open VS Code settings filtered to `planViewer.*` |
| `🌲` | Toggle Grouping | Switch between grouped/flat plan list |
| `⊞` | Expand All | Expand all project groups |
| `⊟` | Collapse All | Collapse all project groups |

### Project Grouping

Plans are automatically grouped by the project name extracted from the plan content. The extension looks for:

1. A `cwd:`, `Working directory:`, or `Project:` metadata line at the top → uses the path basename
2. An absolute path in the content → uses the basename
3. A `# Heading` line → uses text before `:` / `-` / `–` (up to 20 characters)

Plans without a detectable project appear under **(Ungrouped)**. Toggle grouping off for a flat list with the `🌲` toolbar button.

### Context Menu

Right-click a plan entry to open it directly in the VS Code text editor.

## Webview Panel

Click any plan in the sidebar to open it in the webview panel. The panel consists of three parts:

### Toolbar

- **Plan filename** — shown on the left
- **💬 N** — badge showing total comment count (click to toggle the Comment Panel)
- **Editor** button — opens the `.md` file in VS Code's built-in text editor

### Markdown Pane

The main content area renders the plan as styled Markdown, including:

- Syntax-highlighted code blocks
- Mermaid diagrams (rendered inline)
- Section-level comment triggers

Each section heading has a **`+`** button on the right edge. Click it to open a comment form for that section. If comments exist, the button shows the count instead of `+`.

### Hover-to-Comment

Select any text in the Markdown pane — a **💬 Comment** tooltip appears above the selection. Click it to open a comment form pre-filled with the selected text.

### Comment Panel

Click the **Comments** toolbar button to open a collapsible panel on the right side. It lists all comments grouped by section. Click any comment to scroll the Markdown pane to that section.

## Configuration

Open VS Code Settings (`Ctrl+,`) and search for `planViewer` to see all options:

| Setting | Default | Description |
|---|---|---|
| `planViewer.plansDirectory` | `~/.claude/plans` | Custom path to plans directory |
| `planViewer.fontSize` | `14` | Font size for plan content (px) |
| `planViewer.lineHeight` | `1.7` | Line height for plan content |
| `planViewer.embedCommentsInMarkdown` | `true` | Embed comments into the `.md` file |
| `planViewer.groupByProject` | `true` | Group sidebar by project name |
