import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { tableAPI, orderAPI } from '../services/api';
import {
    User, Users, Bell, CheckCircle, Clock, MapPin,
    UtensilsCrossed, AlertTriangle, Coffee, Loader2, TrendingUp
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale/pt';
import LoadingSpinner from '../components/LoadingSpinner';
import { useTranslation } from 'react-i18next';

// Modern Card Styles
const cardStyle = {
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
    border: '1px solid rgba(0,0,0,0.02)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
};

const statCardStyle = {
    ...cardStyle,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    cursor: 'pointer',
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

export default function WaiterDashboard() {
    const { user } = useAuth();
    const { t } = useTranslation();
    const { activeCalls, removeCall, socket } = useSocket(); // Use removeCall for dismissing calls
    const [tables, setTables] = useState([]);
    const [readyOrders, setReadyOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    // Robust ID retrieval
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

    // Listen for Order Updates to refresh Ready list
    useEffect(() => {
        if (!socket) return;

        const handleOrderUpdate = (data) => {
            if (data.status === 'ready' || data.status === 'completed') {
                fetchReadyOrders();
            }
        };

        socket.on('order-updated', handleOrderUpdate);
        return () => {
            socket.off('order-updated', handleOrderUpdate);
        };
    }, [socket]);

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

    // Calculate stats
    const freeTables = tables.filter(t => t.status === 'free').length;
    const occupiedTables = tables.filter(t => t.status === 'occupied').length;
    const myTables = tables.filter(t => t.assignedWaiter === user?.name).length;

    return (
        <div style={{ padding: '24px', maxWidth: '100vw', minHeight: 'calc(100vh - 64px)', backgroundColor: '#f8fafc' }}>

            {/* Header */}
            <div className="dashboard-header-responsive" style={{ marginBottom: '32px' }}>
                <div>
                    <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                        {t('waiter_area') || 'Área do Garçom'}
                    </h1>
                    <p style={{ color: '#64748b', marginTop: '8px', fontSize: '16px' }}>
                        {t('manage_tables_desc') || 'Gerencie mesas e pedidos em tempo real'} • {user?.name}
                    </p>
                </div>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: '#ecfdf5', padding: '10px 20px', borderRadius: '50px',
                    border: '1px solid #d1fae5', color: '#047857', fontSize: '14px', fontWeight: '600'
                }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 0 4px rgba(16, 185, 129, 0.2)' }}></div>
                    {t('online') || 'Online'}
                </div>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'flex', gap: '24px', marginBottom: '32px', flexWrap: 'wrap', width: '100%' }}>
                <div style={statCardStyle} onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.1)';
                }} onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.05)';
                }}>
                    <div>
                        <p style={{ color: '#64748b', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {t('active_alerts') || 'Chamadas Ativas'}
                        </p>
                        <h3 style={{ fontSize: '32px', fontWeight: '800', color: '#1e293b', margin: '8px 0 0 0' }}>
                            {activeCalls.length}
                        </h3>
                    </div>
                    <div style={iconBoxStyle('#ef4444', '#fef2f2')}>
                        <Bell size={24} strokeWidth={2.5} />
                    </div>
                </div>

                <div style={statCardStyle} onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.1)';
                }} onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.05)';
                }}>
                    <div>
                        <p style={{ color: '#64748b', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {t('ready_orders') || 'Pedidos Prontos'}
                        </p>
                        <h3 style={{ fontSize: '32px', fontWeight: '800', color: '#1e293b', margin: '8px 0 0 0' }}>
                            {readyOrders.length}
                        </h3>
                    </div>
                    <div style={iconBoxStyle('#10b981', '#ecfdf5')}>
                        <CheckCircle size={24} strokeWidth={2.5} />
                    </div>
                </div>

                <div style={statCardStyle} onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.1)';
                }} onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.05)';
                }}>
                    <div>
                        <p style={{ color: '#64748b', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {t('my_tables') || 'Minhas Mesas'}
                        </p>
                        <h3 style={{ fontSize: '32px', fontWeight: '800', color: '#1e293b', margin: '8px 0 0 0' }}>
                            {myTables}
                        </h3>
                    </div>
                    <div style={iconBoxStyle('#8b5cf6', '#f5f3ff')}>
                        <User size={24} strokeWidth={2.5} />
                    </div>
                </div>

                <div style={statCardStyle} onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.1)';
                }} onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.05)';
                }}>
                    <div>
                        <p style={{ color: '#64748b', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {t('table_status') || 'Status Mesas'}
                        </p>
                        <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', margin: '8px 0 0 0' }}>
                            <span style={{ color: '#10b981' }}>{freeTables}</span> / <span style={{ color: '#ef4444' }}>{occupiedTables}</span>
                        </h3>
                    </div>
                    <div style={iconBoxStyle('#3b82f6', '#eff6ff')}>
                        <UtensilsCrossed size={24} strokeWidth={2.5} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column: Alerts & Ready Orders */}
                <div className="space-y-8 lg:col-span-1">

                    {/* Active Alerts Section */}
                    <div style={cardStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Bell className="text-red-500" size={20} /> {t('table_calls') || 'Chamadas'}
                            </h2>
                            {activeCalls.length > 0 && <span className="bg-red-100 text-red-600 text-xs px-3 py-1 rounded-full font-bold">{activeCalls.length}</span>}
                        </div>

                        {activeCalls.length === 0 ? (
                            <div className="text-center py-12 text-slate-400">
                                <Bell className="mx-auto h-12 w-12 mb-3 opacity-20" />
                                <p className="text-sm font-medium">{t('no_active_calls') || 'Nenhuma chamada ativa'}</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {activeCalls.map(call => (
                                    <div key={call.callId} style={{
                                        padding: '16px',
                                        background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                                        border: '2px solid #fecaca',
                                        borderRadius: '12px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                                    }}>
                                        <div>
                                            <div className="font-bold text-red-700 text-lg flex items-center gap-2">
                                                <Coffee size={18} />
                                                {t('table') || 'Mesa'} {call.tableNumber || '?'}
                                            </div>
                                            <div className="text-sm text-red-600 font-medium mt-1">{call.type === 'payment' ? 'Solicitou Fechamento' : 'Chamou Garçom'}</div>
                                            <div className="text-xs text-red-400 mt-2 flex items-center gap-1">
                                                <Clock size={12} /> {formatDistanceToNow(new Date(call.timestamp), { addSuffix: true, locale: pt })}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeCall(call.callId)}
                                            className="px-4 py-2 bg-white text-red-600 text-xs font-bold rounded-lg shadow-sm hover:bg-red-50 transition-all border-2 border-red-200"
                                        >
                                            {t('dismiss') || 'Dispensar'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Ready Orders Section */}
                    <div style={cardStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <CheckCircle className="text-green-500" size={20} /> {t('ready_for_pickup') || 'Prontos'}
                            </h2>
                            {readyOrders.length > 0 && <span className="bg-green-100 text-green-600 text-xs px-3 py-1 rounded-full font-bold">{readyOrders.length}</span>}
                        </div>

                        {readyOrders.length === 0 ? (
                            <div className="text-center py-12 text-slate-400">
                                <UtensilsCrossed className="mx-auto h-12 w-12 mb-3 opacity-20" />
                                <p className="text-sm font-medium">{t('no_ready_orders') || 'Nenhum pedido pronto'}</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {readyOrders.map(order => (
                                    <div key={order._id} style={{
                                        padding: '20px',
                                        background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                                        border: '2px solid #a7f3d0',
                                        borderRadius: '12px',
                                        transition: 'all 0.3s ease'
                                    }}>
                                        <div className="flex justify-between items-start mb-3">
                                            <span className="font-bold text-green-800 text-xl flex items-center gap-2">
                                                <Coffee size={20} />
                                                {t('table') || 'Mesa'} {order.table?.number || '?'}
                                            </span>
                                            <span className="text-xs font-mono bg-white px-3 py-1.5 rounded-full text-green-600 border-2 border-green-200 shadow-sm">
                                                #{order.orderNumber || order._id.slice(-4)}
                                            </span>
                                        </div>
                                        <ul className="text-sm text-slate-700 mb-4 space-y-2 bg-white/70 p-3 rounded-lg">
                                            {order.items?.map((item, idx) => (
                                                <li key={idx} className="flex gap-2 items-start">
                                                    <span className="font-bold text-green-700 min-w-[24px]">{item.qty}x</span>
                                                    <span className="font-medium">{item.item?.name || item.name}</span>
                                                </li>
                                            ))}
                                        </ul>
                                        <button
                                            onClick={() => markOrderServed(order._id)}
                                            className="w-full py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2"
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
                    <div style={{ ...cardStyle, height: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>{t('floor_map') || 'Mapa do Salão'}</h2>
                            <div className="flex gap-3 text-xs font-medium">
                                <span className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full border border-green-200">
                                    <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div> {t('free') || 'Livre'}
                                </span>
                                <span className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 rounded-full border border-red-200">
                                    <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div> {t('occupied') || 'Ocupada'}
                                </span>
                                <span className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div> {t('cleaning') || 'Limpeza'}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {tables.map(table => {
                                const isMyTable = table.assignedWaiter === user?.name;
                                const statusConfig = {
                                    free: { bg: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)', border: '#a7f3d0', text: '#065f46', shadow: '0 4px 15px rgba(16, 185, 129, 0.2)' },
                                    occupied: { bg: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)', border: '#fca5a5', text: '#991b1b', shadow: '0 4px 15px rgba(239, 68, 68, 0.2)' },
                                    cleaning: { bg: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', border: '#93c5fd', text: '#1e40af', shadow: '0 4px 15px rgba(59, 130, 246, 0.2)' }
                                };
                                const config = statusConfig[table.status] || statusConfig.free;

                                return (
                                    <div
                                        key={table._id}
                                        style={{
                                            padding: '20px',
                                            borderRadius: '12px',
                                            border: `2px solid ${config.border}`,
                                            background: config.bg,
                                            color: config.text,
                                            position: 'relative',
                                            cursor: 'pointer',
                                            transition: 'all 0.3s ease',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'flex-start',
                                            justifyContent: 'space-between',
                                            minHeight: '140px',
                                            boxShadow: config.shadow
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = 'translateY(-8px) scale(1.05)';
                                            e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.15)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                            e.currentTarget.style.boxShadow = config.shadow;
                                        }}
                                    >
                                        <div className="text-2xl font-bold mb-2" style={{ color: '#000' }}>
                                            {t('table')} {table.number}
                                        </div>

                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            fontSize: '13px',
                                            fontWeight: '600',
                                            opacity: 0.8,
                                            background: 'rgba(255,255,255,0.7)',
                                            padding: '6px 12px',
                                            borderRadius: '20px'
                                        }}>
                                            <Users size={14} /> {table.capacity} {t('places') || 'lugares'}
                                        </div>

                                        <div className="mt-3 text-xs uppercase tracking-widest font-bold opacity-70">
                                            Estado: {t(table.status) || table.status}
                                        </div>

                                        {isMyTable && (
                                            <div style={{
                                                position: 'absolute',
                                                top: '12px',
                                                right: '12px',
                                                background: 'linear-gradient(135deg, #818cf8 0%, #6366f1 100%)',
                                                padding: '8px',
                                                borderRadius: '50%',
                                                color: 'white',
                                                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)'
                                            }} title={t('assigned_you') || 'Atribuída a você'}>
                                                <User size={16} />
                                            </div>
                                        )}

                                        <div style={{
                                            position: 'absolute',
                                            bottom: '12px',
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            fontSize: '10px',
                                            fontWeight: '600',
                                            color: config.text,
                                            opacity: 0.8,
                                            transition: 'opacity 0.3s ease'
                                        }} className="table-location">
                                            {table.location || t('main_hall') || 'Salão Principal'}
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
