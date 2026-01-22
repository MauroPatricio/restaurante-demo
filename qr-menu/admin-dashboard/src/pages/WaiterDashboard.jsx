import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { tableAPI, orderAPI, waiterCallAPI } from '../services/api';
import {
    User, Users, Bell, CheckCircle, Clock, MapPin,
    UtensilsCrossed, AlertTriangle, Coffee, Loader2
} from 'lucide-react';

import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale/pt';
import LoadingSpinner from '../components/LoadingSpinner';
import { useTranslation } from 'react-i18next';
import TableManagementPanel from '../components/TableManagementPanel';

const KpiCard = ({ title, value, icon: Icon, color, subValue, pulse }) => (
    <div
        className="bg-white dark:bg-gray-800 rounded-xl p-5 cursor-pointer transition-all duration-200 hover:shadow-2xl hover:-translate-y-2 shadow-lg dark:shadow-gray-900/50"
        style={{
            boxShadow: '0 6px 10px -2px rgba(0, 0, 0, 0.2), 0 4px 6px -1px rgba(0, 0, 0, 0.15)'
        }}
    >
        <div className="flex justify-between items-start">
            <div className="flex-1">
                <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    {title}
                </p>
                <div className="flex items-baseline gap-2">
                    <h3 className="text-3xl font-extrabold text-gray-900 dark:text-white">{value}</h3>
                    {subValue && <span className="text-sm text-gray-500 dark:text-gray-400">{subValue}</span>}
                </div>
            </div>
            <div
                className={`p-3 rounded-full ${pulse ? 'animate-pulse' : ''}`}
                style={{
                    backgroundColor: `${color}15`
                }}
            >
                <Icon size={20} style={{ color: color }} />
            </div>
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

    const restaurantId = user?.restaurant?._id || user?.restaurant?.id || localStorage.getItem('restaurantId');
    const isRinging = activeCalls.length > 0;

    useEffect(() => {
        if (!restaurantId) {
            setLoading(false);
            return;
        }

        fetchData();
        const interval = setInterval(fetchData, 15000);

        return () => {
            clearInterval(interval);
        };
    }, [restaurantId]);

    useEffect(() => {
        if (!socket || !restaurantId) return;

        const handleRealtimeUpdate = (data) => {
            console.log('Waiter: Realtime update received', data);
            fetchData();
        };

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
            console.error('Failed to fetch tables:', error);
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
            console.error('Failed to fetch ready orders:', error);
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

    const handleClosePanel = () => {
        setShowManagementPanel(false);
        setSelectedTable(null);
        // Refresh data after closing
        fetchData();
    };

    if (loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
            <LoadingSpinner size={48} message={t('loading_waiter') || "Carregando Área do Garçom..."} />
        </div>
    );

    if (!restaurantId) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-6">
                <div className="text-center max-w-md">
                    <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="h-8 w-8 text-amber-500" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('restaurant_not_found') || "Restaurante não identificado"}</h2>
                    <p className="text-gray-500 dark:text-gray-400">{t('login_again') || "Por favor, faça login novamente ou selecione um restaurante."}</p>
                </div>
            </div>
        );
    }

    const freeTables = tables.filter(t => t.status === 'free').length;
    const occupiedTables = tables.filter(t => t.status === 'occupied').length;
    const myTables = tables.filter(t => t.assignedWaiter === user?.name).length;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                            {t('waiter_area') || 'Área do Garçom'}
                        </h1>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                            </span>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {t('manage_tables_desc') || 'Gerencie mesas e pedidos em tempo real'} <span className="mx-2">•</span> <span className="font-semibold text-gray-700 dark:text-gray-200">{user?.name}</span>
                            </p>
                        </div>
                    </div>
                    <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 self-start md:self-auto">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        {t('online') || 'Online'}
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <KpiCard
                        title={t('active_alerts') || 'Chamadas Ativas'}
                        value={activeCalls.length}
                        icon={Bell}
                        color="#ef4444"
                        pulse={activeCalls.length > 0}
                    />
                    <KpiCard
                        title={t('ready_orders') || 'Pedidos Prontos'}
                        value={readyOrders.length}
                        icon={CheckCircle}
                        color="#10b981"
                        pulse={readyOrders.length > 0}
                    />
                    <KpiCard
                        title={t('my_tables') || 'Minhas Mesas'}
                        value={myTables}
                        icon={User}
                        color="#8b5cf6"
                    />
                    <div
                        className={`rounded-xl p-5 cursor-pointer transition-all duration-200 hover:shadow-2xl hover:-translate-y-2 shadow-lg dark:shadow-gray-900/50 ${occupiedTables > (tables.length - occupiedTables)
                            ? 'bg-red-50 dark:bg-red-900/20'
                            : 'bg-green-50 dark:bg-green-900/20'
                            }`}
                        style={{
                            boxShadow: '0 6px 10px -2px rgba(0, 0, 0, 0.2), 0 4px 6px -1px rgba(0, 0, 0, 0.15)'
                        }}
                    >
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <p className="text-[10px] font-bold uppercase tracking-wider mb-2 text-gray-500 dark:text-gray-400">
                                    {t('table_status') || 'Estado da Mesa'}
                                </p>
                                <div className="flex items-baseline gap-2">
                                    <h3 className="text-3xl font-extrabold text-red-600 dark:text-red-500">
                                        {occupiedTables}
                                    </h3>
                                    <span className="text-2xl font-bold text-gray-900 dark:text-white">/</span>
                                    <h3 className="text-3xl font-extrabold text-gray-900 dark:text-white">
                                        {tables.length}
                                    </h3>
                                </div>
                            </div>
                            <div
                                className="p-3 rounded-full"
                                style={{
                                    backgroundColor: occupiedTables > (tables.length - occupiedTables) ? '#ef444415' : '#10b98115'
                                }}
                            >
                                <UtensilsCrossed
                                    size={20}
                                    style={{
                                        color: occupiedTables > (tables.length - occupiedTables) ? '#ef4444' : '#10b981'
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                    {/* Left Column: Alerts & Ready Orders */}
                    <div className="space-y-8 xl:col-span-1">

                        {/* Active Alerts */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <div className="p-2 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-lg">
                                        <Bell size={18} />
                                    </div>
                                    {t('table_calls') || 'Chamadas'}
                                </h2>
                                {activeCalls.length > 0 && (
                                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">{activeCalls.length}</span>
                                )}
                            </div>

                            {activeCalls.length === 0 ? (
                                <div className="text-center py-8">
                                    <Bell className="mx-auto h-10 w-10 mb-3 text-gray-300 dark:text-gray-600" />
                                    <p className="text-sm text-gray-400 dark:text-gray-500">{t('no_active_calls') || 'Nenhuma chamada ativa'}</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {activeCalls.map(call => (
                                        <div key={call.callId} className="bg-red-50 dark:bg-red-900/10 border-l-4 border-red-500 rounded-r-xl p-4">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <h3 className="font-bold text-gray-900 dark:text-white">{t('table') || 'Mesa'} {call.tableNumber || '?'}</h3>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                        {call.customerName || 'Cliente'} • <span className="font-medium text-red-600 dark:text-red-400">{call.type === 'payment' ? 'Pagamento' : 'Serviço'}</span>
                                                    </p>
                                                </div>
                                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                                    <Clock size={12} /> {formatDistanceToNow(new Date(call.createdAt || call.timestamp), { addSuffix: true, locale: pt })}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => waiterCallAPI.resolve(call.callId)}
                                                className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors"
                                            >
                                                {t('attend') || 'Atender Mesa'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Ready Orders */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <div className="p-2 bg-green-50 dark:bg-green-900/20 text-green-500 rounded-lg">
                                        <CheckCircle size={18} />
                                    </div>
                                    {t('ready_for_pickup') || 'Prontos'}
                                </h2>
                                {readyOrders.length > 0 && (
                                    <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">{readyOrders.length}</span>
                                )}
                            </div>

                            {readyOrders.length === 0 ? (
                                <div className="text-center py-8">
                                    <UtensilsCrossed className="mx-auto h-10 w-10 mb-3 text-gray-300 dark:text-gray-600" />
                                    <p className="text-sm text-gray-400 dark:text-gray-500">{t('no_ready_orders') || 'Nenhum pedido pronto'}</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {readyOrders.map(order => (
                                        <div key={order._id} className="bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-xl p-4 shadow-sm">
                                            <div className="flex justify-between items-center mb-3">
                                                <span className="font-bold text-gray-900 dark:text-white">{t('table') || 'Mesa'} {order.table?.number || '?'}</span>
                                                <span className="bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 text-xs px-2 py-1 rounded font-mono">
                                                    #{order.orderNumber || order._id.slice(-4)}
                                                </span>
                                            </div>
                                            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-3">
                                                <ul className="text-sm space-y-1">
                                                    {order.items?.map((item, idx) => (
                                                        <li key={idx} className="flex gap-2">
                                                            <span className="font-bold text-primary-600 dark:text-primary-400 text-xs">{item.qty}x</span>
                                                            <span className="text-gray-700 dark:text-gray-300 truncate">{item.item?.name || item.name}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <button
                                                onClick={() => markOrderServed(order._id)}
                                                className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold shadow-lg shadow-green-600/20 transition-all flex items-center justify-center gap-2"
                                            >
                                                <CheckCircle size={16} /> {t('mark_delivered') || 'Marcar como Entregue'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Tables Grid */}
                    <div className="xl:col-span-2">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 h-full flex flex-col">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-gray-100 dark:border-gray-700">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('floor_map') || 'Mapa do Salão'}</h2>
                                <div className="flex flex-wrap gap-2">
                                    <div className="px-3 py-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-full text-xs font-semibold flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                        <div className="w-2 h-2 rounded-full bg-green-500"></div> {t('free') || 'Livre'}
                                    </div>
                                    <div className="px-3 py-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-full text-xs font-semibold flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                        <div className="w-2 h-2 rounded-full bg-red-500"></div> {t('occupied') || 'Ocupada'}
                                    </div>
                                    <div className="px-3 py-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-full text-xs font-semibold flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                        <div className="w-2 h-2 rounded-full bg-blue-500"></div> {t('cleaning') || 'Limpeza'}
                                    </div>
                                    <div className="px-3 py-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-full text-xs font-semibold flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                        <div className="w-2 h-2 rounded-full bg-amber-500"></div> {t('reserved') || 'Reservada'}
                                    </div>
                                </div>
                            </div>

                            <div className={`grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 ${isRinging ? 'animate-pulse' : ''}`}>
                                {tables.map(table => {
                                    const isMyTable = table.assignedWaiter === user?.name;

                                    const statusConfig = {
                                        free: { border: 'border-green-500', text: 'text-green-600', bg: 'bg-green-50', badge: 'bg-green-100 text-green-700' },
                                        occupied: { border: 'border-red-500', text: 'text-red-600', bg: 'bg-red-50', badge: 'bg-red-100 text-red-700' },
                                        cleaning: { border: 'border-blue-500', text: 'text-blue-600', bg: 'bg-blue-50', badge: 'bg-blue-100 text-blue-700' },
                                        reserved: { border: 'border-amber-500', text: 'text-amber-600', bg: 'bg-amber-50', badge: 'bg-amber-100 text-amber-700' }
                                    };
                                    const config = statusConfig[table.status] || statusConfig.free;

                                    const StatusIcon =
                                        table.status === 'occupied' ? Users :
                                            table.status === 'reserved' ? Clock :
                                                table.status === 'cleaning' ? Coffee :
                                                    CheckCircle;

                                    return (
                                        <div
                                            key={table._id}
                                            onClick={() => handleTableClick(table)}
                                            className="relative p-5 rounded-xl bg-white dark:bg-gray-800 cursor-pointer transition-all duration-200 hover:shadow-2xl hover:-translate-y-2 shadow-lg dark:shadow-gray-900/50"
                                            style={{
                                                boxShadow: '0 6px 10px -2px rgba(0, 0, 0, 0.2), 0 4px 6px -1px rgba(0, 0, 0, 0.15)'
                                            }}
                                        >
                                            {isMyTable && (
                                                <div className="absolute top-3 right-3 p-1 bg-indigo-600 text-white rounded-full shadow-sm z-10" title={t('assigned_you') || 'Atribuída a você'}>
                                                    <User size={10} fill="currentColor" />
                                                </div>
                                            )}

                                            {/* Header: Table Number */}
                                            <div className="mb-3">
                                                <span className={`font-black text-3xl ${table.status === 'free' ? 'text-green-600 dark:text-green-500' :
                                                    table.status === 'occupied' ? 'text-red-600 dark:text-red-500' :
                                                        table.status === 'reserved' ? 'text-purple-600 dark:text-purple-500' :
                                                            table.status === 'cleaning' ? 'text-blue-600 dark:text-blue-500' :
                                                                'text-gray-600 dark:text-gray-500'
                                                    }`}>
                                                    {table.number}
                                                </span>
                                            </div>

                                            {/* Status Label */}
                                            <div className="mb-4">
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                                                    {t(table.status) || table.status}
                                                </p>
                                                {table.activeOrders > 0 && (
                                                    <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
                                                        {table.activeOrders} {t('active_orders') || 'pedidos'}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Footer: Icon and Capacity */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1 text-gray-400 dark:text-gray-500">
                                                    <Users size={14} />
                                                    <span className="text-xs font-semibold">{table.capacity || 4}</span>
                                                </div>

                                                {/* Status Icon Circle */}
                                                <div
                                                    className={`p-2.5 rounded-full ${config.badge}`}
                                                    style={{
                                                        backgroundColor: `${config.border.replace('border-', '#').replace('500', '')}15`
                                                    }}
                                                >
                                                    <StatusIcon size={18} strokeWidth={2.5} className={config.text} />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {tables.length === 0 && (
                                    <div className="col-span-full py-12 text-center text-gray-400">
                                        <MapPin className="mx-auto h-12 w-12 mb-3 opacity-20" />
                                        <p>{t('no_tables') || 'Nenhuma mesa cadastrada'}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table Management Panel */}
                {showManagementPanel && selectedTable && (
                    <TableManagementPanel
                        table={selectedTable}
                        onClose={handleClosePanel}
                    />
                )}
            </div>
        </div>
    );
}
