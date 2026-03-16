const fs = require('fs');
const path = require('path');

const baseDir = 'd:/Projectos/restaurante-demo/qr-menu/admin-dashboard/public/locales';
const languages = ['en', 'es', 'fr'];
const sourceLang = 'pt';

const sourceFilePath = path.join(baseDir, sourceLang, 'translation.json');
const sourceData = JSON.parse(fs.readFileSync(sourceFilePath, 'utf8'));

// Simple translation map for common keys if I can't auto-translate everything perfectly, 
// but I'll try to provide reasonable translations for the missing ones.

languages.forEach(lang => {
    const targetFilePath = path.join(baseDir, lang, 'translation.json');
    let targetData = {};
    if (fs.existsSync(targetFilePath)) {
        targetData = JSON.parse(fs.readFileSync(targetFilePath, 'utf8'));
    }

    let updated = false;
    Object.keys(sourceData).forEach(key => {
        if (!targetData[key]) {
            // For now, I'll just put placeholder or the source text if I don't have a translation
            // But since I'm an AI, I can actually provide the translations here in a batch if I want.
            // However, it's better to do it programmatically if possible.
            // I will identify missing keys first.
            targetData[key] = sourceData[key]; 
            updated = true;
        }
    });

    if (updated) {
        // fs.writeFileSync(targetFilePath, JSON.stringify(targetData, null, 4), 'utf8');
        console.log(`Missing keys identified for ${lang}`);
    }
});
