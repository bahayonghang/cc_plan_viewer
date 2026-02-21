# Plan Viewer VSCode Extension - Justfile
# VSCode 插件命令集
# 安装 just: winget install just (Windows) | brew install just (macOS) | cargo install just (Linux)

# 默认：显示帮助
default: help

# 显示帮助信息
help:
    @just --list

# ===== 依赖管理 =====

# 安装扩展依赖
install:
    @echo "📦 Installing dependencies..."
    cd plan-viewer-vscode && npm install

# ===== 开发 =====

# 启动开发监听（扩展 + Webview 并行）
dev:
    @echo "🔧 Starting development watch..."
    cd plan-viewer-vscode && npm run dev

# ===== 构建 =====

# 构建并打包扩展（Unix）
[unix]
build:
    @echo "🏗️  Building and packaging extension..."
    cd plan-viewer-vscode && npm run package
    mkdir -p outputs
    mv plan-viewer-vscode/*.vsix outputs/
    @echo "✅ Extension packaged → outputs/"

# 构建并打包扩展（Windows）
[windows]
build:
    @echo "🏗️  Building and packaging extension..."
    cd plan-viewer-vscode && npm run package
    node -e "const fs=require('fs'),path=require('path');if(!fs.existsSync('outputs'))fs.mkdirSync('outputs');fs.readdirSync('plan-viewer-vscode').filter(f=>f.endsWith('.vsix')).forEach(f=>fs.renameSync(path.join('plan-viewer-vscode',f),path.join('outputs',f)));"
    @echo "✅ Extension packaged → outputs/"

# TypeScript 类型检查（不输出文件）
type-check:
    @echo "🔍 Running type check..."
    cd plan-viewer-vscode && npx tsc --noEmit

# ===== 测试 =====

# 运行测试
test:
    @echo "🧪 Running tests..."
    cd plan-viewer-vscode && npm test

# ===== CI =====

# 运行 CI 检查：类型检查 + 代码规范 + 测试（任一失败即中止）
ci:
    @echo "🚦 Running CI checks..."
    cd plan-viewer-vscode && npm install
    cd plan-viewer-vscode && npx tsc --noEmit
    cd plan-viewer-vscode && npm run lint
    cd plan-viewer-vscode && npm test
    @echo "✅ All CI checks passed!"

# ===== 打包 =====

# 打包 .vsix（Unix）
[unix]
package:
    @echo "🧩 Packaging VSCode extension..."
    cd plan-viewer-vscode && npm install && npm run package
    mkdir -p outputs
    mv plan-viewer-vscode/*.vsix outputs/
    @echo "✅ Extension packaged → outputs/"

# 打包 .vsix（Windows）
[windows]
package:
    @echo "🧩 Packaging VSCode extension..."
    cd plan-viewer-vscode && npm install && npm run package
    node -e "const fs=require('fs'),path=require('path');if(!fs.existsSync('outputs'))fs.mkdirSync('outputs');fs.readdirSync('plan-viewer-vscode').filter(f=>f.endsWith('.vsix')).forEach(f=>fs.renameSync(path.join('plan-viewer-vscode',f),path.join('outputs',f)));"
    @echo "✅ Extension packaged → outputs/"

# ===== 文档 =====

# 启动文档站点（安装依赖 + 开发服务器）
docs: docs-install docs-dev

# 安装文档依赖
docs-install:
    @echo "📦 Installing docs dependencies..."
    cd docs && npm install

# 启动文档开发服务器
docs-dev:
    @echo "📖 Starting docs dev server..."
    cd docs && npm run dev

# 构建文档
docs-build:
    @echo "🏗️  Building docs..."
    cd docs && npm run build

# 预览文档构建结果
docs-preview:
    @echo "👁️  Previewing docs..."
    cd docs && npm run preview

# ===== 清理 =====

# 清理构建产物（Unix）
[unix]
clean:
    @echo "🧹 Cleaning build artifacts..."
    rm -rf plan-viewer-vscode/dist plan-viewer-vscode/dist-webview plan-viewer-vscode/node_modules outputs
    @echo "✨ Clean complete!"

# 清理构建产物（Windows）
[windows]
clean:
    @echo "🧹 Cleaning build artifacts..."
    node -e "const fs=require('fs');['plan-viewer-vscode/dist','plan-viewer-vscode/dist-webview','plan-viewer-vscode/node_modules','outputs'].forEach(p=>{try{fs.rmSync(p,{recursive:true,force:true})}catch(e){}});console.log('✨ Clean complete!');"
