





import fs from 'fs';
import path from 'path';

const localesPath = 'd:/Projectos/restaurante-demo/qr-menu/admin-dashboard/src/locales';
const languages = ['pt', 'en', 'es', 'fr'];

const translations = {
    pt: {
        processing: "A processar...",
        please_wait: "Por favor, aguarde...",
        processing_request: "Por favor, aguarde enquanto processamos sua solicitação."
    },
    en: {
        processing: "Processing...",
        please_wait: "Please wait...",
        processing_request: "Please wait while we process your request."
    },
    es: {
        processing: "Procesando...",
        please_wait: "Procesando...",
        processing_request: "Por favor, espere mientras procesamos su solicitud."
    },
    fr: {
        processing: "Traitement en cours...",
        please_wait: "Veuillez patienter...",
        processing_request: "Veuillez patienter pendant que nous traitons votre demande."
    }
};

languages.forEach(lang => {
    const filePath = path.join(localesPath, lang, 'translation.json');
    if (fs.existsSync(filePath)) {
        try {
            const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            Object.assign(content, translations[lang]);
            fs.writeFileSync(filePath, JSON.stringify(content, null, 4), 'utf8');
            console.log(`Updated admin-dashboard ${lang} translations.`);
        } catch (e) {
            console.error(`Error updating admin-dashboard ${lang}:`, e.message);
        }
    } else {
        console.warn(`File not found: ${filePath}`);
    }
});
