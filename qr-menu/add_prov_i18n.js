const fs = require('fs');

const keys = {
  "cr_select_province": {
    "pt": "Selecione a província",
    "en": "Select the province",
    "es": "Seleccione la provincia",
    "fr": "Sélectionnez la province"
  },
  "cr_other": {
    "pt": "Outro",
    "en": "Other",
    "es": "Otro",
    "fr": "Autre"
  }
};

const locales = ['pt', 'en', 'es', 'fr'];

locales.forEach(lang => {
  const filepath = `admin-dashboard/public/locales/${lang}/translation.json`;
  const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
  
  for (const [key, translations] of Object.entries(keys)) {
    data[key] = translations[lang];
  }
  
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`Updated ${lang}/translation.json`);
});
