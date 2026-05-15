import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { tableAPI, orderAPI, waiterCallAPI } from '../services/api';
import {
    User, Users, Bell, CheckCircle, Clock, MapPin,
    UtensilsCrossed, AlertTriangle, Coffee, Loader2, ChevronRight, ArrowRight, Zap, Monitor, Layout
} from 'lucide-react';

import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale/pt';
import LoadingSpinner from '../components/LoadingSpinner';
import { useTranslation } from 'react-i18next';
import TableManagementPanel from '../components/TableManagementPanel';
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
    const [showManagementPanel, setShowManagementPanel] = useState(false);
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

    const fetchData = () => {
        fetchTables();
        fetchReadyOrders();
    };

    const fetchTables = async () => {
        try {
            const { data } = await tableAPI.getAll(restaurantId, { background: true });
            setTables(Array.isArray(data?.tables) ? data.tables : []);
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

    const markOrderServed = async (orderId) => {
        if (!confirm(t('confirm_served') || 'Marcar pedido como servido?')) return;
        try {
            await orderAPI.updateStatus(orderId, 'completed');
            fetchReadyOrders();
        } catch (error) {
            console.error('Failed to update order');
        }
    };

    const handleTableClick = (table) => {
        setSelectedTable(table);
        setShowManagementPanel(true);
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <LoadingSpinner size={48} />
        </div>
    );

    const occupiedTablesCount = tables.filter(t => t.status === 'occupied').length;
    const freeTablesCount = tables.filter(t => t.status === 'free' || !t.status).length;

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
                            <h3>{t('table_calls', 'Table Calls')}</h3>
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
                                                {t('attend', 'Atender')}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-sidebar-state">
                                    <Bell size={40} strokeWidth={1} />
                                    <p>{t('no_active_calls', 'No active calls')}</p>
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
                            <h3>{t('ready_for_pickup', 'Ready for Pickup')}</h3>
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
                                    <p>{t('no_ready_orders', 'No ready orders')}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </aside>

                {/* ── Main Content (Right) ── */}
                <main className="waiter-main-content">
                    <div className="floor-map-container">
                        <header className="map-header-premium">
                            <h2 className="text-2xl font-900 text-gray-900">{t('floor_map', 'Floor Map')}</h2>
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
                                        >
                                            <div className="card-top">
                                                <span className="table-number-large">
                                                    {table.number < 10 ? `0${table.number}` : table.number}
                                                </span>
                                                <span className="table-status-centered">{t(status).toUpperCase()}</span>
                                            </div>
                                            
                                            <div className="card-middle">
                                                <div className="capacity-info">
                                                    <Users size={14} />
                                                    <span>{table.capacity || 4} lugares</span>
                                                </div>
                                                <div className="card-status-icon">
                                                    <StatusIcon size={20} />
                                                </div>
                                            </div>

                                            <div className="card-bottom">
                                                <span className="tap-hint">
                                                    <ChevronRight size={12} />
                                                    Tap for details
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                </main>
            </div>

            {showManagementPanel && selectedTable && (
                <TableManagementPanel
                    table={selectedTable}
                    onClose={() => { setShowManagementPanel(false); fetchData(); }}
                />
            )}
        </div>
    );
}

// Ensure statusFilter state is defined
import { TrendingUp } from 'lucide-react';

