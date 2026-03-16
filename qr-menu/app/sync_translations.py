import json
import os

languages = ['pt', 'en', 'es', 'fr']
base_path = r'd:\Projectos\restaurante-demo\qr-menu\app\i18n\locales'

def clean_json(file_path):
    if not os.path.exists(file_path):
        return {}
    with open(file_path, 'r', encoding='utf-8') as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError:
            data = {}
    return data

all_data = {}
for lang in languages:
    path = os.path.join(base_path, lang, 'translation.json')
    all_data[lang] = clean_json(path)

all_keys = set()
for lang in languages:
    all_keys.update(all_data[lang].keys())

new_keys_info = {
    "cancel": {"pt": "Cancelar", "en": "Cancel", "es": "Cancelar", "fr": "Annuler"},
    "tax": {"pt": "IVA", "en": "Tax", "es": "Impuesto", "fr": "Taxe"},
    "city": {"pt": "Cidade", "en": "City", "es": "Ciudad", "fr": "Ville"},
    "contact_phone": {"pt": "Telefone de Contacto", "en": "Contact Phone", "es": "Teléfono de Contacto", "fr": "Téléphone de Contact"},
    "mpesa": {"pt": "M-Pesa", "en": "M-Pesa", "es": "M-Pesa", "fr": "M-Pesa"},
    "emola": {"pt": "e-Mola", "en": "e-Mola", "es": "e-Mola", "fr": "e-Mola"},
    "discount": {"pt": "Desconto", "en": "Discount", "es": "Descuento", "fr": "Remise"},
    "feedback_title": {"pt": "Avaliação", "en": "Feedback", "es": "Evaluación", "fr": "Évaluation"},
    "invalid_table_code": {"pt": "Código da mesa inválido", "en": "Invalid table code", "es": "Código de mesa inválido", "fr": "Code de table invalide"},
    "error_validating_code": {"pt": "Erro ao validar código", "en": "Error validating code", "es": "Error al validar el código", "fr": "Erreur lors de la validation du code"},
    "loading_order_msg": {"pt": "Carregando pedido...", "en": "Loading order...", "es": "Cargando pedido...", "fr": "Chargement de la commande..."},
}

for key, translations in new_keys_info.items():
    all_keys.add(key)
    for lang in languages:
        if key not in all_data[lang] or all_data[lang][key] == "":
             all_data[lang][key] = translations[lang]

sorted_keys = sorted(list(all_keys))
for lang in languages:
    synced_data = {}
    for key in sorted_keys:
        if key in all_data[lang]:
            synced_data[key] = all_data[lang][key]
        else:
            synced_data[key] = all_data['en'].get(key, "")
    
    path = os.path.join(base_path, lang, 'translation.json')
    # Ensure directory exists
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(synced_data, f, ensure_ascii=False, indent=4)

print("Mobile app translation files synchronized and cleaned.")
