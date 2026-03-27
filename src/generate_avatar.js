#!/usr/bin/env node
'use strict';

const fs   = require('fs');
const path = require('path');
const { parseArgs } = require('util');

const FONTSOURCE_DIR = path.join(__dirname, '..', 'node_modules', '@fontsource');

function fontStatus() {
    const fontsJsonPath = path.join(__dirname, '..', 'config', 'fonts.json');
    let fonts;
    try { fonts = JSON.parse(fs.readFileSync(fontsJsonPath, 'utf8')); }
    catch { return '  (config/fonts.json not found)'; }
    return fonts.map(f => {
        const slug  = f.package.replace('@fontsource/', '');
        const found = fs.existsSync(path.join(FONTSOURCE_DIR, slug));
        return `  ${found ? '✓' : '✗'} ${f.name.padEnd(24)} ${found ? 'installed' : 'not installed'}`;
    }).join('\n');
}

function showHelp() {
    console.log(
        'Usage: npm run generate -- [options]\n' +
        '       node src/generate_avatar.js [options]\n' +
        '\n' +
        'Output:\n' +
        '  --output <path>                    Output file path; relative to --output-dir if given\n' +
        '  --output-dir <path>                Output directory; timestamped filename if --output omitted\n' +
        '\n' +
        'Waves:\n' +
        '  --wave-freq-expr <expr>            JS expr `x` (0=top, 1=bottom) → frequency  [8 - 6*x]\n' +
        '  --wave-count <n>                   Number of primary waves  [16]\n' +
        '  --wave-start-degree <n>            Starting hue, degrees  [0]\n' +
        '  --wave-distance <n>                Total hue sweep top→bottom, degrees; use = for negatives  [360]\n' +
        '  --wave-color-loop-count <n>        Multiplies hue sweep for denser color cycling  [1]\n' +
        '  --wave-lightness <n>               oklch L  [0.7261]\n' +
        '  --wave-chroma <n>                  oklch C  [0.18]\n' +
        '  --wave-amplitude <n>               Amplitude px  [15]\n' +
        '  --shadow-darkness <n>              Shadow L multiplier, 0-1  [0.80]\n' +
        '  --wave-effect <type>               none | smear-down | motion-blur | ripple |\n' +
        '                                     posterize | erode | dilate | gaussian  [smear-down]\n' +
        '  --wave-effect-strength <n>         [4]\n' +
        '  --dimmer <n>                       Black overlay opacity above waves  [0.5]\n' +
        '  --dimmer-blur <n>                  Blur radius of wave dimmer, px  [0]\n' +
        '\n' +
        'Flower:\n' +
        '  --lobe-count <n>                   Number of lobes  [7]\n' +
        '  --lobe-bumpiness <n>               Lobe amplitude as fraction of base_r  [0.075]\n' +
        '  --lobe-gap-ratio <n>               Gap between layers as fraction of outer min_r  [0.12]\n' +
        '  --flower-size <n>                  Flower diameter as fraction of avatar diameter  [0.15]\n' +
        '  --flower-opacity <n>               Opacity 0-1  [1]\n' +
        '  --flower-dimmer <n>                Black overlay opacity over flower  [0]\n' +
        '  --flower-dimmer-blur <n>           Blur radius of flower dimmer, px  [0]\n' +
        '  --flower-lightness <n>             oklch L reference  [0.57]\n' +
        '  --flower-chroma <n>                oklch C reference  [0.10]\n' +
        '  --flower-layer-blur <n>            Gaussian sigma (px) for perimeter fade on inner layers  [1.0]\n' +
        '\n' +
        'Outer ring:\n' +
        '  --outer-polygon-edges <n>          Edges per polygon ring  [12]\n' +
        '  --outer-polygon-radius <n>         Radius of outermost ring, px  [190]\n' +
        '  --polygon-ring-step <n>            Radial step between rings, px  [22]\n' +
        '  --polygon-node-radius <n>          Vertex node circle radius, px  [1]\n' +
        '  --polygon-node-glow <n>            Node glow blur radius, px  [3]\n' +
        '  --polygon-node-twinkle <n>         % of nodes randomly lit brighter, 0-100  [0]\n' +
        '  --polygon-node-twinkle-radius <n>  Twinkle node radius, px  [polygon-node-radius]\n' +
        '  --polygon-node-glow-twinkle <n>    Twinkle glow blur radius, px  [6]\n' +
        '  --polygon-node-twinkle-strength <n>  Blend strength: 0=identical 1=full twinkle  [1]\n' +
        '  --seed <n>                         RNG seed; omit for random\n' +
        '\n' +
        'Text:\n' +
        '  --text <string>                    Text content; \\n for newlines  [merely\\npresent]\n' +
        '  --text-size <n>                    Font size px  [40]\n' +
        '  --text-line-height <n>             Line spacing multiplier (1.0 = font\'s natural line height)  [1.0]\\n' +
        '  --text-glow-distance <n>           Glow blur spread px  [4]\n' +
        '  --text-glow-strength <n>           Glow intensity 0-1+  [1.0]\n' +
        '  --text-backing-spread <n>          Black backing shadow blur, px  [5]\n' +
        '  --text-backing-dilate <n>          Expand text before blurring, px  [3]\n' +
        '  --text-backing-opacity <n>         Backing shadow opacity 0-1  [0.9]\n' +
        '  --text-font <name>                 Font family name  [DejaVu Sans Mono]\n' +
        '\n' +
        'Fonts — loaded from node_modules/@fontsource (edit config/fonts.json to manage):\n' +
        fontStatus() + '\n' +
        '\n' +
        '  Run `npm run pull-fonts` to install all fonts listed in config/fonts.json\n'
    );
}

const { values: args } = parseArgs({
    allowPositionals: false,
    options: {
        'output':               { type: 'string' },
        'output-dir':           { type: 'string' },
        'wave-freq-expr':       { type: 'string', default: '8 - 6*x' },
        'wave-count':           { type: 'string', default: '16' },
        'wave-start-degree':    { type: 'string', default: '0' },
        'wave-distance':        { type: 'string', default: '360' },
        'wave-color-loop-count':{ type: 'string', default: '1' },
        'wave-lightness':       { type: 'string', default: '0.7261' },
        'wave-chroma':          { type: 'string', default: '0.18' },
        'wave-amplitude':       { type: 'string', default: '15' },
        'shadow-darkness':      { type: 'string', default: '0.80' },
        'wave-effect':          { type: 'string', default: 'smear-down' },
        'wave-effect-strength': { type: 'string', default: '4' },
        'dimmer':               { type: 'string', default: '0.5' },
        'dimmer-blur':          { type: 'string', default: '0' },
        'lobe-count':           { type: 'string', default: '7' },
        'lobe-bumpiness':       { type: 'string', default: '0.075' },
        'lobe-gap-ratio':       { type: 'string', default: '0.12' },
        'flower-size':          { type: 'string', default: '0.15' },
        'flower-opacity':       { type: 'string', default: '1' },
        'flower-dimmer':        { type: 'string', default: '0' },
        'flower-dimmer-blur':   { type: 'string', default: '0' },
        'flower-lightness':     { type: 'string', default: '0.57' },
        'flower-chroma':        { type: 'string', default: '0.10' },
        'flower-layer-blur':    { type: 'string', default: '1.0' },
        'outer-polygon-edges':  { type: 'string', default: '12' },
        'outer-polygon-radius': { type: 'string', default: '190' },
        'polygon-ring-step':    { type: 'string', default: '22' },
        'polygon-node-radius':       { type: 'string', default: '1' },
        'polygon-node-glow':         { type: 'string', default: '3' },
        'polygon-node-twinkle':        { type: 'string', default: '0' },
        'polygon-node-twinkle-radius': { type: 'string' },
        'polygon-node-glow-twinkle':   { type: 'string', default: '6' },
        'seed':                        { type: 'string' },
        'polygon-node-twinkle-strength': { type: 'string', default: '1' },
        'text':                      { type: 'string', default: '/^merely\npresent/' },
        'text-size':            { type: 'string', default: '40' },
        'text-line-height':     { type: 'string', default: '1.0' },
        'text-glow-distance':   { type: 'string', default: '4' },
        'text-glow-strength':   { type: 'string', default: '1.0' },
        'text-backing-spread':  { type: 'string', default: '5' },
        'text-backing-dilate':  { type: 'string', default: '3' },
        'text-backing-opacity': { type: 'string', default: '0.9' },
        'text-font':            { type: 'string', default: 'DejaVu Sans Mono' },
        'help':                 { type: 'boolean', short: 'h' },
    },
});

if (args.help) { showHelp(); process.exit(0); }

const SVG_SIZE            = 400;

function resolve_output_path(explicit, outputDir) {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const dt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    const filename = explicit || `merely-present-avatar-${dt}.svg`;
    if (outputDir) {
        if (path.isAbsolute(filename)) return filename;
        return path.join(outputDir, filename);
    }
    return filename;
}
const OUTPUT_PATH         = resolve_output_path(args['output'], args['output-dir']);
const WAVE_FREQ_EXPR      = args['wave-freq-expr'];
const NUM_WAVES           = parseInt(args['wave-count'], 10);
const WAVE_START_DEG      = parseFloat(args['wave-start-degree']);
const WAVE_DISTANCE       = parseFloat(args['wave-distance']);
const WAVE_COLOR_LOOPS    = parseFloat(args['wave-color-loop-count']);
const WAVE_L              = parseFloat(args['wave-lightness']);
const WAVE_C              = parseFloat(args['wave-chroma']);
const WAVE_AMPLITUDE      = parseFloat(args['wave-amplitude']);
const SHADOW_DARKNESS     = parseFloat(args['shadow-darkness']);
const WAVE_EFFECT         = args['wave-effect'];
const WAVE_EFFECT_STRENGTH = parseFloat(args['wave-effect-strength']);
const DIMMER_OPACITY      = parseFloat(args['dimmer']);
const DIMMER_BLUR         = parseFloat(args['dimmer-blur']);
const LOBE_COUNT          = parseInt(args['lobe-count'], 10);
const LOBE_BUMPINESS      = parseFloat(args['lobe-bumpiness']);
const LOBE_GAP_RATIO      = parseFloat(args['lobe-gap-ratio']);
const FLOWER_SIZE         = parseFloat(args['flower-size']);
const FLOWER_OPACITY      = parseFloat(args['flower-opacity']);
const FLOWER_DIMMER       = parseFloat(args['flower-dimmer']);
const FLOWER_DIMMER_BLUR  = parseFloat(args['flower-dimmer-blur']);
const FLOWER_LIGHTNESS    = parseFloat(args['flower-lightness']);
const FLOWER_CHROMA       = parseFloat(args['flower-chroma']);
const FLOWER_LAYER_BLUR   = parseFloat(args['flower-layer-blur']);
const OUTER_POLYGON_EDGES  = parseInt(args['outer-polygon-edges'], 10);
const OUTER_POLYGON_RADIUS = parseFloat(args['outer-polygon-radius']);
const POLYGON_RING_STEP    = parseFloat(args['polygon-ring-step']);
const POLYGON_NODE_RADIUS       = parseFloat(args['polygon-node-radius']);
const POLYGON_NODE_GLOW         = parseFloat(args['polygon-node-glow']);
const POLYGON_NODE_TWINKLE        = parseFloat(args['polygon-node-twinkle']);
const POLYGON_NODE_TWINKLE_RADIUS = args['polygon-node-twinkle-radius'] !== undefined
    ? parseFloat(args['polygon-node-twinkle-radius'])
    : null; // null = inherit POLYGON_NODE_RADIUS at render time
const POLYGON_NODE_GLOW_TWINKLE   = parseFloat(args['polygon-node-glow-twinkle']);
const POLYGON_NODE_TWINKLE_STRENGTH = Math.max(0, Math.min(1, parseFloat(args['polygon-node-twinkle-strength'])));
const SEED_PROVIDED             = args['seed'] !== undefined;
const INPUT_SEED                = SEED_PROVIDED
    ? parseInt(args['seed'], 10)
    : Math.floor(Math.random() * 0x100000000);
const TWINKLE_SEED              = POLYGON_NODE_TWINKLE > 0 ? INPUT_SEED : 0;
const TEXT_STRING         = args['text'];
const FONT_SIZE           = parseFloat(args['text-size']);
const TEXT_LINE_HEIGHT    = parseFloat(args['text-line-height']);
const TEXT_GLOW_DISTANCE  = parseFloat(args['text-glow-distance']);
const TEXT_GLOW_STRENGTH  = parseFloat(args['text-glow-strength']);
const TEXT_BACKING_SPREAD  = parseFloat(args['text-backing-spread']);
const TEXT_BACKING_DILATE  = parseFloat(args['text-backing-dilate']);
const TEXT_BACKING_OPACITY = parseFloat(args['text-backing-opacity']);
const TEXT_FONT            = args['text-font'];

const WAVE_STROKE_WIDTH   = 18;
const WAVE_POINTS         = 1200;

const TEXT_COLOR = 'oklch(0.7319 0.125 176.08)';
const MEDIUM_GREY    = 'oklch(0.50 0 0)';

// Compile frequency expression once
const freq_fn = new Function('x', `return (${WAVE_FREQ_EXPR});`);

// --- Flower layer geometry ---
// 5 concentric rings, each with same lobe count, staggered rotation
// Radii evenly spaced: fixed lobe_amp for all layers, equal gap between every adjacent pair
// and between innermost layer and center circle.
const FLOWER_NUM_LAYERS   = 5;
const FLOWER_OUTER_BASE_R = (FLOWER_SIZE * SVG_SIZE) / 2;
const FLOWER_CENTER_R     = FLOWER_OUTER_BASE_R / 5;
const FLOWER_CENTER_COLOR = 'oklch(0.28 0.09 12)';
const FLOWER_COLORS       = [
    'oklch(0.7082 0.0889 50.96)',  // outermost (new)
    'oklch(0.7636 0.0962 32.52)',
    'oklch(0.724 0.1094 12.58)',
    'oklch(0.57 0.135  8)',
    'oklch(0.40 0.11  15)',
];
// Outer polygon ring colors: [outline, triangles, outline, triangles, ..., outline]
// Even indices = polygon outline strokes; odd indices = triangle connector strokes.
// Length must be odd. Number of polygon rings = (length + 1) / 2.
const POLYGON_RING_COLORS = [
    'oklch(0.7319 0.10 176.08 / 0.15)', // outline 0 — outermost, terminal green
    'oklch(0.84 0.19 171    / 0.80)',    // triangles 0→1
    'oklch(0.7319 0.10 163  / 0.15)',    // outline 1
    'oklch(0.84 0.19 157    / 0.80)',    // triangles 1→2
    'oklch(0.7319 0.10 150  / 0.15)',    // outline 2
    'oklch(0.84 0.19 143    / 0.80)',    // triangles 2→3
    'oklch(0.7319 0.10 136  / 0.15)',    // outline 3
    'oklch(0.84 0.19 129    / 0.80)',    // triangles 3→4
    'oklch(0.7319 0.10 122  / 0.15)',    // outline 4
    'oklch(0.84 0.19 115.19 / 0.80)' ,    // triangles 4→5
    'oklch(0.7319 0.10 110  / 0.2)',    // outline 5
];

const BASE_ROTATION_OFFSET = Math.PI / 2;
const ROTATION_STEP        = Math.PI / LOBE_COUNT;

function compute_flower_layers() {
    const layers      = [];
    const lobe_amp    = FLOWER_OUTER_BASE_R * LOBE_BUMPINESS;
    const outer_min_r = FLOWER_OUTER_BASE_R - 2 * lobe_amp;
    // gap between rings (and between innermost ring and center) as a fraction of outer_min_r
    const gap  = LOBE_GAP_RATIO * outer_min_r;
    const slot = 2 * lobe_amp + gap;
    for (let i = 0; i < FLOWER_NUM_LAYERS; i++) {
        const r_max  = FLOWER_OUTER_BASE_R - i * slot;
        const base_r = r_max - lobe_amp;
        const r_min  = r_max - 2 * lobe_amp;
        layers.push({ base_r, lobe_amp, r_min, r_max, color: FLOWER_COLORS[i], rot_steps: i });
    }
    return layers;
}

const ELEM_LAYERS = compute_flower_layers();

// --- Path generators ---

function wave_pts(y_center, frequency, num_points, y_offset) {
    const x_start = -10;
    const x_end   = SVG_SIZE + 10;
    const pts = [];
    for (let i = 0; i <= num_points; i++) {
        const progress = i / num_points;
        const x = x_start + progress * (x_end - x_start);
        const t = (progress - 0.5) * frequency * 2 * Math.PI;
        const y = (y_center + (y_offset || 0)) + WAVE_AMPLITUDE * Math.cos(t);
        pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
    }
    return pts;
}

// Shadow is a filled polygon: top edge follows the wave curve, bottom is image bottom + margin.
// No stroke-based shadow, so no visible parallel duplicate and no gaps below.
function shadow_fill_path(y_center, frequency, num_points) {
    const pts = wave_pts(y_center, frequency, num_points, 0);
    const y_bottom = SVG_SIZE + 20;
    const x_start  = -10;
    const x_end    = SVG_SIZE + 10;
    const d = [
        `M${x_start},${y_bottom}`,   // bottom-left
        ...pts.map((p, i) => (i === 0 ? `L${p}` : `L${p}`)),
        `L${x_end},${y_bottom}`,     // bottom-right
        'Z',
    ];
    return d.join(' ');
}

function polyline(pts_arr, stroke, width) {
    return `    <polyline points="${pts_arr.join(' ')}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

const FLOWER_LIGHTNESS_REF = 0.57;
const FLOWER_CHROMA_REF    = 0.10;

function apply_flower_color(oklch_str) {
    const m = oklch_str.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
    if (!m) return oklch_str;
    const L = parseFloat(m[1]) * (FLOWER_LIGHTNESS / FLOWER_LIGHTNESS_REF);
    const C = parseFloat(m[2]) * (FLOWER_CHROMA    / FLOWER_CHROMA_REF);
    return `oklch(${L.toFixed(4)} ${C.toFixed(4)} ${m[3]})`;
}

function flower_path(cx, cy, base_r, lobe_amp, n_lobes, rotation_rad, num_points) {
    const cmds = [];
    for (let i = 0; i <= num_points; i++) {
        const theta = (i / num_points) * 2 * Math.PI;
        const r = base_r + lobe_amp * Math.cos(n_lobes * (theta + rotation_rad));
        const x = cx + r * Math.cos(theta);
        const y = cy + r * Math.sin(theta);
        cmds.push(i === 0 ? `M${x.toFixed(3)},${y.toFixed(3)}` : `L${x.toFixed(3)},${y.toFixed(3)}`);
    }
    return cmds.join(' ') + ' Z';
}

// --- Wave filter definition ---
function wave_filter_def(effect, strength) {
    switch (effect) {
        case 'none': return null;
        case 'gaussian':
            return `    <filter id="wave_fx" x="-2%" y="-2%" width="104%" height="104%"><feGaussianBlur stdDeviation="${strength}"/></filter>`;
        case 'smear-down':
            return `
    <filter id="wave_fx" x="-2%" y="-5%" width="104%" height="115%">
      <feOffset in="SourceGraphic" dx="0" dy="${(strength * 3).toFixed(1)}" result="s1"/>
      <feComponentTransfer in="s1" result="d1"><feFuncA type="linear" slope="0.3"/></feComponentTransfer>
      <feOffset in="SourceGraphic" dx="0" dy="${(strength * 1.5).toFixed(1)}" result="s2"/>
      <feComponentTransfer in="s2" result="d2"><feFuncA type="linear" slope="0.5"/></feComponentTransfer>
      <feMerge><feMergeNode in="d1"/><feMergeNode in="d2"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>`;
        case 'motion-blur': {
            const n = Math.max(4, Math.round(strength * 3));
            const layers = Array.from({length: n}, (_, i) => {
                const dy    = ((i + 1) / n * strength * 6).toFixed(2);
                const alpha = (0.3 * (1 - (i + 1) / n)).toFixed(3);
                return `      <feOffset in="SourceGraphic" dx="0" dy="${dy}" result="l${i}"/>
      <feComponentTransfer in="l${i}" result="d${i}"><feFuncA type="linear" slope="${alpha}"/></feComponentTransfer>`;
            }).join('\n');
            const nodes = Array.from({length: n}, (_, i) => `        <feMergeNode in="d${i}"/>`).join('\n');
            return `    <filter id="wave_fx" x="-2%" y="-5%" width="104%" height="120%">
${layers}
      <feMerge>\n${nodes}\n        <feMergeNode in="SourceGraphic"/>\n      </feMerge>
    </filter>`;
        }
        case 'ripple':
            return `    <filter id="wave_fx" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="${(0.02 * strength).toFixed(4)}" numOctaves="2" seed="7" result="noise"/>
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="${strength * 8}" xChannelSelector="R" yChannelSelector="G"/>
    </filter>`;
        case 'posterize': {
            const bands = Math.max(2, Math.round(8 / strength));
            const tv    = Array.from({length: bands + 1}, (_, i) => (i / bands).toFixed(3)).join(' ');
            return `    <filter id="wave_fx" color-interpolation-filters="sRGB">
      <feComponentTransfer><feFuncR type="discrete" tableValues="${tv}"/><feFuncG type="discrete" tableValues="${tv}"/><feFuncB type="discrete" tableValues="${tv}"/></feComponentTransfer>
    </filter>`;
        }
        case 'erode':
            return `    <filter id="wave_fx"><feMorphology operator="erode" radius="${strength}"/></filter>`;
        case 'dilate':
            return `    <filter id="wave_fx"><feMorphology operator="dilate" radius="${strength}"/></filter>`;
        default:
            console.warn(`Unknown wave-effect "${effect}", using none`);
            return null;
    }
}

function lerp(a, b, t) { return a + (b - a) * t; }
function lerp_oklch(c1, c2, t) {
    const m1 = c1.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
    const m2 = c2.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
    const L = lerp(parseFloat(m1[1]), parseFloat(m2[1]), t);
    const C = lerp(parseFloat(m1[2]), parseFloat(m2[2]), t);
    const H = lerp(parseFloat(m1[3]), parseFloat(m2[3]), t);
    return `oklch(${L.toFixed(4)} ${C.toFixed(4)} ${H.toFixed(2)})`;
}

// Font metrics — resolve a WOFF2 file for a given font family from node_modules/@fontsource,
// then use fontkit to measure the actual advance width of a string at a given font-size.
// Returns null if the font file is not found or measurement fails, so callers can fall back.
function findFontFile(family) {
    const slug     = family.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const filesDir = path.join(FONTSOURCE_DIR, slug, 'files');
    if (!fs.existsSync(path.join(FONTSOURCE_DIR, slug))) return null;
    let allFiles;
    try { allFiles = fs.readdirSync(filesDir); } catch { return null; }
    let matching = allFiles.filter(f => f.startsWith(slug + '-latin') && f.endsWith('.woff2'));
    if (matching.length === 0)
        matching = allFiles.filter(f => f.startsWith(slug) && f.endsWith('.woff2'));
    if (matching.length === 0) return null;
    // Prefer weight-500 (used in SVG), then 400, then any
    return path.join(filesDir,
        matching.find(f => f.includes('-500-normal'))
        ?? matching.find(f => f.includes('-400-normal'))
        ?? matching[0]);
}

function measureTextWidth(text, fontFamily, fontSize) {
    const fontPath = findFontFile(fontFamily);
    if (!fontPath) throw new Error(`Font '${fontFamily}' not found in node_modules/@fontsource. Run \`npm run pull-fonts\` to install fonts.`);
    const fontkit = require('fontkit');
    const font = fontkit.openSync(fontPath);
    const run = font.layout(text);
    return run.advanceWidth / font.unitsPerEm * fontSize;
}

function measureLineHeight(fontFamily, fontSize) {
    const fontPath = findFontFile(fontFamily);
    if (!fontPath) throw new Error(`Font '${fontFamily}' not found in node_modules/@fontsource. Run \`npm run pull-fonts\` to install fonts.`);
    const fontkit = require('fontkit');
    const font = fontkit.openSync(fontPath);
    return (font.ascent - font.descent + font.lineGap) / font.unitsPerEm * fontSize;
}

// Seeded PRNG (mulberry32) for deterministic twinkle node selection.
function mulberry32(seed) {
    return function() {
        seed |= 0; seed = seed + 0x6D2B79F5 | 0;
        let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

// --- Build SVG ---
const out = [];

out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_SIZE} ${SVG_SIZE}" width="${SVG_SIZE}" height="${SVG_SIZE}">`);
if (!SEED_PROVIDED) out.push(`  <!-- seed: ${INPUT_SEED} -->`);
out.push(`  <defs>`);
out.push(`    <clipPath id="circle_clip"><circle cx="${SVG_SIZE/2}" cy="${SVG_SIZE/2}" r="${SVG_SIZE/2}"/></clipPath>`);
out.push(`    <linearGradient id="bg_gradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="${MEDIUM_GREY}" stop-opacity="1.0"/>
      <stop offset="100%" stop-color="${MEDIUM_GREY}" stop-opacity="0.6"/>
    </linearGradient>`);

const wave_filter = wave_filter_def(WAVE_EFFECT, WAVE_EFFECT_STRENGTH);
if (wave_filter) out.push(wave_filter);

// Text glow: tight + wide white passes, then a tight black shadow, all merged under source.
// White passes are tightened (smaller stdDev) with slope boosted to compensate intensity.
// Black shadow sits above both white passes but below source text for a crisp dark halo.
out.push(`    <filter id="terminal_glow" x="-40%" y="-120%" width="180%" height="340%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="${(TEXT_GLOW_DISTANCE * 0.65).toFixed(2)}" result="blur_close"/>
      <feColorMatrix in="blur_close" type="saturate" values="0" result="white_close"/>
      <feComponentTransfer in="white_close" result="glow_close">
        <feFuncA type="linear" slope="${(TEXT_GLOW_STRENGTH * 1.5).toFixed(3)}"/>
      </feComponentTransfer>
      <feGaussianBlur in="SourceGraphic" stdDeviation="${(TEXT_GLOW_DISTANCE * 1.6).toFixed(2)}" result="blur_far"/>
      <feColorMatrix in="blur_far" type="saturate" values="0" result="white_far"/>
      <feComponentTransfer in="white_far" result="glow_far">
        <feFuncA type="linear" slope="${(TEXT_GLOW_STRENGTH * 0.65).toFixed(3)}"/>
      </feComponentTransfer>
      <feGaussianBlur in="SourceGraphic" stdDeviation="${(TEXT_GLOW_DISTANCE * 0.4).toFixed(2)}" result="blur_black"/>
      <feColorMatrix in="blur_black" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.65 0" result="black_shadow"/>
      <feMerge>
        <feMergeNode in="glow_far"/>
        <feMergeNode in="glow_close"/>
        <feMergeNode in="black_shadow"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>`);

// Black backing shadow: wide soft blur behind text, rendered as a separate pass so it
// sits completely beneath the white glow and makes text legible over bright polygon nodes.
if (TEXT_BACKING_SPREAD > 0) out.push(`    <filter id="text_backing" x="-40%" y="-120%" width="180%" height="340%">
      <feMorphology operator="dilate" radius="${TEXT_BACKING_DILATE}" result="fat"/>
      <feFlood flood-color="black" flood-opacity="1" result="black"/>
      <feComposite in="black" in2="fat" operator="in" result="solid"/>
      <feGaussianBlur in="solid" stdDeviation="${TEXT_BACKING_SPREAD}"/>
    </filter>`);

// Per-layer flower fade: spreads the layer colour outward so each layer fades to
// transparent beyond its own edge. Strategy:
//   1. Blur SourceGraphic — this extends the colour+alpha outward over FLOWER_LAYER_BLUR px.
//   2. Composite the original SourceGraphic OVER the blurred spread — this restores full
//      opacity in the interior while letting the blurred spread show wherever the original
//      is transparent (i.e. outside the petal edge), giving a clean outward-only gradient.
// This avoids the banding that occurred when blurring only SourceAlpha (which reduced
// interior alpha near edges) and the missing outward effect (SourceGraphic had no pixels
// outside the path boundary so the blurred alpha mask there was wasted).
if (FLOWER_LAYER_BLUR > 0) {
    const blur_margin = Math.ceil(FLOWER_LAYER_BLUR * 4);
    const blur_half   = FLOWER_OUTER_BASE_R + blur_margin;
    out.push(`    <filter id="flower_fade" filterUnits="userSpaceOnUse" x="${(200 - blur_half).toFixed(0)}" y="${(200 - blur_half).toFixed(0)}" width="${(blur_half * 2).toFixed(0)}" height="${(blur_half * 2).toFixed(0)}">
      <feGaussianBlur in="SourceGraphic" stdDeviation="${FLOWER_LAYER_BLUR}" result="spread"/>
      <feComposite in="SourceGraphic" in2="spread" operator="over"/>
    </filter>`);
}

if (DIMMER_BLUR > 0) out.push(`    <filter id="dimmer_blur_fx"><feGaussianBlur stdDeviation="${DIMMER_BLUR}"/></filter>`);
if (FLOWER_DIMMER_BLUR > 0) {
    // Use userSpaceOnUse so the region is in absolute pixels — a %-based region would be
    // relative to the (small) path bounding box and clip the blur at any significant radius.
    const fd_margin = Math.ceil(FLOWER_DIMMER_BLUR * 4);
    const fd_half   = FLOWER_OUTER_BASE_R + FLOWER_DIMMER_BLUR + fd_margin;
    out.push(`    <filter id="flower_dimmer_blur_fx" filterUnits="userSpaceOnUse" x="${(200 - fd_half).toFixed(0)}" y="${(200 - fd_half).toFixed(0)}" width="${(fd_half * 2).toFixed(0)}" height="${(fd_half * 2).toFixed(0)}"><feGaussianBlur stdDeviation="${FLOWER_DIMMER_BLUR}"/></filter>`);
}
if (POLYGON_NODE_GLOW > 0) {
    const ng_pad  = POLYGON_NODE_GLOW * 5;
    const ng_half = OUTER_POLYGON_RADIUS + ng_pad;
    out.push(`    <filter id="node_glow" filterUnits="userSpaceOnUse" x="${(200 - ng_half).toFixed(1)}" y="${(200 - ng_half).toFixed(1)}" width="${(ng_half * 2).toFixed(1)}" height="${(ng_half * 2).toFixed(1)}">
      <feMorphology operator="dilate" radius="${(POLYGON_NODE_RADIUS * 0.5).toFixed(2)}" result="fat"/>
      <feFlood flood-color="white" flood-opacity="1" result="white"/>
      <feComposite in="white" in2="fat" operator="in" result="solid"/>
      <feGaussianBlur in="solid" stdDeviation="${POLYGON_NODE_GLOW}" result="glow"/>
      <feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>`);
}
if (POLYGON_NODE_TWINKLE > 0) {
    const tw_glow   = lerp(POLYGON_NODE_GLOW, POLYGON_NODE_GLOW_TWINKLE, POLYGON_NODE_TWINKLE_STRENGTH);
    const tw_dilate = lerp(POLYGON_NODE_RADIUS * 0.5, POLYGON_NODE_RADIUS * 1.5, POLYGON_NODE_TWINKLE_STRENGTH);
    if (tw_glow > 0) {
        const ntw_pad  = tw_glow * 5;
        const ntw_half = OUTER_POLYGON_RADIUS + ntw_pad;
        out.push(`    <filter id="node_glow_twinkle" filterUnits="userSpaceOnUse" x="${(200 - ntw_half).toFixed(1)}" y="${(200 - ntw_half).toFixed(1)}" width="${(ntw_half * 2).toFixed(1)}" height="${(ntw_half * 2).toFixed(1)}">
      <feMorphology operator="dilate" radius="${tw_dilate.toFixed(2)}" result="fat"/>
      <feFlood flood-color="white" flood-opacity="1" result="white"/>
      <feComposite in="white" in2="fat" operator="in" result="solid"/>
      <feGaussianBlur in="solid" stdDeviation="${tw_glow.toFixed(3)}" result="glow"/>
      <feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>`);
    }
}

out.push(`  </defs>`);

out.push(`  <circle cx="${SVG_SIZE/2}" cy="${SVG_SIZE/2}" r="${SVG_SIZE/2}" fill="url(#bg_gradient)"/>`);

// Waves — one extra wave above to plug the top gap
// clip-path is on the outer <g>; filter on an inner <g> so the circle mask is applied
// after the filter, preventing bright smear/blur fringes from leaking out at the edges.
out.push(`  <g clip-path="url(#circle_clip)">`);
out.push(wave_filter ? `  <g filter="url(#wave_fx)">` : `  <g>`);

// Build wave params for waves -1 through NUM_WAVES-1
// Wave index -1 is the pre-wave above the frame
const all_waves = [];
{
    const t_pre = -1 / (NUM_WAVES - 1);
    all_waves.push({
        y_center: -0.5 * (SVG_SIZE / NUM_WAVES),
        frequency: freq_fn(Math.max(0, t_pre)),
        hue_deg: WAVE_START_DEG + t_pre * WAVE_DISTANCE * WAVE_COLOR_LOOPS,
    });
}
for (let i = 0; i < NUM_WAVES; i++) {
    const t = i / (NUM_WAVES - 1);
    all_waves.push({
        y_center: (i + 0.5) * (SVG_SIZE / NUM_WAVES),
        frequency: freq_fn(t),
        hue_deg: WAVE_START_DEG + t * WAVE_DISTANCE * WAVE_COLOR_LOOPS,
    });
}

// Filled wave bands: each wave fills from its sine curve top edge down to the image bottom.
// Rendered top-to-bottom; each subsequent wave covers the lower portion of the previous,
// so the visible region for each wave is bounded by its own curve above and the next wave's curve below.
for (const { y_center, frequency, hue_deg } of all_waves) {
    const main_color = `oklch(${WAVE_L} ${WAVE_C} ${hue_deg.toFixed(2)})`;
    out.push(`    <path d="${shadow_fill_path(y_center, frequency, WAVE_POINTS)}" fill="${main_color}"/>`);
}

out.push(`  </g>`);  // close inner filter <g>
out.push(`  </g>`);  // close outer clip-path <g>

out.push(`  <circle cx="${SVG_SIZE/2}" cy="${SVG_SIZE/2}" r="${SVG_SIZE/2}" fill="black" opacity="${DIMMER_OPACITY}"${DIMMER_BLUR > 0 ? ' filter="url(#dimmer_blur_fx)"' : ''} clip-path="url(#circle_clip)"/>`);

// Outer polygon ring system — N-sided polygons with alternating half-step twist and triangle connectors
out.push(`  <g clip-path="url(#circle_clip)">`);
{
    const N         = OUTER_POLYGON_EDGES;
    const step      = (2 * Math.PI) / N;
    const half_step = step / 2;
    const LC        = 'stroke-linecap="round"';
    const num_rings = (POLYGON_RING_COLORS.length + 1) / 2;

    // Pre-compute all polygon ring vertices.
    // Even rings have phase 0; odd rings are twisted by half a step.
    const rings = Array.from({ length: num_rings }, (_, k) => {
        const radius = OUTER_POLYGON_RADIUS - k * POLYGON_RING_STEP;
        const phase  = (k % 2 === 0) ? 0 : half_step;
        return Array.from({ length: N }, (_, i) => {
            const a = i * step + phase;
            return [200 + radius * Math.sin(a), 200 - radius * Math.cos(a)];
        });
    });

    // Draw rings from outermost inward: outline, then triangle connectors to next ring
    for (let k = 0; k < num_rings; k++) {
        const outline_color = POLYGON_RING_COLORS[k * 2];
        const pts_str = rings[k].map(([x, y]) => `${x.toFixed(3)},${y.toFixed(3)}`).join(' ');
        out.push(`    <polygon points="${pts_str}" fill="none" stroke="${outline_color}" stroke-width="1" ${LC}/>`);

        if (k < num_rings - 1) {
            // Triangle connectors: each inner vertex fans out to its 2 nearest outer vertices.
            // Phase-0 → half-step: inner[j] → outer[j], outer[(j+1)%N]
            // Half-step → phase-0: inner[j] → outer[(j-1+N)%N], outer[j]
            const tri_color  = POLYGON_RING_COLORS[k * 2 + 1];
            const outer_ring = rings[k];
            const inner_ring = rings[k + 1];
            let d = '';
            for (let j = 0; j < N; j++) {
                const [ix, iy] = inner_ring[j];
                let ax, ay, bx, by;
                if (k % 2 === 0) {
                    [ax, ay] = outer_ring[j];
                    [bx, by] = outer_ring[(j + 1) % N];
                } else {
                    [ax, ay] = outer_ring[(j - 1 + N) % N];
                    [bx, by] = outer_ring[j];
                }
                d += `M${ix.toFixed(3)},${iy.toFixed(3)} L${ax.toFixed(3)},${ay.toFixed(3)} `;
                d += `M${ix.toFixed(3)},${iy.toFixed(3)} L${bx.toFixed(3)},${by.toFixed(3)} `;
            }
            out.push(`    <path d="${d.trim()}" fill="none" stroke="${tri_color}" stroke-width="1" ${LC}/>`);
        }
    }

    // Node circles at every polygon vertex
    const NODE_COLOR         = 'oklch(0.80 0.08 176)';
    const NODE_COLOR_TWINKLE = 'oklch(0.9466 0.0771 176)';
    const node_filter_attr = POLYGON_NODE_GLOW > 0 ? ' filter="url(#node_glow)"' : '';
    if (POLYGON_NODE_TWINKLE > 0) {
        const rng       = mulberry32(TWINKLE_SEED);
        const threshold = POLYGON_NODE_TWINKLE / 100;
        const regular_nodes = [];
        const twinkle_nodes = [];
        for (const ring of rings) {
            for (const pt of ring) {
                (rng() < threshold ? twinkle_nodes : regular_nodes).push(pt);
            }
        }
        const tw_color  = lerp_oklch(NODE_COLOR, NODE_COLOR_TWINKLE, POLYGON_NODE_TWINKLE_STRENGTH);
        const tw_r_full = POLYGON_NODE_TWINKLE_RADIUS ?? POLYGON_NODE_RADIUS;
        const tw_r      = lerp(POLYGON_NODE_RADIUS, tw_r_full, POLYGON_NODE_TWINKLE_STRENGTH);
        const tw_glow   = lerp(POLYGON_NODE_GLOW, POLYGON_NODE_GLOW_TWINKLE, POLYGON_NODE_TWINKLE_STRENGTH);
        out.push(`    <g${node_filter_attr}>`);
        for (const [x, y] of regular_nodes) {
            out.push(`      <circle cx="${x.toFixed(3)}" cy="${y.toFixed(3)}" r="${POLYGON_NODE_RADIUS}" fill="${NODE_COLOR}"/>`);
        }
        out.push(`    </g>`);
        const twinkle_filter_attr = tw_glow > 0 ? ' filter="url(#node_glow_twinkle)"' : '';
        out.push(`    <g${twinkle_filter_attr}>`);
        for (const [x, y] of twinkle_nodes) {
            out.push(`      <circle cx="${x.toFixed(3)}" cy="${y.toFixed(3)}" r="${tw_r.toFixed(3)}" fill="${tw_color}"/>`);
        }
        out.push(`    </g>`);
    } else {
        out.push(`    <g${node_filter_attr}>`);
        for (const ring of rings) {
            for (const [x, y] of ring) {
                out.push(`      <circle cx="${x.toFixed(3)}" cy="${y.toFixed(3)}" r="${POLYGON_NODE_RADIUS}" fill="${NODE_COLOR}"/>`);
            }
        }
        out.push(`    </g>`);
    }
}
out.push(`  </g>`);

// Flower
// Inner layers (i > 0) use radial gradient fill — each layer fades smoothly across its ring.
out.push(`  <g clip-path="url(#circle_clip)" opacity="${FLOWER_OPACITY}">`);
ELEM_LAYERS.forEach(({ base_r, lobe_amp, color, rot_steps }, i) => {
    const rotation = BASE_ROTATION_OFFSET + rot_steps * ROTATION_STEP;
    const d = flower_path(200, 200, base_r, lobe_amp, LOBE_COUNT, rotation, 1000);
    if (FLOWER_LAYER_BLUR > 0) {
        out.push(`    <path d="${d}" fill="${apply_flower_color(color)}" filter="url(#flower_fade)"/>`);
    } else {
        out.push(`    <path d="${d}" fill="${apply_flower_color(color)}"/>`);
    }
});
if (FLOWER_LAYER_BLUR > 0) {
    out.push(`    <circle cx="200" cy="200" r="${FLOWER_CENTER_R}" fill="${apply_flower_color(FLOWER_CENTER_COLOR)}" filter="url(#flower_fade)"/>`);
} else {
    out.push(`    <circle cx="200" cy="200" r="${FLOWER_CENTER_R}" fill="${apply_flower_color(FLOWER_CENTER_COLOR)}"/>`);
}
out.push(`  </g>`);

// Flower dimmer — black overlay slightly larger than the outermost flower layer.
// Expanded by 1px (2px diameter) to close bright-edge gaps, plus FLOWER_DIMMER_BLUR so the
// fully-opaque interior still reaches the flower edge before the blur feathering begins.
if (FLOWER_DIMMER > 0) {
    const { base_r, lobe_amp } = ELEM_LAYERS[0];
    const fd_path = flower_path(200, 200, base_r + FLOWER_DIMMER_BLUR, lobe_amp, LOBE_COUNT, BASE_ROTATION_OFFSET, 1000);
    const fd_filter = FLOWER_DIMMER_BLUR > 0 ? ' filter="url(#flower_dimmer_blur_fx)"' : '';
    out.push(`  <path d="${fd_path}" fill="black" opacity="${FLOWER_DIMMER}"${fd_filter} clip-path="url(#circle_clip)"/>`);
}

// Text — supports multiple lines via \n in --text
// Column alignment: all tspans use text-anchor="start" at the same x so that character
// column i on every line maps to the same x coordinate, regardless of per-character
// rendering differences. text-anchor="middle" is intentionally avoided — it centers each
// line independently, so lines of different rendered widths shift relative to each other.
// The block is centered by measuring the widest line's actual advance width via fontkit.
// Requires the font to be installed in node_modules/@fontsource (run `npm run pull-fonts`).
// Each tspan uses absolute y (never dy) so vertical positions are font-independent.
// Empty lines use a non-breaking space so they still occupy vertical space.
// Rendered in two passes: backing shadow first (black, blurred), glow+color on top.
{
    const lines      = TEXT_STRING.split('\n');
    const line_h     = measureLineHeight(TEXT_FONT, FONT_SIZE) * TEXT_LINE_HEIGHT;
    const lineWidths = lines.map(l => l.length === 0 ? 0 : measureTextWidth(l, TEXT_FONT, FONT_SIZE));
    const blockWidth = Math.max(...lineWidths);
    const text_x     = (200 - blockWidth / 2).toFixed(3);
    const tspans  = lines
        .map((l, i) => {
            const content = l.length === 0 ? '&#160;' : l;
            const y_i = (200 + (i - (lines.length - 1) / 2) * line_h).toFixed(3);
            return `      <tspan dominant-baseline="central" x="${text_x}" y="${y_i}">${content}</tspan>`;
        })
        .join('\n');
    const text_attrs = `dominant-baseline="central" text-anchor="start" font-family="'${TEXT_FONT}'" font-size="${FONT_SIZE}" font-weight="500" style="font-variant-ligatures:none"`;

    if (TEXT_BACKING_SPREAD > 0) {
        out.push(`  <g filter="url(#text_backing)" opacity="${TEXT_BACKING_OPACITY}" clip-path="url(#circle_clip)">`);
        out.push(`    <text ${text_attrs} fill="black">\n${tspans}\n    </text>`);
        out.push(`  </g>`);
    }

    out.push(`  <g filter="url(#terminal_glow)" clip-path="url(#circle_clip)">`);
    out.push(`    <text ${text_attrs} fill="${TEXT_COLOR}">\n${tspans}\n    </text>`);
    out.push(`  </g>`);
}

out.push(`</svg>`);

if (args['output-dir']) {
    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
}
fs.writeFileSync(OUTPUT_PATH, out.join('\n'), 'utf8');

// Write all resolved parameters alongside the SVG
const _params = {
    'wave-freq-expr':                WAVE_FREQ_EXPR,
    'wave-count':                    NUM_WAVES,
    'wave-start-degree':             WAVE_START_DEG,
    'wave-distance':                 WAVE_DISTANCE,
    'wave-color-loop-count':         WAVE_COLOR_LOOPS,
    'wave-lightness':                WAVE_L,
    'wave-chroma':                   WAVE_C,
    'wave-amplitude':                WAVE_AMPLITUDE,
    'shadow-darkness':               SHADOW_DARKNESS,
    'wave-effect':                   WAVE_EFFECT,
    'wave-effect-strength':          WAVE_EFFECT_STRENGTH,
    'dimmer':                        DIMMER_OPACITY,
    'dimmer-blur':                   DIMMER_BLUR,
    'lobe-count':                    LOBE_COUNT,
    'lobe-bumpiness':                LOBE_BUMPINESS,
    'lobe-gap-ratio':                LOBE_GAP_RATIO,
    'flower-size':                   FLOWER_SIZE,
    'flower-opacity':                FLOWER_OPACITY,
    'flower-dimmer':                 FLOWER_DIMMER,
    'flower-dimmer-blur':            FLOWER_DIMMER_BLUR,
    'flower-lightness':              FLOWER_LIGHTNESS,
    'flower-chroma':                 FLOWER_CHROMA,
    'flower-layer-blur':             FLOWER_LAYER_BLUR,
    'outer-polygon-edges':           OUTER_POLYGON_EDGES,
    'outer-polygon-radius':          OUTER_POLYGON_RADIUS,
    'polygon-ring-step':             POLYGON_RING_STEP,
    'polygon-node-radius':           POLYGON_NODE_RADIUS,
    'polygon-node-glow':             POLYGON_NODE_GLOW,
    'polygon-node-twinkle':          POLYGON_NODE_TWINKLE,
    'polygon-node-twinkle-radius':   POLYGON_NODE_TWINKLE_RADIUS !== null ? POLYGON_NODE_TWINKLE_RADIUS : POLYGON_NODE_RADIUS,
    'polygon-node-glow-twinkle':     POLYGON_NODE_GLOW_TWINKLE,
    'seed':                          INPUT_SEED,
    'polygon-node-twinkle-strength': POLYGON_NODE_TWINKLE_STRENGTH,
    'text':                          TEXT_STRING,
    'text-size':                     FONT_SIZE,
    'text-line-height':              TEXT_LINE_HEIGHT,
    'text-glow-distance':            TEXT_GLOW_DISTANCE,
    'text-glow-strength':            TEXT_GLOW_STRENGTH,
    'text-backing-spread':           TEXT_BACKING_SPREAD,
    'text-backing-dilate':           TEXT_BACKING_DILATE,
    'text-backing-opacity':          TEXT_BACKING_OPACITY,
    'text-font':                     TEXT_FONT,
};
fs.writeFileSync(OUTPUT_PATH + '.json', JSON.stringify(_params, null, 2), 'utf8');

// Log flower geometry
console.log('Flower layers:');
ELEM_LAYERS.forEach(({ base_r, lobe_amp, r_min, r_max }, i) => {
    console.log(`  [${i}] base_r=${base_r.toFixed(1)}, lobe_amp=${lobe_amp.toFixed(2)}, r=${r_min.toFixed(1)}–${r_max.toFixed(1)}`);
});
console.log(`  [center] r=${FLOWER_CENTER_R}`);
console.log(`Done: ${OUTPUT_PATH}`);