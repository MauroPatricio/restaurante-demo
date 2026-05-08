import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { kitchenAnalyticsAPI } from '../services/api';
import { getCurrencySymbol } from '../utils/currencyUtils';
import { exportToCSV, exportToExcel, formatKitchenDishReportForExport, formatKitchenShiftReportForExport } from '../utils/exportUtils';
import {
    UtensilsCrossed, Clock, BarChart2, TrendingUp, TrendingDown,
    AlertTriangle, CheckCircle, RefreshCw, Download, Zap, Flame
} from 'lucide-react';
import './KitchenAnalytics.css';

// ─── KPI Card ─────────────────────────────────────────────────────────────────
const KPICard = ({ icon: Icon, label, value, sub, color, alert }) => (
    <div className="ka-kpi-card" style={{ '--ka-color': color }}>
        <div className="ka-kpi-icon"><Icon size={22} /></div>
        <div className="ka-kpi-body">
            <div className="ka-kpi-value">{value}</div>
            <div className="ka-kpi-label">{label}</div>
            {sub && <div className={`ka-kpi-sub ${alert ? 'alert' : ''}`}>{sub}</div>}
        </div>
    </div>
);

// ─── Bar Chart (horizontal) ───────────────────────────────────────────────────
const HBar = ({ value, max, color = '#6366f1', label }) => (
    <div className="ka-hbar-row">
        <span className="ka-hbar-label">{label}</span>
        <div className="ka-hbar-track">
            <div className="ka-hbar-fill" style={{ width: `${max > 0 ? Math.min((value / max) * 100, 100) : 0}%`, background: color }} />
        </div>
        <span className="ka-hbar-value">{value}</span>
    </div>
);

// ─── Timeline Chart (vertical bars, per hour) ─────────────────────────────────
const TimelineChart = ({ data, peakHour }) => {
    const max = Math.max(...data.map(d => d.orders), 1);
    return (
        <div className="ka-timeline">
            {data.filter((_, i) => i % 1 === 0).map(h => (
                <div key={h.hour} className="ka-timeline-col">
                    <div className="ka-timeline-bar-wrap">
                        <div
                            className={`ka-timeline-bar ${h.hour === peakHour ? 'peak' : ''}`}
                            style={{ height: `${(h.orders / max) * 100}%` }}
                            title={`${h.hour}: ${h.orders} pedidos`}
                        />
                    </div>
                    <span className="ka-timeline-label">{h.hour.split(':')[0]}</span>
                </div>
            ))}
        </div>
    );
};

// ─── Shift Card ───────────────────────────────────────────────────────────────
const ShiftCard = ({ shift }) => {
    const icons = { morning: '🌅', afternoon: '☀️', night: '🌙' };
    const effColor = shift.efficiency >= 80 ? '#10b981' : shift.efficiency >= 60 ? '#f59e0b' : '#ef4444';
    return (
        <div className="ka-shift-card">
            <div className="ka-shift-header">
                <span className="ka-shift-icon">{icons[shift.shift]}</span>
                <span className="ka-shift-label">{shift.label}</span>
            </div>
            <div className="ka-shift-kpis">
                <div className="ka-shift-kpi">
                    <div className="ka-shift-val">{shift.totalOrders}</div>
                    <div className="ka-shift-lbl">Pedidos</div>
                </div>
                <div className="ka-shift-kpi">
                    <div className="ka-shift-val">{shift.avgPrepTime}m</div>
                    <div className="ka-shift-lbl">Avg Prep</div>
                </div>
                <div className="ka-shift-kpi">
                    <div className="ka-shift-val" style={{ color: effColor }}>{shift.efficiency}%</div>
                    <div className="ka-shift-lbl">Eficiência</div>
                </div>
            </div>
            {shift.delayedOrders > 0 && (
                <div className="ka-shift-alert">
                    <AlertTriangle size={12} />
                    {t('ka_delayed_orders', { count: shift.delayedOrders })}
                </div>
            )}
        </div>
    );
};

// ─── Bottleneck Badge ─────────────────────────────────────────────────────────
const PrepTimeBadge = ({ minutes }) => {
    if (minutes == null) return <span className="ka-badge-na">N/D</span>;
    const cls = minutes > 30 ? 'danger' : minutes > 20 ? 'warn' : 'good';
    return <span className={`ka-prep-badge ka-prep-${cls}`}>{minutes}m</span>;
};

// ─── Main Component ────────────────────────────────────────────────────────────
const KitchenAnalytics = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const restaurantId = user?.restaurant?._id || user?.restaurant;
    const currency = getCurrencySymbol(user?.restaurant?.settings?.currency || 'MZN');

    const [period, setPeriod] = useState('7d');
    const [loading, setLoading] = useState(true);
    const [dashboard, setDashboard] = useState(null);
    const [dishes, setDishes] = useState([]);
    const [bottlenecks, setBottlenecks] = useState(0);
    const [slowest, setSlowest] = useState([]);
    const [fastest, setFastest] = useState([]);
    const [timeline, setTimeline] = useState([]);
    const [peakHour, setPeakHour] = useState('—');
    const [shifts, setShifts] = useState([]);
    const [activeTab, setActiveTab] = useState('overview');
    const [dishSort, setDishSort] = useState('quantity');

    const fetchAll = useCallback(async () => {
        if (!restaurantId) return;
        try {
            setLoading(true);
            const [dashRes, dishRes, timelineRes, shiftRes] = await Promise.all([
                kitchenAnalyticsAPI.getDashboard(restaurantId, { period }),
                kitchenAnalyticsAPI.getDishStats(restaurantId, { period, limit: 30 }),
                kitchenAnalyticsAPI.getTimeline(restaurantId, { period }),
                kitchenAnalyticsAPI.getShiftReport(restaurantId, { period })
            ]);
            setDashboard(dashRes.data.kpis);
            setDishes(dishRes.data.dishes || []);
            setBottlenecks(dishRes.data.bottlenecks || 0);
            setSlowest(dishRes.data.slowestDishes || []);
            setFastest(dishRes.data.fastestDishes || []);
            setTimeline(timelineRes.data.timeline || []);
            setPeakHour(timelineRes.data.peakHour || '—');
            setShifts(shiftRes.data.shifts || []);
        } catch (err) {
            console.error('Failed to load kitchen analytics:', err);
        } finally {
            setLoading(false);
        }
    }, [restaurantId, period]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const sortedDishes = [...dishes].sort((a, b) => {
        if (dishSort === 'prepTime') return (b.avgPrepTime || 0) - (a.avgPrepTime || 0);
        if (dishSort === 'revenue') return b.totalRevenue - a.totalRevenue;
        return b.totalQuantity - a.totalQuantity;
    });

    const maxQty = Math.max(...dishes.map(d => d.totalQuantity), 1);

    const handleExportDishes = () => {
        const rows = formatKitchenDishReportForExport(sortedDishes, period);
        exportToExcel({ title: 'Analytics Cozinha — Pratos', columns: Object.keys(rows[0]).map(k => ({ header: k, dataKey: k })), data: rows, filename: `cozinha_pratos_${period}` });
    };

    const handleExportShifts = () => {
        const rows = formatKitchenShiftReportForExport(shifts);
        exportToCSV(rows, `cozinha_turnos_${period}.csv`);
    };

    if (loading) {
        return (
            <div className="ka-container">
                <div className="ka-loading">
                    <RefreshCw size={40} className="spin" />
                    <p>{t('ka_loading')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="ka-container">
            {/* Header */}
            <div className="ka-header">
                <div className="ka-header-left">
                    <div className="ka-header-badge"><UtensilsCrossed size={16} /> {t('ka_kitchen_badge')}</div>
                    <h1>{t('ka_kitchen_title')}</h1>
                    <p className="ka-header-sub">{t('ka_kitchen_sub')}</p>
                </div>
                <div className="ka-header-controls">
                    <select className="ka-select" value={period} onChange={e => setPeriod(e.target.value)}>
                        <option value="1d">{t('wa_period_today')}</option>
                        <option value="7d">{t('wa_period_7d')}</option>
                        <option value="30d">{t('wa_period_30d')}</option>
                        <option value="90d">{t('wa_period_90d')}</option>
                    </select>
                    <button className="ka-btn-outline" onClick={fetchAll}>{t('ka_btn_refresh')}</button>
                    <button className="ka-btn-primary" onClick={handleExportDishes}>{t('ka_btn_export')}</button>
                </div>
            </div>

            {/* Alert Banner */}
            {bottlenecks > 0 && (
                <div className="ka-alert-banner">
                    <AlertTriangle size={18} />
                    <span><strong>{bottlenecks} prato{bottlenecks > 1 ? 's' : ''}</strong> com tempo médio de preparo acima de 30 minutos — {t('ka_bottleneck_alert', { count: bottlenecks })}</span>
                </div>
            )}

            {/* KPI Row */}
            {dashboard && (
                <div className="ka-kpi-row">
                    <KPICard icon={UtensilsCrossed} label={t('ka_dishes_prepared')} value={dashboard.totalDishes} sub={`${dashboard.completedOrders} pedidos`} color="#6366f1" />
                    <KPICard icon={Clock} label={t('ka_avg_time')} value={`${dashboard.avgPrepTime}m`} sub={`Min: ${dashboard.minPrepTime}m · Máx: ${dashboard.maxPrepTime}m`} color="#f59e0b" />
                    <KPICard icon={CheckCircle} label={t('ka_efficiency')} value={`${dashboard.efficiency}%`} sub={t('ka_within_25')} color="#10b981" />
                    <KPICard icon={Flame} label={t('ka_delayed')} value={`${dashboard.delayRate}%`} sub={t('ka_delayed_over30', { count: dashboard.delayedOrders })} color="#ef4444" alert />
                    <KPICard icon={BarChart2} label={t('ka_peak_hour')} value={peakHour} sub={t('ka_peak_volume')} color="#ec4899" />
                    <KPICard icon={TrendingUp} label={t('ka_cancellations')} value={`${dashboard.cancellationRate}%`} sub={t('ka_cancelled_count', { count: dashboard.cancelledOrders })} color="#64748b" />
                </div>
            )}

            {/* Tabs */}
            <div className="ka-tab-bar">
                {[
                    { id: 'overview', label: `📊 ${t('ka_tab_overview')}` },
                    { id: 'dishes', label: `🍽️ ${t('ka_tab_dishes')}` },
                    { id: 'shifts', label: `🕐 ${t('ka_tab_shifts')}` },
                    { id: 'timeline', label: `📈 ${t('ka_tab_timeline')}` }
                ].map(tab => (
                    <button key={tab.id} className={`ka-tab ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ── Overview Tab ── */}
            {activeTab === 'overview' && (
                <div className="ka-grid-2">
                    {/* Fastest Dishes */}
                    <div className="ka-card">
                        <div className="ka-card-header">
                            <Zap size={18} style={{ color: '#10b981' }} />
                            <h3>{t('ka_fastest_dishes')}</h3>
                        </div>
                        {fastest.length === 0 ? (
                            <div className="ka-empty-sm">{t('ka_no_data')}</div>
                        ) : fastest.map((d, i) => (
                            <div key={i} className="ka-dish-row">
                                <span className="ka-dish-rank">#{i + 1}</span>
                                <span className="ka-dish-name">{d.name}</span>
                                <PrepTimeBadge minutes={d.avgPrepTime} />
                                <span className="ka-dish-samples">{t('ka_samples', { count: d.samples })}</span>
                            </div>
                        ))}
                    </div>

                    {/* Slowest Dishes */}
                    <div className="ka-card">
                        <div className="ka-card-header">
                            <AlertTriangle size={18} style={{ color: '#ef4444' }} />
                            <h3>{t('ka_slowest_dishes')}</h3>
                        </div>
                        {slowest.length === 0 ? (
                            <div className="ka-empty-sm">{t('ka_no_data')}</div>
                        ) : slowest.map((d, i) => (
                            <div key={i} className="ka-dish-row">
                                <span className="ka-dish-rank">#{i + 1}</span>
                                <span className="ka-dish-name">{d.name}</span>
                                <PrepTimeBadge minutes={d.avgPrepTime} />
                                <span className="ka-dish-samples">{t('ka_samples', { count: d.samples })}</span>
                            </div>
                        ))}
                    </div>

                    {/* Timeline Preview */}
                    <div className="ka-card ka-card-full">
                        <div className="ka-card-header">
                            <BarChart2 size={18} style={{ color: '#6366f1' }} />
                            <h3>{t('ka_orders_by_hour')}</h3>
                            {peakHour && <span className="ka-peak-tag">Pico: {peakHour}</span>}
                        </div>
                        <div className="ka-timeline-wrap">
                            <TimelineChart data={timeline} peakHour={peakHour} />
                        </div>
                    </div>
                </div>
            )}

            {/* ── Dishes Tab ── */}
            {activeTab === 'dishes' && (
                <div className="ka-card">
                    <div className="ka-card-header">
                        <h3>{t('ka_performance_by_dish')}</h3>
                        <div className="ka-sort-controls">
                            <span className="ka-sort-label">Ordenar:</span>
                            {[
                                { id: 'quantity', label: t('ka_sort_quantity') },
                                { id: 'prepTime', label: t('ka_sort_prep_time') },
                                { id: 'revenue', label: t('ka_col_revenue') }
                            ].map(s => (
                                <button key={s.id} className={`ka-sort-btn ${dishSort === s.id ? 'active' : ''}`} onClick={() => setDishSort(s.id)}>
                                    {s.label}
                                </button>
                            ))}
                        </div>
                        <button className="ka-btn-outline" onClick={handleExportDishes}><Download size={14} /> {t('ka_btn_excel')}</button>
                    </div>
                    {sortedDishes.length === 0 ? (
                        <div className="ka-empty"><UtensilsCrossed size={56} /><p>{t('ka_no_dishes')}</p></div>
                    ) : (
                        <div className="ka-table-wrap">
                            <table className="ka-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>{t('ka_col_dishes')}</th>
                                        <th>{t('ka_col_category')}</th>
                                        <th>{t('ka_col_qty')}</th>
                                        <th>{t('ka_col_orders')}</th>
                                        <th>{t('ka_col_revenue')}</th>
                                        <th>{t('ka_col_avg_time')}</th>
                                        <th>{t('ka_col_min_max')}</th>
                                        <th>{t('ka_col_status')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedDishes.map((dish, i) => (
                                        <tr key={dish.itemId || i} className={dish.isBottleneck ? 'bottleneck' : ''}>
                                            <td className="center">{i + 1}</td>
                                            <td className="ka-dish-name-cell">
                                                {dish.isBottleneck && <AlertTriangle size={14} className="ka-icon-warn" />}
                                                {dish.name}
                                            </td>
                                            <td>
                                                <span className="ka-category-badge">{dish.category}</span>
                                            </td>
                                            <td>
                                                <div className="ka-qty-cell">
                                                    <span className="ka-qty-val">{dish.totalQuantity}</span>
                                                    <div className="ka-qty-bar">
                                                        <div className="ka-qty-fill" style={{ width: `${(dish.totalQuantity / maxQty) * 100}%` }} />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="center">{dish.orderCount}</td>
                                            <td className="ka-green-text">{(dish.totalRevenue || 0).toLocaleString('pt-MZ')} {currency}</td>
                                            <td><PrepTimeBadge minutes={dish.avgPrepTime} /></td>
                                            <td className="ka-minmax">
                                                {dish.minPrepTime != null ? (
                                                    <span>{dish.minPrepTime}m — {dish.maxPrepTime}m</span>
                                                ) : '—'}
                                            </td>
                                            <td>
                                                {dish.isBottleneck ? (
                                                    <span className="ka-status-badge danger">{t('ka_bottleneck_label')}</span>
                                                ) : dish.avgPrepTime != null ? (
                                                    <span className="ka-status-badge ok">{t('ka_normal_label')}</span>
                                                ) : (
                                                    <span className="ka-status-badge neutral">{t('ka_no_data_label')}</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ── Shifts Tab ── */}
            {activeTab === 'shifts' && (
                <div>
                    <div className="ka-card-header-standalone">
                        <h3>{t('ka_performance_by_shift')}</h3>
                        <button className="ka-btn-outline" onClick={handleExportShifts}><Download size={14} /> {t('ka_btn_csv')}</button>
                    </div>
                    <div className="ka-shifts-grid">
                        {shifts.map(shift => <ShiftCard key={shift.shift} shift={shift} />)}
                    </div>

                    {/* Shift Comparison Table */}
                    <div className="ka-card" style={{ marginTop: 20 }}>
                        <div className="ka-card-header"><h3>{t('ka_detailed_comparison')}</h3></div>
                        <div className="ka-table-wrap">
                            <table className="ka-table">
                                <thead>
                                    <tr>
                                        <th>{t('ka_col_shift')}</th>
                                        <th>{t('ka_col_total_orders')}</th>
                                        <th>{t('ka_col_completed')}</th>
                                        <th>{t('ka_col_revenue')}</th>
                                        <th>{t('ka_col_avg_prep')}</th>
                                        <th>{t('ka_col_delayed')}</th>
                                        <th>{t('ka_col_efficiency')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {shifts.map(s => (
                                        <tr key={s.shift}>
                                            <td><strong>{s.label}</strong></td>
                                            <td className="center">{s.totalOrders}</td>
                                            <td className="center">{s.completedOrders}</td>
                                            <td className="ka-green-text">{(s.totalRevenue || 0).toLocaleString('pt-MZ')} {currency}</td>
                                            <td><PrepTimeBadge minutes={s.avgPrepTime} /></td>
                                            <td className={`center ${s.delayedOrders > 0 ? 'ka-red-text' : ''}`}>{s.delayedOrders}</td>
                                            <td>
                                                <div className="ka-eff-bar-wrap">
                                                    <div className="ka-eff-bar" style={{ width: `${s.efficiency}%`, background: s.efficiency >= 80 ? '#10b981' : s.efficiency >= 60 ? '#f59e0b' : '#ef4444' }} />
                                                    <span>{s.efficiency}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Timeline Tab ── */}
            {activeTab === 'timeline' && (
                <div className="ka-card">
                    <div className="ka-card-header">
                        <h3>{t('ka_orders_by_hour_title')}</h3>
                        {peakHour && <span className="ka-peak-tag">Hora de Pico: {peakHour}</span>}
                    </div>
                    <div className="ka-timeline-wrap large">
                        <TimelineChart data={timeline} peakHour={peakHour} />
                    </div>
                    <div className="ka-timeline-legend">
                        <span className="ka-legend-item">
                            <span className="ka-legend-dot peak" />
                            {t('ka_peak_hour_legend')}
                        </span>
                        <span className="ka-legend-item">
                            <span className="ka-legend-dot normal" />
                            {t('ka_normal_volume')}
                        </span>
                    </div>

                    {/* Horizontal bars per hour with order count */}
                    <div style={{ padding: '16px 24px 24px' }}>
                        <div className="ka-section-title">{t('ka_top_hours')}</div>
                        {[...timeline]
                            .sort((a, b) => b.orders - a.orders)
                            .slice(0, 10)
                            .map((h, i) => (
                                <HBar key={h.hour} label={h.hour} value={h.orders} max={timeline[0]?.orders || 1} color={i === 0 ? '#ec4899' : '#6366f1'} />
                            ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default KitchenAnalytics;
