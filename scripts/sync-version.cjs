// 版本同步脚本：将 package.json 中的版本号同步到 tauri.conf.json 和 Cargo.toml
// 跨平台兼容（Windows / macOS / Linux），无需 shebang
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const version = pkg.version;
console.log(`🔄 Syncing versions to ${version} (from package.json)...`);
let changed = false;

// Sync tauri.conf.json
const tauriPath = path.join(root, 'src-tauri', 'tauri.conf.json');
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
const cargoPath = path.join(root, 'src-tauri', 'Cargo.toml');
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
