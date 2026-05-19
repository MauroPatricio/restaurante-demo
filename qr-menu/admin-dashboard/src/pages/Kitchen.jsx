import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { orderAPI, restaurantAPI } from '../services/api';
import { analyticsAPI } from '../services/analytics';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { useSound } from '../hooks/useSound';
import { 
    Clock, CheckCircle, AlertCircle, ChefHat, TrendingUp, Users, 
    Utensils, Volume2, VolumeX, XCircle, Coffee, Wifi, WifiOff, Power,
    Bell, Timer, LayoutDashboard
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale/pt';
import LoadingSpinner from '../components/LoadingSpinner';
import { SkeletonGrid } from '../components/Skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import './Kitchen.css';

const Kitchen = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { socket, connected } = useSocket();
    const restaurantId = user?.restaurant?._id || user?.restaurant?.id || localStorage.getItem('restaurantId');

    const [orders, setOrders] = useState([]);
    const [cancelledOrders, setCancelledOrders] = useState([]);
    const [newOrderIds, setNewOrderIds] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [audioEnabled, setAudioEnabled] = useState(false);
    const [isKitchenOpen, setIsKitchenOpen] = useState(true);
    const [togglingKitchen, setTogglingKitchen] = useState(false);

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
            title: t('pending') || 'Pendente',
            icon: AlertCircle,
            color: '#f59e0b',
            items: orders.filter((o) => ['pending', 'confirmed'].includes(o.status))
        },
        preparing: {
            title: t('preparing') || 'Preparando',
            icon: ChefHat,
            color: '#3b82f6',
            items: orders.filter((o) => o.status === 'preparing')
        },
        ready: {
            title: t('ready') || 'Pronto',
            icon: CheckCircle,
            color: '#10b981',
            items: orders.filter((o) => o.status === 'ready')
        }
    }), [orders, t]);

    useEffect(() => {
        if (!restaurantId) {
            setLoading(false);
            return;
        }
        fetchData();
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
                return [data, ...prev];
            });

            const orderId = data._id || data.orderId;
            setNewOrderIds(prev => new Set([...prev, orderId]));
            setTimeout(() => {
                setNewOrderIds(prev => {
                    const next = new Set(prev);
                    next.delete(orderId);
                    return next;
                });
            }, 10000);

            if (audioEnabled) playOrderSound();

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

        return () => {
            socket.off('order:new', handleNewOrder);
            socket.off('room:order:new', handleNewOrder);
            socket.off('order-updated', handleRealtimeUpdate);
            socket.off('stats:updated', handleStatsUpdate);
            socket.off('waiter:call', fetchData);
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
        const previousOrders = [...orders];
        setOrders(prev => {
            if (['completed', 'served', 'cancelled'].includes(newStatus)) {
                return prev.filter(o => o._id !== orderId);
            }
            return prev.map(o => o._id === orderId ? { ...o, status: newStatus } : o);
        });

        try {
            await orderAPI.updateStatus(orderId, newStatus);
        } catch (error) {
            console.error('Failed to update order status:', error);
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

    if (loading) return (
        <div className="kitchen-container">
            <div className="mb-10">
                <div className="h-16 w-96 bg-gray-200 rounded-2xl animate-pulse mb-4"></div>
                <div className="h-6 w-72 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <SkeletonGrid items={5} columns={5} height="140px" gap="24px" />
        </div>
    );

    if (!restaurantId) return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400">
            <AlertCircle size={64} className="mb-4 text-red-200" />
            <h2 className="text-2xl font-black text-gray-900 mb-2">Restaurante não selecionado</h2>
            <p className="font-600">Por favor, selecione um restaurante para ver os pedidos.</p>
        </div>
    );

    const { realtime, operational } = stats;

    return (
        <div className="kitchen-container animate-fade-in">
            {/* ── Header ── */}
            <header className="kitchen-header">
                <div className="kitchen-title-section">
                    <div className="flex items-center gap-3 mb-2">
                        <LayoutDashboard size={20} className="text-primary-600" />
                        <span className="text-[10px] font-900 uppercase tracking-[0.2em] text-primary-600">{t('kitchen_display') || 'Kitchen Display System (KDS)'}</span>
                    </div>
                    <h1>{t('kitchen_display') || 'Kitchen Display'}</h1>
                    <div className="kitchen-status-indicator">
                        <div className="status-dot animate-pulse" />
                        <span className="status-text">{t('live_kitchen_desc') || 'Gestão de pedidos em directo'} • {new Date().toLocaleDateString('pt-PT')}</span>
                    </div>
                </div>

                <div className="kitchen-actions">
                    <button
                        onClick={handleToggleKitchen}
                        disabled={togglingKitchen}
                        className={`kitchen-toggle-btn ${isKitchenOpen ? 'open' : 'closed'}`}
                    >
                        <Power size={18} />
                        {togglingKitchen ? '...' : (isKitchenOpen ? t('kitchen_open_status', 'Cozinha Aberta') : t('kitchen_closed_status', 'Inactivo / Manutenção'))}
                    </button>
                    
                    <button
                        onClick={() => setAudioEnabled(!audioEnabled)}
                        className={`kitchen-toggle-btn ${audioEnabled ? 'open' : 'closed'}`}
                    >
                        {audioEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                        {audioEnabled ? 'Áudio Ligado' : 'Áudio Desligado'}
                    </button>

                    <div className={`kitchen-toggle-btn ${connected ? 'open' : 'closed'}`}>
                        {connected ? <Wifi size={18} /> : <WifiOff size={18} />}
                        {connected ? t('connected') : t('offline')}
                    </div>
                </div>
            </header>

            {/* ── Cancelled Banner ── */}
            <AnimatePresence>
                {cancelledOrders.length > 0 && (
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="glass-card border-red-200 bg-red-50/50 p-6"
                    >
                        <h3 className="flex items-center gap-2 text-red-600 font-900 uppercase text-sm mb-4">
                            <XCircle size={20} /> Pedidos Cancelados Recentemente
                        </h3>
                        <div className="flex gap-4 flex-wrap">
                            {cancelledOrders.map(order => (
                                <div key={order._id} className="bg-white px-4 py-2 rounded-xl shadow-sm border border-red-100 flex items-center gap-3">
                                    <span className="font-900 text-red-500 line-through">#{order.orderNumber || order._id.substr(-4)}</span>
                                    <span className="text-xs font-700 text-gray-500">Mesa {order.tableNumber || '?'}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── KPI Cards ── */}
            <div className="kitchen-stats-grid">
                <div className="glass-card kpi-card hover-lift">
                    <span className="kpi-label">{t('active_orders')}</span>
                    <div className="kpi-value-container">
                        <span className="kpi-value">{realtime.activeOrders || 0}</span>
                        <div className="kpi-icon-box bg-blue-50 text-blue-600">
                            <Utensils size={24} />
                        </div>
                    </div>
                </div>

                <div className="glass-card kpi-card hover-lift">
                    <span className="kpi-label">{t('pending_orders')}</span>
                    <div className="kpi-value-container">
                        <span className="kpi-value">{realtime.pendingOrders || 0}</span>
                        <div className="kpi-icon-box bg-amber-50 text-amber-600">
                            <AlertCircle size={24} />
                        </div>
                    </div>
                </div>

                <div className="glass-card kpi-card hover-lift">
                    <span className="kpi-label">Feitos Hoje</span>
                    <div className="kpi-value-container">
                        <span className="kpi-value text-emerald-600">{realtime.completedOrders || 0}</span>
                        <div className="kpi-icon-box bg-emerald-50 text-emerald-600">
                            <CheckCircle size={24} />
                        </div>
                    </div>
                </div>

                <div className="glass-card kpi-card hover-lift">
                    <span className="kpi-label">Chamadas Garçom</span>
                    <div className="kpi-value-container">
                        <span className={`kpi-value ${realtime.activeWaiterCalls > 0 ? 'text-red-500' : 'text-gray-300'}`}>{realtime.activeWaiterCalls || 0}</span>
                        <div className="kpi-icon-box bg-rose-50 text-rose-500">
                            <Users size={24} />
                        </div>
                    </div>
                </div>

                <div className="glass-card kpi-card hover-lift">
                    <span className="kpi-label">Tempo Médio</span>
                    <div className="kpi-value-container">
                        <span className="kpi-value">
                            {Math.round(operational.avgPrepTime || 0)} <span className="text-sm text-gray-400 uppercase">min</span>
                        </span>
                        <div className="kpi-icon-box bg-purple-50 text-purple-600">
                            <Timer size={24} />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Orders Columns ── */}
            <div className="kitchen-columns">
                {Object.entries(columns).map(([status, config]) => (
                    <div key={status} className="kitchen-column">
                        <div className="column-header">
                            <h2 className="column-title" style={{ color: config.color }}>
                                <div className="p-2 rounded-xl" style={{ background: `${config.color}15` }}>
                                    <config.icon size={20} strokeWidth={3} />
                                </div>
                                {config.title}
                            </h2>
                            <span className="column-count" style={{ color: config.color }}>{config.items.length}</span>
                        </div>

                        <div className="orders-list">
                            <AnimatePresence mode="popLayout">
                                {config.items.map(order => (
                                    <motion.div
                                        layout
                                        key={order._id}
                                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                                        className={`order-card ${newOrderIds.has(order._id) ? 'new-order-pulse' : ''}`}
                                        style={{ borderLeft: `6px solid ${config.color}` }}
                                    >
                                        <div className="order-card-header">
                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <span className="order-number">#{order.orderNumber || (order._id ? order._id.substr(-5).toUpperCase() : '----')}</span>
                                                    <div className="order-table-badge">
                                                        {order.orderType === 'room-service' 
                                                            ? `🛏️ Quarto ${order.roomService?.roomNumber || '—'}` 
                                                            : `🪑 Mesa ${order.tableNumber || order.table?.number || '—'}`}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 mt-2 text-xs font-700 text-gray-400 uppercase tracking-wider">
                                                    <Clock size={12} />
                                                    {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                            <KitchenTimer startTime={order.createdAt} />
                                        </div>

                                        <div className="order-items">
                                            {order.items?.map((item, idx) => (
                                                <div key={idx} className="order-item">
                                                    <span className="item-qty">{item.qty || item.quantity || 1}x</span>
                                                    <div className="flex flex-col">
                                                        <span className="item-name">{item.item?.name || item.name}</span>
                                                        {item.notes && <span className="item-notes">📝 {item.notes}</span>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="order-actions">
                                            {['pending', 'confirmed'].includes(order.status) && (
                                                <button onClick={() => updateStatus(order._id, 'preparing')} className="order-action-btn btn-primary">
                                                    <ChefHat size={18} /> INICIAR PREPARO
                                                </button>
                                            )}
                                            {order.status === 'preparing' && (
                                                <button onClick={() => updateStatus(order._id, 'ready')} className="order-action-btn btn-success">
                                                    <CheckCircle size={18} /> MARCAR PRONTO
                                                </button>
                                            )}
                                            {order.status === 'ready' && (
                                                <button onClick={() => updateStatus(order._id, 'completed')} className="order-action-btn btn-outline">
                                                    <XCircle size={18} /> FECHAR PEDIDO
                                                </button>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                            
                            {config.items.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-64 text-gray-300">
                                    <div className="p-6 bg-white rounded-full shadow-sm mb-4">
                                        <config.icon size={48} strokeWidth={1} />
                                    </div>
                                    <p className="font-800 uppercase tracking-widest text-[10px]">Sem pedidos</p>
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
        const interval = setInterval(() => setElapsed(Date.now() - start), 1000);
        return () => clearInterval(interval);
    }, [startTime]);

    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);

    let state = 'timer-safe';
    if (minutes >= 15) state = 'timer-warning';
    if (minutes >= 25) state = 'timer-danger';

    return (
        <div className={`order-timer ${state} ${minutes >= 15 ? 'animate-pulse' : ''}`}>
            <Clock size={14} />
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>
    );
};

export default Kitchen;
