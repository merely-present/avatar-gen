'use strict';
/**
 * Zod schemas for avatar-gen JSON configuration files.
 *
 * File-type suffixes (for VS Code schema association):
 *   *.generate.json       → GenerateConfigSchema
 *   *.animate.json        → AnimateConfigSchema
 *   *.convert.json        → ConvertConfigSchema
 */

const { z } = require('zod');

// ---------------------------------------------------------------------------
// Reusable primitives
// ---------------------------------------------------------------------------

/** Any CSS color string — oklch(...), #rrggbb, rgb(...), etc. */
const cssColorStr = z.string().min(1);

/**
 * A parameter that cycles per flower layer from center outward.
 * Can be a single value (applied uniformly) or an array (cycled).
 */
const numOrNumArray = z.union([z.number(), z.array(z.number())]);

const turbTypeEnum  = z.enum(['fractalNoise', 'turbulence']);
const turbTypeOrArr = z.union([turbTypeEnum, z.array(turbTypeEnum)]);

const waveEffectEnum = z.enum([
    'none', 'smear-down', 'motion-blur', 'ripple',
    'posterize', 'erode', 'dilate', 'gaussian',
]);

// ---------------------------------------------------------------------------
// GenerateConfigSchema  →  *.generate.json
// Used by: generate-avatar.js, generate-cycle-fonts.js
// ---------------------------------------------------------------------------
const GenerateConfigSchema = z.object({
    // ── Output ────────────────────────────────────────────────────────────
    'output':     z.string().optional()
        .describe('Output file path; relative to output-dir if given'),
    outputDir: z.string().optional()
        .describe('Output directory; timestamped filename if output omitted'),

    // ── Waves ─────────────────────────────────────────────────────────────
    waveFreqExpr:        z.string().default('8 - 6*x')
        .describe('JS expression where x=0(top)..1(bottom) → wave frequency'),
    waveCount:            z.number().int().min(1).default(16)
        .describe('Number of primary waves'),
    waveStartDegree:     z.number().default(0)
        .describe('Starting hue, degrees'),
    waveDistance:         z.number().default(360)
        .describe('Total hue sweep top→bottom, degrees; negative sweeps backward'),
    waveColorLoopCount: z.number().default(1)
        .describe('Multiplies hue sweep for denser colour cycling'),
    waveLightness:        z.number().min(0).max(1).default(0.7261)
        .describe('Wave colour oklch L'),
    waveChroma:           z.number().min(0).default(0.18)
        .describe('Wave colour oklch C'),
    waveAmplitude:        z.number().default(15)
        .describe('Wave amplitude, px'),
    shadowDarkness:       z.number().min(0).max(1).default(0.80)
        .describe('Shadow L multiplier 0–1'),
    waveEffect:           waveEffectEnum.default('smear-down')
        .describe('Wave rendering effect'),
    waveEffectStrength:  z.number().default(4),

    // ── Flower shape ──────────────────────────────────────────────────────
    lobeCount:      z.number().int().min(1).default(7)
        .describe('Number of flower lobes'),
    lobeBumpiness:  numOrNumArray.default(0.075)
        .describe('Lobe amplitude as fraction of flower radius, per layer center→outside (cycles)'),
    lobeGapRatio:  numOrNumArray.default(0.09)
        .describe('Gap between layers as fraction of flower radius, per gap center→outside (cycles)'),
    lobeGapExponent: z.number().default(1)
        .describe('Scales gap size by position: 1=uniform, >1=tunnel (inner gaps compressed)'),
    flowerSize:     z.number().min(0).default(0.15)
        .describe('Flower diameter as fraction of avatar diameter'),
    flowerOpacity:  z.number().min(0).max(1).default(1),
    flowerLightness: z.number().min(0).max(1).default(0.57)
        .describe('oklch L reference (scales all flower-colors L proportionally)'),
    flowerChroma:    z.number().min(0).default(0.10)
        .describe('oklch C reference (scales all flower-colors C proportionally)'),
    flowerLayerBlur: z.number().min(0).default(1.0)
        .describe('Fade distance (px) at each petal boundary — follows shape, no hard edges'),

    // ── Flower turbulence ─────────────────────────────────────────────────
    flowerTurbulenceFreq:    numOrNumArray.default(0.02)
        .describe('feTurbulence baseFrequency for organic edge wobble; 0 = disabled'),
    flowerTurbulenceScale:   numOrNumArray.default(10)
        .describe('feDisplacementMap scale for wobble amount'),
    flowerTurbulenceOctaves: numOrNumArray.default(1)
        .describe('feTurbulence numOctaves'),
    flowerTurbulenceType:    turbTypeOrArr.default('fractalNoise'),

    // ── Flower glow ───────────────────────────────────────────────────────
    flowerOuterGlow:                  z.number().min(0).default(0.05)
        .describe('Halo extending outward from flower edge, as fraction of flower diameter'),
    flowerOuterGlowColor:            cssColorStr.default('oklch(0.85 0.155 171 / 0.5)'),
    flowerOuterGlowOpacity:          z.number().min(0).max(1).default(0.25),
    flowerOuterGlowTwinkle:          z.number().min(0).default(0.15)
        .describe('Outer glow size twinkle, fraction of flower diameter'),
    flowerOuterGlowTwinkleColor:    cssColorStr.default('oklch(0.9 0.19 115.19)'),
    flowerOuterGlowTwinkleOpacity:  z.number().min(0).max(1).default(0.25),
    flowerInnerGlow:                  z.number().min(0).default(0.05)
        .describe('Rim extending inward from flower edge, as fraction of flower diameter'),
    flowerInnerGlowColor:            cssColorStr.default('oklch(0.85 0.155 171 / 0.5)'),
    flowerInnerGlowOpacity:          z.number().min(0).max(1).default(0.25),
    flowerInnerGlowTwinkle:          z.number().min(0).default(0.15),
    flowerInnerGlowTwinkleColor:    cssColorStr.default('oklch(0.9 0.19 115.19)'),
    flowerInnerGlowTwinkleOpacity:  z.number().min(0).max(1).default(0.25),

    // ── Colour palettes ───────────────────────────────────────────────────
    flowerColors: z.array(cssColorStr).optional()
        .describe('Flower layer colours outermost→innermost (oklch strings). Omit to use built-in default palette.'),
    polygonRingColors: z.array(cssColorStr).optional()
        .describe('Polygon ring colours; must be odd-length: even indices = outline strokes, odd indices = triangle connector strokes. Omit to use built-in default palette.'),

    // ── Outer polygon ring system ─────────────────────────────────────────
    outerPolygonEdges:       z.number().int().min(3).default(12),
    outerPolygonRadius:      z.number().default(190)
        .describe('Radius of outermost ring, px'),
    polygonRingStep:         z.number().default(22)
        .describe('Radial step between rings, px'),
    polygonNodeRadius:       z.number().min(0).default(2),
    polygonNodeGlow:         z.number().min(0).default(4)
        .describe('Node glow blur radius, px'),
    polygonNodeFade:         z.number().min(0).default(1)
        .describe('Node edge fade zone, px'),
    polygonNodeTwinkle:        z.number().min(0).max(100).default(10)
        .describe('% of nodes randomly lit brighter, 0–100'),
    polygonNodeTwinkleRadius: z.number().min(0).default(3),
    polygonNodeTwinkleGlow:   z.number().min(0).default(6),
    polygonNodeTwinkleFade:   z.number().min(0).default(2),
    twinkleStrength:            z.number().min(0).max(1).default(1)
        .describe('Blend strength for all twinkle effects: 0=identical 1=full twinkle'),
    'seed':        z.number().int().optional()
        .describe('RNG seed; omit for random'),
    flowerSeed: z.number().int().optional()
        .describe('Flower RNG seed; defaults to seed if omitted'),

    // ── Text ──────────────────────────────────────────────────────────────
    'text':               z.string().default('/^merely\npresent/')
        .describe('Text content; \\n for newlines'),
    textSize:          z.number().min(1).default(40)
        .describe('Font size px'),
    textLineHeight:   z.number().default(1.0)
        .describe('Line spacing multiplier (1.0 = font natural line height)'),
    textGlowDistance: z.number().min(0).default(4)
        .describe('Glow blur spread px'),
    textGlowStrength: z.number().default(1.0)
        .describe('Glow intensity 0–1+'),
    textBackingSpread:  z.number().min(0).default(5)
        .describe('Black backing shadow blur, px'),
    textBackingDilate:  z.number().min(0).default(3)
        .describe('Expand text before blurring, px'),
    textBackingOpacity: z.number().min(0).max(1).default(0.9),
    textFont:          z.string().default('DejaVu Sans Mono'),
    textOffsetX:      z.number().default(0)
        .describe('Horizontal offset, fraction of SVG size (positive = right)'),
    textOffsetY:      z.number().default(0)
        .describe('Vertical offset, fraction of SVG size (positive = up)'),
});

// ---------------------------------------------------------------------------
// AnimateConfigSchema  →  *.animate.json
// Used by: generate-animated-avatar.js
// Extends GenerateConfigSchema; replaces singular 'seed' with 'seeds' array.
// ---------------------------------------------------------------------------
const AnimateConfigSchema = GenerateConfigSchema
    .omit({ seed: true, output: true })  // animate drives these per-frame
    .extend({
        /** Per-cycle RNG seeds. Auto-generated from first seed if too few are given. */
        seeds: z.array(z.number().int()).optional()
            .describe('Per-cycle RNG seeds; auto-extended if fewer than twinkle-cycles'),

        fps: z.number().int().min(1).default(10),

        /**
         * Twinkle timing in ms.
         * - Single number N → one full cycle of duration N (rise = N/2, fall = N/2).
         * - Four-element array [rise, hold-high, fall, hold-low].
         */
        timePerTwinkleMs: z.union([
            z.number().int().positive(),
            z.tuple([
                z.number().describe('rise ms'),
                z.number().describe('hold-high ms'),
                z.number().describe('fall ms'),
                z.number().describe('hold-low ms'),
            ]),
        ]).default(1000),

        twinkleCycles: z.number().int().min(1).default(4)
            .describe('Number of unique seed cycles in the animation'),

        res: z.number().int().min(1).default(400)
            .describe('Output resolution, square px'),

        name: z.string().default('generated_animation')
            .describe('Base name for the output GIF file'),
    });

// ---------------------------------------------------------------------------
// ConvertConfigSchema  →  *.convert.json
// Used by: generate-conversion.js
// ---------------------------------------------------------------------------
const ConvertConfigSchema = z.object({
    inputFiles: z.array(z.string()).min(1)
        .describe('Input SVG file paths'),
    outputDir: z.string().optional()
        .describe('Parent directory for output sub-directories; defaults to same dir as each input'),
    textFont: z.string().optional()
        .describe('Override font family (auto-detected from SVG if omitted)'),
});

module.exports = {
    GenerateConfigSchema,
    AnimateConfigSchema,
    ConvertConfigSchema,
};
