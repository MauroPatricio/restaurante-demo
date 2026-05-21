const fs = require('fs');
const path = require('path');

const locales = ['en', 'fr', 'pt'];
const basePath = 'd:/Projectos/restaurante-demo/qr-menu/admin-dashboard/public/locales';

locales.forEach(lang => {
    const filePath = `${basePath}/${lang}/translation.json`;
    console.log(`\n========================================`);
    console.log(`Analyzing ${lang}/translation.json...`);
    if (!fs.existsSync(filePath)) {
        console.log(`File not found: ${filePath}`);
        return;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    const seenKeys = new Map(); // key -> { line, value }
    const duplicates = [];
    
    // We will extract all top-level keys and values.
    // Since it's a flat translation file, lines look like: "key": "value",
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
            
            if (seenKeys.has(key)) {
                const prev = seenKeys.get(key);
                duplicates.push({
                    key,
                    line1: prev.line,
                    value1: prev.value,
                    line2: lineNum,
                    value2: value
                });
            }
            seenKeys.set(key, { line: lineNum, value });
        }
    });
    
    console.log(`Found ${duplicates.length} duplicate occurrences.`);
    
    let mismatchCount = 0;
    duplicates.forEach(d => {
        if (d.value1 !== d.value2) {
            console.log(`⚠️ MISMATCH for key: "${d.key}"`);
            console.log(`  Line ${d.line1}: ${d.value1}`);
            console.log(`  Line ${d.line2}: ${d.value2}`);
            mismatchCount++;
        }
    });
    
    if (mismatchCount === 0) {
        console.log(`✓ All duplicates have identical values. It is completely safe to deduplicate by keeping the last value!`);
    } else {
        console.log(`⚠ Found ${mismatchCount} mismatched values. Please review before deduplication.`);
    }
    
    // Let's also do a safe deduplication. We'll reconstruct the JSON object by keeping the last value
    // (which is exactly what JavaScript's native JSON.parse does at runtime).
    // To preserve key ordering (or sort keys alphabetically, which makes it much cleaner for translations),
    // we will sort the keys alphabetically.
    try {
        const parsed = JSON.parse(content);
        const sortedKeys = Object.keys(parsed).sort();
        const deduplicatedObj = {};
        sortedKeys.forEach(k => {
            deduplicatedObj[k] = parsed[k];
        });
        
        // Write the clean, sorted, deduplicated JSON back to the file
        const cleanJson = JSON.stringify(deduplicatedObj, null, 4);
        fs.writeFileSync(filePath, cleanJson, 'utf8');
        console.log(`✓ Successfully rewrote deduplicated and alphabetically sorted ${lang}/translation.json!`);
    } catch (err) {
        console.error(`Error parsing or writing JSON:`, err.message);
    }
});
