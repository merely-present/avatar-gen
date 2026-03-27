#!/usr/bin/env node
'use strict';

const fs   = require('fs');
const path = require('path');
const os   = require('os');
const { execSync } = require('child_process');
const puppeteer = require('puppeteer-core');

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

function fontStatus() {
    const fontsJsonPath = path.join(__dirname, '..', 'config', 'fonts.json');
    const userFontsDir  = path.join(os.homedir(), '.local', 'share', 'fonts');
    let fonts;
    try { fonts = JSON.parse(fs.readFileSync(fontsJsonPath, 'utf8')); }
    catch { return '  (config/fonts.json not found)'; }
    let installed = [];
    try { installed = fs.readdirSync(userFontsDir); } catch {}
    return fonts.map(f => {
        const slug  = f.package.replace('@fontsource/', '');
        const found = installed.some(file => file.startsWith(slug + '-'));
        return `  ${found ? '✓' : '✗'} ${f.name.padEnd(24)} ${found ? 'installed' : 'not installed'}`;
    }).join('\n');
}

function showHelp() {
    console.log(
        'Usage: npm run generate-cycle-fonts -- [options]\n' +
        '       node src/generate_cycle_fonts.js [options]\n' +
        '\n' +
        'Renders one avatar per font in config/fonts.json.\n' +
        'All generate_avatar.js flags are forwarded (except --text-font, controlled here).\n' +
        '\n' +
        'Own options:\n' +
        '  --res <n>            PNG render resolution, square px  [400]\n' +
        '  --output-dir <path>  Batch output directory  [cwd]\n' +
        '\n' +
        'Output: <output-dir>/font_cycle_<datetime>/<font-slug>.{svg,png}\n' +
        '\n' +
        'Fonts (config/fonts.json):\n' +
        fontStatus() + '\n' +
        '\n' +
        '  Run `npm run pull-fonts` to install fonts to ~/.local/share/fonts\n'
    );
}

const ROOT            = path.join(__dirname, '..');
const FONTS_JSON      = path.join(ROOT, 'config', 'fonts.json');
const GENERATE_AVATAR = path.join(__dirname, 'generate_avatar.js');

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------
if (process.argv.slice(2).some(a => a === '--help' || a === '-h')) { showHelp(); process.exit(0); }

const MY_KEYS = new Set(['output-dir', 'res']);
const argv    = process.argv.slice(2);
const myOpts  = {};
const passthroughKV = {};

for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const eqIdx = arg.indexOf('=');
    const key   = eqIdx >= 0 ? arg.slice(2, eqIdx) : arg.slice(2);
    const val   = eqIdx >= 0 ? arg.slice(eqIdx + 1) : argv[++i];
    if (MY_KEYS.has(key)) {
        myOpts[key] = val;
    } else if (key !== 'text-font') {  // we control --text-font
        passthroughKV[key] = val;
    }
}

const res       = parseInt(myOpts.res || '400', 10);
const outputDir = myOpts['output-dir']
    ? path.resolve(myOpts['output-dir'])
    : process.cwd();

// ---------------------------------------------------------------------------
// Batch output dir
// ---------------------------------------------------------------------------
const now      = new Date();
const pad2     = n => String(n).padStart(2, '0');
const tzOffset = -now.getTimezoneOffset();
const tzSign   = tzOffset >= 0 ? '+' : '-';
const tzH      = pad2(Math.floor(Math.abs(tzOffset) / 60));
const tzM      = pad2(Math.abs(tzOffset) % 60);
const timestamp = [
    now.getFullYear(),
    '-', pad2(now.getMonth() + 1),
    '-', pad2(now.getDate()),
    '_', pad2(now.getHours()),
    '-', pad2(now.getMinutes()),
    '-', pad2(now.getSeconds()),
    '_', tzSign, tzH, tzM,
].join('');

const batchDir = path.join(outputDir, `font_cycle_${timestamp}`);
fs.mkdirSync(batchDir, { recursive: true });

// ---------------------------------------------------------------------------
// Font embedding — reads WOFF2 from ~/.local/share/fonts, returns @font-face
// CSS for inline embedding in the HTML page Puppeteer renders.
// ---------------------------------------------------------------------------
const USER_FONTS_DIR = path.join(os.homedir(), '.local', 'share', 'fonts');

function buildFontFaceCSS(fontFamily, pkgSlug) {
    let allFiles;
    try { allFiles = fs.readdirSync(USER_FONTS_DIR); } catch { return null; }
    // Prefer latin subset; fall back to any WOFF2 for this package
    let matching = allFiles.filter(f => f.startsWith(pkgSlug + '-latin') && f.endsWith('.woff2'));
    if (matching.length === 0)
        matching = allFiles.filter(f => f.startsWith(pkgSlug) && f.endsWith('.woff2'));
    if (matching.length === 0) return null;
    return matching.map(file => {
        const m      = file.match(/-(\d+)-(normal|italic)\.woff2$/);
        const weight = m ? m[1] : '400';
        const style  = m ? m[2] : 'normal';
        const b64    = fs.readFileSync(path.join(USER_FONTS_DIR, file)).toString('base64');
        return `@font-face{font-family:'${fontFamily}';src:url('data:font/woff2;base64,${b64}')format('woff2');font-weight:${weight};font-style:${style};}`;
    }).join('');
}

// ---------------------------------------------------------------------------
// Build CLI args
// ---------------------------------------------------------------------------
function buildCli(overrides) {
    const merged = { ...passthroughKV, ...overrides };
    const parts  = [];
    for (const [k, v] of Object.entries(merged)) {
        parts.push(`--${k}`, String(v));
    }
    return parts;
}

function shellEscape(a) {
    if (/^[a-zA-Z0-9_.\/=:+-]+$/.test(a)) return a;
    return "'" + a.replace(/'/g, "'\\''") + "'";
}

// ---------------------------------------------------------------------------
// Generate per font
// ---------------------------------------------------------------------------
const fonts = JSON.parse(fs.readFileSync(FONTS_JSON, 'utf8'));
console.log(`Generating ${fonts.length} font variants → ${batchDir}`);

(async () => {
    const browser = await puppeteer.launch({ executablePath: CHROMIUM_EXEC, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page    = await browser.newPage();
    await page.setViewport({ width: 400, height: 400, deviceScaleFactor: res / 400 });

    for (const font of fonts) {
        const slug    = font.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        const svgPath = path.join(batchDir, `${slug}.svg`);
        const pngPath = path.join(batchDir, `${slug}.png`);

        const cliArgs = buildCli({ 'text-font': font.name, 'output': svgPath });
        const escaped = cliArgs.map(shellEscape);

        try {
            execSync(`node ${JSON.stringify(GENERATE_AVATAR)} ${escaped.join(' ')}`, {
                cwd:   __dirname,
                stdio: ['pipe', 'pipe', 'pipe'],
            });
        } catch (e) {
            console.error(`  [error] ${font.name}: ${e.stderr ? e.stderr.toString().trim() : e.message}`);
            process.exit(1);
        }

        const pkgSlug = font.package.replace('@fontsource/', '');
        const fontCss = buildFontFaceCSS(font.name, pkgSlug);
        if (!fontCss) {
            console.error(`  [error] ${font.name}: no WOFF2 files found in ${USER_FONTS_DIR}. Run: npm run pull-fonts`);
            process.exit(1);
        }

        const svgContent = fs.readFileSync(svgPath, 'utf8');
        await page.setContent(
            `<!DOCTYPE html><html><head><style>html,body{margin:0;padding:0;}${fontCss}</style></head>` +
            `<body>${svgContent}</body></html>`
        );
        await page.evaluate(() => document.fonts.ready);
        const png = await page.screenshot({
            omitBackground: true,
            clip: { x: 0, y: 0, width: 400, height: 400 },
        });
        fs.writeFileSync(pngPath, png);

        console.log(`  ${font.name} → ${slug}.png`);
    }

    await browser.close();
    console.log(`Done: ${batchDir}`);
})();
