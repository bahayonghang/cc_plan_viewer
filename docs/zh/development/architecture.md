# 架构

Plan Viewer 采用**双进程架构**，两个独立构建的进程通过 VS Code 的消息传递 API 进行通信。

## 总览

```
┌─────────────────────────────────────────────────────────────────┐
│                        VS Code 宿主                             │
│                                                                 │
│  ┌─────────────────────────────┐   ┌─────────────────────────┐ │
│  │        扩展宿主              │   │        Webview          │ │
│  │   (Node.js / TypeScript)    │   │    （浏览器沙箱）         │ │
│  │                             │   │  Preact + TypeScript     │ │
│  │  extension.ts               │   │                         │ │
│  │  ├── PlanService            │   │  App.tsx                │ │
│  │  ├── CommentService         │   │  ├── Toolbar            │ │
│  │  ├── FileWatcher            │   │  ├── MarkdownViewer     │ │
│  │  ├── PlanTreeProvider       │   │  │   ├── CommentForm    │ │
│  │  └── WebviewPanelManager ───┼───┼──│   └── CommentCard   │ │
│  │                         ↑   │   │  └── CommentPanel       │ │
│  │    postMessage / onMessage  │   │                         │ │
│  └─────────────────────────────┘   └─────────────────────────┘ │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────────────────────────┐ │
│  │    Plans 侧边栏   │  │            文件系统                  │ │
│  │ (TreeDataProvider│  │  ~/.claude/plans/*.md               │ │
│  │   + TreeItem)     │  │  VSCode globalState（评论）         │ │
│  └──────────────────┘  └──────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## 扩展宿主

**入口：** `src/extension.ts`
**构建：** esbuild → `dist/extension.js`（CommonJS）
**运行时：** 具有完整 VS Code API 访问权限的 Node.js

职责：
- 注册命令、树视图和文件监听器
- 读写计划文件和评论数据
- 管理 Webview 面板的生命周期
- 在 Webview 和服务之间路由消息

## Webview

**入口：** `src/webview/App.tsx`
**构建：** Vite → `dist-webview/`
**运行时：** 沙箱浏览器环境（无 Node.js，无直接文件系统访问）

职责：
- 渲染 Markdown 和 Mermaid 图表
- 在 UI 中显示和管理评论
- 通过 `postMessage` 向扩展宿主发送用户操作

## 消息协议

所有通信类型定义于 `src/webview/lib/messageProtocol.ts`。

### 扩展 → Webview

| 消息 | 载荷 | 说明 |
|---|---|---|
| `loadPlan` | `Plan` 对象 | 在 Webview 中加载（或重新加载）计划 |
| `planList` | `PlanInfo[]` | 更新计划列表 |
| `commentAdded` | `Comment` | 新评论已保存——更新 UI |
| `commentDeleted` | `{ commentId }` | 评论已删除——从 UI 移除 |
| `configChanged` | `{ fontSize, lineHeight }` | 配置已更改——更新 CSS 变量 |

### Webview → 扩展

| 消息 | 载荷 | 说明 |
|---|---|---|
| `addComment` | 评论数据 | 用户提交了评论表单 |
| `deleteComment` | `{ planId, commentId }` | 用户点击了评论的删除按钮 |
| `openPlan` | `{ planId }` | 用户选择了计划 |
| `requestPlanList` | — | 请求更新计划列表 |
| `openInEditor` | `{ planId }` | 用户点击了"Editor"按钮 |
| `showToast` | `{ message }` | 显示 VS Code 信息消息 |

### 初始计划注入

为避免 Webview 加载与第一条 `loadPlan` 消息之间的竞争条件，扩展在创建 Webview HTML 时直接将初始计划注入 `window.__INITIAL_PLAN__`。`App.tsx` 在挂载时读取此值。

## 服务层

### PlanService（`src/services/planService.ts`）

- `getPlansDir()` — 返回已配置或默认的计划目录
- `listPlans()` — 以 `PlanInfo[]` 形式列出所有 `.md` 文件，按 mtime 排序
- `getPlan(planId)` — 加载完整计划内容 + 运行双向评论同步
- `loadComments(planId)` / `saveComments(planId, comments)` — globalState 读写
- `extractProject(content)` — 4 级回退的项目名称启发式提取；按 `planId:mtime` 缓存

### CommentService（`src/services/commentService.ts`）

- `addComment(planId, data)` — 创建评论，写入 globalState，可选注入 `.md`
- `deleteComment(planId, commentId)` — 从 globalState 和可选的 `.md` 文件中删除

### 评论处理管道

四个服务处理评论与 Markdown 的转换：

```
Comment 对象
    │
    ▼ commentBuilder.ts       → Markdown 块文本
    │
    ▼ commentInjector.ts      → 在 .md 文件中插入/删除块
    │
    ▼ commentParser.ts        → Markdown 块 → Comment 对象
    │
    ▼ commentSync.ts          → 编排双向同步
```

### FileWatcher（`src/services/fileWatcher.ts`）

使用 300 ms 防抖包装 VS Code `FileSystemWatcher`，监听 `**/*.md`。暴露 `onCreate`、`onDelete`、`onChanged` 回调，分别连接到树视图刷新和 Webview 重载。

## 树视图

**提供者：** `src/providers/planTreeProvider.ts`

两级树：
- **顶级：** `ProjectGroupItem`（文件夹图标，每个项目一个）或平铺的 `PlanTreeItem` 列表
- **第二级：** 按 mtime 降序排列的 `PlanTreeItem` 叶子节点

**切换：** `planViewer.toggleGrouping` 命令翻转 `groupByProject` 配置并调用 `refresh()`。

## 构建系统

| 进程 | 工具 | 输入 | 输出 |
|---|---|---|---|
| 扩展宿主 | esbuild（`esbuild.mjs`） | `src/extension.ts` | `dist/extension.js` |
| Webview | Vite + `@preact/preset-vite` | `src/webview/App.tsx` | `dist-webview/` |

开发模式下，两个进程通过 `concurrently` 并行运行。

## 文件结构

```
plan-viewer-vscode/
├── src/
│   ├── extension.ts              # 激活、命令注册
│   ├── types.ts                  # 共享接口（PlanInfo、Plan、Comment）
│   ├── services/
│   │   ├── planService.ts        # 列出/加载计划，extractProject，缓存
│   │   ├── commentService.ts     # 添加/删除评论，双写
│   │   ├── commentSync.ts        # 双向 JSON ↔ Markdown 同步
│   │   ├── commentBuilder.ts     # Comment → Markdown 块
│   │   ├── commentParser.ts      # Markdown 块 → Comment
│   │   ├── commentInjector.ts    # 在 .md 文件中注入/删除块
│   │   └── fileWatcher.ts        # 自动刷新（300ms 防抖）
│   ├── providers/
│   │   ├── planTreeProvider.ts   # TreeDataProvider，ProjectGroupItem
│   │   ├── planTreeItem.ts       # 单个计划 TreeItem
│   │   └── webviewPanelManager.ts# 单例 Webview 生命周期，消息路由
│   └── webview/                  # Preact 前端（独立 Vite 构建）
│       ├── App.tsx               # 根组件，消息处理器
│       ├── lib/
│       │   └── messageProtocol.ts# 类型化消息定义
│       └── components/           # Toolbar、MarkdownViewer、CommentPanel 等
└── l10n/
    ├── bundle.l10n.json          # 英文字符串
    └── bundle.l10n.zh-cn.json   # 简体中文字符串
```
