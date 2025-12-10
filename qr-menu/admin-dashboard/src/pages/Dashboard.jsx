import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { orderAPI, feedbackAPI, menuAPI } from '../services/api';
import { TrendingUp, DollarSign, ShoppingCart, Star } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function Dashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        todayOrders: 0,
        todayRevenue: 0,
        pendingOrders: 0,
        averageRating: 0
    });
    const [recentOrders, setRecentOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.restaurant) {
            fetchDashboardData();
        }
    }, [user]);

    const fetchDashboardData = async () => {
        try {
            const [ordersRes, feedbackRes] = await Promise.all([
                orderAPI.getAll(user.restaurant._id || user.restaurant, { limit: 10 }),
                feedbackAPI.getStats(user.restaurant._id || user.restaurant)
            ]);

            const orders = ordersRes.data.orders || [];

            // Calculate today's stats
            const today = new Date().setHours(0, 0, 0, 0);
            const todayOrders = orders.filter(o => new Date(o.createdAt) >= today);
            const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
            const pendingOrders = orders.filter(o => ['pending', 'confirmed', 'preparing'].includes(o.status)).length;

            setStats({
                todayOrders: todayOrders.length,
                todayRevenue,
                pendingOrders,
                averageRating: feedbackRes.data.overall?.averageRating || 0
            });

            setRecentOrders(orders.slice(0, 5));
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="loading">Loading dashboard...</div>;
    }

    return (
        <div className="dashboard-page">
            <div className="page-header">
                <h2>Dashboard Overview</h2>
                <p>Monitor your restaurant performance</p>
            </div>

            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon blue">
                        <ShoppingCart size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>{stats.todayOrders}</h3>
                        <p>Today's Orders</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon green">
                        <DollarSign size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>{stats.todayRevenue.toLocaleString()} MT</h3>
                        <p>Today's Revenue</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon orange">
                        <TrendingUp size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>{stats.pendingOrders}</h3>
                        <p>Pending Orders</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon yellow">
                        <Star size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>{stats.averageRating.toFixed(1)}</h3>
                        <p>Average Rating</p>
                    </div>
                </div>
            </div>

            {/* Recent Orders */}
            <div className="section">
                <h3>Recent Orders</h3>
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Order ID</th>
                                <th>Customer</th>
                                <th>Type</th>
                                <th>Total</th>
                                <th>Status</th>
                                <th>Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentOrders.map(order => (
                                <tr key={order._id}>
                                    <td>#{order._id.slice(-6).toUpperCase()}</td>
                                    <td>{order.customerName || order.phone}</td>
                                    <td><span className="badge">{order.orderType}</span></td>
                                    <td>{order.total} MT</td>
                                    <td><span className={`status-badge ${order.status}`}>{order.status}</span></td>
                                    <td>{new Date(order.createdAt).toLocaleTimeString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
