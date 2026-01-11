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
    CheckCircle, Coffee, Utensils, Sparkles,
    Zap, BarChart3, ChevronRight, Activity
} from 'lucide-react';
import WaiterCallsModal from '../components/WaiterCallsModal';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444'];

const DashboardKpi = ({ title, value, icon: Icon, color, onClick, pulse }) => (
    <div
        onClick={onClick}
        style={{
            background: 'white',
            borderRadius: '32px',
            padding: '32px',
            boxShadow: '0 20px 40px -12px rgba(0,0,0,0.05)',
            border: '1px solid white',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            minHeight: '160px',
            cursor: onClick ? 'pointer' : 'default',
            transition: 'all 0.5s ease',
            overflow: 'hidden'
        }}
        className="group hover-scale"
    >
        <div style={{ position: 'absolute', top: 0, right: 0, width: '96px', height: '96px', borderRadius: '50%', filter: 'blur(40px)', opacity: 0.1, marginRight: '-32px', marginTop: '-32px', background: color }} />
        <div>
            <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '12px' }}>
                {title}
            </div>
            <div style={{ fontSize: '40px', fontWeight: '900', color: '#1e293b', letterSpacing: '-0.05em' }}>
                {value}
            </div>
        </div>
        <div style={{
            position: 'absolute',
            top: '24px',
            right: '24px',
            padding: '16px',
            borderRadius: '16px',
            background: `${color}12`,
            color: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.5s ease'
        }} className="group-hover:scale-110">
            <Icon size={24} />
            {pulse && (
                <span style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    width: '12px',
                    height: '12px',
                    background: color,
                    borderRadius: '50%',
                    border: '2px solid white',
                    animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite'
                }} />
            )}
        </div>
    </div>
);

const sectionStyle = {
    background: 'white',
    borderRadius: '2.5rem',
    padding: '32px',
    boxShadow: '0 20px 40px -12px rgba(0,0,0,0.05)',
    marginBottom: '32px',
    border: '1px solid white'
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
            <div style={{ marginBottom: '48px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <div style={{ padding: '8px', background: 'white', boxShadow: '0 10px 20px rgba(0,0,0,0.05)', borderRadius: '12px', color: '#6366f1' }}>
                        <Sparkles size={20} />
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#4f46e5' }}>Painel Operacional</span>
                </div>
                <h1 style={{ fontSize: '48px', fontWeight: '900', color: '#0f172a', margin: 0, letterSpacing: '-0.05em', lineHeight: 1.1 }}>
                    Analytics & <span style={{ color: '#6366f1' }}>Performance</span>
                </h1>
                <p style={{ color: '#94a3b8', fontWeight: '700', fontSize: '14px', margin: 0 }}>
                    Monitoramento estratégico de vendas e produtividade
                </p>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '48px' }}>
                <DashboardKpi
                    title="Pedidos Ativos"
                    value={realtime.activeOrders || 0}
                    icon={Utensils}
                    color="#3b82f6"
                />
                <DashboardKpi
                    title="Pedidos Pendentes"
                    value={realtime.pendingOrders || 0}
                    icon={AlertCircle}
                    color="#f59e0b"
                />
                <DashboardKpi
                    title="Concluídos (Hoje)"
                    value={realtime.completedOrders || 0}
                    icon={CheckCircle}
                    color="#10b981"
                />
                <DashboardKpi
                    title="Mesas Ocupadas"
                    value={realtime.occupiedTables || 0}
                    icon={Coffee}
                    color="#6366f1"
                />
                <DashboardKpi
                    title="Solicitações"
                    value={realtime.activeWaiterCalls || 0}
                    icon={Users}
                    color="#ef4444"
                    pulse={realtime.activeWaiterCalls > 0}
                    onClick={() => setIsCallsModalOpen(true)}
                />
            </div>

            <WaiterCallsModal
                isOpen={isCallsModalOpen}
                onClose={() => setIsCallsModalOpen(false)}
                restaurantId={restaurantId}
            />

            {/* Charts Section */}
            <div style={{ display: 'flex', gap: '24px', marginBottom: '32px', flexWrap: 'wrap', width: '100%' }}>
                <div style={{ ...sectionStyle, flex: 2, minWidth: '400px', marginBottom: 0 }} className="group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
                        <div>
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">Atividade por Horário</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Picos de Pedidos</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} className="p-3 bg-slate-50 rounded-xl">
                            <BarChart3 size={16} className="text-indigo-500" />
                            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Volume de Vendas</span>
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

                <div style={{ ...sectionStyle, flex: 1, minWidth: '300px', marginBottom: 0 }} className="group">
                    <div className="mb-8">
                        <h3 className="text-xl font-black text-slate-800 tracking-tight">Pedidos por Turno</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Distribuição de Fluxo</p>
                    </div>
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
