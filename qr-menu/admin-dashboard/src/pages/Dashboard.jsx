import React, { useState, useEffect } from 'react';
import { analyticsAPI } from '../services/analytics';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import {
    Clock, Users, TrendingUp, AlertCircle,
    CheckCircle, Coffee, Utensils
} from 'lucide-react';
import WaiterCallsModal from '../components/WaiterCallsModal';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444'];

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

const sectionStyle = {
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
    marginBottom: '24px',
    border: '1px solid #f1f5f9'
};

export default function Dashboard() {
    const { user } = useAuth();
    const { socket } = useSocket();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        operational: { avgPrepTime: 0, peakHours: [] },
        shifts: []
    });
    const [isCallsModalOpen, setIsCallsModalOpen] = useState(false);
    const restaurantId = user?.restaurant?._id || user?.restaurant;

    const fetchDashboardData = async () => {
        try {
            // Use today's date for 'today's' stats
            const today = new Date().toISOString().split('T')[0];
            const [restaurantStats, operationalReport] = await Promise.all([
                analyticsAPI.getRestaurantStats(restaurantId, { startDate: today, endDate: today }),
                analyticsAPI.getOperationalReport(restaurantId)
            ]);

            setStats({
                operational: restaurantStats.data.operational,
                shifts: operationalReport.data.shifts,
                financial: restaurantStats.data.financial,
                realtime: restaurantStats.data.realtime || {}
            });
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (restaurantId) {
            fetchDashboardData();

            // Backup polling
            const interval = setInterval(fetchDashboardData, 30000);
            return () => clearInterval(interval);
        } else {
            setLoading(false);
        }
    }, [restaurantId]);

    // Real-time Event Listeners
    useEffect(() => {
        if (!socket || !restaurantId) return;

        const handleRealtimeUpdate = (data) => {
            console.log('Dashboard: Realtime update received', data);
            fetchDashboardData();
        };

        // Listen for all events that affect these stats
        socket.on('order:new', handleRealtimeUpdate);
        socket.on('order-updated', handleRealtimeUpdate);
        socket.on('waiter:call', handleRealtimeUpdate);
        socket.on('waiter:call:acknowledged', handleRealtimeUpdate);
        socket.on('waiter:call:resolved', handleRealtimeUpdate);

        return () => {
            socket.off('order:new', handleRealtimeUpdate);
            socket.off('order-updated', handleRealtimeUpdate);
            socket.off('waiter:call', handleRealtimeUpdate);
            socket.off('waiter:call:acknowledged', handleRealtimeUpdate);
            socket.off('waiter:call:resolved', handleRealtimeUpdate);
        };
    }, [socket, restaurantId]);

    if (loading) return (
        <div className="loading-screen" style={{ minHeight: '80vh' }}>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
    );

    if (!restaurantId) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#64748b' }}>
            Please select a restaurant to view the dashboard.
        </div>
    );

    // Prepare Peak Hours Data for Chart
    const peakHoursData = stats.operational.peakHours?.map(ph => ({
        hour: ph.hour,
        orders: ph.orders
    })) || [];

    // Prepare Shifts Data for Pie Chart
    const shiftsData = stats.shifts?.map(s => ({
        name: s._id,
        value: s.orders
    })) || [];

    const { realtime = {} } = stats;

    return (
        <div className="dashboard-container" style={{ maxWidth: '100vw', padding: '24px' }}>
            {/* Header */}
            <div className="dashboard-header-responsive">
                <div>
                    <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#1e293b', margin: 0 }}>Operational Dashboard</h1>
                    <p style={{ color: '#64748b', marginTop: '8px', fontSize: '16px' }}>
                        Real-time overview of restaurant operations
                    </p>
                </div>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: '#ecfdf5', padding: '10px 20px', borderRadius: '50px',
                    border: '1px solid #d1fae5', color: '#047857', fontSize: '14px', fontWeight: '600'
                }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 0 4px rgba(16, 185, 129, 0.2)' }}></div>
                    Live Updates
                </div>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px', marginBottom: '32px', width: '100%' }}>
                {/* 1. Active Orders */}
                <div style={statCardStyle}>
                    <div>
                        <p style={{ color: '#64748b', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Orders</p>
                        <h3 style={{ fontSize: '32px', fontWeight: '800', color: '#3b82f6', margin: '8px 0 0 0' }}>
                            {realtime.activeOrders || 0}
                        </h3>
                    </div>
                    <div style={iconBoxStyle('#3b82f6', '#eff6ff')}>
                        <Utensils size={24} strokeWidth={2.5} />
                    </div>
                </div>

                {/* 2. Pending Orders */}
                <div style={statCardStyle}>
                    <div>
                        <p style={{ color: '#64748b', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pending</p>
                        <h3 style={{ fontSize: '32px', fontWeight: '800', color: '#f59e0b', margin: '8px 0 0 0' }}>
                            {realtime.pendingOrders || 0}
                        </h3>
                    </div>
                    <div style={iconBoxStyle('#f59e0b', '#fffbeb')}>
                        <AlertCircle size={24} strokeWidth={2.5} />
                    </div>
                </div>

                {/* 3. Completed (Today) */}
                <div style={statCardStyle}>
                    <div>
                        <p style={{ color: '#64748b', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Completed (Today)</p>
                        <h3 style={{ fontSize: '32px', fontWeight: '800', color: '#10b981', margin: '8px 0 0 0' }}>
                            {realtime.completedOrders || 0}
                        </h3>
                    </div>
                    <div style={iconBoxStyle('#10b981', '#ecfdf5')}>
                        <CheckCircle size={24} strokeWidth={2.5} />
                    </div>
                </div>

                {/* 4. Occupied Tables */}
                <div style={statCardStyle}>
                    <div>
                        <p style={{ color: '#64748b', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Live Tables</p>
                        <h3 style={{ fontSize: '32px', fontWeight: '800', color: '#6366f1', margin: '8px 0 0 0' }}>
                            {realtime.occupiedTables || 0}
                        </h3>
                    </div>
                    <div style={iconBoxStyle('#6366f1', '#e0e7ff')}>
                        <Coffee size={24} strokeWidth={2.5} />
                    </div>
                </div>

                {/* 5. Active Waiter Calls */}
                <div
                    style={{ ...statCardStyle, cursor: 'pointer' }}
                    onClick={() => setIsCallsModalOpen(true)}
                >
                    <div>
                        <p style={{ color: '#64748b', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Waiter Calls</p>
                        <h3 style={{ fontSize: '32px', fontWeight: '800', color: (realtime.activeWaiterCalls > 0) ? '#ef4444' : '#94a3b8', margin: '8px 0 0 0' }}>
                            {realtime.activeWaiterCalls || 0}
                        </h3>
                    </div>
                    <div style={iconBoxStyle('#ef4444', '#fef2f2')}>
                        <Users size={24} strokeWidth={2.5} />
                    </div>
                </div>
            </div>

            <WaiterCallsModal
                isOpen={isCallsModalOpen}
                onClose={() => setIsCallsModalOpen(false)}
                restaurantId={restaurantId}
            />

            {/* Charts Section */}
            <div style={{ display: 'flex', gap: '24px', marginBottom: '32px', flexWrap: 'wrap', width: '100%' }}>
                <div style={{ ...sectionStyle, flex: 2, minWidth: '400px', marginBottom: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>Peak Hours Activity</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#4f46e5' }}></span>
                            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Order Volume</span>
                        </div>
                    </div>
                    <div style={{ height: '350px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={peakHoursData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} interval={2} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
                                    cursor={{ stroke: '#4f46e5', strokeWidth: 1 }}
                                />
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <Area type="monotone" dataKey="orders" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorOrders)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div style={{ ...sectionStyle, flex: 1, minWidth: '300px', marginBottom: 0 }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '24px' }}>Orders by Shift</h3>
                    <div style={{ height: '350px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={shiftsData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={90}
                                    paddingAngle={5}
                                    dataKey="value"
                                    cornerRadius={5}
                                >
                                    {shiftsData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
