import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { waiterAnalyticsAPI } from '../services/api';
import { getCurrencySymbol } from '../utils/currencyUtils';
import { Users, TrendingUp, Clock, Award, RefreshCw } from 'lucide-react';
import './WaiterAnalytics.css';

const WaiterAnalytics = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [waiters, setWaiters] = useState([]);
    const [summary, setSummary] = useState(null);
    const [period, setPeriod] = useState('30d');
    const [selectedWaiter, setSelectedWaiter] = useState(null);
    const [details, setDetails] = useState(null);

    const { user } = useAuth();
    const restaurant = user?.restaurant;

    useEffect(() => {
        if (restaurant?._id || restaurant) {
            fetchAnalytics();
        }
    }, [restaurant, period]);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const restaurantId = restaurant._id || restaurant;
            const { data } = await waiterAnalyticsAPI.getAll(restaurantId, { period });

            setWaiters(data.waiters || []);
            setSummary(data.summary || {});
        } catch (error) {
            console.error('Failed to fetch waiter analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchWaiterDetails = async (waiterId) => {
        try {
            const restaurantId = restaurant._id || restaurant;
            const { data } = await waiterAnalyticsAPI.getDetails(restaurantId, waiterId, { period });
            setDetails(data);
            setSelectedWaiter(waiterId);
        } catch (error) {
            console.error('Failed to fetch waiter details:', error);
        }
    };

    const getEfficiencyClass = (efficiency) => {
        if (efficiency >= 85) return 'efficiency-high';
        if (efficiency >= 70) return 'efficiency-medium';
        return 'efficiency-low';
    };

    const getEfficiencyLabel = (efficiency) => {
        if (efficiency >= 85) return 'Excelente';
        if (efficiency >= 70) return 'Bom';
        return 'Precisa Melhorar';
    };

    if (loading) {
        return (
            <div className="waiter-analytics-container">
                <div className="loading-state">
                    <RefreshCw className="spin" size={48} />
                    <p>Carregando análises...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="waiter-analytics-container">
            <div className="analytics-header">
            <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <div style={{ padding: '8px', background: '#ec4899', color: 'white', borderRadius: '10px' }}>
                        <Users size={20} />
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#ec4899' }}>{t('team_module')}</span>
                </div>
                <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#1e293b', margin: 0 }}>{t('staff_ranking')}</h1>
                <p className="subtitle" style={{ color: '#64748b', fontWeight: '600' }}>{t('team_intelligence_desc')}</p>
            </div>

                <div className="header-controls">
                    <select value={period} onChange={(e) => setPeriod(e.target.value)} className="period-select">
                        <option value="7d">Últimos 7 dias</option>
                        <option value="30d">Últimos 30 dias</option>
                        <option value="90d">Últimos 90 dias</option>
                    </select>
                    <button onClick={fetchAnalytics} className="refresh-btn">
                        <RefreshCw size={18} />
                        Atualizar
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            {summary && (
                <div className="summary-cards">
                    <div className="summary-card">
                        <Users size={32} className="card-icon" />
                        <div className="card-content">
                            <h3>{summary.totalWaiters || 0}</h3>
                            <p>{t('total_waiters') || 'Total de Colaboradores'}</p>
                            <span className="card-badge">{summary.activeWaiters || 0} {t('active') || 'ativos'}</span>
                        </div>
                    </div>

                    <div className="summary-card">
                        <TrendingUp size={32} className="card-icon" />
                        <div className="card-content">
                            <h3>{summary.totalOrders || 0}</h3>
                            <p>Pedidos Totais</p>
                        </div>
                    </div>

                    <div className="summary-card">
                        <Award size={32} className="card-icon" />
                        <div className="card-content">
                            <h3>{summary.avgEfficiency || 0}%</h3>
                            <p>Eficiência Média</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Waiters Table */}
            <div className="waiters-table-container">
                <h2>Ranking de Performance</h2>
                <table className="waiters-table">
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>{t('staff_name')}</th>
                            <th>{t('orders')}</th>
                            <th>{t('revenue')}</th>
                            <th>{t('resolved_calls') || 'Chamadas'}</th>
                            <th>{t('avg_service_time') || 'Tempo Médio'}</th>
                            <th>{t('efficiency')}</th>
                            <th>{t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {waiters.map((waiter, index) => (
                            <tr key={waiter.waiterId} className={selectedWaiter === waiter.waiterId ? 'selected' : ''}>
                                <td className="rank-cell">
                                    {index === 0 && <span className="medal gold">🥇</span>}
                                    {index === 1 && <span className="medal silver">🥈</span>}
                                    {index === 2 && <span className="medal bronze">🥉</span>}
                                    {index > 2 && <span className="rank-number">{index + 1}</span>}
                                </td>
                                <td>
                                    <div className="waiter-info">
                                        <strong>{waiter.waiterName}</strong>
                                        {!waiter.active && <span className="inactive-badge">Inativo</span>}
                                    </div>
                                </td>
                                <td>{waiter.metrics.totalOrders}</td>
                                <td>{waiter.metrics.totalRevenue.toLocaleString('pt-MZ')} {getCurrencySymbol(user?.restaurant?.settings?.currency || 'MZN')}</td>
                                <td>{waiter.metrics.callsResolved}</td>
                                <td>{waiter.metrics.avgServiceTime} min</td>
                                <td>
                                    <div className={`efficiency-badge ${getEfficiencyClass(waiter.metrics.efficiency)}`}>
                                        {waiter.metrics.efficiency}%
                                        <span className="efficiency-label">{getEfficiencyLabel(waiter.metrics.efficiency)}</span>
                                    </div>
                                </td>
                                <td>
                                    <button
                                        onClick={() => fetchWaiterDetails(waiter.waiterId)}
                                        className="view-details-btn"
                                    >
                                        Ver Detalhes
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {waiters.length === 0 && (
                    <div className="empty-state">
                        <Users size={64} />
                        <p>Nenhum dado de garçom disponível</p>
                        <small>Garçons precisam criar pedidos assistidos para aparecer nas métricas</small>
                    </div>
                )}
            </div>

            {/* Waiter Details Modal */}
            {details && selectedWaiter && (
                <div className="modal-overlay" onClick={() => setDetails(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Detalhes de Performance - {details.waiter.name}</h2>
                            <button onClick={() => setDetails(null)} className="close-btn">×</button>
                        </div>

                        <div className="modal-body">
                            {/* Performance by Shift */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                <div className="details-section">
                                    <h3><Clock size={20} /> {t('service_time_stats')}</h3>
                                    <div className="shift-cards">
                                        {details.performance.byShift.map(shift => (
                                            <div key={shift._id} className="shift-card">
                                                <h4>{t(shift._id) || shift._id}</h4>
                                                <p>{shift.orders} {t('orders')}</p>
                                                <p>{shift.revenue.toLocaleString('pt-MZ')} {getCurrencySymbol(user?.restaurant?.settings?.currency || 'MZN')}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Efficiency Insights */}
                                <div className="details-section">
                                    <h3><TrendingUp size={20} /> {t('efficiency_insights')}</h3>
                                    <div style={{ 
                                        background: details.performance.insights.isFasterThanAverage ? '#ecfdf5' : '#fffbeb',
                                        padding: '20px',
                                        borderRadius: '16px',
                                        border: `1px solid ${details.performance.insights.isFasterThanAverage ? '#d1fae5' : '#fef3c7'}`
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                            <span style={{ fontSize: '14px', fontWeight: '600', color: '#64748b' }}>{t('avg_service_time')}</span>
                                            <span style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b' }}>{details.performance.insights.avgCompletionTime} min</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '13px', fontWeight: '600', color: details.performance.insights.isFasterThanAverage ? '#059669' : '#d97706' }}>
                                                {details.performance.insights.isFasterThanAverage ? t('faster_than_avg') : t('slower_than_avg')}
                                            </span>
                                            <span style={{ 
                                                fontSize: '12px', 
                                                fontWeight: '700', 
                                                background: details.performance.insights.isFasterThanAverage ? '#059669' : '#d97706',
                                                color: 'white',
                                                padding: '2px 8px',
                                                borderRadius: '6px'
                                            }}>
                                                {details.performance.insights.differencePercentage}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Top Customers (Waiters relationship) */}
                            <div className="details-section">
                                <h3><Users size={20} /> {t('customers_served_history')}</h3>
                                <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '8px' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                                                <th style={{ padding: '12px', fontSize: '12px', fontWeight: '700', color: '#64748b' }}>{t('customer')}</th>
                                                <th style={{ padding: '12px', fontSize: '12px', fontWeight: '700', color: '#64748b', textAlign: 'center' }}>{t('orders')}</th>
                                                <th style={{ padding: '12px', fontSize: '12px', fontWeight: '700', color: '#64748b', textAlign: 'right' }}>{t('spent_with_waiter')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {details.performance.topCustomers.map((customer, i) => (
                                                <tr key={i} style={{ borderBottom: i === details.performance.topCustomers.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '12px' }}>
                                                        <div style={{ fontWeight: '700', color: '#1e293b' }}>{customer.name}</div>
                                                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{customer.phone}</div>
                                                    </td>
                                                    <td style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>{customer.orders}</td>
                                                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: '700', color: '#10b981' }}>
                                                        {customer.spent.toLocaleString('pt-MZ')} {getCurrencySymbol(user?.restaurant?.settings?.currency || 'MZN')}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Performance by Day */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                <div className="details-section">
                                    <h3>📅 {t('performance_by_day') || 'Performance por Dia'}</h3>
                                    <div className="day-bars">
                                        {details.performance.byDay.map(day => (
                                            <div key={day.day} className="day-bar">
                                                <span className="day-label">{day.day.substring(0, 3)}</span>
                                                <div className="bar-container">
                                                    <div
                                                        className="bar-fill"
                                                        style={{ width: `${(day.orders / Math.max(...details.performance.byDay.map(d => d.orders))) * 100}%` }}
                                                    />
                                                </div>
                                                <span className="day-value">{day.orders}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="details-section">
                                    <h3>📈 {t('weekly_trend')}</h3>
                                    <div className="trend-chart">
                                        {details.performance.weeklyTrend.slice(-7).map(week => (
                                            <div key={week.date} className="trend-bar">
                                                <div
                                                    className="trend-fill"
                                                    style={{ height: `${(week.orders / Math.max(...details.performance.weeklyTrend.map(w => w.orders))) * 100}%` }}
                                                />
                                                <span className="trend-date">{new Date(week.date).getDate()}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WaiterAnalytics;
