const fs = require('fs');

const keys = {
  "expand_empire_title": {
    "pt": "Expanda seu império.",
    "en": "Expand your empire.",
    "es": "Expande tu imperio.",
    "fr": "Étendez votre empire."
  },
  "expand_empire_desc": {
    "pt": "Adicione novas localizações e gerencie-as centralmente.",
    "en": "Add new locations and manage them centrally.",
    "es": "Agrega nuevas ubicaciones y adminístralas de forma centralizada.",
    "fr": "Ajoutez de nouveaux emplacements et gérez-les de manière centralisée."
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
