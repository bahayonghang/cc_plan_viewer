# 常见问题与故障排查

## 计划不显示

**侧边栏中没有出现计划。**

1. **检查计划目录。** 默认情况下扩展从 `~/.claude/plans` 读取。请确认该文件夹存在且包含 `.md` 文件。

2. **自定义目录设置。** 若已设置 `planViewer.plansDirectory`，请确保路径正确且为绝对路径。不支持相对路径。

3. **手动刷新。** 点击 Plans 侧边栏工具栏中的 `↺`（刷新）按钮。

4. **文件扩展名。** 仅列出 `.md` 文件，`.txt`、`.markdown` 等其他格式会被忽略。

---

## 评论未保存

**我添加了评论，但重启 VS Code 后它消失了。**

评论存储在 VS Code 的 `globalState` 中，与工作区/机器绑定。如果你打开了不同的工作区，上一个工作区的计划评论仍然存在，但可能不可见。

如果评论完全消失，请在扩展面板中搜索"Plan Viewer"，确认扩展仍已安装并处于激活状态。

---

## 嵌入评论不显示

**已启用 `embedCommentsInMarkdown`，但 `.md` 文件中看不到评论。**

同步发生在计划被**加载**时（即在侧边栏中点击时）。在 Plan Viewer 中打开计划后，再用编辑器查看 `.md` 文件——底部应出现 `## 📝 Review Comments` 章节。

如果该章节仍未出现，请确认扩展对计划目录有写入权限。

---

## Mermaid 图表不渲染

**Mermaid 代码块以纯文本形式显示。**

Mermaid 采用懒加载方式。如果等待几秒后图表仍未出现：

1. 将图表滚动到可见区域（懒加载基于视口触发）
2. 在 VS Code 开发者工具（`帮助 → 切换开发者工具`）中检查浏览器控制台是否有错误
3. 使用 [Mermaid Live Editor](https://mermaid.live) 验证 Mermaid 语法是否正确

---

## 扩展未激活

**活动栏中没有出现 Plan Viewer 图标。**

1. 确认 VS Code 版本 ≥ 1.85.0（`帮助 → 关于`）
2. 打开扩展面板，确认 **Plan Viewer** 已安装且**已启用**（未被禁用）
3. 重新加载 VS Code（`Ctrl+Shift+P` → `Developer: Reload Window`）

---

## 项目分组不正确

**计划被归到了错误的项目，或显示为"（未分组）"。**

项目名称从计划文件内容中按优先级提取：

1. `cwd:`、`Working directory:` 或 `Project:` 元数据行 → 路径 basename
2. 内容中第一个绝对路径
3. 第一个 `# 标题` → `:` / `-` / `–` 之前的文字
4. 无匹配 → `（未分组）`

如需修正分组，在计划文件顶部添加元数据行：

```markdown
Working directory: /path/to/my-project
```

或直接**关闭分组**，查看按时间顺序排列的平铺列表。

---

## 如何更改计划目录？

打开 VS Code 设置（`Ctrl+,`），搜索 `planViewer.plansDirectory`，输入完整路径。留空则恢复默认的 `~/.claude/plans`。

---

## 不使用 Claude Code 能用 Plan Viewer 吗？

可以。Plan Viewer 读取配置目录中的任意 `.md` 文件，不限于 Claude Code 创建的计划，任何工具生成的计划都可以使用。

---

## 反馈与问题报告

发现 Bug 或有功能建议？请在 [GitHub](https://github.com/anthropic-community/plan-viewer-vscode/issues) 上提 Issue。
