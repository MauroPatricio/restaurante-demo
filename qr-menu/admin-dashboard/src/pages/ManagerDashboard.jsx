import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { analyticsAPI, orderAPI, tableAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    ShoppingBag, DollarSign, Users, Clock,
    ArrowRight, Utensils, ChefHat, LayoutGrid
} from 'lucide-react';
import { format } from 'date-fns';

const ManagerDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [stats, setStats] = useState({
        revenueToday: 0,
        ordersToday: 0,
        occupiedTables: 0,
        pendingOrders: 0
    });
    const [recentOrders, setRecentOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.restaurant) {
            fetchDashboardData();
            const interval = setInterval(fetchDashboardData, 60000); // 1 min refresh
            return () => clearInterval(interval);
        }
    }, [user]);

    const fetchDashboardData = async () => {
        try {
            const restId = user.restaurant._id || user.restaurant;

            // Parallel Fetch
            const [ordersRes, tablesRes] = await Promise.all([
                orderAPI.getAll(restId), // Get all orders (backend should filter or we filter client side for 'today')
                tableAPI.getAll(restId)
            ]);

            const allOrders = ordersRes.data.orders || [];
            const allTables = tablesRes.data.tables || [];

            // Calculate Metrics
            const today = new Date().toDateString();
            const todaysOrders = allOrders.filter(o => new Date(o.createdAt).toDateString() === today);

            const revenue = todaysOrders.reduce((sum, o) => sum + (o.total || 0), 0);
            const pending = allOrders.filter(o => ['pending', 'preparing', 'ready'].includes(o.status)).length;
            const occupied = allTables.filter(t => t.status === 'occupied').length;

            setStats({
                revenueToday: revenue,
                ordersToday: todaysOrders.length,
                occupiedTables: occupied,
                pendingOrders: pending
            });

            setRecentOrders(allOrders.slice(0, 5)); // Top 5
        } catch (error) {
            console.error('Failed to load manager dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const statCardStyle = {
        background: 'white',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        border: '1px solid #f1f5f9',
        flex: 1,
        minWidth: '250px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    };

    const iconBoxStyle = (bgColor, color) => ({
        width: '48px',
        height: '48px',
        borderRadius: '12px',
        background: bgColor,
        color: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    });

    const actionButtonStyle = {
        background: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        flex: 1
    };

    if (loading) return <div className="p-8 text-center">Loading dashboard...</div>;

    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e293b' }}>
                    {t('operational_dashboard')}
                </h1>
                <p style={{ color: '#64748b' }}>{user?.restaurant?.name} • {format(new Date(), 'EEEE, MMMM d')}</p>
            </div>

            {/* Metrics Grid */}
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '32px' }}>
                <div style={statCardStyle}>
                    <div>
                        <p style={{ color: '#64748b', fontSize: '14px', fontWeight: '600', textTransform: 'uppercase' }}>Sales Today</p>
                        <h3 style={{ fontSize: '28px', fontWeight: '800', color: '#1e293b' }}>
                            {stats.revenueToday.toLocaleString()} <span style={{ fontSize: '16px', color: '#94a3b8' }}>MT</span>
                        </h3>
                    </div>
                    <div style={iconBoxStyle('#eff6ff', '#3b82f6')}>
                        <DollarSign size={24} />
                    </div>
                </div>

                <div style={statCardStyle}>
                    <div>
                        <p style={{ color: '#64748b', fontSize: '14px', fontWeight: '600', textTransform: 'uppercase' }}>Orders Today</p>
                        <h3 style={{ fontSize: '28px', fontWeight: '800', color: '#1e293b' }}>{stats.ordersToday}</h3>
                    </div>
                    <div style={iconBoxStyle('#ecfdf5', '#10b981')}>
                        <ShoppingBag size={24} />
                    </div>
                </div>

                <div style={statCardStyle}>
                    <div>
                        <p style={{ color: '#64748b', fontSize: '14px', fontWeight: '600', textTransform: 'uppercase' }}>Occupied Tables</p>
                        <h3 style={{ fontSize: '28px', fontWeight: '800', color: '#1e293b' }}>{stats.occupiedTables}</h3>
                    </div>
                    <div style={iconBoxStyle('#fdf2f8', '#db2777')}>
                        <Users size={24} />
                    </div>
                </div>

                <div style={statCardStyle}>
                    <div>
                        <p style={{ color: '#64748b', fontSize: '14px', fontWeight: '600', textTransform: 'uppercase' }}>Active/Kitchen</p>
                        <h3 style={{ fontSize: '28px', fontWeight: '800', color: '#1e293b' }}>{stats.pendingOrders}</h3>
                    </div>
                    <div style={iconBoxStyle('#fff7ed', '#f97316')}>
                        <ChefHat size={24} />
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '16px' }}>Quick Actions</h3>
            <div style={{ display: 'flex', gap: '24px', marginBottom: '32px' }}>
                <button
                    style={actionButtonStyle}
                    onClick={() => navigate('/tables')}
                    onMouseOver={e => e.currentTarget.style.borderColor = '#3b82f6'}
                    onMouseOut={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                >
                    <div style={{ padding: '12px', background: '#eff6ff', borderRadius: '50%', color: '#3b82f6' }}>
                        <LayoutGrid size={24} />
                    </div>
                    <span style={{ fontWeight: '600', color: '#1e293b' }}>Manage Tables</span>
                </button>

                <button
                    style={actionButtonStyle}
                    onClick={() => navigate('/kitchen')}
                    onMouseOver={e => e.currentTarget.style.borderColor = '#f97316'}
                    onMouseOut={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                >
                    <div style={{ padding: '12px', background: '#fff7ed', borderRadius: '50%', color: '#f97316' }}>
                        <ChefHat size={24} />
                    </div>
                    <span style={{ fontWeight: '600', color: '#1e293b' }}>Kitchen View</span>
                </button>

                <button
                    style={actionButtonStyle}
                    onClick={() => navigate('/menu')}
                    onMouseOver={e => e.currentTarget.style.borderColor = '#10b981'}
                    onMouseOut={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                >
                    <div style={{ padding: '12px', background: '#ecfdf5', borderRadius: '50%', color: '#10b981' }}>
                        <Utensils size={24} />
                    </div>
                    <span style={{ fontWeight: '600', color: '#1e293b' }}>Edit Menu</span>
                </button>
            </div>

            {/* Recent Orders */}
            <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>Recent Orders</h3>
                    <button style={{ color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600' }}>View All</button>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid #f1f5f9', textAlign: 'left', color: '#64748b', fontSize: '14px' }}>
                            <th style={{ padding: '12px 0' }}>Order ID</th>
                            <th>Time</th>
                            <th>Status</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {recentOrders.map(order => (
                            <tr key={order._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '16px 0', fontWeight: '600', color: '#1e293b' }}>#{order._id.slice(-6).toUpperCase()}</td>
                                <td style={{ color: '#64748b' }}>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                <td>
                                    <span style={{
                                        padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', textTransform: 'capitalize',
                                        background: order.status === 'pending' ? '#fff7ed' : '#ecfdf5',
                                        color: order.status === 'pending' ? '#c2410c' : '#059669'
                                    }}>
                                        {order.status}
                                    </span>
                                </td>
                                <td style={{ fontWeight: '600' }}>{order.total} MT</td>
                            </tr>
                        ))}
                        {recentOrders.length === 0 && (
                            <tr><td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>No orders today</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ManagerDashboard;
