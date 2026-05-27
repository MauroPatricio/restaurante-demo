const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'public', 'locales');
const locales = ['en', 'es', 'fr', 'pt'];

const translations = {
  en: {
    categories: "Categories",
    categories_desc: "Organize your menu items by categories",
    new_category_btn: "New Category",
    total_categories: "Total Categories",
    active_categories: "Active Categories",
    total_items: "Total Items",
    all_categories: "All Categories",
    name: "Name",
    description: "Description",
    items: "Items",
    order: "Order",
    status: "Status",
    actions: "Actions",
    active: "Active",
    inactive: "Inactive",
    edit: "Edit",
    delete: "Delete",
    no_categories_found: "No categories found.",
    edit_category: "Edit Category",
    new_category: "New Category",
    category_name_placeholder: "Ex: Main Courses",
    description_placeholder: "Optional description",
    cancel: "Cancel",
    update: "Update",
    create: "Create",
    confirm_delete_category: "Are you sure you want to delete this category?"
  },
  es: {
    categories: "Categorías",
    categories_desc: "Organiza los elementos de tu menú por categorías",
    new_category_btn: "Nueva Categoría",
    total_categories: "Total de Categorías",
    active_categories: "Categorías Activas",
    total_items: "Total de Artículos",
    all_categories: "Todas las Categorías",
    name: "Nombre",
    description: "Descripción",
    items: "Artículos",
    order: "Orden",
    status: "Estado",
    actions: "Acciones",
    active: "Activo",
    inactive: "Inactivo",
    edit: "Editar",
    delete: "Eliminar",
    no_categories_found: "No se encontraron categorías.",
    edit_category: "Editar Categoría",
    new_category: "Nueva Categoría",
    category_name_placeholder: "Ej: Platos Principales",
    description_placeholder: "Descripción opcional",
    cancel: "Cancelar",
    update: "Actualizar",
    create: "Crear",
    confirm_delete_category: "¿Estás seguro de que deseas eliminar esta categoría?"
  },
  fr: {
    categories: "Catégories",
    categories_desc: "Organisez les éléments de votre menu par catégories",
    new_category_btn: "Nouvelle Catégorie",
    total_categories: "Total des Catégories",
    active_categories: "Catégories Actives",
    total_items: "Total des Articles",
    all_categories: "Toutes les Catégories",
    name: "Nom",
    description: "Description",
    items: "Articles",
    order: "Ordre",
    status: "Statut",
    actions: "Actions",
    active: "Actif",
    inactive: "Inactif",
    edit: "Modifier",
    delete: "Supprimer",
    no_categories_found: "Aucune catégorie trouvée.",
    edit_category: "Modifier la Catégorie",
    new_category: "Nouvelle Catégorie",
    category_name_placeholder: "Ex : Plats Principaux",
    description_placeholder: "Description facultative",
    cancel: "Annuler",
    update: "Mettre à jour",
    create: "Créer",
    confirm_delete_category: "Êtes-vous sûr de vouloir supprimer cette catégorie ?"
  },
  pt: {
    categories: "Categorias",
    categories_desc: "Organize os itens do seu menu por categorias",
    new_category_btn: "Nova Categoria",
    total_categories: "Total de Categorias",
    active_categories: "Categorias Activas",
    total_items: "Total de Itens",
    all_categories: "Todas as Categorias",
    name: "Nome",
    description: "Descrição",
    items: "Itens",
    order: "Ordem",
    status: "Estado",
    actions: "Acções",
    active: "Activo",
    inactive: "Inactivo",
    edit: "Editar",
    delete: "Apagar",
    no_categories_found: "Nenhuma categoria encontrada.",
    edit_category: "Editar Categoria",
    new_category: "Nova Categoria",
    category_name_placeholder: "Ex: Pratos Principais",
    description_placeholder: "Descrição opcional",
    cancel: "Cancelar",
    update: "Actualizar",
    create: "Criar",
    confirm_delete_category: "Deseja eliminar esta categoria?"
  }
};

locales.forEach(locale => {
  const filePath = path.join(localesDir, locale, 'translation.json');
  if (fs.existsSync(filePath)) {
    try {
      const data = fs.readFileSync(filePath, 'utf8');
      const json = JSON.parse(data);
      
      let updated = false;
      const trans = translations[locale];
      for (const [key, value] of Object.entries(trans)) {
        // Always overwrite the key with the correct translated string to ensure categories_desc etc are updated
        if (json[key] !== value) {
          json[key] = value;
          updated = true;
        }
      }
      
      if (updated) {
        fs.writeFileSync(filePath, JSON.stringify(json, null, 2), 'utf8');
        console.log(`Updated ${locale}/translation.json`);
      } else {
        console.log(`No updates needed for ${locale}/translation.json`);
      }
    } catch (err) {
      console.error(`Error processing ${locale}:`, err);
    }
  }
});
