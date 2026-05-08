import { readFileSync, writeFileSync } from 'fs';

// ── helper ──────────────────────────────────────────────────────────────
function rep(src, from, to) {
    if (!src.includes(from)) { console.warn('  ⚠ not found:', from.slice(0, 60)); return src; }
    return src.split(from).join(to);
}

// ── WaiterAnalytics.jsx ─────────────────────────────────────────────────
let wa = readFileSync('src/pages/WaiterAnalytics.jsx', 'utf8');

const waReps = [
    // EffBadge — add useTranslation hook
    ["const EffBadge = ({ value }) => {\n    const cls = value >= 85 ? 'high' : value >= 60 ? 'mid' : 'low';\n    const label = value >= 85 ? 'Excelente' : value >= 60 ? 'Bom' : 'A Melhorar';",
     "const EffBadge = ({ value }) => {\n    const { t } = useTranslation();\n    const cls = value >= 85 ? 'high' : value >= 60 ? 'mid' : 'low';\n    const label = value >= 85 ? t('wa_eff_excellent') : value >= 60 ? t('wa_eff_good') : t('wa_eff_improve');"],
    // Period options
    ["<option value=\"1d\">Hoje</option>", "<option value=\"1d\">{t('wa_period_today')}</option>"],
    ["<option value=\"7d\">Últimos 7 dias</option>", "<option value=\"7d\">{t('wa_period_7d')}</option>"],
    ["<option value=\"30d\">Últimos 30 dias</option>", "<option value=\"30d\">{t('wa_period_30d')}</option>"],
    ["<option value=\"90d\">Últimos 90 dias</option>", "<option value=\"90d\">{t('wa_period_90d')}</option>"],
    // Header buttons
    ["> Actualizar</button>", ">{t('wa_btn_refresh')}</button>"],
    ["<Download size={16} /> Exportar</button>", "<Download size={16} />{t('wa_btn_export')}</button>"],
    // Header title/sub
    ["<h1>Ranking de Garçons</h1>", "<h1>{t('wa_ranking_title')}</h1>"],
    ["<p className=\"wa-header-sub\">Análise de produtividade, eficiência e desempenho da equipa</p>",
     "<p className=\"wa-header-sub\">{t('wa_ranking_sub')}</p>"],
    // KPI labels
    ["label=\"Total Colaboradores\"", "label={t('wa_total_collaborators')}"],
    ["sub={`${summary.activeWaiters} activos`}", "sub={t('wa_active_count', { count: summary.activeWaiters })}"],
    ["label=\"Total Pedidos\" value={summary.totalOrders} color=\"#10b981\"", "label={t('wa_total_orders')} value={summary.totalOrders} color=\"#10b981\""],
    ["label=\"Receita Total\"", "label={t('wa_total_revenue')}"],
    ["label=\"Eficiência Média\"", "label={t('wa_avg_efficiency')}"],
    // Card header
    ["<h2>Performance da Equipa</h2>", "<h2>{t('wa_team_performance')}</h2>"],
    ["<span className=\"wa-sort-label\">Ordenar por:</span>", "<span className=\"wa-sort-label\">{t('wa_sort_by')}</span>"],
    // Sort buttons
    ["{ id: 'efficiency', label: 'Eficiência' },", "{ id: 'efficiency', label: t('wa_col_efficiency') },"],
    ["{ id: 'orders', label: 'Pedidos' },", "{ id: 'orders', label: t('wa_col_orders') },"],
    ["{ id: 'revenue', label: 'Receita' },", "{ id: 'revenue', label: t('wa_col_revenue') },"],
    ["{ id: 'tables', label: 'Mesas' }", "{ id: 'tables', label: t('wa_col_tables') }"],
    // Table headers
    ["<th style={{ width: 60 }}>Rank</th>", "<th style={{ width: 60 }}>{t('wa_col_rank')}</th>"],
    ["/>Colaborador</span></th>", "/>{t('wa_col_collaborator')}</span></th>"],
    ["/>Pedidos</span></th>", "/>{t('wa_col_orders')}</span></th>"],
    ["/>Mesas</span></th>", "/>{t('wa_col_tables')}</span></th>"],
    ["/>Pratos</span></th>", "/>{t('wa_col_dishes')}</span></th>"],
    ["/>Receita</span></th>", "/>{t('wa_col_revenue')}</span></th>"],
    ["/>Chamadas</span></th>", "/>{t('wa_col_calls')}</span></th>"],
    ["/>Tempo Médio</span></th>", "/>{t('wa_col_avg_time')}</span></th>"],
    ["/>Eficiência</span></th>", "/>{t('wa_col_efficiency')}</span></th>"],
    ["/>Detalhes</span></th>", "/>{t('wa_col_details')}</span></th>"],
    // Inactive tag
    ["<span className=\"wa-inactive-tag\">Inactivo</span>", "<span className=\"wa-inactive-tag\">{t('wa_inactive')}</span>"],
    // Detail button text
    ["<span>Ver</span>", "<span>{t('wa_btn_view')}</span>"],
    // Empty state
    ["<h3>Sem dados de garçons</h3>", "<h3>{t('wa_empty_title')}</h3>"],
    ["Os garçons precisam criar pedidos assistidos para aparecer nas métricas.<br />Verifique se os utilizadores têm a função \"Waiter\" / \"Garçom\" atribuída.",
     "{t('wa_empty_msg')}"],
    // Panel sections
    ["<h4 className=\"wa-section-title\">Top Clientes Atendidos</h4>", "<h4 className=\"wa-section-title\">{t('wa_top_customers')}</h4>"],
    ["<p>Sem dados de clientes</p>", "<p>{t('wa_no_customer_data')}</p>"],
    ["<th>Cliente</th><th>Pedidos</th><th>Gasto</th>", "<th>{t('wa_col_customer')}</th><th>{t('wa_col_orders')}</th><th>{t('wa_col_spent')}</th>"],
    ["<h4 className=\"wa-section-title\">Performance por Turno</h4>", "<h4 className=\"wa-section-title\">{t('wa_performance_shift')}</h4>"],
    ["<h4 className=\"wa-section-title\">Por Dia da Semana</h4>", "<h4 className=\"wa-section-title\">{t('wa_performance_day')}</h4>"],
    ["<h4 className=\"wa-section-title\">Tendência</h4>", "<h4 className=\"wa-section-title\">{t('wa_trend')}</h4>"],
    ["s._id === 'Morning' ? '🌅 Manhã' : s._id === 'Afternoon' ? '☀️ Tarde' : '🌙 Noite'",
     "s._id === 'Morning' ? t('wa_shift_morning') : s._id === 'Afternoon' ? t('wa_shift_afternoon') : t('wa_shift_night')"],
    ["<p>Sem histórico de mesas neste período</p>", "<p>{t('wa_no_table_history')}</p>"],
    ["data.detail.performance.insights.isFasterThanAverage ? 'Mais rápido que a média' : 'Mais lento que a média'",
     "data.detail.performance.insights.isFasterThanAverage ? t('wa_faster_avg') : t('wa_slower_avg')"],
    ["Tempo médio: <strong>", "{t('wa_avg_time_label')}: <strong>"],
    ["Média do restaurante: <strong>", "{t('wa_restaurant_avg')}: <strong>"],
    ["%</strong> de diferença", "%</strong> {t('wa_difference')}"],
];

let waChanged = 0;
for (const [from, to] of waReps) {
    const next = rep(wa, from, to);
    if (next !== wa) waChanged++;
    wa = next;
}
writeFileSync('src/pages/WaiterAnalytics.jsx', wa, 'utf8');
console.log(`WaiterAnalytics: ${waChanged}/${waReps.length} replacements`);

// ── KitchenAnalytics.jsx ─────────────────────────────────────────────────
let ka = readFileSync('src/pages/KitchenAnalytics.jsx', 'utf8');

// Add useTranslation import
ka = rep(ka, "import { useState, useEffect, useCallback } from 'react';",
    "import { useState, useEffect, useCallback } from 'react';\nimport { useTranslation } from 'react-i18next';");

// Add t to main component
ka = rep(ka, "const KitchenAnalytics = () => {\n    const { user } = useAuth();",
    "const KitchenAnalytics = () => {\n    const { t } = useTranslation();\n    const { user } = useAuth();");

const kaReps = [
    // Period options
    ["<option value=\"1d\">Hoje</option>", "<option value=\"1d\">{t('wa_period_today')}</option>"],
    ["<option value=\"7d\">Últimos 7 dias</option>", "<option value=\"7d\">{t('wa_period_7d')}</option>"],
    ["<option value=\"30d\">Últimos 30 dias</option>", "<option value=\"30d\">{t('wa_period_30d')}</option>"],
    ["<option value=\"90d\">Últimos 90 dias</option>", "<option value=\"90d\">{t('wa_period_90d')}</option>"],
    // Header
    ["<div className=\"ka-header-badge\"><UtensilsCrossed size={16} /> COZINHA</div>", "<div className=\"ka-header-badge\"><UtensilsCrossed size={16} /> {t('ka_kitchen_badge')}</div>"],
    ["<h1>Analytics da Cozinha</h1>", "<h1>{t('ka_kitchen_title')}</h1>"],
    ["<p className=\"ka-header-sub\">Eficiência, tempos de preparo, gargalos e análise por turno</p>", "<p className=\"ka-header-sub\">{t('ka_kitchen_sub')}</p>"],
    // Buttons
    ["><RefreshCw size={16} /> Actualizar</button>", ">{t('ka_btn_refresh')}</button>"],
    ["><Download size={16} /> Exportar</button>", ">{t('ka_btn_export')}</button>"],
    // Alert banner
    ["possíveis gargalos identificados.", "{t('ka_bottleneck_alert', { count: bottlenecks })}"],
    // KPI labels
    ["label=\"Pratos Preparados\"", "label={t('ka_dishes_prepared')}"],
    ["label=\"Tempo Médio\"", "label={t('ka_avg_time')}"],
    ["sub={`Min: ${dashboard.minPrepTime}m · Máx: ${dashboard.maxPrepTime}m`}", "sub={`Min: ${dashboard.minPrepTime}m · Máx: ${dashboard.maxPrepTime}m`}"],
    ["label=\"Eficiência\" value={`${dashboard.efficiency}%`}", "label={t('ka_efficiency')} value={`${dashboard.efficiency}%`}"],
    ["sub=\"Pedidos entregues em ≤25 min\"", "sub={t('ka_within_25')}"],
    ["label=\"Atrasados\"", "label={t('ka_delayed')}"],
    ["sub={`${dashboard.delayedOrders} pedidos > 30min`}", "sub={t('ka_delayed_over30', { count: dashboard.delayedOrders })}"],
    ["label=\"Hora de Pico\"", "label={t('ka_peak_hour')}"],
    ["sub=\"Maior volume de pedidos\"", "sub={t('ka_peak_volume')}"],
    ["label=\"Cancelamentos\"", "label={t('ka_cancellations')}"],
    ["sub={`${dashboard.cancelledOrders} cancelados`}", "sub={t('ka_cancelled_count', { count: dashboard.cancelledOrders })}"],
    // Tabs
    ["{ id: 'overview', label: '📊 Visão Geral' }", "{ id: 'overview', label: `📊 ${t('ka_tab_overview')}` }"],
    ["{ id: 'dishes', label: '🍽️ Pratos' }", "{ id: 'dishes', label: `🍽️ ${t('ka_tab_dishes')}` }"],
    ["{ id: 'shifts', label: '🕐 Turnos' }", "{ id: 'shifts', label: `🕐 ${t('ka_tab_shifts')}` }"],
    ["{ id: 'timeline', label: '📈 Timeline' }", "{ id: 'timeline', label: `📈 ${t('ka_tab_timeline')}` }"],
    // Overview cards
    ["<h3>Pratos Mais Rápidos</h3>", "<h3>{t('ka_fastest_dishes')}</h3>"],
    ["<h3>Gargalos — Mais Lentos</h3>", "<h3>{t('ka_slowest_dishes')}</h3>"],
    ["<div className=\"ka-empty-sm\">Sem dados suficientes</div>", "<div className=\"ka-empty-sm\">{t('ka_no_data')}</div>"],
    ["{d.samples} amostras", "{t('ka_samples', { count: d.samples })}"],
    ["<h3>Pedidos por Hora do Dia</h3>", "<h3>{t('ka_orders_by_hour')}</h3>"],
    // Dishes tab
    ["<h3>Performance por Prato</h3>", "<h3>{t('ka_performance_by_dish')}</h3>"],
    ["{ id: 'quantity', label: 'Quantidade' },", "{ id: 'quantity', label: t('ka_sort_quantity') },"],
    ["{ id: 'prepTime', label: 'Tempo Prep' },", "{ id: 'prepTime', label: t('ka_sort_prep_time') },"],
    ["{ id: 'revenue', label: 'Receita' }", "{ id: 'revenue', label: t('ka_col_revenue') }"],
    ["<th>Prato</th>", "<th>{t('ka_col_dishes')}</th>"],
    ["<th>Categoria</th>", "<th>{t('ka_col_category')}</th>"],
    ["<th>Qtd Preparada</th>", "<th>{t('ka_col_qty')}</th>"],
    ["<th>Pedidos</th>", "<th>{t('ka_col_orders')}</th>"],
    ["<th>Receita</th>", "<th>{t('ka_col_revenue')}</th>"],
    ["<th>Tempo Médio</th>", "<th>{t('ka_col_avg_time')}</th>"],
    ["<th>Min / Máx</th>", "<th>{t('ka_col_min_max')}</th>"],
    ["<th>Status</th>", "<th>{t('ka_col_status')}</th>"],
    ["<span className=\"ka-status-badge danger\">Gargalo</span>", "<span className=\"ka-status-badge danger\">{t('ka_bottleneck_label')}</span>"],
    ["<span className=\"ka-status-badge ok\">Normal</span>", "<span className=\"ka-status-badge ok\">{t('ka_normal_label')}</span>"],
    ["<span className=\"ka-status-badge neutral\">Sem dados</span>", "<span className=\"ka-status-badge neutral\">{t('ka_no_data_label')}</span>"],
    ["<p>Sem dados de pratos neste período</p>", "<p>{t('ka_no_dishes')}</p>"],
    // Shifts tab
    ["<h3>Performance por Turno</h3>", "<h3>{t('ka_performance_by_shift')}</h3>"],
    ["<h3>Comparação Detalhada</h3>", "<h3>{t('ka_detailed_comparison')}</h3>"],
    ["<th>Turno</th>", "<th>{t('ka_col_shift')}</th>"],
    ["<th>Total Pedidos</th>", "<th>{t('ka_col_total_orders')}</th>"],
    ["<th>Concluídos</th>", "<th>{t('ka_col_completed')}</th>"],
    ["<th>Avg Prep</th>", "<th>{t('ka_col_avg_prep')}</th>"],
    ["<th>Atrasados</th>", "<th>{t('ka_col_delayed')}</th>"],
    ["<th>Eficiência</th>", "<th>{t('ka_col_efficiency')}</th>"],
    // Shift card delayed text
    ["{shift.delayedOrders} pedidos atrasados", "{t('ka_delayed_orders', { count: shift.delayedOrders })}"],
    // Timeline tab
    ["<h3>Distribuição de Pedidos por Hora</h3>", "<h3>{t('ka_orders_by_hour_title')}</h3>"],
    ["<span className=\"ka-legend-dot peak\" />\n                            Hora de pico", "<span className=\"ka-legend-dot peak\" />\n                            {t('ka_peak_hour_legend')}"],
    ["<span className=\"ka-legend-dot normal\" />\n                            Volume normal", "<span className=\"ka-legend-dot normal\" />\n                            {t('ka_normal_volume')}"],
    ["<div className=\"ka-section-title\">Top 10 Horas por Volume</div>", "<div className=\"ka-section-title\">{t('ka_top_hours')}</div>"],
    // Export buttons in tabs
    ["<button className=\"ka-btn-outline\" onClick={handleExportShifts}><Download size={14} /> CSV</button>",
     "<button className=\"ka-btn-outline\" onClick={handleExportShifts}><Download size={14} /> {t('ka_btn_csv')}</button>"],
    ["<button className=\"ka-btn-outline\" onClick={handleExportDishes}><Download size={14} /> Excel</button>",
     "<button className=\"ka-btn-outline\" onClick={handleExportDishes}><Download size={14} /> {t('ka_btn_excel')}</button>"],
    // Loading
    ["<p>Carregando análise da cozinha...</p>", "<p>{t('ka_loading')}</p>"],
];

let kaChanged = 0;
for (const [from, to] of kaReps) {
    const next = rep(ka, from, to);
    if (next !== ka) kaChanged++;
    ka = next;
}
writeFileSync('src/pages/KitchenAnalytics.jsx', ka, 'utf8');
console.log(`KitchenAnalytics: ${kaChanged}/${kaReps.length} replacements`);
