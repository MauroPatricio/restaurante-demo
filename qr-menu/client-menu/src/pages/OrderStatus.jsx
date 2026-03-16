import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Copy, CheckCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { io } from 'socket.io-client';
import api from '../services/api';
import { getMenuUrl } from '../utils/navigation';
import { SOCKET_URL } from '../config/api';
import LoadingSpinner from '../components/LoadingSpinner';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useCurrency } from '../context/CurrencyContext';
import { convertCurrency, formatCurrency } from '../utils/currencyUtils';
import CurrencySwitcher from '../components/CurrencySwitcher';

const DONE_STATUSES = ['served', 'completed', 'cancelled'];
const POLL_MS = 12000;


export default function OrderStatus() {
    const { restaurantId, orderId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { t, i18n } = useTranslation();
    const { currency: preferredCurrency, rates } = useCurrency();

    const locale = i18n.language === 'pt' ? 'pt-MZ' : i18n.language;

    const STATUS_STEPS = [
        { key: 'pending', label: t('order_status_received'), icon: '📋', color: '#f59e0b', desc: t('order_status_received_desc') },
        { key: 'confirmed', label: t('order_status_confirmed'), icon: '✅', color: '#3b82f6', desc: t('order_status_confirmed_desc') },
        { key: 'preparing', label: t('order_status_preparing'), icon: '👨‍🍳', color: '#8b5cf6', desc: t('order_status_preparing_desc') },
        { key: 'ready', label: t('order_status_ready'), icon: '🍽️', color: '#10b981', desc: t('order_status_ready_desc') },
        { key: 'served', label: t('order_status_served'), icon: '🎉', color: '#10b981', desc: t('order_status_served_desc') },
        { key: 'completed', label: t('order_status_completed'), icon: '✔️', color: '#64748b', desc: t('order_status_completed_desc') },
    ];

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showReadyAlert, setShowReadyAlert] = useState(false);
    const [statusToast, setStatusToast] = useState(null);
    const [copied, setCopied] = useState(false);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
    const [justSubmitted] = useState(location.state?.justSubmitted || false);

    const toastTimerRef = useRef(null);
    const audioRef = useRef(null);

    const elapsed = (d) => {
        const m = Math.floor((Date.now() - new Date(d)) / 60000);
        if (m < 1) return t('just_now');
        if (m < 60) return t('minutes_ago', { count: m });
        return t('hours_ago', { count: Math.floor(m / 60), minutes: m % 60 });
    };

    /* ── Shared status change handler (used by both polling and socket) ── */
    const handleStatusChange = useCallback((newOrder) => {
        setOrder(prev => {
            const newStatus = newOrder.status;
            if (prev && prev.status !== newStatus) {
                try { audioRef.current?.play(); } catch { }
                try { navigator.vibrate?.([200, 50, 200]); } catch { }
                const step = STATUS_STEPS.find(s => s.key === newStatus);
                if (step) {
                    setStatusToast({ label: step.label, color: step.color, icon: step.icon });
                    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
                    toastTimerRef.current = setTimeout(() => setStatusToast(null), 4000);
                }
                if (newStatus === 'ready') {
                    setShowReadyAlert(true);
                    try { navigator.vibrate?.([400, 100, 400, 100, 800]); } catch { }
                }
            }
            return newOrder;
        });
    }, [STATUS_STEPS]);

    /* ── Fetch order (polling) ── */
    const fetchOrder = useCallback(async () => {
        try {
            const res = await api.get(`/orders/${orderId}`);
            const newOrder = res.data.order || res.data;
            handleStatusChange(newOrder);
        } catch (e) {
            setError(e.response?.data?.error || e.message || t('error_loading_order'));
        } finally {
            setLoading(false);
        }
    }, [orderId, handleStatusChange, t]);

    /* ── WebSocket: instant updates ── */
    useEffect(() => {
        if (!orderId) return;
        const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
        socket.on('connect', () => socket.emit('join-order', orderId));
        socket.on('order-updated', (updatedOrder) => {
            handleStatusChange(updatedOrder);
        });
        return () => socket.disconnect();
    }, [orderId, handleStatusChange]);

    useEffect(() => { fetchOrder(); }, [fetchOrder]);

    /* ── Polling ── */
    useEffect(() => {
        if (!order || DONE_STATUSES.includes(order.status)) return;
        const id = setInterval(fetchOrder, POLL_MS);
        return () => clearInterval(id);
    }, [order, fetchOrder]);

    /* ── Feedback ── */
    const submitFeedback = async () => {
        try {
            await api.post('/feedback', {
                restaurant: restaurantId,
                orderId,
                rating,
                comment,
                customerName: order?.customerName || t('customer')
            });
            setFeedbackSubmitted(true);
        } catch { }
    };

    /* ── Loading ── */
    if (loading) return (
        <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', gap: 16 }}>
            <LoadingSpinner size={48} message={t('loading_order_msg')} />
        </div>
    );

    if (error || !order) return (
        <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', fontFamily: 'sans-serif' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>⚠️</div>
            <h2 style={{ color: '#be123c' }}>{t('not_found')}</h2>
            <p style={{ color: '#64748b' }}>{error || t('order_not_found')}</p>
            <button onClick={() => navigate(getMenuUrl(restaurantId, searchParams))} style={{ marginTop: 16, padding: '10px 24px', background: '#312e81', color: 'white', border: 'none', borderRadius: 12, fontWeight: 700, cursor: 'pointer' }}>← {t('back_to_menu')}</button>
        </div>
    );

    /* ── Full-screen READY alert ── */
    if (showReadyAlert) return (
        <div
            onClick={() => setShowReadyAlert(false)}
            style={{ position: 'fixed', inset: 0, background: 'linear-gradient(135deg,#064e3b,#065f46)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 9999, cursor: 'pointer', padding: 32, textAlign: 'center', fontFamily: 'sans-serif' }}
        >
            <div style={{ fontSize: '5rem', marginBottom: 20, animation: 'bounce 0.5s ease infinite alternate' }}>🍽️</div>
            <h1 style={{ color: 'white', fontSize: '2rem', margin: '0 0 12px', fontWeight: 800 }}>{t('order_ready_title')}</h1>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1.1rem', marginBottom: 40 }}>
                {order.table?.number ? `${t('table')} ${order.table.number} · ` : ''}{t('waiter_coming')}
            </p>
            <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 14, padding: '12px 28px', color: 'white', fontWeight: 600 }}>
                {t('tap_to_close')}
            </div>
            <style>{`@keyframes bounce{from{transform:translateY(0)}to{transform:translateY(-12px)}}`}</style>
        </div>
    );

    /* ── Main UI ── */
    const currentIdx = STATUS_STEPS.findIndex(s => s.key === order.status);
    const currentStep = currentIdx >= 0 ? STATUS_STEPS[currentIdx] : STATUS_STEPS[0];
    const isCancelled = order.status === 'cancelled';
    const isDone = DONE_STATUSES.includes(order.status);
    const tableNum = order.table?.number || order.tableNumber;

    return (
        <div style={{ minHeight: '100svh', background: '#f8fafc', fontFamily: "'Inter',sans-serif", maxWidth: 1024, margin: '0 auto' }}>
            {/* Bell audio */}
            <audio ref={audioRef} preload="auto">
                <source src="/sound/bell.mp3" type="audio/mpeg" />
            </audio>

            {/* Status toast */}
            {statusToast && (
                <div style={{
                    position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)',
                    background: statusToast.color, color: 'white',
                    borderRadius: 14, padding: '12px 20px',
                    display: 'flex', alignItems: 'center', gap: 10,
                    boxShadow: `0 8px 24px ${statusToast.color}55`,
                    zIndex: 10000, fontWeight: 700, fontSize: '0.95rem',
                    animation: 'slideDown 0.4s ease', whiteSpace: 'nowrap'
                }}>
                    <span style={{ fontSize: '1.2rem' }}>{statusToast.icon}</span>
                    {statusToast.label}
                    <style>{`@keyframes slideDown{from{opacity:0;top:-20px}to{opacity:1;top:12px}}`}</style>
                </div>
            )}

            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81)', padding: '16px 16px 20px', position: 'sticky', top: 0, zIndex: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <button onClick={() => navigate(getMenuUrl(restaurantId, searchParams))} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 10, padding: '7px 14px', cursor: 'pointer', color: 'white', fontWeight: 600, fontSize: '0.85rem' }}>
                        ← {t('menu')}
                    </button>
                    <div className="flex items-center gap-2">
                        <LanguageSwitcher />
                        <CurrencySwitcher />
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <h1 style={{ color: 'white', margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>
                        🪑 {tableNum ? `${t('table')} ${tableNum}` : t('order_tracking')}
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.55)', margin: 0, fontSize: '0.72rem' }}>
                        #{orderId?.slice(-6).toUpperCase()}
                    </p>
                </div>
            </div>

            <div style={{ padding: '16px 16px 120px' }}>
                {/* Just submitted banner */}
                {justSubmitted && (
                    <div style={{ background: 'linear-gradient(135deg,#064e3b,#065f46)', borderRadius: 16, padding: 20, marginBottom: 16, textAlign: 'center', color: 'white' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>✅</div>
                        <h2 style={{ margin: '0 0 4px', fontSize: '1.2rem', fontWeight: 800 }}>{t('order_sent_title')}</h2>
                        <p style={{ margin: 0, opacity: 0.75, fontSize: '0.85rem' }}>{t('order_sent_desc')}</p>
                    </div>
                )}

                {/* Status hero card */}
                <div style={{
                    background: isCancelled ? '#fff1f2' : 'white',
                    borderRadius: 20, padding: 20, marginBottom: 14,
                    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                    border: `2px solid ${isCancelled ? '#fecdd3' : currentStep?.color + '33' || '#e2e8f0'}`,
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '3rem', marginBottom: 10 }}>
                        {isCancelled ? '❌' : currentStep?.icon || '📋'}
                    </div>
                    <h2 style={{ margin: '0 0 6px', fontSize: '1.4rem', fontWeight: 800, color: isCancelled ? '#be123c' : '#1e293b' }}>
                        {isCancelled ? t('order_status_cancelled') : currentStep?.label || t('order_status_received')}
                    </h2>
                    <p style={{ margin: '0 0 8px', color: '#64748b', fontSize: '0.85rem' }}>
                        {isCancelled ? t('order_cancelled_msg') : currentStep?.desc}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>
                        {elapsed(order.createdAt)}
                        {!isDone && <span style={{ marginLeft: 8, color: '#10b981', fontWeight: 600 }}>🔄 {t('updating_automatically')}</span>}
                    </p>
                </div>

                {/* Stepper */}
                {!isCancelled && (
                    <div style={{ background: 'white', borderRadius: 16, padding: 16, marginBottom: 14, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
                        {STATUS_STEPS.filter(s => !['completed', 'served'].includes(s.key)).map((step, idx) => {
                            const stepIdx = STATUS_STEPS.indexOf(step);
                            
                            // A step is COMPLETED if it's strictly before the current API status,
                            // OR if it IS the 'pending' status (since seeing this page means it was received).
                            const isCompleted = stepIdx <= currentIdx;
                            
                            // A step is IN PROGRESS if it's the one immediately AFTER the current API status.
                            const isInProgress = !isDone && stepIdx === currentIdx + 1;
                            
                            // Visually active (colored icon) if completed OR in progress
                            const isVisuallyActive = isCompleted || isInProgress;

                            return (
                                <div key={step.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: idx < 3 ? '1px solid #f1f5f9' : 'none' }}>
                                    <div style={{
                                        width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                                        background: isVisuallyActive ? step.color : '#f8fafc',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '1.2rem', transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                                        boxShadow: isVisuallyActive ? `0 8px 16px ${step.color}33` : 'none',
                                        border: isVisuallyActive ? 'none' : '2px solid #f1f5f9',
                                        position: 'relative'
                                    }}>
                                        {step.icon}
                                        {isInProgress && (
                                            <div style={{
                                                position: 'absolute', inset: -2, borderRadius: '50%',
                                                border: `2px solid ${step.color}`,
                                                animation: 'pulse 2s infinite'
                                            }} />
                                        )}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ margin: 0, fontWeight: 800, fontSize: '0.95rem', color: isVisuallyActive ? '#1e293b' : '#cbd5e1' }}>{step.label}</p>
                                        {isInProgress && (
                                            <p style={{ margin: 0, fontSize: '0.75rem', color: step.color, fontWeight: 700 }}>● {t('in_progress')}…</p>
                                        )}
                                        {isCompleted && stepIdx === currentIdx && !isDone && (
                                            <p style={{ margin: 0, fontSize: '0.72rem', color: '#10b981', fontWeight: 600 }}>{t('just_now')}</p>
                                        )}
                                    </div>
                                    <div style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {isCompleted && (
                                            <div style={{ color: '#10b981', animation: 'scaleUp 0.3s ease-out' }}>
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="20 6 9 17 4 12"></polyline>
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        <style>{`
                            @keyframes pulse {
                                0% { transform: scale(1); opacity: 1; }
                                70% { transform: scale(1.3); opacity: 0; }
                                100% { transform: scale(1.3); opacity: 0; }
                            }
                            @keyframes scaleUp {
                                from { transform: scale(0); opacity: 0; }
                                to { transform: scale(1); opacity: 1; }
                            }
                        `}</style>
                    </div>
                )}

                {/* Order summary */}
                <div style={{ background: 'white', borderRadius: 16, padding: 16, marginBottom: 14, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>{t('summary')}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <code style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', background: '#f1f5f9', padding: '2px 8px', borderRadius: 6 }}>
                                #{orderId?.slice(-6).toUpperCase()}
                            </code>
                            <button
                                onClick={() => { navigator.clipboard.writeText(`#${orderId?.slice(-6).toUpperCase()}`); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                                style={{ background: copied ? '#f0fdf4' : '#f8fafc', border: 'none', borderRadius: 8, padding: '4px 8px', cursor: 'pointer', color: copied ? '#10b981' : '#94a3b8' }}
                            >
                                {copied ? <CheckCheck size={14} /> : <Copy size={14} />}
                            </button>
                        </div>
                    </div>
                    {order.items?.map((it, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < order.items.length - 1 ? '1px solid #f1f5f9' : 'none', fontSize: '0.88rem' }}>
                            <span style={{ color: '#1e293b' }}>{it.qty || it.quantity || 1}× {it.item?.name || it.name}</span>
                            <span style={{ fontWeight: 700, color: '#312e81' }}>
                                {formatCurrency(
                                    convertCurrency(it.subtotal || (it.itemPrice || 0) * (it.qty || 1), order.currency || 'MZN', preferredCurrency, rates),
                                    preferredCurrency,
                                    locale
                                )}
                            </span>
                        </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '2px solid #f1f5f9', fontWeight: 800, fontSize: '1rem' }}>
                        <span>{t('total')}</span>
                        <span style={{ color: '#312e81' }}>
                            {formatCurrency(
                                convertCurrency(order.total, order.currency || 'MZN', preferredCurrency, rates),
                                preferredCurrency,
                                locale
                            )}
                        </span>
                    </div>
                </div>

                {/* Feedback section */}
                {['ready', 'served', 'completed'].includes(order.status) && !feedbackSubmitted && (
                    <div style={{ background: 'white', borderRadius: 16, padding: 20, boxShadow: '0 1px 6px rgba(0,0,0,0.05)', textAlign: 'center', marginBottom: 14 }}>
                        <h3 style={{ margin: '0 0 14px', fontWeight: 700, color: '#1e293b' }}>⭐ {t('how_was_experience')}</h3>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
                            {[1, 2, 3, 4, 5].map(star => (
                                <button key={star} onClick={() => setRating(star)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '2rem', transition: 'transform 0.1s', transform: star <= rating ? 'scale(1.15)' : 'scale(1)' }}>
                                    {star <= rating ? '⭐' : '☆'}
                                </button>
                            ))}
                        </div>
                        <textarea
                            value={comment}
                            onChange={e => setComment(e.target.value)}
                            placeholder={t('feedback_placeholder')}
                            rows={3}
                            style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: '0.9rem', boxSizing: 'border-box', resize: 'none', marginBottom: 10, outline: 'none', fontFamily: 'inherit' }}
                        />
                        <button
                            onClick={submitFeedback}
                            disabled={rating === 0}
                            style={{ width: '100%', padding: '12px', background: rating === 0 ? '#e2e8f0' : 'linear-gradient(135deg,#312e81,#4f46e5)', color: rating === 0 ? '#94a3b8' : 'white', border: 'none', borderRadius: 12, fontWeight: 700, cursor: rating === 0 ? 'not-allowed' : 'pointer', fontSize: '0.95rem', transition: 'all 0.2s' }}
                        >
                            {t('send_feedback_btn')}
                        </button>
                    </div>
                )}
                {feedbackSubmitted && (
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 14, padding: 16, textAlign: 'center', color: '#065f46', marginBottom: 14 }}>
                        <p style={{ margin: 0, fontWeight: 700 }}>✅ {t('feedback_thanks')}</p>
                        <p style={{ margin: '4px 0 0', fontSize: '0.83rem', opacity: 0.7 }}>{t('feedback_help_msg')}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
