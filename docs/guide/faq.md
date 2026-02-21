# FAQ & Troubleshooting

## Plans Not Showing

**Plans are not appearing in the sidebar.**

1. **Check the plans directory.** By default the extension reads from `~/.claude/plans`. Verify the folder exists and contains `.md` files.

2. **Custom directory setting.** If you set `planViewer.plansDirectory`, make sure the path is correct and absolute. Relative paths are not supported.

3. **Refresh manually.** Click the `↺` (Refresh) button in the Plans sidebar toolbar.

4. **File extension.** Only `.md` files are listed. Other formats (`.txt`, `.markdown`) are ignored.

---

## Comments Not Saving

**I added a comment but it disappeared after restarting VS Code.**

Comments are stored in VS Code's `globalState`. This is tied to the workspace/machine. If you opened a different workspace, comments for plans in the previous workspace remain but may not be visible.

If comments vanish entirely, check that the extension is still installed and active by searching for "Plan Viewer" in the Extensions panel.

---

## Embedded Comments Missing

**`embedCommentsInMarkdown` is enabled but I don't see comments in the `.md` file.**

The sync happens when a plan is **loaded** (clicked in the sidebar). Open the plan in Plan Viewer, then check the `.md` file in your editor — it should contain a `## 📝 Review Comments` section at the bottom.

If the section still doesn't appear, ensure the extension has write access to the plans directory.

---

## Mermaid Diagrams Not Rendering

**Mermaid code blocks show as plain text.**

Mermaid is loaded lazily. If the diagram hasn't appeared after a couple of seconds:

1. Scroll the diagram into view (lazy rendering is viewport-based)
2. Check the browser console in the VS Code Developer Tools (`Help → Toggle Developer Tools`) for errors
3. Verify the Mermaid syntax is valid using the [Mermaid Live Editor](https://mermaid.live)

---

## Extension Not Activating

**The Plan Viewer icon doesn't appear in the Activity Bar.**

1. Confirm VS Code version ≥ 1.85.0 (`Help → About`)
2. Open the Extensions panel and verify **Plan Viewer** is installed and **enabled** (not disabled)
3. Reload VS Code (`Ctrl+Shift+P` → `Developer: Reload Window`)

---

## Wrong Project Grouping

**Plans are grouped under the wrong project or show as "Ungrouped".**

Project names are extracted from the plan file content using a priority fallback:

1. `cwd:`, `Working directory:`, or `Project:` metadata line → path basename
2. First absolute path found in the content
3. First `# Heading` → text before `:` / `-` / `–`
4. No match → `(Ungrouped)`

To fix grouping, add a metadata line at the top of the plan file:

```markdown
Working directory: /path/to/my-project
```

Or toggle grouping **off** for a flat chronological list.

---

## How Do I Change the Plans Directory?

Open VS Code Settings (`Ctrl+,`), search for `planViewer.plansDirectory`, and enter the full path. Leave it empty to revert to the default `~/.claude/plans`.

---

## Can I Use Plan Viewer Without Claude Code?

Yes. Plan Viewer reads any `.md` files from the configured directory. It works with plans created by any tool, not just Claude Code.

---

## Reporting Issues

Found a bug or have a feature request? Open an issue on [GitHub](https://github.com/anthropic-community/plan-viewer-vscode/issues).
