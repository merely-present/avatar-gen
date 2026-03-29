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

const RESOLUTIONS = [200, 400, 600, 800, 1000, 1080, 1200, 1600, 2000, 4000]
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

for (let argIndex = 0; argIndex < argv.length; argIndex++) {
    const argToken = argv[argIndex]
    if (!argToken.startsWith('--')) continue
    const eqSignIndex = argToken.indexOf('=')
    const argKey      = eqSignIndex >= 0 ? argToken.slice(2, eqSignIndex) : argToken.slice(2)
    const argValue    = eqSignIndex >= 0 ? argToken.slice(eqSignIndex + 1) : argv[++argIndex]
    if      (argKey === 'input-file') inputFiles.push(resolve(argValue))
    else if (argKey === 'output-dir') outputDirOpt = resolve(argValue)
    else if (argKey === 'text-font')  fontOverride  = argValue
}

if (inputFiles.length === 0) {
    console.error('Error: at least one --input-file <path> is required')
    process.exit(1)
}

// ---------------------------------------------------------------------------
// Datetime + timezone (local time, same format as generate_animated_avatar)
// ---------------------------------------------------------------------------
const now       = new Date()
const padStart2 = n => String(n).padStart(2, '0')
const tzOffset  = -now.getTimezoneOffset()
const tzSign    = tzOffset >= 0 ? '+' : '-'
const tzHours   = padStart2(Math.floor(Math.abs(tzOffset) / 60))
const tzMinutes = padStart2(Math.abs(tzOffset) % 60)
const timestamp = [
    now.getFullYear(),
    '-', padStart2(now.getMonth() + 1),
    '-', padStart2(now.getDate()),
    '_', padStart2(now.getHours()),
    '-', padStart2(now.getMinutes()),
    '-', padStart2(now.getSeconds()),
    '_', tzSign, tzHours, tzMinutes,
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
    let matching = allFiles.filter(fileName => fileName.startsWith(slug + '-latin') && fileName.endsWith('.woff2'))
    if (matching.length === 0)
        matching = allFiles.filter(fileName => fileName.startsWith(slug) && fileName.endsWith('.woff2'))
    if (matching.length === 0) return null
    return matching.map(fileName => {
        const fileMatch  = fileName.match(/-(\d+)-(normal|italic)\.woff2$/)
        const weight     = fileMatch ? fileMatch[1] : '400'
        const fontStyle  = fileMatch ? fileMatch[2] : 'normal'
        const base64Data = readFileSync(join(filesDir, fileName)).toString('base64')
        return `@font-face{font-family:'${family}';src:url('data:font/woff2;base64,${base64Data}')format('woff2');font-weight:${weight};font-style:${fontStyle};}`
    }).join('')
}

// Auto-detect font family embedded in SVG by generate_avatar.js.
// Looks for: font-family="'Font Name'" or font-family="Font Name"
function parseFontFromSvg(svgText) {
    const fontFamilyMatch = svgText.match(/font-family="'([^']+)'"/) ?? svgText.match(/font-family="([^"]+)"/)
    return fontFamilyMatch ? fontFamilyMatch[1].trim() : null
}

// ---------------------------------------------------------------------------
// Load all SVG content up-front, build combined font CSS so the single
// page.setContent call caches every needed font across all files.
// ---------------------------------------------------------------------------
console.log(`Converting ${inputFiles.length} file(s)…`)

const svgEntries = inputFiles.map(filePath => {
    const svg      = readFileSync(filePath, 'utf8')
    const fontName = fontOverride ?? parseFontFromSvg(svg) ?? 'DejaVu Sans Mono'
    return { file: filePath, svg, fontName }
})

const uniqueFonts  = [...new Set(svgEntries.map(entry => entry.fontName))]
const combinedCss  = uniqueFonts.map(fontName => {
    const css = buildFontFaceCSS(fontName)
    if (css === null) console.warn(`Warning: font '${fontName}': no WOFF2 files found in ${join(FONTSOURCE_DIR, fontName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''), 'files')}. Run \`npm run pull-fonts\` to install fonts.`)
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

const totalSteps  = svgEntries.length * RESOLUTIONS.length * 2  // PNG + JPEG per resolution
let   doneSteps   = 0
const BAR_WIDTH   = 20
const BAR_EIGHTHS = [' ', '▏', '▎', '▍', '▌', '▋', '▊', '▉', '█']

function printProgress(fileStem) {
    const pct         = Math.round(doneSteps / totalSteps * 100)
    const filledCells = doneSteps / totalSteps * BAR_WIDTH   // fractional cells filled
    const fullCells   = Math.floor(filledCells)
    const partialEighths = Math.floor((filledCells - fullCells) * 8)       // 0–7 eighths
    const progressBar = '█'.repeat(fullCells) +
                     (fullCells < BAR_WIDTH ? BAR_EIGHTHS[partialEighths] + ' '.repeat(BAR_WIDTH - fullCells - 1) : '')
    const stepStr = String(doneSteps).padStart(String(totalSteps).length)
    process.stdout.write(`\r|${progressBar}| ${stepStr}/${totalSteps} ${pct.toString().padStart(3)}% '${fileStem}'`)
}

for (const { file, svg } of svgEntries) {
    const fileStem = basename(file, extname(file))
    const baseDir  = outputDirOpt ?? dirname(file)
    // Output dir: <baseDir>/<fileStem>/  (the fileStem already contains the timestamp)
    const batchDir = join(baseDir, fileStem)
    mkdirSync(batchDir, { recursive: true })

    await page.evaluate((svgContent) => { document.body.innerHTML = svgContent }, svg)

    for (const renderSize of RESOLUTIONS) {
        // deviceScaleFactor scales the 400×400 CSS viewport to the target pixel size.
        await page.setViewport({ width: 400, height: 400, deviceScaleFactor: renderSize / 400 })

        // PNG: transparent background (omitBackground removes Chromium's default white fill).
        const pngBuffer = await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: 400, height: 400 } })
        writeFileSync(join(batchDir, `${fileStem}_${renderSize}x${renderSize}.png`), pngBuffer)
        doneSteps++; printProgress(fileStem)

        // JPEG: white background (Chromium's default white fill; no alpha channel in JPEG).
        const jpgBuffer = await page.screenshot({ type: 'jpeg', quality: 92, clip: { x: 0, y: 0, width: 400, height: 400 } })
        writeFileSync(join(batchDir, `${fileStem}_${renderSize}x${renderSize}.jpg`), jpgBuffer)
        doneSteps++; printProgress(fileStem)
    }
}

await browser.close()
process.stdout.write('\n')
console.log('Done.')
