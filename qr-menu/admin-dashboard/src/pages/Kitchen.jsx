import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { orderAPI, restaurantAPI } from '../services/api';
import { analyticsAPI } from '../services/analytics';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { useSound } from '../hooks/useSound';
import { Clock, CheckCircle, AlertCircle, ChefHat, TrendingUp, Users, Utensils, Volume2, VolumeX, XCircle, Coffee, Wifi, WifiOff, Power } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import LoadingSpinner from '../components/LoadingSpinner';
import { SkeletonGrid } from '../components/Skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/PremiumTheme.css';

const Kitchen = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { socket } = useSocket();
    const restaurantId = user?.restaurant?._id || user?.restaurant?.id || localStorage.getItem('restaurantId');

    const [orders, setOrders] = useState([]);
    const [cancelledOrders, setCancelledOrders] = useState([]);
    const [newOrderIds, setNewOrderIds] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [audioEnabled, setAudioEnabled] = useState(false);
    const [isKitchenOpen, setIsKitchenOpen] = useState(true);
    const [togglingKitchen, setTogglingKitchen] = useState(false);
    const { connected } = useSocket();
    const refreshTimerRef = useRef(null);

    const [stats, setStats] = useState({
        realtime: {
            activeOrders: 0,
            pendingOrders: 0,
            completedOrders: 0,
            occupiedTables: 0,
            activeWaiterCalls: 0
        },
        operational: { avgPrepTime: 0 }
    });

    const { play: playOrderSound } = useSound('/sounds/bell.mp3');

    const columns = useMemo(() => ({
        pending: {
            title: t('pending') || 'Pending',
            icon: AlertCircle,
            color: '#f59e0b',
            bg: '#fffbeb',
            borderColor: '#fef3c7',
            items: orders.filter((o) => ['pending', 'confirmed'].includes(o.status))
        },
        preparing: {
            title: t('preparing') || 'Preparing',
            icon: ChefHat,
            color: '#3b82f6',
            bg: '#eff6ff',
            borderColor: '#dbeafe',
            items: orders.filter((o) => o.status === 'preparing')
        },
        ready: {
            title: t('ready') || 'Prontos',
            icon: CheckCircle,
            color: '#10b981',
            bg: '#ecfdf5',
            borderColor: '#d1fae5',
            items: orders.filter((o) => o.status === 'ready')
        }
    }), [orders, t]);

    useEffect(() => {
        if (!restaurantId) {
            setLoading(false);
            return;
        }
        fetchData();
        // Fetch kitchen open status from restaurant settings
        restaurantAPI.get(restaurantId).then(res => {
            const settings = res.data?.restaurant?.settings;
            setIsKitchenOpen(settings?.isKitchenOpen !== false);
        }).catch(() => {});
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, [restaurantId]);

    useEffect(() => {
        if (!socket || !restaurantId) return;

        const handleNewOrder = (data) => {


            setOrders(prev => {
                const exists = prev.find(o => o._id === data._id || o._id === data.orderId);
                if (exists) return prev;
                // Since data might be simplified payload, we might still need a full fetch OR trust the data
                // If data is simplified, we might want to fetch just that order.
                // For now, let's assume we might need a full fetch to be safe with model mapping
                return [data, ...prev];
            });

            // Highlight the new order
            const orderId = data._id || data.orderId;
            setNewOrderIds(prev => new Set([...prev, orderId]));
            setTimeout(() => {
                setNewOrderIds(prev => {
                    const next = new Set(prev);
                    next.delete(orderId);
                    return next;
                });
            }, 10000);

            if (audioEnabled) {
                playOrderSound();
            }

            // Update local stats: Increment pending count
            setStats(prev => ({
                ...prev,
                realtime: {
                    ...prev.realtime,
                    activeOrders: prev.realtime.activeOrders + 1,
                    pendingOrders: prev.realtime.pendingOrders + 1
                }
            }));
        };

        const handleRealtimeUpdate = (data) => {

            if (data.status === 'cancelled') {
                setCancelledOrders(prev => {
                    if (prev.find(o => o._id === data._id)) return prev;
                    return [...prev, { ...data, cancelledAt: Date.now() }];
                });
                setTimeout(() => {
                    setCancelledOrders(prev => prev.filter(o => o._id !== data._id));
                }, 10000);
                setOrders(prev => prev.filter(o => o._id !== data._id));
            } else if (['completed', 'served'].includes(data.status)) {
                setOrders(prev => prev.filter(o => o._id !== data._id));
                setStats(prev => ({
                    ...prev,
                    realtime: {
                        ...prev.realtime,
                        activeOrders: Math.max(0, prev.realtime.activeOrders - 1),
                        completedOrders: prev.realtime.completedOrders + 1
                    }
                }));
            } else {
            // Instant local update for visual responsiveness
            setOrders(prev => {
                const index = prev.findIndex(o => o._id === data._id);
                if (index === -1) {
                    if (['pending', 'confirmed', 'preparing', 'ready'].includes(data.status)) {
                        return [data, ...prev];
                    }
                    return prev;
                }
                const newOrders = [...prev];
                newOrders[index] = { ...newOrders[index], ...data };
                return newOrders;
            });
        }
    };

        const handleStatsUpdate = (data) => {

            if (data.avgPrepTime !== undefined) {
                setStats(prev => ({
                    ...prev,
                    operational: { ...prev.operational, avgPrepTime: data.avgPrepTime }
                }));
            }
        };

        socket.on('order:new', handleNewOrder);
        socket.on('room:order:new', handleNewOrder);
        socket.on('order-updated', handleRealtimeUpdate);
        socket.on('stats:updated', handleStatsUpdate);
        socket.on('waiter:call', fetchData);
        socket.on('waiter:call:acknowledged', fetchData);
        socket.on('waiter:call:resolved', fetchData);

        return () => {
            socket.off('order:new', handleNewOrder);
            socket.off('room:order:new', handleNewOrder);
            socket.off('order-updated', handleRealtimeUpdate);
            socket.off('stats:updated', handleStatsUpdate);
            socket.off('waiter:call', fetchData);
            socket.off('waiter:call:acknowledged', fetchData);
            socket.off('waiter:call:resolved', fetchData);
        };
    }, [socket, restaurantId, audioEnabled, playOrderSound]);

    const fetchData = async () => {
        if (!restaurantId) return;
        try {
            const today = new Date().toISOString().split('T')[0];

            const [ordersRes, statsRes] = await Promise.all([
                orderAPI.getAll(restaurantId, { status: 'pending,confirmed,preparing,ready' }),
                analyticsAPI.getRestaurantStats(restaurantId, { startDate: today, endDate: today })
            ]);

            const ordersArray = Array.isArray(ordersRes.data?.orders) ? ordersRes.data.orders : (Array.isArray(ordersRes.data) ? ordersRes.data : []);
            setOrders(ordersArray.filter(o => ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status)));

            setStats({
                realtime: statsRes.data.realtime || {},
                operational: statsRes.data.operational || { avgPrepTime: 0 }
            });

        } catch (error) {
            console.error('Failed to fetch kitchen data:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = useCallback(async (orderId, newStatus) => {
        // 1. Save previous state for rollback
        const previousOrders = [...orders];

        // 2. Optimistic update
        setOrders(prev => {
            if (['completed', 'served', 'cancelled'].includes(newStatus)) {
                return prev.filter(o => o._id !== orderId);
            }
            return prev.map(o => o._id === orderId ? { ...o, status: newStatus } : o);
        });

        try {
            await orderAPI.updateStatus(orderId, newStatus);
            // We don't call fetchData() here because we trust the optimistic update
            // and the socket event will eventually sync the full state if needed.
        } catch (error) {
            console.error('Failed to update order status:', error);
            // 3. Rollback on error
            setOrders(previousOrders);
        }
    }, [orders]);

    const handleToggleKitchen = async () => {
        if (!restaurantId || togglingKitchen) return;
        setTogglingKitchen(true);
        const newStatus = !isKitchenOpen;
        try {
            await restaurantAPI.update(restaurantId, { 'settings.isKitchenOpen': newStatus });
            setIsKitchenOpen(newStatus);
        } catch (error) {
            console.error('Failed to toggle kitchen status:', error);
        } finally {
            setTogglingKitchen(false);
        }
    };

    // Skeleton loading - maintains layout and visual context
    if (loading) return (
        <div style={{ padding: '40px', maxWidth: '100vw' }}>
            {/* Header skeleton */}
            <div style={{ marginBottom: '48px' }}>
                <div style={{ height: '60px', width: '350px', background: '#f1f5f9', borderRadius: '12px', marginBottom: '12px' }} className="animate-pulse"></div>
                <div style={{ height: '16px', width: '280px', background: '#f1f5f9', borderRadius: '8px' }} className="animate-pulse"></div>
            </div>
            {/* KPI Cards skeleton */}
            <SkeletonGrid items={5} columns={5} height="120px" gap="24px" />
        </div>
    );

    if (!restaurantId) {
        return (
            <div className="p-8 text-center text-slate-500">
                <AlertCircle className="mx-auto h-12 w-12 mb-4 text-red-400" />
                <h2 className="text-xl font-bold text-slate-700">Restaurante não selecionado</h2>
                <p>Por favor, selecione um restaurante para ver os pedidos.</p>
            </div>
        );
    }

    const { realtime, operational } = stats;

    return (
        <div style={{ padding: '40px', maxWidth: '100vw', minHeight: 'calc(100vh - 64px)' }}>

            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-12">
                <div>
                    <h1 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white leading-tight">
                        {t('kitchen_display') || 'Kitchen Display'}
                    </h1>
                    <div className="flex items-center gap-3 mt-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)] animate-pulse" />
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                            {t('live_kitchen_desc') || 'Real-time order management'} • {new Date().toLocaleDateString()}
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                    {/* Kitchen Status Toggle */}
                    <button
                        onClick={handleToggleKitchen}
                        disabled={togglingKitchen}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border-2 ${
                            isKitchenOpen
                                ? 'bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100'
                                : 'bg-rose-50 border-rose-100 text-rose-500 hover:bg-rose-100'
                        }`}
                        title={isKitchenOpen ? t('kitchen_close_label', 'Fechar Cozinha') : t('kitchen_open_label', 'Abrir Cozinha')}
                    >
                        <Power size={18} />
                        {togglingKitchen ? '...' : (isKitchenOpen ? t('kitchen_open_status', 'Cozinha Aberta') : t('kitchen_closed_status', 'Inactivo / Manutenção'))}
                    </button>
                    <button
                        onClick={() => setAudioEnabled(!audioEnabled)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border-2 ${audioEnabled ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-500'}`}
                    >
                        {audioEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                        {audioEnabled ? 'Áudio Ligado' : 'Áudio Desligado'}
                    </button>
                    <div className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest border-2 ${connected ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-500'}`}>
                        {connected ? (
                            <><Wifi size={18} /> {t('connected') || 'Conectado'}</>
                        ) : (
                            <><WifiOff size={18} /> {t('offline') || 'Offline'}</>
                        )}
                    </div>
                </div>
            </div>

            {/* Cancelled Banner */}
            {cancelledOrders.length > 0 && (
                <div className="premium-card badge-error" style={{ marginBottom: '32px', padding: '16px 24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h3 style={{ margin: 0, color: 'inherit', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <XCircle size={20} /> Pedidos Cancelados Recentemente
                    </h3>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                        {cancelledOrders.map(order => (
                            <div key={order._id} className="premium-badge badge-error glass-surface" style={{ padding: '8px 16px', textDecoration: 'line-through' }}>
                                <span style={{ fontWeight: 'bold' }}>#{order.orderNumber || order._id.substr(-4)}</span>
                                <span style={{ fontSize: '14px' }}>Mesa {order.tableNumber || '?'}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">

                <div className="premium-card">
                    <div className="text-premium-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px' }}>
                        {t('active_orders') || 'Active Orders'}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <span className="text-premium-header" style={{ fontSize: '32px' }}>{realtime.activeOrders || 0}</span>
                        <div style={{ padding: '10px', background: '#eff6ff', borderRadius: '12px', color: '#3b82f6' }}>
                            <Utensils size={24} />
                        </div>
                    </div>
                </div>

                <div className="premium-card">
                    <div className="text-premium-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px' }}>
                        {t('pending_orders') || 'Pending Orders'}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <span className="text-premium-header" style={{ fontSize: '32px' }}>{realtime.pendingOrders || 0}</span>
                        <div style={{ padding: '10px', background: '#fffbeb', borderRadius: '12px', color: '#f59e0b' }}>
                            <AlertCircle size={24} />
                        </div>
                    </div>
                </div>

                <div className="premium-card">
                    <div className="text-premium-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px' }}>
                        Feitos Hoje
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <span className="text-premium-header" style={{ fontSize: '32px', color: '#10b981' }}>{realtime.completedOrders || 0}</span>
                        <div style={{ padding: '10px', background: '#ecfdf5', borderRadius: '12px', color: '#10b981' }}>
                            <CheckCircle size={24} />
                        </div>
                    </div>
                </div>

                <div className="premium-card">
                    <div className="text-premium-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px' }}>
                        Chamadas Garçom
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <span className="text-premium-header" style={{ fontSize: '32px', color: (realtime.activeWaiterCalls > 0) ? '#ef4444' : '#94a3b8' }}>{realtime.activeWaiterCalls || 0}</span>
                        <div style={{ padding: '10px', background: '#fef2f2', borderRadius: '12px', color: '#ef4444' }}>
                            <Users size={24} />
                        </div>
                    </div>
                </div>

                <div className="premium-card">
                    <div className="text-premium-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px' }}>
                        Tempo Médio
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <span className="text-premium-header" style={{ fontSize: '32px' }}>
                            {Math.round(operational.avgPrepTime || 0)} <span style={{ fontSize: '16px', color: '#94a3b8' }}>min</span>
                        </span>
                        <div style={{ padding: '10px', background: '#fef2f2', borderRadius: '12px', color: '#ef4444' }}>
                            <Clock size={24} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Orders Columns */}
            <div className="flex flex-col lg:flex-row gap-8 items-stretch">
                {Object.entries(columns).map(([status, config]) => (
                    <div key={status} className="premium-card" style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        minHeight: '800px',
                        padding: 0,
                        background: '#f8fafc'
                    }}>
                        {/* Column Header */}
                        <div style={{
                            padding: '24px',
                            background: 'white',
                            borderBottom: '1px solid #f1f5f9',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '20px'
                        }}>
                            <h2 className="text-premium-header" style={{
                                fontSize: '20px',
                                color: config.color,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                margin: 0
                            }}>
                                <div style={{ padding: '8px', background: `${config.color}15`, borderRadius: '10px' }}>
                                    <config.icon size={20} strokeWidth={2.5} />
                                </div>
                                {config.title}
                            </h2>
                            <span className="premium-badge glass-surface" style={{ color: config.color, padding: '6px 16px', fontSize: '14px', fontWeight: '900' }}>
                                {config.items.length}
                            </span>
                        </div>

                        {/* Orders List */}
                        <div style={{
                            flex: 1,
                            overflowY: 'auto',
                            padding: '0 20px 20px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '20px'
                        }}>
                            <AnimatePresence mode="popLayout" initial={false}>
                                {config.items.map(order => (
                                    <motion.div
                                        layout
                                        key={order._id}
                                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                                        transition={{ 
                                            type: "spring",
                                            stiffness: 500,
                                            damping: 50,
                                            mass: 1
                                        }}
                                        className={`premium-card ${newOrderIds.has(order._id) ? 'premium-pulse-soft' : ''}`}
                                        style={{
                                            padding: '24px',
                                            borderLeft: `6px solid ${config.color}`,
                                            position: 'relative',
                                            backgroundColor: newOrderIds.has(order._id) ? `${config.color}08` : 'white'
                                        }}
                                    >
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'start',
                                        marginBottom: '20px',
                                        paddingBottom: '16px',
                                        borderBottom: '1px solid #f1f5f9'
                                    }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <span className="text-premium-header" style={{ fontSize: '26px' }}>
                                                    #{order.orderNumber || (order._id ? order._id.substr(-5).toUpperCase() : '----')}
                                                </span>
                                                <div className="premium-badge glass-surface" style={{ fontSize: '13px' }}>
                                                    Mesa {order.table?.number || '?'}
                                                </div>
                                            </div>
                                            <div className="text-premium-muted" style={{ marginTop: '6px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Clock size={14} />
                                                {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                        <KitchenTimer startTime={order.createdAt} />
                                    </div>

                                    {/* Items List */}
                                    <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {order.items?.map((item, idx) => (
                                            <div key={idx} style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'start',
                                                padding: '10px',
                                                borderRadius: '10px',
                                                background: '#f8fafc'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <span className="text-premium-header" style={{ color: '#6366f1', fontSize: '15px' }}>{item.qty || item.quantity || 1}x</span>
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <span style={{ fontWeight: '800', color: '#1e293b', fontSize: '15px' }}>{item.item?.name || item.name}</span>
                                                        {item.notes && (
                                                            <span className="badge-warning" style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', marginTop: '4px', display: 'inline-block', width: 'fit-content' }}>
                                                                {item.notes}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-col gap-3">
                                        {['pending', 'confirmed'].includes(order.status) && (
                                            <button
                                                onClick={() => updateStatus(order._id, 'preparing')}
                                                style={{
                                                    width: '100%',
                                                    padding: '16px',
                                                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '16px',
                                                    fontWeight: '900',
                                                    fontSize: '14px',
                                                    cursor: 'pointer',
                                                    boxShadow: '0 8px 20px -6px rgba(99, 102, 241, 0.4)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '10px'
                                                }}
                                            >
                                                <ChefHat size={20} /> INICIAR PREPARO
                                            </button>
                                        )}
                                        {order.status === 'preparing' && (
                                            <button
                                                onClick={() => updateStatus(order._id, 'ready')}
                                                style={{
                                                    width: '100%',
                                                    padding: '16px',
                                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '16px',
                                                    fontWeight: '900',
                                                    fontSize: '14px',
                                                    cursor: 'pointer',
                                                    boxShadow: '0 8px 20px -6px rgba(16, 185, 129, 0.4)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '10px'
                                                }}
                                            >
                                                <CheckCircle size={20} /> MARCAR COMO PRONTO
                                            </button>
                                        )}
                                        {order.status === 'ready' && (
                                            <button
                                                onClick={() => updateStatus(order._id, 'completed')}
                                                style={{
                                                    width: '100%',
                                                    padding: '16px',
                                                    background: 'white',
                                                    color: '#64748b',
                                                    border: '2px solid #e2e8f0',
                                                    borderRadius: '16px',
                                                    fontWeight: '800',
                                                    fontSize: '14px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '10px'
                                                }}
                                            >
                                                <CheckCircle size={20} /> ENTREGUE / FECHAR
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                            </AnimatePresence>
                            {config.items.length === 0 && (
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    style={{ height: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}
                                >
                                    <div style={{ padding: '24px', background: 'white', borderRadius: '50%', marginBottom: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                                        <config.icon size={48} strokeWidth={1.5} className="text-slate-200" />
                                    </div>
                                    <p className="text-premium-muted" style={{ fontSize: '13px' }}>Sem pedidos em {config.title}</p>
                                </motion.div>
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

    let colorState = 'badge-success';
    if (minutes >= 15) colorState = 'badge-warning';
    if (minutes >= 25) colorState = 'badge-error';

    return (
        <div className={`premium-badge ${colorState} glass-surface ${minutes >= 15 ? 'premium-pulse-soft' : ''}`} style={{
            fontFamily: 'monospace',
            fontSize: '14px',
            padding: '8px 16px'
        }}>
            <Clock size={14} />
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>
    );
};

export default Kitchen;
