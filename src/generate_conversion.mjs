#! /usr/bin/env node

import puppeteer from 'puppeteer-core'
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import { resolve, join, dirname, basename, extname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = dirname(__filename)

// ---------------------------------------------------------------------------
// Chromium detection (same as generate_animated_avatar.js)
// ---------------------------------------------------------------------------
function findChromium() {
    if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH
    for (const bin of ['chromium-browser', 'chromium', 'chromium-headless']) {
        try { return execSync(`which ${bin}`, { stdio: 'pipe' }).toString().trim() } catch {}
    }
    return null
}
const CHROMIUM_EXEC = findChromium()
if (!CHROMIUM_EXEC) {
    console.error('Chromium not found. Install it: sudo dnf install chromium-headless')
    process.exit(1)
}

const RESOLUTIONS = [200, 400, 600, 800, 1000, 1080, 1200, 1500, 2000, 4000]
const RES_STR     = RESOLUTIONS.join('-')

function showHelp() {
    console.log(
        'Usage: npm run convert -- [options]\n' +
        '       node src/generate_conversion.mjs [options]\n' +
        '\n' +
        'Converts one or more avatar SVGs to PNG (transparent) and JPEG (white bg)\n' +
        'at multiple resolutions using Puppeteer/Chromium (oklch + custom fonts).\n' +
        'All input files share one browser process.\n' +
        '\n' +
        'Options:\n' +
        '  --input-file <path>   Input SVG; repeat for multiple files  (required)\n' +
        '  --output-dir <path>   Parent for output dirs  [same dir as each input file]\n' +
        '  --text-font <name>    Override font family  [auto-detected from SVG]\n' +
        '\n' +
        'Resolutions: ' + RESOLUTIONS.join(', ') + '\n' +
        '\n' +
        'Output per input file (e.g. foo.svg → foo.converted_<resolutions>_<datetime>/):\n' +
        '  foo_<N>x<N>.png   PNG with transparent background\n' +
        '  foo_<N>x<N>.jpg   JPEG with white background\n'
    )
}

// ---------------------------------------------------------------------------
// Arg parsing — collect multiple --input-file values
// ---------------------------------------------------------------------------
const argv = process.argv.slice(2)

if (argv.some(a => a === '--help' || a === '-h')) { showHelp(); process.exit(0) }

const inputFiles   = []
let   outputDirOpt = null
let   fontOverride = null

for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (!arg.startsWith('--')) continue
    const eqIdx = arg.indexOf('=')
    const key   = eqIdx >= 0 ? arg.slice(2, eqIdx) : arg.slice(2)
    const val   = eqIdx >= 0 ? arg.slice(eqIdx + 1) : argv[++i]
    if      (key === 'input-file') inputFiles.push(resolve(val))
    else if (key === 'output-dir') outputDirOpt = resolve(val)
    else if (key === 'text-font')  fontOverride  = val
}

if (inputFiles.length === 0) {
    console.error('Error: at least one --input-file <path> is required')
    process.exit(1)
}

// ---------------------------------------------------------------------------
// Datetime + timezone (local time, same format as generate_animated_avatar)
// ---------------------------------------------------------------------------
const now      = new Date()
const pad2     = n => String(n).padStart(2, '0')
const tzOffset = -now.getTimezoneOffset()
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
// Font embedding helper — reads WOFF2 from node_modules/@fontsource/<slug>/files/
// and returns @font-face CSS for inline embedding.
// ---------------------------------------------------------------------------
const FONTSOURCE_DIR = join(__dirname, '..', 'node_modules', '@fontsource')

function buildFontFaceCSS(family) {
    const slug     = family.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const filesDir = join(FONTSOURCE_DIR, slug, 'files')
    if (!existsSync(join(FONTSOURCE_DIR, slug))) {
        console.warn(`Warning: font '${family}': package not found in node_modules. Run \`npm run pull-fonts\` to install fonts.`)
        return null
    }
    const allFiles = readdirSync(filesDir)
    let matching = allFiles.filter(f => f.startsWith(slug + '-latin') && f.endsWith('.woff2'))
    if (matching.length === 0)
        matching = allFiles.filter(f => f.startsWith(slug) && f.endsWith('.woff2'))
    if (matching.length === 0) return null
    return matching.map(file => {
        const m      = file.match(/-(\d+)-(normal|italic)\.woff2$/)
        const weight = m ? m[1] : '400'
        const style  = m ? m[2] : 'normal'
        const b64    = readFileSync(join(filesDir, file)).toString('base64')
        return `@font-face{font-family:'${family}';src:url('data:font/woff2;base64,${b64}')format('woff2');font-weight:${weight};font-style:${style};}`
    }).join('')
}

// Auto-detect font family embedded in SVG by generate_avatar.js.
// Looks for: font-family="'Font Name'" or font-family="Font Name"
function parseFontFromSvg(svgText) {
    const m = svgText.match(/font-family="'([^']+)'"/) ?? svgText.match(/font-family="([^"]+)"/)
    return m ? m[1].trim() : null
}

// ---------------------------------------------------------------------------
// Load all SVG content up-front, build combined font CSS so the single
// page.setContent call caches every needed font across all files.
// ---------------------------------------------------------------------------
console.log(`Converting ${inputFiles.length} file(s)…`)

const svgEntries = inputFiles.map(file => {
    const svg      = readFileSync(file, 'utf8')
    const fontName = fontOverride ?? parseFontFromSvg(svg) ?? 'DejaVu Sans Mono'
    return { file, svg, fontName }
})

const uniqueFonts = [...new Set(svgEntries.map(e => e.fontName))]
const combinedCss = uniqueFonts.map(f => {
    const css = buildFontFaceCSS(f)
    if (css === null) console.warn(`Warning: font '${f}': no WOFF2 files found in ${join(FONTSOURCE_DIR, f.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''), 'files')}. Run \`npm run pull-fonts\` to install fonts.`)
    return css ?? ''
}).join('')

// ---------------------------------------------------------------------------
// Render — one browser, one page, all files × all resolutions
// ---------------------------------------------------------------------------
const browser = await puppeteer.launch({ executablePath: CHROMIUM_EXEC, args: ['--no-sandbox', '--disable-setuid-sandbox'] })
const page    = await browser.newPage()

await page.setContent(
    `<!DOCTYPE html><html><head><style>html,body{margin:0;padding:0;}${combinedCss}</style></head><body></body></html>`
)
await page.evaluate(() => document.fonts.ready)

const totalSteps = svgEntries.length * RESOLUTIONS.length * 2  // PNG + JPEG per resolution
let   doneSteps  = 0
const BAR_WIDTH  = 20
const BAR_EIGHTHS = [' ', '▏', '▎', '▍', '▌', '▋', '▊', '▉', '█']

function printProgress(stem) {
    const pct      = Math.round(doneSteps / totalSteps * 100)
    const exact    = doneSteps / totalSteps * BAR_WIDTH   // fractional cells filled
    const full     = Math.floor(exact)
    const partial  = Math.floor((exact - full) * 8)       // 0–7 eighths
    const bar      = '█'.repeat(full) +
                     (full < BAR_WIDTH ? BAR_EIGHTHS[partial] + ' '.repeat(BAR_WIDTH - full - 1) : '')
    const stepStr = String(doneSteps).padStart(String(totalSteps).length)
    process.stdout.write(`\r|${bar}| ${stepStr}/${totalSteps} ${pct.toString().padStart(3)}% '${stem}'`)
}

for (const { file, svg } of svgEntries) {
    const stem    = basename(file, extname(file))
    const baseDir = outputDirOpt ?? dirname(file)
    // Output dir: <baseDir>/<stem>/  (the stem already contains the timestamp)
    const batchDir = join(baseDir, stem)
    mkdirSync(batchDir, { recursive: true })

    await page.evaluate((s) => { document.body.innerHTML = s }, svg)

    for (const size of RESOLUTIONS) {
        // deviceScaleFactor scales the 400×400 CSS viewport to the target pixel size.
        await page.setViewport({ width: 400, height: 400, deviceScaleFactor: size / 400 })

        // PNG: transparent background (omitBackground removes Chromium's default white fill).
        const pngBuf  = await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: 400, height: 400 } })
        writeFileSync(join(batchDir, `${stem}_${size}x${size}.png`), pngBuf)
        doneSteps++; printProgress(stem)

        // JPEG: white background (Chromium's default white fill; no alpha channel in JPEG).
        const jpgBuf  = await page.screenshot({ type: 'jpeg', quality: 92, clip: { x: 0, y: 0, width: 400, height: 400 } })
        writeFileSync(join(batchDir, `${stem}_${size}x${size}.jpg`), jpgBuf)
        doneSteps++; printProgress(stem)
    }
}

await browser.close()
process.stdout.write('\n')
console.log('Done.')
