import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Translations for Client Menu
const resources = {
    en: {
        translation: {
            "menu_title": "Our Menu",
            "categories": "Categories",
            "add_to_cart": "Add to Cart",
            "cart": "Cart",
            "checkout": "Checkout",
            "total": "Total",
            "empty_cart": "Your cart is empty",
            "scan_qr": "Scan QR Code",
            "scanning": "Scanning...",
            "welcome_guest": "Welcome",
            "search_placeholder": "Search items...",
            "filter_all": "All",
            "item_added": "Item added to cart",
            "order_success": "Order placed successfully!",
            "table": "Table",
            "language": "Language",
            "ingredients": "Ingredients",
            "allergens": "Allergens",
            "prep_time": "Prep time",
            "min": "min",
            "currency": "MT",
            "view_details": "View Details",
            "close": "Close",
            "confirm_order": "Confirm Order",
            "order_status_pending": "Pending",
            "order_status_preparing": "Preparing",
            "order_status_ready": "Ready",
            "order_status_delivered": "Delivered"
        }
    },
    pt: {
        translation: {
            "menu_title": "Nosso Menu",
            "categories": "Categorias",
            "add_to_cart": "Adicionar",
            "cart": "Carrinho",
            "checkout": "Finalizar Pedido",
            "total": "Total",
            "empty_cart": "Seu carrinho está vazio",
            "scan_qr": "Escanear QR Code",
            "scanning": "Escaneando...",
            "welcome_guest": "Bem-vindo",
            "search_placeholder": "Buscar itens...",
            "filter_all": "Todos",
            "item_added": "Item adicionado ao carrinho",
            "order_success": "Pedido realizado com sucesso!",
            "table": "Mesa",
            "language": "Idioma",
            "ingredients": "Ingredientes",
            "allergens": "Alergénios",
            "prep_time": "Tempo de preparo",
            "min": "min",
            "currency": "MT",
            "view_details": "Ver Detalhes",
            "close": "Fechar",
            "confirm_order": "Confirmar Pedido",
            "order_status_pending": "Pendente",
            "order_status_preparing": "Preparando",
            "order_status_ready": "Pronto",
            "order_status_delivered": "Entregue"
        }
    },
    es: {
        translation: {
            "menu_title": "Nuestro Menú",
            "categories": "Categorías",
            "add_to_cart": "Añadir",
            "cart": "Carrito",
            "checkout": "Finalizar Pedido",
            "total": "Total",
            "empty_cart": "Tu carrito está vacío",
            "scan_qr": "Escanear Código QR",
            "scanning": "Escaneando...",
            "welcome_guest": "Bienvenido",
            "search_placeholder": "Buscar artículos...",
            "filter_all": "Todos",
            "item_added": "Artículo añadido al carrito",
            "order_success": "¡Pedido realizado con éxito!",
            "table": "Mesa",
            "language": "Idioma",
            "ingredients": "Ingredientes",
            "allergens": "Alérgenos",
            "prep_time": "Tiempo de preparación",
            "min": "min",
            "currency": "MT",
            "view_details": "Ver Detalles",
            "close": "Cerrar",
            "confirm_order": "Confirmar Pedido",
            "order_status_pending": "Pendiente",
            "order_status_preparing": "Preparando",
            "order_status_ready": "Listo",
            "order_status_delivered": "Entregado"
        }
    }
};

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: "pt", // Default language
        fallbackLng: "en",
        interpolation: {
            escapeValue: false
        }
    });

export default i18n;
