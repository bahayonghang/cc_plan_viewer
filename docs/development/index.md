# Development Guide

Everything you need to start contributing to Plan Viewer.

## Tech Stack

| Layer | Technology |
|---|---|
| Extension host | TypeScript, Node.js, VS Code API |
| Webview UI | Preact, TypeScript, Vite |
| Markdown rendering | `marked` + `marked-highlight` |
| Syntax highlighting | `highlight.js` |
| Diagram rendering | `mermaid` |
| Testing | `vitest` |
| Extension bundler | `esbuild` |
| Packaging | `@vscode/vsce` |

## Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- **VS Code** ≥ 1.85.0
- [`just`](https://just.systems) task runner (optional, but recommended)

## Setup

```bash
git clone https://github.com/anthropic-community/plan-viewer-vscode.git
cd plan-viewer-vscode

just install   # or: cd plan-viewer-vscode && npm install
```

## Development Commands

All commands are available via `just` from the repository root, or via `npm run` from `plan-viewer-vscode/`:

| `just` command | `npm run` equivalent | Description |
|---|---|---|
| `just install` | `npm install` | Install dependencies |
| `just dev` | `npm run dev` | Watch mode (extension + webview in parallel) |
| `just build` | `npm run build` | Production build + package `.vsix` |
| `just type-check` | `npx tsc --noEmit` | TypeScript type check |
| `just test` | `npm test` | Run vitest test suite |
| `just package` | `npm run package` | Build `.vsix` → `outputs/` |
| `just clean` | — | Remove `dist/`, `dist-webview/`, `node_modules/`, `outputs/` |

## Running the Extension Locally

1. Run `just dev` (or `npm run dev` in `plan-viewer-vscode/`)
2. Press `F5` in VS Code to open a new **Extension Development Host** window
3. The Plan Viewer extension is active in the development window
4. Edit source files — the watcher rebuilds automatically; reload the extension host with `Ctrl+R` to pick up changes

::: tip Webview Hot Reload
The webview (`dist-webview/`) is rebuilt by Vite's watch mode. After Vite rebuilds, close and reopen the Plan Viewer webview panel to load the latest webview bundle.
:::

## Running Tests

```bash
just test           # Run all tests once
cd plan-viewer-vscode && npm run test:watch   # Watch mode
```

Tests live in `plan-viewer-vscode/src/**/*.test.ts` and use `vitest`.

## Code Style

- TypeScript strict mode enabled
- ESLint configured for `.ts` and `.tsx` files
- Run `npm run lint` in `plan-viewer-vscode/` to check

## Submitting a Pull Request

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make your changes with tests
4. Run `just type-check && just test`
5. Open a pull request against `main`
