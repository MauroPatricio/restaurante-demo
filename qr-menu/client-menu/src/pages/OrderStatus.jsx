import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Copy, CheckCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { io } from 'socket.io-client';
import api from '../services/api';
import { getMenuUrl } from '../utils/navigation';
import { SOCKET_URL } from '../config/api';

/* ─── Status machine (mirrors RoomOrderTracking) ─── */
const STATUS_STEPS = [
    { key: 'pending', label: 'Pedido Recebido', icon: '📋', color: '#f59e0b', desc: 'O seu pedido foi recebido pela cozinha.' },
    { key: 'confirmed', label: 'Confirmado', icon: '✅', color: '#3b82f6', desc: 'A cozinha confirmou o seu pedido.' },
    { key: 'preparing', label: 'Em Preparação', icon: '👨‍🍳', color: '#8b5cf6', desc: 'O seu pedido está a ser preparado.' },
    { key: 'ready', label: 'Pronto para Servir', icon: '🍽️', color: '#10b981', desc: 'O seu pedido está pronto! O garçom já vem.' },
    { key: 'served', label: 'Servido!', icon: '🎉', color: '#10b981', desc: 'Bom apetite! 🍽️' },
    { key: 'completed', label: 'Concluído', icon: '✔️', color: '#64748b', desc: 'Obrigado pela sua visita!' },
];

const DONE_STATUSES = ['served', 'completed', 'cancelled'];
const POLL_MS = 12000;

/* ─── Format helpers ─── */
const fmt = (n) => typeof n === 'number' ? n.toFixed(2).replace('.', ',') : n;
const elapsed = (d) => {
    const m = Math.floor((Date.now() - new Date(d)) / 60000);
    if (m < 1) return 'agora mesmo';
    if (m < 60) return `há ${m} min`;
    return `há ${Math.floor(m / 60)}h${m % 60 > 0 ? ` ${m % 60}m` : ''}`;
};

export default function OrderStatus() {
    const { restaurantId, orderId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();

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
    }, []);

    /* ── Fetch order (polling) ── */
    const fetchOrder = useCallback(async () => {
        try {
            const res = await api.get(`/orders/${orderId}`);
            const newOrder = res.data.order || res.data;
            handleStatusChange(newOrder);
        } catch (e) {
            setError(e.response?.data?.error || e.message || 'Erro ao carregar pedido.');
        } finally {
            setLoading(false);
        }
    }, [orderId, handleStatusChange]);

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
                customerName: order?.customerName || 'Cliente'
            });
            setFeedbackSubmitted(true);
        } catch { }
    };

    /* ── Loading ── */
    if (loading) return (
        <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', gap: 16 }}>
            <div style={{ width: 40, height: 40, border: '4px solid #e2e8f0', borderTop: '4px solid #312e81', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
            <p style={{ color: '#64748b', fontFamily: 'sans-serif' }}>A carregar pedido…</p>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );

    if (error || !order) return (
        <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', fontFamily: 'sans-serif' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>⚠️</div>
            <h2 style={{ color: '#be123c' }}>Não encontrado</h2>
            <p style={{ color: '#64748b' }}>{error || 'Pedido não encontrado.'}</p>
            <button onClick={() => navigate(getMenuUrl(restaurantId, searchParams))} style={{ marginTop: 16, padding: '10px 24px', background: '#312e81', color: 'white', border: 'none', borderRadius: 12, fontWeight: 700, cursor: 'pointer' }}>← Voltar ao menu</button>
        </div>
    );

    /* ── Full-screen READY alert ── */
    if (showReadyAlert) return (
        <div
            onClick={() => setShowReadyAlert(false)}
            style={{ position: 'fixed', inset: 0, background: 'linear-gradient(135deg,#064e3b,#065f46)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 9999, cursor: 'pointer', padding: 32, textAlign: 'center', fontFamily: 'sans-serif' }}
        >
            <div style={{ fontSize: '5rem', marginBottom: 20, animation: 'bounce 0.5s ease infinite alternate' }}>🍽️</div>
            <h1 style={{ color: 'white', fontSize: '2rem', margin: '0 0 12px', fontWeight: 800 }}>O seu pedido está pronto!</h1>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1.1rem', marginBottom: 40 }}>
                {order.table?.number ? `Mesa ${order.table.number} · ` : ''}O garçom já vem!
            </p>
            <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 14, padding: '12px 28px', color: 'white', fontWeight: 600 }}>
                Toque para fechar
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
        <div style={{ minHeight: '100svh', background: '#f8fafc', fontFamily: "'Inter',sans-serif", maxWidth: 460, margin: '0 auto' }}>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <button onClick={() => navigate(getMenuUrl(restaurantId, searchParams))} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 10, padding: '7px 14px', cursor: 'pointer', color: 'white', fontWeight: 600, fontSize: '0.85rem' }}>
                        ← Menu
                    </button>
                    <p style={{ color: 'rgba(255,255,255,0.55)', margin: 0, fontSize: '0.72rem' }}>
                        #{orderId?.slice(-6).toUpperCase()}
                    </p>
                </div>
                <h1 style={{ color: 'white', margin: '8px 0 0', fontSize: '1.15rem', fontWeight: 700 }}>
                    🪑 {tableNum ? `Mesa ${tableNum}` : 'Acompanhamento do Pedido'}
                </h1>
            </div>

            <div style={{ padding: '16px 16px 120px' }}>
                {/* Just submitted banner */}
                {justSubmitted && (
                    <div style={{ background: 'linear-gradient(135deg,#064e3b,#065f46)', borderRadius: 16, padding: 20, marginBottom: 16, textAlign: 'center', color: 'white' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>✅</div>
                        <h2 style={{ margin: '0 0 4px', fontSize: '1.2rem', fontWeight: 800 }}>Pedido Enviado!</h2>
                        <p style={{ margin: 0, opacity: 0.75, fontSize: '0.85rem' }}>Vamos notificá-lo a cada mudança de estado.</p>
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
                        {isCancelled ? 'Pedido Cancelado' : currentStep?.label || 'Pedido Recebido'}
                    </h2>
                    <p style={{ margin: '0 0 8px', color: '#64748b', fontSize: '0.85rem' }}>
                        {isCancelled ? '⚠️ Contacte o garçom para mais informações.' : currentStep?.desc}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>
                        {elapsed(order.createdAt)}
                        {!isDone && <span style={{ marginLeft: 8, color: '#10b981', fontWeight: 600 }}>🔄 A actualizar automaticamente</span>}
                    </p>
                </div>

                {/* Stepper */}
                {!isCancelled && (
                    <div style={{ background: 'white', borderRadius: 16, padding: 16, marginBottom: 14, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
                        {STATUS_STEPS.filter(s => s.key !== 'completed').map((step, idx) => {
                            const stepIdx = STATUS_STEPS.indexOf(step);
                            const isActive = stepIdx <= currentIdx;
                            const isCurrent = stepIdx === currentIdx;
                            return (
                                <div key={step.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: idx < 4 ? '1px solid #f1f5f9' : 'none' }}>
                                    <div style={{
                                        width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                                        background: isActive ? step.color : '#f1f5f9',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '1.1rem', transition: 'all 0.3s',
                                        boxShadow: isActive ? `0 4px 12px ${step.color}44` : 'none'
                                    }}>
                                        {step.icon}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: isActive ? '#1e293b' : '#94a3b8' }}>{step.label}</p>
                                        {isCurrent && !isDone && (
                                            <p style={{ margin: 0, fontSize: '0.75rem', color: step.color, fontWeight: 600 }}>● Em progresso…</p>
                                        )}
                                    </div>
                                    {isActive && <span style={{ color: step.color, fontSize: '1.1rem' }}>✓</span>}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Order summary */}
                <div style={{ background: 'white', borderRadius: 16, padding: 16, marginBottom: 14, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>Resumo</span>
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
                            <span style={{ fontWeight: 700, color: '#312e81' }}>{fmt((it.subtotal || (it.itemPrice || 0) * (it.qty || 1)))} MT</span>
                        </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '2px solid #f1f5f9', fontWeight: 800, fontSize: '1rem' }}>
                        <span>Total</span>
                        <span style={{ color: '#312e81' }}>{fmt(order.total)} MT</span>
                    </div>
                </div>

                {/* Feedback section */}
                {['ready', 'served', 'completed'].includes(order.status) && !feedbackSubmitted && (
                    <div style={{ background: 'white', borderRadius: 16, padding: 20, boxShadow: '0 1px 6px rgba(0,0,0,0.05)', textAlign: 'center', marginBottom: 14 }}>
                        <h3 style={{ margin: '0 0 14px', fontWeight: 700, color: '#1e293b' }}>⭐ Como foi a sua experiência?</h3>
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
                            placeholder="Deixe um comentário (opcional)…"
                            rows={3}
                            style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: '0.9rem', boxSizing: 'border-box', resize: 'none', marginBottom: 10, outline: 'none', fontFamily: 'inherit' }}
                        />
                        <button
                            onClick={submitFeedback}
                            disabled={rating === 0}
                            style={{ width: '100%', padding: '12px', background: rating === 0 ? '#e2e8f0' : 'linear-gradient(135deg,#312e81,#4f46e5)', color: rating === 0 ? '#94a3b8' : 'white', border: 'none', borderRadius: 12, fontWeight: 700, cursor: rating === 0 ? 'not-allowed' : 'pointer', fontSize: '0.95rem', transition: 'all 0.2s' }}
                        >
                            Enviar Avaliação
                        </button>
                    </div>
                )}
                {feedbackSubmitted && (
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 14, padding: 16, textAlign: 'center', color: '#065f46', marginBottom: 14 }}>
                        <p style={{ margin: 0, fontWeight: 700 }}>✅ Obrigado pelo seu feedback!</p>
                        <p style={{ margin: '4px 0 0', fontSize: '0.83rem', opacity: 0.7 }}>Ajuda-nos a melhorar o serviço.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
