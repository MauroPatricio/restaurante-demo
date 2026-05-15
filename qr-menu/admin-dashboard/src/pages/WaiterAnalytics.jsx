import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { waiterAnalyticsAPI } from '../services/api';
import { getCurrencySymbol } from '../utils/currencyUtils';
import {
    Users, TrendingUp, Clock, Award, RefreshCw, X, ChevronRight,
    Download, Star, Table2, UtensilsCrossed, DollarSign, BarChart2,
    AlertCircle, CheckCircle, Zap, ShoppingBag, Phone, Timer, Eye
} from 'lucide-react';
import { exportToCSV, exportToExcel, formatWaiterReportForExport, formatWaiterTableHistoryForExport } from '../utils/export_utils';
import './WaiterAnalytics.css';

// ——— Mini Bar Chart —————————————————————————————————————————————————————
const MiniBar = ({ value, max, color = '#6366f1' }) => (
    <div className="wa-minibar-track">
        <div className="wa-minibar-fill" style={{ width: `${max > 0 ? (value / max) * 100 : 0}%`, background: color }} />
    </div>
);

// ——— KPI Card —————————————————————————————————————————————————————
const KPICard = ({ icon: Icon, label, value, sub, color, trend }) => (
    <div className="wa-kpi-card" style={{ '--kpi-color': color }}>
        <div className="wa-kpi-icon"><Icon size={22} /></div>
        <div className="wa-kpi-body">
            <div className="wa-kpi-value">{value}</div>
            <div className="wa-kpi-label">{label}</div>
            {sub && <div className="wa-kpi-sub">{sub}</div>}
        </div>
    </div>
);

// ——— Efficiency Badge —————————————————————————————————————————————————————
const EffBadge = ({ value }) => {
    const { t } = useTranslation();
    const cls = value >= 85 ? 'high' : value >= 60 ? 'mid' : 'low';
    const label = value >= 85 ? t('wa_eff_excellent', 'Excelente') : value >= 60 ? t('wa_eff_good', 'Bom') : t('wa_eff_improve', 'A Melhorar');
    return (
        <div className={`wa-eff-badge wa-eff-${cls}`}>
            <span className="wa-eff-pct">{value}%</span>
            <span className="wa-eff-label">{label}</span>
        </div>
    );
};

// ——— Table Detail Panel —————————————————————————————————————————————————————
const TableDetailPanel = ({ waiter, restaurantId, period, currency, onClose }) => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [activeTab, setActiveTab] = useState('tables');

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const [detailRes, tableRes] = await Promise.all([
                    waiterAnalyticsAPI.getDetails(restaurantId, waiter.waiterId, { period }),
                    waiterAnalyticsAPI.getTableHistory(restaurantId, waiter.waiterId, { period })
                ]);
                setData({ detail: detailRes.data, tables: tableRes.data });
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [waiter.waiterId, restaurantId, period]);

    const handleExport = () => {
        if (!data?.tables?.tables) return;
        const rows = formatWaiterTableHistoryForExport(data.tables.tables, waiter.waiterName);
        exportToCSV(rows, `historico_${waiter.waiterName.replace(/\s/g, '_')}.csv`);
    };

    return (
        <div className="wa-panel-overlay" onClick={onClose}>
            <div className="wa-panel" onClick={e => e.stopPropagation()}>
                {/* Panel Header */}
                <div className="wa-panel-header">
                    <div>
                        <div className="wa-panel-avatar">{waiter.waiterName?.[0]?.toUpperCase()}</div>
                        <div>
                            <h2>{waiter.waiterName}</h2>
                            <span className={`wa-status-dot ${waiter.active ? 'active' : ''}`}>
                                {waiter.active ? t('active', 'Activo') : t('inactive', 'Inactivo')}
                            </span>
                        </div>
                    </div>
                    <div className="wa-panel-actions">
                        <button className="wa-export-btn" onClick={handleExport}><Download size={16} /> {t('export_csv', 'CSV')}</button>
                        <button className="wa-close-btn" onClick={onClose}><X size={20} /></button>
                    </div>
                </div>

                {/* Summary Row */}
                <div className="wa-panel-summary">
                    {[
                        { label: t('orders', 'Pedidos'), value: waiter.metrics.totalOrders },
                        { label: t('wa_col_tables', 'Mesas'), value: waiter.metrics.totalTables },
                        { label: t('wa_col_dishes', 'Pratos'), value: waiter.metrics.totalDishes },
                        { label: t('ka_col_revenue', 'Receita'), value: `${(waiter.metrics.totalRevenue || 0).toLocaleString('pt-MZ')} ${currency}` },
                        { label: t('wa_col_efficiency', 'Eficiência'), value: `${waiter.metrics.efficiency}%` }
                    ].map(s => (
                        <div key={s.label} className="wa-panel-sum-item">
                            <div className="wa-panel-sum-val">{s.value}</div>
                            <div className="wa-panel-sum-lbl">{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* Tabs */}
                <div className="wa-panel-tabs">
                    {[
                        { id: 'tables', label: `🪑 ${t('wa_col_tables', 'Mesas')}` },
                        { id: 'performance', label: `📈 ${t('wa_trend', 'Performance')}` },
                        { id: 'customers', label: `👥 ${t('wa_col_customers', 'Clientes')}` }
                    ].map(tab => (
                        <button key={tab.id} className={`wa-tab ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="wa-panel-body">
                    {loading ? (
                        <div className="wa-panel-loading"><RefreshCw size={32} className="spin" /><p>{t('loading', 'Carregando...')}</p></div>
                    ) : (
                        <>
                            {/* Tables Tab */}
                            {activeTab === 'tables' && data?.tables && (
                                <div>
                                    <div className="wa-panel-meta">
                                        <span>📊 {data.tables.summary.totalTables} {t('wa_col_tables', 'mesas').toLowerCase()}</span>
                                        <span>🍽️ {data.tables.summary.totalDishes} {t('wa_col_dishes', 'pratos').toLowerCase()}</span>
                                        <span>💰 {(data.tables.summary.totalRevenue || 0).toLocaleString('pt-MZ')} {currency}</span>
                                    </div>
                                    {data.tables.tables.map(table => (
                                        <div key={table.tableId} className="wa-table-card">
                                            <div className="wa-table-card-header">
                                                <span className="wa-table-num">{t('table', 'Mesa')} {table.tableNumber}</span>
                                                {table.tableLocation && <span className="wa-table-loc">{table.tableLocation}</span>}
                                                <span className="wa-table-stat">{table.totalOrders} {t('orders', 'pedidos').toLowerCase()} · {(table.totalRevenue || 0).toLocaleString('pt-MZ')} {currency}</span>
                                            </div>
                                            {table.orders.map(order => (
                                                <div key={order.orderId} className="wa-order-row">
                                                    <span className="wa-order-time">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    <span className="wa-order-dishes">
                                                        {order.dishes.map((d, i) => (
                                                            <span key={i} className="wa-dish-chip">{d.qty}× {d.name}</span>
                                                        ))}
                                                    </span>
                                                    <span className="wa-order-total">{(order.total || 0).toLocaleString('pt-MZ')} {currency}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                    {data.tables.tables.length === 0 && (
                                        <div className="wa-empty"><Users size={48} /><p>{t('wa_no_table_history', 'Nenhum histórico de mesas')}</p></div>
                                    )}
                                </div>
                            )}

                            {/* Performance Tab */}
                            {activeTab === 'performance' && data?.detail && (
                                <div>
                                    {/* Insights Banner */}
                                    <div className={`wa-insight-banner ${data.detail.performance.insights.isFasterThanAverage ? 'good' : 'warn'}`}>
                                        <div className="wa-insight-icon">{data.detail.performance.insights.isFasterThanAverage ? <Zap size={20} /> : <Clock size={20} />}</div>
                                        <div>
                                            <div className="wa-insight-title">
                                                {data.detail.performance.insights.isFasterThanAverage ? t('wa_faster_avg', 'Mais rápido que a média') : t('wa_slower_avg', 'Mais lento que a média')}
                                            </div>
                                            <div className="wa-insight-sub">
                                                {t('wa_avg_time_label', 'Tempo Médio')}: <strong>{data.detail.performance.insights.avgCompletionTime} {t('min_suffix', 'min')}</strong>
                                                {' · '}{t('wa_restaurant_avg', 'Média do Restaurante')}: <strong>{data.detail.performance.insights.restaurantAvgCompletionTime} {t('min_suffix', 'min')}</strong>
                                                {' · '}<strong>{Math.abs(data.detail.performance.insights.differencePercentage)}%</strong> {t('wa_difference', 'de diferença')}
                                            </div>
                                        </div>
                                    </div>

                                    {/* By Shift */}
                                    <h4 className="wa-section-title">{t('wa_performance_shift', 'Performance por Turno')}</h4>
                                    <div className="wa-shift-grid">
                                        {data.detail.performance.byShift.map(s => (
                                            <div key={s._id} className="wa-shift-card">
                                                <div className="wa-shift-name">{t('wa_shift_' + s._id.toLowerCase())}</div>
                                                <div className="wa-shift-orders">{s.orders} {t('orders', 'pedidos').toLowerCase()}</div>
                                                <div className="wa-shift-rev">{(s.revenue || 0).toLocaleString('pt-MZ')} {currency}</div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* By Day */}
                                    <h4 className="wa-section-title">{t('wa_performance_day', 'Performance por Dia')}</h4>
                                    <div className="wa-day-bars">
                                        {(() => {
                                            const maxOrders = Math.max(...data.detail.performance.byDay.map(d => d.orders), 1);
                                            return data.detail.performance.byDay.map(day => (
                                                <div key={day.day} className="wa-day-row">
                                                    <span className="wa-day-name">{t('day_' + day.day.toLowerCase()).substring(0, 3)}</span>
                                                    <MiniBar value={day.orders} max={maxOrders} />
                                                    <span className="wa-day-count">{day.orders}</span>
                                                </div>
                                            ));
                                        })()}
                                    </div>

                                    {/* Weekly Trend */}
                                    <h4 className="wa-section-title">{t('wa_trend', 'Tendência Semanal')}</h4>
                                    <div className="wa-trend-bars">
                                        {(() => {
                                            const trend = data.detail.performance.weeklyTrend.slice(-14);
                                            const maxO = Math.max(...trend.map(t => t.orders), 1);
                                            return trend.map(t => (
                                                <div key={t.date} className="wa-trend-col">
                                                    <div className="wa-trend-bar-wrap">
                                                        <div className="wa-trend-bar-fill" style={{ height: `${(t.orders / maxO) * 100}%` }} />
                                                    </div>
                                                    <span className="wa-trend-date">{new Date(t.date).getDate()}</span>
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                </div>
                            )}

                            {/* Customers Tab */}
                            {activeTab === 'customers' && data?.detail && (
                                <div>
                                    <h4 className="wa-section-title">{t('wa_top_customers', 'Principais Clientes')}</h4>
                                    {data.detail.performance.topCustomers.length === 0 ? (
                                        <div className="wa-empty"><Users size={48} /><p>{t('wa_no_customer_data', 'Sem dados de clientes')}</p></div>
                                    ) : (
                                        <table className="wa-customer-table">
                                            <thead>
                                                <tr><th>{t('wa_col_customer', 'Cliente')}</th><th>{t('wa_col_orders', 'Pedidos')}</th><th>{t('wa_col_spent', 'Gasto')}</th></tr>
                                            </thead>
                                            <tbody>
                                                {data.detail.performance.topCustomers.map((c, i) => (
                                                    <tr key={i}>
                                                        <td>
                                                            <div className="wa-cust-name">{c.name || t('customer', 'Cliente')}</div>
                                                            <div className="wa-cust-phone">{c.phone}</div>
                                                        </td>
                                                        <td className="center">{c.orders}</td>
                                                        <td className="right wa-green">{(c.spent || 0).toLocaleString('pt-MZ')} {currency}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

// ——— Main Component ————————————————————————————————————————————————————————
const WaiterAnalytics = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const restaurant = user?.restaurant;
    const restaurantId = restaurant?._id || restaurant;
    const currency = getCurrencySymbol(user?.restaurant?.settings?.currency || 'MZN');

    const [loading, setLoading] = useState(true);
    const [waiters, setWaiters] = useState([]);
    const [summary, setSummary] = useState(null);
    const [period, setPeriod] = useState('30d');
    const [selectedWaiter, setSelectedWaiter] = useState(null);
    const [sortBy, setSortBy] = useState('efficiency');

    const fetchAnalytics = useCallback(async () => {
        if (!restaurantId) return;
        try {
            setLoading(true);
            const { data } = await waiterAnalyticsAPI.getAll(restaurantId, { period });
            setWaiters(data.waiters || []);
            setSummary(data.summary || {});
        } catch (err) {
            console.error('Failed to fetch waiter analytics:', err);
        } finally {
            setLoading(false);
        }
    }, [restaurantId, period]);

    useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

    const sortedWaiters = [...waiters].sort((a, b) => {
        if (sortBy === 'revenue') return b.metrics.totalRevenue - a.metrics.totalRevenue;
        if (sortBy === 'orders') return b.metrics.totalOrders - a.metrics.totalOrders;
        if (sortBy === 'tables') return b.metrics.totalTables - a.metrics.totalTables;
        return b.metrics.efficiency - a.metrics.efficiency;
    });

    const maxRevenue = Math.max(...waiters.map(w => w.metrics.totalRevenue), 1);

    const handleExportAll = () => {
        const rows = formatWaiterReportForExport(sortedWaiters, period);
        exportToExcel({ title: t('wa_report_title', 'Relatório de Garçons'), columns: Object.keys(rows[0]).map(k => ({ header: k, dataKey: k })), data: rows, filename: `garcons_${period}` });
    };

    if (loading) {
        return (
            <div className="wa-container">
                <div className="wa-loading-grid">
                    {[...Array(6)].map((_, i) => <div key={i} className="wa-skeleton" style={{ animationDelay: `${i * 0.1}s` }} />)}
                </div>
            </div>
        );
    }

    return (
        <div className="wa-container">
            {/* Header */}
            <div className="wa-header">
                <div className="wa-header-left">
                    <div className="wa-header-badge"><Users size={18} /> {t('wa_staff_badge', 'STAFF')}</div>
                    <h1>{t('wa_ranking_title', 'Ranking de Garçons')}</h1>
                    <p className="wa-header-sub">{t('wa_ranking_sub', 'Análise de produtividade, eficiência e desempenho da equipa')}</p>
                </div>
                <div className="wa-header-controls">
                    <select className="wa-select" value={period} onChange={e => setPeriod(e.target.value)}>
                        <option value="1d">{t('wa_period_today')}</option>
                        <option value="7d">{t('wa_period_7d')}</option>
                        <option value="30d">{t('wa_period_30d')}</option>
                        <option value="90d">{t('wa_period_90d')}</option>
                    </select>
                    <button className="wa-btn-outline" onClick={fetchAnalytics}><RefreshCw size={16} />{t('wa_btn_refresh', 'Actualizar')}</button>
                    <button className="wa-btn-primary" onClick={handleExportAll}><Download size={16} />{t('wa_btn_export', 'Exportar')}</button>
                </div>
            </div>

            {/* KPIs */}
            {summary && (
                <div className="wa-kpi-row">
                    <KPICard icon={Users} label={t('wa_total_collaborators', 'Total Colaboradores')} value={summary.totalWaiters} sub={t('wa_active_count', { count: summary.activeWaiters })} color="#6366f1" />
                    <KPICard icon={TrendingUp} label={t('wa_total_orders', 'Total Pedidos')} value={summary.totalOrders} color="#10b981" />
                    <KPICard icon={DollarSign} label={t('wa_total_revenue', 'Receita Total')} value={`${(summary.totalRevenue || 0).toLocaleString('pt-MZ')} ${currency}`} color="#f59e0b" />
                    <KPICard icon={Award} label={t('wa_avg_efficiency', 'Eficiência Média')} value={`${summary.avgEfficiency}%`} color="#ec4899" />
                </div>
            )}

            {/* Ranking Table */}
            <div className="wa-card">
                <div className="wa-card-header">
                    <h2>{t('wa_team_performance', 'Performance da Equipa')}</h2>
                    <div className="wa-sort-controls">
                        <span className="wa-sort-label">{t('wa_sort_by', 'Ordenar por:')}</span>
                        {[
                            { id: 'efficiency', label: t('wa_col_efficiency', 'Eficiência') },
                            { id: 'orders', label: t('wa_col_orders', 'Pedidos') },
                            { id: 'revenue', label: t('wa_col_revenue', 'Receita') },
                            { id: 'tables', label: t('wa_col_tables', 'Mesas') }
                        ].map(s => (
                            <button key={s.id} className={`wa-sort-btn ${sortBy === s.id ? 'active' : ''}`} onClick={() => setSortBy(s.id)}>
                                {s.label}
                            </button>
                        ))}
                    </div>
                </div>

                {waiters.length === 0 ? (
                    <div className="wa-empty">
                        <Users size={64} />
                        <h3>{t('wa_empty_title', 'Nenhum dado encontrado')}</h3>
                        <p>{t('wa_empty_msg', 'Aguarde pelos primeiros pedidos para ver o ranking.')}</p>
                    </div>
                ) : (
                    <div className="wa-table-wrap">
                        <table className="wa-table">
                            <thead>
                                <tr>
                                    <th style={{ width: 60 }}>{t('wa_col_rank', 'Rank')}</th>
                                    <th><span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Users size={13} />{t('wa_col_collaborator', 'Colaborador')}</span></th>
                                    <th><span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><ShoppingBag size={13} />{t('wa_col_orders', 'Pedidos')}</span></th>
                                    <th><span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Table2 size={13} />{t('wa_col_tables', 'Mesas')}</span></th>
                                    <th><span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><UtensilsCrossed size={13} />{t('wa_col_dishes', 'Pratos')}</span></th>
                                    <th><span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><DollarSign size={13} />{t('wa_col_revenue', 'Receita')}</span></th>
                                    <th><span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Phone size={13} />{t('wa_col_calls', 'Chamadas')}</span></th>
                                    <th><span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Timer size={13} />{t('wa_col_avg_time', 'Tempo Médio')}</span></th>
                                    <th><span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><TrendingUp size={13} />{t('wa_col_efficiency', 'Eficiência')}</span></th>
                                    <th style={{ width: 80 }}><span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Eye size={13} />{t('wa_col_details', 'Detalhes')}</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedWaiters.map((waiter, index) => {
                                    const medals = ['🥇', '🥈', '🥉'];
                                    return (
                                        <tr key={waiter.waiterId} className={selectedWaiter?.waiterId === waiter.waiterId ? 'selected' : ''}>
                                            <td className="wa-rank-cell">
                                                {index < 3 ? (
                                                    <span className="wa-medal">{medals[index]}</span>
                                                ) : (
                                                    <span className="wa-rank-num">{index + 1}</span>
                                                )}
                                            </td>
                                            <td>
                                                <div className="wa-waiter-info">
                                                    <div className="wa-waiter-avatar">{waiter.waiterName?.[0]?.toUpperCase()}</div>
                                                    <div>
                                                        <div className="wa-waiter-name">{waiter.waiterName}</div>
                                                        <div className="wa-waiter-email">{waiter.waiterEmail}</div>
                                                    </div>
                                                    {!waiter.active && <span className="wa-inactive-tag">{t('wa_inactive', 'Inactivo')}</span>}
                                                </div>
                                            </td>
                                            <td className="wa-num-cell">{waiter.metrics.totalOrders}</td>
                                            <td className="wa-num-cell">{waiter.metrics.totalTables}</td>
                                            <td className="wa-num-cell">{waiter.metrics.totalDishes}</td>
                                            <td>
                                                <div className="wa-rev-cell">
                                                    <span className="wa-rev-val">{(waiter.metrics.totalRevenue || 0).toLocaleString('pt-MZ')} <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{currency}</span></span>
                                                    <MiniBar value={waiter.metrics.totalRevenue} max={maxRevenue} color="#10b981" />
                                                </div>
                                            </td>
                                            <td className="wa-num-cell">{waiter.metrics.callsResolved}</td>
                                            <td className="wa-num-cell">
                                                {waiter.metrics.avgServiceTime > 0 ? `${waiter.metrics.avgServiceTime}${t('min_suffix', 'm')}` : '—'}
                                            </td>
                                            <td><EffBadge value={waiter.metrics.efficiency} /></td>
                                            <td>
                                                <button
                                                    className="wa-detail-btn"
                                                    onClick={() => setSelectedWaiter(waiter)}
                                                    title={t('wa_btn_view_details', 'Ver detalhes')}
                                                >
                                                    <Eye size={15} />
                                                    <span>{t('wa_btn_view', 'Ver')}</span>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Detail Panel */}
            {selectedWaiter && (
                <TableDetailPanel
                    waiter={selectedWaiter}
                    restaurantId={restaurantId}
                    period={period}
                    currency={currency}
                    onClose={() => setSelectedWaiter(null)}
                />
            )}
        </div>
    );
};

export default WaiterAnalytics;

