const fs = require('fs');

const keys = {
  "cr_title": {
    "pt": "🏭 Novo Restaurante",
    "en": "🏭 New Restaurant",
    "es": "🏭 Nuevo Restaurante",
    "fr": "🏭 Nouveau Restaurant"
  },
  "cr_subtitle": {
    "pt": "Configure os detalhes do seu novo estabelecimento",
    "en": "Configure the details of your new establishment",
    "es": "Configure los detalles de su nuevo establecimiento",
    "fr": "Configurez les détails de votre nouvel établissement"
  },
  "cr_logo": {
    "pt": "Logo do Restaurante",
    "en": "Restaurant Logo",
    "es": "Logotipo del Restaurante",
    "fr": "Logo du Restaurant"
  },
  "cr_img_size_error": {
    "pt": "Imagem muito grande. Máximo 10MB.",
    "en": "Image too large. Maximum 10MB.",
    "es": "Imagen demasiado grande. Máximo 10MB.",
    "fr": "Image trop grande. Maximum 10 Mo."
  },
  "cr_name": {
    "pt": "Nome do Restaurante",
    "en": "Restaurant Name",
    "es": "Nombre del Restaurante",
    "fr": "Nom du Restaurant"
  },
  "cr_name_placeholder": {
    "pt": "Ex: Pizzaria do Zé",
    "en": "E.g.: Joe's Pizzeria",
    "es": "Ej.: Pizzería de Pepe",
    "fr": "Ex.: Pizzeria de Jean"
  },
  "cr_street": {
    "pt": "Rua/Avenida",
    "en": "Street/Avenue",
    "es": "Calle/Avenida",
    "fr": "Rue/Avenue"
  },
  "cr_street_placeholder": {
    "pt": "Ex: Av. 24 de Julho",
    "en": "E.g.: 5th Avenue",
    "es": "Ej.: Av. de Mayo",
    "fr": "Ex.: Avenue des Champs-Élysées"
  },
  "cr_number": {
    "pt": "Número",
    "en": "Number",
    "es": "Número",
    "fr": "Numéro"
  },
  "cr_number_placeholder": {
    "pt": "Ex: 123",
    "en": "E.g.: 123",
    "es": "Ej.: 123",
    "fr": "Ex.: 123"
  },
  "cr_neighborhood": {
    "pt": "Bairro",
    "en": "Neighborhood",
    "es": "Barrio",
    "fr": "Quartier"
  },
  "cr_neighborhood_placeholder": {
    "pt": "Ex: Polana",
    "en": "E.g.: Downtown",
    "es": "Ej.: Centro",
    "fr": "Ex.: Centre-ville"
  },
  "cr_city": {
    "pt": "Cidade",
    "en": "City",
    "es": "Ciudad",
    "fr": "Ville"
  },
  "cr_phone": {
    "pt": "Telefone (Comercial)",
    "en": "Phone (Commercial)",
    "es": "Teléfono (Comercial)",
    "fr": "Téléphone (Commercial)"
  },
  "cr_email": {
    "pt": "Email (Comercial)",
    "en": "Email (Commercial)",
    "es": "Correo (Comercial)",
    "fr": "E-mail (Commercial)"
  },
  "cr_cancel": {
    "pt": "Cancelar",
    "en": "Cancel",
    "es": "Cancelar",
    "fr": "Annuler"
  },
  "cr_creating": {
    "pt": "A criar...",
    "en": "Creating...",
    "es": "Creando...",
    "fr": "Création..."
  },
  "cr_submit": {
    "pt": "Criar Restaurante",
    "en": "Create Restaurant",
    "es": "Crear Restaurante",
    "fr": "Créer le Restaurant"
  },
  "cr_success_msg": {
    "pt": "Restaurante criado com sucesso!",
    "en": "Restaurant created successfully!",
    "es": "¡Restaurante creado con éxito!",
    "fr": "Restaurant créé avec succès !"
  },
  "cr_error_msg": {
    "pt": "Falha ao criar restaurante",
    "en": "Failed to create restaurant",
    "es": "Error al crear el restaurante",
    "fr": "Échec de la création du restaurant"
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
