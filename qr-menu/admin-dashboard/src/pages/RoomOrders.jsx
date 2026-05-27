import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { roomServiceAPI } from '../services/api';
import api from '../services/api';
import { useCurrency } from '../contexts/CurrencyContext';
import {
    BedDouble, Clock, CheckCircle2, ChefHat,
    Footprints, RefreshCw, AlertCircle, ShoppingBag,
    X, ChevronRight, User, Utensils
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const STATUS_FLOW = ['pending', 'confirmed', 'preparing', 'ready', 'served'];

const STATUS_META = {
    pending: { label_key: 'status_pending', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: Clock },
    confirmed: { label_key: 'status_confirmed', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', icon: CheckCircle2 },
    preparing: { label_key: 'status_preparing', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', icon: ChefHat },
    ready: { label_key: 'status_ready', color: '#10b981', bg: 'rgba(16,185,129,0.1)', icon: Footprints },
    served: { label_key: 'status_served', color: '#64748b', bg: 'rgba(100,116,139,0.1)', icon: CheckCircle2 },
    completed: { label_key: 'status_completed', color: '#64748b', bg: 'rgba(100,116,139,0.1)', icon: CheckCircle2 },
    cancelled: { label_key: 'status_cancelled', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', icon: AlertCircle }
};

function formatElapsed(dateStr, t) {
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 60000);
    if (diff < 1) return t('just_now');
    if (diff < 60) return t('minutes_ago', { count: diff });
    return t('hours_ago', { count: Math.floor(diff / 60), minutes: diff % 60 });
}

function OrderCard({ order, onStatusChange, t, user, convertAndFormat, onClick }) {
    const meta = STATUS_META[order.status] || STATUS_META.pending;
    const Icon = meta.icon;
    const currentIndex = STATUS_FLOW.indexOf(order.status);
    const nextStatus = currentIndex !== -1 && currentIndex < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentIndex + 1] : null;
    const nextMeta = nextStatus ? STATUS_META[nextStatus] : null;

    return (
        <motion.div 
            layout
            layoutId={order._id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -4, boxShadow: '0 12px 20px -8px rgba(0,0,0,0.1)' }}
            onClick={onClick}
            style={{
                background: 'var(--bg-card)', borderRadius: '16px',
                border: `1.5px solid ${meta.color}33`, padding: '18px',
                transition: 'all 0.2s', marginBottom: '16px', cursor: 'pointer',
                position: 'relative', overflow: 'hidden'
            }}
        >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ padding: '8px', background: `${meta.color}15`, borderRadius: '10px', color: meta.color }}>
                            <BedDouble size={18} />
                        </div>
                        <span style={{ fontWeight: '800', fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                            {t('room')} {order.roomService?.roomNumber || '—'}
                        </span>
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <User size={14} /> {order.customerName || t('guest')} · {formatElapsed(order.createdAt, t)}
                    </p>
                </div>
                <span style={{ padding: '6px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '800', background: meta.bg, color: meta.color, display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <Icon size={14} /> {t(meta.label_key || meta.label)}
                </span>
            </div>

            {/* Items Preview */}
            <div style={{ borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', padding: '12px 0', margin: '12px 0' }}>
                {(order.items || []).slice(0, 3).map((it, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '6px' }}>
                        <span style={{ fontWeight: '600' }}>{it.qty}× {it.item?.name || it.name || t('item')}</span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{convertAndFormat(it.subtotal || it.itemPrice * it.qty || 0, order.currency)}</span>
                    </div>
                ))}
                {order.items?.length > 3 && (
                    <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                        + {order.items.length - 3} {t('more_items')}
                    </p>
                )}
                {order.notes && (
                    <div style={{ marginTop: '10px', padding: '8px 12px', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fef3c7', fontSize: '0.8rem', color: '#92400e', display: 'flex', gap: '6px' }}>
                        <span>📝</span>
                        <p style={{ margin: 0, fontStyle: 'italic' }}>{order.notes}</p>
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.02em' }}>{t('total')}</span>
                    <span style={{ fontWeight: '900', color: 'var(--accent-primary)', fontSize: '1.2rem' }}>
                        {convertAndFormat(order.total || 0, order.currency)}
                    </span>
                </div>
                {nextMeta && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onStatusChange(order._id, nextStatus);
                        }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '10px 18px', background: nextMeta.color, color: 'white',
                            border: 'none', borderRadius: '12px',
                            fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer',
                            boxShadow: `0 4px 12px ${nextMeta.color}44`,
                            transition: 'all 0.2s'
                        }}
                    >
                        {t(nextMeta.label_key || nextMeta.label)} <ChevronRight size={16} />
                    </button>
                )}
            </div>
        </motion.div>
    );
}

function OrderDetailModal({ order, onClose, t, convertAndFormat, onStatusChange }) {
    if (!order) return null;
    const meta = STATUS_META[order.status] || STATUS_META.pending;
    const Icon = meta.icon;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '20px'
        }} onClick={onClose}>
            <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                style={{
                    background: 'white', borderRadius: '24px', width: '100%', maxWidth: '600px',
                    maxHeight: '90vh', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                    display: 'flex', flexDirection: 'column'
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ padding: '12px', background: `${meta.color}15`, color: meta.color, borderRadius: '16px' }}>
                            <Icon size={24} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#1e293b' }}>
                                {t('order')} #{order.orderNumber || order._id?.slice(-6).toUpperCase()}
                            </h3>
                            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.875rem' }}>
                                {new Date(order.createdAt).toLocaleString()}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', padding: '8px', borderRadius: '10px', cursor: 'pointer', color: '#64748b' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: '24px', overflowY: 'auto' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                        <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '16px' }}>
                            <p style={{ margin: '0 0 8px', fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>{t('room')}</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', color: '#1e293b' }}>
                                <BedDouble size={18} className="text-indigo-500" /> {order.roomService?.roomNumber || '—'}
                            </div>
                        </div>
                        <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '16px' }}>
                            <p style={{ margin: '0 0 8px', fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>{t('customer')}</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', color: '#1e293b' }}>
                                <User size={18} className="text-indigo-500" /> {order.customerName || t('guest')}
                            </div>
                        </div>
                    </div>

                    <h4 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: '800', color: '#1e293b' }}>{t('items')}</h4>
                    <div style={{ border: '1px solid #f1f5f9', borderRadius: '16px', overflow: 'hidden', marginBottom: '24px' }}>
                        {order.items?.map((it, i) => (
                            <div key={i} style={{ padding: '14px 16px', borderBottom: i === order.items.length - 1 ? 'none' : '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ fontWeight: '800', color: '#4f46e5', minWidth: '32px' }}>{it.qty}×</span>
                                    <span style={{ fontWeight: '600', color: '#1e293b' }}>{it.item?.name || it.name}</span>
                                </div>
                                <span style={{ fontWeight: '700', color: '#1e293b' }}>{convertAndFormat(it.subtotal || it.itemPrice * it.qty || 0, order.currency)}</span>
                            </div>
                        ))}
                    </div>

                    {order.notes && (
                        <div style={{ padding: '16px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '16px', marginBottom: '24px' }}>
                            <p style={{ margin: '0 0 8px', fontSize: '0.75rem', fontWeight: '700', color: '#92400e', textTransform: 'uppercase' }}>{t('notes')}</p>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#92400e', fontStyle: 'italic' }}>{order.notes}</p>
                        </div>
                    )}

                    <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '1rem' }}>
                            <span style={{ fontWeight: '600', color: '#64748b' }}>{t('total_amount')}</span>
                            <span style={{ fontWeight: '900', color: '#4f46e5', fontSize: '1.25rem' }}>{convertAndFormat(order.total, order.currency)}</span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div style={{ padding: '24px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '12px' }}>
                    <button 
                        onClick={onClose}
                        style={{ flex: 1, padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: '700', cursor: 'pointer' }}
                    >
                        {t('close')}
                    </button>
                    {STATUS_FLOW.indexOf(order.status) < STATUS_FLOW.length - 1 && (
                        <button 
                            onClick={() => {
                                const nextStatus = STATUS_FLOW[STATUS_FLOW.indexOf(order.status) + 1];
                                onStatusChange(order._id, nextStatus);
                                onClose();
                            }}
                            style={{ 
                                flex: 2, padding: '14px', borderRadius: '14px', border: 'none', 
                                background: STATUS_META[STATUS_FLOW[STATUS_FLOW.indexOf(order.status) + 1]]?.color || '#4f46e5', 
                                color: 'white', fontWeight: '800', cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.2)'
                            }}
                        >
                            {t('move_to')} {t(STATUS_META[STATUS_FLOW[STATUS_FLOW.indexOf(order.status) + 1]]?.label_key || STATUS_META[STATUS_FLOW[STATUS_FLOW.indexOf(order.status) + 1]]?.label)}
                        </button>
                    )}
                </div>
            </motion.div>
        </div>
    );
}

const COLUMNS = [
    { statuses: ['pending', 'confirmed'], label_key: 'new_orders_tab', icon: '📥', color: '#f59e0b' },
    { statuses: ['preparing'], label_key: 'preparing_tab', icon: '👨‍🍳', color: '#8b5cf6' },
    { statuses: ['ready'], label_key: 'on_way_tab', icon: '🚶', color: '#10b981' },
    { statuses: ['served', 'completed'], label_key: 'delivered_tab', icon: '✅', color: '#64748b' }
];

export default function RoomOrders() {
    const { t, i18n } = useTranslation();
    const { user } = useAuth();
    const { socket } = useSocket();
    const { convertAndFormat } = useCurrency();
    const restaurantId = user?.restaurant?._id || user?.restaurant?.id || user?.restaurant;

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState(new Date());
    const [selectedOrder, setSelectedOrder] = useState(null);

    const fetchOrders = useCallback(async () => {
        if (!restaurantId) return;
        try {
            const res = await roomServiceAPI.getOrders(restaurantId, {
                status: 'pending,confirmed,preparing,ready,served'
            });
            setOrders(res.data.orders || []);
            setLastRefresh(new Date());
        } catch (e) {
            console.error('Room orders fetch error:', e);
        } finally {
            setLoading(false);
        }
    }, [restaurantId]);

    useEffect(() => {
        fetchOrders();
        const interval = setInterval(fetchOrders, 30000); // refresh every 30s
        return () => clearInterval(interval);
    }, [fetchOrders]);

    // Real-time: listen for new room orders
    useEffect(() => {
        if (!socket || !restaurantId) return;
        const handleNew = (data) => {
            setOrders(prev => {
                const orderId = data._id || data.orderId;
                if (prev.find(o => o._id === orderId)) return prev;
                return [data, ...prev];
            });
        };
        const handleUpdated = (data) => {
            setOrders(prev => prev.map(o => o._id === data._id ? { ...o, ...data } : o));
        };
        socket.on('room:order:new', handleNew);
        socket.on('order-updated', handleUpdated);
        return () => {
            socket.off('room:order:new', handleNew);
            socket.off('order-updated', handleUpdated);
        };
    }, [socket, fetchOrders, restaurantId]);

    const handleStatusChange = async (orderId, newStatus) => {
        try {
            // Optimistic update
            setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: newStatus } : o));
            await api.patch(`/orders/${orderId}`, { status: newStatus });
        } catch (e) {
            console.error('Update status error:', e);
            fetchOrders(); // Rollback on error
        }
    };

    return (
        <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto', minHeight: '100vh', background: '#f8fafc' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', padding: '24px', background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '56px', height: '56px', background: 'linear-gradient(135deg, #f59e0b, #ef4444)', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 16px -4px rgba(245, 158, 11, 0.4)' }}>
                        <ShoppingBag size={28} color="white" />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: '900', color: '#1e293b', margin: 0 }}>
                            {t('room_orders')}
                        </h1>
                        <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: '0.9rem', fontWeight: '600' }}>
                            {orders.filter(o => ['pending', 'confirmed'].includes(o.status)).length} {t('new_orders_label')} ·
                            {t('updated_at')} {lastRefresh.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                </div>
                <button
                    onClick={fetchOrders}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', background: 'white', color: '#475569', border: '1.5px solid #e2e8f0', borderRadius: '14px', cursor: 'pointer', fontWeight: '700', transition: 'all 0.2s' }}
                    className="hover:bg-slate-50 active:scale-95"
                >
                    <RefreshCw size={18} /> {t('refresh')}
                </button>
            </div>

            {loading && orders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '100px', color: '#94a3b8' }}>
                    <RefreshCw size={48} className="animate-spin mx-auto mb-4" />
                    <p style={{ fontWeight: '700' }}>{t('loading_orders')}</p>
                </div>
            ) : orders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '100px 20px', background: 'white', borderRadius: '24px', border: '2px dashed #e2e8f0' }}>
                    <div style={{ width: '80px', height: '80px', background: '#f8fafc', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                        <BedDouble size={40} style={{ color: '#cbd5e1' }} />
                    </div>
                    <h3 style={{ color: '#1e293b', fontWeight: '800', margin: '0 0 8px', fontSize: '1.25rem' }}>{t('no_active_orders')}</h3>
                    <p style={{ color: '#64748b', margin: 0, fontWeight: '500' }}>{t('room_orders_realtime_desc')}</p>
                </div>
            ) : (
                /* Kanban Board */
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px', alignItems: 'start' }}>
                    {COLUMNS.map(col => {
                        const colOrders = orders.filter(o => col.statuses.includes(o.status));
                        return (
                            <div key={col.label_key} style={{ background: '#f1f5f9', borderRadius: '20px', padding: '20px', minHeight: '400px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                                    <span style={{ fontWeight: '800', color: col.color, fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{col.icon} {t(col.label_key)}</span>
                                    {colOrders.length > 0 && (
                                        <span style={{ background: col.color, color: 'white', borderRadius: '10px', padding: '2px 10px', fontSize: '0.8rem', fontWeight: '900', boxShadow: `0 4px 10px ${col.color}44` }}>
                                            {colOrders.length}
                                        </span>
                                    )}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {colOrders.length === 0 ? (
                                        <div style={{ padding: '32px 0', textAlign: 'center', border: '2px dashed #cbd5e1', borderRadius: '16px', color: '#94a3b8' }}>
                                            <p style={{ fontSize: '0.85rem', fontWeight: '600', margin: 0 }}>{t('no_orders')}</p>
                                        </div>
                                    ) : (
                                        <AnimatePresence mode="popLayout">
                                            {colOrders.map(order => (
                                                <OrderCard 
                                                    key={order._id} 
                                                    order={order} 
                                                    onStatusChange={handleStatusChange} 
                                                    t={t} 
                                                    user={user} 
                                                    convertAndFormat={convertAndFormat}
                                                    onClick={() => setSelectedOrder(order)}
                                                />
                                            ))}
                                        </AnimatePresence>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <AnimatePresence>
                {selectedOrder && (
                    <OrderDetailModal 
                        order={selectedOrder}
                        onClose={() => setSelectedOrder(null)}
                        t={t}
                        convertAndFormat={convertAndFormat}
                        onStatusChange={handleStatusChange}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
