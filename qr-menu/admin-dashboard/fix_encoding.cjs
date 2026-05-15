const fs = require('fs');

function fixEncoding(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    try {
        let fixedContent = content;

        // Since it might be double corrupted, we decode twice.
        // We use a regular expression or replace known mappings to be safe, 
        // OR we can safely reverse the double encoding using buffers.
        
        // Reverse pass 1
        const buf1 = Buffer.from(fixedContent, 'utf8');
        let pass1 = '';
        // Manually convert utf8 bytes back to latin1 characters
        for (let i = 0; i < buf1.length; i++) {
            pass1 += String.fromCharCode(buf1[i]);
        }
        
        // Reverse pass 2
        const buf2 = Buffer.from(pass1, 'utf8');
        let pass2 = '';
        for (let i = 0; i < buf2.length; i++) {
            pass2 += String.fromCharCode(buf2[i]);
        }
        
        // However, this might break ASCII or single-byte chars if not careful? No, ASCII is identical.
        // But what if the file wasn't ENTIRELY double corrupted, just some parts?
        // Actually, let's just do string replacement for the known corrupted sequences to be 100% safe.
        
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
            'ÃƒÂ': 'Á',
            'ÃƒÂ‰': 'É',
            'ÃƒÂ': 'Í',
            'ÃƒÂ“': 'Ó',
            'ÃƒÂš': 'Ú',
            'ÃƒÂ‡': 'Ç',
            'ÃƒÂƒ': 'Ã',
            'ÃƒÂ•': 'Õ',
            'ÃƒÂŠ': 'Ê',
            // Also add single-pass corruptions just in case
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
            'Ã': 'Á',
            'Ã‰': 'É',
            'Ã': 'Í',
            'Ã“': 'Ó',
            'Ãš': 'Ú',
            'Ã‡': 'Ç',
            'Ãƒ': 'Ã',
            'Ã•': 'Õ',
            'ÃŠ': 'Ê',
            // Also the screenshot shows: "ProprietÃ¡rio" -> this is single-pass.
            // "GarÃ§ons" -> this is single-pass.
            // "EficiÃªncia" -> single pass.
            // Wait, the grep search showed: "GarÃƒÂ§om" (double-pass).
            // So we need to do double-pass replacements first, then single-pass replacements.
        };

        for (const [corrupt, fixed] of Object.entries(replacements)) {
            fixedContent = fixedContent.split(corrupt).join(fixed);
        }

        if (fixedContent !== content) {
            fs.writeFileSync(filePath, fixedContent, 'utf8');
            console.log(`Fixed encoding for ${filePath}`);
        } else {
            console.log(`No changes needed for ${filePath}`);
        }
    } catch (e) {
        console.error(`Error processing ${filePath}: ${e.message}`);
    }
}

const files = [
    'd:\\Projectos\\restaurante-demo\\qr-menu\\admin-dashboard\\public\\locales\\pt\\translation.json',
    'd:\\Projectos\\restaurante-demo\\qr-menu\\admin-dashboard\\public\\locales\\fr\\translation.json',
    'd:\\Projectos\\restaurante-demo\\qr-menu\\admin-dashboard\\public\\locales\\es\\translation.json',
    'd:\\Projectos\\restaurante-demo\\qr-menu\\admin-dashboard\\public\\locales\\en\\translation.json',
    'd:\\Projectos\\restaurante-demo\\qr-menu\\admin-dashboard\\src\\components\\DashboardLayout.jsx',
    'd:\\Projectos\\restaurante-demo\\qr-menu\\admin-dashboard\\src\\pages\\reports\\Razao.jsx',
    'd:\\Projectos\\restaurante-demo\\qr-menu\\admin-dashboard\\src\\pages\\reports\\ApuramentoIVA.jsx',
    'd:\\Projectos\\restaurante-demo\\qr-menu\\admin-dashboard\\src\\pages\\WaiterDashboard.jsx'
];

files.forEach(fixEncoding);
