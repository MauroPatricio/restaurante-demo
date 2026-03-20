import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { roomServiceAPI } from '../services/api';
import api from '../services/api';
import { getCurrencySymbol } from '../utils/currencyUtils';
import {
    BedDouble, Clock, CheckCircle2, ChefHat,
    Footprints, RefreshCw, AlertCircle, ShoppingBag
} from 'lucide-react';

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

function OrderCard({ order, onStatusChange, t }) {
    const meta = STATUS_META[order.status] || STATUS_META.pending;
    const Icon = meta.icon;
    const nextStatus = STATUS_FLOW[STATUS_FLOW.indexOf(order.status) + 1];
    const nextMeta = nextStatus ? STATUS_META[nextStatus] : null;

    return (
        <div style={{
            background: 'var(--bg-card)', borderRadius: '14px',
            border: `1.5px solid ${meta.color}33`, padding: '16px',
            transition: 'box-shadow 0.2s', marginBottom: '12px'
        }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1.2rem' }}>🛏️</span>
                        <span style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)' }}>
                            {t('room')} {order.roomService?.roomNumber || '—'}
                        </span>
                    </div>
                    <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {order.customerName} · {formatElapsed(order.createdAt, t)}
                    </p>
                </div>
                <span style={{ padding: '4px 10px', borderRadius: '99px', fontSize: '0.7rem', fontWeight: '700', background: meta.bg, color: meta.color, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Icon size={12} /> {t(meta.label_key || meta.label)}
                </span>
            </div>

            {/* Items */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginBottom: '10px' }}>
                {order.items?.map((it, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
                        <span>{it.qty}× {it.item?.name || it.name || t('item')}</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{(it.subtotal || it.itemPrice * it.qty || 0).toFixed(2)} {getCurrencySymbol(user?.restaurant?.settings?.currency || order.currency || 'MZN')}</span>
                    </div>
                ))}
                {order.notes && (
                    <p style={{ fontSize: '0.8rem', color: '#f59e0b', marginTop: '6px', fontStyle: 'italic' }}>📝 {order.notes}</p>
                )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                    {t('total')}: {order.total?.toFixed(2)} {getCurrencySymbol(user?.restaurant?.settings?.currency || order.currency || 'MZN')}
                </span>
                {nextMeta && (
                    <button
                        onClick={() => onStatusChange(order._id, nextStatus)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '8px 14px', background: nextMeta.bg, color: nextMeta.color,
                            border: `1px solid ${nextMeta.color}44`, borderRadius: '10px',
                            fontWeight: '600', fontSize: '0.8rem', cursor: 'pointer'
                        }}
                    >
                        → {t(nextMeta.label_key || nextMeta.label)}
                    </button>
                )}
            </div>
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
    const restaurantId = user?.restaurant?._id || user?.restaurant;

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState(new Date());

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
        if (!socket) return;
        const handleNew = (data) => {
            fetchOrders(); // refetch to get full populated order
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
    }, [socket, fetchOrders]);

    const handleStatusChange = async (orderId, newStatus) => {
        try {
            await api.patch(`/orders/${orderId}`, { status: newStatus });
            setOrders(prev => prev.map(o =>
                o._id === orderId ? { ...o, status: newStatus } : o
            ));
        } catch (e) {
            console.error('Update status error:', e);
        }
    };

    return (
        <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg, #f59e0b, #ef4444)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ShoppingBag size={24} color="white" />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                            {t('room_orders')}
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.875rem' }}>
                            {orders.filter(o => ['pending', 'confirmed'].includes(o.status)).length} {t('new_orders_label')} ·
                            {t('updated_at')} {lastRefresh.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                </div>
                <button
                    onClick={fetchOrders}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: '10px', cursor: 'pointer', fontWeight: '600' }}
                >
                    <RefreshCw size={16} /> {t('refresh')}
                </button>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
                    {t('loading_orders')}
                </div>
            ) : orders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', background: 'var(--bg-card)', borderRadius: '16px', border: '2px dashed var(--border-color)' }}>
                    <BedDouble size={48} style={{ color: 'var(--text-secondary)', marginBottom: '12px' }} />
                    <h3 style={{ color: 'var(--text-primary)', margin: '0 0 8px' }}>{t('no_active_orders')}</h3>
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{t('room_orders_realtime_desc')}</p>
                </div>
            ) : (
                /* Kanban Board */
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', alignItems: 'start' }}>
                    {COLUMNS.map(col => {
                        const colOrders = orders.filter(o => col.statuses.includes(o.status));
                        return (
                            <div key={col.label} style={{ background: 'var(--bg-secondary)', borderRadius: '14px', padding: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                                    <span style={{ fontWeight: '700', color: col.color, fontSize: '0.9rem' }}>{col.icon} {t(col.label_key)}</span>
                                    {colOrders.length > 0 && (
                                        <span style={{ background: col.color, color: 'white', borderRadius: '99px', padding: '1px 8px', fontSize: '0.75rem', fontWeight: '700' }}>
                                            {colOrders.length}
                                        </span>
                                    )}
                                </div>
                                {colOrders.length === 0 ? (
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textAlign: 'center', padding: '20px 0' }}>{t('no_orders')}</p>
                                ) : (
                                    colOrders.map(order => (
                                        <OrderCard key={order._id} order={order} onStatusChange={handleStatusChange} t={t} />
                                    ))
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
