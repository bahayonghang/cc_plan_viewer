// 版本一致性检查脚本（CI 严格模式，不修改文件）
// 跨平台兼容（Windows / macOS / Linux），无需 shebang
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const version = pkg.version;
console.log(`🔍 Checking version consistency (expected: ${version})...`);
let ok = true;

// Check tauri.conf.json
const tauri = JSON.parse(
    fs.readFileSync(path.join(root, 'src-tauri', 'tauri.conf.json'), 'utf8')
);
if (tauri.version !== version) {
    console.log(`  ❌ tauri.conf.json: ${tauri.version} (expected ${version})`);
    ok = false;
} else {
    console.log(`  ✅ tauri.conf.json: ${tauri.version}`);
}

// Check Cargo.toml
const cargo = fs.readFileSync(path.join(root, 'src-tauri', 'Cargo.toml'), 'utf8');
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
