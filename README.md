# avatar-gen

Vibe-coded slop for generating variations of my GitHub profile picture. Tweaked until I didn't like it anymore so I've stopped. Got a bit out of hand.

Generates layered SVGs with animated color waves, an organic multi-petal flower, and a polygon node ring. Can export to PNG/JPEG and assemble animated GIFs.

## Requirements

- Node.js (developed on v25)
- `npm install`
- For PNG/JPEG export: Chromium (set `CHROMIUM_EXEC` env var or have it on `PATH`)
- For GIF assembly: ImageMagick (`convert` / `magick`)

## Quick start

```bash
npm install
npm run pull-fonts       # install @fontsource packages listed in config/fonts.json

# Generate a single SVG and open it
npm run generate -- --output-dir ./output_images --seed 1982931710

# Generate and convert to PNG/JPEG
npm run generate -- --output-dir ./output_images --seed 1982931710 \
  | tail -n 1 | sed 's|.* ||' \
  | xargs -I {} -- npm run convert -- --input-file {} --output-dir ./output_images

# Generate an animated GIF
npm run generate-animated -- --output-dir ./output_images --seeds 1982931710 \
  --fps 30 --time-per-twinkle-ms 300,100,400,200 --twinkle-cycles 3 --res 800
```

See `settings_used/green-blue-galaxy.md` for fully-tuned example commands.

## Commands

### `npm run generate`

Generates a single SVG avatar. Prints the output path as the last line of stdout.

```
npm run generate -- --help
```

Key option groups:

| Group | Notable flags |
|---|---|
| **Waves** | `--wave-count`, `--wave-start-degree`, `--wave-distance`, `--wave-lightness`, `--wave-chroma`, `--wave-effect` |
| **Flower** | `--flower-size`, `--lobe-count`, `--lobe-bumpiness`, `--lobe-gap-ratio`, `--lobe-gap-exponent`, `--flower-turbulence-freq`, `--flower-turbulence-scale` |
| **Flower glow** | `--flower-outer-glow`, `--flower-inner-glow`, `--flower-outer-glow-twinkle`, `--flower-inner-glow-twinkle` |
| **Polygon ring** | `--outer-polygon-edges`, `--outer-polygon-radius`, `--polygon-ring-step`, `--polygon-node-twinkle` |
| **Text** | `--text`, `--text-font`, `--text-size`, `--text-offset-x`, `--text-offset-y` |
| **Seeds** | `--seed` (polygon/twinkle RNG), `--flower-seed` (turbulence shape, independent) |

`--wave-distance` accepts negative values — use `--wave-distance=-135` (equals sign) to avoid shell/parseArgs ambiguity.

### `npm run generate-animated`

Renders one SVG frame per animation step, then calls ImageMagick to assemble a GIF. Animation-specific flags:

| Flag | Default | Description |
|---|---|---|
| `--seeds` | auto | Comma-separated per-cycle RNG seeds |
| `--flower-seed` | `seeds[0]` | Fixed turbulence seed (held constant across all cycles so flower shape doesn't jump) |
| `--fps` | 10 | Frames per second |
| `--time-per-twinkle-ms` | 1000 | Single value (even rise/fall) or four values: `rise,hold-high,fall,hold-low` |
| `--twinkle-cycles` | 4 | Number of unique seed cycles to render |
| `--res` | 400 | Output resolution in px (square) |
| `--name` | `generated_animation` | Base name for output file |

All other flags are forwarded to `generate_avatar.js`.

### `npm run convert`

Converts SVG(s) to PNG (transparent) and JPEG (white background) at multiple resolutions using Puppeteer/Chromium. Handles `oklch()` colors and embedded `@fontsource` fonts correctly (browser-native rendering).

```
npm run convert -- --input-file ./output_images/my-avatar.svg --output-dir ./output_images
```

Output resolutions: 200, 400, 600, 800, 1000, 1080, 1200, 1600, 2000, 4000 px.

### `npm run generate-cycle-fonts`

Renders one avatar per font in `config/fonts.json`, all other params identical, for easy font comparison. Output goes to a timestamped directory.

### `npm run pull-fonts`

Installs the `@fontsource` packages listed in `config/fonts.json` as optional dependencies. Already-installed fonts are skipped.

## Configuration

### `config/fonts.json`

Array of `{ "name": "...", "package": "@fontsource/..." }` entries. Edit this to add or remove fonts available to `--text-font` and `generate-cycle-fonts`.

## Project layout

```
src/
  generate_avatar.js          Core SVG generator
  generate_animated_avatar.js Animation orchestrator → GIF
  generate_conversion.mjs     SVG → PNG/JPEG via Puppeteer
  generate_cycle_fonts.js     Per-font batch renderer
  pull_fonts.js               @fontsource installer
config/
  fonts.json                  Font registry
settings_used/
  green-blue-galaxy.md        Saved example commands and preferred seeds
output_images/                Default output directory (gitignored)
```

## Notes

- The SVG is 400×400px internally; use `npm run convert` (or any SVG viewer/exporter) to get other sizes.
- `--seed` controls polygon node placement and twinkle selection. `--flower-seed` independently controls the `feTurbulence` organic wobble — keeping it fixed across animation cycles prevents the flower from reshaping between loops.
- `--lobe-bumpiness` and `--flower-turbulence-*` accept comma-separated lists applied per layer from innermost to outermost (cycling if fewer values than layers).
- `--lobe-gap-exponent` > 1 compresses inner gaps, creating a tunnel-depth effect.
