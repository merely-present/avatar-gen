# Green-Blue Galaxy Presets

A cohesive dark-background avatar with green-to-blue galaxy waves, a pink-toned layered flower center, and a teal polygon ring structure.

## Preferred Seeds

| Seed        | Notes             |
|-------------|-------------------|
| 1982931710  | primary (default) |
| 1965056623  |                   |
| 221508023   |                   |
| 218926390   |                   |
| 3856532831  | flower seed       |

## Preset Files

### Single SVG — `single-svg-output.twinkle-strength-1.generate.json`

Full twinkle effect (strength 1). Glow and nodes shift toward green when twinkled.

```bash
npm run generate -- --json presets/green_blue_galaxy/single-svg-output.twinkle-strength-1.generate.json
```

### Single SVG — `single-svg-output.twinkle-strength-0.generate.json`

No twinkle interpolation; renders the base (non-twinkled) state.

```bash
npm run generate -- --json presets/green_blue_galaxy/single-svg-output.twinkle-strength-0.generate.json
```

### Single SVG (visible flower) — `single-svg-output.twinkle-strength-0.visible-flower.generate.json`

Layer blur and glow disabled so the petal structure is clearly visible (useful for tuning lobe/gap params).

```bash
npm run generate -- --json presets/green_blue_galaxy/single-svg-output.twinkle-strength-0.visible-flower.generate.json
```

### SVG → PNG/JPEG — `single-svg-and-converted-outputs.convert.json`

Edit `input-files` to point at the generated SVG, then run:

```bash
npm run convert -- --json presets/green_blue_galaxy/single-svg-and-converted-outputs.convert.json
```

### Animated GIF (small, quick) — `animated-gif-output.small-and-quick.animate.json`

800 px, 30 fps, 3 cycles, short twinkle timing (150/50/200/100 ms). Good for quick test renders.

```bash
npm run generate-animated -- --json presets/green_blue_galaxy/animated-gif-output.small-and-quick.animate.json
```

### Animated GIF (small) — `animated-gif-output.small.animate.json`

800 px, 30 fps, 3 cycles, standard timing (300/100/400/200 ms).

```bash
npm run generate-animated -- --json presets/green_blue_galaxy/animated-gif-output.small.animate.json
```

### Animated GIF (large) — `animated-gif-output.large.animate.json`

1600 px, 30 fps, 7 cycles, standard timing.

```bash
npm run generate-animated -- --json presets/green_blue_galaxy/animated-gif-output.large.animate.json
```

### Font Cycle — `font-cycle-output.generate.json`

Renders one SVG + PNG per font in `config/fonts.json`.

```bash
npm run generate-cycle-fonts -- --json presets/green_blue_galaxy/font-cycle-output.generate.json
```

## Schema

All `.generate.json` files validate against `schemas/generate.schema.json`.  
All `.animate.json` files validate against `schemas/animate.schema.json`.  
All `.convert.json` files validate against `schemas/convert.schema.json`.  

Re-generate schemas after editing `src/schemas.js`:

```bash
npm run generate-schemas
```
