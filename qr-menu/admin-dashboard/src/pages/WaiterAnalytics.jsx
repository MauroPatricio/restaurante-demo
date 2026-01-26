import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { waiterAnalyticsAPI } from '../services/api';
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

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const restaurant = user.restaurant;

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
                    <h1>Análise de Performance dos Garçons</h1>
                    <p className="subtitle">Métricas detalhadas de desempenho da equipe</p>
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
                            <p>Total de Garçons</p>
                            <span className="card-badge">{summary.activeWaiters || 0} ativos</span>
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
                            <th>Garçom</th>
                            <th>Pedidos</th>
                            <th>Receita</th>
                            <th>Chamadas</th>
                            <th>Tempo Médio</th>
                            <th>Eficiência</th>
                            <th>Ações</th>
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
                                <td>{waiter.metrics.totalRevenue.toLocaleString('pt-MZ')} MT</td>
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
                            <div className="details-section">
                                <h3><Clock size={20} /> Performance por Turno</h3>
                                <div className="shift-cards">
                                    {details.performance.byShift.map(shift => (
                                        <div key={shift._id} className="shift-card">
                                            <h4>{shift._id}</h4>
                                            <p>{shift.orders} pedidos</p>
                                            <p>{shift.revenue.toLocaleString('pt-MZ')} MT</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Performance by Day */}
                            <div className="details-section">
                                <h3>📅 Performance por Dia da Semana</h3>
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

                            {/* Weekly Trend */}
                            <div className="details-section">
                                <h3>📈 Tendência Semanal</h3>
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
            )}
        </div>
    );
};

export default WaiterAnalytics;
