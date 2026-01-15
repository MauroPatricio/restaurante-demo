import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { tableAPI, orderAPI, waiterCallAPI } from '../services/api';
import {
    User, Users, Bell, CheckCircle, Clock, MapPin,
    UtensilsCrossed, AlertTriangle, Coffee, Loader2, TrendingUp, LayoutGrid, Timer, MessageSquare
} from 'lucide-react';

import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale/pt';
import LoadingSpinner from '../components/LoadingSpinner';
import { useTranslation } from 'react-i18next';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { tableAPI, orderAPI, waiterCallAPI } from '../services/api';
import {
    User, Users, Bell, CheckCircle, Clock, MapPin,
    UtensilsCrossed, AlertTriangle, Coffee, Loader2, TrendingUp, LayoutGrid, Timer, MessageSquare
} from 'lucide-react';

import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale/pt';
import LoadingSpinner from '../components/LoadingSpinner';
import { useTranslation } from 'react-i18next';
import '../styles/PremiumTheme.css';

const KpiCard = ({ title, value, icon: Icon, color, subValue, pulse }) => (
    <div className="premium-card" style={{
        justifyContent: 'space-between',
        minHeight: '160px',
        flex: 1,
        minWidth: '240px'
    }}>
        <div>
            <div className="text-premium-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '12px', fontSize: '11px' }}>
                {title}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span className="text-premium-header" style={{ fontSize: '36px' }}>
                    {value}
                </span>
                {subValue && (
                    <span className="text-premium-muted" style={{ fontSize: '14px' }}>
                        {subValue}
                    </span>
                )}
            </div>
        </div>
        <div style={{
            position: 'absolute',
            top: '24px',
            right: '24px',
            width: '48px',
            height: '48px',
            borderRadius: '16px',
            background: `${color}12`,
            color: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            <Icon size={24} />
            {pulse && (
                <span className="premium-pulse-soft" style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    width: '12px',
                    height: '12px',
                    background: color,
                    borderRadius: '50%',
                    border: '2px solid white',
                }} />
            )}
        </div>
    </div>
);

export default function WaiterDashboard() {
    const { user } = useAuth();
    const { t } = useTranslation();
    const { activeCalls, removeCall, socket } = useSocket();
    const [tables, setTables] = useState([]);
    const [readyOrders, setReadyOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    const restaurantId = user?.restaurant?._id || user?.restaurant?.id || localStorage.getItem('restaurantId');

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
            const { data } = await tableAPI.getAll(restaurantId);
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
            const { data } = await orderAPI.getAll(restaurantId, { status: 'ready' });
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

    if (loading) return <LoadingSpinner message={t('loading_waiter') || "Carregando Área do Garçom..."} />;

    if (!restaurantId) {
        return (
            <div className="p-8 text-center text-slate-500">
                <AlertTriangle className="mx-auto h-12 w-12 mb-4 text-amber-400" />
                <h2 className="text-xl font-bold text-slate-700">{t('restaurant_not_found') || "Restaurante não identificado"}</h2>
                <p>{t('login_again') || "Por favor, faça login novamente ou selecione um restaurante."}</p>
            </div>
        );
    }

    const freeTables = tables.filter(t => t.status === 'free').length;
    const occupiedTables = tables.filter(t => t.status === 'occupied').length;
    const myTables = tables.filter(t => t.assignedWaiter === user?.name).length;

    return (
        <div style={{ padding: '40px', maxWidth: '1600px', margin: '0 auto', minHeight: '100vh' }}>

            {/* Header */}
            <div style={{ marginBottom: '48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className="text-premium-header" style={{ fontSize: '48px', margin: 0 }}>
                        {t('waiter_area') || 'Área do Garçom'}
                    </h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 0 4px rgba(16, 185, 129, 0.1)' }} />
                        <p className="text-premium-muted" style={{ margin: 0 }}>
                            {t('manage_tables_desc') || 'Gerencie mesas e pedidos em tempo real'} • <span style={{ color: '#1e293b' }}>{user?.name}</span>
                        </p>
                    </div>
                </div>
                <div className="premium-badge badge-success" style={{ fontSize: '14px', padding: '10px 24px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />
                    {t('online') || 'Online'}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="premium-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', marginBottom: '48px' }}>
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
                <KpiCard
                    title={t('table_status') || 'Status Mesas'}
                    value={`${freeTables} / ${occupiedTables}`}
                    icon={UtensilsCrossed}
                    color="#3b82f6"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column: Alerts & Ready Orders */}
                <div className="space-y-8 lg:col-span-1">

                    {/* Active Alerts Section */}
                    <div className="premium-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '20px' }}>
                            <h2 className="text-premium-header" style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ padding: '8px', background: '#fef2f2', borderRadius: '12px', color: '#ef4444' }}>
                                    <Bell size={18} />
                                </div>
                                {t('table_calls') || 'Chamadas'}
                            </h2>
                            {activeCalls.length > 0 && <span className="premium-badge badge-error">{activeCalls.length}</span>}
                        </div>

                        {activeCalls.length === 0 ? (
                            <div className="text-center py-12">
                                <Bell className="mx-auto h-12 w-12 mb-4 text-slate-200" />
                                <p className="text-premium-muted" style={{ fontSize: '14px' }}>{t('no_active_calls') || 'Nenhuma chamada ativa'}</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {activeCalls.map(call => (
                                    <div key={call.callId} className="premium-card glass-surface" style={{
                                        padding: '20px',
                                        borderLeft: '4px solid #ef4444',
                                        borderRadius: '16px'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div>
                                                <div className="text-premium-header" style={{ fontSize: '20px', color: '#ef4444' }}>
                                                    {t('table') || 'Mesa'} {call.tableNumber || '?'}
                                                </div>
                                                <div className="text-premium-muted" style={{ marginTop: '4px', fontSize: '13px' }}>
                                                    {call.customerName || 'Cliente'} • {call.type === 'payment' || call.type === 'payment_request' ? 'Pagamento' : 'Serviço'}
                                                </div>
                                            </div>
                                            <div className="text-premium-muted" style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Clock size={12} /> {formatDistanceToNow(new Date(call.createdAt || call.timestamp), { addSuffix: true, locale: pt })}
                                            </div>
                                        </div>
                                        <button
                                            onClick={async () => {
                                                try {
                                                    await waiterCallAPI.resolve(call.callId);
                                                } catch (err) {
                                                    console.error(err);
                                                    alert('Falha ao atender mesa');
                                                }
                                            }}
                                            style={{
                                                width: '100%',
                                                marginTop: '16px',
                                                padding: '12px',
                                                background: '#ef4444',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '12px',
                                                fontWeight: '800',
                                                fontSize: '13px',
                                                cursor: 'pointer',
                                                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)'
                                            }}
                                        >
                                            {t('attend') || 'Atender Mesa'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Ready Orders Section */}
                    <div className="premium-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '20px' }}>
                            <h2 className="text-premium-header" style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ padding: '8px', background: '#ecfdf5', borderRadius: '12px', color: '#10b981' }}>
                                    <CheckCircle size={18} />
                                </div>
                                {t('ready_for_pickup') || 'Prontos'}
                            </h2>
                            {readyOrders.length > 0 && <span className="premium-badge badge-success">{readyOrders.length}</span>}
                        </div>

                        {readyOrders.length === 0 ? (
                            <div className="text-center py-12">
                                <UtensilsCrossed className="mx-auto h-12 w-12 mb-4 text-slate-200" />
                                <p className="text-premium-muted" style={{ fontSize: '14px' }}>{t('no_ready_orders') || 'Nenhum pedido pronto'}</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {readyOrders.map(order => (
                                    <div key={order._id} className="premium-card" style={{
                                        padding: '24px',
                                        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                                        border: '1px solid #e2e8f0'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                            <span className="text-premium-header" style={{ fontSize: '20px' }}>
                                                {t('table') || 'Mesa'} {order.table?.number || '?'}
                                            </span>
                                            <span className="premium-badge badge-info" style={{ fontFamily: 'monospace' }}>
                                                #{order.orderNumber || order._id.slice(-4)}
                                            </span>
                                        </div>
                                        <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', marginBottom: '20px' }}>
                                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                                {order.items?.map((item, idx) => (
                                                    <li key={idx} style={{ display: 'flex', gap: '12px', marginBottom: '8px', fontSize: '14px' }}>
                                                        <span className="text-premium-header" style={{ color: '#6366f1', minWidth: '24px' }}>{item.qty}x</span>
                                                        <span className="text-premium-muted" style={{ color: '#1e293b' }}>{item.item?.name || item.name}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                        <button
                                            onClick={() => markOrderServed(order._id)}
                                            style={{
                                                width: '100%',
                                                padding: '14px',
                                                background: '#10b981',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '14px',
                                                fontWeight: '800',
                                                fontSize: '14px',
                                                cursor: 'pointer',
                                                boxShadow: '0 8px 20px -6px rgba(16, 185, 129, 0.4)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px'
                                            }}
                                        >
                                            <CheckCircle size={18} /> {t('mark_delivered') || 'Marcar como Entregue'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Tables Status Grid */}
                <div className="lg:col-span-2">
                    <div className="premium-card" style={{ height: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', borderBottom: '1px solid #f1f5f9', paddingBottom: '24px' }}>
                            <h2 className="text-premium-header" style={{ fontSize: '24px' }}>{t('floor_map') || 'Mapa do Salão'}</h2>
                            <div className="flex gap-4">
                                <div className="premium-badge badge-success">
                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} /> {t('free') || 'Livre'}
                                </div>
                                <div className="premium-badge badge-error">
                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }} /> {t('occupied') || 'Ocupada'}
                                </div>
                                <div className="premium-badge badge-info">
                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6' }} /> {t('cleaning') || 'Limpeza'}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {tables.map(table => {
                                const isMyTable = table.assignedWaiter === user?.name;
                                const statusConfig = {
                                    free: { bg: 'white', border: '#e2e8f0', accent: '#10b981', text: '#065f46' },
                                    occupied: { bg: 'white', border: '#fee2e2', accent: '#ef4444', text: '#991b1b' },
                                    cleaning: { bg: 'white', border: '#dbeafe', accent: '#3b82f6', text: '#1e40af' }
                                };
                                const config = statusConfig[table.status] || statusConfig.free;

                                return (
                                    <div
                                        key={table._id}
                                        className="premium-card"
                                        style={{
                                            borderTop: `6px solid ${config.accent}`,
                                            minHeight: '160px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between',
                                            padding: '28px'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div>
                                                <div className="text-premium-header" style={{ fontSize: '28px' }}>
                                                    {t('table')} {table.number}
                                                </div>
                                                <div className="text-premium-muted" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                                                    <Users size={14} /> {table.capacity} {t('places') || 'lugares'}
                                                </div>
                                            </div>
                                            {isMyTable && (
                                                <div style={{
                                                    background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
                                                    padding: '10px',
                                                    borderRadius: '12px',
                                                    color: 'white',
                                                    boxShadow: '0 8px 16px -4px rgba(99, 102, 241, 0.4)'
                                                }} title={t('assigned_you') || 'Atribuída a você'}>
                                                    <User size={18} />
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
                                            <span style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.5 }}>
                                                {table.location || t('main_hall') || 'Salão Principal'}
                                            </span>
                                            <div style={{ fontSize: '11px', fontWeight: '800', padding: '4px 10px', borderRadius: '6px', background: `${config.accent}10`, color: config.accent }}>
                                                {t(table.status) || table.status}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {tables.length === 0 && (
                                <div className="col-span-full py-16 text-center text-slate-400">
                                    <UtensilsCrossed className="mx-auto h-16 w-16 mb-4 opacity-20" />
                                    <p className="text-lg font-medium">{t('no_tables') || 'Nenhuma mesa cadastrada'}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes pulse {
                    0%, 100% {
                        opacity: 1;
                    }
                    50% {
                        opacity: 0.8;
                    }
                }
                .table-location {
                    opacity: 0 !important;
                }
            `}</style>
        </div>
    );
}
