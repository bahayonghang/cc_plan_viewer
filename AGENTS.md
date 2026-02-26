# AGENTS.md — Plan Viewer VSCode Extension

## Project Overview

VSCode extension for reviewing Claude Code plan files. Dual-process architecture:
- **Extension Host** (Node.js, esbuild) — VSCode API, file I/O, TreeView, globalState
- **Webview** (Preact, Vite) — sandboxed iframe, Markdown rendering, comments UI

Communication via typed `postMessage` protocol in `src/webview/lib/messageProtocol.ts`.

## Build / Dev / Test Commands

All commands run from repo root via `just`, or from `plan-viewer-vscode/` via npm.

```bash
# Dependencies
just install                    # npm install in plan-viewer-vscode/

# Development
just dev                        # Watch mode (extension + webview in parallel)

# Build
just build                      # Production build → outputs/*.vsix
just type-check                 # tsc --noEmit (extension host only)

# Lint
cd plan-viewer-vscode && npm run lint   # ESLint on src/

# Test (vitest)
just test                       # Run all tests
cd plan-viewer-vscode && npx vitest run                    # All tests
cd plan-viewer-vscode && npx vitest run src/test/services/commentBuilder.test.ts  # Single file
cd plan-viewer-vscode && npx vitest run -t "应生成基本评论块"                      # Single test by name
cd plan-viewer-vscode && npx vitest                        # Watch mode

# CI (full pipeline)
just ci                         # install → type-check → lint → test

# Package
just package                    # Build .vsix → outputs/

# Clean
just clean                      # Remove dist/, dist-webview/, node_modules/, outputs/
```

## Architecture Quick Reference

```
plan-viewer-vscode/src/
├── extension.ts              # Entry point, command registration
├── types.ts                  # Shared interfaces (PlanInfo, Plan, Comment, CommentData)
├── constants.ts              # Emoji mappings, markers, magic strings
├── services/
│   ├── planService.ts        # List/load plans, project extraction, in-memory cache
│   ├── commentService.ts     # Comment CRUD, dual-write (globalState + Markdown)
│   ├── commentSync.ts        # Bidirectional JSON ↔ Markdown reconciliation
│   ├── commentBuilder.ts     # Comment → Markdown block
│   ├── commentParser.ts      # Markdown block → Comment[]
│   ├── commentInjector.ts    # Insert/remove comment blocks in .md files
│   ├── fileWatcher.ts        # FSWatcher with 300ms debounce
│   └── utils.ts              # generateCommentId()
├── providers/
│   ├── planTreeProvider.ts   # TreeDataProvider + project grouping + time filter
│   ├── planTreeItem.ts       # Individual TreeItem with dynamic ThemeIcon colors
│   └── webviewPanelManager.ts# Singleton webview lifecycle, message routing
├── test/                     # Vitest unit tests
└── webview/                  # Preact app (separate Vite build)
    ├── App.tsx               # Root component, message handler
    ├── lib/
    │   ├── messageProtocol.ts # Typed postMessage protocol
    │   └── markdown.ts        # marked + highlight.js rendering
    ├── components/           # Functional Preact components
    └── styles/               # CSS with VS Code CSS variables
```

## Code Style Guidelines

### TypeScript Config
- `strict: true` in both tsconfigs
- Extension: `module: "Node16"`, `target: "ES2022"`
- Webview: `module: "ESNext"`, `jsx: "react-jsx"`, `jsxImportSource: "preact"`

### Imports
- **Order**: (1) `vscode` / Node builtins, (2) third-party, (3) local relatives
- **Named imports only** — no default imports (except Preact hooks from `preact/hooks`)
- **Type imports** use `import type { ... }` when importing types only
- **Relative paths** without file extensions: `'../types'` not `'../types.js'`
- No barrel files — import directly from the source module

```typescript
// ✅ Correct
import * as vscode from 'vscode';
import * as path from 'path';
import type { Comment, CommentData } from '../types';
import { PlanService } from './planService';

// Webview (Preact)
import { useState, useEffect, useCallback } from 'preact/hooks';
import type { Plan } from '../types';
```

### Exports
- **Classes**: named export `export class FooService { }`
- **Functions**: named export `export function buildCommentBlock() { }`
- **Types**: named export `export interface Plan { }`, `export type CommentType = ...`
- No default exports anywhere

### Types & Interfaces
- Shared types live in `src/types.ts` — import from there
- Use `interface` for object shapes, `type` for unions/aliases
- No `I-` prefix on interfaces
- Component props: `interface FooProps { }` defined above the component
- Inline `Record<K, V>` for simple maps

### Functions
- **Top-level**: `function` declarations (not arrow functions)
- **Methods**: standard class method syntax
- **Callbacks/hooks**: arrow functions inside components
- **Async**: `async function foo(): Promise<T>` — always return typed Promise

### Error Handling
- `try/catch` with empty `catch { }` for non-critical failures (file reads, stat)
- `console.error('[Plan Viewer] 描述:', e)` for logging errors in extension host
- Never throw from service methods that can gracefully return `null` or `[]`
- No custom error classes — rely on standard Error

### Naming Conventions
- **Files**: `camelCase.ts` / `camelCase.tsx` (e.g., `planService.ts`, `MarkdownViewer.tsx`)
  - Exception: component files are `PascalCase.tsx`
- **Classes**: `PascalCase` (e.g., `PlanService`, `WebviewPanelManager`)
- **Functions**: `camelCase` (e.g., `extractTitle`, `buildCommentBlock`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `COMMENT_EMOJI`, `REVIEW_MARKER`)
- **Interfaces/Types**: `PascalCase` (e.g., `PlanInfo`, `CommentType`)
- **Variables**: `camelCase`
- **Unused params**: prefix with `_` (ESLint enforced: `argsIgnorePattern: '^_'`)

### Formatting
- **Single quotes** for strings
- **Semicolons** at end of statements
- **2-space indentation**
- **Trailing commas** in multi-line arrays, objects, and parameter lists
- No explicit formatter config (Prettier/EditorConfig) — follow existing file style

### Comments
- **File headers**: `// ── 描述 ─────────────` (CJK box-drawing style dividers)
- **Section dividers**: `// ── 区域名 ────────────` within files
- **JSDoc** (`/** */`) on exported functions and classes — brief, 1-3 lines
- **Inline comments** in Chinese for implementation notes
- **Test descriptions** in Chinese (`'应生成基本评论块'`)

### Webview Components (Preact)
- Functional components only: `export function Foo(props: FooProps) { }`
- Hooks: `useState`, `useEffect`, `useCallback`, `useRef`, `useMemo` from `preact/hooks`
- Use `class` not `className` in JSX (Preact convention)
- CSS via plain `.css` files using VS Code CSS custom properties (`--vscode-*`)
- State: single `useState<AppState>` object in App.tsx, props drilling to children

### Message Protocol
- All messages are discriminated unions on `type` field
- Define per-message interfaces, then combine with `type Union = A | B | C`
- Extension → Webview: `ExtensionToWebviewMessage`
- Webview → Extension: `WebviewToExtensionMessage`

### ESLint Rules
- Config: flat config in `eslint.config.js` using `typescript-eslint`
- `@typescript-eslint/no-explicit-any`: **warn** (allowed for VSCode API interop)
- `@typescript-eslint/no-unused-vars`: **error** (unused params must start with `_`)
- Ignores: `dist/`, `dist-webview/`, `node_modules/`, `*.js`

### Testing Conventions
- **Framework**: Vitest with `globals: true`
- **Location**: `src/test/` mirroring `src/` structure (e.g., `test/services/foo.test.ts`)
- **Naming**: `*.test.ts`
- **Imports**: `import { describe, it, expect } from 'vitest'`
- **Structure**: `describe('functionName', () => { it('应...', () => { ... }) })`
- **Test descriptions**: in Chinese
- **Helper factories**: `function makeComment(overrides: Partial<Comment>): Comment`
- **No VSCode API mocking** — tests cover pure-logic services only (commentBuilder,
  commentParser, commentInjector, commentSync), not VSCode-dependent services

## Key Patterns to Preserve

1. **Dual-write comments**: globalState is source of truth; Markdown embedding is optional.
   `commentSync.ts` reconciles both on every `getPlan()` call.
2. **In-memory cache**: `projectCache` in planService.ts keyed by `planId:mtime`.
3. **Initial plan injection**: `window.__INITIAL_PLAN__` avoids webview load race condition.
4. **Mermaid lazy-loading**: Separate chunk (~535KB), loaded only when diagram blocks exist.
5. **l10n**: VSCode localization in `l10n/bundle.l10n.*.json`. UI strings use `vscode.l10n.t()`.
