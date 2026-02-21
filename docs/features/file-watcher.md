# File Watcher

Plan Viewer monitors the plans directory for file system changes and automatically refreshes the sidebar and current preview — no manual refresh needed.

## What Gets Watched

The extension watches all `.md` files in the configured plans directory using a VS Code `FileSystemWatcher` with the glob pattern `**/*.md`.

Three event types trigger a refresh:

| Event | Action |
|---|---|
| File created | Plan list refreshes; new plan appears in sidebar |
| File deleted | Plan list refreshes; plan entry disappears |
| File changed | Plan list refreshes; if the changed plan is currently open, its webview reloads |

## Debounce

Rapid file changes (e.g., from an editor saving in quick succession) are debounced with a **300 ms** delay. Only the last change within a 300 ms window triggers a refresh. This prevents UI flicker when a tool writes many small updates to a plan file.

## Manual Refresh

The file watcher covers the most common cases, but you can always click the **`↺`** (Refresh) button in the Plans sidebar toolbar to force an immediate refresh of the plan list.

## Scope

The file watcher covers **only the plans directory** (default: `~/.claude/plans`). Files outside this directory are not watched, even if a plan references them.

If you change the `planViewer.plansDirectory` setting, restart VS Code (or reload the window) for the watcher to pick up the new path.

## Implementation Notes

For contributors: the watcher is implemented in [plan-viewer-vscode/src/services/fileWatcher.ts](https://github.com/anthropic-community/plan-viewer-vscode/blob/main/src/services/fileWatcher.ts). It exposes three callback hooks (`onCreate`, `onDelete`, `onChanged`) that `extension.ts` wires to `PlanTreeProvider.refresh()` and `WebviewPanelManager.reloadCurrentPlan()`.
