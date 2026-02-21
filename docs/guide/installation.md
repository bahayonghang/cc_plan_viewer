# Installation

## VS Code Marketplace (Recommended)

The easiest way to install Plan Viewer:

1. Open VS Code
2. Press `Ctrl+Shift+X` (Windows/Linux) or `Cmd+Shift+X` (macOS) to open Extensions
3. Search for **`Plan Viewer`**
4. Click **Install** on the entry published by **anthropic-community**

Or open the Marketplace in your browser and click **Install**.

## Install from VSIX

If you have a `.vsix` file (e.g., from a GitHub release):

1. Open VS Code
2. Open the Extensions panel (`Ctrl+Shift+X`)
3. Click the **`···`** menu (top-right of the Extensions panel)
4. Choose **Install from VSIX…**
5. Select the `.vsix` file

Alternatively, use the command line:

```bash
code --install-extension plan-viewer-0.1.0.vsix
```

## Build from Source

Clone the repository and build locally using [`just`](https://just.systems):

```bash
git clone https://github.com/anthropic-community/plan-viewer-vscode.git
cd plan-viewer-vscode

# Install dependencies and package the extension
just package
# → outputs/plan-viewer-*.vsix

# Install the built extension
code --install-extension outputs/plan-viewer-*.vsix
```

::: details Available just commands
```
just install      # Install npm dependencies
just dev          # Start watch mode (extension + webview in parallel)
just build        # Production build
just type-check   # TypeScript check (tsc --noEmit)
just test         # Run tests (vitest)
just package      # Build .vsix → outputs/
just clean        # Remove dist/, dist-webview/, node_modules/, outputs/
```
:::

## System Requirements

| Requirement | Version |
|---|---|
| Visual Studio Code | ≥ 1.85.0 |
| Node.js (build only) | ≥ 18 |
| just (build only) | any recent version |

## Configure the Plans Directory

By default, Plan Viewer reads from `~/.claude/plans`. To use a different location:

1. Open VS Code Settings (`Ctrl+,`)
2. Search for **`planViewer.plansDirectory`**
3. Enter the full path to your plans folder

```json
// settings.json
{
  "planViewer.plansDirectory": "/path/to/your/plans"
}
```

Leave the setting empty to use the default `~/.claude/plans`.
