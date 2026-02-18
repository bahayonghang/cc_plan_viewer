# 安装配置

详细的安装和配置指南。

## 环境准备

### Node.js 安装

::: code-group
```powershell [Windows]
winget install OpenJS.NodeJS.LTS
```

```bash [macOS]
brew install node
```

```bash [Linux]
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs
```
:::

### pnpm 安装

```bash
npm install -g pnpm
```

### Rust 安装

::: code-group
```powershell [Windows]
winget install Rustlang.Rustup
```

```bash [macOS / Linux]
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```
:::

验证安装：

```bash
rustc --version
cargo --version
```

## 平台特定配置

### Windows

1. 安装 [Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
2. 在安装程序中选择 **"Desktop development with C++"** 工作负载
3. 确保安装了 Windows SDK

### macOS

1. 安装 Xcode Command Line Tools：
   ```bash
   xcode-select --install
   ```

2. 如果使用 Apple Silicon (M1/M2)，确保 Rust 使用正确的目标：
   ```bash
   rustup target add aarch64-apple-darwin
   ```

### Linux

安装所需的系统库：

```bash
sudo apt update
sudo apt install -y \
  libwebkit2gtk-4.1-dev \
  build-essential \
  libssl-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```

## 项目配置

### 克隆项目

```bash
git clone git@github.com:mekalz/plan_viewer.git
cd plan_viewer
```

### 安装依赖

```bash
pnpm install
```

### 配置文件

主要配置文件位于 `src-tauri/tauri.conf.json`：

```json
{
  "productName": "Plan Viewer",
  "version": "1.0.0",
  "identifier": "com.plan-viewer.app",
  "app": {
    "windows": [
      {
        "title": "Plan Viewer",
        "width": 1200,
        "height": 800,
        "resizable": true,
        "fullscreen": false
      }
    ]
  }
}
```

## 构建选项

### 开发构建

```bash
pnpm tauri dev
```

### 生产构建

```bash
pnpm tauri build
```

构建产物位于 `src-tauri/target/release/bundle/`。

### 调试构建

```bash
pnpm tauri build --debug
```

## 可用的 just 命令

| 命令 | 描述 |
|------|------|
| `just install-deps` | 安装 Node.js 依赖 |
| `just tauri-dev` | 启动 Tauri 开发模式 |
| `just tauri-build` | 构建生产版本 |
| `just tauri-build-debug` | 构建调试版本 |
| `just vite-dev` | 仅启动 Vite 开发服务器 |
| `just vite-build` | 构建前端 |
| `just check-all` | 检查 Rust 和 Node.js |
| `just clean` | 清理构建产物 |

## 故障排除

### Rust 未找到

确保 Rust 已安装且 `cargo` 在 PATH 中：

```bash
rustc --version
cargo --version
```

### WebView2 未找到 (Windows)

Windows 10/11 默认包含 WebView2。如果缺失：

- 从 [Microsoft Edge WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) 下载

### 端口被占用

Vite 默认使用端口 5173。如果被占用，修改 `vite.config.js`：

```javascript
export default defineConfig({
  server: {
    port: 5174
  }
})
```

### 构建链接错误

- **Windows**: 确保安装了 Visual Studio Build Tools 和 C++ 工作负载
- **Linux**: 确保安装了所有必需的系统库
