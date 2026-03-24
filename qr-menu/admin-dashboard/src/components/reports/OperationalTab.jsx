import { useTranslation } from 'react-i18next';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Clock, Calendar, Users, TrendingUp, AlertCircle } from 'lucide-react';

// Modern Card Styles (matching SalesTab)
const cardStyle = {
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
    border: '1px solid rgba(0,0,0,0.02)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
};

const statCardStyle = {
    ...cardStyle,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    cursor: 'pointer',
    flex: 1,
    minWidth: '200px'
};

const iconBoxStyle = (color, bg) => ({
    padding: '12px',
    borderRadius: '12px',
    color: color,
    background: bg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
});

export default function OperationalTab({ data, loading }) {
    const { t } = useTranslation();

    if (loading) return <div className="p-4 text-center">{t('loading_operational_data')}</div>;
    if (!data) return <div className="p-4 text-center">{t('no_operational_data')}</div>;

    const { shifts = [], busiestDays = [], avgPrepTime = 0, slowestItems = [], avgDeliveryTime = 0 } = data || {};

    const daysOfWeek = [t('sun'), t('mon'), t('tue'), t('wed'), t('thu'), t('fri'), t('sat')].map(d => d || 'Unknown');
    // Fallback if translations are missing
    const fallbackDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Map day data to labels
    const dayData = busiestDays.map(d => ({
        day: daysOfWeek[(d._id || 1) - 1] || fallbackDays[(d._id || 1) - 1] || t('unknown'),
        orders: d.orders || 0,
        revenue: d.revenue || 0
    }));

    // Calculate stats
    const totalShiftOrders = shifts.reduce((sum, shift) => sum + (shift.orders || 0), 0);
    const avgOrdersPerShift = shifts.length > 0 ? totalShiftOrders / shifts.length : 0;
    const busiestDay = dayData.length > 0 ? dayData.reduce((max, day) => day.orders > max.orders ? day : max, dayData[0]) : null;
    const totalDayOrders = dayData.reduce((sum, day) => sum + (day.orders || 0), 0);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* KPI Cards */}
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', width: '100%' }}>
                {/* Avg Prep Time (New) */}
                <div style={statCardStyle} onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.1)';
                }} onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.05)';
                }}>
                    <div>
                        <p style={{ color: '#64748b', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {t('avg_prep_time') || 'Tempo Médio'}
                        </p>
                        <h3 style={{ fontSize: '32px', fontWeight: '800', color: '#1e293b', margin: '8px 0 0 0' }}>
                            {avgPrepTime} <span style={{ fontSize: '16px', color: '#64748b', fontWeight: '600' }}>min</span>
                        </h3>
                    </div>
                    <div style={iconBoxStyle('#ef4444', '#fef2f2')}>
                        <Clock size={24} strokeWidth={2.5} />
                    </div>
                </div>

                <div style={statCardStyle} onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.1)';
                }} onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.05)';
                }}>
                    <div>
                        <p style={{ color: '#64748b', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {t('avg_orders_shift') || 'Média Pedidos/Turno'}
                        </p>
                        <h3 style={{ fontSize: '32px', fontWeight: '800', color: '#1e293b', margin: '8px 0 0 0' }}>
                            {avgOrdersPerShift.toFixed(0)}
                        </h3>
                    </div>
                    <div style={iconBoxStyle('#3b82f6', '#eff6ff')}>
                        <TrendingUp size={24} strokeWidth={2.5} />
                    </div>
                </div>

                <div style={statCardStyle} onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.1)';
                }} onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.05)';
                }}>
                    <div>
                        <p style={{ color: '#64748b', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {t('busiest_day') || 'Dia Mais Movimentado'}
                        </p>
                        <h3 style={{ fontSize: '32px', fontWeight: '800', color: '#1e293b', margin: '8px 0 0 0' }}>
                            {busiestDay ? busiestDay.day : 'N/A'}
                        </h3>
                        {busiestDay && <p style={{ fontSize: '12px', color: '#10b981', marginTop: '4px', fontWeight: '600' }}>{busiestDay.orders} {t('orders')?.toLowerCase() || 'pedidos'}</p>}
                    </div>
                    <div style={iconBoxStyle('#f59e0b', '#fffbeb')}>
                        <Calendar size={24} strokeWidth={2.5} />
                    </div>
                </div>

                <div style={statCardStyle}>
                    <div>
                        <p style={{ color: '#64748b', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {t('avg_delivery_time')}
                        </p>
                        <h3 style={{ fontSize: '32px', fontWeight: '800', color: '#1e293b', margin: '8px 0 0 0' }}>
                            {avgDeliveryTime} <span style={{ fontSize: '16px', color: '#64748b', fontWeight: '600' }}>{t('min_suffix')}</span>
                        </h3>
                    </div>
                    <div style={iconBoxStyle('#8b5cf6', '#f5f3ff')}>
                        <Clock size={24} strokeWidth={2.5} />
                    </div>
                </div>

                <div style={statCardStyle}>
                    <div>
                        <p style={{ color: '#64748b', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {t('total_orders_kpi')}
                        </p>
                        <h3 style={{ fontSize: '32px', fontWeight: '800', color: '#10b981', margin: '8px 0 0 0' }}>
                            {totalDayOrders}
                        </h3>
                    </div>
                    <div style={iconBoxStyle('#10b981', '#ecfdf5')}>
                        <Users size={24} strokeWidth={2.5} />
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* ... existing charts ... */}
                <div style={cardStyle}>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '24px' }}>
                        {t('orders_by_shift') || 'Pedidos por Turno'}
                    </h3>
                    {shifts.length > 0 ? (
                        <div style={{ width: '100%', height: 350, minHeight: '350px' }}>
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                <BarChart data={shifts}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="_id" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="orders" fill="#8b5cf6" radius={[4, 4, 0, 0]} name={t('orders') || 'Pedidos'} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '350px', color: '#cbd5e1' }}>
                            <p>{t('no_orders_found') || 'No shift data available'}</p>
                        </div>
                    )}
                </div>

                <div style={cardStyle}>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '24px' }}>
                        {t('busiest_days') || 'Dias Mais Movimentados'}
                    </h3>
                    {dayData.length > 0 ? (
                        <div style={{ width: '100%', height: 350, minHeight: '350px' }}>
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                <BarChart data={dayData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="day" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="orders" fill="#f59e0b" radius={[4, 4, 0, 0]} name={t('orders') || 'Pedidos'} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '350px', color: '#cbd5e1' }}>
                            <p>{t('no_orders_found') || 'No day data available'}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Slowest Items Section */}
            <div style={{ ...cardStyle }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <AlertCircle size={20} className="text-red-500" />
                    {t('slowest_dishes') || 'Pratos Mais Demorados (Top 5)'}
                </h3>

                {slowestItems && slowestItems.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <th style={{ padding: '12px 0', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>{t('dish')}</th>
                                    <th style={{ padding: '12px 0', textAlign: 'right', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>{t('avg_time')}</th>
                                    <th style={{ padding: '12px 0', textAlign: 'right', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>{t('orders')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {slowestItems.map((item, index) => (
                                    <tr key={item._id || index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '16px 0', fontWeight: '600', color: '#334155' }}>{item.name}</td>
                                        <td style={{ padding: '16px 0', textAlign: 'right', fontWeight: '700', color: '#ef4444' }}>{item.avgPrepTime} {t('min_suffix')}</td>
                                        <td style={{ padding: '16px 0', textAlign: 'right', color: '#64748b' }}>{item.orderCount}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
                        {t('no_prep_time_data')}
                    </div>
                )}
            </div>
        </div>
    );
}
