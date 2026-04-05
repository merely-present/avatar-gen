'use strict';
/**
 * Utility: load a JSON file and validate it against a Zod schema.
 * Calls process.exit(1) with a human-readable error on failure.
 */

const fs   = require('fs');
const path = require('path');

/**
 * @param {string} jsonPath  - Path to the JSON file (resolved relative to cwd)
 * @param {import('zod').ZodType} schema - Zod schema to validate against
 * @returns {object} Parsed + validated config object (with Zod defaults applied)
 */
function loadAndValidateJson(jsonPath, schema) {
    const absPath = path.resolve(jsonPath);
    let raw;
    try {
        raw = JSON.parse(fs.readFileSync(absPath, 'utf8'));
    } catch (e) {
        console.error(`Error reading JSON file "${absPath}": ${e.message}`);
        process.exit(1);
    }

    const result = schema.safeParse(raw);
    if (!result.success) {
        console.error(`JSON validation error(s) in "${absPath}":`);
        for (const issue of result.error.issues) {
            const fieldPath = issue.path.length > 0 ? issue.path.join('.') : '(root)';
            console.error(`  ${fieldPath}: ${issue.message}`);
        }
        process.exit(1);
    }
    return result.data;
}

module.exports = { loadAndValidateJson };
