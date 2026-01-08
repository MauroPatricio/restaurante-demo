
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { orderAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { useSound } from '../hooks/useSound';
import { Clock, CheckCircle, AlertCircle, ChefHat, TrendingUp, Users, Utensils, Volume2, VolumeX, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import LoadingSpinner from '../components/LoadingSpinner';

// Modern styles matching Dashboard.jsx
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
    flex: 1,
    minWidth: '200px'
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

const Kitchen = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { socket, acknowledgeOrderAlert } = useSocket(); // Get socket and ack method
    const restaurantId = user?.restaurant?._id || user?.restaurant?.id || localStorage.getItem('restaurantId');

    const [orders, setOrders] = useState([]);
    const [cancelledOrders, setCancelledOrders] = useState([]); // Track cancelled orders temporarily
    const [loading, setLoading] = useState(true);
    const [audioEnabled, setAudioEnabled] = useState(false);

    // Use shared sound hook
    const { play: playOrderSound } = useSound('/sounds/bell.mp3');

    // Initial Fetch and Polling Fallback
    useEffect(() => {
        if (!restaurantId) {
            setLoading(false);
            return;
        }
        fetchOrders();
        // Keep polling as backup (every 30s)
        const interval = setInterval(fetchOrders, 30000);
        return () => clearInterval(interval);
    }, [restaurantId]);

    // Real-time Updates & Sound
    useEffect(() => {
        if (!socket || !restaurantId) return;

        const handleNewOrder = (data) => {
            console.log('Kitchen: New order received', data);
            fetchOrders();
            if (audioEnabled) {
                playOrderSound();
            }
        };

        const handleOrderUpdate = (data) => {
            console.log('Kitchen: Order updated', data);

            // Check if cancelled
            if (data.status === 'cancelled') {
                setCancelledOrders(prev => {
                    if (prev.find(o => o._id === data._id)) return prev;
                    return [...prev, { ...data, cancelledAt: Date.now() }];
                });

                // Remove from display after 10 seconds
                setTimeout(() => {
                    setCancelledOrders(prev => prev.filter(o => o._id !== data._id));
                }, 10000);
            }

            fetchOrders();
        };

        socket.on('order:new', handleNewOrder);
        socket.on('order-updated', handleOrderUpdate);

        return () => {
            socket.off('order:new', handleNewOrder);
            socket.off('order-updated', handleOrderUpdate);
        };
    }, [socket, restaurantId, audioEnabled, playOrderSound]);

    const fetchOrders = async () => {
        if (!restaurantId) return;
        try {
            const { data } = await orderAPI.getAll(restaurantId, { status: 'pending,preparing' });

            const ordersArray = Array.isArray(data?.orders) ? data.orders : (Array.isArray(data) ? data : []);

            setOrders(ordersArray.filter(o => ['pending', 'preparing'].includes(o.status)));
        } catch (error) {
            console.error('Failed to fetch kitchen orders:', error);
            setOrders([]);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (orderId, newStatus) => {
        try {
            await orderAPI.updateStatus(orderId, newStatus);
            // Acknowledge the alert for this order when status changes
            acknowledgeOrderAlert(orderId);
            fetchOrders();
        } catch (error) {
            console.error('Failed to update order status:', error);
        }
    };

    if (loading) return <LoadingSpinner message="Carregando Cozinha..." />;

    if (!restaurantId) {
        return (
            <div className="p-8 text-center text-slate-500">
                <AlertCircle className="mx-auto h-12 w-12 mb-4 text-red-400" />
                <h2 className="text-xl font-bold text-slate-700">Restaurante não selecionado</h2>
                <p>Por favor, selecione um restaurante para ver os pedidos.</p>
            </div>
        );
    }

    // Calculate stats
    const pendingOrders = orders.filter(o => o.status === 'pending');
    const preparingOrders = orders.filter(o => o.status === 'preparing');
    const totalItems = orders.reduce((sum, order) => sum + (order.items?.length || 0), 0);

    // Calculate average wait time for pending orders
    const avgWaitTime = pendingOrders.length > 0
        ? Math.floor(pendingOrders.reduce((sum, order) => {
            return sum + (Date.now() - new Date(order.createdAt).getTime());
        }, 0) / pendingOrders.length / 60000)
        : 0;

    const columns = {
        pending: {
            title: t('pending') || 'Pending',
            icon: AlertCircle,
            color: '#f59e0b',
            bg: '#fffbeb',
            borderColor: '#fef3c7'
        },
        preparing: {
            title: t('preparing') || 'Preparing',
            icon: ChefHat,
            color: '#3b82f6',
            bg: '#eff6ff',
            borderColor: '#dbeafe'
        }
    };

    return (
        <div style={{ padding: '24px', maxWidth: '100vw', minHeight: 'calc(100vh - 64px)', backgroundColor: '#f8fafc' }}>

            {/* Header */}
            <div className="dashboard-header-responsive" style={{ marginBottom: '32px' }}>
                <div>
                    <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                        {t('kitchen_display') || 'Kitchen Display'}
                    </h1>
                    <p style={{ color: '#64748b', marginTop: '8px', fontSize: '16px' }}>
                        {t('live_kitchen_desc') || 'Real-time order management'} • {new Date().toLocaleDateString()}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <button
                        onClick={() => setAudioEnabled(!audioEnabled)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            background: audioEnabled ? '#dcfce7' : '#fee2e2',
                            padding: '10px 20px', borderRadius: '50px',
                            border: `1px solid ${audioEnabled ? '#bbf7d0' : '#fecaca'}`,
                            color: audioEnabled ? '#166534' : '#991b1b',
                            fontSize: '14px', fontWeight: '600', cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        {audioEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                        {audioEnabled ? 'Áudio Ligado' : 'Áudio Desligado'}
                    </button>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        background: '#ecfdf5', padding: '10px 20px', borderRadius: '50px',
                        border: '1px solid #d1fae5', color: '#047857', fontSize: '14px', fontWeight: '600'
                    }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 0 4px rgba(16, 185, 129, 0.2)' }}></div>
                        {t('live_updates') || 'Live Updates'} (10s)
                    </div>
                </div>
            </div>

            {/* Cancelled Orders Notification Banner */}
            {cancelledOrders.length > 0 && (
                <div style={{
                    marginBottom: '32px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '16px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                }}>
                    <h3 style={{ margin: 0, color: '#991b1b', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <XCircle size={20} /> Pedidos Cancelados Recentemente
                    </h3>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                        {cancelledOrders.map(order => (
                            <div key={order._id} style={{
                                background: 'white',
                                padding: '12px 16px',
                                borderRadius: '8px',
                                border: '1px solid #fecaca',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                textDecoration: 'line-through',
                                color: '#ef4444',
                                opacity: 0.8
                            }}>
                                <span style={{ fontWeight: 'bold' }}>#{order.orderNumber || order._id.substr(-4)}</span>
                                <span style={{ fontSize: '14px' }}>Mesa {order.tableNumber || '?'}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

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
                            {t('pending_orders') || 'Pending Orders'}
                        </p>
                        <h3 style={{ fontSize: '32px', fontWeight: '800', color: '#1e293b', margin: '8px 0 0 0' }}>
                            {pendingOrders.length}
                        </h3>
                    </div>
                    <div style={iconBoxStyle('#f59e0b', '#fffbeb')}>
                        <AlertCircle size={24} strokeWidth={2.5} />
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
                            {t('preparing') || 'Preparing'}
                        </p>
                        <h3 style={{ fontSize: '32px', fontWeight: '800', color: '#1e293b', margin: '8px 0 0 0' }}>
                            {preparingOrders.length}
                        </h3>
                    </div>
                    <div style={iconBoxStyle('#3b82f6', '#eff6ff')}>
                        <ChefHat size={24} strokeWidth={2.5} />
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
                            {t('total_items') || 'Total Items'}
                        </p>
                        <h3 style={{ fontSize: '32px', fontWeight: '800', color: '#1e293b', margin: '8px 0 0 0' }}>
                            {totalItems}
                        </h3>
                    </div>
                    <div style={iconBoxStyle('#10b981', '#ecfdf5')}>
                        <Utensils size={24} strokeWidth={2.5} />
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
                            {t('avg_wait') || 'Avg Wait Time'}
                        </p>
                        <h3 style={{ fontSize: '32px', fontWeight: '800', color: '#1e293b', margin: '8px 0 0 0' }}>
                            {avgWaitTime} <span style={{ fontSize: '18px', color: '#94a3b8', fontWeight: '600' }}>min</span>
                        </h3>
                    </div>
                    <div style={iconBoxStyle('#ef4444', '#fef2f2')}>
                        <Clock size={24} strokeWidth={2.5} />
                    </div>
                </div>
            </div>

            {/* Orders Columns */}
            <div style={{ display: 'flex', gap: '24px', alignItems: 'stretch' }}>
                {Object.entries(columns).map(([status, config]) => (
                    <div key={status} style={{
                        flex: 1,
                        ...cardStyle,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        minHeight: '600px'
                    }}>
                        {/* Column Header */}
                        <div style={{
                            padding: '20px',
                            borderBottom: '1px solid #f1f5f9',
                            background: config.bg,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderRadius: '16px 16px 0 0',
                            marginBottom: '16px'
                        }}>
                            <h2 style={{
                                fontSize: '18px',
                                fontWeight: '700',
                                color: config.color,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                margin: 0
                            }}>
                                <config.icon size={22} strokeWidth={2.5} />
                                {config.title}
                            </h2>
                            <span style={{
                                background: 'white',
                                padding: '6px 14px',
                                borderRadius: '20px',
                                fontSize: '14px',
                                fontWeight: '700',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                border: `2px solid ${config.borderColor}`,
                                color: config.color
                            }}>
                                {orders.filter(o => o.status === status).length}
                            </span>
                        </div>

                        {/* Orders List */}
                        <div style={{
                            flex: 1,
                            overflowY: 'auto',
                            padding: '0 20px 20px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px'
                        }}>
                            {orders.filter(o => o.status === status).map(order => (
                                <div key={order._id} style={{
                                    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                                    borderRadius: '12px',
                                    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                                    border: `2px solid ${config.borderColor}`,
                                    padding: '20px',
                                    transition: 'all 0.3s ease'
                                }} onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.1)';
                                }} onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.05)';
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'start',
                                        marginBottom: '16px',
                                        paddingBottom: '16px',
                                        borderBottom: '1px solid #f1f5f9'
                                    }}>
                                        <div>
                                            <div style={{
                                                fontWeight: '800',
                                                fontSize: '20px',
                                                color: '#1e293b',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px'
                                            }}>
                                                #{order.orderNumber || order._id.substr(-4)}
                                                <span style={{
                                                    fontSize: '12px',
                                                    fontWeight: '600',
                                                    padding: '4px 10px',
                                                    background: '#f1f5f9',
                                                    borderRadius: '6px',
                                                    color: '#64748b',
                                                    border: '1px solid #e2e8f0'
                                                }}>
                                                    Table {order.table?.number || '?'}
                                                </span>
                                            </div>
                                            <div style={{
                                                fontSize: '12px',
                                                color: '#94a3b8',
                                                marginTop: '4px',
                                                fontWeight: '500'
                                            }}>
                                                {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                        <KitchenTimer startTime={order.createdAt} />
                                    </div>

                                    {/* Items List */}
                                    <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {order.items?.map((item, idx) => (
                                            <div key={idx} style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'start',
                                                fontSize: '14px'
                                            }}>
                                                <div style={{
                                                    fontWeight: '600',
                                                    color: '#475569',
                                                    flex: 1,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px'
                                                }}>
                                                    <span style={{
                                                        fontWeight: '800',
                                                        background: config.bg,
                                                        color: config.color,
                                                        padding: '4px 8px',
                                                        borderRadius: '6px',
                                                        fontSize: '12px',
                                                        minWidth: '32px',
                                                        textAlign: 'center',
                                                        border: `1px solid ${config.borderColor}`
                                                    }}>
                                                        {item.quantity}x
                                                    </span>
                                                    {item.name || "Item Name"}
                                                </div>
                                                {item.notes && (
                                                    <div style={{
                                                        fontSize: '11px',
                                                        color: '#f59e0b',
                                                        background: '#fffbeb',
                                                        padding: '4px 8px',
                                                        borderRadius: '6px',
                                                        border: '1px solid #fef3c7',
                                                        maxWidth: '50%',
                                                        fontWeight: '600'
                                                    }}>
                                                        {item.notes}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Actions */}
                                    <div>
                                        {status === 'pending' && (
                                            <>
                                                <button
                                                    onClick={() => updateStatus(order._id, 'preparing')}
                                                    style={{
                                                        width: '100%',
                                                        padding: '14px',
                                                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '10px',
                                                        fontWeight: '700',
                                                        fontSize: '14px',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.3s ease',
                                                        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '8px'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.4)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.transform = 'translateY(0)';
                                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                                                    }}
                                                >
                                                    <ChefHat size={18} /> Start Cooking
                                                </button>
                                                <button
                                                    onClick={() => updateStatus(order._id, 'cancelled')}
                                                    style={{
                                                        width: '100%',
                                                        marginTop: '10px',
                                                        padding: '10px',
                                                        background: '#fee2e2',
                                                        color: '#dc2626',
                                                        border: 'none',
                                                        borderRadius: '10px',
                                                        fontWeight: '700',
                                                        fontSize: '14px',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.3s ease',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '8px'
                                                    }}
                                                >
                                                    <XCircle size={18} /> Cancel Order
                                                </button>
                                            </>
                                        )}
                                        {status === 'preparing' && (
                                            <button
                                                onClick={() => updateStatus(order._id, 'ready')}
                                                style={{
                                                    width: '100%',
                                                    padding: '14px',
                                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '10px',
                                                    fontWeight: '700',
                                                    fontSize: '14px',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.3s ease',
                                                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '8px'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.4)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.transform = 'translateY(0)';
                                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                                                }}
                                            >
                                                <CheckCircle size={18} /> Mark Ready
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {orders.filter(o => o.status === status).length === 0 && (
                                <div style={{
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#cbd5e1',
                                    padding: '60px 20px'
                                }}>
                                    <div style={{
                                        padding: '20px',
                                        background: '#f8fafc',
                                        borderRadius: '50%',
                                        marginBottom: '16px'
                                    }}>
                                        <config.icon size={40} className="text-slate-300" />
                                    </div>
                                    <p style={{ fontWeight: '600', color: '#94a3b8', fontSize: '14px' }}>
                                        No orders in {config.title}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const KitchenTimer = ({ startTime }) => {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        const start = new Date(startTime).getTime();
        const interval = setInterval(() => {
            setElapsed(Date.now() - start);
        }, 1000);
        return () => clearInterval(interval);
    }, [startTime]);

    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);

    let colorClass = { color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0' };
    if (minutes >= 15) colorClass = { color: '#f59e0b', bg: '#fffbeb', border: '#fef3c7' };
    if (minutes >= 25) colorClass = { color: '#ef4444', bg: '#fef2f2', border: '#fecaca' };

    return (
        <div style={{
            fontSize: '14px',
            fontFamily: 'monospace',
            fontWeight: '700',
            padding: '6px 12px',
            borderRadius: '8px',
            border: `2px solid ${colorClass.border}`,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: colorClass.color,
            background: colorClass.bg,
            animation: minutes >= 15 ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none'
        }}>
            <Clock size={14} />
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>
    );
};

export default Kitchen;
