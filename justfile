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

# Ensure Rust toolchain is available (private)
[private]
ensure-rust:
    @echo "🔍 Checking Rust toolchain..."
    @rustc --version 2>nul || (echo "❌ Rust not found. Please install from https://rustup.rs/" && exit 1)
    @cargo --version 2>nul || (echo "❌ Cargo not found. Please install from https://rustup.rs/" && exit 1)
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

# Build Tauri application (debug mode)
tauri-build-debug: ensure-tauri-deps
    @echo "🔨 Building Tauri application (debug)..."
    pnpm tauri build --debug

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
    #!/usr/bin/env node
    const fs = require('fs');
    const path = require('path');
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const version = pkg.version;
    console.log(`🔄 Syncing versions to ${version} (from package.json)...`);
    let changed = false;
    // Sync tauri.conf.json
    const tauriPath = path.join('src-tauri', 'tauri.conf.json');
    const tauri = JSON.parse(fs.readFileSync(tauriPath, 'utf8'));
    if (tauri.version !== version) {
        console.log(`  → tauri.conf.json: ${tauri.version} → ${version}`);
        tauri.version = version;
        fs.writeFileSync(tauriPath, JSON.stringify(tauri, null, 2) + '\n');
        changed = true;
    } else {
        console.log(`  ✓ tauri.conf.json: ${tauri.version} (ok)`);
    }
    // Sync Cargo.toml
    const cargoPath = path.join('src-tauri', 'Cargo.toml');
    let cargo = fs.readFileSync(cargoPath, 'utf8');
    const m = cargo.match(/^version\s*=\s*"([^"]+)"/m);
    const cargoVer = m ? m[1] : null;
    if (cargoVer !== version) {
        console.log(`  → Cargo.toml: ${cargoVer} → ${version}`);
        cargo = cargo.replace(/^version\s*=\s*"[^"]+"/m, `version = "${version}"`);
        fs.writeFileSync(cargoPath, cargo);
        changed = true;
    } else {
        console.log(`  ✓ Cargo.toml: ${cargoVer} (ok)`);
    }
    if (changed) {
        console.log(`✅ Versions synced to ${version}`);
    } else {
        console.log(`✅ All versions already at ${version}`);
    }

# Check version consistency without modifying files (strict CI mode)
check-version:
    #!/usr/bin/env node
    const fs = require('fs');
    const path = require('path');
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const version = pkg.version;
    console.log(`🔍 Checking version consistency (expected: ${version})...`);
    let ok = true;
    // Check tauri.conf.json
    const tauri = JSON.parse(fs.readFileSync(path.join('src-tauri', 'tauri.conf.json'), 'utf8'));
    if (tauri.version !== version) {
        console.log(`  ❌ tauri.conf.json: ${tauri.version} (expected ${version})`);
        ok = false;
    } else {
        console.log(`  ✅ tauri.conf.json: ${tauri.version}`);
    }
    // Check Cargo.toml
    const cargo = fs.readFileSync(path.join('src-tauri', 'Cargo.toml'), 'utf8');
    const m = cargo.match(/^version\s*=\s*"([^"]+)"/m);
    const cargoVer = m ? m[1] : null;
    if (cargoVer !== version) {
        console.log(`  ❌ Cargo.toml: ${cargoVer} (expected ${version})`);
        ok = false;
    } else {
        console.log(`  ✅ Cargo.toml: ${cargoVer}`);
    }
    if (!ok) {
        console.log(`\n❌ Version mismatch! Run 'just sync-version' to fix.`);
        process.exit(1);
    }
    console.log(`✅ All versions match: ${version}`);

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
clean:
    @echo "🧹 Cleaning build artifacts..."
    @rm -rf dist/ 2>nul || echo "" >nul
    @rm -rf src-tauri/target/ 2>nul || echo "" >nul
    @rm -rf node_modules/ 2>nul || echo "" >nul
    @rm -rf docs/.vitepress/dist/ 2>nul || echo "" >nul
    @rm -rf docs/.vitepress/cache/ 2>nul || echo "" >nul
    @echo "✨ Clean complete!"

# List all recipes
list:
    @just --list
