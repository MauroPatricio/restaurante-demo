import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { orderAPI } from '../services/api';
import { useTranslation } from 'react-i18next';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import { FileText, Download, Calendar } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function Reports() {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);

    // Default to current month
    const [dateRange, setDateRange] = useState({
        startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd')
    });

    const [stats, setStats] = useState({
        totalOrders: 0,
        totalRevenue: 0,
        avgOrderValue: 0
    });

    const [categoryData, setCategoryData] = useState([]);
    const [staffData, setStaffData] = useState([]);
    const [rawData, setRawData] = useState([]);

    useEffect(() => {
        if (user?.restaurant) {
            fetchReports();
        }
    }, [user, dateRange]);

    const fetchReports = async () => {
        try {
            setLoading(true);
            const response = await orderAPI.getAll(user.restaurant._id || user.restaurant, {
                startDate: new Date(dateRange.startDate).toISOString(),
                endDate: new Date(dateRange.endDate).toISOString(),
                limit: 5000 // High limit for reports
            });

            const orders = response.data.orders || [];
            setRawData(orders);
            processData(orders);

        } catch (error) {
            console.error('Failed to fetch reports:', error);
        } finally {
            setLoading(false);
        }
    };

    const processData = (orders) => {
        // 1. Summary Stats
        const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
        const avgOrderValue = orders.length > 0 ? (totalRevenue / orders.length) : 0;

        setStats({
            totalOrders: orders.length,
            totalRevenue,
            avgOrderValue
        });

        // 2. Category Sales (Pie Chart)
        const catMap = {};
        orders.forEach(order => {
            order.items.forEach(item => {
                const cat = item.item?.category || 'Uncategorized';
                const revenue = item.subtotal || 0;
                if (!catMap[cat]) catMap[cat] = 0;
                catMap[cat] += revenue;
            });
        });

        const catData = Object.entries(catMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
        setCategoryData(catData);

        // 3. Staff Performance (Bar Chart)
        // Using table.assignedWaiter if available, or just mocking if structure is different
        const staffMap = {};
        orders.forEach(order => {
            // Check if table population works and has assignedWaiter
            const waiter = order.table?.assignedWaiter || 'Unassigned';
            if (!staffMap[waiter]) staffMap[waiter] = { name: waiter, orders: 0, revenue: 0 };
            staffMap[waiter].orders += 1;
            staffMap[waiter].revenue += (order.total || 0);
        });

        const sData = Object.values(staffMap).sort((a, b) => b.orders - a.orders);
        setStaffData(sData);
    };

    const handleDownloadCSV = () => {
        if (rawData.length === 0) return;

        // Define CSV headers
        const headers = ['Order ID', 'Date', 'Type', 'Table', 'Waiter', 'Total', 'Status'];

        // Map data to rows
        const rows = rawData.map(o => [
            o._id,
            format(new Date(o.createdAt), 'yyyy-MM-dd HH:mm'),
            o.orderType,
            o.table?.number || 'N/A',
            o.table?.assignedWaiter || 'N/A',
            o.total,
            o.status
        ]);

        // Construct CSV string
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        // Create Blob and download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `reports_${dateRange.startDate}_${dateRange.endDate}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDateChange = (e) => {
        setDateRange(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    return (
        <div className="page-content">
            <div className="page-header">
                <div>
                    <h2>{t('reports') || 'Reports'}</h2>
                    <p>{t('reports_desc') || 'Analyze your business performance'}</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <div className="date-picker-group" style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                        <Calendar size={16} />
                        <input
                            type="date"
                            name="startDate"
                            value={dateRange.startDate}
                            onChange={handleDateChange}
                            className="form-control"
                            style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                        />
                        <span>-</span>
                        <input
                            type="date"
                            name="endDate"
                            value={dateRange.endDate}
                            onChange={handleDateChange}
                            className="form-control"
                            style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                        />
                    </div>
                    <button onClick={handleDownloadCSV} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Download size={16} />
                        {t('export_csv') || 'Export CSV'}
                    </button>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '2rem' }}>
                <div className="stat-card">
                    <div className="stat-info">
                        <h3>{stats.totalOrders}</h3>
                        <p>{t('total_orders_period') || 'Orders in Period'}</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-info">
                        <h3>{stats.totalRevenue.toLocaleString()} MT</h3>
                        <p>{t('total_revenue_period') || 'Revenue in Period'}</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-info">
                        <h3>{stats.avgOrderValue.toFixed(2)} MT</h3>
                        <p>{t('avg_order_value') || 'Avg. Order Value'}</p>
                    </div>
                </div>
            </div>

            <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                {/* Sales by Category */}
                <div className="card">
                    <h3>{t('sales_by_category') || 'Sales by Category'}</h3>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                    data={categoryData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {categoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => `${value.toLocaleString()} MT`} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Staff Performance */}
                <div className="card">
                    <h3>{t('staff_performance') || 'Staff Performance (Orders)'}</h3>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <BarChart data={staffData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis dataKey="name" type="category" width={100} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="orders" fill="#82ca9d" name="Orders" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
