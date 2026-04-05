#!/usr/bin/env node
'use strict';

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const puppeteer = require('puppeteer-core');

const { loadAndValidateJson }  = require('./load-json.js');
const { GenerateConfigSchema } = require('./schemas.js');

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
    const fontsourceDir = path.join(__dirname, '..', 'node_modules', '@fontsource');
    let fonts;
    try { fonts = JSON.parse(fs.readFileSync(fontsJsonPath, 'utf8')); }
    catch { return '  (config/fonts.json not found)'; }
    return fonts.map(f => {
        const slug  = f.package.replace('@fontsource/', '');
        const found = fs.existsSync(path.join(fontsourceDir, slug));
        return `  ${found ? '✓' : '✗'} ${f.name.padEnd(24)} ${found ? 'installed' : 'not installed'}`;
    }).join('\n');
}

function showHelp() {
    console.log(
        'Usage: npm run generate-cycle-fonts -- --json <path/to/preset.generate.json> [--res <n>] [--output-dir <path>]\n' +
        '       node src/generate-cycle-fonts.js --json <path/to/preset.generate.json>\n' +
        '\n' +
        'Renders one avatar per font in config/fonts.json.\n' +
        'The text-font field from the JSON is overridden for each font.\n' +
        '\n' +
        'Extra CLI options (override JSON values):\n' +
        '  --res <n>            PNG render resolution, square px\n' +
        '  --output-dir <path>  Batch output directory\n' +
        '\n' +
        'Output: <output-dir>/font_cycle_<datetime>/<font-slug>.{svg,png}\n' +
        '\n' +
        'Fonts (config/fonts.json):\n' +
        fontStatus() + '\n' +
        '\n' +
        '  Run `npm run pull-fonts` to install all listed fonts\n'
    );
}

const ROOT            = path.join(__dirname, '..');
const FONTS_JSON      = path.join(ROOT, 'config', 'fonts.json');
const GENERATE_AVATAR = path.join(__dirname, 'generate-avatar.js');

// ---------------------------------------------------------------------------
// CLI: --json <path> required; --res and --output-dir may override JSON values
// ---------------------------------------------------------------------------
const argv = process.argv.slice(2);
if (argv.some(a => a === '--help' || a === '-h')) { showHelp(); process.exit(0); }

let jsonPath    = null;
let resOverride = null;
let outputDirOverride = null;

for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--json')       { jsonPath           = argv[++i]; continue; }
    if (argv[i] === '--res')        { resOverride        = parseInt(argv[++i], 10); continue; }
    if (argv[i] === '--output-dir') { outputDirOverride  = argv[++i]; continue; }
}

if (!jsonPath) {
    console.error('Error: --json <path> is required.\nRun with --help for usage.');
    process.exit(1);
}

const config    = loadAndValidateJson(jsonPath, GenerateConfigSchema);
const res       = resOverride ?? 400;
const outputDir = outputDirOverride
    ? path.resolve(outputDirOverride)
    : (config.outputDir ? path.resolve(config.outputDir) : process.cwd());

// ---------------------------------------------------------------------------
// Batch output dir (timestamped)
// ---------------------------------------------------------------------------
const now   = new Date();
const pad2  = n => String(n).padStart(2, '0');
const tzOffset  = -now.getTimezoneOffset();
const tzSign    = tzOffset >= 0 ? '+' : '-';
const tzHours   = pad2(Math.floor(Math.abs(tzOffset) / 60));
const tzMins    = pad2(Math.abs(tzOffset) % 60);
const timestamp = `${now.getFullYear()}-${pad2(now.getMonth()+1)}-${pad2(now.getDate())}_${pad2(now.getHours())}-${pad2(now.getMinutes())}-${pad2(now.getSeconds())}_${tzSign}${tzHours}${tzMins}`;

const batchDir = path.join(outputDir, `font_cycle_${timestamp}`);
fs.mkdirSync(batchDir, { recursive: true });

// ---------------------------------------------------------------------------
// Font embedding helper
// ---------------------------------------------------------------------------
const FONTSOURCE_DIR = path.join(__dirname, '..', 'node_modules', '@fontsource');

function buildFontFaceCSS(fontFamily, pkgSlug) {
    const filesDir = path.join(FONTSOURCE_DIR, pkgSlug, 'files');
    if (!fs.existsSync(path.join(FONTSOURCE_DIR, pkgSlug))) {
        console.error(`  [error] ${fontFamily}: package ${pkgSlug} not found in node_modules. Run: npm run pull-fonts`);
        process.exit(1);
    }
    const allFiles = fs.readdirSync(filesDir);
    let matching = allFiles.filter(f => f.startsWith(pkgSlug + '-latin') && f.endsWith('.woff2'));
    if (matching.length === 0)
        matching = allFiles.filter(f => f.startsWith(pkgSlug) && f.endsWith('.woff2'));
    if (matching.length === 0) return null;
    return matching.map(f => {
        const m      = f.match(/-(\d+)-(normal|italic)\.woff2$/);
        const weight = m ? m[1] : '400';
        const style  = m ? m[2] : 'normal';
        const b64    = fs.readFileSync(path.join(filesDir, f)).toString('base64');
        return `@font-face{font-family:'${fontFamily}';src:url('data:font/woff2;base64,${b64}')format('woff2');font-weight:${weight};font-style:${style};}`;
    }).join('');
}

// ---------------------------------------------------------------------------
// Generate per font
// ---------------------------------------------------------------------------
const fonts = JSON.parse(fs.readFileSync(FONTS_JSON, 'utf8'));
console.log(`Generating ${fonts.length} font variants → ${batchDir}`);

const tempConfigPath = path.join(batchDir, '_font_config.json');

(async () => {
    const browser = await puppeteer.launch({ executablePath: CHROMIUM_EXEC, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page    = await browser.newPage();
    await page.setViewport({ width: 400, height: 400, deviceScaleFactor: res / 400 });

    for (const font of fonts) {
        const slug    = font.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        const svgPath = path.join(batchDir, `${slug}.svg`);
        const pngPath = path.join(batchDir, `${slug}.png`);

        const fontConfig = { ...config, textFont: font.name, 'output': svgPath };
        delete fontConfig.outputDir;
        fs.writeFileSync(tempConfigPath, JSON.stringify(fontConfig), 'utf8');

        try {
            execSync(`node ${JSON.stringify(GENERATE_AVATAR)} --json ${JSON.stringify(tempConfigPath)}`, {
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
            console.error(`  [error] ${font.name}: no WOFF2 files found in ${path.join(FONTSOURCE_DIR, pkgSlug, 'files')}. Run: npm run pull-fonts`);
            process.exit(1);
        }

        const svgContent = fs.readFileSync(svgPath, 'utf8');
        await page.setContent(
            `<!DOCTYPE html><html><head><style>html,body{margin:0;padding:0;}${fontCss}</style></head>` +
            `<body>${svgContent}</body></html>`
        );
        await page.evaluate(() => document.fonts.ready);
        const pngBuffer = await page.screenshot({
            omitBackground: true,
            clip: { x: 0, y: 0, width: 400, height: 400 },
        });
        fs.writeFileSync(pngPath, pngBuffer);

        console.log(`  ${font.name} → ${slug}.png`);
    }

    try { fs.unlinkSync(tempConfigPath); } catch {}

    await browser.close();
    console.log(`Done: ${batchDir}`);
})();
