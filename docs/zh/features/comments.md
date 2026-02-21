# 评论系统

评论系统是 Plan Viewer 的核心功能。它让你能够注释计划的任意部分，而无需修改计划本身——也可以选择将评论直接嵌入 Markdown 文件。

## 评论类型

五种评论类型覆盖了最常见的审查场景：

| 类型 | 表情 | 用途 |
|---|---|---|
| **注释** | 💬 | 一般性观察或备注 |
| **建议** | 💡 | 提出具体修改或改进意见 |
| **问题** | ❓ | 向计划作者寻求说明 |
| **批准** | ✅ | 明确批准该章节 |
| **拒绝** | ❌ | 标记该章节需要修改 |

## 添加评论

### 章节评论

Markdown 面板中每个章节标题的右侧都有一个 **`+`** 按钮。点击它可为该章节打开内联评论表单：

1. 标题下方出现文本框
2. 输入评论内容
3. 从下拉菜单选择类型
4. 按 `Ctrl+Enter`（macOS 为 `Cmd+Enter`）或点击 **提交**

若章节已有评论，按钮会显示评论数（例如 `3`）而非 `+`。

### 文字选择评论

1. 在 Markdown 面板中选中任意文字
2. 选中文字上方出现浮动的 **💬 Comment** 提示
3. 点击提示打开评论表单
4. 选中文字作为上下文预填（截断至 60 个字符）

## 数据结构

每条评论存储以下信息：

```typescript
{
  id: string           // UUID
  planId: string       // 计划文件路径
  lineNumber: number | null
  lineContent: string  // 评论锚定的行内容
  sectionTitle: string // 评论所属的标题
  selectedText: string // 高亮文字（章节评论为空）
  text: string         // 评论正文
  type: 'comment' | 'suggestion' | 'question' | 'approve' | 'reject'
  status: 'pending'
  createdAt: string    // ISO 8601
}
```

## 存储：双写机制

评论**同时**存储在两个位置。

### 主存储：VS Code globalState

始终启用。评论以 JSON 格式序列化到 VS Code 的 `globalState`，键名为 `planViewer.comments.<planId>`。速度快，重启后保留。

### 副存储：嵌入 Markdown（可选）

由 `planViewer.embedCommentsInMarkdown` 设置控制（默认：**启用**）。

启用时，每条评论会以 Markdown 块的形式写入计划文件底部的 `## 📝 Review Comments` 章节：

```markdown
## 📝 Review Comments

### 💡 SUGGESTION (on: "建议的方案") [第 15 行]

> 考虑拆分为三个阶段，便于跟踪。

_— Reviewer, 2024/06/15 10:30_

---

### ❓ QUESTION [第 42 行]

> 同步步骤的预期延迟是多少？

_— Reviewer, 2024/06/15 10:32_
```

这使得评论具有**可移植性**——随 `.md` 文件一同传递，无需 VS Code 也可阅读。

## 双向同步

每次加载计划时，`commentSync` 都会协调两个存储位置：

- 在 `globalState` 中但不在 Markdown 里的评论 → 注入文件（若已启用 `embedCommentsInMarkdown`）
- Markdown 中有但 `globalState` 没有的评论块 → 导入 `globalState`

这意味着两个来源永远不会产生永久性分歧，即使你手动编辑了 `.md` 文件或与他人共享。

## 浏览评论

点击工具栏中的 **Comments** 按钮或 💬 徽章打开 **评论面板**。面板功能：

- 按章节标题分组显示评论
- 显示评论类型表情、文字预览和相对时间戳
- 点击任意评论可将 Markdown 面板滚动到该章节
- 每条评论提供 🗑 删除按钮

## 删除评论

点击评论卡片上的 🗑 图标——无论是在评论面板还是在 Markdown 面板的内联卡片中均可。Toast 通知确认删除，评论将同时从两个存储位置移除。

## 配置项

| 设置 | 默认值 | 说明 |
|---|---|---|
| `planViewer.embedCommentsInMarkdown` | `true` | 将评论写入 `.md` 文件 |
