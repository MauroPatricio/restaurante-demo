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

// â”€â”€â”€ Mini Bar Chart â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const MiniBar = ({ value, max, color = '#6366f1' }) => (
    <div className="wa-minibar-track">
        <div className="wa-minibar-fill" style={{ width: `${max > 0 ? (value / max) * 100 : 0}%`, background: color }} />
    </div>
);

// â”€â”€â”€ KPI Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ Efficiency Badge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const EffBadge = ({ value }) => {
    const { t } = useTranslation();
    const cls = value >= 85 ? 'high' : value >= 60 ? 'mid' : 'low';
    const label = value >= 85 ? t('wa_eff_excellent') : value >= 60 ? t('wa_eff_good') : t('wa_eff_improve');
    return (
        <div className={`wa-eff-badge wa-eff-${cls}`}>
            <span className="wa-eff-pct">{value}%</span>
            <span className="wa-eff-label">{label}</span>
        </div>
    );
};

// â”€â”€â”€ Table Detail Panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const TableDetailPanel = ({ waiter, restaurantId, period, currency, onClose }) => {
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
                            <span className={`wa-status-dot ${waiter.active ? 'active' : ''}`}>{waiter.active ? 'Activo' : 'Inactivo'}</span>
                        </div>
                    </div>
                    <div className="wa-panel-actions">
                        <button className="wa-export-btn" onClick={handleExport}><Download size={16} /> CSV</button>
                        <button className="wa-close-btn" onClick={onClose}><X size={20} /></button>
                    </div>
                </div>

                {/* Summary Row */}
                <div className="wa-panel-summary">
                    {[
                        { label: 'Pedidos', value: waiter.metrics.totalOrders },
                        { label: 'Mesas', value: waiter.metrics.totalTables },
                        { label: 'Pratos', value: waiter.metrics.totalDishes },
                        { label: 'Receita', value: `${(waiter.metrics.totalRevenue || 0).toLocaleString('pt-MZ')} ${currency}` },
                        { label: 'EficiÃªncia', value: `${waiter.metrics.efficiency}%` }
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
                        { id: 'tables', label: 'ðŸª‘ Mesas' },
                        { id: 'performance', label: 'ðŸ“ˆ Performance' },
                        { id: 'customers', label: 'ðŸ‘¥ Clientes' }
                    ].map(tab => (
                        <button key={tab.id} className={`wa-tab ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="wa-panel-body">
                    {loading ? (
                        <div className="wa-panel-loading"><RefreshCw size={32} className="spin" /><p>Carregando...</p></div>
                    ) : (
                        <>
                            {/* Tables Tab */}
                            {activeTab === 'tables' && data?.tables && (
                                <div>
                                    <div className="wa-panel-meta">
                                        <span>ðŸ“Š {data.tables.summary.totalTables} mesas</span>
                                        <span>ðŸ½ï¸ {data.tables.summary.totalDishes} pratos</span>
                                        <span>ðŸ’° {(data.tables.summary.totalRevenue || 0).toLocaleString('pt-MZ')} {currency}</span>
                                    </div>
                                    {data.tables.tables.map(table => (
                                        <div key={table.tableId} className="wa-table-card">
                                            <div className="wa-table-card-header">
                                                <span className="wa-table-num">Mesa {table.tableNumber}</span>
                                                {table.tableLocation && <span className="wa-table-loc">{table.tableLocation}</span>}
                                                <span className="wa-table-stat">{table.totalOrders} pedidos Â· {(table.totalRevenue || 0).toLocaleString('pt-MZ')} {currency}</span>
                                            </div>
                                            {table.orders.map(order => (
                                                <div key={order.orderId} className="wa-order-row">
                                                    <span className="wa-order-time">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    <span className="wa-order-dishes">
                                                        {order.dishes.map((d, i) => (
                                                            <span key={i} className="wa-dish-chip">{d.qty}Ã— {d.name}</span>
                                                        ))}
                                                    </span>
                                                    <span className="wa-order-total">{(order.total || 0).toLocaleString('pt-MZ')} {currency}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                    {data.tables.tables.length === 0 && (
                                        <div className="wa-empty"><Users size={48} /><p>{t('wa_no_table_history')}</p></div>
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
                                                {data.detail.performance.insights.isFasterThanAverage ? t('wa_faster_avg') : t('wa_slower_avg')}
                                            </div>
                                            <div className="wa-insight-sub">
                                                {t('wa_avg_time_label')}: <strong>{data.detail.performance.insights.avgCompletionTime} min</strong>
                                                {' Â· '}{t('wa_restaurant_avg')}: <strong>{data.detail.performance.insights.restaurantAvgCompletionTime} min</strong>
                                                {' Â· '}<strong>{Math.abs(data.detail.performance.insights.differencePercentage)}%</strong> {t('wa_difference')}
                                            </div>
                                        </div>
                                    </div>

                                    {/* By Shift */}
                                    <h4 className="wa-section-title">{t('wa_performance_shift')}</h4>
                                    <div className="wa-shift-grid">
                                        {data.detail.performance.byShift.map(s => (
                                            <div key={s._id} className="wa-shift-card">
                                                <div className="wa-shift-name">{s._id === 'Morning' ? t('wa_shift_morning') : s._id === 'Afternoon' ? t('wa_shift_afternoon') : t('wa_shift_night')}</div>
                                                <div className="wa-shift-orders">{s.orders} pedidos</div>
                                                <div className="wa-shift-rev">{(s.revenue || 0).toLocaleString('pt-MZ')} {currency}</div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* By Day */}
                                    <h4 className="wa-section-title">{t('wa_performance_day')}</h4>
                                    <div className="wa-day-bars">
                                        {(() => {
                                            const maxOrders = Math.max(...data.detail.performance.byDay.map(d => d.orders), 1);
                                            return data.detail.performance.byDay.map(day => (
                                                <div key={day.day} className="wa-day-row">
                                                    <span className="wa-day-name">{(day.day || '').substring(0, 3)}</span>
                                                    <MiniBar value={day.orders} max={maxOrders} />
                                                    <span className="wa-day-count">{day.orders}</span>
                                                </div>
                                            ));
                                        })()}
                                    </div>

                                    {/* Weekly Trend */}
                                    <h4 className="wa-section-title">{t('wa_trend')}</h4>
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
                                    <h4 className="wa-section-title">{t('wa_top_customers')}</h4>
                                    {data.detail.performance.topCustomers.length === 0 ? (
                                        <div className="wa-empty"><Users size={48} /><p>{t('wa_no_customer_data')}</p></div>
                                    ) : (
                                        <table className="wa-customer-table">
                                            <thead>
                                                <tr><th>{t('wa_col_customer')}</th><th>{t('wa_col_orders')}</th><th>{t('wa_col_spent')}</th></tr>
                                            </thead>
                                            <tbody>
                                                {data.detail.performance.topCustomers.map((c, i) => (
                                                    <tr key={i}>
                                                        <td>
                                                            <div className="wa-cust-name">{c.name || 'Cliente'}</div>
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

// â”€â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
        exportToExcel({ title: 'RelatÃ³rio de GarÃ§ons', columns: Object.keys(rows[0]).map(k => ({ header: k, dataKey: k })), data: rows, filename: `garcons_${period}` });
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
                    <div className="wa-header-badge"><Users size={18} /> STAFF</div>
                    <h1>{t('wa_ranking_title')}</h1>
                    <p className="wa-header-sub">{t('wa_ranking_sub')}</p>
                </div>
                <div className="wa-header-controls">
                    <select className="wa-select" value={period} onChange={e => setPeriod(e.target.value)}>
                        <option value="1d">{t('wa_period_today')}</option>
                        <option value="7d">{t('wa_period_7d')}</option>
                        <option value="30d">{t('wa_period_30d')}</option>
                        <option value="90d">{t('wa_period_90d')}</option>
                    </select>
                    <button className="wa-btn-outline" onClick={fetchAnalytics}><RefreshCw size={16} />{t('wa_btn_refresh')}</button>
                    <button className="wa-btn-primary" onClick={handleExportAll}><Download size={16} />{t('wa_btn_export')}</button>
                </div>
            </div>

            {/* KPIs */}
            {summary && (
                <div className="wa-kpi-row">
                    <KPICard icon={Users} label={t('wa_total_collaborators')} value={summary.totalWaiters} sub={t('wa_active_count', { count: summary.activeWaiters })} color="#6366f1" />
                    <KPICard icon={TrendingUp} label={t('wa_total_orders')} value={summary.totalOrders} color="#10b981" />
                    <KPICard icon={DollarSign} label={t('wa_total_revenue')} value={`${(summary.totalRevenue || 0).toLocaleString('pt-MZ')} ${currency}`} color="#f59e0b" />
                    <KPICard icon={Award} label={t('wa_avg_efficiency')} value={`${summary.avgEfficiency}%`} color="#ec4899" />
                </div>
            )}

            {/* Ranking Table */}
            <div className="wa-card">
                <div className="wa-card-header">
                    <h2>{t('wa_team_performance')}</h2>
                    <div className="wa-sort-controls">
                        <span className="wa-sort-label">{t('wa_sort_by')}</span>
                        {[
                            { id: 'efficiency', label: t('wa_col_efficiency') },
                            { id: 'orders', label: t('wa_col_orders') },
                            { id: 'revenue', label: t('wa_col_revenue') },
                            { id: 'tables', label: t('wa_col_tables') }
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
                        <h3>{t('wa_empty_title')}</h3>
                        <p>{t('wa_empty_msg')}</p>
                    </div>
                ) : (
                    <div className="wa-table-wrap">
                        <table className="wa-table">
                            <thead>
                                <tr>
                                    <th style={{ width: 60 }}>{t('wa_col_rank')}</th>
                                    <th><span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Users size={13} />{t('wa_col_collaborator')}</span></th>
                                    <th><span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><ShoppingBag size={13} />{t('wa_col_orders')}</span></th>
                                    <th><span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Table2 size={13} />{t('wa_col_tables')}</span></th>
                                    <th><span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><UtensilsCrossed size={13} />{t('wa_col_dishes')}</span></th>
                                    <th><span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><DollarSign size={13} />{t('wa_col_revenue')}</span></th>
                                    <th><span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Phone size={13} />{t('wa_col_calls')}</span></th>
                                    <th><span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Timer size={13} />{t('wa_col_avg_time')}</span></th>
                                    <th><span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><TrendingUp size={13} />{t('wa_col_efficiency')}</span></th>
                                    <th style={{ width: 80 }}><span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Eye size={13} />{t('wa_col_details')}</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedWaiters.map((waiter, index) => {
                                    const medals = ['ðŸ¥‡', 'ðŸ¥ˆ', 'ðŸ¥‰'];
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
                                                    {!waiter.active && <span className="wa-inactive-tag">{t('wa_inactive')}</span>}
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
                                                {waiter.metrics.avgServiceTime > 0 ? `${waiter.metrics.avgServiceTime}m` : 'â€”'}
                                            </td>
                                            <td><EffBadge value={waiter.metrics.efficiency} /></td>
                                            <td>
                                                <button
                                                    className="wa-detail-btn"
                                                    onClick={() => setSelectedWaiter(waiter)}
                                                    title="Ver detalhes"
                                                >
                                                    <Eye size={15} />
                                                    <span>{t('wa_btn_view')}</span>
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

