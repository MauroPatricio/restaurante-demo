import React, { useState, useEffect, useMemo } from 'react';
import { 
    LayoutGrid, Timer, CheckCircle, AlertCircle,
    MessageSquare, Utensils, Clock, User, Search,
    Filter, ChevronRight, TrendingUp, Users, Info,
    Sparkles, Zap, ShoppingBag, Bell, Edit, ChevronDown, List, RefreshCw, Coffee as CoffeeIcon
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { useTranslation } from 'react-i18next';
import { analyticsAPI, tableAPI, waiterCallAPI } from '../services/api';
import TableGridMap from '../components/TableGridMap';
import TableDetailsModal from '../components/TableDetailsModal';
import TableSessionModal from '../components/TableSessionModal';

const KpiCard = ({ title, value, subValue, icon: Icon, color, trend }) => (
    <div style={{
        background: 'white',
        padding: '24px',
        borderRadius: '24px',
        border: '1px solid #f1f5f9',
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
        position: 'relative',
        overflow: 'hidden'
    }}>
        <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: `${color}10`,
            color: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            <Icon size={28} />
        </div>
        <div>
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
                <h3 style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a', margin: 0 }}>{value}</h3>
                {subValue && <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>{subValue}</span>}
            </div>
        </div>
    </div>
);

const CallNotification = ({ call, onAttend, color = '#ef4444' }) => (
    <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '16px',
        borderLeft: `4px solid ${color}`,
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        animation: 'slideIn 0.3s ease-out'
    }}>
        <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: `${color}10`,
            color: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            <Bell size={20} />
        </div>
        <div style={{ flex: 1 }}>
            <span style={{ fontSize: '14px', fontWeight: '900', color: '#0f172a' }}>Mesa {call.tableNumber}</span>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Solicitando atendimento</p>
        </div>
        <button 
            onClick={() => onAttend(call._id)}
            style={{
                padding: '8px 16px',
                background: color,
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: '800',
                cursor: 'pointer'
            }}
        >
            Atender
        </button>
    </div>
);

const StatusIndicator = ({ status, color }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ position: 'relative', width: '12px', height: '12px' }}>
            <div style={{
                width: '12px',
                height: '12px',
                background: color,
                borderRadius: '50%',
                opacity: 0.2
            }} />
            <div style={{
                position: 'absolute',
                top: '2px',
                left: '2px',
                width: '8px',
                height: '8px',
                background: color,
                borderRadius: '50%'
            }} />
            {status === 'occupied' && (
                <div style={{
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
    const [viewType, setViewType] = useState('grid');
    const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
    const [sessionData, setSessionData] = useState(null);

    const restaurantId = user?.restaurant?._id || user?.restaurant;

    const [activeCalls, setActiveCalls] = useState([]);
    const [latestCall, setLatestCall] = useState(null);

    useEffect(() => {
        if (restaurantId) {
            fetchHallData();
            fetchActiveCalls();
        }
    }, [restaurantId]);

    // Real-time recalculation of summary to ensure accuracy
    const summary = useMemo(() => {
        const counts = {
            totalTables: data.tables.length,
            freeCount: data.tables.filter(t => t.status === 'free').length,
            occupiedCount: data.tables.filter(t => t.status === 'occupied').length,
            reservedCount: data.tables.filter(t => t.status === 'reserved').length,
            cleaningCount: data.tables.filter(t => t.status === 'cleaning').length
        };
        return counts;
    }, [data.tables]);

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

        const handleNewCall = (call) => {
            if (call.restaurantId === restaurantId) {
                setActiveCalls(prev => [call, ...prev]);
                setLatestCall(call);
            }
        };

        const handleCallResolved = (callId) => {
            setActiveCalls(prev => prev.filter(c => c._id !== callId));
        };

        const handleTableStatusUpdate = (update) => {
            setData(prev => {
                const tableIndex = prev.tables.findIndex(t => t._id === update.tableId);
                if (tableIndex === -1) return prev;

                const newTables = [...prev.tables];
                newTables[tableIndex] = { ...newTables[tableIndex], status: update.status };

                // Update selectedTable if it's the one that was updated
                setSelectedTable(current => {
                    if (current && current._id === update.tableId) {
                        return { ...current, status: update.status };
                    }
                    return current;
                });

                return { ...prev, tables: newTables };
            });
        };

        socket.on('waiter:call', handleNewCall);
        socket.on('waiter:call:resolved', handleCallResolved);
        socket.on('waiter:call:acknowledged', handleCallResolved);
        socket.on('table:status-updated', handleTableStatusUpdate);
        socket.on('order:updated', handleUpdate);
        socket.on('order:new', handleUpdate);

        return () => {
            socket.off('waiter:call', handleNewCall);
            socket.off('waiter:call:resolved', handleCallResolved);
            socket.off('waiter:call:acknowledged', handleCallResolved);
            socket.off('table:status-updated', handleTableStatusUpdate);
            socket.off('order:updated', handleUpdate);
            socket.off('order:new', handleUpdate);
        };
    }, [socket, restaurantId]);

    const handleAttendCall = async (callId) => {
        try {
            await waiterCallAPI.resolve(callId);
            setLatestCall(null);
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

    const filteredTables = data.tables.filter(table => {
        const matchesSearch = table.number.toString().includes(searchTerm) ||
            (table.location && table.location.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesStatus = statusFilter === 'all' || table.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getStatusInfo = (status) => {
        switch (status) {
            case 'free': return { color: '#10b981', label: t('hall_status_free', 'Livre'), bg: '#ecfdf5', icon: CheckCircle };
            case 'occupied': return { color: '#ef4444', label: t('hall_status_occupied', 'Ocupada'), bg: '#fef2f2', icon: Users };
            case 'reserved': return { color: '#f59e0b', label: t('hall_status_reserved', 'Reservada'), bg: '#fffbeb', icon: Clock };
            case 'cleaning': return { color: '#3b82f6', label: t('hall_status_cleaning', 'Limpeza'), bg: '#eff6ff', icon: CoffeeIcon };
            default: return { color: '#64748b', label: status, bg: '#f8fafc', icon: Info };
        }
    };

    const handleOpenDetails = async (table) => {
        setSelectedTable(table);
        
        if (table.status === 'occupied') {
            try {
                const response = await tableAPI.getCurrentSession(table._id);
                if (response.data && response.data.success) {
                    setSessionData(response.data);
                    setIsSessionModalOpen(true);
                } else {
                    setIsDetailsModalOpen(true);
                }
            } catch (error) {
                console.error('Failed to fetch session details:', error);
                setIsDetailsModalOpen(true);
            }
        } else {
            setIsDetailsModalOpen(true);
        }
    };

    const handleFreeTable = async (tableId) => {
        try {
            await tableAPI.updateStatus(tableId, 'free');
            setIsSessionModalOpen(false);
            fetchHallData();
        } catch (error) {
            console.error('Failed to free table:', error);
        }
    };

    if (loading) return (
        <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
            <RefreshCw className="animate-spin" size={40} color="#4f46e5" />
            <p style={{ fontSize: '14px', fontWeight: '700', color: '#64748b' }}>Carregando mapa de mesas...</p>
        </div>
    );

    return (
        <div style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto' }}>
            {/* Header Section */}
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '40px',
                background: 'white',
                padding: '24px 32px',
                borderRadius: '24px',
                border: '1px solid #f1f5f9',
                boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ 
                        width: '48px', height: '48px', 
                        background: '#eff6ff', 
                        color: '#3b82f6', 
                        borderRadius: '16px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        border: '1px solid #eff6ff'
                    }}>
                        <LayoutGrid size={24} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                            {t('table_map_title', 'Mapa de Mesas')}
                        </h1>
                        <p style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '600', margin: '4px 0 0 0' }}>
                            {t('table_map_subtitle', 'Selecione uma mesa para ver os detalhes e fazer o atendimento.')}
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div 
                        onClick={() => setIsCallsModalOpen(true)}
                        style={{ 
                            width: '40px', height: '40px', 
                            background: 'white', 
                            borderRadius: '12px', 
                            border: '1px solid #f1f5f9',
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            color: '#0f172a',
                            position: 'relative',
                            cursor: 'pointer'
                        }}
                    >
                        <Bell size={20} />
                        {activeCalls.length > 0 && (
                            <span style={{
                                position: 'absolute', top: '-4px', right: '-4px',
                                background: '#ef4444', color: 'white',
                                width: '18px', height: '18px', borderRadius: '50%',
                                fontSize: '10px', fontWeight: '900',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: '2px solid white'
                            }}>
                                {activeCalls.length}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Dashboards Section */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '40px' }}>
                <KpiCard
                    title={t('hall_kpi_free', 'Livre')}
                    value={`${summary.freeCount || 0} ${t('tables_qr_codes', 'Tables & QR Codes')}`}
                    icon={CheckCircle}
                    color="#10b981"
                />
                <KpiCard
                    title={t('hall_kpi_occupied', 'Occupied')}
                    value={`${summary.occupiedCount || 0} ${t('tables_qr_codes', 'Tables & QR Codes')}`}
                    icon={Users}
                    color="#ef4444"
                />
                <KpiCard
                    title={t('hall_kpi_reserved', 'Reserved')}
                    value={`${summary.reservedCount || 0} ${t('table_singular', 'Table')}`}
                    icon={Clock}
                    color="#f59e0b"
                />
                <KpiCard
                    title={t('hall_kpi_cleaning', 'Limpa')}
                    value={`${summary.cleaningCount || 0} ${t('tables_qr_codes', 'Tables & QR Codes')}`}
                    icon={CoffeeIcon}
                    color="#3b82f6"
                />
            </div>

            {/* Manual Update Action */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
                <button 
                    onClick={fetchHallData}
                    style={{
                        padding: '12px 24px',
                        background: 'white',
                        border: '1px solid #f1f5f9',
                        borderRadius: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        color: '#64748b',
                        fontSize: '14px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                        transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#3b82f6';
                        e.currentTarget.style.color = '#3b82f6';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#f1f5f9';
                        e.currentTarget.style.color = '#64748b';
                    }}
                >
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    {t('btn_update', 'Actualizar')}
                </button>
            </div>

            {/* Filter Bar */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px'
            }}>
                <div style={{
                    display: 'flex',
                    background: 'white',
                    borderRadius: '16px',
                    padding: '4px',
                    border: '1px solid #f1f5f9',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
                }}>
                    {['all', 'free', 'occupied', 'reserved', 'cleaning'].map(status => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            style={{
                                padding: '10px 20px',
                                borderRadius: '12px',
                                fontSize: '13px',
                                fontWeight: '700',
                                border: 'none',
                                background: statusFilter === status ? '#4f46e5' : 'transparent',
                                color: statusFilter === status ? 'white' : '#64748b',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <div style={{ 
                                width: '6px', height: '6px', borderRadius: '50%', 
                                background: status === 'all' ? '#64748b' : 
                                           status === 'free' ? '#10b981' : 
                                           status === 'occupied' ? '#ef4444' : 
                                           status === 'reserved' ? '#f59e0b' : '#3b82f6'
                            }} />
                            {t(`hall_status_${status}`, status.charAt(0).toUpperCase() + status.slice(1))}
                        </button>
                    ))}
                </div>

                <div style={{
                    display: 'flex',
                    background: 'white',
                    borderRadius: '12px',
                    padding: '4px',
                    border: '1px solid #f1f5f9'
                }}>
                    <button 
                        onClick={() => setViewType('grid')}
                        style={{
                            padding: '8px',
                            borderRadius: '8px',
                            background: viewType === 'grid' ? '#eff6ff' : 'transparent',
                            color: viewType === 'grid' ? '#3b82f6' : '#94a3b8',
                            border: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        <LayoutGrid size={18} />
                    </button>
                    <button 
                        onClick={() => setViewType('list')}
                        style={{
                            padding: '8px',
                            borderRadius: '8px',
                            background: viewType === 'list' ? '#eff6ff' : 'transparent',
                            color: viewType === 'list' ? '#3b82f6' : '#94a3b8',
                            border: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        <List size={18} />
                    </button>
                </div>
            </div>

            {/* Content */}
            {viewType === 'grid' ? (
                <TableGridMap 
                    tables={filteredTables} 
                    onTableClick={handleOpenDetails} 
                />
            ) : (
                <div style={{
                    background: 'white',
                    borderRadius: '24px',
                    border: '1px solid #f1f5f9',
                    overflow: 'hidden',
                    boxShadow: '0 10px 30px -10px rgba(0,0,0,0.04)'
                }}>
                    <div style={{ padding: '24px 40px', display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1.5fr 160px', borderBottom: '1px solid #f1f5f9', background: 'rgba(248, 250, 252, 0.5)', width: '100%', gap: '20px', alignItems: 'center' }}>
                        <span style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.15em' }}>{t('table_identification', 'Identificação')}</span>
                        <span style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.15em' }}>{t('table_status', 'Estado')}</span>
                        <span style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.15em', textAlign: 'center' }}>{t('capacity', 'Capacidade')}</span>
                        <span style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.15em', textAlign: 'center' }}>{t('today_activity', 'Atividade')}</span>
                        <span style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.15em', textAlign: 'right' }}>{t('controls', 'Controles')}</span>
                    </div>

                    {filteredTables.length === 0 ? (
                        <div style={{ padding: '100px', textAlign: 'center' }}>
                            <div style={{ width: '80px', height: '80px', background: '#f8fafc', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto' }}>
                                <Search size={32} color="#cbd5e1" />
                            </div>
                            <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', margin: '0 0 8px 0' }}>{t('no_tables_found', 'Nenhuma mesa encontrada')}</h3>
                            <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>{t('try_different_filter', 'Tente outro filtro ou termo de pesquisa.')}</p>
                        </div>
                    ) : (
                        filteredTables.map(table => {
                            const statusInfo = getStatusInfo(table.status);
                            return (
                                <div 
                                    key={table._id}
                                    style={{ 
                                        padding: '20px 40px', 
                                        display: 'grid', 
                                        gridTemplateColumns: '2fr 1.5fr 1fr 1.5fr 160px', 
                                        borderBottom: '1px solid #f8fafc', 
                                        alignItems: 'center',
                                        gap: '20px',
                                        transition: 'background 0.2s ease',
                                        cursor: 'pointer'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#fcfdfe'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                                    onClick={() => handleOpenDetails(table)}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        <div style={{ 
                                            width: '44px', height: '44px', 
                                            background: statusInfo.bg, 
                                            color: statusInfo.color,
                                            borderRadius: '14px',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '16px', fontWeight: '900'
                                        }}>
                                            {table.number}
                                        </div>
                                        <div>
                                            <span style={{ fontSize: '15px', fontWeight: '900', color: '#0f172a', display: 'block' }}>{table.location || t('main_hall', 'Salão')}</span>
                                            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>ID: {table._id.slice(-6).toUpperCase()}</span>
                                        </div>
                                    </div>
                                    
                                    <div style={{ display: 'flex' }}>
                                        <div style={{ 
                                            padding: '8px 16px', 
                                            background: `${statusInfo.color}10`, 
                                            color: statusInfo.color,
                                            borderRadius: '12px',
                                            fontSize: '11px',
                                            fontWeight: '900',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}>
                                            <statusInfo.icon size={14} />
                                            {statusInfo.label}
                                        </div>
                                    </div>

                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#475569' }}>
                                            <Users size={16} />
                                            <span style={{ fontSize: '14px', fontWeight: '900' }}>{table.capacity}</span>
                                        </div>
                                    </div>

                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <span style={{ fontSize: '13px', fontWeight: '900', color: '#0f172a' }}>{table.ordersToday || 0} {t('orders', 'Pedidos')}</span>
                                            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700' }}>{table.callsToday || 0} {t('calls', 'Chamadas')}</span>
                                        </div>
                                    </div>

                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ 
                                            display: 'inline-flex',
                                            width: '40px', height: '40px',
                                            background: '#0f172a',
                                            color: 'white',
                                            borderRadius: '12px',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)'
                                        }}>
                                            <ChevronRight size={18} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* Toasts / Modals */}
            {latestCall && (
                <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000, width: '320px' }}>
                    <CallNotification 
                        call={latestCall} 
                        onAttend={handleAttendCall} 
                    />
                </div>
            )}

            {isSessionModalOpen && selectedTable && (
                <TableSessionModal 
                    onClose={() => setIsSessionModalOpen(false)}
                    table={selectedTable}
                    session={sessionData?.session}
                    orders={sessionData?.orders}
                    stats={sessionData?.stats}
                    canFree={true}
                    onFreeTable={handleFreeTable}
                    onUpdateStatus={(tableId, status) => {
                        tableAPI.updateStatus(tableId, status).then(() => fetchHallData());
                    }}
                    onRefresh={() => {
                        if (selectedTable) {
                            handleOpenDetails(selectedTable);
                            fetchHallData();
                        }
                    }}
                />
            )}

            {isDetailsModalOpen && selectedTable && (
                <TableDetailsModal
                    isOpen={isDetailsModalOpen}
                    onClose={() => setIsDetailsModalOpen(false)}
                    table={selectedTable}
                    restaurantId={restaurantId}
                />
            )}
        </div>
    );
}
