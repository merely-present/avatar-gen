#!/usr/bin/env node
'use strict';

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function showHelp() {
    console.log(
        'Usage: npm run pull-fonts\n' +
        '       node src/pull_fonts.js\n' +
        '\n' +
        'Installs each font listed in config/fonts.json from fontsource into\n' +
        'node_modules. Fonts are used directly from there at render time.\n' +
        'Packages that are not found on fontsource are skipped with a warning.\n' +
        '\n' +
        'Edit config/fonts.json to add or remove fonts.\n'
    );
}

if (process.argv.slice(2).some(argToken => argToken === '--help' || argToken === '-h')) { showHelp(); process.exit(0); }

const ROOT  = path.join(__dirname, '..');
const fonts = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'fonts.json'), 'utf8'));

// Separate already-installed from missing
const missing  = fonts.filter(fontEntry => !fs.existsSync(path.join(ROOT, 'node_modules', fontEntry.package)));
const existing = fonts.filter(fontEntry =>  fs.existsSync(path.join(ROOT, 'node_modules', fontEntry.package)));

for (const font of existing) {
    console.log(`  ${font.name} (${font.package})… already installed, skipping`);
}

if (missing.length === 0) {
    console.log('\nDone');
    process.exit(0);
}

// Try installing all missing packages in one call (fast path).
// If that fails (e.g. one package doesn't exist), fall back to checking
// each individually via npm view, then install the valid ones together.
// Using --save-optional so packages are recorded in optionalDependencies,
// distinct from actual runtime dependencies.
const packages = missing.map(fontEntry => fontEntry.package).join(' ');
console.log(`  Installing: ${missing.map(fontEntry => fontEntry.name).join(', ')}…`);
let batchOk = false;
try {
    execSync(`npm install --save-optional ${packages}`, { cwd: ROOT, stdio: 'inherit' });
    batchOk = true;
} catch {
    console.log('  Batch install failed. Retrying individually to identify bad packages…');
}

if (!batchOk) {
    console.log('  Checking which packages exist on the registry…');
    const valid = [];
    for (const font of missing) {
        process.stdout.write(`  ${font.name} (${font.package})… `);
        try {
            execSync(`npm view ${font.package} version`, { cwd: ROOT, stdio: ['pipe', 'pipe', 'pipe'] });
            valid.push(font.package);
            console.log('found');
        } catch {
            console.log('not found on fontsource, skipping');
        }
    }
    if (valid.length > 0) {
        console.log(`  Installing valid packages…`);
        execSync(`npm install --save-optional ${valid.join(' ')}`, { cwd: ROOT, stdio: 'inherit' });
    }
}

console.log('\nDone');
