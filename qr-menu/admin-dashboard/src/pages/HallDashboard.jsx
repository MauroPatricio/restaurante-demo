import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { analyticsAPI } from '../services/api';
import {
    LayoutGrid, Timer, CheckCircle, AlertCircle,
    MessageSquare, Utensils, Clock, User, Search,
    Filter, ChevronRight, TrendingUp, Users, Info,
    Sparkles, Zap, ShoppingBag
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSocket } from '../contexts/SocketContext';
import WaiterCallsModal from '../components/WaiterCallsModal';
import TableDetailsModal from '../components/TableDetailsModal';
import LoadingSpinner from '../components/LoadingSpinner';
import { SkeletonGrid } from '../components/Skeleton';
import WaiterCallToast from '../components/WaiterCallToast';
import { useSound } from '../hooks/useSound';
import { waiterCallAPI } from '../services/api';

const KpiCard = ({ title, value, icon: Icon, color, subValue, pulse }) => (
    <div style={{
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
        transition: 'all 0.5s ease',
        overflow: 'hidden'
    }} className="group hover-scale">
        <div style={{
            position: 'absolute', top: 0, right: 0, width: '96px', height: '96px',
            borderRadius: '50%', filter: 'blur(40px)', opacity: 0.1,
            marginRight: '-32px', marginTop: '-32px', background: color
        }} />
        <div>
            <div style={{
                fontSize: '10px',
                fontWeight: '900',
                color: '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
                marginBottom: '12px'
            }}>
                {title}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '40px', fontWeight: '900', color: '#1e293b', letterSpacing: '-0.05em' }}>
                    {value}
                </span>
                {subValue && (
                    <span style={{ fontSize: '12px', fontWeight: '900', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        {subValue}
                    </span>
                )}
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

export default function HallDashboard() {
    const { user } = useAuth();
    const { socket } = useSocket();
    const { t } = useTranslation();
    const [data, setData] = useState({ summary: {}, tables: [] });
    const [loading, setLoading] = useState(true);
    const [isCallsModalOpen, setIsCallsModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedTable, setSelectedTable] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const restaurantId = user?.restaurant?._id || user?.restaurant;

    const [activeCalls, setActiveCalls] = useState([]);
    const [latestCall, setLatestCall] = useState(null);
    const { play: playBell } = useSound('/sounds/bell.mp3');

    useEffect(() => {
        if (restaurantId) {
            fetchHallData();
            fetchActiveCalls();
        }
    }, [restaurantId]);

    const fetchActiveCalls = async () => {
        try {
            const res = await waiterCallAPI.getActive(restaurantId);
            if (res.data && Array.isArray(res.data.calls)) {
                setActiveCalls(res.data.calls);
            }
        } catch (error) {
            console.error('Failed to fetch active calls:', error);
        }
    };

    // Update real-time if socket events occur
    useEffect(() => {
        if (!socket) return;

        const handleUpdate = () => {
            fetchHallData();
        };

        const handleNewCall = (newCall) => {
            playBell();
            setLatestCall(newCall);
            fetchActiveCalls(); // Refresh list
            fetchHallData(); // Refresh table stats
        };

        const handleCallResolved = () => {
            fetchActiveCalls();
            fetchHallData();
        };

        socket.on('waiter:call', handleNewCall);
        socket.on('waiter:call:resolved', handleCallResolved);
        socket.on('waiter:call:acknowledged', handleCallResolved);
        socket.on('order:updated', handleUpdate);
        socket.on('order:new', handleUpdate);

        return () => {
            socket.off('waiter:call', handleNewCall);
            socket.off('waiter:call:resolved', handleCallResolved);
            socket.off('waiter:call:acknowledged', handleCallResolved);
            socket.off('order:updated', handleUpdate);
            socket.off('order:new', handleUpdate);
        };
    }, [socket, playBell]);

    const handleAttendCall = async (callId) => {
        try {
            await waiterCallAPI.resolve(callId);
            setLatestCall(null); // Dismiss toast
            fetchActiveCalls();
        } catch (error) {
            console.error('Failed to attend call:', error);
        }
    };

    const fetchHallData = async () => {
        try {
            const response = await analyticsAPI.getHall(restaurantId);
            setData(response.data || { summary: {}, tables: [] });
        } catch (error) {
            console.error('Failed to fetch hall data:', error);
        } finally {
            setLoading(false);
        }
    };

    const { summary = {}, tables = [] } = data;

    const filteredTables = tables.filter(table => {
        const matchesSearch = table.number.toString().includes(searchTerm) ||
            (table.location && table.location.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesStatus = statusFilter === 'all' || table.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getStatusInfo = (status) => {
        switch (status) {
            case 'free': return { color: '#10b981', label: 'Livre', bg: '#ecfdf5' };
            case 'occupied': return { color: '#ef4444', label: 'Ocupada', bg: '#fef2f2' };
            case 'reserved': return { color: '#f59e0b', label: 'Reservada', bg: '#fffbeb' };
            case 'cleaning': return { color: '#3b82f6', label: 'Em Limpeza', bg: '#eff6ff' };
            default: return { color: '#64748b', label: status, bg: '#f8fafc' };
        }
    };

    const handleOpenDetails = (table) => {
        setSelectedTable(table);
        setIsDetailsModalOpen(true);
    };

    // Skeleton loading - maintains layout
    if (loading) return (
        <div className="p-6">
            <div className="mb-6">
                <div className="h-10 w-64 bg-gray-200 rounded-lg animate-pulse mb-2"></div>
                <div className="h-4 w-80 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <SkeletonGrid items={5} columns={5} height="160px" gap="24px" />
        </div>
    );

    return (
        <div style={{ padding: '40px', maxWidth: '1600px', margin: '0 auto', minHeight: '100vh', background: '#f8fafc' }}>
            {/* Page Header */}
            <div style={{ marginBottom: '48px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <div style={{ padding: '8px', background: 'white', boxShadow: '0 10px 20px rgba(0,0,0,0.05)', borderRadius: '12px', color: '#10b981' }}>
                            <Sparkles size={20} />
                        </div>
                        <span style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#059669' }}>Terminal de Gestão de Salão</span>
                    </div>
                    <h1 style={{ fontSize: '48px', fontWeight: '900', color: '#0f172a', margin: 0, letterSpacing: '-0.05em', lineHeight: 1.1 }}>
                        Monitor de <span style={{ color: '#10b981' }}>Ocupação</span>
                    </h1>
                    <p style={{ color: '#94a3b8', fontWeight: '700', fontSize: '14px', margin: 0 }}>
                        Análise de fluxo, pedidos e solicitações em tempo real
                    </p>
                </div>
                <div>
                    <button
                        onClick={() => setIsCallsModalOpen(true)}
                        style={{
                            background: '#0f172a',
                            color: 'white',
                            padding: '20px 40px',
                            borderRadius: '24px',
                            fontWeight: '900',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            border: 'none',
                            boxShadow: '0 20px 40px -8px rgba(15, 23, 42, 0.3)'
                        }}
                        className="hover-scale group"
                    >
                        <Zap size={20} style={{ transition: 'color 0.3s' }} className="group-hover:text-yellow-400" />
                        Solicitações Ativas
                        {activeCalls.length > 0 && (
                            <span style={{
                                background: '#ef4444',
                                color: 'white',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                marginLeft: 'auto'
                            }}>
                                {activeCalls.length}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Dashboards Section */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '48px' }}>
                <KpiCard
                    title="Mesas Total"
                    value={summary.totalTables || 0}
                    icon={LayoutGrid}
                    color="#3b82f6"
                />
                <KpiCard
                    title="Mesas Livres"
                    value={summary.freeCount || 0}
                    icon={CheckCircle}
                    color="#10b981"
                />
                <KpiCard
                    title="Mesas Ocupadas"
                    value={summary.occupiedCount || 0}
                    icon={Timer}
                    color="#ef4444"
                />
                <KpiCard
                    title="Mesa Destaque"
                    value={summary.mostRequestedTable ? (summary.mostRequestedTable.number < 10 ? `0${summary.mostRequestedTable.number}` : summary.mostRequestedTable.number) : '--'}
                    subValue={`#${summary.mostRequestedTable?.requests || 0}`}
                    icon={TrendingUp}
                    color="#f59e0b"
                />
                <KpiCard
                    title="Solicitações"
                    value={tables.filter(t => t.callsToday > 0).length}
                    icon={Zap}
                    color="#8b5cf6"
                    pulse={tables.some(t => t.callsToday > 0)}
                />
            </div>

            {/* Filter and Search Bar */}
            <div style={{
                background: 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(20px)',
                borderRadius: '40px',
                padding: '16px 24px',
                marginBottom: '32px',
                display: 'flex',
                gap: '24px',
                alignItems: 'center',
                boxShadow: '0 20px 40px -12px rgba(0, 0, 0, 0.05)',
                border: '1px solid white'
            }}>
                <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
                    <Search size={20} style={{ position: 'absolute', left: '20px', color: '#cbd5e1' }} />
                    <input
                        type="text"
                        placeholder="Pesquisar por número ou localização..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '16px 16px 16px 56px',
                            background: '#f8fafc',
                            border: '2px solid transparent',
                            borderRadius: '20px',
                            fontSize: '14px',
                            fontWeight: '700',
                            color: '#1e293b',
                            outline: 'none',
                            transition: 'all 0.3s'
                        }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Filter size={18} style={{ color: '#cbd5e1', marginRight: '8px' }} />
                    {['all', 'free', 'occupied', 'cleaning'].map(status => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            style={{
                                padding: '12px 24px',
                                borderRadius: '16px',
                                fontSize: '11px',
                                fontWeight: '900',
                                border: 'none',
                                background: statusFilter === status ? '#0f172a' : 'white',
                                color: statusFilter === status ? 'white' : '#94a3b8',
                                cursor: 'pointer',
                                transition: 'all 0.3s',
                                textTransform: 'uppercase',
                                letterSpacing: '0.1em',
                                boxShadow: statusFilter === status ? '0 10px 20px -5px rgba(15, 23, 42, 0.2)' : 'none'
                            }}
                        >
                            {status === 'all' ? 'Todos' :
                                status === 'free' ? 'Livre' :
                                    status === 'occupied' ? 'Ocupada' : 'Limpeza'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tables List */}
            <div style={{
                background: 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(30px)',
                borderRadius: '48px',
                border: '1px solid white',
                overflow: 'hidden',
                boxShadow: '0 32px 64px -16px rgba(0,0,0,0.08)'
            }}>
                <div style={{ padding: '24px 40px', display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1.5fr 160px', borderBottom: '1px solid #f1f5f9', background: 'rgba(248, 250, 252, 0.5)', width: '100%', gap: '20px', alignItems: 'center' }}>
                    <span style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Identificação</span>
                    <span style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Estado Atual</span>
                    <span style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.15em', textAlign: 'center' }}>Capacidade</span>
                    <span style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.15em', textAlign: 'center' }}>Atividade Hoje</span>
                    <span style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.15em', textAlign: 'right' }}>Controles</span>
                </div>

                <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                    {filteredTables.map(table => {
                        const sInfo = getStatusInfo(table.status);
                        return (
                            <div
                                key={table._id}
                                style={{
                                    padding: '32px 40px',
                                    display: 'grid',
                                    gridTemplateColumns: '2fr 1.5fr 1fr 1.5fr 160px',
                                    borderBottom: '1px solid #f8fafc',
                                    alignItems: 'center',
                                    transition: 'background 0.3s',
                                    gap: '20px'
                                }}
                                className="hover:bg-white/50 group"
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                                    <div style={{
                                        width: '64px',
                                        height: '64px',
                                        background: '#0f172a',
                                        color: 'white',
                                        borderRadius: '24px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: '900',
                                        fontSize: '24px',
                                        boxShadow: '0 12px 24px -8px rgba(15, 23, 42, 0.4)',
                                        transition: 'all 0.5s ease'
                                    }} className="group-hover:scale-110 group-hover:-rotate-3">
                                        {table.number < 10 ? `0${table.number}` : table.number}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '18px', fontWeight: '900', color: '#1e293b', letterSpacing: '-0.02em' }}>{table.location || 'Salão Principal'}</div>
                                        <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }}>ID: {table._id.slice(-6).toUpperCase()}</div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex' }}>
                                    <div style={{
                                        padding: '10px 20px',
                                        borderRadius: '16px',
                                        background: 'white',
                                        color: sInfo.color,
                                        fontSize: '11px',
                                        fontWeight: '900',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        border: `1px solid ${sInfo.color}20`,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.1em',
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                                    }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: sInfo.color }} className="animate-pulse" />
                                        {sInfo.label}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#64748b', fontWeight: '900' }}>
                                    <div style={{ padding: '8px', background: '#f8fafc', borderRadius: '12px' }}>
                                        <Users size={18} />
                                    </div>
                                    <span style={{ fontSize: '14px' }}>{table.capacity}</span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px' }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '18px', fontWeight: '900', color: '#1e293b', letterSpacing: '-0.05em' }}>{table.ordersToday}</div>
                                        <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Pedidos</div>
                                    </div>
                                    <div style={{ width: '1px', height: '32px', background: '#f1f5f9' }} />
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '18px', fontWeight: '900', color: '#10b981', letterSpacing: '-0.05em' }}>{table.callsToday}</div>
                                        <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Chamadas</div>
                                    </div>
                                </div>

                                <div style={{ textAlign: 'right' }}>
                                    <button
                                        onClick={() => handleOpenDetails(table)}
                                        style={{
                                            marginLeft: 'auto',
                                            width: '48px',
                                            height: '48px',
                                            background: '#f8fafc',
                                            color: '#94a3b8',
                                            borderRadius: '16px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            transition: 'all 0.3s ease',
                                            border: 'none'
                                        }}
                                        className="hover-btn-black"
                                    >
                                        <ChevronRight size={20} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    {filteredTables.length === 0 && (
                        <div className="py-20 text-center">
                            <Info size={48} className="mx-auto text-slate-200 mb-4" />
                            <p className="text-slate-400 font-bold">Nenhuma mesa encontrada com estes critérios.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Components */}
            <WaiterCallsModal
                isOpen={isCallsModalOpen}
                onClose={() => setIsCallsModalOpen(false)}
                restaurantId={restaurantId}
            />

            <TableDetailsModal
                isOpen={isDetailsModalOpen}
                onClose={() => setIsDetailsModalOpen(false)}
                table={selectedTable}
                restaurantId={restaurantId}
                onUpdate={fetchHallData}
            />

            <WaiterCallToast
                call={latestCall}
                onDismiss={() => setLatestCall(null)}
                onAttend={handleAttendCall}
            />
        </div>
    );
}
