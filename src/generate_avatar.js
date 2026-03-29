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
    return fonts.map(fontEntry => {
        const slug  = fontEntry.package.replace('@fontsource/', '');
        const found = fs.existsSync(path.join(FONTSOURCE_DIR, slug));
        return `  ${found ? '✓' : '✗'} ${fontEntry.name.padEnd(24)} ${found ? 'installed' : 'not installed'}`;
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
        '\n' +
        'Flower:\n' +
        '  --lobe-count <n>                   Number of lobes  [7]\n' +
        '  --lobe-bumpiness <n[,n…]>          Lobe amplitude as fraction of flower radius, per layer center→outside (cycles)  [0.075]\n' +
        '  --lobe-gap-ratio <n[,n…]>          Gap between layers as fraction of flower radius, per gap center→outside (cycles)  [0.12]\n' +
        '  --flower-size <n>                  Flower diameter as fraction of avatar diameter  [0.15]\n' +
        '  --flower-opacity <n>               Opacity 0-1  [1]\n' +
        '  --flower-lightness <n>             oklch L reference  [0.57]\n' +
        '  --flower-chroma <n>                oklch C reference  [0.10]\n' +
        '  --flower-layer-blur <n>            Fade distance (px) at each petal boundary; follows shape, no hard edges  [1.0]\n' +
        '  --flower-turbulence-freq <n>       feTurbulence baseFrequency for organic edge wobble; 0 = disabled  [0]\n' +
        '  --flower-turbulence-scale <n>      feDisplacementMap scale for wobble amount  [10]\n' +
        '  --flower-turbulence-octaves <n>    feTurbulence numOctaves  [1]\n' +
        '  --flower-outer-glow <n>            Halo extending outward from flower edge, as fraction of flower diameter  [0.05]\n' +
        '  --flower-outer-glow-color <c>      Outer glow color  [oklch(0.85 0.155 171 / 0.5)]\n' +
        '  --flower-outer-glow-opacity <n>    Outer glow opacity 0-1  [0.25]\n' +
        '  --flower-outer-glow-twinkle <n>    Outer glow size twinkle, fraction of flower diameter  [0.15]\n' +
        '  --flower-outer-glow-twinkle-color <c>   Outer glow twinkle color  [oklch(0.9 0.19 115.19)]\n' +
        '  --flower-outer-glow-twinkle-opacity <n> Outer glow twinkle opacity 0-1  [0.25]\n' +
        '  --flower-inner-glow <n>            Rim extending inward from flower edge, as fraction of flower diameter  [0.05]\n' +
        '  --flower-inner-glow-color <c>      Inner glow color  [oklch(0.85 0.155 171 / 0.5)]\n' +
        '  --flower-inner-glow-opacity <n>    Inner glow opacity 0-1  [0.25]\n' +
        '  --flower-inner-glow-twinkle <n>    Inner glow size twinkle, fraction of flower diameter  [0.15]\n' +
        '  --flower-inner-glow-twinkle-color <c>   Inner glow twinkle color  [oklch(0.9 0.19 115.19)]\n' +
        '  --flower-inner-glow-twinkle-opacity <n> Inner glow twinkle opacity 0-1  [0.25]\n' +
        '\n' +
        'Outer ring:\n' +
        '  --outer-polygon-edges <n>          Edges per polygon ring  [12]\n' +
        '  --outer-polygon-radius <n>         Radius of outermost ring, px  [190]\n' +
        '  --polygon-ring-step <n>            Radial step between rings, px  [22]\n' +
        '  --polygon-node-radius <n>          Vertex node circle radius, px  [1]\n' +
        '  --polygon-node-glow <n>            Node glow blur radius, px  [3]\n' +
        '  --polygon-node-fade <n>            Node edge fade zone, px (erode+blur like flower_layer_fx)  [0]\n' +
        '  --polygon-node-twinkle <n>         % of nodes randomly lit brighter, 0-100  [0]\n' +
        '  --polygon-node-twinkle-radius <n>  Twinkle node radius, px  [3]\n' +
        '  --polygon-node-twinkle-glow <n>    Twinkle node glow blur radius, px  [6]\n' +
        '  --polygon-node-twinkle-fade <n>    Twinkle node edge fade zone, px  [2]\n' +
        '  --twinkle-strength <n>             Blend strength for all twinkle effects: 0=identical 1=full twinkle  [1]\n' +
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
        '  --text-offset-x <n>               Horizontal offset, fraction of SVG size (positive = right)  [0]\n' +
        '  --text-offset-y <n>               Vertical offset, fraction of SVG size (positive = up)  [0]\n' +
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
        'lobe-count':           { type: 'string', default: '7' },
        'lobe-bumpiness':        { type: 'string', default: '0.075' },
        'lobe-gap-ratio':        { type: 'string', default: '0.09' },
        'lobe-gap-exponent':     { type: 'string', default: '1' },
        'flower-size':          { type: 'string', default: '0.15' },
        'flower-opacity':       { type: 'string', default: '1' },
        'flower-lightness':     { type: 'string', default: '0.57' },
        'flower-chroma':        { type: 'string', default: '0.10' },
        'flower-layer-blur':    { type: 'string', default: '1.0' },
        'flower-turbulence-freq':    { type: 'string', default: '0.02' },
        'flower-turbulence-scale':   { type: 'string', default: '10' },
        'flower-turbulence-octaves': { type: 'string', default: '1' },
        'flower-turbulence-type':    { type: 'string', default: 'fractalNoise' },
        'flower-outer-glow':         { type: 'string', default: '0.05' },
        'flower-outer-glow-color':   { type: 'string', default: 'oklch(0.85 0.155 171 / 0.5)' },
        'flower-outer-glow-opacity': { type: 'string', default: '0.25' },
        'flower-outer-glow-twinkle':         { type: 'string', default: '0.15' },
        'flower-outer-glow-twinkle-color':   { type: 'string', default: 'oklch(0.9 0.19 115.19)' },
        'flower-outer-glow-twinkle-opacity': { type: 'string', default: '0.25' },
        'flower-inner-glow':         { type: 'string', default: '0.05' },
        'flower-inner-glow-color':   { type: 'string', default: 'oklch(0.85 0.155 171 / 0.5)' },
        'flower-inner-glow-opacity': { type: 'string', default: '0.25' },
        'flower-inner-glow-twinkle':         { type: 'string', default: '0.15' },
        'flower-inner-glow-twinkle-color':   { type: 'string', default: 'oklch(0.9 0.19 115.19)' },
        'flower-inner-glow-twinkle-opacity': { type: 'string', default: '0.25' },
        'outer-polygon-edges':  { type: 'string', default: '12' },
        'outer-polygon-radius': { type: 'string', default: '190' },
        'polygon-ring-step':    { type: 'string', default: '22' },
        'polygon-node-radius':       { type: 'string', default: '2' },
        'polygon-node-glow':         { type: 'string', default: '4' },
        'polygon-node-fade':         { type: 'string', default: '1' },
        'polygon-node-twinkle':        { type: 'string', default: '10' },
        'polygon-node-twinkle-radius': { type: 'string', default: '3' },
        'polygon-node-twinkle-glow':   { type: 'string', default: '6' },
        'polygon-node-twinkle-fade':   { type: 'string', default: '2' },
        'seed':                        { type: 'string' },
        'flower-seed':                 { type: 'string' },
        'twinkle-strength': { type: 'string', default: '1' },
        'text':                      { type: 'string', default: '/^merely\npresent/' },
        'text-size':            { type: 'string', default: '40' },
        'text-line-height':     { type: 'string', default: '1.0' },
        'text-glow-distance':   { type: 'string', default: '4' },
        'text-glow-strength':   { type: 'string', default: '1.0' },
        'text-backing-spread':  { type: 'string', default: '5' },
        'text-backing-dilate':  { type: 'string', default: '3' },
        'text-backing-opacity': { type: 'string', default: '0.9' },
        'text-font':            { type: 'string', default: 'DejaVu Sans Mono' },
        'text-offset-x':        { type: 'string', default: '0' },
        'text-offset-y':        { type: 'string', default: '0' },
        'help':                 { type: 'boolean', short: 'h' },
    },
});

if (args.help) { showHelp(); process.exit(0); }

const SVG_SIZE            = 400;

function resolve_output_path(explicit, outputDir) {
    const now       = new Date();
    const padStart2 = n => String(n).padStart(2, '0');
    const datetime  = `${now.getFullYear()}-${padStart2(now.getMonth() + 1)}-${padStart2(now.getDate())}_${padStart2(now.getHours())}-${padStart2(now.getMinutes())}-${padStart2(now.getSeconds())}`;
    const filename = explicit || `merely-present-avatar-${datetime}.svg`;
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
const LOBE_COUNT          = parseInt(args['lobe-count'], 10);
const LOBE_BUMPINESS_LIST = args['lobe-bumpiness'].split(',').map(s => parseFloat(s.trim()));
const LOBE_GAP_LIST       = args['lobe-gap-ratio'].split(',').map(s => parseFloat(s.trim()));
const LOBE_GAP_EXPONENT   = parseFloat(args['lobe-gap-exponent']);
const FLOWER_SIZE         = parseFloat(args['flower-size']);
const FLOWER_OPACITY      = parseFloat(args['flower-opacity']);
const FLOWER_LIGHTNESS    = parseFloat(args['flower-lightness']);
const FLOWER_CHROMA       = parseFloat(args['flower-chroma']);
const FLOWER_LAYER_BLUR       = parseFloat(args['flower-layer-blur']);
const FLOWER_TURBULENCE_FREQ_LIST    = args['flower-turbulence-freq'].split(',').map(s => parseFloat(s.trim()));
const FLOWER_TURBULENCE_SCALE_LIST   = args['flower-turbulence-scale'].split(',').map(s => parseFloat(s.trim()));
const FLOWER_TURBULENCE_OCTAVES_LIST = args['flower-turbulence-octaves'].split(',').map(s => parseInt(s.trim(), 10));
const FLOWER_TURBULENCE_TYPE_LIST    = args['flower-turbulence-type'].split(',').map(s => s.trim() === 'turbulence' ? 'turbulence' : 'fractalNoise');
const FLOWER_TURBULENCE_ANY_ACTIVE   = FLOWER_TURBULENCE_FREQ_LIST.some(f => f > 0);
const FLOWER_OUTER_GLOW         = parseFloat(args['flower-outer-glow']);
const FLOWER_OUTER_GLOW_OPACITY = parseFloat(args['flower-outer-glow-opacity']);
const FLOWER_OUTER_GLOW_TWINKLE = parseFloat(args['flower-outer-glow-twinkle']);
const FLOWER_INNER_GLOW         = parseFloat(args['flower-inner-glow']);
const FLOWER_INNER_GLOW_OPACITY = parseFloat(args['flower-inner-glow-opacity']);
const FLOWER_INNER_GLOW_TWINKLE = parseFloat(args['flower-inner-glow-twinkle']);
const OUTER_POLYGON_EDGES  = parseInt(args['outer-polygon-edges'], 10);
const OUTER_POLYGON_RADIUS = parseFloat(args['outer-polygon-radius']);
const POLYGON_RING_STEP    = parseFloat(args['polygon-ring-step']);
const POLYGON_NODE_RADIUS       = parseFloat(args['polygon-node-radius']);
const POLYGON_NODE_GLOW         = parseFloat(args['polygon-node-glow']);
const POLYGON_NODE_FADE         = parseFloat(args['polygon-node-fade']);
const POLYGON_NODE_TWINKLE        = parseFloat(args['polygon-node-twinkle']);
const POLYGON_NODE_TWINKLE_RADIUS = parseFloat(args['polygon-node-twinkle-radius']);
const POLYGON_NODE_TWINKLE_GLOW   = parseFloat(args['polygon-node-twinkle-glow']);
const POLYGON_NODE_TWINKLE_FADE   = parseFloat(args['polygon-node-twinkle-fade']);
const POLYGON_NODE_TWINKLE_STRENGTH = Math.max(0, Math.min(1, parseFloat(args['twinkle-strength'])));
const TWINKLE_STRENGTH = POLYGON_NODE_TWINKLE_STRENGTH;
const SEED_PROVIDED             = args['seed'] !== undefined;
const INPUT_SEED                = SEED_PROVIDED
    ? parseInt(args['seed'], 10)
    : Math.floor(Math.random() * 0x100000000);
const FLOWER_SEED               = args['flower-seed'] !== undefined
    ? parseInt(args['flower-seed'], 10)
    : INPUT_SEED;
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
const TEXT_OFFSET_X        = parseFloat(args['text-offset-x']);
const TEXT_OFFSET_Y        = parseFloat(args['text-offset-y']);

const WAVE_STROKE_WIDTH   = 18;
const WAVE_POINTS         = 1200;

const TEXT_COLOR = 'oklch(0.7319 0.125 176.08)';
const MEDIUM_GREY    = 'oklch(0.50 0 0)';

// Compile frequency expression once
const freq_fn = new Function('x', `return (${WAVE_FREQ_EXPR});`);

// --- Flower layer geometry ---
// FLOWER_COLORS.length concentric layers including center; layers i=0…N-1 outermost→center.
// Bumpiness and gap lists cycle from center outward.
const FLOWER_OUTER_BASE_R   = (FLOWER_SIZE * SVG_SIZE) / 2;
const _outerGlowRatio = POLYGON_NODE_TWINKLE > 0
    ? lerp(FLOWER_OUTER_GLOW, FLOWER_OUTER_GLOW_TWINKLE, TWINKLE_STRENGTH)
    : FLOWER_OUTER_GLOW;
const FLOWER_OUTER_GLOW_PX  = _outerGlowRatio * FLOWER_OUTER_BASE_R * 2;
const _innerGlowRatio = POLYGON_NODE_TWINKLE > 0
    ? lerp(FLOWER_INNER_GLOW, FLOWER_INNER_GLOW_TWINKLE, TWINKLE_STRENGTH)
    : FLOWER_INNER_GLOW;
const FLOWER_INNER_GLOW_PX  = _innerGlowRatio * FLOWER_OUTER_BASE_R * 2;
const FLOWER_COLORS       = [
    // outermost
    'oklch(0.66 0.115 37.60)',
    'oklch(0.62 0.127 31.41)',
    'oklch(0.59 0.132 24.28)',
    'oklch(0.50 0.136 16.17)',
    'oklch(0.41 0.136 15.02)',
    'oklch(0.34 0.133 14.05)',
    'oklch(0.31 0.130 13.25)',
    'oklch(0.26 0.115 12.75)',
    'oklch(0.22 0.100 12.00)',
    // innermost
];
// Outer polygon ring colors: [outline, triangles, outline, triangles, ..., outline]
// Even indices = polygon outline strokes; odd indices = triangle connector strokes.
// Length must be odd. Number of polygon rings = (length + 1) / 2.
const POLYGON_RING_COLORS = [
    'oklch(0.7319 0.10 176.08 / 0.15)', // outline 0 — outermost, terminal green
    'oklch(0.9 0.155 171    / 0.80)',    // triangles 0→1
    'oklch(0.7319 0.10 163  / 0.15)',    // outline 1
    'oklch(0.9 0.155 157    / 0.80)',    // triangles 1→2
    'oklch(0.7319 0.10 150  / 0.15)',    // outline 2
    'oklch(0.9 0.155 143    / 0.80)',    // triangles 2→3
    'oklch(0.7319 0.10 136  / 0.15)',    // outline 3
    'oklch(0.9 0.155 129    / 0.80)',    // triangles 3→4
    'oklch(0.7319 0.10 122  / 0.15)',    // outline 4
    'oklch(0.9 0.155 115.19 / 0.80)' ,    // triangles 4→5
    'oklch(0.7319 0.10 110  / 0.2)',    // outline 5
];

const FLOWER_OUTER_GLOW_COLOR           = args['flower-outer-glow-color'];
const FLOWER_OUTER_GLOW_TWINKLE_COLOR   = args['flower-outer-glow-twinkle-color'];
const FLOWER_OUTER_GLOW_TWINKLE_OPACITY = parseFloat(args['flower-outer-glow-twinkle-opacity']);
const FLOWER_INNER_GLOW_COLOR           = args['flower-inner-glow-color'];
const FLOWER_INNER_GLOW_TWINKLE_COLOR   = args['flower-inner-glow-twinkle-color'];
const FLOWER_INNER_GLOW_TWINKLE_OPACITY = parseFloat(args['flower-inner-glow-twinkle-opacity']);

const BASE_ROTATION_OFFSET = Math.PI / 2;
const ROTATION_STEP        = Math.PI / LOBE_COUNT;

function compute_flower_layers() {
    const layers = [];
    const layerCount = FLOWER_COLORS.length;
    // Build outside→in. For layer layerIndex, its center-to-outside index is (layerCount-1-layerIndex),
    // used to look up the cycling bumpiness/gap lists.
    let radiusMax = FLOWER_OUTER_BASE_R;
    for (let layerIndex = 0; layerIndex < layerCount; layerIndex++) {
        const centerToOuterIndex = layerCount - 1 - layerIndex; // 0 = center, layerCount-1 = outermost
        const lobeAmplitude      = LOBE_BUMPINESS_LIST[centerToOuterIndex % LOBE_BUMPINESS_LIST.length] * FLOWER_OUTER_BASE_R;
        const baseRadius         = radiusMax - lobeAmplitude;
        const radiusMin          = radiusMax - 2 * lobeAmplitude;
        layers.push({ baseRadius, lobeAmplitude, radiusMin, radiusMax, color: FLOWER_COLORS[layerIndex], rotationSteps: layerIndex });
        if (layerIndex < layerCount - 1) {
            // gap center-to-outer index: 0 = innermost gap, layerCount-2 = outermost gap
            const gapCto    = layerCount - 2 - layerIndex;
            const numGaps   = layerCount - 1;
            // LOBE_GAP_EXPONENT scales gap size by position: 1=uniform, >1=tunnel (inner compressed)
            const expFactor = LOBE_GAP_EXPONENT === 1 ? 1 : Math.pow((gapCto + 1) / numGaps, LOBE_GAP_EXPONENT - 1);
            const gapDistance = LOBE_GAP_LIST[gapCto % LOBE_GAP_LIST.length] * FLOWER_OUTER_BASE_R * expFactor;
            radiusMax = radiusMin - gapDistance;
        }
    }
    return layers;
}

const ELEM_LAYERS = compute_flower_layers();

// --- Path generators ---

function wave_pts(y_center, frequency, num_points, y_offset) {
    const xStart = -10;
    const xEnd   = SVG_SIZE + 10;
    const pointStrings = [];
    for (let pointIndex = 0; pointIndex <= num_points; pointIndex++) {
        const progress = pointIndex / num_points;
        const x = xStart + progress * (xEnd - xStart);
        const wavePhase = (progress - 0.5) * frequency * 2 * Math.PI;
        const y = (y_center + (y_offset || 0)) + WAVE_AMPLITUDE * Math.cos(wavePhase);
        pointStrings.push(`${x.toFixed(2)},${y.toFixed(2)}`);
    }
    return pointStrings;
}

// Shadow is a filled polygon: top edge follows the wave curve, bottom is image bottom + margin.
// No stroke-based shadow, so no visible parallel duplicate and no gaps below.
function shadow_fill_path(y_center, frequency, num_points) {
    const wavePoints = wave_pts(y_center, frequency, num_points, 0);
    const yBottom = SVG_SIZE + 20;
    const xStart  = -10;
    const xEnd    = SVG_SIZE + 10;
    const pathCmds = [
        `M${xStart},${yBottom}`,   // bottom-left
        ...wavePoints.map(pointStr => `L${pointStr}`),
        `L${xEnd},${yBottom}`,     // bottom-right
        'Z',
    ];
    return pathCmds.join(' ');
}

function polyline(pointsArray, stroke, width) {
    return `    <polyline points="${pointsArray.join(' ')}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

const FLOWER_LIGHTNESS_REF = 0.57;
const FLOWER_CHROMA_REF    = 0.10;

function apply_flower_color(oklchStr) {
    const colorMatch = oklchStr.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
    if (!colorMatch) return oklchStr;
    const lightness = parseFloat(colorMatch[1]) * (FLOWER_LIGHTNESS / FLOWER_LIGHTNESS_REF);
    const chroma    = parseFloat(colorMatch[2]) * (FLOWER_CHROMA    / FLOWER_CHROMA_REF);
    return `oklch(${lightness.toFixed(4)} ${chroma.toFixed(4)} ${colorMatch[3]})`;
}

function flower_path(cx, cy, baseRadius, lobeAmplitude, numLobes, rotationRad, numPoints) {
    const pathCmds = [];
    for (let pointIndex = 0; pointIndex <= numPoints; pointIndex++) {
        const angle  = (pointIndex / numPoints) * 2 * Math.PI;
        const radius = baseRadius + lobeAmplitude * Math.cos(numLobes * (angle + rotationRad));
        const x = cx + radius * Math.cos(angle);
        const y = cy + radius * Math.sin(angle);
        pathCmds.push(pointIndex === 0 ? `M${x.toFixed(3)},${y.toFixed(3)}` : `L${x.toFixed(3)},${y.toFixed(3)}`);
    }
    return pathCmds.join(' ') + ' Z';
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
            const blurLayerCount = Math.max(4, Math.round(strength * 3));
            const blurLayers = Array.from({length: blurLayerCount}, (_, blurLayerIndex) => {
                const dy    = ((blurLayerIndex + 1) / blurLayerCount * strength * 6).toFixed(2);
                const alpha = (0.3 * (1 - (blurLayerIndex + 1) / blurLayerCount)).toFixed(3);
                return `      <feOffset in="SourceGraphic" dx="0" dy="${dy}" result="l${blurLayerIndex}"/>
      <feComponentTransfer in="l${blurLayerIndex}" result="d${blurLayerIndex}"><feFuncA type="linear" slope="${alpha}"/></feComponentTransfer>`;
            }).join('\n');
            const mergeNodes = Array.from({length: blurLayerCount}, (_, blurLayerIndex) => `        <feMergeNode in="d${blurLayerIndex}"/>`).join('\n');
            return `    <filter id="wave_fx" x="-2%" y="-5%" width="104%" height="120%">
${blurLayers}
      <feMerge>\n${mergeNodes}\n        <feMergeNode in="SourceGraphic"/>\n      </feMerge>
    </filter>`;
        }
        case 'ripple':
            return `    <filter id="wave_fx" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="${(0.02 * strength).toFixed(4)}" numOctaves="2" seed="7" result="noise"/>
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="${strength * 8}" xChannelSelector="R" yChannelSelector="G"/>
    </filter>`;
        case 'posterize': {
            const bandCount  = Math.max(2, Math.round(8 / strength));
            const tableValues = Array.from({length: bandCount + 1}, (_, bandIndex) => (bandIndex / bandCount).toFixed(3)).join(' ');
            return `    <filter id="wave_fx" color-interpolation-filters="sRGB">
      <feComponentTransfer><feFuncR type="discrete" tableValues="${tableValues}"/><feFuncG type="discrete" tableValues="${tableValues}"/><feFuncB type="discrete" tableValues="${tableValues}"/></feComponentTransfer>
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

function lerp(start, end, factor) { return start + (end - start) * factor; }
function lerp_oklch(color1, color2, factor) {
    const color1Match = color1.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
    const color2Match = color2.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
    const lightness = lerp(parseFloat(color1Match[1]), parseFloat(color2Match[1]), factor);
    const chroma    = lerp(parseFloat(color1Match[2]), parseFloat(color2Match[2]), factor);
    const hue       = lerp(parseFloat(color1Match[3]), parseFloat(color2Match[3]), factor);
    return `oklch(${lightness.toFixed(4)} ${chroma.toFixed(4)} ${hue.toFixed(2)})`;
}
// Like lerp_oklch but preserves/lerps the optional `/ alpha` component.
function lerp_oklch_alpha(color1, color2, factor) {
    const re = /oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)/;
    const m1 = color1.match(re);
    const m2 = color2.match(re);
    if (!m1 || !m2) return color1;
    const L     = lerp(parseFloat(m1[1]), parseFloat(m2[1]), factor);
    const C     = lerp(parseFloat(m1[2]), parseFloat(m2[2]), factor);
    const H     = lerp(parseFloat(m1[3]), parseFloat(m2[3]), factor);
    const alpha = lerp(m1[4] !== undefined ? parseFloat(m1[4]) : 1,
                       m2[4] !== undefined ? parseFloat(m2[4]) : 1, factor);
    const alphaStr = alpha < 0.9999 ? ` / ${alpha.toFixed(3)}` : '';
    return `oklch(${L.toFixed(4)} ${C.toFixed(4)} ${H.toFixed(2)}${alphaStr})`;
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
    let matching = allFiles.filter(fileName => fileName.startsWith(slug + '-latin') && fileName.endsWith('.woff2'));
    if (matching.length === 0)
        matching = allFiles.filter(fileName => fileName.startsWith(slug) && fileName.endsWith('.woff2'));
    if (matching.length === 0) return null;
    // Prefer weight-500 (used in SVG), then 400, then any
    return path.join(filesDir,
        matching.find(fileName => fileName.includes('-500-normal'))
        ?? matching.find(fileName => fileName.includes('-400-normal'))
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
        let hashState = Math.imul(seed ^ seed >>> 15, 1 | seed);
        hashState = hashState + Math.imul(hashState ^ hashState >>> 7, 61 | hashState) ^ hashState;
        return ((hashState ^ hashState >>> 14) >>> 0) / 4294967296;
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

// Per-layer flower fade: shape-following boundary feather via erode + blur + in-composite.
// Strategy:
//   1. feMorphology erode SourceAlpha by half the fade distance — this shrinks the opaque
//      region inward, following every lobe contour exactly.
//   2. feGaussianBlur the eroded alpha — this spreads the shrunk mask back outward, creating
//      a smooth alpha gradient that peaks at the eroded core and falls off toward the
//      original boundary (and possibly slightly beyond for very large blur values).
//   3. feComposite SourceGraphic IN the soft alpha — applies that gradient as a mask to the
//      actual layer colour. Because SourceGraphic is transparent outside the path, no colour
//      bleeds outward over sibling layers, eliminating the halo/banding seen with the
//      previous approach that blurred SourceGraphic directly.
// color-interpolation-filters="sRGB" is critical: blur in linear light produces
// perceptually non-uniform alpha steps that look like discrete rings over dark backgrounds.
// Operating in sRGB (perceptual) space gives a visually smooth gradient.
if (FLOWER_LAYER_BLUR > 0 && !FLOWER_TURBULENCE_ANY_ACTIVE) {
    // Blur-only: single shared filter (no per-layer variation needed)
    const erodeRadius    = (FLOWER_LAYER_BLUR * 0.5).toFixed(2);
    const blurSigma      = (FLOWER_LAYER_BLUR * 0.5).toFixed(2);
    const filterHalfSize = FLOWER_OUTER_BASE_R + Math.ceil(FLOWER_LAYER_BLUR);
    out.push(`    <filter id="flower_layer_fx" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB" x="${(200 - filterHalfSize).toFixed(0)}" y="${(200 - filterHalfSize).toFixed(0)}" width="${(filterHalfSize * 2).toFixed(0)}" height="${(filterHalfSize * 2).toFixed(0)}">
      <feMorphology in="SourceAlpha" operator="erode" radius="${erodeRadius}" result="core"/>
      <feGaussianBlur in="core" stdDeviation="${blurSigma}" result="soft_alpha"/>
      <feComposite in="SourceGraphic" in2="soft_alpha" operator="in"/>
    </filter>`);
}
if (FLOWER_TURBULENCE_ANY_ACTIVE) {
    // Per-layer filters: each layer gets its own filter_i using cycled turbulence params.
    // Indexing uses centerToOuterIndex (0=innermost, layerCount-1=outermost), matching lobe-bumpiness.
    ELEM_LAYERS.forEach((_, i) => {
        const cto     = ELEM_LAYERS.length - 1 - i;
        const freq    = FLOWER_TURBULENCE_FREQ_LIST[cto % FLOWER_TURBULENCE_FREQ_LIST.length];
        const scale   = FLOWER_TURBULENCE_SCALE_LIST[cto % FLOWER_TURBULENCE_SCALE_LIST.length];
        const octaves = FLOWER_TURBULENCE_OCTAVES_LIST[cto % FLOWER_TURBULENCE_OCTAVES_LIST.length];
        const type    = FLOWER_TURBULENCE_TYPE_LIST[cto % FLOWER_TURBULENCE_TYPE_LIST.length];
        const hasTurb = freq > 0;
        if (!FLOWER_LAYER_BLUR && !hasTurb) return;
        const filterHalfSize = FLOWER_OUTER_BASE_R + Math.ceil(FLOWER_LAYER_BLUR) + (hasTurb ? Math.ceil(scale) : 0);
        let primitives = '';
        if (FLOWER_LAYER_BLUR > 0) {
            const erodeRadius = (FLOWER_LAYER_BLUR * 0.5).toFixed(2);
            const blurSigma   = (FLOWER_LAYER_BLUR * 0.5).toFixed(2);
            primitives += `\n      <feMorphology in="SourceAlpha" operator="erode" radius="${erodeRadius}" result="core"/>\n      <feGaussianBlur in="core" stdDeviation="${blurSigma}" result="soft_alpha"/>\n      <feComposite in="SourceGraphic" in2="soft_alpha" operator="in" result="faded"/>`;
        }
        if (hasTurb) {
            const fadeOut = FLOWER_LAYER_BLUR > 0 ? 'faded' : 'SourceGraphic';
            primitives += `\n      <feTurbulence type="${type}" baseFrequency="${freq}" numOctaves="${octaves}" seed="${FLOWER_SEED % 65536}" result="noise"/>\n      <feDisplacementMap in="${fadeOut}" in2="noise" scale="${scale}" xChannelSelector="R" yChannelSelector="G"/>`;
        }
        out.push(`    <filter id="flower_layer_fx_${i}" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB" x="${(200 - filterHalfSize).toFixed(0)}" y="${(200 - filterHalfSize).toFixed(0)}" width="${(filterHalfSize * 2).toFixed(0)}" height="${(filterHalfSize * 2).toFixed(0)}">${primitives}\n    </filter>`);
    });
}


// Outer glow: simple Gaussian blur on outer flower shape, drawn behind the flower.
// The fill is uniform inside; blur spreads the color outward from the edge.
// The flower layers drawn on top hide the interior bleed, leaving only the outward halo.
// When turbulence is active, the same displacement used by the outermost flower layer
// (centerToOuterIndex = layerCount-1) is prepended so the glow halo follows the warped shape exactly.
if (FLOWER_OUTER_GLOW_PX > 0) {
    const sigma         = (FLOWER_OUTER_GLOW_PX * 0.5).toFixed(2);
    const outerCto      = ELEM_LAYERS.length - 1;
    const outerTurbFreq = FLOWER_TURBULENCE_FREQ_LIST[outerCto % FLOWER_TURBULENCE_FREQ_LIST.length];
    const hasTurb       = FLOWER_TURBULENCE_ANY_ACTIVE && outerTurbFreq > 0;
    const turbScale     = hasTurb ? FLOWER_TURBULENCE_SCALE_LIST[outerCto % FLOWER_TURBULENCE_SCALE_LIST.length] : 0;
    const filterHalfSize = FLOWER_OUTER_BASE_R + Math.ceil(FLOWER_OUTER_GLOW_PX * 1.5) + (hasTurb ? Math.ceil(turbScale) : 0);
    let primitives = '';
    if (hasTurb) {
        const turbType    = FLOWER_TURBULENCE_TYPE_LIST[outerCto % FLOWER_TURBULENCE_TYPE_LIST.length];
        const turbOctaves = FLOWER_TURBULENCE_OCTAVES_LIST[outerCto % FLOWER_TURBULENCE_OCTAVES_LIST.length];
        primitives += `\n      <feTurbulence type="${turbType}" baseFrequency="${outerTurbFreq}" numOctaves="${turbOctaves}" seed="${FLOWER_SEED % 65536}" result="noise"/>\n      <feDisplacementMap in="SourceGraphic" in2="noise" scale="${turbScale}" xChannelSelector="R" yChannelSelector="G" result="displaced"/>`;
    }
    const blurIn = hasTurb ? 'displaced' : 'SourceGraphic';
    primitives += `\n      <feGaussianBlur in="${blurIn}" stdDeviation="${sigma}"/>`;
    out.push(`    <filter id="flower_outer_glow" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB" x="${(200 - filterHalfSize).toFixed(0)}" y="${(200 - filterHalfSize).toFixed(0)}" width="${(filterHalfSize * 2).toFixed(0)}" height="${(filterHalfSize * 2).toFixed(0)}">${primitives}\n    </filter>`);
}
// Inner glow: erode-ring-blur-in technique — same family as flower_fade.
// 1. Erode shape alpha by half the glow distance to get the interior core.
// 2. Subtract core from shape alpha (feComposite out) → thin ring at the outer edge.
// 3. Blur the ring — spreads inward (and slightly outward, clipped next step).
// 4. feComposite shape IN soft_ring → color shaped by the inward-fading ring alpha.
// When turbulence is active, the same displacement used by the outermost flower layer
// (centerToOuterIndex = layerCount-1) is prepended so the inner rim follows the warped shape exactly.
if (FLOWER_INNER_GLOW_PX > 0) {
    const erodeRadius   = (FLOWER_INNER_GLOW_PX * 0.5).toFixed(2);
    const blurSigma     = (FLOWER_INNER_GLOW_PX * 0.5).toFixed(2);
    const outerCto      = ELEM_LAYERS.length - 1;
    const outerTurbFreq = FLOWER_TURBULENCE_FREQ_LIST[outerCto % FLOWER_TURBULENCE_FREQ_LIST.length];
    const hasTurb       = FLOWER_TURBULENCE_ANY_ACTIVE && outerTurbFreq > 0;
    const turbScale     = hasTurb ? FLOWER_TURBULENCE_SCALE_LIST[outerCto % FLOWER_TURBULENCE_SCALE_LIST.length] : 0;
    const filterHalfSize = FLOWER_OUTER_BASE_R + Math.ceil(FLOWER_INNER_GLOW_PX) + (hasTurb ? Math.ceil(turbScale) : 0);
    let primitives = '';
    if (hasTurb) {
        const turbType    = FLOWER_TURBULENCE_TYPE_LIST[outerCto % FLOWER_TURBULENCE_TYPE_LIST.length];
        const turbOctaves = FLOWER_TURBULENCE_OCTAVES_LIST[outerCto % FLOWER_TURBULENCE_OCTAVES_LIST.length];
        primitives += `\n      <feTurbulence type="${turbType}" baseFrequency="${outerTurbFreq}" numOctaves="${turbOctaves}" seed="${FLOWER_SEED % 65536}" result="noise"/>\n      <feDisplacementMap in="SourceGraphic" in2="noise" scale="${turbScale}" xChannelSelector="R" yChannelSelector="G" result="displaced"/>`;
    }
    const shapeRef = hasTurb ? 'displaced' : 'SourceGraphic';
    primitives += `\n      <feMorphology in="${shapeRef}" operator="erode" radius="${erodeRadius}" result="core"/>\n      <feComposite in="${shapeRef}" in2="core" operator="out" result="ring"/>\n      <feGaussianBlur in="ring" stdDeviation="${blurSigma}" result="soft_ring"/>\n      <feComposite in="${shapeRef}" in2="soft_ring" operator="in"/>`;
    out.push(`    <filter id="flower_inner_glow" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB" x="${(200 - filterHalfSize).toFixed(0)}" y="${(200 - filterHalfSize).toFixed(0)}" width="${(filterHalfSize * 2).toFixed(0)}" height="${(filterHalfSize * 2).toFixed(0)}">${primitives}\n    </filter>`);
}

if (POLYGON_NODE_GLOW > 0) {
    const nodeGlowPadding  = POLYGON_NODE_GLOW * 5;
    const nodeGlowHalfSize = OUTER_POLYGON_RADIUS + nodeGlowPadding;
    out.push(`    <filter id="node_glow" filterUnits="userSpaceOnUse" x="${(200 - nodeGlowHalfSize).toFixed(1)}" y="${(200 - nodeGlowHalfSize).toFixed(1)}" width="${(nodeGlowHalfSize * 2).toFixed(1)}" height="${(nodeGlowHalfSize * 2).toFixed(1)}">
      <feMorphology operator="dilate" radius="${(POLYGON_NODE_RADIUS * 0.5).toFixed(2)}" result="fat"/>
      <feFlood flood-color="white" flood-opacity="1" result="white"/>
      <feComposite in="white" in2="fat" operator="in" result="solid"/>
      <feGaussianBlur in="solid" stdDeviation="${POLYGON_NODE_GLOW}" result="glow"/>
      <feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>`);
}
if (POLYGON_NODE_TWINKLE > 0) {
    const twinkleGlow   = lerp(POLYGON_NODE_GLOW, POLYGON_NODE_TWINKLE_GLOW, POLYGON_NODE_TWINKLE_STRENGTH);
    const twinkleDilate = lerp(POLYGON_NODE_RADIUS * 0.5, POLYGON_NODE_RADIUS * 1.5, POLYGON_NODE_TWINKLE_STRENGTH);
    if (twinkleGlow > 0) {
        const twinkleGlowPadding  = twinkleGlow * 5;
        const twinkleGlowHalfSize = OUTER_POLYGON_RADIUS + twinkleGlowPadding;
        out.push(`    <filter id="node_glow_twinkle" filterUnits="userSpaceOnUse" x="${(200 - twinkleGlowHalfSize).toFixed(1)}" y="${(200 - twinkleGlowHalfSize).toFixed(1)}" width="${(twinkleGlowHalfSize * 2).toFixed(1)}" height="${(twinkleGlowHalfSize * 2).toFixed(1)}">
      <feMorphology operator="dilate" radius="${twinkleDilate.toFixed(2)}" result="fat"/>
      <feFlood flood-color="white" flood-opacity="1" result="white"/>
      <feComposite in="white" in2="fat" operator="in" result="solid"/>
      <feGaussianBlur in="solid" stdDeviation="${twinkleGlow.toFixed(3)}" result="glow"/>
      <feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>`);
    }
    const twinkleFade = lerp(POLYGON_NODE_FADE, POLYGON_NODE_TWINKLE_FADE, POLYGON_NODE_TWINKLE_STRENGTH);
    if (twinkleFade > 0) {
        const erodeRadius  = (twinkleFade * 0.5).toFixed(2);
        const blurSigma    = (twinkleFade * 0.5).toFixed(2);
        const nodeHalfSize = OUTER_POLYGON_RADIUS + POLYGON_NODE_RADIUS + Math.ceil(twinkleFade);
        out.push(`    <filter id="node_fade_twinkle" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB" x="${(200 - nodeHalfSize).toFixed(1)}" y="${(200 - nodeHalfSize).toFixed(1)}" width="${(nodeHalfSize * 2).toFixed(1)}" height="${(nodeHalfSize * 2).toFixed(1)}">
      <feMorphology in="SourceAlpha" operator="erode" radius="${erodeRadius}" result="core"/>
      <feGaussianBlur in="core" stdDeviation="${blurSigma}" result="soft_alpha"/>
      <feComposite in="SourceGraphic" in2="soft_alpha" operator="in"/>
    </filter>`);
    }
}

if (POLYGON_NODE_FADE > 0) {
    const erodeRadius  = (POLYGON_NODE_FADE * 0.5).toFixed(2);
    const blurSigma    = (POLYGON_NODE_FADE * 0.5).toFixed(2);
    const nodeHalfSize = OUTER_POLYGON_RADIUS + POLYGON_NODE_RADIUS + Math.ceil(POLYGON_NODE_FADE);
    out.push(`    <filter id="node_fade" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB" x="${(200 - nodeHalfSize).toFixed(1)}" y="${(200 - nodeHalfSize).toFixed(1)}" width="${(nodeHalfSize * 2).toFixed(1)}" height="${(nodeHalfSize * 2).toFixed(1)}">
      <feMorphology in="SourceAlpha" operator="erode" radius="${erodeRadius}" result="core"/>
      <feGaussianBlur in="core" stdDeviation="${blurSigma}" result="soft_alpha"/>
      <feComposite in="SourceGraphic" in2="soft_alpha" operator="in"/>
    </filter>`);
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
const ALL_WAVES = [];
{
    const preWavePosition = -1 / (NUM_WAVES - 1);
    ALL_WAVES.push({
        y_center: -0.5 * (SVG_SIZE / NUM_WAVES),
        frequency: freq_fn(Math.max(0, preWavePosition)),
        hue_deg: WAVE_START_DEG + preWavePosition * WAVE_DISTANCE * WAVE_COLOR_LOOPS,
    });
}
for (let waveIndex = 0; waveIndex < NUM_WAVES; waveIndex++) {
    const wavePosition = waveIndex / (NUM_WAVES - 1);
    ALL_WAVES.push({
        y_center: (waveIndex + 0.5) * (SVG_SIZE / NUM_WAVES),
        frequency: freq_fn(wavePosition),
        hue_deg: WAVE_START_DEG + wavePosition * WAVE_DISTANCE * WAVE_COLOR_LOOPS,
    });
}

// Filled wave bands: each wave fills from its sine curve top edge down to the image bottom.
// Rendered top-to-bottom; each subsequent wave covers the lower portion of the previous,
// so the visible region for each wave is bounded by its own curve above and the next wave's curve below.
for (const { y_center, frequency, hue_deg } of ALL_WAVES) {
    const main_color = `oklch(${WAVE_L} ${WAVE_C} ${hue_deg.toFixed(2)})`;
    out.push(`    <path d="${shadow_fill_path(y_center, frequency, WAVE_POINTS)}" fill="${main_color}"/>`);
}

out.push(`  </g>`);  // close inner filter <g>
out.push(`  </g>`);  // close outer clip-path <g>

// Outer polygon ring system — N-sided polygons with alternating half-step twist and triangle connectors
out.push(`  <g clip-path="url(#circle_clip)">`);
{
    const edgeCount    = OUTER_POLYGON_EDGES;
    const angleStep    = (2 * Math.PI) / edgeCount;
    const halfStep     = angleStep / 2;
    const ROUND_CAP_ATTRS = 'stroke-linecap="round"';
    const ringCount    = (POLYGON_RING_COLORS.length + 1) / 2;

    // Pre-compute all polygon ring vertices.
    // Even rings have phase 0; odd rings are twisted by half a step.
    const rings = Array.from({ length: ringCount }, (_, ringIndex) => {
        const ringRadius = OUTER_POLYGON_RADIUS - ringIndex * POLYGON_RING_STEP;
        const phase      = (ringIndex % 2 === 0) ? 0 : halfStep;
        return Array.from({ length: edgeCount }, (_, vertexIndex) => {
            const angle = vertexIndex * angleStep + phase;
            return [200 + ringRadius * Math.sin(angle), 200 - ringRadius * Math.cos(angle)];
        });
    });

    // Draw rings from outermost inward: outline, then triangle connectors to next ring
    for (let ringIndex = 0; ringIndex < ringCount; ringIndex++) {
        const outlineColor = POLYGON_RING_COLORS[ringIndex * 2];
        const pointsStr    = rings[ringIndex].map(([x, y]) => `${x.toFixed(3)},${y.toFixed(3)}`).join(' ');
        out.push(`    <polygon points="${pointsStr}" fill="none" stroke="${outlineColor}" stroke-width="1" ${ROUND_CAP_ATTRS}/>`);

        if (ringIndex < ringCount - 1) {
            // Triangle connectors: each inner vertex fans out to its 2 nearest outer vertices.
            // Phase-0 → half-step: inner[vertexIndex] → outer[vertexIndex], outer[(vertexIndex+1)%edgeCount]
            // Half-step → phase-0: inner[vertexIndex] → outer[(vertexIndex-1+edgeCount)%edgeCount], outer[vertexIndex]
            const triangleColor = POLYGON_RING_COLORS[ringIndex * 2 + 1];
            const outerRing     = rings[ringIndex];
            const innerRing     = rings[ringIndex + 1];
            let trianglePathData = '';
            for (let vertexIndex = 0; vertexIndex < edgeCount; vertexIndex++) {
                const [innerX, innerY] = innerRing[vertexIndex];
                let outerAx, outerAy, outerBx, outerBy;
                if (ringIndex % 2 === 0) {
                    [outerAx, outerAy] = outerRing[vertexIndex];
                    [outerBx, outerBy] = outerRing[(vertexIndex + 1) % edgeCount];
                } else {
                    [outerAx, outerAy] = outerRing[(vertexIndex - 1 + edgeCount) % edgeCount];
                    [outerBx, outerBy] = outerRing[vertexIndex];
                }
                trianglePathData += `M${innerX.toFixed(3)},${innerY.toFixed(3)} L${outerAx.toFixed(3)},${outerAy.toFixed(3)} `;
                trianglePathData += `M${innerX.toFixed(3)},${innerY.toFixed(3)} L${outerBx.toFixed(3)},${outerBy.toFixed(3)} `;
            }
            out.push(`    <path d="${trianglePathData.trim()}" fill="none" stroke="${triangleColor}" stroke-width="1" ${ROUND_CAP_ATTRS}/>`);
        }
    }

    // Node circles at every polygon vertex
    const NODE_COLOR         = 'oklch(0.80 0.08 176)';
    const NODE_COLOR_TWINKLE = 'oklch(0.9466 0.0771 176)';
    const _nodeGlowId  = POLYGON_NODE_GLOW > 0 ? '#node_glow' : null;
    const _nodeFadeId  = POLYGON_NODE_FADE > 0 ? '#node_fade' : null;
    const nodeFilterAttr = (_nodeGlowId ?? _nodeFadeId) ? ` filter="url(${_nodeGlowId ?? _nodeFadeId})"` : '';
    const nodeFadeAttr   = (_nodeGlowId && _nodeFadeId) ? ` filter="url(${_nodeFadeId})"` : '';
    if (POLYGON_NODE_TWINKLE > 0) {
        const rng            = mulberry32(TWINKLE_SEED);
        const twinkleThreshold = POLYGON_NODE_TWINKLE / 100;
        const regularNodes   = [];
        const twinkleNodes   = [];
        for (const ring of rings) {
            for (const nodePoint of ring) {
                (rng() < twinkleThreshold ? twinkleNodes : regularNodes).push(nodePoint);
            }
        }
        const twinkleColor       = lerp_oklch(NODE_COLOR, NODE_COLOR_TWINKLE, POLYGON_NODE_TWINKLE_STRENGTH);
        const twinkleRadius      = lerp(POLYGON_NODE_RADIUS, POLYGON_NODE_TWINKLE_RADIUS, POLYGON_NODE_TWINKLE_STRENGTH);
        const twinkleGlowBlend   = lerp(POLYGON_NODE_GLOW, POLYGON_NODE_TWINKLE_GLOW, POLYGON_NODE_TWINKLE_STRENGTH);
        const twinkleFadeBlend   = lerp(POLYGON_NODE_FADE, POLYGON_NODE_TWINKLE_FADE, POLYGON_NODE_TWINKLE_STRENGTH);
        out.push(`    <g${nodeFilterAttr}>`);
        if (nodeFadeAttr) out.push(`      <g${nodeFadeAttr}>`);
        for (const [x, y] of regularNodes) {
            out.push(`      <circle cx="${x.toFixed(3)}" cy="${y.toFixed(3)}" r="${POLYGON_NODE_RADIUS}" fill="${NODE_COLOR}"/>`);
        }
        if (nodeFadeAttr) out.push(`      </g>`);
        out.push(`    </g>`);
        const _twinkleGlowId     = twinkleGlowBlend > 0 ? '#node_glow_twinkle' : null;
        const _nodeTwinkleFadeId = twinkleFadeBlend > 0 ? '#node_fade_twinkle' : null;
        const twinkleFilterAttr  = (_twinkleGlowId ?? _nodeTwinkleFadeId) ? ` filter="url(${_twinkleGlowId ?? _nodeTwinkleFadeId})"` : '';
        const twinkleFadeAttr    = (_twinkleGlowId && _nodeTwinkleFadeId) ? ` filter="url(${_nodeTwinkleFadeId})"` : '';
        out.push(`    <g${twinkleFilterAttr}>`);
        if (twinkleFadeAttr) out.push(`      <g${twinkleFadeAttr}>`);
        for (const [x, y] of twinkleNodes) {
            out.push(`      <circle cx="${x.toFixed(3)}" cy="${y.toFixed(3)}" r="${twinkleRadius.toFixed(3)}" fill="${twinkleColor}"/>`);
        }
        if (twinkleFadeAttr) out.push(`      </g>`);
        out.push(`    </g>`);
    } else {
        out.push(`    <g${nodeFilterAttr}>`);
        if (nodeFadeAttr) out.push(`      <g${nodeFadeAttr}>`);
        for (const ring of rings) {
            for (const [x, y] of ring) {
                out.push(`      <circle cx="${x.toFixed(3)}" cy="${y.toFixed(3)}" r="${POLYGON_NODE_RADIUS}" fill="${NODE_COLOR}"/>`);
            }
        }
        if (nodeFadeAttr) out.push(`      </g>`);
        out.push(`    </g>`);
    }
}
out.push(`  </g>`);

// Flower outer glow — blurred outer flower shape rendered behind the main flower
if (FLOWER_OUTER_GLOW_PX > 0) {
    const { baseRadius, lobeAmplitude, rotationSteps } = ELEM_LAYERS[0];
    const rotation  = BASE_ROTATION_OFFSET + rotationSteps * ROTATION_STEP;
    const outerPath = flower_path(200, 200, baseRadius, lobeAmplitude, LOBE_COUNT, rotation, 1000);
    const glowColor   = POLYGON_NODE_TWINKLE > 0
        ? lerp_oklch_alpha(FLOWER_OUTER_GLOW_COLOR, FLOWER_OUTER_GLOW_TWINKLE_COLOR, TWINKLE_STRENGTH)
        : FLOWER_OUTER_GLOW_COLOR;
    const glowOpacity = POLYGON_NODE_TWINKLE > 0
        ? lerp(FLOWER_OUTER_GLOW_OPACITY, FLOWER_OUTER_GLOW_TWINKLE_OPACITY, TWINKLE_STRENGTH)
        : FLOWER_OUTER_GLOW_OPACITY;
    out.push(`  <g clip-path="url(#circle_clip)" opacity="${glowOpacity.toFixed(4)}">`);
    out.push(`    <path d="${outerPath}" fill="${glowColor}" filter="url(#flower_outer_glow)"/>`);
    out.push(`  </g>`);
}

// Flower
// Inner layers (i > 0) use radial gradient fill — each layer fades smoothly across its ring.
out.push(`  <g clip-path="url(#circle_clip)" opacity="${FLOWER_OPACITY}">`);
ELEM_LAYERS.forEach(({ baseRadius, lobeAmplitude, color, rotationSteps }, layerIndex) => {
    const rotation = BASE_ROTATION_OFFSET + rotationSteps * ROTATION_STEP;
    const flowerPathData = flower_path(200, 200, baseRadius, lobeAmplitude, LOBE_COUNT, rotation, 1000);
    const cto       = ELEM_LAYERS.length - 1 - layerIndex;
    const layerFreq = FLOWER_TURBULENCE_FREQ_LIST[cto % FLOWER_TURBULENCE_FREQ_LIST.length];
    const layerHasFx = FLOWER_LAYER_BLUR > 0 || layerFreq > 0;
    let filterAttr = '';
    if (layerHasFx) {
        const filterId = FLOWER_TURBULENCE_ANY_ACTIVE ? `flower_layer_fx_${layerIndex}` : 'flower_layer_fx';
        filterAttr = ` filter="url(#${filterId})"`;
    }
    out.push(`    <path d="${flowerPathData}" fill="${apply_flower_color(color)}"${filterAttr}/>`);
});
out.push(`  </g>`);

// Flower inner glow — edge-to-center rim rendered over the flower
if (FLOWER_INNER_GLOW_PX > 0) {
    const { baseRadius, lobeAmplitude, rotationSteps } = ELEM_LAYERS[0];
    const rotation  = BASE_ROTATION_OFFSET + rotationSteps * ROTATION_STEP;
    const outerPath = flower_path(200, 200, baseRadius, lobeAmplitude, LOBE_COUNT, rotation, 1000);
    const glowColor   = POLYGON_NODE_TWINKLE > 0
        ? lerp_oklch_alpha(FLOWER_INNER_GLOW_COLOR, FLOWER_INNER_GLOW_TWINKLE_COLOR, TWINKLE_STRENGTH)
        : FLOWER_INNER_GLOW_COLOR;
    const glowOpacity = POLYGON_NODE_TWINKLE > 0
        ? lerp(FLOWER_INNER_GLOW_OPACITY, FLOWER_INNER_GLOW_TWINKLE_OPACITY, TWINKLE_STRENGTH)
        : FLOWER_INNER_GLOW_OPACITY;
    out.push(`  <g clip-path="url(#circle_clip)" opacity="${glowOpacity.toFixed(4)}">`);
    out.push(`    <path d="${outerPath}" fill="${glowColor}" filter="url(#flower_inner_glow)"/>`);
    out.push(`  </g>`);
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
    const lineHeight = measureLineHeight(TEXT_FONT, FONT_SIZE) * TEXT_LINE_HEIGHT;
    const lineWidths = lines.map(line => line.length === 0 ? 0 : measureTextWidth(line, TEXT_FONT, FONT_SIZE));
    const blockWidth = Math.max(...lineWidths);
    const textCenterX = SVG_SIZE / 2 + TEXT_OFFSET_X * SVG_SIZE;
    const textCenterY = SVG_SIZE / 2 - TEXT_OFFSET_Y * SVG_SIZE;
    const textStartX = (textCenterX - blockWidth / 2).toFixed(3);
    const tspans     = lines
        .map((line, lineIndex) => {
            const content  = line.length === 0 ? '&#160;' : line;
            const tspanY   = (textCenterY + (lineIndex - (lines.length - 1) / 2) * lineHeight).toFixed(3);
            return `      <tspan dominant-baseline="central" x="${textStartX}" y="${tspanY}">${content}</tspan>`;
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
    'lobe-count':                    LOBE_COUNT,
    'lobe-bumpiness':                LOBE_BUMPINESS_LIST.join(','),
    'lobe-gap-ratio':                LOBE_GAP_LIST.join(','),
    'lobe-gap-exponent':             LOBE_GAP_EXPONENT,
    'flower-size':                   FLOWER_SIZE,
    'flower-opacity':                FLOWER_OPACITY,
    'flower-lightness':              FLOWER_LIGHTNESS,
    'flower-chroma':                 FLOWER_CHROMA,
    'flower-layer-blur':             FLOWER_LAYER_BLUR,
    'flower-turbulence-freq':        FLOWER_TURBULENCE_FREQ_LIST.join(','),
    'flower-turbulence-scale':       FLOWER_TURBULENCE_SCALE_LIST.join(','),
    'flower-turbulence-octaves':     FLOWER_TURBULENCE_OCTAVES_LIST.join(','),
    'flower-turbulence-type':        FLOWER_TURBULENCE_TYPE_LIST.join(','),
    'flower-outer-glow':                  FLOWER_OUTER_GLOW,
    'flower-outer-glow-color':            FLOWER_OUTER_GLOW_COLOR,
    'flower-outer-glow-opacity':          FLOWER_OUTER_GLOW_OPACITY,
    'flower-outer-glow-twinkle':          FLOWER_OUTER_GLOW_TWINKLE,
    'flower-outer-glow-twinkle-color':    FLOWER_OUTER_GLOW_TWINKLE_COLOR,
    'flower-outer-glow-twinkle-opacity':  FLOWER_OUTER_GLOW_TWINKLE_OPACITY,
    'flower-inner-glow':                  FLOWER_INNER_GLOW,
    'flower-inner-glow-color':            FLOWER_INNER_GLOW_COLOR,
    'flower-inner-glow-opacity':          FLOWER_INNER_GLOW_OPACITY,
    'flower-inner-glow-twinkle':          FLOWER_INNER_GLOW_TWINKLE,
    'flower-inner-glow-twinkle-color':    FLOWER_INNER_GLOW_TWINKLE_COLOR,
    'flower-inner-glow-twinkle-opacity':  FLOWER_INNER_GLOW_TWINKLE_OPACITY,
    'outer-polygon-edges':           OUTER_POLYGON_EDGES,
    'outer-polygon-radius':          OUTER_POLYGON_RADIUS,
    'polygon-ring-step':             POLYGON_RING_STEP,
    'polygon-node-radius':           POLYGON_NODE_RADIUS,
    'polygon-node-glow':             POLYGON_NODE_GLOW,
    'polygon-node-fade':             POLYGON_NODE_FADE,
    'polygon-node-twinkle':          POLYGON_NODE_TWINKLE,
    'polygon-node-twinkle-radius':   POLYGON_NODE_TWINKLE_RADIUS,
    'polygon-node-twinkle-glow':     POLYGON_NODE_TWINKLE_GLOW,
    'polygon-node-twinkle-fade':     POLYGON_NODE_TWINKLE_FADE,
    'seed':                          INPUT_SEED,
    'flower-seed':                   FLOWER_SEED,
    'twinkle-strength':              TWINKLE_STRENGTH,
    'text':                          TEXT_STRING,
    'text-size':                     FONT_SIZE,
    'text-line-height':              TEXT_LINE_HEIGHT,
    'text-glow-distance':            TEXT_GLOW_DISTANCE,
    'text-glow-strength':            TEXT_GLOW_STRENGTH,
    'text-backing-spread':           TEXT_BACKING_SPREAD,
    'text-backing-dilate':           TEXT_BACKING_DILATE,
    'text-backing-opacity':          TEXT_BACKING_OPACITY,
    'text-font':                     TEXT_FONT,
    'text-offset-x':                 TEXT_OFFSET_X,
    'text-offset-y':                 TEXT_OFFSET_Y,
};
fs.writeFileSync(OUTPUT_PATH + '.json', JSON.stringify(_params, null, 2), 'utf8');

// Log flower geometry
console.log('Flower layers:');
ELEM_LAYERS.forEach(({ baseRadius, lobeAmplitude, radiusMin, radiusMax }, layerIndex) => {
    console.log(`  [${layerIndex}] baseRadius=${baseRadius.toFixed(1)}, lobeAmplitude=${lobeAmplitude.toFixed(2)}, r=${radiusMin.toFixed(1)}–${radiusMax.toFixed(1)}`);
});
console.log(`Done: ${OUTPUT_PATH}`);