const fs = require('fs');

function fixJsonEncoding(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Sometimes the corruption is literal string "\\u00c3\\u0083" etc
    // Or it's actual characters.
    
    const replacements = {
        'ÃƒÂ£': 'ã',
        'ÃƒÂ§': 'ç',
        'ÃƒÂ¡': 'á',
        'ÃƒÂ©': 'é',
        'ÃƒÂ­': 'í',
        'ÃƒÂ³': 'ó',
        'ÃƒÂº': 'ú',
        'ÃƒÂª': 'ê',
        'ÃƒÂ¢': 'â',
        'ÃƒÂµ': 'õ',
        'ÃƒÂ€': 'À',
        'ÃƒÂ ': 'Á', // careful with this
        'ÃƒÂ‰': 'É',
        'ÃƒÂ ': 'Í',
        'ÃƒÂ“': 'Ó',
        'ÃƒÂš': 'Ú',
        'ÃƒÂ‡': 'Ç',
        'ÃƒÂƒ': 'Ã',
        'ÃƒÂ•': 'Õ',
        'ÃƒÂŠ': 'Ê',
        // Also single pass
        'Ã£': 'ã',
        'Ã§': 'ç',
        'Ã¡': 'á',
        'Ã©': 'é',
        'Ã­': 'í',
        'Ã³': 'ó',
        'Ãº': 'ú',
        'Ãª': 'ê',
        'Ã¢': 'â',
        'Ãµ': 'õ',
        'Ã€': 'À',
        'Ã ': 'Á',
        'Ã‰': 'É',
        'Ã ': 'Í',
        'Ã“': 'Ó',
        'Ãš': 'Ú',
        'Ã‡': 'Ç',
        'Ãƒ': 'Ã',
        'Ã•': 'Õ',
        'ÃŠ': 'Ê',
    };

    let modified = false;
    
    try {
        let data = JSON.parse(content);
        
        function fixObj(obj) {
            for (let key in obj) {
                if (typeof obj[key] === 'string') {
                    let oldStr = obj[key];
                    let newStr = oldStr;
                    for (const [corrupt, fixed] of Object.entries(replacements)) {
                        newStr = newStr.split(corrupt).join(fixed);
                    }
                    if (newStr !== oldStr) {
                        obj[key] = newStr;
                        modified = true;
                    }
                } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                    fixObj(obj[key]);
                }
            }
        }
        
        fixObj(data);
        
        if (modified) {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf8');
            console.log(`Fixed JSON encoding for ${filePath}`);
        } else {
            console.log(`No changes needed for ${filePath}`);
        }
        
    } catch(e) {
        console.error("Error parsing JSON:", e);
    }
}

fixJsonEncoding('d:\\Projectos\\restaurante-demo\\qr-menu\\admin-dashboard\\public\\locales\\pt\\translation.json');
