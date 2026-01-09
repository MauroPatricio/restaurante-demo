import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { analyticsAPI } from '../services/api';
import {
    LayoutGrid, Timer, CheckCircle, AlertCircle,
    MessageSquare, Utensils, Clock, User
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSocket } from '../contexts/SocketContext';
import WaiterCallsModal from '../components/WaiterCallsModal';

export default function HallDashboard() {
    const { user } = useAuth();
    const { socket } = useSocket();
    const { t } = useTranslation();
    const [data, setData] = useState({ summary: {}, tables: [] });
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        if (user?.restaurant) {
            fetchHallData();
        }
    }, [user]);

    // Update real-time if socket events occur
    useEffect(() => {
        if (!socket) return;

        const handleUpdate = () => {
            fetchHallData();
        };

        socket.on('waiter:call', handleUpdate);
        socket.on('waiter:call:resolved', handleUpdate);
        socket.on('order:updated', handleUpdate);
        socket.on('order:new', handleUpdate);

        return () => {
            socket.off('waiter:call', handleUpdate);
            socket.off('waiter:call:resolved', handleUpdate);
            socket.off('order:updated', handleUpdate);
            socket.off('order:new', handleUpdate);
        };
    }, [socket]);

    const fetchHallData = async () => {
        try {
            const restaurantId = user.restaurant._id || user.restaurant;
            const response = await analyticsAPI.getHall(restaurantId);
            setData(response.data || { summary: {}, tables: [] });
        } catch (error) {
            console.error('Failed to fetch hall data:', error);
        } finally {
            setLoading(false);
        }
    };

    const { summary, tables } = data;

    const getStatusColor = (status) => {
        switch (status) {
            case 'free': return '#10b981';
            case 'occupied': return '#ef4444';
            case 'reserved': return '#f59e0b';
            case 'cleaning': return '#3b82f6';
            default: return '#64748b';
        }
    };

    const cardStyle = {
        background: 'white',
        borderRadius: '20px',
        padding: '24px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        border: '1px solid #f1f5f9',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    };

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
    );

    return (
        <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
            <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '28px', fontWeight: '800', color: '#1e293b', margin: 0 }}>
                    Painel do Salão
                </h2>
                <p style={{ color: '#64748b', marginTop: '4px' }}>
                    Monitoramento em tempo real da operação de mesas
                </p>
                <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        style={{
                            background: '#0f172a',
                            color: 'white',
                            padding: '12px 24px',
                            borderRadius: '16px',
                            fontWeight: '800',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            border: 'none',
                            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)'
                        }}
                        className="hover:scale-105 active:scale-95"
                    >
                        <Coffee size={20} />
                        Gerenciar Chamadas ({tables.filter(t => t.callsToday > 0).length})
                    </button>
                    <button
                        style={{
                            background: '#f1f5f9',
                            color: '#475569',
                            padding: '12px 24px',
                            borderRadius: '16px',
                            fontWeight: '700',
                            border: '1px solid #e2e8f0',
                            cursor: 'pointer'
                        }}
                    >
                        Configurar Mapa
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                <div style={cardStyle}>
                    <Timer size={20} color="#6366f1" />
                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Tempo Médio / Mesa</span>
                    <span style={{ fontSize: '24px', fontWeight: '800', color: '#1e293b' }}>{summary.avgTurnover} min</span>
                </div>
                <div style={cardStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }}></div>
                        <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Mesas Livres</span>
                    </div>
                    <span style={{ fontSize: '24px', fontWeight: '800', color: '#1e293b' }}>{summary.freeCount} / {summary.totalTables}</span>
                </div>
                <div style={cardStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }}></div>
                        <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Em Atendimento</span>
                    </div>
                    <span style={{ fontSize: '24px', fontWeight: '800', color: '#1e293b' }}>{summary.occupiedCount}</span>
                </div>
                <div style={cardStyle}>
                    <AlertCircle size={20} color="#f59e0b" />
                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Reservas / Limpeza</span>
                    <span style={{ fontSize: '24px', fontWeight: '800', color: '#1e293b' }}>{summary.waitingCount}</span>
                </div>
                <div
                    onClick={() => setIsModalOpen(true)}
                    style={{
                        ...cardStyle,
                        cursor: 'pointer',
                        background: (summary.occupiedCount > 0 && tables.some(t => t.callsToday > 0)) ? '#fef2f2' : 'white',
                        transition: 'all 0.2s'
                    }}
                    className="hover:shadow-md active:scale-95"
                >
                    <MessageSquare size={20} color="#ef4444" />
                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Chamadas Ativas</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '24px', fontWeight: '800', color: '#1e293b' }}>
                            {tables.filter(t => t.callsToday > 0).length}
                        </span>
                        {tables.some(t => t.callsToday > 0) && (
                            <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                        )}
                    </div>
                </div>
            </div>

            {/* Table Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '24px'
            }}>
                {tables.map(table => (
                    <div key={table._id} style={{
                        background: 'white',
                        borderRadius: '24px',
                        border: '1px solid #f1f5f9',
                        overflow: 'hidden',
                        position: 'relative',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                    }} className="hover:shadow-lg hover:-translate-y-1">

                        {/* Status Bar */}
                        <div style={{
                            height: '6px',
                            background: getStatusColor(table.status)
                        }}></div>

                        <div style={{ padding: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                <div>
                                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        Mesa
                                    </div>
                                    <h4 style={{ fontSize: '32px', fontWeight: '900', color: '#1e293b', margin: 0 }}>
                                        {table.number < 10 ? `0${table.number}` : table.number}
                                    </h4>
                                </div>
                                <div style={{
                                    background: `${getStatusColor(table.status)}15`,
                                    color: getStatusColor(table.status),
                                    padding: '6px 12px',
                                    borderRadius: '10px',
                                    fontSize: '12px',
                                    fontWeight: '700',
                                    textTransform: 'capitalize'
                                }}>
                                    {table.status === 'free' ? 'Disponível' :
                                        table.status === 'occupied' ? 'Ocupada' :
                                            table.status === 'cleaning' ? 'Em Limpeza' : table.status}
                                </div>
                            </div>

                            {table.status === 'occupied' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569' }}>
                                        <Clock size={16} />
                                        <span style={{ fontSize: '14px', fontWeight: '600' }}>
                                            {table.currentSessionId ?
                                                `${Math.round((new Date() - new Date(table.currentSessionId.startedAt)) / 60000)} min decorridos`
                                                : '--'}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569' }}>
                                        <Utensils size={16} />
                                        <span style={{ fontSize: '14px', fontWeight: '600' }}>{table.ordersToday} pedidos hoje</span>
                                    </div>
                                </div>
                            )}

                            {table.status === 'free' && (
                                <div style={{ color: '#94a3b8', fontSize: '14px', fontStyle: 'italic', marginTop: '12px' }}>
                                    Média histórica: {table.avgDuration} min
                                </div>
                            )}

                            {/* Indicator for Active Calls */}
                            {table.callsToday > 0 && (
                                <div style={{
                                    marginTop: '16px',
                                    background: '#fff7ed',
                                    border: '1px solid #fed7aa',
                                    borderRadius: '12px',
                                    padding: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    color: '#c2410c'
                                }}>
                                    <MessageSquare size={16} className="animate-bounce" />
                                    <span style={{ fontSize: '13px', fontWeight: '700' }}>{table.callsToday} Chamadas hoje</span>
                                </div>
                            )}
                        </div>

                        {/* Footer Info */}
                        <div style={{
                            padding: '12px 24px',
                            background: '#f8fafc',
                            borderTop: '1px solid #f1f5f9',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '12px' }}>
                                <User size={14} />
                                <span>Cap: {table.capacity}</span>
                            </div>
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                                Lct: {table.location || 'Salão Principal'}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            <WaiterCallsModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                restaurantId={user.restaurant._id || user.restaurant}
            />
        </div>
    );
}
