const fs = require('fs');

const ptPath = 'admin-dashboard/public/locales/pt/translation.json';
const enPath = 'admin-dashboard/public/locales/en/translation.json';
const esPath = 'admin-dashboard/public/locales/es/translation.json';
const frPath = 'admin-dashboard/public/locales/fr/translation.json';

const ptData = JSON.parse(fs.readFileSync(ptPath, 'utf8'));
const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const esData = JSON.parse(fs.readFileSync(esPath, 'utf8'));
const frData = JSON.parse(fs.readFileSync(frPath, 'utf8'));

// Updates map: { "key": ["PT", "EN", "ES", "FR"] }
const updates = {
  "address": ["Endereço", "Address", "Dirección", "Adresse"],
  "admin_control_center": ["Centro de Controlo Admin", "Admin Control Center", "Centro de Control de Administración", "Centre de Contrôle d'Administration"],
  "analytics": ["Analítica", "Analytics", "Análisis", "Analyses"],
  "available": ["Disponível", "Available", "Disponible", "Disponible"],
  "available_quantity": ["Quantidade Disponível", "Available Quantity", "Cantidad Disponible", "Quantité Disponible"],
  "average": ["média", "Average", "Promedio", "Moyenne"],
  "avg_service_time": ["Tempo Médio de Serviço", "Average Service Time", "Tiempo Medio de Servicio", "Temps de Service Moyen"],
  "back_btn": ["Voltar", "Back", "Volver", "Retour"],
  "back_to_login": ["Voltar ao Login", "Back to Login", "Volver al Inicio de Sesión", "Retour à la Connexion"],
  "balancete_btn": ["Balancete", "Trial Balance", "Balance de Comprobación", "Balance de Vérification"],
  "canvas": ["Tela", "Canvas", "Lienzo", "Toile"],
  "cart_empty_desc": ["Adicione itens do menu para começar", "Add menu items to start", "Agregue artículos del menú para comenzar", "Ajoutez des articles du menu pour commencer"],
  "check_spam_folder": ["Não se esqueça de verificar a sua pasta de spam se não encontrar o email.", "Don't forget to check your spam folder if you can't find the email.", "No olvide revisar su carpeta de spam si no encuentra el correo electrónico.", "N'oubliez pas de vérifier votre dossier de courriers indésirables si vous ne trouvez pas l'e-mail."],
  "choose_new_password": ["Escolher Nova Senha", "Choose New Password", "Elegir Nueva Contraseña", "Choisir un Nouveau Mot de Passe"],
  "clean": ["Limpo", "Clean", "Limpio", "Propre"],
  "clear_cart": ["Limpar carrinho", "Clear Cart", "Vaciar Carrito", "Vider le Panier"],
  "close_shift": ["Fechar Turno", "Close Shift", "Cerrar Turno", "Fermer le Service"],
  "code": ["Código", "Code", "Código", "Code"],
  "completed_today_kpi": ["FEITOS HOJE", "COMPLETED TODAY", "COMPLETADOS HOY", "TERMINÉS AUJOURD'HUI"],
  "confirm_new_password": ["Confirmar Nova Senha", "Confirm New Password", "Confirmar Nueva Contraseña", "Confirmer le Nouveau Mot de Passe"],
  "connected": ["Conectado", "Connected", "Conectado", "Connecté"],
  "currencies_title": ["Moedas", "Currencies", "Monedas", "Devises"],
  "day_": ["dia_", "day_", "día_", "jour_"],
  "default_currency": ["Moeda Padrão", "Default Currency", "Moneda Predeterminada", "Devise par Défaut"],
  "edit_item": ["Editar Item", "Edit Item", "Editar Artículo", "Modifier l'Article"],
  "email_sent": ["Email Enviado", "Email Sent", "Correo Enviado", "E-mail Envoyé"],
  "error": ["Erro", "Error", "Error", "Erreur"],
  "error_acknowledge_call": ["Erro ao atender chamada", "Failed to acknowledge call.", "Error al atender la llamada.", "Échec de la prise en charge de l'appel."],
  "error_loading": ["Erro ao carregar", "Error loading", "Error al cargar", "Erreur de chargement"],
  "error_resolve_call": ["Erro ao resolver chamada", "Failed to resolve call.", "Error al resolver la llamada.", "Échec de la résolution de l'appel."],
  "error_saving": ["Erro ao gravar", "Error saving", "Error al guardar", "Erreur d'enregistrement"],
  "export_trial_pdf": ["Exportar Balancete (PDF)", "Export Trial Balance (PDF)", "Exportar Balance de Comprobación (PDF)", "Exporter la Balance de Vérification (PDF)"],
  "failed_to_reset_password": ["Falha ao redefinir a senha", "Failed to reset password", "Error al restablecer la contraseña", "Échec de la réinitialisation du mot de passe"],
  "failed_to_send_email": ["Falha ao enviar email", "Failed to send email", "Error al enviar el correo", "Échec de l'envoi de l'e-mail"],
  "failed_update_table": ["Falha ao atualizar mesa", "Failed to update table", "Error al actualizar la mesa", "Échec de la mise à jour de la table"],
  "filtered_items": ["Itens Filtrados", "Filtered Items", "Artículos Filtrados", "Articles Filtrés"],
  "fri": ["Sex", "Fri", "Vie", "Ven"],
  "generate_report": ["Gerar Relatório", "Generate Report", "Generar Informe", "Générer le Rapport"],
  "in_progress": ["Em Progresso", "In Progress", "En Progreso", "En Cours"],
  "info": ["Info", "Info", "Info", "Info"],
  "ka_avg_prep_short": ["Tempo Médio", "Avg Prep", "Prep. Media", "Prép. Moy."],
  "ka_bottleneck_count": ["{{count}} prato(s)", "{{count}} dish(es)", "{{count}} plato(s)", "{{count}} plat(s)"],
  "ka_bottleneck_msg": ["com tempo médio de preparo acima de 30 minutos", "with an average prep time over 30 minutes", "con un tiempo medio de preparación superior a 30 minutos", "avec un temps de préparation moyen supérieur à 30 minutes"],
  "ka_col_avg_time": ["Tempo Médio", "Avg Time", "Tiempo Medio", "Temps Moyen"],
  "ka_col_category": ["Categoria", "Category", "Categoría", "Catégorie"],
  "ka_col_dishes": ["Pratos", "Dishes", "Platos", "Plats"],
  "ka_col_efficiency": ["Eficiência", "Efficiency", "Eficiencia", "Efficacité"],
  "ka_col_orders": ["Pedidos", "Orders", "Pedidos", "Commandes"],
  "ka_col_revenue": ["Receita", "Revenue", "Ingresos", "Revenus"],
  "ka_orders_count": ["{{count}} pedidos", "{{count}} orders", "{{count}} pedidos", "{{count}} commandes"],
  "ka_orders_unit": ["pedidos", "orders", "pedidos", "commandes"],
  "ka_peak_tag": ["Pico: {{hour}}", "Peak: {{hour}}", "Pico: {{hour}}", "Pic : {{hour}}"],
  "ka_peak_tag_long": ["Hora de Pico: {{hour}}", "Peak Hour: {{hour}}", "Hora Pico: {{hour}}", "Heure de Pointe : {{hour}}"],
  "ka_shift_": ["Turno_", "Shift_", "Turno_", "Quart_"],
  "kitchen_status": ["Estado da Cozinha", "Kitchen Status", "Estado de la Cocina", "Statut de la Cuisine"],
  "loading_currencies": ["A carregar moedas...", "Loading currencies...", "Cargando monedas...", "Chargement des devises..."],
  "max": ["Máx", "Max", "Máx", "Max"],
  "method": ["Método", "Method", "Método", "Méthode"],
  "min": ["Mín", "Min", "Mín", "Min"],
  "minimum_stock": ["Stock Mínimo", "Minimum Stock", "Stock Mínimo", "Stock Minimum"],
  "mon": ["Seg", "Mon", "Lun", "Lun"],
  "monitoring": ["Monitoramento", "Monitoring", "Monitoreo", "Surveillance"],
  "move_to": ["Mover para", "Move to", "Mover a", "Déplacer vers"],
  "na": ["N/A", "N/A", "N/D", "N/A"],
  "new_password": ["Nova Senha", "New Password", "Nueva Contraseña", "Nouveau Mot de Passe"],
  "no_customers_data": ["Nenhum dado de clientes disponível.", "No customer data available.", "No hay datos de clientes disponibles.", "Aucune donnée client disponible."],
  "no_data_to_export": ["Sem dados para exportar", "No data to export", "No hay datos para exportar", "Aucune donnée à exporter"],
  "no_items_found": ["Nenhum item encontrado", "No items found", "No se encontraron artículos", "Aucun article trouvé"],
  "no_subscriptions": ["Nenhuma subscrição encontrada", "No subscriptions found", "No se encontraron suscripciones", "Aucun abonnement trouvé"],
  "notes": ["Notas", "Notes", "Notas", "Notes"],
  "offline": ["Offline", "Offline", "Desconectado", "Hors ligne"],
  "open": ["Aberto", "Open", "Abierto", "Ouvert"],
  "open_shift": ["Abrir Turno", "Open Shift", "Abrir Turno", "Ouvrir un Service"],
  "order_active": ["Pedido Ativo", "Active Order", "Pedido Activo", "Commande Active"],
  "password_reset_success": ["Senha redefinida com sucesso!", "Password reset successful!", "¡Contraseña restablecida con éxito!", "Mot de passe réinitialisé avec succès !"],
  "password_reset_success_title": ["Redefinição de Senha", "Password Reset", "Restablecimiento de Contraseña", "Réinitialisation du Mot de Passe"],
  "password_too_short": ["A senha é muito curta", "Password is too short", "La contraseña es muy corta", "Le mot de passe est trop court"],
  "passwords_dont_match": ["As senhas não coincidem", "Passwords don't match", "Las contraseñas no coinciden", "Les mots de passe ne correspondent pas"],
  "people": ["pessoas", "people", "personas", "personnes"],
  "phone": ["Telefone", "Phone", "Teléfono", "Téléphone"],
  "places": ["lugares", "places", "lugares", "places"],
  "plan_label": ["Plano", "Plan", "Plan", "Plan"],
  "post_selected": ["Lançar Selecionados", "Post Selected", "Contabilizar Seleccionados", "Enregistrer la Sélection"],
  "receipt_title": ["Recibo", "Receipt", "Recibo", "Reçu"],
  "recover_password": ["Recuperar Senha", "Recover Password", "Recuperar Contraseña", "Récupérer le Mot de Passe"],
  "recover_password_desc": ["Insira o seu email para receber um link de redefinição.", "Enter your email to receive a reset link.", "Ingrese su correo para recibir un enlace de restablecimiento.", "Entrez votre e-mail pour recevoir un lien de réinitialisation."],
  "redirecting_to_login": ["Redirecionando para o login...", "Redirecting to login...", "Redirigiendo al inicio de sesión...", "Redirection vers la connexion..."],
  "remaining": ["restantes", "remaining", "restantes", "restants"],
  "reset_email_desc": ["Se o seu email estiver registado, receberá um link de recuperação em instantes.", "If your email is registered, you will receive a recovery link shortly.", "Si su correo está registrado, recibirá un enlace de recuperación en breve.", "Si votre e-mail est enregistré, vous recevrez un lien de récupération sous peu."],
  "reset_password": ["Redefinir Senha", "Reset Password", "Restablecer Contraseña", "Réinitialiser le Mot de Passe"],
  "restaurant_name": ["Nome do Restaurante", "Restaurant Name", "Nombre del Restaurante", "Nom du Restaurant"],
  "restaurant_settings": ["Configurações do Restaurante", "Restaurant Settings", "Configuración del Restaurante", "Paramètres du Restaurant"],
  "restaurant_settings_desc": ["Faça a gestão das configurações do seu restaurante aqui.", "Manage your restaurant settings here.", "Gestione la configuración de su restaurante aquí.", "Gérez les paramètres de votre restaurant ici."],
  "rs_btn_activate": ["Ativar", "Activate", "Activar", "Activer"],
  "rs_btn_create": ["✓ Criar Quarto", "✓ Create Room", "✓ Crear Habitación", "✓ Créer une Chambre"],
  "rs_btn_create_first": ["+ Criar Primeiro Quarto", "+ Create First Room", "+ Crear Primera Habitación", "+ Créer la Première Chambre"],
  "rs_btn_deactivate": ["Desativar", "Deactivate", "Desactivar", "Désactiver"],
  "rs_btn_delete": ["Eliminar", "Delete", "Eliminar", "Supprimer"],
  "rs_btn_download": ["Download", "Download", "Descargar", "Télécharger"],
  "rs_btn_regenerate": ["Regenerar", "Regenerate", "Regenerar", "Régénérer"],
  "rs_category": ["Categoria", "Category", "Categoría", "Catégorie"],
  "rs_confirm_delete": ["Eliminar quarto? Esta ação não pode ser revertida.", "Delete room? This action cannot be reversed.", "¿Eliminar habitación? Esta acción no se puede deshacer.", "Supprimer la chambre ? Cette action est irréversible."],
  "rs_confirm_regenerate": ["Regenerar QR do Quarto {{number}}? O QR anterior ficará inválido.", "Regenerate QR for Room {{number}}? The previous QR will become invalid.", "¿Regenerar QR de la Habitación {{number}}? El QR anterior dejará de ser válido.", "Régénérer le QR de la Chambre {{number}} ? L'ancien QR ne sera plus valide."],
  "rs_create_title": ["Criar Novo Quarto", "Create New Room", "Crear Nueva Habitación", "Créer une Nouvelle Chambre"],
  "rs_creating": ["A criar...", "Creating...", "Creando...", "Création..."],
  "rs_error_create": ["Erro ao criar quarto", "Error creating room", "Error al crear la habitación", "Erreur lors de la création de la chambre"],
  "rs_error_delete": ["Erro ao eliminar quarto", "Error deleting room", "Error al eliminar la habitación", "Erreur lors de la suppression de la chambre"],
  "rs_error_load": ["Erro ao carregar quartos", "Error loading rooms", "Error al cargar las habitaciones", "Erreur lors du chargement des chambres"],
  "rs_error_regenerate": ["Erro ao regenerar QR", "Error regenerating QR", "Error al regenerar el QR", "Erreur lors de la régénération du QR"],
  "rs_error_update": ["Erro ao atualizar quarto", "Error updating room", "Error al actualizar la habitación", "Erreur lors de la mise à jour de la chambre"],
  "rs_floor": ["Andar", "Floor", "Piso", "Étage"],
  "rs_floor_label": ["Andar", "Floor", "Piso", "Étage"],
  "rs_loading": ["A carregar quartos...", "Loading rooms...", "Cargando habitaciones...", "Chargement des chambres..."],
  "rs_new_room": ["Novo Quarto", "New Room", "Nueva Habitación", "Nouvelle Chambre"],
  "rs_no_rooms": ["Nenhum quarto registado", "No rooms registered", "Ninguna habitación registrada", "Aucune chambre enregistrée"],
  "rs_no_rooms_desc": ["Crie quartos para gerar QR Codes e ativar o Room Service", "Create rooms to generate QR Codes and activate Room Service", "Cree habitaciones para generar Códigos QR y activar el Room Service", "Créez des chambres pour générer des QR Codes et activer le Room Service"],
  "rs_notes": ["Notas internas", "Internal notes", "Notas internas", "Notes internes"],
  "rs_optional": ["opcional", "optional", "opcional", "facultatif"],
  "rs_placeholder_category": ["ex: Suíte Dupla", "e.g.: Double Suite", "ej.: Suite Doble", "ex. : Suite Double"],
  "rs_placeholder_floor": ["ex: 1", "e.g.: 1", "ej.: 1", "ex. : 1"],
  "rs_placeholder_number": ["ex: 101", "e.g.: 101", "ej.: 101", "ex. : 101"],
  "rs_qr_label": ["QR Code", "QR Code", "Código QR", "Code QR"],
  "rs_qr_not_available": ["QR Code não disponível", "QR Code not available", "Código QR no disponible", "Code QR non disponible"],
  "rs_room": ["Quarto", "Room", "Habitación", "Chambre"],
  "rs_room_number": ["Nº do Quarto *", "Room Number *", "Nº de Habitación *", "Nº de Chambre *"],
  "rs_status_active": ["ATIVO", "ACTIVE", "ACTIVO", "ACTIF"],
  "rs_status_inactive": ["INATIVO", "INACTIVE", "INACTIVO", "INACTIF"],
  "rs_subtitle": ["Gerir Room Service", "Manage Room Service", "Gestionar Servicio a la Habitación", "Gérer le Service en Chambre"],
  "rs_title": ["Gestão de Quartos", "Room Management", "Gestión de Habitaciones", "Gestion des Chambres"],
  "rs_view_qr": ["Ver QR Code", "View QR Code", "Ver Código QR", "Voir le Code QR"],
  "sales": ["vendas", "sales", "ventas", "ventes"],
  "sat": ["Sáb", "Sat", "Sáb", "Sam"],
  "select_currency": ["Selecionar Moeda", "Select Currency", "Seleccionar Moneda", "Sélectionner la Devise"],
  "send_link": ["Enviar Link", "Send Link", "Enviar Enlace", "Envoyer le Lien"],
  "sending": ["Enviando...", "Sending...", "Enviando...", "Envoi..."],
  "serve": ["Servir", "Serve", "Servir", "Servir"],
  "sort_by_revenue": ["Ordenar por Receita", "Sort by Revenue", "Ordenar por Ingresos", "Trier par Revenus"],
  "subscription_payment_failed": ["Falha no pagamento da subscrição", "Subscription payment failed", "Error en el pago de la suscripción", "Échec du paiement de l'abonnement"],
  "success": ["Sucesso", "Success", "Éxito", "Succès"],
  "sun": ["Dom", "Sun", "Dom", "Dim"],
  "system_language": ["Idioma do Sistema", "System Language", "Idioma del Sistema", "Langue du Système"],
  "system_settings": ["Configurações do Sistema", "System Settings", "Configuración del Sistema", "Paramètres du Système"],
  "thu": ["Qui", "Thu", "Jue", "Jeu"],
  "timezone": ["Fuso Horário", "Timezone", "Zona Horaria", "Fuseau Horaire"],
  "total_amount": ["Valor Total", "Total Amount", "Monto Total", "Montant Total"],
  "total_to_confirm": ["Total a Confirmar", "Total to Confirm", "Total a Confirmar", "Total à Confirmer"],
  "trial_balance_hint": ["Visão detalhada do balancete", "Detailed view of the trial balance", "Vista detallada del balance de comprobación", "Vue détaillée de la balance de vérification"],
  "tue": ["Ter", "Tue", "Mar", "Mar"],
  "unit": ["Unidade", "Unit", "Unidad", "Unité"],
  "unlimited": ["Ilimitado", "Unlimited", "Ilimitado", "Illimité"],
  "update_password": ["Atualizar Senha", "Update Password", "Actualizar Contraseña", "Mettre à jour le Mot de Passe"],
  "updating": ["A atualizar...", "Updating...", "Actualizando...", "Mise à jour..."],
  "upload_logo": ["Carregar Logotipo", "Upload Logo", "Subir Logo", "Télécharger le Logo"],
  "wa_btn_view_details": ["Ver detalhes", "View details", "Ver detalles", "Voir les détails"],
  "wa_col_customers": ["Clientes", "Customers", "Clientes", "Clients"],
  "wa_report_title": ["Relatório de Garçons", "Waiter Report", "Informe de Camareros", "Rapport des Serveurs"],
  "wa_shift_": ["Turno_", "Shift_", "Turno_", "Quart_"],
  "wa_staff_badge": ["STAFF", "STAFF", "PERSONAL", "PERSONNEL"],
  "waiter_calls_kpi": ["CHAMADAS GARÇOM", "WAITER CALLS", "LLAMADAS CAMARERO", "APPELS SERVEUR"],
  "warning": ["Aviso", "Warning", "Advertencia", "Avertissement"],
  "wed": ["Qua", "Wed", "Mié", "Mer"],
  
  // Handled separately because of key names
  "2d": ["2d", "2d", "2d", "2d"],
  "T": ["T", "T", "T", "T"],
  "TOTAL": ["TOTAL", "TOTAL", "TOTAL", "TOTAL"],
  "a": ["a", "a", "a", "a"]
};

// Also apply some bulk updates for other missing or common untranslated keys
const extraUpdates = {
  "loading_customers_data": ["A carregar dados de clientes...", "Loading customer data...", "Cargando datos de clientes...", "Chargement des données clients..."],
  "loading_operational_data": ["A carregar dados operacionais...", "Loading operational data...", "Cargando datos operacionales...", "Chargement des données opérationnelles..."],
  "loading_orders_data": ["A carregar dados de pedidos...", "Loading order data...", "Cargando datos de pedidos...", "Chargement des données de commande..."],
  "loading_profit_data": ["A carregar dados de lucro...", "Loading profit data...", "Cargando datos de ganancias...", "Chargement des données de profit..."],
  "loading_sales_data": ["A carregar dados de vendas...", "Loading sales data...", "Cargando datos de ventas...", "Chargement des données de ventes..."],
  "no_category_data": ["Sem dados de categoria disponíveis.", "No category data available.", "No hay datos de categoría disponibles.", "Aucune donnée de catégorie disponible."],
  "no_operational_data": ["Sem dados operacionais disponíveis.", "No operational data available.", "No hay datos operacionales disponibles.", "Aucune donnée opérationnelle disponible."],
  "no_orders_data": ["Sem dados de pedidos disponíveis.", "No order data available.", "No hay datos de pedidos disponibles.", "Aucune donnée de commande disponible."],
  "no_prep_time_data": ["Sem dados de tempo de preparação.", "No prep time data.", "Sin datos de tiempo de preparación.", "Aucune donnée de temps de préparation."],
  "no_product_data": ["Sem dados de produtos disponíveis.", "No product data available.", "No hay datos de productos disponibles.", "Aucune donnée de produit disponible."],
  "no_profit_data": ["Sem dados de lucro disponíveis.", "No profit data available.", "No hay datos de ganancias disponibles.", "Aucune donnée de profit disponible."],
  "no_sales_data": ["Sem dados de vendas disponíveis.", "No sales data available.", "No hay datos de ventas disponibles.", "Aucune donnée de ventes disponible."],
  "op_expenses": ["Despesas Operacionais", "Op Expenses", "Gastos Operativos", "Dépenses Opérationnelles"],
  "operational_expenses": ["Despesas Operacionais", "Operational Expenses", "Gastos Operativos", "Dépenses Opérationnelles"],
  "order_revenue": ["Receita do Pedido", "Order Revenue", "Ingresos del Pedido", "Revenus de la Commande"],
  "order_type": ["Tipo de Pedido", "Order Type", "Tipo de Pedido", "Type de Commande"],
  "orders_by_source": ["Pedidos por Origem", "Orders by Source", "Pedidos por Origen", "Commandes par Source"],
  "orders_by_status": ["Pedidos por Estado", "Orders by Status", "Pedidos por Estado", "Commandes par Statut"],
  "payment_methods": ["Métodos de Pagamento", "Payment Methods", "Métodos de Pago", "Modes de Paiement"],
  "profitability_label": ["Rentabilidade", "Profitability", "Rentabilidad", "Rentabilité"],
  "qr_menu_label": ["Menu QR", "QR Menu", "Menú QR", "Menu QR"],
  "recurring_customers": ["Clientes Recorrentes", "Recurring Customers", "Clientes Recurrentes", "Clients Récurrents"],
  "recurring_customers_kpi": ["Clientes Recorrentes", "Recurring Customers", "Clientes Recurrentes", "Clients Récurrents"],
  "reports_management_desc": ["Gira e visualize todos os relatórios da sua unidade.", "Manage and view all reports for your unit.", "Gestione y vea todos los informes de su unidad.", "Gérez et consultez tous les rapports de votre unité."],
  "reports_title": ["Relatórios de Gestão", "Management Reports", "Informes de Gestión", "Rapports de Gestion"],
  "requires_attention": ["Requer Atenção", "Requires Attention", "Requiere Atención", "Nécessite une Attention"],
  "revenue": ["Receita", "Revenue", "Ingresos", "Revenus"],
  "revenue_minus_cogs": ["Receita - CPV", "Revenue - COGS", "Ingresos - Costo", "Revenus - Coûts"],
  "sales_sources": ["Origens de Vendas", "Sales Sources", "Orígenes de Ventas", "Sources de Ventes"],
  "tab_cashflow": ["Fluxo de Caixa", "Cashflow", "Flujo de Caja", "Flux de Trésorerie"],
  "tab_efficiency": ["Eficiência", "Efficiency", "Eficiencia", "Efficacité"],
  "tab_financial": ["Financeiro", "Financial", "Financiero", "Financier"],
  "tab_inventory": ["Inventário", "Inventory", "Inventario", "Inventaire"],
  "tab_orders": ["Pedidos", "Orders", "Pedidos", "Commandes"],
  "tab_profit": ["Lucro", "Profit", "Ganancia", "Bénéfice"],
  "tab_staff": ["Equipa", "Staff", "Personal", "Personnel"],
  "tables_attended": ["Mesas Atendidas", "Attended Tables", "Mesas Atendidas", "Tables Servies"],
  "tap_for_details": ["Toque para detalhes", "Tap for details", "Toque para más detalles", "Appuyez pour plus de détails"],
  "tap_order_details": ["Toque no pedido para detalhes", "Tap order for details", "Toque el pedido para más detalles", "Appuyez sur la commande pour plus de détails"],
  "tap_to_expand": ["Toque para expandir", "Tap to expand", "Toque para expandir", "Appuyez pour développer"],
  "total_customers": ["Total de Clientes", "Total Customers", "Total de Clientes", "Total des Clients"],
  "total_entries": ["Total de Entradas", "Total Entries", "Total de Entradas", "Total des Entrées"],
  "total_exits": ["Total de Saídas", "Total Exits", "Total de Salidas", "Total des Sorties"],
  "total_orders_kpi": ["Total de Pedidos", "Total Orders", "Total de Pedidos", "Total des Commandes"],
  "total_product_cost": ["Custo Total de Produtos", "Total Product Cost", "Costo Total de Productos", "Coût Total des Produits"],
  "total_tables_attended": ["Total de Mesas Atendidas", "Total Tables Attended", "Total de Mesas Atendidas", "Total des Tables Servies"],
  "units_sold": ["Unidades Vendidas", "Units Sold", "Unidades Vendidas", "Unités Vendues"],
  "unknown": ["Desconhecido", "Unknown", "Desconocido", "Inconnu"]
};

// Merge all updates
Object.assign(updates, extraUpdates);

for (const [key, values] of Object.entries(updates)) {
  ptData[key] = values[0];
  enData[key] = values[1];
  esData[key] = values[2];
  frData[key] = values[3];
}

// Function to replace keys that are just matching the key string in a target object, using translation from a source mapping
function fixIdenticalKeys(targetObj, langIndex) {
  let count = 0;
  for (const [key, value] of Object.entries(targetObj)) {
    if (key === value && updates[key]) {
      targetObj[key] = updates[key][langIndex];
      count++;
    }
  }
  return count;
}

fixIdenticalKeys(ptData, 0);
fixIdenticalKeys(enData, 1);
fixIdenticalKeys(esData, 2);
fixIdenticalKeys(frData, 3);

// Let's also check for any remaining untranslated values in English
const remaining = Object.entries(enData).filter(([k, v]) => k === v);
if (remaining.length > 0) {
  console.log('WARNING: Still have untranslated keys in EN:', remaining.map(x => x[0]).join(', '));
}

// Write the files with nice formatting
fs.writeFileSync(ptPath, JSON.stringify(ptData, null, 2) + '\n', 'utf8');
fs.writeFileSync(enPath, JSON.stringify(enData, null, 2) + '\n', 'utf8');
fs.writeFileSync(esPath, JSON.stringify(esData, null, 2) + '\n', 'utf8');
fs.writeFileSync(frPath, JSON.stringify(frData, null, 2) + '\n', 'utf8');

console.log('All files updated successfully.');
