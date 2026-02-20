# Plan Viewer - Justfile
# Cross-platform command runner (requires: https://just.systems)
# Install:
#   Windows: winget install just
#   macOS:   brew install just
#   Linux:   cargo install just

# Default recipe - show help
default:
    @just --list

# ===== DEPENDENCY MANAGEMENT =====

# Install Node.js dependencies
install-deps:
    @echo "📦 Installing Node.js dependencies..."
    pnpm install

# Check Rust version
check-rust:
    @echo "🦀 Checking Rust..."
    @rustc --version
    @cargo --version

# Check Node.js version
check-node:
    @echo "📦 Checking Node.js..."
    @node --version
    @pnpm --version

# Check all dependencies
check-all: check-rust check-node
    @echo "✅ All checks passed!"

# Ensure Node.js dependencies are installed (private)
# Uses pnpm's built-in check - it will skip if already up to date
[private]
ensure-node-deps:
    @echo "🔍 Checking Node.js dependencies..."
    pnpm install --prefer-offline
    pnpm approve-builds

# Ensure Rust toolchain is available (private)
[private]
ensure-rust:
    @echo "🔍 Checking Rust toolchain..."
    @rustc --version
    @cargo --version
    @echo "✅ Rust toolchain is available"

# Ensure all dependencies for Tauri build (private)
[private]
ensure-tauri-deps: ensure-node-deps ensure-rust
    @echo "✅ All Tauri dependencies ready"

# ===== TAURI MODE (Desktop app) =====

# Start Tauri development server
tauri-dev: ensure-tauri-deps
    @echo "🔧 Starting Tauri development..."
    pnpm tauri dev

# Build Tauri application
tauri-build: ensure-tauri-deps
    @echo "🏗️  Building Tauri application..."
    pnpm tauri build
    node scripts/copy-artifacts.cjs

# Build Tauri application (debug mode)
tauri-build-debug: ensure-tauri-deps
    @echo "🔨 Building Tauri application (debug)..."
    pnpm tauri build --debug
    node scripts/copy-artifacts.cjs --debug

# ===== VITE COMMANDS =====

# Start Vite dev server (frontend only)
vite-dev: ensure-node-deps
    @echo "⚡ Starting Vite dev server..."
    pnpm dev

# Build frontend only
vite-build: ensure-node-deps
    @echo "📦 Building frontend..."
    pnpm build

# Preview production build
vite-preview: ensure-node-deps
    @echo "👀 Previewing production build..."
    pnpm preview

# ===== DOCS COMMANDS =====

# Start VitePress dev server (documentation)
docs-dev: ensure-node-deps
    @echo "📚 Starting VitePress dev server..."
    pnpm docs:dev

# Build documentation
docs-build: ensure-node-deps
    @echo "📖 Building documentation..."
    pnpm docs:build

# Preview documentation build
docs-preview: ensure-node-deps
    @echo "👀 Previewing documentation build..."
    pnpm docs:preview

# ===== VERSION MANAGEMENT =====

# Sync all project versions to match package.json (single source of truth)
sync-version:
    node scripts/sync-version.cjs

# Check version consistency without modifying files (strict CI mode)
check-version:
    node scripts/check-version.cjs

# ===== CI COMMANDS =====

# Run all CI checks (version sync, lint, type check, static analysis)
ci: ensure-node-deps ensure-rust sync-version ci-frontend ci-rust
    @echo "✅ All CI checks passed!"

# Run frontend CI checks
ci-frontend: ensure-node-deps
    @echo "🔍 Running frontend CI checks..."
    @echo "  → Building frontend (syntax & type check)..."
    pnpm build
    @echo "✅ Frontend checks passed!"

# Run Rust CI checks
ci-rust: ensure-rust
    @echo "🔍 Running Rust CI checks..."
    @echo "  → cargo check (syntax & type check)..."
    cd src-tauri && cargo check --all-targets --all-features
    @echo "  → cargo clippy (static analysis)..."
    cd src-tauri && cargo clippy --all-targets --all-features -- -D warnings
    @echo "  → cargo fmt --check (format check)..."
    cd src-tauri && cargo fmt --check
    @echo "✅ Rust checks passed!"

# Fix Rust formatting issues
ci-fix: ensure-rust
    @echo "🔧 Fixing Rust formatting..."
    cd src-tauri && cargo fmt
    @echo "✅ Formatting fixed!"

# ===== UTILITIES =====

# Clean build artifacts
[unix]
clean:
    @echo "🧹 Cleaning build artifacts..."
    rm -rf dist/ src-tauri/target/ node_modules/ docs/.vitepress/dist/ docs/.vitepress/cache/
    @echo "✨ Clean complete!"

# Clean build artifacts (Windows)
[windows]
clean:
    @echo "🧹 Cleaning build artifacts..."
    node -e "const fs=require('fs');['dist','src-tauri/target','node_modules','docs/.vitepress/dist','docs/.vitepress/cache'].forEach(p=>{try{fs.rmSync(p,{recursive:true,force:true})}catch(e){}});console.log('✨ Clean complete!');"

# List all recipes
list:
    @just --list
