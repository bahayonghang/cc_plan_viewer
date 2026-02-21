# Comment System

The comment system is the core feature of Plan Viewer. It lets you annotate any part of a plan without modifying the plan itself — or, optionally, by embedding comments directly into the Markdown file.

## Comment Types

Five comment types cover the most common review scenarios:

| Type | Emoji | Purpose |
|---|---|---|
| **Comment** | 💬 | General observation or note |
| **Suggestion** | 💡 | Propose a specific change or improvement |
| **Question** | ❓ | Ask for clarification from the plan author |
| **Approve** | ✅ | Explicitly sign off on a section |
| **Reject** | ❌ | Mark a section as needing revision |

## Adding Comments

### Section Comments

Every section heading in the Markdown pane has a **`+`** button on its right edge. Click it to open an inline comment form for that section:

1. A textarea appears below the heading
2. Type your comment
3. Select a type from the dropdown
4. Press `Ctrl+Enter` (`Cmd+Enter` on macOS) or click **Submit**

If the section already has comments, the button shows the count (e.g., `3`) instead of `+`.

### Text-Selection Comments

1. Select any text in the Markdown pane
2. A **💬 Comment** floating tooltip appears above the selection
3. Click the tooltip to open a comment form
4. The selected text is pre-filled as context (truncated to 60 characters)

## Data Structure

Each comment stores:

```typescript
{
  id: string           // UUID
  planId: string       // plan file path
  lineNumber: number | null
  lineContent: string  // line where the comment is anchored
  sectionTitle: string // heading the comment belongs to
  selectedText: string // highlighted text (empty for section comments)
  text: string         // comment body
  type: 'comment' | 'suggestion' | 'question' | 'approve' | 'reject'
  status: 'pending'
  createdAt: string    // ISO 8601
}
```

## Storage: Dual-Write

Comments are stored in **two locations** simultaneously.

### Primary: VS Code globalState

Always enabled. Comments are serialised to JSON in VS Code's `globalState` under the key `planViewer.comments.<planId>`. This is fast and survives restarts.

### Secondary: Embedded Markdown (optional)

Controlled by the `planViewer.embedCommentsInMarkdown` setting (default: **enabled**).

When enabled, each comment is written as a Markdown block into the plan file under a `## 📝 Review Comments` section at the bottom:

```markdown
## 📝 Review Comments

### 💡 SUGGESTION (on: "the proposed approach") [Line 15]

> Consider breaking this into three phases for easier tracking.

_— Reviewer, 2024/06/15 10:30_

---

### ❓ QUESTION [Line 42]

> What's the expected latency for the sync step?

_— Reviewer, 2024/06/15 10:32_
```

This makes comments **portable** — they travel with the `.md` file and are readable without VS Code.

## Bidirectional Sync

Every time a plan is loaded, `commentSync` reconciles the two storage locations:

- Comments in `globalState` but not in the Markdown → injected into the file (if `embedCommentsInMarkdown` is on)
- Comment blocks in the Markdown but not in `globalState` → imported back into `globalState`

This means the two sources can never permanently diverge, even if you edit the `.md` file manually or share it with someone else.

## Navigating Comments

Open the **Comment Panel** by clicking the **Comments** button or the 💬 badge in the toolbar. The panel:

- Groups comments by section heading
- Shows the comment type emoji, a text preview, and a relative timestamp
- Lets you click any comment to scroll the Markdown pane to that section
- Provides a 🗑 delete button per comment

## Deleting Comments

Click the 🗑 icon on any comment card — either in the Comment Panel or in the inline card within the Markdown pane. A toast notification confirms the deletion, and the comment is removed from both storage locations.

## Configuration

| Setting | Default | Description |
|---|---|---|
| `planViewer.embedCommentsInMarkdown` | `true` | Write comments into the `.md` file |
