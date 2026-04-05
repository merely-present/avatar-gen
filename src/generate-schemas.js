#!/usr/bin/env node
'use strict';

/**
 * Emits JSON Schema 7 files for all three config types, and writes
 * default config files to presets/default/.
 *
 * Output:
 *   schemas/generate.schema.json
 *   schemas/animate.schema.json
 *   schemas/convert.schema.json
 *   presets/default/default.generate.json
 *   presets/default/default.animate.json
 *   presets/default/default.convert.json  (template — inputFiles required)
 *
 * Run: npm run generate-schemas
 */

const { z }                                                              = require('zod');
const { writeFileSync, mkdirSync }                                       = require('fs');
const { join }                                                           = require('path');
const { GenerateConfigSchema, AnimateConfigSchema, ConvertConfigSchema } = require('./schemas.js');

// ---------------------------------------------------------------------------
// JSON Schemas
// ---------------------------------------------------------------------------
const schemasDir = join(__dirname, '..', 'schemas');
mkdirSync(schemasDir, { recursive: true });

const opts = { target: 'draft-7' };

const schemaEntries = [
    ['generate.schema.json', GenerateConfigSchema],
    ['animate.schema.json',  AnimateConfigSchema],
    ['convert.schema.json',  ConvertConfigSchema],
];

for (const [filename, schema] of schemaEntries) {
    const jsonSchema = z.toJSONSchema(schema, opts);
    const outPath    = join(schemasDir, filename);
    writeFileSync(outPath, JSON.stringify(jsonSchema, null, 2) + '\n', 'utf8');
    console.log(`  wrote ${outPath}`);
}

// ---------------------------------------------------------------------------
// Default preset configs (parse empty object to get all Zod defaults)
// ---------------------------------------------------------------------------
const presetsDefaultDir = join(__dirname, '..', 'presets', 'default');
mkdirSync(presetsDefaultDir, { recursive: true });

// Generate defaults: seed/flowerSeed omitted (optional → random at runtime)
const generateDefaults = GenerateConfigSchema.parse({});
writeFileSync(
    join(presetsDefaultDir, 'default.generate.json'),
    JSON.stringify({ '$schema': '../../schemas/generate.schema.json', ...generateDefaults }, null, 2) + '\n',
    'utf8',
);
console.log(`  wrote presets/default/default.generate.json`);

// Animate defaults: seeds omitted (optional → derived from first seed at runtime)
const animateDefaults = AnimateConfigSchema.parse({});
writeFileSync(
    join(presetsDefaultDir, 'default.animate.json'),
    JSON.stringify({ '$schema': '../../schemas/animate.schema.json', ...animateDefaults }, null, 2) + '\n',
    'utf8',
);
console.log(`  wrote presets/default/default.animate.json`);

// Convert: inputFiles is required — write a commented template
const convertTemplate = {
    '$schema': '../../schemas/convert.schema.json',
    'inputFiles': ['./output_images/your-avatar.svg'],
};
writeFileSync(
    join(presetsDefaultDir, 'default.convert.json'),
    JSON.stringify(convertTemplate, null, 2) + '\n',
    'utf8',
);
console.log(`  wrote presets/default/default.convert.json`);

console.log('Done.');
