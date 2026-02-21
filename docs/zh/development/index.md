# 开发指南

开始为 Plan Viewer 贡献代码所需的一切。

## 技术栈

| 层级 | 技术 |
|---|---|
| 扩展宿主 | TypeScript、Node.js、VS Code API |
| Webview UI | Preact、TypeScript、Vite |
| Markdown 渲染 | `marked` + `marked-highlight` |
| 语法高亮 | `highlight.js` |
| 图表渲染 | `mermaid` |
| 测试 | `vitest` |
| 扩展打包 | `esbuild` |
| 发布工具 | `@vscode/vsce` |

## 前提条件

- **Node.js** ≥ 18
- **npm** ≥ 9
- **VS Code** ≥ 1.85.0
- [`just`](https://just.systems) 任务运行器（可选，但推荐）

## 初始设置

```bash
git clone https://github.com/anthropic-community/plan-viewer-vscode.git
cd plan-viewer-vscode

just install   # 或者：cd plan-viewer-vscode && npm install
```

## 开发命令

所有命令可通过仓库根目录的 `just` 运行，也可在 `plan-viewer-vscode/` 中使用 `npm run`：

| `just` 命令 | `npm run` 等效命令 | 说明 |
|---|---|---|
| `just install` | `npm install` | 安装依赖 |
| `just dev` | `npm run dev` | 监听模式（扩展 + Webview 并行） |
| `just build` | `npm run build` | 生产构建 + 打包 `.vsix` |
| `just type-check` | `npx tsc --noEmit` | TypeScript 类型检查 |
| `just test` | `npm test` | 运行 vitest 测试套件 |
| `just package` | `npm run package` | 构建 `.vsix` → `outputs/` |
| `just clean` | — | 删除 `dist/`、`dist-webview/`、`node_modules/`、`outputs/` |

## 本地运行扩展

1. 运行 `just dev`（或在 `plan-viewer-vscode/` 中运行 `npm run dev`）
2. 在 VS Code 中按 `F5` 打开新的 **扩展开发宿主** 窗口
3. Plan Viewer 扩展在开发窗口中激活
4. 编辑源文件——监听器会自动重新构建；按 `Ctrl+R` 重新加载扩展宿主以加载最新变更

::: tip Webview 热重载
Webview（`dist-webview/`）由 Vite 的监听模式重新构建。Vite 重建后，关闭并重新打开 Plan Viewer Webview 面板以加载最新的 Webview 包。
:::

## 运行测试

```bash
just test                                          # 运行所有测试（一次）
cd plan-viewer-vscode && npm run test:watch        # 监听模式
```

测试文件位于 `plan-viewer-vscode/src/**/*.test.ts`，使用 `vitest`。

## 代码风格

- 启用 TypeScript 严格模式
- 针对 `.ts` 和 `.tsx` 文件配置了 ESLint
- 在 `plan-viewer-vscode/` 中运行 `npm run lint` 进行检查

## 提交 Pull Request

1. Fork 仓库
2. 创建功能分支：`git checkout -b feat/my-feature`
3. 完成代码修改并编写测试
4. 运行 `just type-check && just test`
5. 向 `main` 分支提交 Pull Request
