import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { tableAPI, orderAPI, waiterCallAPI } from '../services/api';
import {
    FiUser as User,
    FiUsers as Users,
    FiBell as Bell,
    FiCheckCircle as CheckCircle,
    FiClock as Clock,
    FiMapPin as MapPin,
    FiCoffee as Coffee,
    FiChevronRight as ChevronRight,
    FiArrowRight as ArrowRight,
    FiAlertTriangle as AlertTriangle,
    FiTrendingUp as TrendingUp,
    FiInbox as Inbox
} from 'react-icons/fi';
import { TbChefHat as UtensilsCrossed, TbProgressCheck as Loader2 } from 'react-icons/tb';

import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale/pt';
import LoadingSpinner from '../components/LoadingSpinner';
import { useTranslation } from 'react-i18next';
import TableSessionModal from '../components/TableSessionModal';
import '../styles/TableSessionModal.css';
import './WaiterDashboard.css';

const KpiCard = ({ title, value, subValue, icon: Icon, iconClass, className }) => (
    <div className={`kpi-card ${className}`}>
        <div className="kpi-info">
            <p>{title}</p>
            <div className="kpi-value-main">
                <h3 className="kpi-value">{value}</h3>
                {subValue && <span className="kpi-sub">{subValue}</span>}
            </div>
        </div>
        <div className={`kpi-icon-container ${iconClass}`}>
            <Icon size={28} strokeWidth={2.5} />
        </div>
    </div>
);

export default function WaiterDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { activeCalls, removeCall, socket } = useSocket();
    const [tables, setTables] = useState([]);
    const [readyOrders, setReadyOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTable, setSelectedTable] = useState(null);
    const [showSessionModal, setShowSessionModal] = useState(false);
    const [sessionData, setSessionData] = useState(null);
    const [statusFilter, setStatusFilter] = useState('all');

    const restaurantId = user?.restaurant?._id || user?.restaurant?.id || localStorage.getItem('restaurantId');

    useEffect(() => {
        if (!restaurantId) {
            setLoading(false);
            return;
        }
        fetchData();
        const interval = setInterval(fetchData, 15000);
        return () => clearInterval(interval);
    }, [restaurantId]);

    useEffect(() => {
        if (!socket || !restaurantId) return;
        const handleRealtimeUpdate = () => fetchData();
        socket.on('order:new', handleRealtimeUpdate);
        socket.on('order-updated', handleRealtimeUpdate);
        socket.on('waiter:call', handleRealtimeUpdate);
        socket.on('waiter:call:acknowledged', handleRealtimeUpdate);
        socket.on('waiter:call:resolved', handleRealtimeUpdate);
        socket.on('table:update', handleRealtimeUpdate);
        socket.on('table-alert', handleRealtimeUpdate);
        return () => {
            socket.off('order:new', handleRealtimeUpdate);
            socket.off('order-updated', handleRealtimeUpdate);
            socket.off('waiter:call', handleRealtimeUpdate);
            socket.off('waiter:call:acknowledged', handleRealtimeUpdate);
            socket.off('waiter:call:resolved', handleRealtimeUpdate);
            socket.off('table:update', handleRealtimeUpdate);
            socket.off('table-alert', handleRealtimeUpdate);
        };
    }, [socket, restaurantId]);

    const [recentOrders, setRecentOrders] = useState([]);
    const [draggedTableId, setDraggedTableId] = useState(null);

    const fetchData = () => {
        fetchTables();
        fetchReadyOrders();
        fetchRecentOrders();
    };

    const fetchTables = async () => {
        try {
            const { data } = await tableAPI.getAll(restaurantId, { background: true });
            if (Array.isArray(data?.tables)) {
                // Apply preferred custom table sort order if saved in localStorage
                const savedOrder = localStorage.getItem(`table_order_${restaurantId}`);
                let sortedTables = data.tables;
                if (savedOrder) {
                    try {
                        const orderArray = JSON.parse(savedOrder);
                        sortedTables = [...data.tables].sort((a, b) => {
                            const idxA = orderArray.indexOf(a._id);
                            const idxB = orderArray.indexOf(b._id);
                            if (idxA === -1 && idxB === -1) return 0;
                            if (idxA === -1) return 1;
                            if (idxB === -1) return -1;
                            return idxA - idxB;
                        });
                    } catch (e) {
                        console.error('Failed to parse saved table order');
                    }
                }
                setTables(sortedTables);
            } else {
                setTables([]);
            }
        } catch (error) {
            setTables([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchReadyOrders = async () => {
        try {
            const { data } = await orderAPI.getAll(restaurantId, { status: 'ready' }, { background: true });
            setReadyOrders(Array.isArray(data?.orders) ? data.orders : []);
        } catch (error) {
            setReadyOrders([]);
        }
    };

    const fetchRecentOrders = async () => {
        try {
            const { data } = await orderAPI.getAll(restaurantId, { limit: 50 }, { background: true });
            setRecentOrders(Array.isArray(data?.orders) ? data.orders : []);
        } catch (error) {
            setRecentOrders([]);
        }
    };

    // HTML5 Drag and Drop event handlers for table re-ordering
    const handleDragStart = (e, tableId) => {
        setDraggedTableId(tableId);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', tableId);
        e.currentTarget.classList.add('dragging');
    };

    const handleDragEnd = (e) => {
        e.currentTarget.classList.remove('dragging');
        setDraggedTableId(null);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        return false;
    };

    const handleDragEnter = (e) => {
        e.currentTarget.classList.add('drag-over');
    };

    const handleDragLeave = (e) => {
        e.currentTarget.classList.remove('drag-over');
    };

    const handleDrop = (e, targetTableId) => {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
        
        if (!draggedTableId || draggedTableId === targetTableId) return;

        const fromIndex = tables.findIndex(t => t._id === draggedTableId);
        const toIndex = tables.findIndex(t => t._id === targetTableId);

        if (fromIndex === -1 || toIndex === -1) return;

        const reordered = [...tables];
        const [draggedItem] = reordered.splice(fromIndex, 1);
        reordered.splice(toIndex, 0, draggedItem);

        setTables(reordered);

        // Save reordered array layout order for persistence
        const orderIds = reordered.map(t => t._id);
        localStorage.setItem(`table_order_${restaurantId}`, JSON.stringify(orderIds));
    };

    const markOrderServed = async (orderId) => {
        if (!confirm(t('confirm_served') || 'Marcar pedido como servido?')) return;
        try {
            await orderAPI.updateStatus(orderId, 'completed');
            fetchReadyOrders();
        } catch (error) {
            console.error('Failed to update order');
        }
    };

    const handleTableClick = async (table) => {
        try {
            // Check for any active calls for this table and dismiss them
            const call = activeCalls.find(c => c.tableNumber === table.number || c.tableNumber === String(table.number));
            if (call) {
                removeCall(call._id || call.callId);
            }

            const response = await tableAPI.getCurrentSession(table._id);
            setSelectedTable(table);
            setSessionData(response.data);
            setShowSessionModal(true);
        } catch (error) {
            console.error('Failed to fetch session:', error);
            alert(t('failed_load_session'));
        }
    };

    const handleFreeTable = async (tableId) => {
        // Optimistic status update
        setTables(prev => prev.map(t => 
            t._id === tableId ? { ...t, status: 'free' } : t
        ));
        try {
            await tableAPI.freeTable(tableId);
            setShowSessionModal(false);
            fetchData();
        } catch (error) {
            console.error('Failed to free table', error);
            fetchData();
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <LoadingSpinner size={48} />
        </div>
    );

    const occupiedTablesCount = tables.filter(t => t.status === 'occupied').length;
    const freeTablesCount = tables.filter(t => t.status === 'free' || !t.status).length;

    // Dynamic KPI calculations matching user screenshot and request
    const activeOrdersCount = recentOrders.filter(o => o.status === 'pending' || o.status === 'preparing').length;
    const pendingOrdersCount = recentOrders.filter(o => o.status === 'pending').length;
    
    const completedTodayCount = recentOrders.filter(o => {
        if (o.status !== 'completed' && o.status !== 'served') return false;
        const orderDate = new Date(o.createdAt);
        const today = new Date();
        return orderDate.getDate() === today.getDate() &&
               orderDate.getMonth() === today.getMonth() &&
               orderDate.getFullYear() === today.getFullYear();
    }).length;

    const waiterCallsCount = activeCalls.length;

    // Calculate dynamic average preparation time (in minutes) or fallback to beautiful standard 12 min
    const completedOrders = recentOrders.filter(o => o.status === 'completed' || o.status === 'served');
    let avgPrepTimeVal = 12;
    if (completedOrders.length > 0) {
        const totalDiff = completedOrders.reduce((sum, o) => {
            const diff = (new Date(o.updatedAt) - new Date(o.createdAt)) / 60000;
            return sum + (diff > 0 ? diff : 10);
        }, 0);
        const avg = Math.round(totalDiff / completedOrders.length);
        avgPrepTimeVal = avg > 0 ? avg : 8;
    }

    // Get last made order details
    const lastOrder = recentOrders[0] || null;

    return (
        <div className="waiter-page-wrapper animate-fade-in">
            <div className="waiter-layout-split">
                {/* ── Sidebar (Left) ── */}
                <aside className="waiter-sidebar">
                    {/* Table Calls Section */}
                    <div className="sidebar-section">
                        <div className="section-header">
                            <div className="icon-box calls">
                                <Bell size={18} />
                            </div>
                            <h3>{t('table_calls', 'Chamadas na Sala')}</h3>
                        </div>
                        <div className="section-content">
                            {activeCalls.length > 0 ? (
                                <div className="calls-list">
                                    {activeCalls.map(call => (
                                        <div key={call._id} className="call-item-card">
                                            <div className="call-info">
                                                <span className="call-table">Mesa {call.table?.number}</span>
                                                <span className="call-time">{formatDistanceToNow(new Date(call.createdAt), { addSuffix: true, locale: pt })}</span>
                                            </div>
                                            <button onClick={() => removeCall(call._id)} className="btn-resolve">
                                                {t('acknowledge_btn', 'Atender')}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-sidebar-state">
                                    <Bell size={40} strokeWidth={1} />
                                    <p>{t('no_active_calls', 'Sem chamadas ativas')}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Ready for Pickup Section */}
                    <div className="sidebar-section">
                        <div className="section-header">
                            <div className="icon-box pickup">
                                <CheckCircle size={18} />
                            </div>
                            <h3>{t('ready_for_pickup', 'Pronto para Servir')}</h3>
                        </div>
                        <div className="section-content">
                            {readyOrders.length > 0 ? (
                                <div className="pickup-list">
                                    {readyOrders.map(order => (
                                        <div key={order._id} className="pickup-item-card">
                                            <div className="pickup-info">
                                                <span className="pickup-table">Mesa {order.table?.number}</span>
                                                <span className="pickup-items">{order.items.length} {t('items', 'itens')}</span>
                                            </div>
                                            <button onClick={() => markOrderServed(order._id)} className="btn-serve">
                                                {t('serve', 'Servir')}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-sidebar-state">
                                    <UtensilsCrossed size={40} strokeWidth={1} />
                                    <p>{t('no_ready_orders', 'Nenhum prato pronto')}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </aside>

                {/* ── Main Content (Right) ── */}
                <main className="waiter-main-content">
                    {/* ── Waiter Operational Dashboard Cockpit ── */}
                    <div className="waiter-dashboard-header-panel">
                        <div className="dashboard-title-row">
                            <h1 className="waiter-dashboard-title">
                                {t('waiter_dashboard_label', 'Painel de Operações')}
                                <span className="waiter-dashboard-subtitle">
                                    {user?.name} &bull; {t('active_session_label', 'Sessão Ativa')}
                                </span>
                            </h1>
                        </div>

                        {/* KPI Cards Grid - Directly matching user screenshot layout */}
                        <div className="waiter-kpi-grid">
                            {/* Card 1: Pedidos Activos */}
                            <div className="waiter-kpi-card blue">
                                <div className="kpi-card-content">
                                    <span className="kpi-card-title">{t('active_orders', 'PEDIDOS ACTIVOS')}</span>
                                    <span className="kpi-card-value">{activeOrdersCount}</span>
                                </div>
                                <div className="kpi-card-icon-container blue">
                                    <UtensilsCrossed size={20} />
                                </div>
                            </div>

                            {/* Card 2: Pedidos Pendentes */}
                            <div className="waiter-kpi-card orange">
                                <div className="kpi-card-content">
                                    <span className="kpi-card-title">{t('pending_orders', 'PEDIDOS PENDENTES')}</span>
                                    <span className="kpi-card-value">{pendingOrdersCount}</span>
                                </div>
                                <div className="kpi-card-icon-container orange">
                                    <AlertTriangle size={20} />
                                </div>
                            </div>

                            {/* Card 3: Feitos Hoje */}
                            <div className="waiter-kpi-card green">
                                <div className="kpi-card-content">
                                    <span className="kpi-card-title">{t('completed_today_kpi', 'FEITOS HOJE')}</span>
                                    <span className="kpi-card-value">{completedTodayCount}</span>
                                </div>
                                <div className="kpi-card-icon-container green">
                                    <CheckCircle size={20} />
                                </div>
                            </div>

                            {/* Card 4: Chamadas Garçom */}
                            <div className="waiter-kpi-card red">
                                <div className="kpi-card-content">
                                    <span className="kpi-card-title">{t('waiter_calls_kpi', 'CHAMADAS GARÇOM')}</span>
                                    <span className="kpi-card-value">{waiterCallsCount}</span>
                                </div>
                                <div className="kpi-card-icon-container red">
                                    <Users size={20} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Floor Map Container ── */}
                    <div className="floor-map-container">
                        <header className="map-header-premium">
                            <h2 className="text-2xl font-900 text-gray-900">{t('floor_map', 'Mapa de Sala')}</h2>
                            <div className="status-filters-premium">
                                {['all', 'free', 'occupied', 'cleaning', 'reserved'].map(status => (
                                    <button
                                        key={status}
                                        onClick={() => setStatusFilter(status)}
                                        className={`filter-pill ${statusFilter === status ? 'active' : ''}`}
                                    >
                                        <div className={`filter-dot ${status}`} />
                                        {t(status, status.charAt(0).toUpperCase() + status.slice(1))}
                                    </button>
                                ))}
                            </div>
                        </header>

                        <div className="premium-tables-grid">
                            {tables
                                .filter(t => statusFilter === 'all' || (t.status || 'free') === statusFilter)
                                .map(table => {
                                    const status = table.status || 'free';
                                    const StatusIcon = status === 'occupied' ? Users : status === 'reserved' ? Clock : status === 'cleaning' ? Coffee : CheckCircle;

                                    return (
                                        <div
                                            key={table._id}
                                            onClick={() => handleTableClick(table)}
                                            className={`premium-table-card ${status}`}
                                            draggable={true}
                                            onDragStart={(e) => handleDragStart(e, table._id)}
                                            onDragEnd={handleDragEnd}
                                            onDragOver={handleDragOver}
                                            onDragEnter={handleDragEnter}
                                            onDragLeave={handleDragLeave}
                                            onDrop={(e) => handleDrop(e, table._id)}
                                        >
                                            <div className="card-top">
                                                <span className="table-number-large">
                                                    {table.number < 10 ? `0${table.number}` : table.number}
                                                </span>
                                                <span className="table-status-centered">{t(status).toUpperCase()}</span>
                                            </div>
                                            
                                            <div className="card-middle">
                                                <div className="capacity-info">
                                                    {status === 'occupied' && (table.lastStatusChange || table.updatedAt) ? (
                                                        <>
                                                            <Clock size={14} />
                                                            <span>{formatDistanceToNow(new Date(table.lastStatusChange || table.updatedAt), { locale: pt })}</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Users size={14} />
                                                            <span>{table.capacity || 4} lugares</span>
                                                        </>
                                                    )}
                                                </div>
                                                <div className="card-status-icon">
                                                    <StatusIcon size={20} />
                                                </div>
                                            </div>

                                            <div className="card-bottom">
                                                <span className="tap-hint">
                                                    <ChevronRight size={12} />
                                                    {t('tap_for_details', 'Toque para detalhes')}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                </main>
            </div>

            {showSessionModal && sessionData && (
                <TableSessionModal
                    table={sessionData.table}
                    session={sessionData.session}
                    orders={sessionData.orders}
                    stats={sessionData.stats}
                    onClose={() => setShowSessionModal(false)}
                    onFreeTable={handleFreeTable}
                    canFree={['manager', 'waiter', 'owner'].includes(user?.role)}
                />
            )}
        </div>
    );
}
