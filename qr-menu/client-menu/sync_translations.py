import json
import os

languages = ['pt', 'en', 'es', 'fr']
base_path = r'd:\Projectos\restaurante-demo\qr-menu\client-menu\public\locales'

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
    "error_invalid_qr_params": {"pt": "QR Code inválido. Parâmetros faltando.", "en": "Invalid QR Code. Parameters missing.", "es": "Código QR inválido. Faltan parámetros.", "fr": "Code QR invalide. Paramètres manquants."},
    "error_invalid_server_response": {"pt": "Servidor retornou resposta inválida (não JSON)", "en": "Server returned invalid response (non-JSON)", "es": "El servidor devolvió una respuesta inválida (no JSON)", "fr": "O servidor a renvoyé une réponse invalide (non JSON)"},
    "error_validating_qr": {"pt": "Erro ao validar QR Code", "en": "Error validating QR Code", "es": "Error al validar el código QR", "fr": "Ereur lors de la validation du code QR"},
    "error_connecting_server": {"pt": "Erro ao conectar com o servidor. Por favor, tente novamente.", "en": "Error connecting to the server. Please try again.", "es": "Error al conectar con el servidor. Por favor, inténtelo de nuevo.", "fr": "Erreur de connexion au serveur. Veuillez réessayer."},
    "access_menu_desc": {"pt": "Acesse o menu da sua mesa", "en": "Access the menu of your table", "es": "Acceda al menú de su mesa", "fr": "Accédez au menu de votre table"},
    "table_code_label": {"pt": "Código da Mesa", "en": "Table Code", "es": "Código de la Mesa", "fr": "Code de la Table"},
    "verifying": {"pt": "Verificando...", "en": "Verifying...", "es": "Verificando...", "fr": "Vérification..."},
    "access_menu_btn": {"pt": "Acessar Menu", "en": "Access Menu", "es": "Acceder al Menú", "fr": "Accéder au Menu"},
    "scan_qr_hint": {"pt": "Ou escaneie o QR Code na sua mesa", "en": "Or scan the QR Code on your table", "es": "O escanee el código QR en su mesa", "fr": "Ou scannez le code QR sur votre table"},
    "popular": {"pt": "POPULAR", "en": "POPULAR", "es": "POPULAR", "fr": "POPULAIRE"},
    "item_label": {"pt": "Item", "en": "Item", "es": "Artículo", "fr": "Article"},
    "please_enter_name": {"pt": "Por favor, informe seu nome", "en": "Please enter your name", "es": "Por favor, ingrese su nombre", "fr": "Veuillez entrer votre nom"},
    "please_enter_phone": {"pt": "Por favor, informe seu número de telefone", "en": "Please enter your phone number", "es": "Por favor, ingrese su número de teléfono", "fr": "Veuillez entrer votre numéro de téléphone"},
    "error_missing_session": {"pt": "Mesa ou sessão não identificada. Por favor, escaneie o QR Code novamente.", "en": "Table or session not identified. Please scan the QR Code again.", "es": "Mesa o sesión não identificada. Por favor, escanee el código QR nuevamente.", "fr": "Table ou session non identifiée. Veuillez scanner à nouveau le code QR."},
    "customer": {"pt": "Cliente", "en": "Customer", "es": "Cliente", "fr": "Client"},
    "error": {"pt": "Erro", "en": "Error", "es": "Error", "fr": "Erreur"},
    "retry": {"pt": "Tentar Novamente", "en": "Retry", "es": "Reintentar", "fr": "Réessayer"},
    "connected": {"pt": "Conectado", "en": "Connected", "es": "Conectado", "fr": "Connecté"},
    "disconnected": {"pt": "Desconectado", "en": "Disconnected", "es": "Desconectado", "fr": "Déconnecté"},
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

print("Client menu translation files synchronized and cleaned.")
