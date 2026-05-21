import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';

const locales = ['en', 'fr', 'pt'];
const basePath = 'd:/Projectos/restaurante-demo/qr-menu/admin-dashboard/public/locales';

function findDuplicates(jsonText) {
    const keys = [];
    const duplicates = [];
    
    // A simple parser using regex to extract keys at the top-level object
    // JSON keys look like "key": "value" or "key": { ... }
    const regex = /"([^"]+)"\s*:/g;
    let match;
    const seen = new Map(); // key -> count
    
    // We can also parse character by character, but since it's a simple flat JSON (or mostly flat),
    // let's do a reliable tokenizer to get keys and their values
    
    // To do it properly and handle nested objects, let's write a tiny recursive-descent token/key tracker,
    // or we can use a custom parser. Let's write a parser that parses JSON and tracks duplicate keys!
}

// Let's use a robust JavaScript AST parser or simple JSON tokenizer.
// A simpler way: since we want to find duplicate keys, we can use a library or write a small tokenizer.
// Let's write a clean parser that tracks key paths (e.g., "parent.child") and detects duplicate keys.

function parseAndDetect(filePath) {
    const content = readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    // We'll tokenize the JSON to find every key and its line number, and value.
    // A key starts with "name":. Let's find all matches of /"([^"]+)"\s*:/g
    const matches = [];
    let match;
    const keyRegex = /"([^"]+)"\s*:/g;
    
    // To be precise, let's parse using a state machine to track nesting
    let currentPath = [];
    let state = 'outer'; // outer, inside_string, inside_key, inside_val
    
    // Actually, we can write a simple parser using a stack of objects
    // Let's implement a simple custom JSON parser that keeps track of keys and warns about duplicates!
    
    const duplicateKeys = [];
    const keyMap = new Map(); // fullPath -> { value, line, count }
    
    // Let's parse JSON manually but carefully, or we can use a simpler approach:
    // JSON files are structured line-by-line where each key is on its own line: e.g. "key": "value"
    // Let's read line by line and find lines containing `"key":`
    
    lines.forEach((line, index) => {
        const lineNum = index + 1;
        const match = line.match(/^\s*"([^"]+)"\s*:\s*(.*)$/);
        if (match) {
            const key = match[1];
            let value = match[2].trim();
            // remove trailing comma if present
            if (value.endsWith(',')) {
                value = value.slice(0, -1);
            }
            
            if (keyMap.has(key)) {
                const existing = keyMap.get(key);
                existing.count++;
                duplicateKeys.push({
                    key,
                    line1: existing.line,
                    value1: existing.value,
                    line2: lineNum,
                    value2: value
                });
            } else {
                keyMap.set(key, { value, line: lineNum, count: 1 });
            }
        }
    });
    
    return duplicateKeys;
}

for (const lang of locales) {
    const path = `${basePath}/${lang}/translation.json`;
    console.log(`\n=== Analyzing ${lang}/translation.json ===`);
    try {
        const dupes = parseAndDetect(path);
        console.log(`Found ${dupes.length} duplicates.`);
        dupes.forEach(d => {
            console.log(`Key: "${d.key}"`);
            console.log(`  Line ${d.line1}: ${d.value1}`);
            console.log(`  Line ${d.line2}: ${d.value2}`);
            if (d.value1 !== d.value2) {
                console.log(`  ⚠ VALUE MISMATCH!`);
            } else {
                console.log(`  ✓ Identical values.`);
            }
        });
    } catch (err) {
        console.error(`Error reading ${path}:`, err.message);
    }
}
