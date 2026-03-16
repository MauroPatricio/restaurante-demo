import json
import os

languages = ['pt', 'en', 'es', 'fr']
base_path = r'd:\Projectos\restaurante-demo\qr-menu\admin-dashboard\public\locales'

def clean_json(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return data

all_data = {}
for lang in languages:
    path = os.path.join(base_path, lang, 'translation.json')
    all_data[lang] = clean_json(path)

all_keys = set()
for lang in languages:
    all_keys.update(all_data[lang].keys())

new_keys_info = {
    "today_billing": {"pt": "Faturação de Hoje", "en": "Today's Billing", "es": "Facturación de Hoy", "fr": "Facturation d'Aujourd'hui"},
    "today_billing_desc": {"pt": "Rendimentos gerados hoje", "en": "Income generated today", "es": "Ingresos generados hoy", "fr": "Revenus générés aujourd'hui"},
    "daily_purchases": {"pt": "Compras do Dia", "en": "Daily Purchases", "es": "Compras del Día", "fr": "Achats du Jour"},
    "daily_purchases_desc": {"pt": "Gastos registados hoje", "en": "Expenses recorded today", "es": "Gastos registrados hoy", "fr": "Dépenses enregistrées aujourd'hui"},
    "tax_payable": {"pt": "IVA a Pagar (16%)", "en": "VAT Payable (16%)", "es": "IVA a Pagar (16%)", "fr": "TVA à Payer (16%)"},
    "tax_payable_desc": {"pt": "IVA Liquidado – IVA Dedutível", "en": "VAT Collected – VAT Deductible", "es": "IVA Liquidado – IVA Deducible", "fr": "TVA Collectée – TVA Déductible"},
    "operational_dashboard": {"pt": "Dashboard Operacional", "en": "Operational Dashboard", "es": "Panel Operacional", "fr": "Tableau de Bord Opérationnel"},
    "monitor_desc": {"pt": "Monitore as operações e o desempenho em tempo real.", "en": "Monitor operations and performance in real-time.", "es": "Monitore as operações e o desempenho em tempo real.", "fr": "Surveillez les opérations et les performances en temps réel."},
    "active_orders": {"pt": "Pedidos Ativos", "en": "Active Orders", "es": "Pedidos Activos", "fr": "Commandes Actives"},
    "pending_orders": {"pt": "Pendentes", "en": "Pending", "es": "Pendientes", "fr": "En Attente"},
    "completed_today": {"pt": "Concluídos Hoje", "en": "Completed Today", "es": "Completados Hoy", "fr": "Terminés Aujourd'hui"},
    "occupied_tables": {"pt": "Mesas Ocupadas", "en": "Occupied Tables", "es": "Mesas Ocupadas", "fr": "Tables Occupées"},
    "active_alerts": {"pt": "Alertas Ativos", "en": "Active Alerts", "es": "Alertas Activos", "fr": "Alertes Actives"},
    "activity_by_hour": {"pt": "Atividade por Hora", "en": "Activity by Hour", "es": "Actividad por Hora", "fr": "Activité par Heure"},
    "peak_hours": {"pt": "Horários de Pico", "en": "Peak Hours", "es": "Horarios de Pico", "fr": "Heures de Pointe"},
    "sales_volume": {"pt": "Volume de Vendas", "en": "Sales Volume", "es": "Volumen de Ventas", "fr": "Volume des Ventes"},
    "orders_by_shift": {"pt": "Pedidos por Turno", "en": "Orders by Shift", "es": "Pedidos por Turno", "fr": "Commandes par Équipe"},
    "flow_distribution": {"pt": "Distribuição de Fluxo", "en": "Flow Distribution", "es": "Distribución de Flujo", "fr": "Distribution du Flux"},
    "select_restaurant_prompt": {"pt": "Por favor, selecione um restaurante para ver o dashboard.", "en": "Please select a restaurant to view the dashboard.", "es": "Por favor, seleccione un restaurante para ver el panel.", "fr": "Veuillez sélectionner un restaurant para voir le tableau de bord."},
    "analytics_and": {"pt": "Análise &", "en": "Analytics &", "es": "Análisis &", "fr": "Analyse &"},
    "performance": {"pt": "Desempenho", "en": "Performance", "es": "Desempeño", "fr": "Performance"},
    "cash_balance": {"pt": "Saldo de Caixa", "en": "Cash Balance", "es": "Saldo de Caja", "fr": "Solde de Caisse"},
    "cash_balance_desc": {"pt": "Caixa + Bancos + M-Pesa", "en": "Cash + Banks + M-Pesa", "es": "Caja + Bancos + M-Pesa", "fr": "Caisse + Banques + M-Pesa"},
    "gross_sales_desc": {"pt": "Total acumulado de rendimentos", "en": "Total accumulated income", "es": "Total acumulado de ingresos", "fr": "Total cumulé des revenus"},
    "actual_expenses_desc": {"pt": "Total acumulado de gastos", "en": "Total accumulated expenses", "es": "Total acumulado de gastos", "fr": "Total cumulé des dépenses"},
    "net_profit_desc": {"pt": "Rendimentos – Gastos do período", "en": "Income – Period expenses", "es": "Ingresos – Gastos del periodo", "fr": "Revenus – Dépenses de la période"},
    "vat_collected": {"pt": "IVA Liquidado", "en": "VAT Collected", "es": "IVA Liquidado", "fr": "TVA Collectée"},
    "vat_deductible": {"pt": "IVA Dedutível", "en": "VAT Deductible", "es": "IVA Deducible", "fr": "TVA Déductible"},
    "batch_pending": {"pt": "Pendentes em Lote", "en": "Batch Pending", "es": "Pendientes en Lote", "fr": "Attentes en Lot"},
    "batch_pending_desc": {"pt": "Processar múltiplos pedidos de uma vez", "en": "Process multiple orders at once", "es": "Procesar múltiples pedidos a la vez", "fr": "Traiter plusieurs commandes à la fois"},
    "general_ledger_title": {"pt": "Razão", "en": "General Ledger", "es": "Libro Mayor", "fr": "Grand Livre"},
    "general_ledger_desc": {"pt": "Extrato de movimentos por conta", "en": "Statement of movements by account", "es": "Extracto de movimientos por cuenta", "fr": "État des mouvements par compte"},
    "income_statement": {"pt": "Dem. de Resultados", "en": "Income Statement", "es": "Estado de Resultados", "fr": "Compte de Résultat"},
    "income_statement_desc": {"pt": "Receitas, despesas e lucro (DRE)", "en": "Revenue, expenses and profit", "es": "Ingresos, gastos y utilidades", "fr": "Recettes, dépenses et bénéfices"},
    "vat_clearance": {"pt": "Apuramento de IVA", "en": "VAT Clearance", "es": "Liquidación de IVA", "fr": "Vérification de la TVA"},
    "vat_clearance_desc": {"pt": "IVA Liquidado vs Dedutível (16%)", "en": "VAT Collected vs Deductible (16%)", "es": "IVA Liquidado vs Deducible (16%)", "fr": "TVA Collectée vs Déductible (16%)"},
    "trial_balance": {"pt": "Balancete", "en": "Trial Balance", "es": "Balance de Comprobación", "fr": "Balance de Vérification"},
    "trial_balance_desc": {"pt": "Movimentos débito/crédito por período", "en": "Debit/credit movements by period", "es": "Movimientos débito/crédito por periodo", "fr": "Mouvements débit/crédit par période"},
    "balance_sheet": {"pt": "Balanço Patrimonial", "en": "Balance Sheet", "es": "Balance General", "fr": "Bilan"},
    "balance_sheet_desc": {"pt": "Activos, Passivos e Capital Próprio", "en": "Assets, Liabilities and Equity", "es": "Activos, Pasivos y Capital Propio", "fr": "Actif, Passif et Capitaux Propres"},
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
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(synced_data, f, ensure_ascii=False, indent=4)

print("Translation files synchronized and cleaned.")
