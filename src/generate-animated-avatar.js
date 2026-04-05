#!/usr/bin/env node
'use strict';

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const puppeteer    = require('puppeteer-core');

const { loadAndValidateJson }  = require('./load-json.js');
const { AnimateConfigSchema }  = require('./schemas.js');

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

function showHelp() {
    console.log(
        'Usage: npm run generate-animated -- --json <path/to/preset.animate.json>\n' +
        '       node src/generate-animated-avatar.js --json <path/to/preset.animate.json>\n' +
        '\n' +
        'All settings are provided through a JSON file validated against\n' +
        'schemas/animate.schema.json (JSON Schema 7, auto-generated).\n' +
        '\n' +
        'Animation-specific fields:\n' +
        '  seeds            Array of per-cycle RNG seeds (auto-generated if omitted)\n' +
        '  fps              Frames per second  [10]\n' +
        '  time-per-twinkle-ms  One value or [rise,hold-high,fall,hold-low]  [1000]\n' +
        '  twinkle-cycles   Number of unique seed cycles  [4]\n' +
        '  res              Output resolution, square px  [400]\n' +
        '  name             Base name for output file  [generated_animation]\n' +
        '  output-dir       Output directory  [cwd]\n' +
        '\n' +
        'All other fields are forwarded to generate-avatar on a per-frame basis.\n' +
        'Run `npm run generate-schemas` to (re-)generate schemas/animate.schema.json.\n'
    );
}

// ---------------------------------------------------------------------------
// CLI — --json <path> optional; all defaults used when omitted
// ---------------------------------------------------------------------------
const argv = process.argv.slice(2);
if (argv.some(a => a === '--help' || a === '-h')) { showHelp(); process.exit(0); }

const jsonFlagIndex = argv.indexOf('--json');
const jsonPath = jsonFlagIndex !== -1 ? argv[jsonFlagIndex + 1] : null;
if (jsonFlagIndex !== -1 && (!jsonPath || jsonPath.startsWith('--'))) {
    console.error('Error: --json requires a file path argument.');
    process.exit(1);
}

const config = jsonPath
    ? loadAndValidateJson(jsonPath, AnimateConfigSchema)
    : AnimateConfigSchema.parse({});

// ---------------------------------------------------------------------------
// Keys that belong to the animate layer (not forwarded to generate-avatar)
// ---------------------------------------------------------------------------
const ANIMATE_OWN_KEYS = new Set([
    'seeds', 'fps', 'timePerTwinkleMs', 'twinkleCycles', 'res', 'name',
]);

// ---------------------------------------------------------------------------
// Animation settings
// ---------------------------------------------------------------------------
const fps           = config['fps'];
const twinkleCycles = config.twinkleCycles;
const res           = config['res'];
const name          = config['name'];

// Twinkle timing — stored in config as number | [rise,hold-high,fall,hold-low]
const rawTime = config.timePerTwinkleMs;
let riseMs, holdHighMs, fallMs, holdLowMs;
if (Array.isArray(rawTime)) {
    [riseMs, holdHighMs, fallMs, holdLowMs] = rawTime;
} else {
    riseMs     = rawTime / 2;
    holdHighMs = 0;
    fallMs     = rawTime / 2;
    holdLowMs  = 0;
}
const cycleDurationMs = riseMs + holdHighMs + fallMs + holdLowMs;
if (cycleDurationMs <= 0) {
    console.error('Twinkle cycle duration must be > 0');
    process.exit(1);
}

// ---------------------------------------------------------------------------
// Seeds
// ---------------------------------------------------------------------------
function mulberry32(seed) {
    return function () {
        seed |= 0;
        seed = seed + 0x6D2B79F5 | 0;
        let h = Math.imul(seed ^ seed >>> 15, 1 | seed);
        h = h + Math.imul(h ^ h >>> 7, 61 | h) ^ h;
        return ((h ^ h >>> 14) >>> 0);
    };
}

let seeds = config['seeds'] ? [...config['seeds']] : [];

// Use flower-seed (or first available) to seed the RNG for generating extra seeds.
if (seeds.length < twinkleCycles) {
    const rng = mulberry32(seeds.length > 0 ? seeds[seeds.length - 1] : Date.now());
    while (seeds.length < twinkleCycles) seeds.push(rng());
}
seeds = seeds.slice(0, twinkleCycles);

// flower-seed: fixed across all frames so the flower shape stays constant between cycles.
const flowerSeed = config.flowerSeed !== undefined
    ? config.flowerSeed
    : seeds[0];

// ---------------------------------------------------------------------------
// Build per-frame generate config (all non-animate-own fields passed through)
// ---------------------------------------------------------------------------
const baseGenerateConfig = {};
for (const [key, value] of Object.entries(config)) {
    if (!ANIMATE_OWN_KEYS.has(key)) baseGenerateConfig[key] = value;
}
// Remove output-dir from generate passthrough — we control output per-frame
delete baseGenerateConfig.outputDir;
// flower-seed is set per-frame (same value, but we set it explicitly)
delete baseGenerateConfig.flowerSeed;

// ---------------------------------------------------------------------------
// Interpolation targets (all from typed config — already numbers)
// ---------------------------------------------------------------------------
const nodeRadius          = config.polygonNodeRadius;
const nodeGlow            = config.polygonNodeGlow;
const nodeFade            = config.polygonNodeFade;
const targetTwinkleRadius = config.polygonNodeTwinkleRadius;
const targetTwinkleGlow   = config.polygonNodeTwinkleGlow;
const targetTwinkleFade   = config.polygonNodeTwinkleFade;
const targetTwinkleStrength = config.twinkleStrength;

// ---------------------------------------------------------------------------
// Frame math
// ---------------------------------------------------------------------------
const totalDurationMs = twinkleCycles * cycleDurationMs;
const totalFrames     = Math.max(1, Math.round(totalDurationMs * fps / 1000));
const msPerFrame      = 1000 / fps;

function interpolationFactor(timeInCycleMs) {
    let t = timeInCycleMs;
    if (t < riseMs)      return riseMs > 0 ? t / riseMs : 1;
    t -= riseMs;
    if (t < holdHighMs)  return 1;
    t -= holdHighMs;
    if (t < fallMs)      return fallMs > 0 ? 1 - t / fallMs : 0;
    return 0;
}

function lerp(a, b, f) { return a + (b - a) * f; }

// ---------------------------------------------------------------------------
// Output paths
// ---------------------------------------------------------------------------
const outputDir = config.outputDir
    ? path.resolve(config.outputDir)
    : process.cwd();

const now       = new Date();
const pad2      = n => String(n).padStart(2, '0');
const tzOffset  = -now.getTimezoneOffset();
const tzSign    = tzOffset >= 0 ? '+' : '-';
const tzHours   = pad2(Math.floor(Math.abs(tzOffset) / 60));
const tzMins    = pad2(Math.abs(tzOffset) % 60);
const timestamp = `${now.getFullYear()}-${pad2(now.getMonth()+1)}-${pad2(now.getDate())}_${pad2(now.getHours())}-${pad2(now.getMinutes())}-${pad2(now.getSeconds())}_${tzSign}${tzHours}${tzMins}`;

const timeParts = Array.isArray(rawTime) ? rawTime : [rawTime];
const twinkleTimesStr = `twinkle_times_${timeParts.join('_')}`;
const paramStr = [
    `res_${res}`,
    `fps_${fps}`,
    `twinkle_cycles_${twinkleCycles}`,
    twinkleTimesStr,
].join('-');
const gifName      = `${name}.${paramStr}.${timestamp}.gif`;
const gifBaseName  = gifName.replace(/\.gif$/, '');
const framesDir    = path.join(outputDir, gifBaseName);
const gifPath      = path.join(outputDir, gifName);
fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(framesDir, { recursive: true });

const SCRIPT_DIR      = __dirname;
const GENERATE_AVATAR = path.join(SCRIPT_DIR, 'generate-avatar.js');

// ---------------------------------------------------------------------------
// Font embedding helper
// ---------------------------------------------------------------------------
const FONTSOURCE_DIR = path.join(__dirname, '..', 'node_modules', '@fontsource');

function buildFontFaceCSS(fontFamily) {
    const slug     = fontFamily.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const filesDir = path.join(FONTSOURCE_DIR, slug, 'files');
    if (!fs.existsSync(path.join(FONTSOURCE_DIR, slug))) {
        console.error(`Error: font '${fontFamily}': package not found in node_modules. Run \`npm run pull-fonts\`.`);
        process.exit(1);
    }
    const allFiles = fs.readdirSync(filesDir);
    let matching = allFiles.filter(f => f.startsWith(slug + '-latin') && f.endsWith('.woff2'));
    if (matching.length === 0)
        matching = allFiles.filter(f => f.startsWith(slug) && f.endsWith('.woff2'));
    if (matching.length === 0) return null;
    return matching.map(f => {
        const m       = f.match(/-(\d+)-(normal|italic)\.woff2$/);
        const weight  = m ? m[1] : '400';
        const style   = m ? m[2] : 'normal';
        const b64     = fs.readFileSync(path.join(filesDir, f)).toString('base64');
        return `@font-face{font-family:'${fontFamily}';src:url('data:font/woff2;base64,${b64}')format('woff2');font-weight:${weight};font-style:${style};}`;
    }).join('');
}

(async () => {
    const fontName = config.textFont;
    const fontCss  = buildFontFaceCSS(fontName);
    if (fontCss === null) {
        const slug = fontName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        console.error(`Error: font '${fontName}': no WOFF2 files found in ${path.join(FONTSOURCE_DIR, slug, 'files')}.\nRun \`npm run pull-fonts\`.`);
        process.exit(1);
    }

    const browser = await puppeteer.launch({ executablePath: CHROMIUM_EXEC, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page    = await browser.newPage();
    await page.setViewport({ width: 400, height: 400, deviceScaleFactor: res / 400 });

    // Load once so Chromium caches the font across frames.
    await page.setContent(
        `<!DOCTYPE html><html><head><style>html,body{margin:0;padding:0;}${fontCss}</style></head><body></body></html>`
    );
    await page.evaluate(() => document.fonts.ready);

    const pngPaths = [];

    const BAR_EIGHTHS = [' ', '▏', '▎', '▍', '▌', '▋', '▊', '▉', '█'];
    function makeBar(fraction, w) {
        const filled = Math.min(1, Math.max(0, fraction)) * w;
        const full   = Math.floor(filled);
        const eighth = Math.floor((filled - full) * 8);
        return '█'.repeat(full) + (full < w ? BAR_EIGHTHS[eighth] + ' '.repeat(w - full - 1) : '');
    }

    const tempConfigPath = path.join(framesDir, '_frame_config.json');

    console.log(`Generating ${totalFrames} frames across ${twinkleCycles} twinkle cycle(s)…`);
    console.log(`  Cycle: ${cycleDurationMs}ms  (rise ${riseMs} / hold-high ${holdHighMs} / fall ${fallMs} / hold-low ${holdLowMs})`);
    console.log(`  FPS: ${fps}   Resolution: ${res}×${res}`);
    console.log(`  Seeds: ${seeds.join(', ')}`);

    for (let frame = 0; frame < totalFrames; frame++) {
        const timeMs      = frame * msPerFrame;
        const cycleIndex  = Math.min(Math.floor(timeMs / cycleDurationMs), twinkleCycles - 1);
        const timeInCycle = timeMs - cycleIndex * cycleDurationMs;
        const factor      = interpolationFactor(timeInCycle);

        const svgPath = path.join(framesDir, `frame_${String(frame).padStart(4, '0')}.svg`);

        const frameConfig = {
            ...baseGenerateConfig,
            polygonNodeTwinkleRadius: lerp(nodeRadius, targetTwinkleRadius, factor),
            polygonNodeTwinkleGlow:   lerp(nodeGlow,   targetTwinkleGlow,   factor),
            polygonNodeTwinkleFade:   lerp(nodeFade,   targetTwinkleFade,   factor),
            twinkleStrength:            lerp(0, targetTwinkleStrength, factor),
            'seed':                        seeds[cycleIndex],
            flowerSeed:                 flowerSeed,
            'output':                      svgPath,
        };

        fs.writeFileSync(tempConfigPath, JSON.stringify(frameConfig), 'utf8');

        execSync(`node ${JSON.stringify(GENERATE_AVATAR)} --json ${JSON.stringify(tempConfigPath)}`, {
            cwd:   SCRIPT_DIR,
            stdio: ['pipe', 'pipe', 'pipe'],
        });

        // SVG → PNG via Puppeteer
        const svgContent = fs.readFileSync(svgPath, 'utf8');
        await page.evaluate((svg) => { document.body.innerHTML = svg; }, svgContent);
        const pngPath = svgPath.replace(/\.svg$/, '.png');
        const png = await page.screenshot({
            omitBackground: true,
            clip: { x: 0, y: 0, width: 400, height: 400 },
        });
        fs.writeFileSync(pngPath, png);
        pngPaths.push(pngPath);

        const frameBar  = makeBar((frame + 1) / totalFrames, 20);
        const factorBar = makeBar(factor, 20);
        process.stdout.write(
            `\r  Frame ${String(frame + 1).padStart(String(totalFrames).length)}/${totalFrames}` +
            `  |\x1b[93m${frameBar}\x1b[0m|` +
            `  cycle ${cycleIndex + 1}/${twinkleCycles}` +
            `  factor ${factor.toFixed(3)}  |\x1b[94m${factorBar}\x1b[0m|`
        );
    }
    console.log('');

    // Clean up temp config
    try { fs.unlinkSync(tempConfigPath); } catch {}

    await browser.close();

    // ---------------------------------------------------------------------------
    // Assemble GIF
    // ---------------------------------------------------------------------------
    const frameDelayCs = Math.round(100 / fps);
    console.log('Assembling GIF…');
    execSync(
        `magick convert ` +
        `-delay ${frameDelayCs} -loop 0 -dispose Background ` +
        pngPaths.map(p => `\\( ${JSON.stringify(p)} -channel A -threshold 50% +channel \\)`).join(' ') +
        ' -layers Optimize ' + JSON.stringify(gifPath),
        { stdio: 'inherit', timeout: 3000000 },
    );

    for (const p of pngPaths) fs.unlinkSync(p);

    const _animParams = {
        name, fps, twinkleCycles: twinkleCycles, res,
        timePerTwinkleMs: rawTime,
        riseMs, holdHighMs, fallMs, holdLowMs,
        seeds, outputDir,
    };
    fs.writeFileSync(gifPath + '.animate.json', JSON.stringify(_animParams, null, 2), 'utf8');

    console.log(`Done: ${gifPath}`);
})();
