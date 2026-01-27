import React, { useState, useEffect } from 'react';
import { analyticsAPI } from '../services/analytics';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import {
    TrendingUp, Users, ShoppingBag, DollarSign,
    ArrowRight, Building2, Calendar, Star, Utensils, Zap
} from 'lucide-react';
import { format } from 'date-fns';
import LoadingSpinner from '../components/LoadingSpinner';
import { SkeletonGrid } from '../components/Skeleton';
import { getStatusLabel, getStatusBadgeStyle } from '../utils/subscriptionStatusHelper';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const statCardStyle = {
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
    border: '1px solid rgba(0,0,0,0.02)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flex: 1,
    minWidth: '300px'
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

const sectionStyle = {
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
    marginBottom: '24px',
    border: '1px solid #f1f5f9'
};

const premiumCardStyle = {
    ...statCardStyle,
    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
    minWidth: '320px',
    position: 'relative',
    overflow: 'hidden'
};

const cardLabelStyle = {
    color: '#64748b',
    fontSize: '13px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '8px'
};

const cardValueStyle = {
    fontSize: '24px',
    fontWeight: '900',
    color: '#1e293b',
    margin: '8px 0',
    letterSpacing: '-0.02em'
};

const cardSubtextStyle = {
    color: '#94a3b8',
    fontSize: '13px',
    fontWeight: '600',
    marginBottom: '12px'
};

const restaurantBadgeStyle = {
    display: 'inline-block',
    padding: '4px 12px',
    background: '#f1f5f9',
    color: '#475569',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
};

const OwnerDashboard = () => {
    const { user, selectRestaurant } = useAuth();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const { data } = await analyticsAPI.getOwnerStats();
            setStats(data);
        } catch (error) {
            console.error('Failed to fetch owner stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEnterRestaurant = async (restaurantId) => {
        try {
            await selectRestaurant(restaurantId);
            navigate('/dashboard');
        } catch (error) {
            console.error('Failed to switch restaurant:', error);
        }
    };

    // Skeleton loading - maintains dashboard layout
    if (loading) return (
        <div className="p-6">
            <div className="mb-8">
                <div className="h-12 w-96 bg-gray-200 rounded-xl animate-pulse mb-3"></div>
                <div className="h-5 w-72 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <SkeletonGrid items={3} columns={3} height="160px" gap="24px" />
        </div>
    );

    return (
        <div className="dashboard-container" style={{ maxWidth: '100vw', padding: '24px' }}>
            {/* Header */}
            <div className="dashboard-header-responsive">
                <div>
                    <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#1e293b', margin: 0 }}>{t('executive_overview')}</h1>
                    <p style={{ color: '#64748b', marginTop: '8px', fontSize: '16px' }}>
                        {t('performance_summary', { count: stats?.activeRestaurants })}
                    </p>
                </div>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: 'white', padding: '10px 20px', borderRadius: '50px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)', color: '#64748b', fontSize: '14px', fontWeight: '500'
                }}>
                    <Calendar size={18} />
                    {format(new Date(), 'MMMM d, yyyy')}
                    <div style={{ width: '1px', height: '20px', background: '#e2e8f0', margin: '0 10px' }}></div>
                    <select style={{ border: 'none', background: 'transparent', fontWeight: '600', color: '#4f46e5', cursor: 'pointer', outline: 'none' }}>
                        <option>Today</option>
                        <option>This Week</option>
                        <option>This Month</option>
                        <option>Last Month</option>
                    </select>
                </div>

                <button
                    onClick={async () => {
                        if (window.confirm(t('confirm_clear_stats') || 'Tem certeza que deseja limpar TODOS os dados financeiros? Esta ação não pode ser desfeita.')) {
                            try {
                                await analyticsAPI.clearOwnerStats();
                                window.location.reload();
                            } catch (error) {
                                console.error('Failed to clear stats', error);
                                alert('Erro ao limpar dados');
                            }
                        }
                    }}
                    style={{
                        marginLeft: '16px',
                        padding: '10px 20px',
                        background: '#fee2e2',
                        color: '#ef4444',
                        border: 'none',
                        borderRadius: '50px',
                        fontWeight: '600',
                        fontSize: '14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.2s',
                        boxShadow: '0 2px 8px rgba(239, 68, 68, 0.1)'
                    }}
                    onMouseOver={(e) => e.target.style.transform = 'translateY(-1px)'}
                    onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                >
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }}></div>
                    {t('clear_data') || 'Limpar Dados'}
                </button>
                <div className="language-switcher" style={{ marginLeft: '16px' }}>
                    <select
                        onChange={(e) => i18n.changeLanguage(e.target.value)}
                        value={i18n.language}
                        style={{ padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    >
                        <option value="pt">PT</option>
                        <option value="en">EN</option>
                        <option value="es">ES</option>
                        <option value="fr">FR</option>
                    </select>
                </div>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'flex', gap: '24px', marginBottom: '32px', flexWrap: 'wrap', width: '100%' }}>
                <div style={statCardStyle}>
                    <div>
                        <p style={{ color: '#64748b', fontSize: '14px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('total_revenue_cap')}</p>
                        <h3 style={{ fontSize: '36px', fontWeight: '800', color: '#1e293b', margin: '8px 0 0 0' }}>
                            {stats?.totalRevenue?.toLocaleString()} <span style={{ fontSize: '20px', color: '#94a3b8' }}>MT</span>
                        </h3>
                    </div>
                    <div style={iconBoxStyle('#4f46e5', '#eef2ff')}>
                        <DollarSign size={28} />
                    </div>
                </div>

                <div style={statCardStyle}>
                    <div>
                        <p style={{ color: '#64748b', fontSize: '14px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('total_orders_cap')}</p>
                        <h3 style={{ fontSize: '36px', fontWeight: '800', color: '#1e293b', margin: '8px 0 0 0' }}>
                            {stats?.totalOrders?.toLocaleString()}
                        </h3>
                    </div>
                    <div style={iconBoxStyle('#10b981', '#ecfdf5')}>
                        <ShoppingBag size={28} />
                    </div>
                </div>

                <div style={statCardStyle}>
                    <div>
                        <p style={{ color: '#64748b', fontSize: '14px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('active_venues_cap')}</p>
                        <h3 style={{ fontSize: '36px', fontWeight: '800', color: '#1e293b', margin: '8px 0 0 0' }}>
                            {stats?.activeRestaurants}
                        </h3>
                    </div>
                    <div style={iconBoxStyle('#f59e0b', '#fffbeb')}>
                        <Building2 size={28} />
                    </div>
                </div>
            </div>

            {/* 🎯 INTELLIGENT STATS CARDS */}
            {(stats?.topWaiter || stats?.topDish || stats?.fastestDish) && (
                <div style={{ display: 'flex', gap: '24px', marginBottom: '32px', flexWrap: 'wrap' }}>
                    {/* 🏆 Top Waiter Card */}
                    {stats?.topWaiter && (
                        <div style={premiumCardStyle}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ flex: 1 }}>
                                    <p style={cardLabelStyle}>🏆 {t('top_waiter') || 'Melhor Garçom'}</p>
                                    <h3 style={cardValueStyle}>{stats.topWaiter.name}</h3>
                                    <p style={cardSubtextStyle}>
                                        Score: {stats.topWaiter.score}% • {stats.topWaiter.ordersCount} {t('orders') || 'pedidos'}
                                    </p>
                                    <span style={restaurantBadgeStyle}>{stats.topWaiter.restaurant}</span>
                                </div>
                                <div style={iconBoxStyle('#10b981', '#ecfdf5')}>
                                    <Star size={28} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 🍽️ Top Dish Card */}
                    {stats?.topDish && (
                        <div style={premiumCardStyle}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ flex: 1 }}>
                                    <p style={cardLabelStyle}>🍽️ {t('top_dish') || 'Prato Mais Vendido'}</p>
                                    <h3 style={cardValueStyle}>{stats.topDish.name}</h3>
                                    <p style={cardSubtextStyle}>
                                        {stats.topDish.quantity} {t('sales') || 'vendas'}
                                    </p>
                                    <span style={restaurantBadgeStyle}>{stats.topDish.restaurant}</span>
                                </div>
                                <div style={iconBoxStyle('#f59e0b', '#fffbeb')}>
                                    <Utensils size={28} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ⚡ Fastest Dish Card */}
                    {stats?.fastestDish && (
                        <div style={premiumCardStyle}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ flex: 1 }}>
                                    <p style={cardLabelStyle}>⚡ {t('fastest_dish') || 'Prato Mais Rápido'}</p>
                                    <h3 style={cardValueStyle}>{stats.fastestDish.name}</h3>
                                    <p style={cardSubtextStyle}>
                                        {stats.fastestDish.avgTime} min {t('average') || 'média'}
                                    </p>
                                    <span style={restaurantBadgeStyle}>{stats.fastestDish.restaurant}</span>
                                </div>
                                <div style={iconBoxStyle('#8b5cf6', '#f5f3ff')}>
                                    <Zap size={28} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Charts Section */}
            <div style={{ display: 'flex', gap: '24px', marginBottom: '32px', flexWrap: 'wrap', width: '100%' }}>
                <div style={{ ...sectionStyle, flex: 2, minWidth: '400px', marginBottom: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b' }}>{t('revenue_by_restaurant')}</h3>
                    </div>
                    <div style={{ height: '350px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats?.revenueByRestaurant} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                                <Tooltip
                                    cursor={{ fill: '#f1f5f9' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                                />
                                <Bar dataKey="revenue" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={50} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div style={{ ...sectionStyle, flex: 1, minWidth: '300px', marginBottom: 0 }}>
                    <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', marginBottom: '24px' }}>{t('order_distribution')}</h3>
                    <div style={{ height: '350px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats?.revenueByRestaurant}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={110}
                                    paddingAngle={5}
                                    dataKey="orders"
                                >
                                    {stats?.revenueByRestaurant?.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Restaurant List */}
            <div style={sectionStyle}>
                <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', marginBottom: '20px' }}>{t('performance_ranking')}</h3>
                <div className="table-container" style={{ boxShadow: 'none', borderRadius: '0' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th style={{ paddingLeft: 0 }}>{t('table')}</th>
                                <th>{t('total_revenue')}</th>
                                <th>{t('orders')}</th>
                                <th>{t('avg_ticket')}</th>
                                <th>{t('subscription')}</th>
                                <th style={{ textAlign: 'right', paddingRight: 0 }}>{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats?.revenueByRestaurant?.map((rest, index) => (
                                <tr key={rest.id} style={{ borderBottom: index === stats.revenueByRestaurant.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                                    <td style={{ paddingLeft: 0, padding: '20px 0' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                            <div style={{
                                                width: '48px', height: '48px', borderRadius: '12px',
                                                background: COLORS[index % COLORS.length] + '15',
                                                color: COLORS[index % COLORS.length],
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontWeight: '700', fontSize: '18px'
                                            }}>
                                                {rest.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '16px' }}>{rest.name}</div>
                                                <div style={{ color: '#64748b', fontSize: '13px' }}>ID: {rest.id.substring(0, 8)}...</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ fontWeight: '600', color: '#1e293b' }}>
                                        {rest.revenue.toLocaleString()} MT
                                    </td>
                                    <td>
                                        <span className="badge" style={{ background: '#f1f5f9', color: '#475569', fontSize: '14px' }}>
                                            {rest.orders} orders
                                        </span>
                                    </td>
                                    <td style={{ color: '#64748b' }}>
                                        {rest.orders > 0 ? (rest.revenue / rest.orders).toFixed(0) : 0} MT
                                    </td>
                                    <td>
                                        <span style={{
                                            ...getStatusBadgeStyle(rest.subscriptionStatus || 'suspended'),
                                            padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase'
                                        }}>
                                            {getStatusLabel((rest.subscriptionStatus || 'suspended').toLowerCase(), t)}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'right', paddingRight: 0 }}>
                                        <button
                                            onClick={() => handleEnterRestaurant(rest.id)}
                                            style={{
                                                background: 'white', border: '1px solid #e2e8f0',
                                                padding: '8px 16px', borderRadius: '8px',
                                                color: '#4f46e5', fontWeight: '600', fontSize: '14px',
                                                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseOver={(e) => { e.target.style.borderColor = '#4f46e5'; e.target.style.background = '#eef2ff'; }}
                                            onMouseOut={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = 'white'; }}
                                        >
                                            {t('manage_dashboard') || 'Manage Dashboard'} <ArrowRight size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default OwnerDashboard;
