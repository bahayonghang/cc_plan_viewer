# 自定义配置

了解如何自定义 Plan Viewer 的各项配置。

## 窗口配置

编辑 `src-tauri/tauri.conf.json`：

```json
{
  "app": {
    "windows": [
      {
        "title": "Plan Viewer",
        "width": 1200,
        "height": 800,
        "minWidth": 800,
        "minHeight": 600,
        "resizable": true,
        "fullscreen": false,
        "decorations": true,
        "transparent": false,
        "alwaysOnTop": false
      }
    ]
  }
}
```

### 配置选项

| 选项 | 类型 | 说明 |
|------|------|------|
| `title` | string | 窗口标题 |
| `width` | number | 初始宽度（像素） |
| `height` | number | 初始高度（像素） |
| `minWidth` | number | 最小宽度 |
| `minHeight` | number | 最小高度 |
| `resizable` | boolean | 是否可调整大小 |
| `fullscreen` | boolean | 是否全屏启动 |
| `decorations` | boolean | 是否显示窗口装饰 |
| `transparent` | boolean | 窗口是否透明 |
| `alwaysOnTop` | boolean | 是否始终置顶 |

## 应用信息

```json
{
  "productName": "Plan Viewer",
  "version": "1.0.0",
  "identifier": "com.plan-viewer.app"
}
```

## 主题自定义

编辑 `src/styles/main.css`：

### CSS 变量

```css
:root {
  /* 品牌色 */
  --brand-primary: #7c3aed;
  --brand-secondary: #8b5cf6;
  
  /* 背景色 */
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  
  /* 文字色 */
  --text-primary: #1e293b;
  --text-secondary: #64748b;
  
  /* 边框 */
  --border-color: #e2e8f0;
  
  /* 阴影 */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.dark {
  --brand-primary: #a78bfa;
  --brand-secondary: #8b5cf6;
  
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  
  --text-primary: #f1f5f9;
  --text-secondary: #94a3b8;
  
  --border-color: #334155;
}
```

### 自定义配色方案

```css
/* 蓝色主题 */
:root {
  --brand-primary: #3b82f6;
  --brand-secondary: #60a5fa;
}

/* 绿色主题 */
:root {
  --brand-primary: #10b981;
  --brand-secondary: #34d399;
}

/* 橙色主题 */
:root {
  --brand-primary: #f97316;
  --brand-secondary: #fb923c;
}
```

## Mermaid 配置

在 `src/app.js` 中配置 Mermaid：

```javascript
mermaid.initialize({
  startOnLoad: true,
  theme: isDark ? 'dark' : 'default',
  flowchart: {
    useMaxWidth: true,
    htmlLabels: true,
    curve: 'basis'
  },
  sequence: {
    diagramMarginX: 50,
    diagramMarginY: 10,
    actorMargin: 50,
    width: 150,
    height: 65
  }
});
```

## 文件监听配置

在 `src-tauri/src/main.rs` 中：

```rust
// 监听路径
const PLANS_DIR: &str = ".claude/plans";

// 防抖时间（毫秒）
const DEBOUNCE_MS: u64 = 100;

// 最大重试次数
const MAX_RETRIES: u32 = 5;

// 重试间隔（毫秒）
const RETRY_INTERVAL_MS: u64 = 1000;
```

## 构建配置

### Vite 配置 (vite.config.js)

```javascript
export default defineConfig({
  server: {
    port: 5173,
    host: 'localhost',
    open: false
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'esbuild'
  }
});
```

### Rust 构建配置 (Cargo.toml)

```toml
[profile.release]
lto = true          # 链接时优化
strip = true        # 移除符号
opt-level = "z"     # 优化体积
codegen-units = 1   # 单代码生成单元

[profile.dev]
opt-level = 0       # 不优化
debug = true        # 包含调试信息
```

## 图标配置

应用图标位于 `src-tauri/icons/`：

| 文件 | 用途 |
|------|------|
| `icon.ico` | Windows 应用图标 |
| `icon.svg` | 矢量图标源文件 |
| `icon-32x32.png` | 小尺寸图标 |
| `icon-128x128.png` | 中等尺寸图标 |
| `icon-256x256.png` | 大尺寸图标 |
| `icon-512x512.png` | 超大尺寸图标 |

### 生成图标

从 SVG 生成各尺寸 PNG：

```bash
# 需要安装 sharp 和 png-to-ico
npx sharp -i icon.svg -o src-tauri/icons/icon-32x32.png resize 32
npx sharp -i icon.svg -o src-tauri/icons/icon-128x128.png resize 128
npx sharp -i icon.svg -o src-tauri/icons/icon-256x256.png resize 256
npx sharp -i icon.svg -o src-tauri/icons/icon-512x512.png resize 512
```

## 安全配置

### CSP (内容安全策略)

```json
{
  "app": {
    "security": {
      "csp": "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'"
    }
  }
}
```

::: warning 安全警告
开发时可以放宽 CSP，生产环境建议严格配置。
:::
