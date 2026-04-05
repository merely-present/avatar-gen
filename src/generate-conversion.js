#!/usr/bin/env node
'use strict';

const puppeteer                                     = require('puppeteer-core');
const { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } = require('fs');
const { resolve, join, dirname, basename, extname } = require('path');
const { execSync }                                  = require('child_process');
const { loadAndValidateJson }                       = require('./load-json.js');
const { ConvertConfigSchema }                       = require('./schemas.js');

// ---------------------------------------------------------------------------
// Chromium detection
// ---------------------------------------------------------------------------
function findChromium() {
    if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
    for (const bin of ['chromium-browser', 'chromium', 'chromium-headless']) {
        try { return execSync(`which ${bin}`, { stdio: 'pipe' }).toString().trim(); } catch {}
    }
    return null;
}
const CHROMIUM_EXEC = findChromium();
if (!CHROMIUM_EXEC) {
    console.error('Chromium not found. Install it: sudo dnf install chromium-headless');
    process.exit(1);
}

const RESOLUTIONS = [200, 400, 600, 800, 1000, 1080, 1200, 1600, 2000, 4000];

function showHelp() {
    console.log(
        'Usage: npm run convert -- --json <path/to/preset.convert.json> [--input-files <file> ...]\n' +
        '       node src/generate-conversion.js --json <path/to/preset.convert.json>\n' +
        '\n' +
        'All settings are provided through a JSON file validated against\n' +
        'schemas/convert.schema.json (JSON Schema 7, auto-generated).\n' +
        '\n' +
        'Key JSON fields:\n' +
        '  input-files     Array of SVG file paths to convert (required)\n' +
        '  output-dir      Parent for output dirs  [same dir as each input file]\n' +
        '  text-font       Override font family  [auto-detected from SVG]\n' +
        '\n' +
        'CLI overrides:\n' +
        '  --input-files <f1> [f2 ...]   Override inputFiles from the JSON\n' +
        '\n' +
        'Resolutions: ' + RESOLUTIONS.join(', ') + '\n' +
        '\n' +
        'Output per input file (e.g. foo.svg → foo/):\n' +
        '  foo_<N>x<N>.png   PNG with transparent background\n' +
        '  foo_<N>x<N>.jpg   JPEG with white background\n'
    );
}

// ---------------------------------------------------------------------------
// CLI — only --json <path> and --help
// ---------------------------------------------------------------------------
const argv = process.argv.slice(2);
if (argv.some(a => a === '--help' || a === '-h')) { showHelp(); process.exit(0); }

const jsonFlagIndex = argv.indexOf('--json');
if (jsonFlagIndex === -1) {
    console.error('Error: --json <path> is required.\nRun with --help for usage.');
    process.exit(1);
}
const jsonPath = argv[jsonFlagIndex + 1];
if (!jsonPath || jsonPath.startsWith('--')) {
    console.error('Error: --json requires a file path argument.');
    process.exit(1);
}

const config = loadAndValidateJson(jsonPath, ConvertConfigSchema);

// --input-files <f1> [f2 ...] overrides inputFiles from the JSON config
const inputFilesFlagIndex = argv.indexOf('--input-files');
const rawInputFiles = inputFilesFlagIndex !== -1
    ? argv.slice(inputFilesFlagIndex + 1).filter(a => !a.startsWith('--'))
    : config.inputFiles;

const inputFiles   = rawInputFiles.map(f => resolve(f));
const outputDirOpt = config.outputDir ? resolve(config.outputDir) : null;
const fontOverride = config.textFont ?? null;

// ---------------------------------------------------------------------------
// Font embedding helpers
// ---------------------------------------------------------------------------
const FONTSOURCE_DIR = join(__dirname, '..', 'node_modules', '@fontsource');

function buildFontFaceCSS(family) {
    const slug     = family.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const filesDir = join(FONTSOURCE_DIR, slug, 'files');
    if (!existsSync(join(FONTSOURCE_DIR, slug))) {
        console.warn(`Warning: font '${family}': package not found in node_modules. Run \`npm run pull-fonts\` to install fonts.`);
        return null;
    }
    const allFiles = readdirSync(filesDir);
    let matching = allFiles.filter(f => f.startsWith(slug + '-latin') && f.endsWith('.woff2'));
    if (matching.length === 0)
        matching = allFiles.filter(f => f.startsWith(slug) && f.endsWith('.woff2'));
    if (matching.length === 0) return null;
    return matching.map(f => {
        const m      = f.match(/-(\d+)-(normal|italic)\.woff2$/);
        const weight = m ? m[1] : '400';
        const style  = m ? m[2] : 'normal';
        const b64    = readFileSync(join(filesDir, f)).toString('base64');
        return `@font-face{font-family:'${family}';src:url('data:font/woff2;base64,${b64}')format('woff2');font-weight:${weight};font-style:${style};}`;
    }).join('');
}

function parseFontFromSvg(svgText) {
    const m = svgText.match(/font-family="'([^']+)'"/) ?? svgText.match(/font-family="([^"]+)"/);
    return m ? m[1].trim() : null;
}

// ---------------------------------------------------------------------------
// Load SVG files and resolve fonts
// ---------------------------------------------------------------------------
console.log(`Converting ${inputFiles.length} file(s)…`);

const svgEntries = inputFiles.map(filePath => {
    const svg      = readFileSync(filePath, 'utf8');
    const fontName = fontOverride ?? parseFontFromSvg(svg) ?? 'DejaVu Sans Mono';
    return { file: filePath, svg, fontName };
});

const uniqueFonts = [...new Set(svgEntries.map(e => e.fontName))];
const combinedCss = uniqueFonts.map(fontName => {
    const css = buildFontFaceCSS(fontName);
    if (css === null) console.warn(`Warning: font '${fontName}': no WOFF2 files found. Run \`npm run pull-fonts\`.`);
    return css ?? '';
}).join('');

// ---------------------------------------------------------------------------
// Render — one browser, one page, all files × all resolutions
// ---------------------------------------------------------------------------
const BAR_WIDTH   = 20;
const BAR_EIGHTHS = [' ', '▏', '▎', '▍', '▌', '▋', '▊', '▉', '█'];

const totalSteps = svgEntries.length * RESOLUTIONS.length * 2;
let   doneSteps  = 0;

function printProgress(fileStem) {
    const pct    = Math.round(doneSteps / totalSteps * 100);
    const filled = doneSteps / totalSteps * BAR_WIDTH;
    const full   = Math.floor(filled);
    const eighth = Math.floor((filled - full) * 8);
    const bar    = '█'.repeat(full) + (full < BAR_WIDTH ? BAR_EIGHTHS[eighth] + ' '.repeat(BAR_WIDTH - full - 1) : '');
    const stepStr = String(doneSteps).padStart(String(totalSteps).length);
    process.stdout.write(`\r|${bar}| ${stepStr}/${totalSteps} ${pct.toString().padStart(3)}% '${fileStem}'`);
}

(async () => {
    const browser = await puppeteer.launch({ executablePath: CHROMIUM_EXEC, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page    = await browser.newPage();

    await page.setContent(
        `<!DOCTYPE html><html><head><style>html,body{margin:0;padding:0;}${combinedCss}</style></head><body></body></html>`
    );
    await page.evaluate(() => document.fonts.ready);

    for (const { file, svg } of svgEntries) {
        const fileStem = basename(file, extname(file));
        const baseDir  = outputDirOpt ?? dirname(file);
        const batchDir = join(baseDir, fileStem);
        mkdirSync(batchDir, { recursive: true });

        await page.evaluate((svgContent) => { document.body.innerHTML = svgContent; }, svg);

        for (const renderSize of RESOLUTIONS) {
            await page.setViewport({ width: 400, height: 400, deviceScaleFactor: renderSize / 400 });

            const pngBuffer = await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: 400, height: 400 } });
            writeFileSync(join(batchDir, `${fileStem}_${renderSize}x${renderSize}.png`), pngBuffer);
            doneSteps++; printProgress(fileStem);

            const jpgBuffer = await page.screenshot({ type: 'jpeg', quality: 92, clip: { x: 0, y: 0, width: 400, height: 400 } });
            writeFileSync(join(batchDir, `${fileStem}_${renderSize}x${renderSize}.jpg`), jpgBuffer);
            doneSteps++; printProgress(fileStem);
        }
    }

    await browser.close();
    process.stdout.write('\n');
    console.log('Done.');
})().catch(err => { console.error(err); process.exit(1); });
