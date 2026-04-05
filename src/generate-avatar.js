#!/usr/bin/env node
'use strict';

const fs   = require('fs');
const path = require('path');

const { loadAndValidateJson }  = require('./load-json.js');
const { GenerateConfigSchema } = require('./schemas.js');

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
        'Usage: npm run generate -- --json <path/to/preset.generate.json>\n' +
        '       node src/generate-avatar.js --json <path/to/preset.generate.json>\n' +
        '\n' +
        'All settings are provided through a JSON file validated against\n' +
        'schemas/generate.schema.json (JSON Schema 7, auto-generated).\n' +
        '\n' +
        'Key JSON fields:\n' +
        '  output / output-dir            Output file or directory\n' +
        '  seed / flower-seed             RNG seeds (integers; omit for random)\n' +
        '  wave-*, shadow-darkness        Wave appearance\n' +
        '  lobe-*, flower-*               Flower shape, turbulence, glow\n' +
        '  flower-colors                  Array of oklch strings (outermost→innermost)\n' +
        '  polygon-ring-colors            Array of oklch strings (outline/triangle alternating)\n' +
        '  outer-polygon-*, polygon-node-*, twinkle-strength   Outer ring / twinkle\n' +
        '  text, text-*                   Text content and styling\n' +
        '\n' +
        'Run `npm run generate-schemas` to (re-)generate schemas/generate.schema.json.\n' +
        '\n' +
        'Fonts — loaded from node_modules/@fontsource (edit config/fonts.json to manage):\n' +
        fontStatus() + '\n' +
        '\n' +
        '  Run `npm run pull-fonts` to install all fonts listed in config/fonts.json\n'
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

const config = loadAndValidateJson(jsonPath, GenerateConfigSchema);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/** Normalise number | number[] → number[]. */
function toArr(v) { return Array.isArray(v) ? v : [v]; }

function lerp(start, end, factor) { return start + (end - start) * factor; }

// ---------------------------------------------------------------------------
// Derive constants from config
// ---------------------------------------------------------------------------
const SVG_SIZE = 400;

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

const OUTPUT_PATH          = resolve_output_path(config['output'], config.outputDir);
const WAVE_FREQ_EXPR       = config.waveFreqExpr;
const NUM_WAVES            = config.waveCount;
const WAVE_START_DEG       = config.waveStartDegree;
const WAVE_DISTANCE        = config.waveDistance;
const WAVE_COLOR_LOOPS     = config.waveColorLoopCount;
const WAVE_L               = config.waveLightness;
const WAVE_C               = config.waveChroma;
const WAVE_AMPLITUDE       = config.waveAmplitude;
const SHADOW_DARKNESS      = config.shadowDarkness;
const WAVE_EFFECT          = config.waveEffect;
const WAVE_EFFECT_STRENGTH = config.waveEffectStrength;

const LOBE_COUNT          = config.lobeCount;
const LOBE_BUMPINESS_LIST = toArr(config.lobeBumpiness);
const LOBE_GAP_LIST       = toArr(config.lobeGapRatio);
const LOBE_GAP_EXPONENT   = config.lobeGapExponent;
const FLOWER_SIZE         = config.flowerSize;
const FLOWER_OPACITY      = config.flowerOpacity;
const FLOWER_LIGHTNESS    = config.flowerLightness;
const FLOWER_CHROMA       = config.flowerChroma;
const FLOWER_LAYER_BLUR   = config.flowerLayerBlur;

const FLOWER_TURBULENCE_FREQ_LIST    = toArr(config.flowerTurbulenceFreq);
const FLOWER_TURBULENCE_SCALE_LIST   = toArr(config.flowerTurbulenceScale);
const FLOWER_TURBULENCE_OCTAVES_LIST = toArr(config.flowerTurbulenceOctaves).map(v => Math.round(v));
const FLOWER_TURBULENCE_TYPE_LIST    = toArr(config.flowerTurbulenceType)
    .map(s => (s === 'turbulence' ? 'turbulence' : 'fractalNoise'));
const FLOWER_TURBULENCE_ANY_ACTIVE   = FLOWER_TURBULENCE_FREQ_LIST.some(f => f > 0);

const FLOWER_OUTER_GLOW         = config.flowerOuterGlow;
const FLOWER_OUTER_GLOW_COLOR   = config.flowerOuterGlowColor;
const FLOWER_OUTER_GLOW_OPACITY = config.flowerOuterGlowOpacity;
const FLOWER_OUTER_GLOW_TWINKLE = config.flowerOuterGlowTwinkle;
const FLOWER_OUTER_GLOW_TWINKLE_COLOR   = config.flowerOuterGlowTwinkleColor;
const FLOWER_OUTER_GLOW_TWINKLE_OPACITY = config.flowerOuterGlowTwinkleOpacity;
const FLOWER_INNER_GLOW         = config.flowerInnerGlow;
const FLOWER_INNER_GLOW_COLOR   = config.flowerInnerGlowColor;
const FLOWER_INNER_GLOW_OPACITY = config.flowerInnerGlowOpacity;
const FLOWER_INNER_GLOW_TWINKLE = config.flowerInnerGlowTwinkle;
const FLOWER_INNER_GLOW_TWINKLE_COLOR   = config.flowerInnerGlowTwinkleColor;
const FLOWER_INNER_GLOW_TWINKLE_OPACITY = config.flowerInnerGlowTwinkleOpacity;

const OUTER_POLYGON_EDGES  = config.outerPolygonEdges;
const OUTER_POLYGON_RADIUS = config.outerPolygonRadius;
const POLYGON_RING_STEP    = config.polygonRingStep;
const POLYGON_NODE_RADIUS         = config.polygonNodeRadius;
const POLYGON_NODE_GLOW           = config.polygonNodeGlow;
const POLYGON_NODE_FADE           = config.polygonNodeFade;
const POLYGON_NODE_TWINKLE        = config.polygonNodeTwinkle;
const POLYGON_NODE_TWINKLE_RADIUS = config.polygonNodeTwinkleRadius;
const POLYGON_NODE_TWINKLE_GLOW   = config.polygonNodeTwinkleGlow;
const POLYGON_NODE_TWINKLE_FADE   = config.polygonNodeTwinkleFade;
const TWINKLE_STRENGTH              = Math.max(0, Math.min(1, config.twinkleStrength));
const POLYGON_NODE_TWINKLE_STRENGTH = TWINKLE_STRENGTH;

const SEED_PROVIDED = config['seed'] !== undefined;
const INPUT_SEED    = SEED_PROVIDED
    ? config['seed']
    : Math.floor(Math.random() * 0x100000000);
const FLOWER_SEED   = config.flowerSeed !== undefined
    ? config.flowerSeed
    : INPUT_SEED;
const TWINKLE_SEED  = POLYGON_NODE_TWINKLE > 0 ? INPUT_SEED : 0;

const TEXT_STRING         = config['text'];
const FONT_SIZE           = config.textSize;
const TEXT_LINE_HEIGHT    = config.textLineHeight;
const TEXT_GLOW_DISTANCE  = config.textGlowDistance;
const TEXT_GLOW_STRENGTH  = config.textGlowStrength;
const TEXT_BACKING_SPREAD  = config.textBackingSpread;
const TEXT_BACKING_DILATE  = config.textBackingDilate;
const TEXT_BACKING_OPACITY = config.textBackingOpacity;
const TEXT_FONT            = config.textFont;
const TEXT_OFFSET_X        = config.textOffsetX;
const TEXT_OFFSET_Y        = config.textOffsetY;

const WAVE_POINTS = 1200;

const TEXT_COLOR  = 'oklch(0.7319 0.125 176.08)';
const MEDIUM_GREY = 'oklch(0.50 0 0)';

// Compile frequency expression once
const freq_fn = new Function('x', `return (${WAVE_FREQ_EXPR});`);

// ---------------------------------------------------------------------------
// Colour palettes — from JSON if provided, otherwise built-in defaults
// ---------------------------------------------------------------------------

// FLOWER_COLORS: concentric layers outermost→innermost.
// apply_flower_color() scales L and C proportionally via FLOWER_LIGHTNESS / FLOWER_CHROMA.
const DEFAULT_FLOWER_COLORS = [
    // outermost
    'oklch(0.66 0.115 322.40)',
    'oklch(0.62 0.127 328.59)',
    'oklch(0.59 0.132 335.72)',
    'oklch(0.50 0.136 343.83)',
    'oklch(0.41 0.136 344.98)',
    'oklch(0.34 0.133 345.95)',
    'oklch(0.31 0.130 346.75)',
    'oklch(0.26 0.115 347.25)',
    'oklch(0.22 0.100 348.00)',
    // innermost
];

// POLYGON_RING_COLORS: [outline, triangles, outline, triangles, ..., outline]
// Even indices = polygon outline strokes; odd indices = triangle connector strokes.
// Length must be odd. Number of polygon rings = (length + 1) / 2.
const DEFAULT_POLYGON_RING_COLORS = [
    'oklch(0.7319 0.10 176.08 / 0.15)', // outline 0 — outermost, terminal green
    'oklch(0.9 0.155 171    / 0.80)',    // triangles 0→1
    'oklch(0.7319 0.10 163  / 0.15)',    // outline 1
    'oklch(0.9 0.155 157    / 0.80)',    // triangles 1→2
    'oklch(0.7319 0.10 150  / 0.15)',    // outline 2
    'oklch(0.9 0.155 143    / 0.80)',    // triangles 2→3
    'oklch(0.7319 0.10 136  / 0.15)',    // outline 3
    'oklch(0.9 0.155 129    / 0.80)',    // triangles 3→4
    'oklch(0.7319 0.10 122  / 0.15)',    // outline 4
    'oklch(0.9 0.155 115.19 / 0.80)',    // triangles 4→5
    'oklch(0.7319 0.10 110  / 0.2)',     // outline 5
];

const FLOWER_COLORS       = config.flowerColors       ?? DEFAULT_FLOWER_COLORS;
const POLYGON_RING_COLORS = config.polygonRingColors ?? DEFAULT_POLYGON_RING_COLORS;

// ---------------------------------------------------------------------------
// Flower layer geometry
// ---------------------------------------------------------------------------
const FLOWER_OUTER_BASE_R   = (FLOWER_SIZE * SVG_SIZE) / 2;
const _outerGlowRatio = POLYGON_NODE_TWINKLE > 0
    ? lerp(FLOWER_OUTER_GLOW, FLOWER_OUTER_GLOW_TWINKLE, TWINKLE_STRENGTH)
    : FLOWER_OUTER_GLOW;
const FLOWER_OUTER_GLOW_PX  = _outerGlowRatio * FLOWER_OUTER_BASE_R * 2;
const _innerGlowRatio = POLYGON_NODE_TWINKLE > 0
    ? lerp(FLOWER_INNER_GLOW, FLOWER_INNER_GLOW_TWINKLE, TWINKLE_STRENGTH)
    : FLOWER_INNER_GLOW;
const FLOWER_INNER_GLOW_PX  = _innerGlowRatio * FLOWER_OUTER_BASE_R * 2;

const BASE_ROTATION_OFFSET = Math.PI / 2;
const ROTATION_STEP        = Math.PI / LOBE_COUNT;

function compute_flower_layers() {
    const layers = [];
    const layerCount = FLOWER_COLORS.length;
    let radiusMax = FLOWER_OUTER_BASE_R;
    for (let layerIndex = 0; layerIndex < layerCount; layerIndex++) {
        const centerToOuterIndex = layerCount - 1 - layerIndex;
        const lobeAmplitude      = LOBE_BUMPINESS_LIST[centerToOuterIndex % LOBE_BUMPINESS_LIST.length] * FLOWER_OUTER_BASE_R;
        const baseRadius         = radiusMax - lobeAmplitude;
        const radiusMin          = radiusMax - 2 * lobeAmplitude;
        layers.push({ baseRadius, lobeAmplitude, radiusMin, radiusMax, color: FLOWER_COLORS[layerIndex], rotationSteps: layerIndex });
        if (layerIndex < layerCount - 1) {
            const gapCto      = layerCount - 2 - layerIndex;
            const numGaps     = layerCount - 1;
            const expFactor   = LOBE_GAP_EXPONENT === 1 ? 1 : Math.pow((gapCto + 1) / numGaps, LOBE_GAP_EXPONENT - 1);
            const gapDistance = LOBE_GAP_LIST[gapCto % LOBE_GAP_LIST.length] * FLOWER_OUTER_BASE_R * expFactor;
            radiusMax = radiusMin - gapDistance;
        }
    }
    return layers;
}

const ELEM_LAYERS = compute_flower_layers();

// ---------------------------------------------------------------------------
// Path generators
// ---------------------------------------------------------------------------

function wave_pts(y_center, frequency, num_points, y_offset) {
    const xStart = -10;
    const xEnd   = SVG_SIZE + 10;
    const pointStrings = [];
    for (let pointIndex = 0; pointIndex <= num_points; pointIndex++) {
        const progress  = pointIndex / num_points;
        const x = xStart + progress * (xEnd - xStart);
        const wavePhase = (progress - 0.5) * frequency * 2 * Math.PI;
        const y = (y_center + (y_offset || 0)) + WAVE_AMPLITUDE * Math.cos(wavePhase);
        pointStrings.push(`${x.toFixed(2)},${y.toFixed(2)}`);
    }
    return pointStrings;
}

function shadow_fill_path(y_center, frequency, num_points) {
    const wavePoints = wave_pts(y_center, frequency, num_points, 0);
    const yBottom = SVG_SIZE + 20;
    const xStart  = -10;
    const xEnd    = SVG_SIZE + 10;
    return [
        `M${xStart},${yBottom}`,
        ...wavePoints.map(p => `L${p}`),
        `L${xEnd},${yBottom}`,
        'Z',
    ].join(' ');
}

const FLOWER_LIGHTNESS_REF = 0.57;
const FLOWER_CHROMA_REF    = 0.10;

function apply_flower_color(oklchStr) {
    const m = oklchStr.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
    if (!m) return oklchStr;
    const lightness = parseFloat(m[1]) * (FLOWER_LIGHTNESS / FLOWER_LIGHTNESS_REF);
    const chroma    = parseFloat(m[2]) * (FLOWER_CHROMA    / FLOWER_CHROMA_REF);
    return `oklch(${lightness.toFixed(4)} ${chroma.toFixed(4)} ${m[3]})`;
}

function flower_path(cx, cy, baseRadius, lobeAmplitude, numLobes, rotationRad, numPoints) {
    const pathCmds = [];
    for (let i = 0; i <= numPoints; i++) {
        const angle  = (i / numPoints) * 2 * Math.PI;
        const radius = baseRadius + lobeAmplitude * Math.cos(numLobes * (angle + rotationRad));
        const x = cx + radius * Math.cos(angle);
        const y = cy + radius * Math.sin(angle);
        pathCmds.push(i === 0 ? `M${x.toFixed(3)},${y.toFixed(3)}` : `L${x.toFixed(3)},${y.toFixed(3)}`);
    }
    return pathCmds.join(' ') + ' Z';
}

// ---------------------------------------------------------------------------
// Wave filter definition
// ---------------------------------------------------------------------------
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
            const mergeNodes = Array.from({length: n}, (_, i) => `        <feMergeNode in="d${i}"/>`).join('\n');
            return `    <filter id="wave_fx" x="-2%" y="-5%" width="104%" height="120%">
${layers}
      <feMerge>\n${mergeNodes}\n        <feMergeNode in="SourceGraphic"/>\n      </feMerge>
    </filter>`;
        }
        case 'ripple':
            return `    <filter id="wave_fx" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="${(0.02 * strength).toFixed(4)}" numOctaves="2" seed="7" result="noise"/>
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="${strength * 8}" xChannelSelector="R" yChannelSelector="G"/>
    </filter>`;
        case 'posterize': {
            const bandCount   = Math.max(2, Math.round(8 / strength));
            const tableValues = Array.from({length: bandCount + 1}, (_, i) => (i / bandCount).toFixed(3)).join(' ');
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

function lerp_oklch(c1, c2, t) {
    const m1 = c1.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
    const m2 = c2.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
    const L = lerp(parseFloat(m1[1]), parseFloat(m2[1]), t);
    const C = lerp(parseFloat(m1[2]), parseFloat(m2[2]), t);
    const H = lerp(parseFloat(m1[3]), parseFloat(m2[3]), t);
    return `oklch(${L.toFixed(4)} ${C.toFixed(4)} ${H.toFixed(2)})`;
}
function lerp_oklch_alpha(c1, c2, t) {
    const re = /oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)/;
    const m1 = c1.match(re);
    const m2 = c2.match(re);
    if (!m1 || !m2) return c1;
    const L     = lerp(parseFloat(m1[1]), parseFloat(m2[1]), t);
    const C     = lerp(parseFloat(m1[2]), parseFloat(m2[2]), t);
    const H     = lerp(parseFloat(m1[3]), parseFloat(m2[3]), t);
    const alpha = lerp(m1[4] !== undefined ? parseFloat(m1[4]) : 1,
                       m2[4] !== undefined ? parseFloat(m2[4]) : 1, t);
    const aStr = alpha < 0.9999 ? ` / ${alpha.toFixed(3)}` : '';
    return `oklch(${L.toFixed(4)} ${C.toFixed(4)} ${H.toFixed(2)}${aStr})`;
}

// ---------------------------------------------------------------------------
// Font measurement helpers
// ---------------------------------------------------------------------------
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
    return path.join(filesDir,
        matching.find(f => f.includes('-500-normal'))
        ?? matching.find(f => f.includes('-400-normal'))
        ?? matching[0]);
}

function measureTextWidth(text, fontFamily, fontSize) {
    const fontPath = findFontFile(fontFamily);
    if (!fontPath) throw new Error(`Font '${fontFamily}' not found in node_modules/@fontsource. Run \`npm run pull-fonts\`.`);
    const fontkit = require('fontkit');
    const font = fontkit.openSync(fontPath);
    return font.layout(text).advanceWidth / font.unitsPerEm * fontSize;
}

function measureLineHeight(fontFamily, fontSize) {
    const fontPath = findFontFile(fontFamily);
    if (!fontPath) throw new Error(`Font '${fontFamily}' not found in node_modules/@fontsource. Run \`npm run pull-fonts\`.`);
    const fontkit = require('fontkit');
    const font = fontkit.openSync(fontPath);
    return (font.ascent - font.descent + font.lineGap) / font.unitsPerEm * fontSize;
}

// Seeded PRNG (mulberry32) for deterministic twinkle node selection.
function mulberry32(seed) {
    return function() {
        seed |= 0; seed = seed + 0x6D2B79F5 | 0;
        let h = Math.imul(seed ^ seed >>> 15, 1 | seed);
        h = h + Math.imul(h ^ h >>> 7, 61 | h) ^ h;
        return ((h ^ h >>> 14) >>> 0) / 4294967296;
    };
}

// ---------------------------------------------------------------------------
// Build SVG
// ---------------------------------------------------------------------------
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

if (TEXT_BACKING_SPREAD > 0) out.push(`    <filter id="text_backing" x="-40%" y="-120%" width="180%" height="340%">
      <feMorphology operator="dilate" radius="${TEXT_BACKING_DILATE}" result="fat"/>
      <feFlood flood-color="black" flood-opacity="1" result="black"/>
      <feComposite in="black" in2="fat" operator="in" result="solid"/>
      <feGaussianBlur in="solid" stdDeviation="${TEXT_BACKING_SPREAD}"/>
    </filter>`);

if (FLOWER_LAYER_BLUR > 0 && !FLOWER_TURBULENCE_ANY_ACTIVE) {
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
            primitives += `\n      <feMorphology in="SourceAlpha" operator="erode" radius="${(FLOWER_LAYER_BLUR * 0.5).toFixed(2)}" result="core"/>\n      <feGaussianBlur in="core" stdDeviation="${(FLOWER_LAYER_BLUR * 0.5).toFixed(2)}" result="soft_alpha"/>\n      <feComposite in="SourceGraphic" in2="soft_alpha" operator="in" result="faded"/>`;
        }
        if (hasTurb) {
            const fadeOut = FLOWER_LAYER_BLUR > 0 ? 'faded' : 'SourceGraphic';
            primitives += `\n      <feTurbulence type="${type}" baseFrequency="${freq}" numOctaves="${octaves}" seed="${FLOWER_SEED % 65536}" result="noise"/>\n      <feDisplacementMap in="${fadeOut}" in2="noise" scale="${scale}" xChannelSelector="R" yChannelSelector="G"/>`;
        }
        out.push(`    <filter id="flower_layer_fx_${i}" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB" x="${(200 - filterHalfSize).toFixed(0)}" y="${(200 - filterHalfSize).toFixed(0)}" width="${(filterHalfSize * 2).toFixed(0)}" height="${(filterHalfSize * 2).toFixed(0)}">${primitives}\n    </filter>`);
    });
}

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

if (FLOWER_INNER_GLOW_PX > 0) {
    const erodeRadius    = (FLOWER_INNER_GLOW_PX * 0.5).toFixed(2);
    const blurSigma      = (FLOWER_INNER_GLOW_PX * 0.5).toFixed(2);
    const outerCto       = ELEM_LAYERS.length - 1;
    const outerTurbFreq  = FLOWER_TURBULENCE_FREQ_LIST[outerCto % FLOWER_TURBULENCE_FREQ_LIST.length];
    const hasTurb        = FLOWER_TURBULENCE_ANY_ACTIVE && outerTurbFreq > 0;
    const turbScale      = hasTurb ? FLOWER_TURBULENCE_SCALE_LIST[outerCto % FLOWER_TURBULENCE_SCALE_LIST.length] : 0;
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
    const pad      = POLYGON_NODE_GLOW * 5;
    const half     = OUTER_POLYGON_RADIUS + pad;
    out.push(`    <filter id="node_glow" filterUnits="userSpaceOnUse" x="${(200 - half).toFixed(1)}" y="${(200 - half).toFixed(1)}" width="${(half * 2).toFixed(1)}" height="${(half * 2).toFixed(1)}">
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
        const pad  = twinkleGlow * 5;
        const half = OUTER_POLYGON_RADIUS + pad;
        out.push(`    <filter id="node_glow_twinkle" filterUnits="userSpaceOnUse" x="${(200 - half).toFixed(1)}" y="${(200 - half).toFixed(1)}" width="${(half * 2).toFixed(1)}" height="${(half * 2).toFixed(1)}">
      <feMorphology operator="dilate" radius="${twinkleDilate.toFixed(2)}" result="fat"/>
      <feFlood flood-color="white" flood-opacity="1" result="white"/>
      <feComposite in="white" in2="fat" operator="in" result="solid"/>
      <feGaussianBlur in="solid" stdDeviation="${twinkleGlow.toFixed(3)}" result="glow"/>
      <feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>`);
    }
    const twinkleFade = lerp(POLYGON_NODE_FADE, POLYGON_NODE_TWINKLE_FADE, POLYGON_NODE_TWINKLE_STRENGTH);
    if (twinkleFade > 0) {
        const half = OUTER_POLYGON_RADIUS + POLYGON_NODE_RADIUS + Math.ceil(twinkleFade);
        out.push(`    <filter id="node_fade_twinkle" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB" x="${(200 - half).toFixed(1)}" y="${(200 - half).toFixed(1)}" width="${(half * 2).toFixed(1)}" height="${(half * 2).toFixed(1)}">
      <feMorphology in="SourceAlpha" operator="erode" radius="${(twinkleFade * 0.5).toFixed(2)}" result="core"/>
      <feGaussianBlur in="core" stdDeviation="${(twinkleFade * 0.5).toFixed(2)}" result="soft_alpha"/>
      <feComposite in="SourceGraphic" in2="soft_alpha" operator="in"/>
    </filter>`);
    }
}
if (POLYGON_NODE_FADE > 0) {
    const half = OUTER_POLYGON_RADIUS + POLYGON_NODE_RADIUS + Math.ceil(POLYGON_NODE_FADE);
    out.push(`    <filter id="node_fade" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB" x="${(200 - half).toFixed(1)}" y="${(200 - half).toFixed(1)}" width="${(half * 2).toFixed(1)}" height="${(half * 2).toFixed(1)}">
      <feMorphology in="SourceAlpha" operator="erode" radius="${(POLYGON_NODE_FADE * 0.5).toFixed(2)}" result="core"/>
      <feGaussianBlur in="core" stdDeviation="${(POLYGON_NODE_FADE * 0.5).toFixed(2)}" result="soft_alpha"/>
      <feComposite in="SourceGraphic" in2="soft_alpha" operator="in"/>
    </filter>`);
}

out.push(`  </defs>`);
out.push(`  <circle cx="${SVG_SIZE/2}" cy="${SVG_SIZE/2}" r="${SVG_SIZE/2}" fill="url(#bg_gradient)"/>`);

// Waves
out.push(`  <g clip-path="url(#circle_clip)">`);
out.push(wave_filter ? `  <g filter="url(#wave_fx)">` : `  <g>`);

const ALL_WAVES = [];
{
    const pre = -1 / (NUM_WAVES - 1);
    ALL_WAVES.push({
        y_center:  -0.5 * (SVG_SIZE / NUM_WAVES),
        frequency: freq_fn(Math.max(0, pre)),
        hue_deg:   WAVE_START_DEG + pre * WAVE_DISTANCE * WAVE_COLOR_LOOPS,
    });
}
for (let waveIndex = 0; waveIndex < NUM_WAVES; waveIndex++) {
    const pos = waveIndex / (NUM_WAVES - 1);
    ALL_WAVES.push({
        y_center:  (waveIndex + 0.5) * (SVG_SIZE / NUM_WAVES),
        frequency: freq_fn(pos),
        hue_deg:   WAVE_START_DEG + pos * WAVE_DISTANCE * WAVE_COLOR_LOOPS,
    });
}
for (const { y_center, frequency, hue_deg } of ALL_WAVES) {
    out.push(`    <path d="${shadow_fill_path(y_center, frequency, WAVE_POINTS)}" fill="oklch(${WAVE_L} ${WAVE_C} ${hue_deg.toFixed(2)})"/>`);
}
out.push(`  </g>`);
out.push(`  </g>`);

// Outer polygon ring system
out.push(`  <g clip-path="url(#circle_clip)">`);
{
    const edgeCount   = OUTER_POLYGON_EDGES;
    const angleStep   = (2 * Math.PI) / edgeCount;
    const halfStep    = angleStep / 2;
    const RC          = 'stroke-linecap="round"';
    const ringCount   = (POLYGON_RING_COLORS.length + 1) / 2;

    const rings = Array.from({ length: ringCount }, (_, ri) => {
        const r     = OUTER_POLYGON_RADIUS - ri * POLYGON_RING_STEP;
        const phase = (ri % 2 === 0) ? 0 : halfStep;
        return Array.from({ length: edgeCount }, (_, vi) => {
            const a = vi * angleStep + phase;
            return [200 + r * Math.sin(a), 200 - r * Math.cos(a)];
        });
    });

    for (let ri = 0; ri < ringCount; ri++) {
        const outlineColor = POLYGON_RING_COLORS[ri * 2];
        out.push(`    <polygon points="${rings[ri].map(([x, y]) => `${x.toFixed(3)},${y.toFixed(3)}`).join(' ')}" fill="none" stroke="${outlineColor}" stroke-width="1" ${RC}/>`);

        if (ri < ringCount - 1) {
            const triangleColor = POLYGON_RING_COLORS[ri * 2 + 1];
            const outer = rings[ri];
            const inner = rings[ri + 1];
            let d = '';
            for (let vi = 0; vi < edgeCount; vi++) {
                const [ix, iy] = inner[vi];
                let ax, ay, bx, by;
                if (ri % 2 === 0) {
                    [ax, ay] = outer[vi];
                    [bx, by] = outer[(vi + 1) % edgeCount];
                } else {
                    [ax, ay] = outer[(vi - 1 + edgeCount) % edgeCount];
                    [bx, by] = outer[vi];
                }
                d += `M${ix.toFixed(3)},${iy.toFixed(3)} L${ax.toFixed(3)},${ay.toFixed(3)} `;
                d += `M${ix.toFixed(3)},${iy.toFixed(3)} L${bx.toFixed(3)},${by.toFixed(3)} `;
            }
            out.push(`    <path d="${d.trim()}" fill="none" stroke="${triangleColor}" stroke-width="1" ${RC}/>`);
        }
    }

    const NODE_COLOR         = 'oklch(0.80 0.08 176)';
    const NODE_COLOR_TWINKLE = 'oklch(0.9466 0.0771 176)';
    const _nodeGlowId  = POLYGON_NODE_GLOW > 0 ? '#node_glow' : null;
    const _nodeFadeId  = POLYGON_NODE_FADE > 0 ? '#node_fade' : null;
    const nodeFilterAttr = (_nodeGlowId ?? _nodeFadeId) ? ` filter="url(${_nodeGlowId ?? _nodeFadeId})"` : '';
    const nodeFadeAttr   = (_nodeGlowId && _nodeFadeId) ? ` filter="url(${_nodeFadeId})"` : '';

    if (POLYGON_NODE_TWINKLE > 0) {
        const rng              = mulberry32(TWINKLE_SEED);
        const threshold        = POLYGON_NODE_TWINKLE / 100;
        const regularNodes     = [];
        const twinkleNodes     = [];
        for (const ring of rings) for (const pt of ring)
            (rng() < threshold ? twinkleNodes : regularNodes).push(pt);

        const twinkleColor     = lerp_oklch(NODE_COLOR, NODE_COLOR_TWINKLE, POLYGON_NODE_TWINKLE_STRENGTH);
        const twinkleRadius    = lerp(POLYGON_NODE_RADIUS, POLYGON_NODE_TWINKLE_RADIUS, POLYGON_NODE_TWINKLE_STRENGTH);
        const twinkleGlowBlend = lerp(POLYGON_NODE_GLOW, POLYGON_NODE_TWINKLE_GLOW, POLYGON_NODE_TWINKLE_STRENGTH);
        const twinkleFadeBlend = lerp(POLYGON_NODE_FADE, POLYGON_NODE_TWINKLE_FADE, POLYGON_NODE_TWINKLE_STRENGTH);

        out.push(`    <g${nodeFilterAttr}>`);
        if (nodeFadeAttr) out.push(`      <g${nodeFadeAttr}>`);
        for (const [x, y] of regularNodes)
            out.push(`      <circle cx="${x.toFixed(3)}" cy="${y.toFixed(3)}" r="${POLYGON_NODE_RADIUS}" fill="${NODE_COLOR}"/>`);
        if (nodeFadeAttr) out.push(`      </g>`);
        out.push(`    </g>`);

        const _tGlowId   = twinkleGlowBlend > 0 ? '#node_glow_twinkle' : null;
        const _tFadeId   = twinkleFadeBlend > 0 ? '#node_fade_twinkle' : null;
        const tFilterAttr = (_tGlowId ?? _tFadeId) ? ` filter="url(${_tGlowId ?? _tFadeId})"` : '';
        const tFadeAttr   = (_tGlowId && _tFadeId) ? ` filter="url(${_tFadeId})"` : '';
        out.push(`    <g${tFilterAttr}>`);
        if (tFadeAttr) out.push(`      <g${tFadeAttr}>`);
        for (const [x, y] of twinkleNodes)
            out.push(`      <circle cx="${x.toFixed(3)}" cy="${y.toFixed(3)}" r="${twinkleRadius.toFixed(3)}" fill="${twinkleColor}"/>`);
        if (tFadeAttr) out.push(`      </g>`);
        out.push(`    </g>`);
    } else {
        out.push(`    <g${nodeFilterAttr}>`);
        if (nodeFadeAttr) out.push(`      <g${nodeFadeAttr}>`);
        for (const ring of rings) for (const [x, y] of ring)
            out.push(`      <circle cx="${x.toFixed(3)}" cy="${y.toFixed(3)}" r="${POLYGON_NODE_RADIUS}" fill="${NODE_COLOR}"/>`);
        if (nodeFadeAttr) out.push(`      </g>`);
        out.push(`    </g>`);
    }
}
out.push(`  </g>`);

// Flower outer glow
if (FLOWER_OUTER_GLOW_PX > 0) {
    const { baseRadius, lobeAmplitude, rotationSteps } = ELEM_LAYERS[0];
    const outerPath   = flower_path(200, 200, baseRadius, lobeAmplitude, LOBE_COUNT, BASE_ROTATION_OFFSET + rotationSteps * ROTATION_STEP, 1000);
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

// Flower layers
out.push(`  <g clip-path="url(#circle_clip)" opacity="${FLOWER_OPACITY}">`);
ELEM_LAYERS.forEach(({ baseRadius, lobeAmplitude, color, rotationSteps }, li) => {
    const cto        = ELEM_LAYERS.length - 1 - li;
    const layerFreq  = FLOWER_TURBULENCE_FREQ_LIST[cto % FLOWER_TURBULENCE_FREQ_LIST.length];
    const layerHasFx = FLOWER_LAYER_BLUR > 0 || layerFreq > 0;
    const filterAttr = layerHasFx
        ? ` filter="url(#${FLOWER_TURBULENCE_ANY_ACTIVE ? `flower_layer_fx_${li}` : 'flower_layer_fx'})"`
        : '';
    out.push(`    <path d="${flower_path(200, 200, baseRadius, lobeAmplitude, LOBE_COUNT, BASE_ROTATION_OFFSET + rotationSteps * ROTATION_STEP, 1000)}" fill="${apply_flower_color(color)}"${filterAttr}/>`);
});
out.push(`  </g>`);

// Flower inner glow
if (FLOWER_INNER_GLOW_PX > 0) {
    const { baseRadius, lobeAmplitude, rotationSteps } = ELEM_LAYERS[0];
    const outerPath   = flower_path(200, 200, baseRadius, lobeAmplitude, LOBE_COUNT, BASE_ROTATION_OFFSET + rotationSteps * ROTATION_STEP, 1000);
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

// Text
{
    const lines      = TEXT_STRING.split('\n');
    const lineHeight = measureLineHeight(TEXT_FONT, FONT_SIZE) * TEXT_LINE_HEIGHT;
    const lineWidths = lines.map(line => line.length === 0 ? 0 : measureTextWidth(line, TEXT_FONT, FONT_SIZE));
    const blockWidth = Math.max(...lineWidths);
    const textCenterX = SVG_SIZE / 2 + TEXT_OFFSET_X * SVG_SIZE;
    const textCenterY = SVG_SIZE / 2 - TEXT_OFFSET_Y * SVG_SIZE;
    const textStartX  = (textCenterX - blockWidth / 2).toFixed(3);
    const tspans      = lines.map((line, li) => {
        const content = line.length === 0 ? '&#160;' : line;
        const y       = (textCenterY + (li - (lines.length - 1) / 2) * lineHeight).toFixed(3);
        return `      <tspan dominant-baseline="central" x="${textStartX}" y="${y}">${content}</tspan>`;
    }).join('\n');
    const textAttrs = `dominant-baseline="central" text-anchor="start" font-family="'${TEXT_FONT}'" font-size="${FONT_SIZE}" font-weight="500" style="font-variant-ligatures:none"`;

    if (TEXT_BACKING_SPREAD > 0) {
        out.push(`  <g filter="url(#text_backing)" opacity="${TEXT_BACKING_OPACITY}" clip-path="url(#circle_clip)">`);
        out.push(`    <text ${textAttrs} fill="black">\n${tspans}\n    </text>`);
        out.push(`  </g>`);
    }
    out.push(`  <g filter="url(#terminal_glow)" clip-path="url(#circle_clip)">`);
    out.push(`    <text ${textAttrs} fill="${TEXT_COLOR}">\n${tspans}\n    </text>`);
    out.push(`  </g>`);
}

out.push(`</svg>`);

// ---------------------------------------------------------------------------
// Write output
// ---------------------------------------------------------------------------
if (config.outputDir) {
    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
}
fs.writeFileSync(OUTPUT_PATH, out.join('\n'), 'utf8');

const _params = {
    waveFreqExpr: WAVE_FREQ_EXPR, waveCount: NUM_WAVES, waveStartDegree: WAVE_START_DEG,
    waveDistance: WAVE_DISTANCE, waveColorLoopCount: WAVE_COLOR_LOOPS,
    waveLightness: WAVE_L, waveChroma: WAVE_C, waveAmplitude: WAVE_AMPLITUDE,
    shadowDarkness: SHADOW_DARKNESS, waveEffect: WAVE_EFFECT, waveEffectStrength: WAVE_EFFECT_STRENGTH,
    lobeCount: LOBE_COUNT, lobeBumpiness: LOBE_BUMPINESS_LIST, lobeGapRatio: LOBE_GAP_LIST,
    lobeGapExponent: LOBE_GAP_EXPONENT, flowerSize: FLOWER_SIZE, flowerOpacity: FLOWER_OPACITY,
    flowerLightness: FLOWER_LIGHTNESS, flowerChroma: FLOWER_CHROMA, flowerLayerBlur: FLOWER_LAYER_BLUR,
    flowerTurbulenceFreq: FLOWER_TURBULENCE_FREQ_LIST, flowerTurbulenceScale: FLOWER_TURBULENCE_SCALE_LIST,
    flowerTurbulenceOctaves: FLOWER_TURBULENCE_OCTAVES_LIST, flowerTurbulenceType: FLOWER_TURBULENCE_TYPE_LIST,
    flowerOuterGlow: FLOWER_OUTER_GLOW, flowerOuterGlowColor: FLOWER_OUTER_GLOW_COLOR,
    flowerOuterGlowOpacity: FLOWER_OUTER_GLOW_OPACITY, flowerOuterGlowTwinkle: FLOWER_OUTER_GLOW_TWINKLE,
    flowerOuterGlowTwinkleColor: FLOWER_OUTER_GLOW_TWINKLE_COLOR,
    flowerOuterGlowTwinkleOpacity: FLOWER_OUTER_GLOW_TWINKLE_OPACITY,
    flowerInnerGlow: FLOWER_INNER_GLOW, flowerInnerGlowColor: FLOWER_INNER_GLOW_COLOR,
    flowerInnerGlowOpacity: FLOWER_INNER_GLOW_OPACITY, flowerInnerGlowTwinkle: FLOWER_INNER_GLOW_TWINKLE,
    flowerInnerGlowTwinkleColor: FLOWER_INNER_GLOW_TWINKLE_COLOR,
    flowerInnerGlowTwinkleOpacity: FLOWER_INNER_GLOW_TWINKLE_OPACITY,
    flowerColors: FLOWER_COLORS, polygonRingColors: POLYGON_RING_COLORS,
    outerPolygonEdges: OUTER_POLYGON_EDGES, outerPolygonRadius: OUTER_POLYGON_RADIUS,
    polygonRingStep: POLYGON_RING_STEP, polygonNodeRadius: POLYGON_NODE_RADIUS,
    polygonNodeGlow: POLYGON_NODE_GLOW, polygonNodeFade: POLYGON_NODE_FADE,
    polygonNodeTwinkle: POLYGON_NODE_TWINKLE, polygonNodeTwinkleRadius: POLYGON_NODE_TWINKLE_RADIUS,
    polygonNodeTwinkleGlow: POLYGON_NODE_TWINKLE_GLOW, polygonNodeTwinkleFade: POLYGON_NODE_TWINKLE_FADE,
    'seed': INPUT_SEED, flowerSeed: FLOWER_SEED, twinkleStrength: TWINKLE_STRENGTH,
    'text': TEXT_STRING, textSize: FONT_SIZE, textLineHeight: TEXT_LINE_HEIGHT,
    textGlowDistance: TEXT_GLOW_DISTANCE, textGlowStrength: TEXT_GLOW_STRENGTH,
    textBackingSpread: TEXT_BACKING_SPREAD, textBackingDilate: TEXT_BACKING_DILATE,
    textBackingOpacity: TEXT_BACKING_OPACITY, textFont: TEXT_FONT,
    textOffsetX: TEXT_OFFSET_X, textOffsetY: TEXT_OFFSET_Y,
};
fs.writeFileSync(OUTPUT_PATH + '.generate.json', JSON.stringify(_params, null, 2), 'utf8');

console.log('Flower layers:');
ELEM_LAYERS.forEach(({ baseRadius, lobeAmplitude, radiusMin, radiusMax }, i) => {
    console.log(`  [${i}] baseRadius=${baseRadius.toFixed(1)}, lobeAmplitude=${lobeAmplitude.toFixed(2)}, r=${radiusMin.toFixed(1)}–${radiusMax.toFixed(1)}`);
});
console.log(`Done: ${OUTPUT_PATH}`);
