import fs from 'fs';
import path from 'path';

const localesDir = 'd:/Projectos/restaurante-demo/qr-menu/admin-dashboard/public/locales';
const langs = ['pt', 'en', 'es', 'fr'];

langs.forEach(lang => {
    const filePath = path.join(localesDir, lang, 'translation.json');
    if (fs.existsSync(filePath)) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            // JSON.parse naturally deduplicates keys (last one wins)
            const obj = JSON.parse(content);
            const cleanContent = JSON.stringify(obj, null, 4);
            fs.writeFileSync(filePath, cleanContent);
            console.log(`✓ Deduplicated ${lang}/translation.json`);
        } catch (e) {
            console.error(`Error processing ${lang}:`, e.message);
        }
    }
});
