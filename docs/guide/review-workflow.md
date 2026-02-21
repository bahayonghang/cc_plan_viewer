# Review Workflow

A step-by-step guide to reviewing a Claude Code plan with Plan Viewer.

## 1. Open the Plan

Click the **Plan Viewer** icon in the Activity Bar, then click the plan you want to review. The webview opens with the rendered Markdown.

## 2. Read Through the Plan

Scroll through the rendered content. The plan is split into sections by heading. Mermaid diagrams render inline.

Use the **Editor** button in the toolbar to open the raw `.md` file alongside the preview if needed.

## 3. Add a Comment

### On a Section

Click the **`+`** button that appears to the right of any section heading. A comment form drops in below the heading.

### On Selected Text

1. Select any text in the Markdown pane
2. A **💬 Comment** tooltip appears above the selection
3. Click the tooltip to open a comment form — the selected text is pre-filled as context

### Fill In the Form

```
┌─ Comment Form ─────────────────────────────────────────────────┐
│  💬 Comment on: "selected text here" [Line 42]                 │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Type your comment here…                                  │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
│  Type: [💬 Comment ▾]                    [Cancel] [Submit]     │
└────────────────────────────────────────────────────────────────┘
```

**Comment Types:**

| Type | Emoji | When to use |
|---|---|---|
| Comment | 💬 | General observation or note |
| Suggestion | 💡 | Propose a change or improvement |
| Question | ❓ | Ask for clarification |
| Approve | ✅ | Explicitly approve this section |
| Reject | ❌ | Mark this section as needing revision |

**Keyboard Shortcuts:**

| Shortcut | Action |
|---|---|
| `Ctrl+Enter` / `Cmd+Enter` | Submit comment |
| `Esc` | Cancel and close form |

## 4. Navigate Comments

Open the **Comment Panel** by clicking the **Comments** button (or the **💬 N** badge) in the toolbar.

The panel groups comments by section. Click any comment to scroll the Markdown pane to that section.

Each section in the Markdown pane also shows an inline comment count badge on its `+` button.

## 5. Delete a Comment

- **From the Comment Panel:** Click the 🗑 icon on any comment card
- **From the Markdown Pane:** Click the 🗑 icon on the inline comment card within a section

A toast notification confirms the deletion.

## 6. Check Comment Persistence

Comments are stored in VS Code's `globalState` and survive editor restarts. If `planViewer.embedCommentsInMarkdown` is enabled (the default), comments are also written into the plan's `.md` file under a `## 📝 Review Comments` section.

Embedded comments look like this:

```markdown
## 📝 Review Comments

### 💡 SUGGESTION (on: "the proposed approach") [Line 15]

> Consider breaking this into smaller sub-tasks for easier tracking.

_— Reviewer, 2024/06/15 10:30_

---

### ❓ QUESTION [Line 28]

> What's the expected latency for the sync step?

_— Reviewer, 2024/06/15 10:32_
```

This makes comments portable — they travel with the plan file.

## Tips

- Use **Approve** (✅) and **Reject** (❌) comments to signal sign-off status to the plan author
- Use **Suggestion** (💡) when you want Claude Code to revise a specific section
- The **Comment Panel** is a great overview when a plan has many sections with scattered comments
- Toggle **grouping off** in the sidebar to see all plans in chronological order if you review frequently
