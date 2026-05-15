const fs = require('fs');

function unMojibake(str) {
    if (!str || typeof str !== 'string') return str;
    let current = str;
    
    // We will attempt to decode until it stops changing or errors
    for (let i = 0; i < 5; i++) {
        // Check if all characters are in the latin1 range (<= 0xFF)
        let isLatin1 = true;
        for (let j = 0; j < current.length; j++) {
            if (current.charCodeAt(j) > 0xFF) {
                isLatin1 = false;
                break;
            }
        }
        
        if (!isLatin1) {
            // It has real unicode characters (e.g., emojis or properly decoded accents)
            // It could be that part of the string is mojibake, but if it has chars > 0xFF, 
            // Buffer.from(current, 'latin1') will truncate them and destroy data.
            // But actually we can just manually replace the known sequences to be safe.
            break;
        }

        try {
            const decoded = Buffer.from(current, 'latin1').toString('utf8');
            if (decoded === current) break;
            if (decoded.includes('')) break; // invalid utf8 sequence
            current = decoded;
        } catch (e) {
            break;
        }
    }
    return current;
}

const replacements = {
    // Triple encoded (what we saw for ÃƒÂ¡ -> á)
    '\u00C3\u0083\u00C2\u00A3': 'ã',
    '\u00C3\u0083\u00C2\u00A7': 'ç',
    '\u00C3\u0083\u00C2\u00A1': 'á',
    '\u00C3\u0083\u00C2\u00A9': 'é',
    '\u00C3\u0083\u00C2\u00AD': 'í',
    '\u00C3\u0083\u00C2\u00B3': 'ó',
    '\u00C3\u0083\u00C2\u00BA': 'ú',
    '\u00C3\u0083\u00C2\u00AA': 'ê',
    '\u00C3\u0083\u00C2\u00A2': 'â',
    '\u00C3\u0083\u00C2\u00B5': 'õ',
    '\u00C3\u0083\u00C2\u0080': 'À',
    '\u00C3\u0083\u00C2\u0081': 'Á',
    '\u00C3\u0083\u00C2\u0089': 'É',
    '\u00C3\u0083\u00C2\u008D': 'Í',
    '\u00C3\u0083\u00C2\u0093': 'Ó',
    '\u00C3\u0083\u00C2\u009A': 'Ú',
    '\u00C3\u0083\u00C2\u0087': 'Ç',
    '\u00C3\u0083\u00C2\u0083': 'Ã',
    '\u00C3\u0083\u00C2\u0095': 'Õ',
    '\u00C3\u0083\u00C2\u008A': 'Ê',

    // Double encoded
    '\u00C3\u00A3': 'ã',
    '\u00C3\u00A7': 'ç',
    '\u00C3\u00A1': 'á',
    '\u00C3\u00A9': 'é',
    '\u00C3\u00AD': 'í',
    '\u00C3\u00B3': 'ó',
    '\u00C3\u00BA': 'ú',
    '\u00C3\u00AA': 'ê',
    '\u00C3\u00A2': 'â',
    '\u00C3\u00B5': 'õ',
    '\u00C3\u0080': 'À',
    '\u00C3\u0081': 'Á',
    '\u00C3\u0089': 'É',
    '\u00C3\u008D': 'Í',
    '\u00C3\u0093': 'Ó',
    '\u00C3\u009A': 'Ú',
    '\u00C3\u0087': 'Ç',
    '\u00C3\u0083': 'Ã',
    '\u00C3\u0095': 'Õ',
    '\u00C3\u008A': 'Ê'
};

function fixEncodingSafe(str) {
    if (!str || typeof str !== 'string') return str;
    let res = str;
    for (const [bad, good] of Object.entries(replacements)) {
        res = res.split(bad).join(good);
    }
    return res;
}

const files = [
    'd:\\Projectos\\restaurante-demo\\qr-menu\\admin-dashboard\\public\\locales\\pt\\translation.json',
    'd:\\Projectos\\restaurante-demo\\qr-menu\\admin-dashboard\\public\\locales\\fr\\translation.json',
    'd:\\Projectos\\restaurante-demo\\qr-menu\\admin-dashboard\\public\\locales\\es\\translation.json',
    'd:\\Projectos\\restaurante-demo\\qr-menu\\admin-dashboard\\src\\components\\DashboardLayout.jsx',
    'd:\\Projectos\\restaurante-demo\\qr-menu\\admin-dashboard\\src\\pages\\reports\\Razao.jsx',
    'd:\\Projectos\\restaurante-demo\\qr-menu\\admin-dashboard\\src\\pages\\reports\\ApuramentoIVA.jsx'
];

files.forEach(filePath => {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        
        let newContent = fixEncodingSafe(content);
        
        if (newContent !== content) {
            fs.writeFileSync(filePath, newContent, 'utf8');
            console.log(`Fixed encoding for ${filePath}`);
        } else {
            console.log(`No changes for ${filePath}`);
        }
    } catch (e) {
        console.log(`Error reading ${filePath}:`, e.message);
    }
});
