# 文件监听

Plan Viewer 监控计划目录的文件系统变化，自动刷新侧边栏和当前预览——无需手动刷新。

## 监听范围

扩展使用 VS Code `FileSystemWatcher` 通过 glob 模式 `**/*.md` 监听配置的计划目录中的所有 `.md` 文件。

三种事件类型会触发刷新：

| 事件 | 操作 |
|---|---|
| 文件创建 | 计划列表刷新；新计划出现在侧边栏 |
| 文件删除 | 计划列表刷新；计划条目消失 |
| 文件变更 | 计划列表刷新；若当前打开的计划发生变化，其 Webview 重新加载 |

## 防抖处理

快速连续的文件变化（例如编辑器快速连续保存）会经过 **300 ms** 防抖延迟处理。300 ms 内的最后一次变化才会触发刷新，从而避免计划工具频繁写入时的界面闪烁。

## 手动刷新

文件监听覆盖了大多数常见场景，但你也可以随时点击 Plans 侧边栏工具栏中的 **`↺`**（刷新）按钮，强制立即刷新计划列表。

## 监听范围说明

文件监听**仅覆盖计划目录**（默认：`~/.claude/plans`）。目录外的文件不会被监听，即使计划内容中引用了它们。

若你修改了 `planViewer.plansDirectory` 设置，请重启 VS Code（或重新加载窗口），使监听器适应新路径。

## 实现说明

对于贡献者：监听器在 [plan-viewer-vscode/src/services/fileWatcher.ts](https://github.com/anthropic-community/plan-viewer-vscode/blob/main/src/services/fileWatcher.ts) 中实现。它暴露了三个回调钩子（`onCreate`、`onDelete`、`onChanged`），由 `extension.ts` 分别连接到 `PlanTreeProvider.refresh()` 和 `WebviewPanelManager.reloadCurrentPlan()`。
