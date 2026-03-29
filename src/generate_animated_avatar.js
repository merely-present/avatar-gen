#!/usr/bin/env node
'use strict';

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const puppeteer    = require('puppeteer-core');

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
        'Usage: npm run generate-animated -- [options]\n' +
        '       node src/generate_animated_avatar.js [options]\n' +
        '\n' +
        'Animation (own options):\n' +
        '  --seeds <s1,s2,...>          Comma-separated per-cycle seeds; auto-generated if omitted\n' +
        '  --fps <n>                    Frames per second  [10]\n' +
        '  --time-per-twinkle-ms <ms>   One value: total rise+fall (split evenly)\n' +
        '                               Four values: rise,hold-high,fall,hold-low  [1000]\n' +
        '  --twinkle-cycles <n>         Number of unique seed cycles  [4]\n' +
        '  --res <n>                    Output resolution, square px  [400]\n' +
        '  --name <string>              Base name for output file  [generated_animation]\n' +
        '  --output-dir <path>          Output directory  [cwd]\n' +
        '\n' +
        'All other flags are forwarded to generate_avatar.js unchanged.\n' +
        'Run `npm run generate -- --help` to see the full generate_avatar.js option list.\n' +
        '\n' +
        'Output:\n' +
        '  SVG/PNG frames → <output-dir>/<name>.<params>.<datetime>/\n' +
        '  Final GIF      → <output-dir>/<name>.<params>.<datetime>.gif\n'
    );
}

const SCRIPT_DIR      = __dirname;
const GENERATE_AVATAR = path.join(SCRIPT_DIR, 'generate_avatar.js');

// ---------------------------------------------------------------------------
// Arg parsing — separate animation args from generate_avatar.js passthrough
// ---------------------------------------------------------------------------
const MY_KEYS = new Set([
    'seeds', 'fps', 'time-per-twinkle-ms', 'twinkle-cycles', 'res', 'name', 'output-dir', 'flower-seed',
]);

if (process.argv.slice(2).some(a => a === '--help' || a === '-h')) { showHelp(); process.exit(0); }

const argv          = process.argv.slice(2);
const myOpts        = {};
const passthroughKV = {};   // key → value (strings)

for (let argIndex = 0; argIndex < argv.length; argIndex++) {
    const argToken = argv[argIndex];
    if (!argToken.startsWith('--')) continue;
    const eqSignIndex = argToken.indexOf('=');
    const argKey      = eqSignIndex >= 0 ? argToken.slice(2, eqSignIndex) : argToken.slice(2);
    const argValue    = eqSignIndex >= 0 ? argToken.slice(eqSignIndex + 1) : argv[++argIndex];
    if (MY_KEYS.has(argKey)) {
        myOpts[argKey] = argValue;
    } else {
        passthroughKV[argKey] = argValue;
    }
}

// ---------------------------------------------------------------------------
// Animation settings
// ---------------------------------------------------------------------------
const fps           = parseInt(myOpts.fps || '10', 10);
const twinkleCycles = parseInt(myOpts['twinkle-cycles'] || '4', 10);
const res           = parseInt(myOpts.res || '400', 10);
const name          = myOpts.name || 'generated_animation';

// Twinkle timing
const timeParts = (myOpts['time-per-twinkle-ms'] || '1000').split(',').map(Number);
let holdLowMs, riseMs, holdHighMs, fallMs;
if (timeParts.length === 1) {
    const halfCycleDuration = timeParts[0] / 2;
    holdLowMs   = 0;
    riseMs      = halfCycleDuration;
    holdHighMs  = 0;
    fallMs      = halfCycleDuration;
} else if (timeParts.length === 4) {
    [riseMs, holdHighMs, fallMs, holdLowMs] = timeParts;
} else {
    console.error('--time-per-twinkle-ms must be 1 or 4 comma-separated values');
    process.exit(1);
}
const cycleDurationMs = holdLowMs + riseMs + holdHighMs + fallMs;
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
        let hashState = Math.imul(seed ^ seed >>> 15, 1 | seed);
        hashState = hashState + Math.imul(hashState ^ hashState >>> 7, 61 | hashState) ^ hashState;
        return ((hashState ^ hashState >>> 14) >>> 0);
    };
}

let seeds = myOpts.seeds
    ? myOpts.seeds.split(',').map(Number)
    : [];

// Use passthrough seed as first seed if none explicitly given
if (seeds.length === 0 && passthroughKV['seed'] !== undefined) {
    seeds.push(parseInt(passthroughKV['seed'], 10));
}

// Generate additional seeds if we still don't have enough
if (seeds.length < twinkleCycles) {
    const rng = mulberry32(seeds.length > 0 ? seeds[seeds.length - 1] : Date.now());
    while (seeds.length < twinkleCycles) seeds.push(rng());
}
seeds = seeds.slice(0, twinkleCycles);

// Remove seed from passthrough — we control it per frame
delete passthroughKV['seed'];
// Remove output/output-dir — we control output paths per frame
delete passthroughKV['output'];
delete passthroughKV['output-dir'];

// flower-seed: fixed across all frames so the flower shape doesn't change between cycles.
// Defaults to the first seed; can be overridden explicitly with --flower-seed.
const flowerSeed = myOpts['flower-seed'] !== undefined
    ? parseInt(myOpts['flower-seed'], 10)
    : seeds[0];

// ---------------------------------------------------------------------------
// Interpolation targets
// ---------------------------------------------------------------------------
const nodeRadius          = parseFloat(passthroughKV['polygon-node-radius'] || '2');
const nodeGlow            = parseFloat(passthroughKV['polygon-node-glow'] || '4');
const nodeFade            = parseFloat(passthroughKV['polygon-node-fade'] || '1');
const targetTwinkleRadius = parseFloat(passthroughKV['polygon-node-twinkle-radius'] || '3');
const targetTwinkleGlow   = parseFloat(passthroughKV['polygon-node-twinkle-glow'] || '6');
const targetTwinkleFade   = parseFloat(passthroughKV['polygon-node-twinkle-fade'] || '2');
const targetTwinkleStrength = passthroughKV['twinkle-strength'] !== undefined
    ? parseFloat(passthroughKV['twinkle-strength'])
    : 1;

// ---------------------------------------------------------------------------
// Frame math
// ---------------------------------------------------------------------------
const totalDurationMs = twinkleCycles * cycleDurationMs;
const totalFrames     = Math.max(1, Math.round(totalDurationMs * fps / 1000));
const msPerFrame      = 1000 / fps;

function interpolationFactor(timeInCycleMs) {
    let timeRemaining = timeInCycleMs;
    if (timeRemaining < riseMs) return riseMs > 0 ? timeRemaining / riseMs : 1;
    timeRemaining -= riseMs;
    if (timeRemaining < holdHighMs) return 1;
    timeRemaining -= holdHighMs;
    if (timeRemaining < fallMs) return fallMs > 0 ? 1 - timeRemaining / fallMs : 0;
    timeRemaining -= fallMs;
    if (timeRemaining < holdLowMs) return 0;
    return 0;
}

function lerp(start, end, factor) { return start + (end - start) * factor; }

// ---------------------------------------------------------------------------
// Output paths  (computed here so framesDir can mirror the gif's name)
// ---------------------------------------------------------------------------
const outputDir = myOpts['output-dir']
    ? path.resolve(myOpts['output-dir'])
    : process.cwd();

const now       = new Date();
const padStart2 = n => String(n).padStart(2, '0');
const tzOffset  = -now.getTimezoneOffset();
const tzSign    = tzOffset >= 0 ? '+' : '-';
const tzHours   = padStart2(Math.floor(Math.abs(tzOffset) / 60));
const tzMinutes = padStart2(Math.abs(tzOffset) % 60);
const timestamp = [
    now.getFullYear(),
    '-', padStart2(now.getMonth() + 1),
    '-', padStart2(now.getDate()),
    '_', padStart2(now.getHours()),
    '-', padStart2(now.getMinutes()),
    '-', padStart2(now.getSeconds()),
    '_', tzSign, tzHours, tzMinutes,
].join('');

const twinkleTimesStr = `twinkle_times_${timeParts.join('_')}`;
const paramStr = [
    `res_${res}`,
    `fps_${fps}`,
    `twinkle_cycles_${twinkleCycles}`,
    twinkleTimesStr,
].join('-');
const gifName    = `${name}.${paramStr}.${timestamp}.gif`;
const gifBaseName = gifName.replace(/\.gif$/, '');
const framesDir  = path.join(outputDir, gifBaseName);
const gifPath    = path.join(outputDir, gifName);
fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(framesDir, { recursive: true });

// ---------------------------------------------------------------------------
// Build CLI args array for generate_avatar.js
// ---------------------------------------------------------------------------
function buildCli(overrides) {
    const mergedArgs = { ...passthroughKV, ...overrides };
    const argParts   = [];
    for (const [argKey, argValue] of Object.entries(mergedArgs)) {
        const val = String(argValue);
        // Use --key=value when value starts with '-' to avoid parseArgs ambiguity
        if (val.startsWith('-')) argParts.push(`--${argKey}=${val}`);
        else argParts.push(`--${argKey}`, val);
    }
    return argParts;
}

// ---------------------------------------------------------------------------
// Generate frames
// ---------------------------------------------------------------------------
console.log(`Generating ${totalFrames} frames across ${twinkleCycles} twinkle cycle(s)…`);
console.log(`  Cycle: ${cycleDurationMs}ms  (rise ${riseMs} / hold-high ${holdHighMs} / fall ${fallMs} / hold-low ${holdLowMs})`);
console.log(`  FPS: ${fps}   Resolution: ${res}×${res}`);
console.log(`  Seeds: ${seeds.join(', ')}`);

// ---------------------------------------------------------------------------
// Font embedding helper — reads WOFF2 from node_modules/@fontsource/<slug>/files/
// and returns @font-face CSS for inline embedding in the Puppeteer HTML page.
// ---------------------------------------------------------------------------
const FONTSOURCE_DIR = path.join(__dirname, '..', 'node_modules', '@fontsource');

function buildFontFaceCSS(fontFamily) {
    const slug     = fontFamily.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const filesDir = path.join(FONTSOURCE_DIR, slug, 'files');
    if (!fs.existsSync(path.join(FONTSOURCE_DIR, slug))) {
        console.error(`Error: font '${fontFamily}': package not found in node_modules. Run \`npm run pull-fonts\` to install fonts.`);
        process.exit(1);
    }
    const allFiles = fs.readdirSync(filesDir);
    let matching = allFiles.filter(fileName => fileName.startsWith(slug + '-latin') && fileName.endsWith('.woff2'));
    if (matching.length === 0)
        matching = allFiles.filter(fileName => fileName.startsWith(slug) && fileName.endsWith('.woff2'));
    if (matching.length === 0) return null;
    return matching.map(fileName => {
        const fileMatch  = fileName.match(/-(\d+)-(normal|italic)\.woff2$/);
        const weight     = fileMatch ? fileMatch[1] : '400';
        const fontStyle  = fileMatch ? fileMatch[2] : 'normal';
        const base64Data = fs.readFileSync(path.join(filesDir, fileName)).toString('base64');
        return `@font-face{font-family:'${fontFamily}';src:url('data:font/woff2;base64,${base64Data}')format('woff2');font-weight:${weight};font-style:${fontStyle};}`;
    }).join('');
}

(async () => {
    const fontName    = passthroughKV['text-font'] || 'DejaVu Sans Mono';
    const fontCss     = buildFontFaceCSS(fontName);
    if (fontCss === null) {
        const fontSlug = fontName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        console.error(`Error: font '${fontName}': no WOFF2 files found in ${path.join(FONTSOURCE_DIR, fontSlug, 'files')}.\nRun \`npm run pull-fonts\` to install fonts.`);
        process.exit(1);
    }

    const browser = await puppeteer.launch({ executablePath: CHROMIUM_EXEC, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page    = await browser.newPage();
    await page.setViewport({ width: 400, height: 400, deviceScaleFactor: res / 400 });

    // Load the page once with the font CSS so Chromium caches the font across frames.
    await page.setContent(
        `<!DOCTYPE html><html><head><style>html,body{margin:0;padding:0;}${fontCss}</style></head><body></body></html>`
    );
    await page.evaluate(() => document.fonts.ready);

    const pngPaths = [];

    const BAR_EIGHTHS = [' ', '▏', '▎', '▍', '▌', '▋', '▊', '▉', '█'];
    function makeBar(fraction, barWidth) {
        const filledCells    = Math.min(1, Math.max(0, fraction)) * barWidth;
        const fullCells      = Math.floor(filledCells);
        const partialEighths = Math.floor((filledCells - fullCells) * 8);
        return '█'.repeat(fullCells) +
               (fullCells < barWidth ? BAR_EIGHTHS[partialEighths] + ' '.repeat(barWidth - fullCells - 1) : '');
    }

    for (let frame = 0; frame < totalFrames; frame++) {
        const timeMs      = frame * msPerFrame;
        const cycleIndex  = Math.min(Math.floor(timeMs / cycleDurationMs), twinkleCycles - 1);
        const timeInCycle = timeMs - cycleIndex * cycleDurationMs;
        const factor      = interpolationFactor(timeInCycle);

        const curTwinkleRadius   = lerp(nodeRadius, targetTwinkleRadius, factor);
        const curTwinkleGlow     = lerp(nodeGlow, targetTwinkleGlow, factor);
        const curTwinkleFade     = lerp(nodeFade, targetTwinkleFade, factor);
        const curTwinkleStrength = lerp(0, targetTwinkleStrength, factor);

        const svgPath = path.join(framesDir, `frame_${String(frame).padStart(4, '0')}.svg`);

        const cliArgs = buildCli({
            'polygon-node-twinkle-radius':   curTwinkleRadius.toFixed(4),
            'polygon-node-twinkle-glow':     curTwinkleGlow.toFixed(4),
            'polygon-node-twinkle-fade':     curTwinkleFade.toFixed(4),
            'twinkle-strength':              curTwinkleStrength.toFixed(4),
            'seed':                          seeds[cycleIndex],
            'flower-seed':                   flowerSeed,
            'output':                        svgPath,
        });

        const escapedArgs = cliArgs.map(argToken => {
            if (/^[a-zA-Z0-9_.\/:=+-]+$/.test(argToken)) return argToken;
            return "'" + argToken.replace(/'/g, "'\\''" ) + "'";
        });

        execSync(`node ${JSON.stringify(GENERATE_AVATAR)} ${escapedArgs.join(' ')}`, {
            cwd:   SCRIPT_DIR,
            stdio: ['pipe', 'pipe', 'pipe'],
        });

        // SVG → PNG via Puppeteer (supports oklch and WOFF2 natively).
        // Swap body content in-place so the font remains cached across frames.
        const svgContent = fs.readFileSync(svgPath, 'utf8');
        await page.evaluate((svg) => { document.body.innerHTML = svg; }, svgContent);
        const pngPath = svgPath.replace(/\.svg$/, '.png');
        const png = await page.screenshot({
            omitBackground: true,
            clip: { x: 0, y: 0, width: 400, height: 400 },
        });
        fs.writeFileSync(pngPath, png);
        pngPaths.push(pngPath);

        const frameProgressBar = makeBar((frame + 1) / totalFrames, 20);
        const factorBar        = makeBar(factor, 20);
        process.stdout.write(
            `\r  Frame ${String(frame + 1).padStart(String(totalFrames).length)}/${totalFrames}` +
            `  |\x1b[93m${frameProgressBar}\x1b[0m|` +
            `  cycle ${cycleIndex + 1}/${twinkleCycles}` +
            `  factor ${factor.toFixed(3)}  |\x1b[94m${factorBar}\x1b[0m|`
        );
    }
    console.log('');

    await browser.close();

    // ---------------------------------------------------------------------------
    // Assemble GIF
    // ---------------------------------------------------------------------------
    const frameDelayCs = Math.round(100 / fps);   // centiseconds per frame

    console.log('Assembling GIF…');
    // Threshold alpha at 50% so anti-aliased circle edges become cleanly
    // opaque or transparent (GIF only supports binary transparency).
    execSync(
        `magick convert ` +
        `-delay ${frameDelayCs} -loop 0 -dispose Background ` +
        pngPaths.map(pngPath => `\\( ${JSON.stringify(pngPath)} -channel A -threshold 50% +channel \\)`).join(' ') +
        ' -layers Optimize ' + JSON.stringify(gifPath),
        { stdio: 'inherit', timeout: 3000000 },
    );

    // Clean up intermediate PNGs
    for (const pngPath of pngPaths) fs.unlinkSync(pngPath);

    // Write animation parameters alongside the GIF
    const _animParams = {
        'name':               name,
        'fps':                fps,
        'twinkle-cycles':     twinkleCycles,
        'res':                res,
        'time-per-twinkle-ms': myOpts['time-per-twinkle-ms'] || '1000',
        'rise-ms':            riseMs,
        'hold-high-ms':       holdHighMs,
        'fall-ms':            fallMs,
        'hold-low-ms':        holdLowMs,
        'seeds':              seeds,
        'output-dir':         outputDir,
    };
    fs.writeFileSync(gifPath + '.json', JSON.stringify(_animParams, null, 2), 'utf8');

    console.log(`Done: ${gifPath}`);
})();
