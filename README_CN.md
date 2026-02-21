# Plan Viewer

> 专为 Claude Code 计划文件设计的 VSCode 扩展 —— 支持内联批注、Mermaid 图表与项目分组。

[![版本](https://img.shields.io/badge/版本-0.1.0-blue.svg)](https://github.com/anthropic-community/plan-viewer-vscode/releases)
[![VSCode](https://img.shields.io/badge/vscode-%5E1.85.0-blue.svg)](https://code.visualstudio.com/)
[![许可证](https://img.shields.io/badge/许可证-MIT-green.svg)](LICENSE)

[English](README.md)

---

## 简介

Plan Viewer 读取 [Claude Code](https://claude.ai/code) 生成的 `.md` 计划文件（默认存储于 `~/.claude/plans/`），在 VSCode 内以富文本形式渲染，并提供完整的审阅工作流：语法高亮的 Markdown、实时 Mermaid 图表，以及五种类型的内联批注系统 —— 批注内容可选择性地写回计划文件本身。

---

### 应用预览

![Plan Viewer 应用截图](assets/screenshot.png)

---

## 功能特性

### 📋 侧边栏计划列表

- 在专属 Activity Bar 面板中浏览所有计划文件
- 按项目自动分组（从计划元数据或标题中提取项目名）
- 一键切换平铺列表 ↔ 分组树状视图
- 展开 / 折叠所有分组
- 文件变更时自动刷新（300 毫秒防抖）
- 支持直接在 VSCode 文本编辑器中打开计划文件

### 📄 Markdown 渲染

- 完整 Markdown 支持，代码块语法高亮（基于 [highlight.js](https://highlightjs.org/)）
- 实时 [Mermaid](https://mermaid.js.org/) 图表渲染（流程图、时序图、甘特图等）
- 可配置字体大小（10 – 24 px）与行高（1.2 – 2.5）

### 💬 内联批注系统

五种批注类型，覆盖各类审阅场景：

| 类型 | 图标 | 适用场景 |
|------|------|---------|
| 评论 | 💬 | 通用备注 |
| 建议 | 💡 | 提出替代方案 |
| 问题 | ❓ | 请求澄清说明 |
| 批准 | ✅ | 确认某节内容通过 |
| 拒绝 | ❌ | 标记某节需要返工 |

**两种添加批注的方式：**
1. **章节批注** —— 将鼠标悬停在任意标题上，点击出现的批注按钮
2. **选中文本批注** —— 选中任意文本，点击浮现的工具提示

### 🗂️ 批注面板

- 侧滑面板，列出当前计划的全部批注
- 点击任意批注可自动滚动到对应章节
- 可直接在面板中删除批注

### 💾 双重存储机制

批注同时持久化到两个位置：

| 存储位置 | 键 / 路径 | 说明 |
|---------|-----------|------|
| VSCode `globalState` | `planViewer.comments.<planId>` | 始终启用 |
| 计划 `.md` 文件 | `## 📝 Review Comments` 章节 | 由 `embedCommentsInMarkdown` 设置控制 |

每次加载计划时都会执行双向同步，确保两个存储位置的数据始终一致。

---

## 安装

### 通过 VSIX 安装（推荐）

1. 从 [Releases](https://github.com/anthropic-community/plan-viewer-vscode/releases) 页面下载最新的 `plan-viewer-*.vsix`
2. 在 VSCode 中：**扩展 → ··· → 从 VSIX 安装…**
3. 选择下载的文件并重新加载 VSCode

### 从源码构建

```bash
git clone https://github.com/anthropic-community/plan-viewer-vscode.git
cd plan-viewer-vscode
just install   # npm install
just build     # 构建 + 打包 → outputs/plan-viewer-*.vsix
```

然后按上述方式安装生成的 `.vsix` 文件。

---

## 使用方法

1. 打开 VSCode —— Activity Bar 中会出现 **Plan Viewer** 图标
2. 点击图标打开计划列表（默认读取 `~/.claude/plans/`）
3. 点击任意计划，在 Webview 面板中打开
4. **添加批注**：将鼠标悬停在标题上 → 点击 💬；或选中文本 → 点击工具提示
5. **查看全部批注**：点击工具栏中的批注计数器，打开批注面板

---

## 配置

打开 **设置**（`Ctrl+,`）并搜索 `planViewer`，或点击 Plan Viewer 面板头部的齿轮图标。

| 设置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `planViewer.plansDirectory` | `string` | `""` | 计划文件目录的自定义路径，留空则使用 `~/.claude/plans` |
| `planViewer.groupByProject` | `boolean` | `true` | 在侧边栏中按项目分组 |
| `planViewer.embedCommentsInMarkdown` | `boolean` | `true` | 将批注写回 `.md` 文件的 `## 📝 Review Comments` 章节 |
| `planViewer.fontSize` | `number` | `14` | Webview 字体大小（px），范围 10 – 24 |
| `planViewer.lineHeight` | `number` | `1.7` | Webview 行高，范围 1.2 – 2.5 |

---

## 命令

所有命令均可通过命令面板（`Ctrl+Shift+P`）在 **Plan Viewer** 分类下找到：

| 命令 | 说明 |
|------|------|
| `Plan Viewer: Open Plan` | 在 Webview 中打开计划 |
| `Plan Viewer: Refresh Plans` | 重新加载计划列表 |
| `Plan Viewer: Open in Editor` | 在文本编辑器中打开当前计划 `.md` 文件 |
| `Plan Viewer: Settings` | 跳转到 Plan Viewer 设置 |
| `Plan Viewer: Toggle Project Grouping` | 切换侧边栏平铺与分组显示 |
| `Plan Viewer: Expand All Groups` | 展开所有项目组 |
| `Plan Viewer: Collapse All Groups` | 折叠所有项目组 |

---

## 架构说明

```
plan-viewer-vscode/
├── src/
│   ├── extension.ts              # 激活入口与命令注册
│   ├── types.ts                  # 共享接口定义
│   ├── services/
│   │   ├── planService.ts        # 列表/加载计划、项目名提取、缓存
│   │   ├── commentService.ts     # 添加/删除批注、双写逻辑
│   │   ├── commentSync.ts        # JSON ↔ Markdown 双向同步
│   │   ├── commentBuilder.ts     # Comment 对象 → Markdown 块
│   │   ├── commentParser.ts      # Markdown 块 → Comment 对象
│   │   ├── commentInjector.ts    # 向 .md 文件注入/移除块
│   │   └── fileWatcher.ts        # 文件变更自动刷新（300 ms 防抖）
│   ├── providers/
│   │   ├── planTreeProvider.ts   # TreeDataProvider + 项目分组
│   │   ├── planTreeItem.ts       # 单个计划 TreeItem
│   │   └── webviewPanelManager.ts# 单例 Webview 生命周期与消息路由
│   └── webview/                  # Preact 前端（独立 Vite 构建）
│       ├── App.tsx
│       ├── lib/messageProtocol.ts
│       └── components/           # MarkdownViewer、CommentPanel、Toolbar 等
└── l10n/
    ├── bundle.l10n.json          # 英文字符串
    └── bundle.l10n.zh-cn.json   # 中文字符串
```

两个独立的构建进程通过类型化的 `postMessage` 协议通信：

- **Extension Host**（`src/` → `dist/extension.js`）—— 运行于 Node.js，可访问完整 VSCode API
- **Webview**（`src/webview/` → `dist-webview/`）—— 运行于沙箱 iframe，基于 Preact + Vite

---

## 开发

```bash
just install      # 安装依赖
just dev          # 监听模式（扩展 + Webview 并行）
just type-check   # TypeScript 类型检查（不输出文件）
just test         # 运行单元测试（vitest）
just build        # 生产构建 + 打包 .vsix → outputs/
just clean        # 清理构建产物
```

---

## 发布

发布流程通过 GitHub Actions 自动化。推送版本 tag 即可触发工作流：

```bash
git tag v0.1.0
git push origin v0.1.0
```

工作流将自动构建 `.vsix`，创建 GitHub Release，并将文件作为可下载附件上传。

---

## 许可证

[MIT](LICENSE)
