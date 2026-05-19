import fs from 'fs';
import path from 'path';

// Find all JS/JSX files
function findFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            findFiles(fullPath, fileList);
        } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
            fileList.push(fullPath);
        }
    }
    return fileList;
}

const srcFiles = findFiles('./src');
const keys = new Set();

// Extract t('key') and t("key")
const regex = /t\(['"]([a-zA-Z0-9_]+)['"]/g;

for (const file of srcFiles) {
    const content = fs.readFileSync(file, 'utf8');
    let match;
    while ((match = regex.exec(content)) !== null) {
        keys.add(match[1]);
    }
}

const locales = ['pt', 'en', 'es', 'fr'];
const newKeysCount = {};

// Hardcoded translations for known keys from Login to provide proper defaults
const knownTranslations = {
    pt: {
        system_mgmt_restaurants: "Sistema de Gestão de Restaurantes",
        system_mgmt_bars: "Sistema de Gestão de Bares",
        system_mgmt_cafes: "Sistema de Gestão de Cafés",
        system_mgmt_pastries: "Sistema de Gestão de Pastelarias",
        system_mgmt_snacks: "Sistema de Gestão de Lanchonetes",
        system_mgmt_pizzas: "Sistema de Gestão de Pizzarias",
        login_error_invalid_user: "Usuário inválido ou sem permissões",
        failed_login: "Falha ao fazer login",
        smart_digital_mgmt: "Gestão Digital Inteligente",
        email: "E-mail",
        password: "Palavra-passe",
        hide_password: "Ocultar palavra-passe",
        show_password: "Mostrar palavra-passe",
        forgot_password_q: "Esqueci minha senha",
        signing_in: "Entrando...",
        sign_in: "Entrar",
        dont_have_account: "Não tem conta?",
        register_here: "Registe-se aqui",
        developed_by: "Desenvolvido por",
        manage_everything_place: "Faça a Gestão de Tudo Num Só Lugar",
        control_orders_tables_desc: "Controle pedidos, mesas e finanças com uma plataforma intuitiva."
    },
    en: {
        system_mgmt_restaurants: "Restaurant Management System",
        system_mgmt_bars: "Bar Management System",
        system_mgmt_cafes: "Cafe Management System",
        system_mgmt_pastries: "Pastry Management System",
        system_mgmt_snacks: "Snack Bar Management System",
        system_mgmt_pizzas: "Pizzeria Management System",
        login_error_invalid_user: "Invalid user or permissions",
        failed_login: "Failed to login",
        smart_digital_mgmt: "Smart Digital Management",
        email: "Email",
        password: "Password",
        hide_password: "Hide password",
        show_password: "Show password",
        forgot_password_q: "Forgot my password",
        signing_in: "Signing in...",
        sign_in: "Sign in",
        dont_have_account: "Don't have an account?",
        register_here: "Register here",
        developed_by: "Developed by",
        manage_everything_place: "Manage Everything in One Place",
        control_orders_tables_desc: "Control orders, tables, and finances with an intuitive platform."
    },
    es: {
        system_mgmt_restaurants: "Sistema de Gestión de Restaurantes",
        system_mgmt_bars: "Sistema de Gestión de Bares",
        system_mgmt_cafes: "Sistema de Gestión de Cafeterías",
        system_mgmt_pastries: "Sistema de Gestión de Pastelerías",
        system_mgmt_snacks: "Sistema de Gestión de Bares",
        system_mgmt_pizzas: "Sistema de Gestión de Pizzerías",
        login_error_invalid_user: "Usuario inválido o sin permisos",
        failed_login: "Error al iniciar sesión",
        smart_digital_mgmt: "Gestión Digital Inteligente",
        email: "Correo electrónico",
        password: "Clave",
        hide_password: "Ocultar clave",
        show_password: "Mostrar clave",
        forgot_password_q: "Olvidé mi contraseña",
        signing_in: "Entrando...",
        sign_in: "Entrar",
        dont_have_account: "¿No tienes cuenta?",
        register_here: "Regístrate aquí",
        developed_by: "Desarrollado por",
        manage_everything_place: "Gestiona Todo en un Solo Lugar",
        control_orders_tables_desc: "Controla pedidos, mesas y finanzas con una plataforma intuitiva."
    },
    fr: {
        system_mgmt_restaurants: "Système de Gestion de Restaurants",
        system_mgmt_bars: "Système de Gestion de Bars",
        system_mgmt_cafes: "Système de Gestion de Cafés",
        system_mgmt_pastries: "Système de Gestion de Pâtisseries",
        system_mgmt_snacks: "Système de Gestion de Snacks",
        system_mgmt_pizzas: "Système de Gestion de Pizzerias",
        login_error_invalid_user: "Utilisateur invalide ou sans permissions",
        failed_login: "Échec de la connexion",
        smart_digital_mgmt: "Gestion Numérique Intelligente",
        email: "E-mail",
        password: "Mot de passe",
        hide_password: "Cacher le mot de passe",
        show_password: "Afficher le mot de passe",
        forgot_password_q: "Mot de passe oublié",
        signing_in: "Connexion...",
        sign_in: "Se connecter",
        dont_have_account: "Vous n'avez pas de compte ?",
        register_here: "Inscrivez-vous ici",
        developed_by: "Développé par",
        manage_everything_place: "Gérez Tout en un Seul Endroit",
        control_orders_tables_desc: "Contrôlez les commandes, les tables et les finances avec une plateforme intuitive."
    }
};

for (const locale of locales) {
    const filePath = `./public/locales/${locale}/translation.json`;
    let content = {};
    if (fs.existsSync(filePath)) {
        content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }

    let added = 0;
    for (const key of keys) {
        if (!content[key]) {
            // Apply known translation or fall back to key name
            content[key] = knownTranslations[locale]?.[key] || key;
            added++;
        }
    }

    // Sort keys
    const sortedContent = {};
    Object.keys(content).sort().forEach(k => {
        sortedContent[k] = content[k];
    });

    fs.writeFileSync(filePath, JSON.stringify(sortedContent, null, 4), 'utf8');
    newKeysCount[locale] = added;
}

console.log('Missing keys added per locale:', newKeysCount);
