# 安装

## VS Code Marketplace（推荐）

最简单的安装方式：

1. 打开 VS Code
2. 按 `Ctrl+Shift+X`（Windows/Linux）或 `Cmd+Shift+X`（macOS）打开扩展面板
3. 搜索 **`Plan Viewer`**
4. 点击 **anthropic-community** 发布的条目上的 **安装**

或在浏览器中打开 Marketplace 并点击 **安装**。

## 从 VSIX 安装

如果你有 `.vsix` 文件（例如从 GitHub Release 获取）：

1. 打开 VS Code
2. 打开扩展面板（`Ctrl+Shift+X`）
3. 点击扩展面板右上角的 **`···`** 菜单
4. 选择 **从 VSIX 安装…**
5. 选择 `.vsix` 文件

也可以使用命令行：

```bash
code --install-extension plan-viewer-0.1.0.vsix
```

## 从源码构建

克隆仓库并使用 [`just`](https://just.systems) 在本地构建：

```bash
git clone https://github.com/anthropic-community/plan-viewer-vscode.git
cd plan-viewer-vscode

# 安装依赖并打包扩展
just package
# → outputs/plan-viewer-*.vsix

# 安装构建的扩展
code --install-extension outputs/plan-viewer-*.vsix
```

::: details 可用的 just 命令
```
just install      # 安装 npm 依赖
just dev          # 启动监听模式（扩展 + Webview 并行）
just build        # 生产构建
just type-check   # TypeScript 类型检查（tsc --noEmit）
just test         # 运行测试（vitest）
just package      # 构建 .vsix → outputs/
just clean        # 删除 dist/、dist-webview/、node_modules/、outputs/
```
:::

## 系统要求

| 要求 | 版本 |
|---|---|
| Visual Studio Code | ≥ 1.85.0 |
| Node.js（仅构建） | ≥ 18 |
| just（仅构建） | 任意最新版本 |

## 配置计划目录

默认情况下，Plan Viewer 从 `~/.claude/plans` 读取文件。要使用其他位置：

1. 打开 VS Code 设置（`Ctrl+,`）
2. 搜索 **`planViewer.plansDirectory`**
3. 输入计划文件夹的完整路径

```json
// settings.json
{
  "planViewer.plansDirectory": "/path/to/your/plans"
}
```

留空则使用默认路径 `~/.claude/plans`。
