# Mermaid 图表渲染

Plan Viewer 内置 Mermaid 图表渲染支持，可以将计划中的 Mermaid 代码块实时渲染为可视化图表。

## 支持的图表类型

### 流程图 (Flowchart)

```mermaid
graph TD
    A[开始] --> B{是否需要审阅?}
    B -->|是| C[添加评论]
    B -->|否| D[继续执行]
    C --> E[Claude 读取评论]
    E --> F[修改计划]
    F --> D
    D --> G[完成]
```

### 时序图 (Sequence Diagram)

```mermaid
sequenceDiagram
    participant U as 用户
    participant PV as Plan Viewer
    participant CC as Claude Code
    participant FS as 文件系统

    U->>PV: 打开计划文件
    PV->>FS: 读取计划
    FS-->>PV: 返回计划内容
    PV->>PV: 渲染 Mermaid 图表
    U->>PV: 添加评论
    PV->>FS: 写入评论
    CC->>FS: 读取更新后的计划
    FS-->>CC: 返回计划（含评论）
    CC->>CC: 处理评论并修改计划
```

### 甘特图 (Gantt Chart)

```mermaid
gantt
    title 项目开发计划
    dateFormat  YYYY-MM-DD
    section 设计阶段
    需求分析     :a1, 2024-01-01, 7d
    架构设计     :a2, after a1, 5d
    section 开发阶段
    前端开发     :b1, after a2, 14d
    后端开发     :b2, after a2, 14d
    测试         :b3, after b1, 7d
```

### 类图 (Class Diagram)

```mermaid
classDiagram
    class PlanViewer {
        +loadPlan(id)
        +renderMermaid()
        +addComment()
        +toggleTheme()
    }
    class FileWatcher {
        +watch(path)
        +onFileChange()
    }
    class CommentManager {
        +addSectionComment()
        +addInlineComment()
        +syncToMarkdown()
    }
    PlanViewer --> FileWatcher
    PlanViewer --> CommentManager
```

### 状态图 (State Diagram)

```mermaid
stateDiagram-v2
    [*] --> 空闲
    空闲 --> 加载中: 打开计划
    加载中 --> 已加载: 成功
    加载中 --> 错误: 失败
    已加载 --> 编辑中: 添加评论
    编辑中 --> 已加载: 保存
    已加载 --> 空闲: 关闭计划
    错误 --> 空闲: 重试
```

## 渲染机制

Plan Viewer 通过 CDN 加载 Mermaid 库进行图表渲染：

1. 检测 Markdown 中的 `mermaid` 代码块
2. 异步加载 Mermaid 库
3. 根据当前主题选择配色方案
4. 渲染 SVG 图表并插入文档

## 性能优化

- **懒加载**: Mermaid 库仅在需要时加载
- **缓存**: 已渲染的图表会被缓存
- **主题适配**: 图表颜色自动适配当前主题

## 注意事项

::: warning CDN 依赖
Mermaid 渲染依赖 CDN 可用性。如果 CDN 不可用，图表将显示为代码块。
:::

::: tip 离线使用
如需离线使用，可以考虑将 Mermaid 库本地化部署。
:::
