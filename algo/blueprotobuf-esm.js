// ES Module wrapper for blueprotobuf.js
import * as $protobuf from 'protobufjs/minimal.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read and evaluate the UMD module manually
const blueprotobufCode = readFileSync(join(__dirname, 'blueprotobuf.js'), 'utf-8');

// Create a context where the UMD module can execute
let pb = null;
const module = { exports: {} };

// Execute the UMD code with our module context
const factory = new Function('module', 'require', blueprotobufCode + '\nreturn module.exports;');
pb = factory(module, (name) => {
    if (name === 'protobufjs/minimal') return $protobuf;
    throw new Error(`Unknown module: ${name}`);
});

export default pb;
