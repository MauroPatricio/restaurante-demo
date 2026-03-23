import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { User, ShoppingBag, Star, TrendingUp, Award, Award as Medal } from 'lucide-react';
import { useCurrency } from '../../contexts/CurrencyContext';

// Modern Card Styles
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
    minWidth: '240px'
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

export default function StaffTab({ data, loading }) {
    const { t } = useTranslation();
    const { convertAndFormat } = useCurrency();

    if (loading) return <div className="p-8 text-center" style={{ color: '#64748b', fontWeight: '600' }}>{t('loading_staff_data') || 'Carregando dados do staff...'}</div>;
    if (!data || !data.ranking || data.ranking.length === 0) {
        return (
            <div style={{ ...cardStyle, textAlign: 'center', padding: '64px', color: '#94a3b8' }}>
                <User size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                <p style={{ fontSize: '16px', fontWeight: '600' }}>{t('no_staff_data') || 'Nenhum dado de staff disponível para o período selecionado.'}</p>
            </div>
        );
    }

    const { ranking = [] } = data;

    // Calculate overall staff KPIs
    const totalOrders = ranking.reduce((sum, w) => sum + (w.totalOrders || 0), 0);
    const totalRevenue = ranking.reduce((sum, w) => sum + (w.totalRevenue || 0), 0);
    const avgOrders = ranking.length > 0 ? totalOrders / ranking.length : 0;
    const bestWaiter = ranking.length > 0 ? ranking.reduce((prev, current) => (prev.totalOrders > current.totalOrders) ? prev : current) : null;

    // Chart Data - Top 10 by Orders
    const chartData = ranking.slice(0, 10).map(w => ({
        name: w.name || t('waiter') || 'Funcionário',
        orders: w.totalOrders || 0,
        revenue: w.totalRevenue || 0
    }));

    const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* KPI Cards */}
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', width: '100%' }}>
                <div style={statCardStyle}>
                    <div>
                        <p style={{ color: '#64748b', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {t('total_staff_orders') || 'Total de Mesas/Pedidos'}
                        </p>
                        <h3 style={{ fontSize: '32px', fontWeight: '800', color: '#1e293b', margin: '8px 0 0 0' }}>
                            {totalOrders}
                        </h3>
                        <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', fontWeight: '600' }}>
                           {t('avg_per_staff') || 'Média'}: {avgOrders.toFixed(1)}
                        </p>
                    </div>
                    <div style={iconBoxStyle('#3b82f6', '#eff6ff')}>
                        <ShoppingBag size={24} strokeWidth={2.5} />
                    </div>
                </div>

                <div style={statCardStyle}>
                    <div>
                        <p style={{ color: '#64748b', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {t('best_performer') || 'Melhor Desempenho'}
                        </p>
                        <h3 style={{ fontSize: '24px', fontWeight: '800', color: '#1e293b', margin: '8px 0 0 0' }}>
                            {bestWaiter ? bestWaiter.name : 'N/A'}
                        </h3>
                        {bestWaiter && (
                            <p style={{ fontSize: '12px', color: '#10b981', marginTop: '4px', fontWeight: '600' }}>
                                {bestWaiter.totalOrders} {t('orders')?.toLowerCase() || 'pedidos'}
                            </p>
                        )}
                    </div>
                    <div style={iconBoxStyle('#f59e0b', '#fffbeb')}>
                        <Award size={24} strokeWidth={2.5} />
                    </div>
                </div>

                <div style={statCardStyle}>
                    <div>
                        <p style={{ color: '#64748b', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {t('total_staff_sales') || 'Volume de Vendas (Staff)'}
                        </p>
                        <h3 style={{ fontSize: '30px', fontWeight: '800', color: '#1e293b', margin: '8px 0 0 0' }}>
                            {convertAndFormat(totalRevenue)}
                        </h3>
                    </div>
                    <div style={iconBoxStyle('#10b981', '#ecfdf5')}>
                        <TrendingUp size={24} strokeWidth={2.5} />
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: '24px' }}>
                
                {/* Waiter Performance Table */}
                <div style={cardStyle}>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <User size={20} style={{ color: '#6366f1' }} />
                        {t('staff_ranking') || 'Ranking de Funcionários'}
                    </h3>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>{t('staff_name') || 'Nome'}</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>{t('orders') || 'Pedidos'}</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>{t('revenue') || 'Vendas'}</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>{t('score') || 'Pontuação'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ranking.map((waiter, index) => (
                                    <tr key={waiter._id || index} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }}>
                                        <td style={{ padding: '16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                {index < 3 && <Medal size={16} color={index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : '#cd7f32'} />}
                                                <div>
                                                    <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>{waiter.name}</div>
                                                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{waiter.role || t('waiter')}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px', textAlign: 'right', fontWeight: '700', color: '#334155' }}>{waiter.totalOrders || 0}</td>
                                        <td style={{ padding: '16px', textAlign: 'right', fontWeight: '600', color: '#64748b' }}>{convertAndFormat(waiter.totalRevenue || 0)}</td>
                                        <td style={{ padding: '16px', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                                                <Star size={14} style={{ color: '#f59e0b', fill: '#f59e0b' }} />
                                                <span style={{ fontWeight: '700', color: '#1e293b' }}>{waiter.avgRating?.toFixed(1) || '0.0'}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Performance Chart */}
                <div style={cardStyle}>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '24px' }}>
                        {t('orders_by_staff') || 'Pedidos por Funcionário'}
                    </h3>
                    <div style={{ width: '100%', height: 400 }}>
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                            <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 30, top: 10, bottom: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12, fontWeight: '600', fill: '#64748b' }} />
                                <Tooltip 
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                                />
                                <Bar dataKey="orders" name={t('orders') || 'Pedidos'} radius={[0, 4, 4, 0]} barSize={25}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
