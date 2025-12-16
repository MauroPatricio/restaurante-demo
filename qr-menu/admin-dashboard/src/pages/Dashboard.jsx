import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { orderAPI, feedbackAPI } from '../services/api';
import {
    ShoppingBag,
    DollarSign,
    Clock,
    Star,
    TrendingUp,
    Users
} from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Legend
} from 'recharts';
import {
    format,
    startOfDay,
    endOfDay,
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval
} from 'date-fns';
import { useTranslation } from 'react-i18next'; // Import useTranslation

export default function Dashboard() {
    const { user } = useAuth();
    const { t } = useTranslation(); // Init hook
    const [stats, setStats] = useState({
        totalOrders: 0,
        totalRevenue: 0,
        pendingOrders: 0,
        averageRating: 0
    });
    const [recentOrders, setRecentOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [timeframe, setTimeframe] = useState('today'); // today, week, month
    const [revenueData, setRevenueData] = useState([]);
    const [topProducts, setTopProducts] = useState([]);
    const [peakHours, setPeakHours] = useState([]);

    useEffect(() => {
        if (user?.restaurant) {
            fetchDashboardData();
        }
    }, [user, timeframe]); // Re-fetch when timeframe changes

    const fetchDashboardData = async () => {
        try {
            setLoading(true);

            // Determine date range based on filter
            const now = new Date();
            let startDate, endDate;

            switch (timeframe) {
                case 'today':
                    startDate = startOfDay(now);
                    endDate = endOfDay(now);
                    break;
                case 'week':
                    startDate = startOfWeek(now, { weekStartsOn: 1 });
                    endDate = endOfWeek(now, { weekStartsOn: 1 });
                    break;
                case 'month':
                    startDate = startOfMonth(now);
                    endDate = endOfMonth(now);
                    break;
                default:
                    startDate = startOfDay(now);
                    endDate = endOfDay(now);
            }

            const [ordersRes, feedbackRes] = await Promise.all([
                orderAPI.getAll(user.restaurant._id || user.restaurant, {
                    startDate: startDate.toISOString(),
                    endDate: endDate.toISOString(),
                    limit: 1000 // Increase limit for stats
                }),
                feedbackAPI.getStats(user.restaurant._id || user.restaurant)
            ]);

            const orders = ordersRes.data.orders || [];

            processOrderData(orders, startDate, endDate);

            setStats(prev => ({
                ...prev,
                pendingOrders: orders.filter(o => ['pending', 'confirmed', 'preparing'].includes(o.status)).length,
                averageRating: feedbackRes.data.overall?.averageRating || 0
            }));

        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const processOrderData = (orders, startDate, endDate) => {
        // 1. Basic Stats
        const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
        setStats(prev => ({
            ...prev,
            totalOrders: orders.length,
            totalRevenue
        }));

        setRecentOrders(orders.slice(0, 5));

        // 2. Revenue Graph Data
        let chartData = [];
        if (timeframe === 'today') {
            // Group by hour
            const hours = {};
            for (let i = 0; i < 24; i++) hours[i] = 0;

            orders.forEach(o => {
                const hour = new Date(o.createdAt).getHours();
                hours[hour] += o.total;
            });

            chartData = Object.keys(hours).map(h => ({
                name: `${h}:00`,
                revenue: hours[h]
            }));
        } else {
            // Group by day
            const days = eachDayOfInterval({ start: startDate, end: endDate });
            chartData = days.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const dayRevenue = orders
                    .filter(o => format(new Date(o.createdAt), 'yyyy-MM-dd') === dateStr)
                    .reduce((sum, o) => sum + (o.total || 0), 0);
                return {
                    name: format(day, 'MMM dd'),
                    revenue: dayRevenue
                };
            });
        }
        setRevenueData(chartData);

        // 3. Top Products
        const productMap = {};
        orders.forEach(order => {
            order.items.forEach(itemInfo => {
                // Check if item is populated or just an ID
                const itemName = itemInfo.item?.name || 'Unknown Item';
                const qty = itemInfo.qty || 1;
                if (!productMap[itemName]) productMap[itemName] = 0;
                productMap[itemName] += qty;
            });
        });
        const sortedProducts = Object.entries(productMap)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));
        setTopProducts(sortedProducts);

        // 4. Peak Hours
        const peakMap = {};
        for (let i = 0; i < 24; i++) peakMap[i] = 0;
        orders.forEach(o => {
            const hour = new Date(o.createdAt).getHours();
            peakMap[hour]++;
        });
        const peakData = Object.keys(peakMap).map(h => ({
            hour: `${h}:00`,
            orders: peakMap[h]
        }));
        setPeakHours(peakData);
    };

    if (loading) return <div>{t('loading')}</div>;

    return (
        <div className="page-content">
            <div className="page-header">
                <div>
                    <h2>{t('overview')}</h2>
                    <p>{t('monitor_desc')}</p>
                </div>
                <div className="filters">
                    {['today', 'week', 'month'].map(period => (
                        <button
                            key={period}
                            onClick={() => setTimeframe(period)}
                            className={`filter - btn ${timeframe === period ? 'active' : ''} `}
                        >
                            {t(period)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#e0e7ff', color: '#4f46e5' }}>
                        <ShoppingBag size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>{stats.totalOrders}</h3>
                        <p>{t('total_orders')}</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#dcfce7', color: '#166534' }}>
                        <DollarSign size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>{stats.totalRevenue.toLocaleString()} MT</h3>
                        <p>{t('total_revenue')}</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#fef9c3', color: '#854d0e' }}>
                        <Clock size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>{stats.pendingOrders}</h3>
                        <p>{t('pending_orders')}</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#fee2e2', color: '#991b1b' }}>
                        <Star size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>{stats.averageRating.toFixed(1)}</h3>
                        <p>{t('average_rating')}</p>
                    </div>
                </div>
            </div>

            <div className="charts-grid">
                {/* Revenue Trend */}
                <div className="card">
                    <h3>{t('revenue_trend')}</h3>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <AreaChart data={revenueData}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Area type="monotone" dataKey="revenue" stroke="#4f46e5" fillOpacity={1} fill="url(#colorRevenue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Products */}
                <div className="card">
                    <h3>{t('top_products')}</h3>
                    <div className="top-products-list">
                        {topProducts.map((p, i) => (
                            <div key={i} className="product-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #eee' }}>
                                <span style={{ fontWeight: 500 }}>{p.name}</span>
                                <span className="badge">{p.count} sold</span>
                            </div>
                        ))}
                        {topProducts.length === 0 && <p style={{ color: '#999' }}>{t('no_sales_yet')}</p>}
                    </div>
                </div>
            </div>

            {/* Peak Hours Chart */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <h3>{t('peak_hours')}</h3>
                <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                        <BarChart data={peakHours}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="hour" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="orders" fill="#8884d8" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Recent Orders Table */}
            <div className="card">
                <h3>{t('recent_orders')}</h3>
                <div className="table-responsive">
                    <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', color: '#666', borderBottom: '1px solid #eee' }}>
                                <th style={{ padding: '0.75rem' }}>{t('order_id')}</th>
                                <th>{t('customer')}</th>
                                <th>{t('status')}</th>
                                <th>{t('total')}</th>
                                <th>{t('date')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentOrders.map(order => (
                                <tr key={order._id} style={{ borderBottom: '1px solid #f9f9f9' }}>
                                    <td style={{ padding: '0.75rem' }}>#{order._id.slice(-6).toUpperCase()}</td>
                                    <td>{order.customerName || 'Walk-in'}</td>
                                    <td>
                                        <span className={`status - badge ${order.status} `}>
                                            {order.status}
                                        </span>
                                    </td>
                                    <td>{order.total} MT</td>
                                    <td>{format(new Date(order.createdAt), 'PP p')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
