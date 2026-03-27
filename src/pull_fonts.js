#!/usr/bin/env node
'use strict';

const fs   = require('fs');
const path = require('path');
const os   = require('os');
const { execSync } = require('child_process');

function showHelp() {
    console.log(
        'Usage: npm run pull-fonts\n' +
        '       node src/pull_fonts.js\n' +
        '\n' +
        'Installs each font listed in config/fonts.json from fontsource\n' +
        'and copies font files to ~/.local/share/fonts.\n' +
        '\n' +
        'Fonts are then picked up automatically by resvg via loadSystemFonts.\n' +
        'Packages that are not found on fontsource are skipped with a warning.\n' +
        '\n' +
        'Edit config/fonts.json to add or remove fonts.\n'
    );
}

if (process.argv.slice(2).some(a => a === '--help' || a === '-h')) { showHelp(); process.exit(0); }

const ROOT      = path.join(__dirname, '..');
const FONTS_DIR = path.join(os.homedir(), '.local', 'share', 'fonts');
const fonts     = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'fonts.json'), 'utf8'));

fs.mkdirSync(FONTS_DIR, { recursive: true });

for (const font of fonts) {
    process.stdout.write(`  ${font.name} (${font.package})… `);
    try {
        execSync(`npm install --no-save ${font.package}`, {
            cwd:   ROOT,
            stdio: ['pipe', 'pipe', 'pipe'],
        });
    } catch {
        console.log('not found on fontsource, skipping');
        continue;
    }

    // Collect font files from the package's files/ subdir
    const pkgFilesDir = path.join(ROOT, 'node_modules', font.package, 'files');
    let entries;
    try {
        entries = fs.readdirSync(pkgFilesDir);
    } catch {
        console.log('installed but no files/ directory found, skipping');
        continue;
    }

    const EXTS = new Set(['.ttf', '.otf', '.woff2', '.woff']);
    const toCopy = entries.filter(f => EXTS.has(path.extname(f).toLowerCase()));
    for (const file of toCopy) {
        fs.copyFileSync(path.join(pkgFilesDir, file), path.join(FONTS_DIR, file));
    }
    console.log(`${toCopy.length} file(s) copied`);
}

console.log(`\nDone: ${FONTS_DIR}`);
