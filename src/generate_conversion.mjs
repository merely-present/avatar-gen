#! /usr/bin/env node

import { Resvg } from '@resvg/resvg-js'
import sharp from 'sharp'
import { readFileSync, mkdirSync } from 'fs'
import { resolve, join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = dirname(__filename)

function showHelp() {
    console.log(
        'Usage: npm run convert -- [options]\n' +
        '       node src/generate_conversion.mjs [options]\n' +
        '\n' +
        'Converts merely-present-avatar-11.svg to PNG and JPEG at multiple resolutions.\n' +
        '\n' +
        'Options:\n' +
        '  --output-dir <path>   Output directory for the batch folder  [cwd]\n' +
        '\n' +
        'Resolutions: ' + [400, 600, 800, 1000, 1080, 1500, 1920, 2000, 2500, 4000, 6000].join(', ') + '\n' +
        '\n' +
        'Output: <output-dir>/merely_present_avatar_<resolutions>_<datetime>/\n' +
        '  merely_present_avatar_<N>x<N>.png\n' +
        '  merely_present_avatar_<N>x<N>.jpg\n'
    )
}

const RESOLUTIONS = [400, 600, 800, 1000, 1080, 1500, 1920, 2000, 2500, 4000, 6000]

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------
const argv = process.argv.slice(2)

if (argv.some(a => a === '--help' || a === '-h')) { showHelp(); process.exit(0) }
const opts = {}
for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (!arg.startsWith('--')) continue
    const eqIdx = arg.indexOf('=')
    const key   = eqIdx >= 0 ? arg.slice(2, eqIdx) : arg.slice(2)
    const val   = eqIdx >= 0 ? arg.slice(eqIdx + 1) : argv[++i]
    opts[key] = val
}

const outputDir = opts['output-dir'] ? resolve(opts['output-dir']) : process.cwd()

// ---------------------------------------------------------------------------
// Datetime + timezone (local time, same format as generate_animated_avatar)
// ---------------------------------------------------------------------------
const now      = new Date()
const pad2     = n => String(n).padStart(2, '0')
const tzOffset = -now.getTimezoneOffset()          // getTimezoneOffset() returns (UTC − local) in min
const tzSign   = tzOffset >= 0 ? '+' : '-'
const tzH      = pad2(Math.floor(Math.abs(tzOffset) / 60))
const tzM      = pad2(Math.abs(tzOffset) % 60)
const timestamp = [
    now.getFullYear(),
    '-', pad2(now.getMonth() + 1),
    '-', pad2(now.getDate()),
    '_', pad2(now.getHours()),
    '-', pad2(now.getMinutes()),
    '-', pad2(now.getSeconds()),
    '_', tzSign, tzH, tzM,
].join('')

// ---------------------------------------------------------------------------
// Output directory  →  <output-dir>/merely_present_avatar_<res1>-<res2>-..._<datetime>/
// ---------------------------------------------------------------------------
const resStr    = RESOLUTIONS.join('-')
const batchName = `merely_present_avatar_${resStr}_${timestamp}`
const batchDir  = join(outputDir, batchName)
mkdirSync(outputDir, { recursive: true })
mkdirSync(batchDir,  { recursive: true })

// ---------------------------------------------------------------------------
// oklch → rgb conversion (resvg/librsvg don't support oklch)
// ---------------------------------------------------------------------------
function oklchToRgb(L, C, H_deg) {
    const H = H_deg * Math.PI / 180
    const a = C * Math.cos(H)
    const b = C * Math.sin(H)
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b
    const s_ = L - 0.0894841775 * a - 1.2914855480 * b
    const l3 = l_ * l_ * l_
    const m3 = m_ * m_ * m_
    const s3 = s_ * s_ * s_
    const r_lin = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3
    const g_lin = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3
    const b_lin = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3
    const gamma = v => v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055
    const clamp = v => Math.max(0, Math.min(255, Math.round(gamma(Math.max(0, v)) * 255)))
    return [clamp(r_lin), clamp(g_lin), clamp(b_lin)]
}

function convertOklchInSvg(svg) {
    return svg.replace(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\s*\)/g,
        (_, L, C, H, alpha) => {
            const [r, g, b] = oklchToRgb(parseFloat(L), parseFloat(C), parseFloat(H))
            if (alpha !== undefined) return `rgba(${r}, ${g}, ${b}, ${alpha})`
            return `rgb(${r}, ${g}, ${b})`
        })
}

// ---------------------------------------------------------------------------
// Read input SVG
// ---------------------------------------------------------------------------
console.log('Generating avatar conversion...')
const svgRaw = readFileSync('merely-present-avatar-11.svg', 'utf8')
const svg    = convertOklchInSvg(svgRaw)

for (const size of RESOLUTIONS) {
    console.log(`Rendering ${size}x${size}...`)
    const resvg    = new Resvg(svg, {
        fitTo: { mode: 'width', value: size },
        font:  { loadSystemFonts: true },
    })
    const pngData  = resvg.render().asPng()
    const pngBuf   = Buffer.from(pngData)

    // PNG: lossless compression (no visual difference, smaller file)
    const pngPath = join(batchDir, `merely_present_avatar_${size}x${size}.png`)
    await sharp(pngBuf)
        .png({ compressionLevel: 9, adaptiveFiltering: true })
        .toFile(pngPath)
    console.log(`Saved ${pngPath}`)

    // JPEG: quality 92 (high quality, not uncompressed)
    const jpegPath = join(batchDir, `merely_present_avatar_${size}x${size}.jpg`)
    await sharp(pngBuf)
        .flatten({ background: '#ffffff' })  // JPEGs can't be transparent; fill white
        .jpeg({ quality: 92, mozjpeg: true })
        .toFile(jpegPath)
    console.log(`Saved ${jpegPath}`)
}

console.log(`Done: ${batchDir}`)
