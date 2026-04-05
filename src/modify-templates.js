#!/usr/bin/env node
'use strict';

/**
 * modify-templates.js  —  Patch camelCase key values across avatar-gen config JSON files.
 *
 * Usage: node src/modify-templates.js <file-or-dir>... --camelCaseKey value ...
 *
 * Positional args: paths to *.generate.json / *.animate.json / *.convert.json
 *                  files, or directories searched recursively for those files.
 * Named args:      --camelCaseKey value  (may appear anywhere, interspersed)
 *                  Values are parsed as JSON (number, boolean, array, object),
 *                  falling back to plain strings.
 */

const fs   = require('fs');
const path = require('path');
const {
    GenerateConfigSchema,
    AnimateConfigSchema,
    ConvertConfigSchema,
} = require('./schemas.js');

// ── ANSI helpers ──────────────────────────────────────────────────────────────

const ANSI = Object.freeze({
    reset:   '\x1b[0m',
    bold:    '\x1b[1m',
    dim:     '\x1b[2m',
    red:     '\x1b[31m',
    green:   '\x1b[32m',
    cyan:    '\x1b[36m',
    yellow:  '\x1b[33m',
    redBg:   '\x1b[48;2;180;50;50m',   // mid red bg   — deleted chars
    greenBg: '\x1b[48;2;30;110;30m',   // mid green bg — inserted chars
});

const R = ANSI.reset;

// ── Config ────────────────────────────────────────────────────────────────────

const CONFIG_SUFFIXES = Object.freeze(['.generate.json', '.animate.json', '.convert.json']);
const SKIP_DIRS       = new Set(['node_modules', '.git', '.vscode', 'output_images']);

const SCHEMA_BY_SUFFIX = Object.freeze({
    '.generate.json': GenerateConfigSchema,
    '.animate.json': AnimateConfigSchema,
    '.convert.json': ConvertConfigSchema,
});

// ── Help ──────────────────────────────────────────────────────────────────────

function showHelp() {
    console.log(
        'Usage: node src/modify-templates.js <target>... --key value ...\n' +
        '       npm run modify-templates -- <target>... --key value ...\n' +
        '\n' +
        'Applies camelCase key→value changes to all matching config JSON files.\n' +
        '\n' +
        'Positional args: JSON files or directories (searched recursively).\n' +
        'Named args:      --camelCaseKey value  (interspersed anywhere)\n' +
        '                 Also supports --camelCaseKey=value form.\n' +
        '\n' +
        'Values are parsed as JSON (numbers, booleans, arrays, objects),\n' +
        'falling back to a plain string when not valid JSON.\n' +
        '\n' +
        'Lists must be valid JSON arrays with [ and ].\n' +
        'Use single quotes around the whole JSON value so your shell keeps it together.\n' +
        'Example list syntax: --flowerColors \'["oklch(...)","oklch(...)"]\'\n' +
        '\n' +
        'Recognized files: *.generate.json  *.animate.json  *.convert.json\n' +
        '\n' +
        'Examples:\n' +
        '  npm run modify-templates -- presets/ --twinkleStrength 0.5\n' +
        '  npm run modify-templates -- presets/green_blue_galaxy --waveCount 8 --waveLightness 0.3\n' +
        '  npm run modify-templates -- presets/green_blue_galaxy/single-svg.generate.json --seed 12345\n' +
        '  npm run modify-templates -- presets/green_blue_galaxy --flowerColors \'["oklch(0.66 0.105 322.40)","oklch(0.62 0.189 328.59)"]\'\n' +
        '  node src/modify-templates.js presets/green_blue_galaxy --flowerColors=' +
        '\'["oklch(0.66 0.105 322.40)","oklch(0.62 0.189 328.59)"]\'\n' +
        '\n' +
        'Shows a character-level colored diff of every change applied.\n'
    );
}

// ── Argument parsing ──────────────────────────────────────────────────────────

/**
 * @typedef {{ targets: string[], patches: Record<string, unknown> }} ParsedArgs
 */

/**
 * Parse CLI arguments into target paths and patch key/value pairs.
 * Handles both `--key value` and `--key=value` forms.
 * Negative numeric values (e.g. `-135`) are treated as values, not flags.
 * @param {string[]} argv
 * @returns {ParsedArgs}
 */
function parseArgs(argv) {
    const targets = /** @type {string[]} */ ([]);
    const patches  = /** @type {Record<string, unknown>} */ ({});

    let index = 0;
    while (index < argv.length) {
        const arg = argv[index];

        if (arg === '--help' || arg === '-h') { showHelp(); process.exit(0); }

        if (arg.startsWith('--')) {
            const eqPos = arg.indexOf('=');
            if (eqPos !== -1) {
                // --key=value form
                const key = arg.slice(2, eqPos);
                const val = arg.slice(eqPos + 1);
                patches[key] = coerceValue(val);
                index++;
            } else {
                // --key value form; value may start with '-' (e.g. negative numbers)
                const key    = arg.slice(2);
                const rawVal = argv[index + 1];
                if (rawVal === undefined) {
                    console.error(`${ANSI.red}Error: --${key} requires a value.${R}`);
                    process.exit(1);
                }
                patches[key] = coerceValue(rawVal);
                index += 2;
            }
        } else {
            targets.push(arg);
            index++;
        }
    }

    return { targets, patches };
}

/**
 * Coerce a CLI string to its JSON equivalent; fall back to plain string.
 * @param {string} str
 * @returns {unknown}
 */
function coerceValue(str) {
    const trimmed = str.trim();

    try {
        return JSON.parse(trimmed);
    } catch {
        return str;
    }
}

// ── File discovery ────────────────────────────────────────────────────────────

/**
 * @param {string} filePath
 * @returns {boolean}
 */
function isConfigFile(filePath) {
    return CONFIG_SUFFIXES.some(suffix => filePath.endsWith(suffix));
}

/**
 * @param {string} filePath
 * @returns {import('zod').ZodType | null}
 */
function getSchemaForFile(filePath) {
    for (const suffix of CONFIG_SUFFIXES) {
        if (filePath.endsWith(suffix)) {
            return SCHEMA_BY_SUFFIX[suffix] ?? null;
        }
    }
    return null;
}

/**
 * Return a strict variant of a schema when supported.
 * This makes unknown keys fail validation instead of being silently accepted.
 * @param {import('zod').ZodType} schema
 * @returns {import('zod').ZodType}
 */
function toStrictSchema(schema) {
    if (typeof schema.strict === 'function') {
        return schema.strict();
    }
    return schema;
}

/**
 * Return the set of declared top-level keys for an object schema.
 * @param {import('zod').ZodType | null} schema
 * @returns {Set<string> | null}
 */
function getSchemaKeys(schema) {
    if (!schema || typeof schema !== 'object') return null;

    const shape = typeof schema.shape === 'object'
        ? schema.shape
        : typeof schema._def?.shape === 'function'
            ? schema._def.shape()
            : null;

    if (!shape || typeof shape !== 'object') return null;
    return new Set(Object.keys(shape));
}

/**
 * Split requested patches into keys supported by a file's schema and keys that are not.
 * @param {string} filePath
 * @param {Record<string, unknown>} patches
 * @returns {{ applicablePatches: Record<string, unknown>, unsupportedKeys: string[] }}
 */
function partitionPatchesForFile(filePath, patches) {
    const schema = getSchemaForFile(filePath);
    const schemaKeys = getSchemaKeys(schema);
    if (!schemaKeys) {
        return { applicablePatches: { ...patches }, unsupportedKeys: [] };
    }

    const applicablePatches = /** @type {Record<string, unknown>} */ ({});
    const unsupportedKeys = [];

    for (const [key, value] of Object.entries(patches)) {
        if (schemaKeys.has(key)) {
            applicablePatches[key] = value;
        } else {
            unsupportedKeys.push(key);
        }
    }

    return { applicablePatches, unsupportedKeys };
}

/**
 * Validate patched JSON content against the schema implied by file suffix.
 * @param {string} filePath
 * @param {Record<string, unknown>} data
 * @returns {{ success: true } | { success: false, issues: string[] }}
 */
function validatePatchedData(filePath, data) {
    const schema = getSchemaForFile(filePath);
    if (!schema) return { success: true };

    const { $schema: _schemaRef, ...dataWithoutSchemaRef } = data;
    const strictSchema = toStrictSchema(schema);
    const result = strictSchema.safeParse(dataWithoutSchemaRef);
    if (result.success) return { success: true };

    const issues = result.error.issues.map(issue => {
        const fieldPath = issue.path.length > 0 ? issue.path.join('.') : '(root)';
        return `${fieldPath}: ${issue.message}`;
    });
    return { success: false, issues };
}

/**
 * Recursively collect all config JSON files under `dir`.
 * @param {string} dir
 * @returns {string[]}
 */
function findConfigFiles(dir) {
    const found = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name.startsWith('.')) continue;
        if (SKIP_DIRS.has(entry.name)) continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            found.push(...findConfigFiles(fullPath));
        } else if (entry.isFile() && isConfigFile(fullPath)) {
            found.push(fullPath);
        }
    }
    return found;
}

/**
 * Expand an array of file/dir targets into a deduplicated list of config JSON paths.
 * @param {string[]} targets
 * @returns {string[]}
 */
function discoverFiles(targets) {
    const results = [];
    for (const target of targets) {
        const abs = path.resolve(target);
        let stat;
        try {
            stat = fs.statSync(abs);
        } catch {
            console.error(`${ANSI.yellow}warning: not found: ${target}${R}`);
            continue;
        }
        if (stat.isFile()) {
            if (isConfigFile(abs)) {
                results.push(abs);
            } else {
                console.error(
                    `${ANSI.yellow}warning: not a recognized config file ` +
                    `(must end in .generate.json / .animate.json / .convert.json): ${target}${R}`
                );
            }
        } else if (stat.isDirectory()) {
            results.push(...findConfigFiles(abs));
        }
    }
    return [...new Set(results)];
}

// ── LCS-based character-level diff ────────────────────────────────────────────

/**
 * @typedef {{ type: 'equal' | 'delete' | 'insert', text: string }} DiffOp
 */

/**
 * Build a DP LCS look-up table for two strings (reverse fill for O(nm) space).
 * @param {string} a
 * @param {string} b
 * @returns {number[][]}
 */
function buildLCSTable(a, b) {
    const n  = a.length;
    const m  = b.length;
    const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
    for (let rowIndex = n - 1; rowIndex >= 0; rowIndex--) {
        for (let colIndex = m - 1; colIndex >= 0; colIndex--) {
            if (a[rowIndex] === b[colIndex]) {
                dp[rowIndex][colIndex] = dp[rowIndex + 1][colIndex + 1] + 1;
            } else {
                dp[rowIndex][colIndex] = Math.max(
                    dp[rowIndex + 1][colIndex],
                    dp[rowIndex][colIndex + 1]
                );
            }
        }
    }
    return dp;
}

/**
 * Produce a character-level diff between `oldStr` and `newStr` using LCS.
 * Returns coalesced ops (consecutive same-type chars merged into one entry).
 * @param {string} oldStr
 * @param {string} newStr
 * @returns {DiffOp[]}
 */
function charDiff(oldStr, newStr) {
    if (oldStr === newStr) return oldStr.length ? [{ type: 'equal', text: oldStr }] : [];
    if (oldStr.length === 0) return [{ type: 'insert', text: newStr }];
    if (newStr.length === 0) return [{ type: 'delete', text: oldStr }];

    const table    = buildLCSTable(oldStr, newStr);
    const ops      = /** @type {DiffOp[]} */ ([]);
    let   oldIndex = 0;
    let   newIndex = 0;

    while (oldIndex < oldStr.length || newIndex < newStr.length) {
        if (
            oldIndex < oldStr.length &&
            newIndex < newStr.length &&
            oldStr[oldIndex] === newStr[newIndex]
        ) {
            appendOp(ops, 'equal', oldStr[oldIndex]);
            oldIndex++;
            newIndex++;
        } else if (
            newIndex < newStr.length &&
            (oldIndex >= oldStr.length ||
             table[oldIndex][newIndex + 1] >= table[oldIndex + 1][newIndex])
        ) {
            appendOp(ops, 'insert', newStr[newIndex]);
            newIndex++;
        } else {
            appendOp(ops, 'delete', oldStr[oldIndex]);
            oldIndex++;
        }
    }

    return ops;
}

/**
 * Append `char` to the last DiffOp in `ops` if its type matches; otherwise push a new op.
 * @param {DiffOp[]} ops
 * @param {'equal' | 'delete' | 'insert'} type
 * @param {string} char
 */
function appendOp(ops, type, char) {
    if (ops.length > 0 && ops[ops.length - 1].type === type) {
        ops[ops.length - 1].text += char;
    } else {
        ops.push({ type, text: char });
    }
}

// ── Diff rendering ────────────────────────────────────────────────────────────

/**
 * Render a single key change as two ANSI-colored diff lines (- old, + new),
 * with character-level highlighting of the modified portions.
 * @param {string} key
 * @param {unknown} oldVal
 * @param {unknown} newVal
 * @returns {string}
 */
function renderKeyDiff(key, oldVal, newVal) {
    const oldSer = JSON.stringify(oldVal) ?? '';
    const newSer = JSON.stringify(newVal) ?? '';
    const diffs  = charDiff(oldSer, newSer);

    let oldHighlighted = '';
    let newHighlighted = '';

    for (const { type, text } of diffs) {
        switch (type) {
            case 'equal':
                oldHighlighted += text;
                newHighlighted += text;
                break;
            case 'delete':
                oldHighlighted += ANSI.redBg + '\x1b[97m' + text + R + ANSI.red;
                break;
            case 'insert':
                newHighlighted += ANSI.greenBg + '\x1b[97m' + text + R + ANSI.green;
                break;
        }
    }

    const keyLabel = `${ANSI.dim}"${key}": ${R}`;
    const oldLine  = `${ANSI.red}-${R} ${keyLabel}${ANSI.red}${oldHighlighted}${R}`;
    const newLine  = `${ANSI.green}+${R} ${keyLabel}${ANSI.green}${newHighlighted}${R}`;
    return `${oldLine}\n${newLine}`;
}

// ── Patch application ─────────────────────────────────────────────────────────

/**
 * @typedef {{ key: string, oldVal: unknown, newVal: unknown }} Change
 */

/**
 * Apply patches to a plain object. Returns a shallow-merged copy and a list
 * of keys whose serialized value actually changed.
 * @param {Record<string, unknown>} data
 * @param {Record<string, unknown>} patches
 * @returns {{ updated: Record<string, unknown>, changes: Change[] }}
 */
function applyPatches(data, patches) {
    const updated = { ...data };
    const changes  = /** @type {Change[]} */ ([]);

    for (const [key, newVal] of Object.entries(patches)) {
        const oldVal = data[key];
        if (JSON.stringify(oldVal) === JSON.stringify(newVal)) continue;
        updated[key] = newVal;
        changes.push({ key, oldVal, newVal });
    }

    return { updated, changes };
}

// ── Entry point ───────────────────────────────────────────────────────────────

const { targets, patches } = parseArgs(process.argv.slice(2));

if (targets.length === 0 && Object.keys(patches).length === 0) {
    showHelp();
    process.exit(0);
}
if (targets.length === 0) {
    console.error(`${ANSI.red}Error: at least one target file or directory is required.${R}`);
    process.exit(1);
}
if (Object.keys(patches).length === 0) {
    console.error(`${ANSI.red}Error: no --key value changes specified.${R}`);
    process.exit(1);
}

const files = discoverFiles(targets);

if (files.length === 0) {
    console.error(`${ANSI.red}Error: no matching config files found in the given targets.${R}`);
    process.exit(1);
}

const cwd          = process.cwd();
let   totalChanged = 0;
let   totalSkipped = 0;
let   totalIncompatible = 0;
let   totalErrored = 0;

const separator = `${ANSI.dim}─────────────────────────────────────────${R}`;

for (const filePath of files) {
    const relPath = path.relative(cwd, filePath);
    let raw;
    try {
        raw = fs.readFileSync(filePath, 'utf8');
    } catch (err) {
        console.error(`${ANSI.red}  (error)       ${relPath} error:${R}`);
        console.error(`${ANSI.red}    ${err.message}${R}`);
        totalErrored++;
        continue;
    }

    let data;
    try {
        data = JSON.parse(raw);
    } catch (err) {
        console.error(`${ANSI.red}  (error)       ${relPath} error:${R}`);
        console.error(`${ANSI.red}    invalid JSON: ${err.message}${R}`);
        totalErrored++;
        continue;
    }

    const { applicablePatches, unsupportedKeys } = partitionPatchesForFile(filePath, patches);

    if (Object.keys(applicablePatches).length === 0) {
        console.log(
            `${ANSI.yellow}  (skipped)     ${relPath}: skipping unsupported key(s): ` +
            `${unsupportedKeys.join(', ')}${R}`
        );
        totalIncompatible++;
        continue;
    }

    if (unsupportedKeys.length > 0) {
        console.log(
            `${ANSI.yellow}  (skipped)     ${relPath}: skipping unsupported key(s): ` +
            `${unsupportedKeys.join(', ')}${R}`
        );
    }

    const { updated, changes } = applyPatches(data, applicablePatches);

    if (changes.length === 0) {
        console.log(`${ANSI.dim}  (unchanged)   ${relPath}${R}`);
        totalSkipped++;
        continue;
    }

    const validation = validatePatchedData(filePath, updated);
    if (!validation.success) {
          console.error(`${ANSI.red}  (error)       ${relPath} error:${R}`);
        for (const issue of validation.issues) {
            console.error(`${ANSI.red}    ${issue}${R}`);
        }
        totalErrored++;
        continue;
    }

    try {
        fs.writeFileSync(filePath, JSON.stringify(updated, null, 2) + '\n', 'utf8');
    } catch (err) {
        console.error(`${ANSI.red}  (error)       ${relPath} error:${R}`);
        console.error(`${ANSI.red}    write failed: ${err.message}${R}`);
        totalErrored++;
        continue;
    }

    totalChanged++;
    console.log(`${ANSI.bold}${ANSI.cyan}  (modified)    ${relPath}${R}`);
    console.log(separator);
    for (const { key, oldVal, newVal } of changes) {
        console.log(renderKeyDiff(key, oldVal, newVal));
    }
    console.log();
}

// ── Summary ───────────────────────────────────────────────────────────────────

const fileWord = files.length === 1 ? 'file' : 'files';
const parts = [
    `${ANSI.bold}${totalChanged} modified${R}`,
    totalSkipped > 0 ? `${ANSI.dim}${totalSkipped} unchanged${R}` : '',
    totalIncompatible > 0 ? `${ANSI.yellow}${totalIncompatible} incompatible${R}` : '',
    totalErrored > 0 ? `${ANSI.red}${totalErrored} error(s)${R}` : '',
].filter(Boolean);
console.log(`${parts.join('  ')}  ${ANSI.dim}(${files.length} ${fileWord} scanned)${R}`);

if (totalErrored > 0) {
    process.exitCode = 1;
}
