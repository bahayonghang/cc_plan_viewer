const fs = require('node:fs');
const path = require('node:path');

const isDebug = process.argv.includes('--debug');
const buildType = isDebug ? 'debug' : 'release';

const projectRoot = path.resolve(__dirname, '..');
const outputsDir = path.join(projectRoot, 'outputs');

// Ensure outputs directory exists
if (!fs.existsSync(outputsDir)) {
    fs.mkdirSync(outputsDir, { recursive: true });
}

console.log(`📦 Copying ${buildType} build artifacts to outputs directory...`);

// Files to copy
const targets = [
    // Green executable (portable)
    { dir: `src-tauri/target/${buildType}`, ext: '.exe', exact: 'plan-viewer.exe', destSuffix: isDebug ? '-debug.exe' : '.exe' },
    // MSI installer
    { dir: `src-tauri/target/${buildType}/bundle/msi`, ext: '.msi' },
    // NSIS installer
    { dir: `src-tauri/target/${buildType}/bundle/nsis`, ext: '.exe' },
];

let copiedCount = 0;

for (const target of targets) {
    const sourceDir = path.join(projectRoot, target.dir);

    if (!fs.existsSync(sourceDir)) {
        continue;
    }

    const files = fs.readdirSync(sourceDir);

    for (const file of files) {
        if (target.exact && file !== target.exact) continue;
        if (!target.exact && !file.endsWith(target.ext)) continue;

        // Copy file
        const sourcePath = path.join(sourceDir, file);

        // Determine destination filename
        let destFile = file;
        if (target.exact && target.destSuffix) {
            destFile = file.replace('.exe', target.destSuffix);
        }

        const destPath = path.join(outputsDir, destFile);

        try {
            fs.copyFileSync(sourcePath, destPath);
            console.log(`  ✓ Copied: ${destFile}`);
            copiedCount++;
        } catch (err) {
            console.error(`  ❌ Failed to copy ${file}:`, err.message);
        }
    }
}

if (copiedCount === 0) {
    console.log('  ⚠️ No artifacts found to copy. Make sure the build succeeded.');
} else {
    console.log(`✨ Successfully copied ${copiedCount} artifact(s) to ./outputs`);
}
