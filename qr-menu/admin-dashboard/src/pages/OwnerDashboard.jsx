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
    ArrowRight, Building2, Calendar, Star, Utensils, Zap, Search,
    RefreshCw, Globe, ChevronDown, Award
} from 'lucide-react';
import { format as formatDate } from 'date-fns';
import { pt } from 'date-fns/locale/pt';
import LoadingSpinner from '../components/LoadingSpinner';
import { SkeletonGrid } from '../components/Skeleton';
import { getStatusLabel, getStatusBadgeStyle } from '../utils/subscriptionStatusHelper';
import { useCurrency } from '../contexts/CurrencyContext';
import './OwnerDashboard.css';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const OwnerDashboard = () => {
    const { user, selectRestaurant } = useAuth();
    const { convert, format, convertAndFormat } = useCurrency();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('today');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchStats();
    }, [period]);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const { data } = await analyticsAPI.getOwnerStats({ period });
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

    const filteredRestaurants = stats?.revenueByRestaurant?.filter(r => 
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.id.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    if (loading && !stats) return (
        <div className="p-10">
            <div className="mb-10">
                <div className="h-14 w-96 bg-gray-200 rounded-2xl animate-pulse mb-4"></div>
                <div className="h-6 w-72 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <SkeletonGrid items={3} columns={3} height="200px" gap="32px" />
        </div>
    );

    return (
        <div className="owner-dashboard animate-fade-in">
            {/* ── Header ── */}
            <header className="owner-header">
                <div className="owner-title-section">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-lg">
                            <TrendingUp size={20} />
                        </div>
                        <span className="text-[10px] font-900 uppercase tracking-[0.2em] text-primary-600 dark:text-primary-400">{t('executive_overview')}</span>
                    </div>
                    <h1>{t('executive_overview')}</h1>
                    <p className="text-gray-500 font-600">
                        {t('performance_summary', { count: stats?.activeRestaurants })}
                    </p>
                </div>

                <div className="owner-header-actions">
                    <div className="owner-filters">
                        <Calendar size={16} />
                        <span>{formatDate(new Date(), 'dd MMMM, yyyy', { locale: pt })}</span>
                        <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1"></div>
                        <div className="flex items-center gap-1">
                            <select 
                                value={period}
                                onChange={(e) => setPeriod(e.target.value)}
                                className="period-select"
                            >
                                <option value="today">{t('today')}</option>
                                <option value="week">{t('this_week')}</option>
                                <option value="month">{t('this_month')}</option>
                                <option value="last_month">{t('last_month')}</option>
                            </select>
                            <ChevronDown size={14} className="text-primary-600" />
                        </div>
                    </div>

                    <div className="flex items-center gap-3 ml-2">
                        <select
                            onChange={(e) => i18n.changeLanguage(e.target.value)}
                            value={i18n.language}
                            className="bg-white border border-gray-200 rounded-full px-4 py-2 text-xs font-800 outline-none hover:border-primary transition-all cursor-pointer"
                        >
                            <option value="pt">PT</option>
                            <option value="en">EN</option>
                        </select>

                        <button
                            onClick={async () => {
                                if (window.confirm(t('confirm_clear_stats'))) {
                                    try {
                                        await analyticsAPI.clearOwnerStats();
                                        window.location.reload();
                                    } catch (error) {
                                        console.error('Failed to clear stats', error);
                                    }
                                }
                            }}
                            className="p-2.5 bg-red-50 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-all shadow-sm"
                            title={t('clear_data')}
                        >
                            <RefreshCw size={18} />
                        </button>
                    </div>
                </div>
            </header>

            {/* ── KPI Cards ── */}
            <div className="owner-kpi-grid">
                <div className="glass-card owner-kpi-card hover-lift">
                    <div className="owner-kpi-info">
                        <p>{t('total_revenue_cap')}</p>
                        <h3 className="owner-kpi-value">{convertAndFormat(stats?.totalRevenue || 0)}</h3>
                    </div>
                    <div className="owner-kpi-icon bg-indigo-50 text-indigo-600 shadow-lg shadow-indigo-100">
                        <DollarSign size={32} strokeWidth={2.5} />
                    </div>
                </div>

                <div className="glass-card owner-kpi-card hover-lift">
                    <div className="owner-kpi-info">
                        <p>{t('total_orders_cap')}</p>
                        <h3 className="owner-kpi-value">{stats?.totalOrders?.toLocaleString()}</h3>
                    </div>
                    <div className="owner-kpi-icon bg-emerald-50 text-emerald-600 shadow-lg shadow-emerald-100">
                        <ShoppingBag size={32} strokeWidth={2.5} />
                    </div>
                </div>

                <div className="glass-card owner-kpi-card hover-lift">
                    <div className="owner-kpi-info">
                        <p>{t('active_venues_cap')}</p>
                        <h3 className="owner-kpi-value">{stats?.activeRestaurants}</h3>
                    </div>
                    <div className="owner-kpi-icon bg-amber-50 text-amber-600 shadow-lg shadow-amber-100">
                        <Building2 size={32} strokeWidth={2.5} />
                    </div>
                </div>
            </div>

            {/* ── Intelligent Stats ── */}
            {(stats?.topWaiter || stats?.topDish || stats?.fastestDish) && (
                <div className="owner-kpi-grid">
                    {stats?.topWaiter && (
                        <div className="glass-card p-6 flex items-center justify-between border-l-4 border-emerald-500 hover-lift">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <Award size={16} className="text-emerald-500" />
                                    <span className="text-[10px] font-900 uppercase text-emerald-600">{t('top_waiter')}</span>
                                </div>
                                <h4 className="text-xl font-900 text-gray-900">{stats.topWaiter.name}</h4>
                                <p className="text-xs font-700 text-gray-500 mt-1 uppercase tracking-wider">{stats.topWaiter.restaurant}</p>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-black text-gray-900">{stats.topWaiter.score}%</div>
                                <div className="text-[10px] font-800 text-gray-400 uppercase">{stats.topWaiter.ordersCount} {t('orders')}</div>
                            </div>
                        </div>
                    )}

                    {stats?.topDish && (
                        <div className="glass-card p-6 flex items-center justify-between border-l-4 border-amber-500 hover-lift">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <Utensils size={16} className="text-amber-500" />
                                    <span className="text-[10px] font-900 uppercase text-amber-600">{t('top_dish')}</span>
                                </div>
                                <h4 className="text-xl font-900 text-gray-900">{stats.topDish.name}</h4>
                                <p className="text-xs font-700 text-gray-500 mt-1 uppercase tracking-wider">{stats.topDish.restaurant}</p>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-black text-gray-900">{stats.topDish.quantity}</div>
                                <div className="text-[10px] font-800 text-gray-400 uppercase">{t('sales')}</div>
                            </div>
                        </div>
                    )}

                    {stats?.fastestDish && (
                        <div className="glass-card p-6 flex items-center justify-between border-l-4 border-purple-500 hover-lift">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <Zap size={16} className="text-purple-500" />
                                    <span className="text-[10px] font-900 uppercase text-purple-600">{t('fastest_dish')}</span>
                                </div>
                                <h4 className="text-xl font-900 text-gray-900">{stats.fastestDish.name}</h4>
                                <p className="text-xs font-700 text-gray-500 mt-1 uppercase tracking-wider">{stats.fastestDish.restaurant}</p>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-black text-gray-900">{stats.fastestDish.avgTime}m</div>
                                <div className="text-[10px] font-800 text-gray-400 uppercase">{t('average')}</div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Charts Section ── */}
            <div className="owner-charts-grid">
                <div className="glass-card owner-chart-card animate-slide-up">
                    <div className="chart-header">
                        <h3>{t('revenue_by_restaurant')}</h3>
                    </div>
                    <div style={{ height: '400px' }}>
                        {loading ? (
                            <div className="flex h-full items-center justify-center"><LoadingSpinner /></div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={stats?.revenueByRestaurant?.map(r => ({
                                        ...r,
                                        convertedRevenue: convert(r.revenue)
                                    }))}
                                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12, fontWeight: 700 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12, fontWeight: 700 }} />
                                    <Tooltip
                                        cursor={{ fill: 'var(--primary-soft)' }}
                                        formatter={(value) => [format(value), t('revenue')]}
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: 'var(--shadow-premium)', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)' }}
                                    />
                                    <Bar dataKey="convertedRevenue" fill="var(--primary)" radius={[8, 8, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                <div className="glass-card owner-chart-card animate-slide-up" style={{ animationDelay: '0.1s' }}>
                    <div className="chart-header">
                        <h3>{t('order_distribution')}</h3>
                    </div>
                    <div style={{ height: '400px' }}>
                        {loading ? (
                            <div className="flex h-full items-center justify-center"><LoadingSpinner /></div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats?.revenueByRestaurant}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={100}
                                        outerRadius={140}
                                        paddingAngle={8}
                                        dataKey="orders"
                                        stroke="none"
                                    >
                                        {stats?.revenueByRestaurant?.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-md)' }} />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontWeight: 800, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Ranking Table ── */}
            <div className="glass-card ranking-card animate-slide-up" style={{ animationDelay: '0.2s' }}>
                <div className="ranking-header">
                    <div>
                        <h3 className="text-xl font-900 text-gray-900">{t('performance_ranking')}</h3>
                        <p className="text-xs font-700 text-gray-500 uppercase tracking-widest mt-1">{t('sort_by_revenue')}</p>
                    </div>
                    <div className="search-wrapper">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder={t('search_restaurants')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="ranking-table">
                        <thead>
                            <tr>
                                <th>{t('restaurant')}</th>
                                <th>{t('total_revenue')}</th>
                                <th>{t('orders')}</th>
                                <th>{t('avg_ticket')}</th>
                                <th>{t('subscription')}</th>
                                <th style={{ textAlign: 'right' }}>{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRestaurants.map((rest, index) => (
                                <tr key={rest.id} className="ranking-row">
                                    <td>
                                        <div className="flex items-center gap-4">
                                            <div className="restaurant-avatar-sm" style={{ background: COLORS[index % COLORS.length] + '20', color: COLORS[index % COLORS.length] }}>
                                                {rest.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-800 text-gray-900">{rest.name}</div>
                                                <div className="text-[10px] font-700 text-gray-400 uppercase tracking-wider">ID: {rest.id.substring(0, 8)}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="text-lg font-900 text-gray-900">{convertAndFormat(rest.revenue)}</div>
                                    </td>
                                    <td>
                                        <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-800 uppercase">
                                            {rest.orders} {t('orders')}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="text-gray-500 font-700">{convertAndFormat(rest.orders > 0 ? (rest.revenue / rest.orders) : 0)}</div>
                                    </td>
                                    <td>
                                        <span style={{
                                            ...getStatusBadgeStyle(rest.subscriptionStatus || 'suspended'),
                                            padding: '6px 12px', borderRadius: '99px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em'
                                        }}>
                                            {getStatusLabel((rest.subscriptionStatus || 'suspended').toLowerCase(), t)}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <button
                                            onClick={() => handleEnterRestaurant(rest.id)}
                                            className="inline-flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-xl font-800 text-sm shadow-premium hover:bg-primary-700 transition-all active:scale-[0.98]"
                                        >
                                            {t('manage_dashboard')} <ArrowRight size={16} strokeWidth={2.5} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredRestaurants.length === 0 && (
                        <div className="p-12 text-center text-gray-400 font-800 uppercase tracking-widest">
                            {t('no_items')}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OwnerDashboard;

