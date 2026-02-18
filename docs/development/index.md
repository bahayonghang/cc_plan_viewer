# 开发指南

欢迎参与 Plan Viewer 的开发！本指南将帮助你了解项目架构和开发流程。

## 技术栈

| 技术 | 用途 |
|------|------|
| Tauri 2.0 | 桌面应用框架 |
| Rust | 后端逻辑 |
| Vite | 前端构建工具 |
| Vanilla JS | 前端逻辑 |
| Mermaid | 图表渲染 |
| highlight.js | 代码高亮 |

## 开发环境设置

```bash
# 克隆项目
git clone git@github.com:mekalz/plan_viewer.git
cd plan_viewer

# 安装依赖
pnpm install

# 启动开发模式
pnpm tauri dev
```

## 开发工作流

1. **启动开发模式**: `pnpm tauri dev`
2. **修改代码**:
   - 前端代码在 `src/` 目录，修改后自动热重载
   - Rust 代码在 `src-tauri/src/`，修改后自动重新编译
3. **测试变更**: 在应用中验证功能
4. **提交代码**: 遵循提交规范

## 项目结构

```
plan-viewer/
├── src/                    # 前端源码
│   ├── index.html          # 主 HTML
│   ├── main.js             # 入口文件
│   ├── app.js              # 应用逻辑
│   └── styles/
│       └── main.css        # 样式
│
├── src-tauri/              # Tauri (Rust) 后端
│   ├── src/
│   │   └── main.rs         # Rust 后端代码
│   ├── icons/              # 应用图标
│   ├── Cargo.toml          # Rust 依赖
│   └── tauri.conf.json     # Tauri 配置
│
├── docs/                   # 文档源码
│   ├── .vitepress/         # VitePress 配置
│   ├── features/           # 功能文档
│   ├── guide/              # 使用指南
│   └── development/        # 开发文档
│
├── package.json            # Node.js 依赖
├── vite.config.js          # Vite 配置
└── justfile                # Just 命令
```

## 下一步

- [Tauri 开发](/development/tauri) - 了解 Tauri 后端开发
- [项目结构](/development/architecture) - 深入了解架构
- [自定义配置](/development/customization) - 自定义应用
