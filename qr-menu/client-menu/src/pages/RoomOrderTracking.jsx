import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { API_URL } from '../config/api';

const STATUS_STEPS = [
    { key: 'pending', label: 'Pedido Recebido', icon: '📋', color: '#f59e0b', desc: 'O seu pedido foi recebido pela cozinha.' },
    { key: 'confirmed', label: 'Confirmado', icon: '✅', color: '#3b82f6', desc: 'A cozinha confirmou o seu pedido.' },
    { key: 'preparing', label: 'Em Preparação', icon: '👨‍🍳', color: '#8b5cf6', desc: 'O seu pedido está a ser preparado.' },
    { key: 'ready', label: 'A Caminho do Quarto', icon: '🚀', color: '#10b981', desc: 'O seu pedido está a caminho! Já vem.' },
    { key: 'served', label: 'Entregue!', icon: '🎉', color: '#10b981', desc: 'Bom apetite! 🍽️' },
];

const DONE_STATUSES = ['served', 'completed', 'cancelled'];
const POLL_MS = 12000; // 12s

export default function RoomOrderTracking() {
    const { restaurantId, orderId } = useParams();
    const [searchParams] = useSearchParams();
    const roomId = searchParams.get('room');
    const token = searchParams.get('token');

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [prevStatus, setPrevStatus] = useState(null);
    const [showReadyAlert, setShowReadyAlert] = useState(false);
    const audioRef = useRef(null);

    /* ── Fetch order ── */
    const fetchOrder = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/public/room/order/${orderId}`);
            if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Pedido não encontrado'); }
            const data = await res.json();
            setOrder(prev => {
                const newStatus = data.order.status;
                // Detect "ready" transition → alert
                if (prev?.status !== newStatus && newStatus === 'ready') {
                    setShowReadyAlert(true);
                    // Vibrate mobile
                    try { navigator.vibrate?.([400, 100, 400, 100, 800]); } catch { }
                    // Play beep
                    try { audioRef.current?.play(); } catch { }
                }
                setPrevStatus(prev?.status ?? null);
                return data.order;
            });
        } catch (e) {
            setError(e.message || 'Erro ao carregar pedido.');
        } finally {
            setLoading(false);
        }
    }, [orderId]);

    useEffect(() => { fetchOrder(); }, [fetchOrder]);

    /* ── Polling (stop when done) ── */
    useEffect(() => {
        if (!order || DONE_STATUSES.includes(order.status)) return;
        const id = setInterval(fetchOrder, POLL_MS);
        return () => clearInterval(id);
    }, [order, fetchOrder]);

    /* ── Dismiss ready alert on tap ── */
    const dismissAlert = () => setShowReadyAlert(false);

    /* ─── Helpers ─── */
    const currentIdx = order ? STATUS_STEPS.findIndex(s => s.key === order.status) : -1;
    const currentStep = currentIdx >= 0 ? STATUS_STEPS[currentIdx] : null;
    const isCancelled = order?.status === 'cancelled';
    const isDelivered = ['served', 'completed'].includes(order?.status);
    const totalItems = order?.items?.reduce((s, i) => s + (i.qty || 1), 0) || 0;
    const getElapsed = (d) => {
        const m = Math.floor((Date.now() - new Date(d)) / 60000);
        if (m < 1) return 'agora mesmo';
        if (m < 60) return `há ${m} min`;
        return `há ${Math.floor(m / 60)}h${m % 60 > 0 ? ` ${m % 60}m` : ''}`;
    };

    /* ── Loading ── */
    if (loading) return (
        <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', gap: 16 }}>
            <div style={{ width: 40, height: 40, border: '4px solid #e2e8f0', borderTop: '4px solid #312e81', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
            <p style={{ color: '#64748b', fontFamily: 'sans-serif' }}>A carregar pedido…</p>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );

    /* ── Error ── */
    if (error || !order) return (
        <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', fontFamily: 'sans-serif' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>⚠️</div>
            <h2 style={{ color: '#be123c' }}>Não encontrado</h2>
            <p style={{ color: '#64748b' }}>{error || 'Pedido não encontrado.'}</p>
        </div>
    );

    /* ── Full-screen READY alert ── */
    if (showReadyAlert) return (
        <div
            onClick={dismissAlert}
            style={{ position: 'fixed', inset: 0, background: 'linear-gradient(135deg,#064e3b,#065f46)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 9999, cursor: 'pointer', padding: 32, textAlign: 'center', fontFamily: 'sans-serif', animation: 'pulse 1s ease-in-out infinite' }}
        >
            <div style={{ fontSize: '5rem', marginBottom: 20, animation: 'bounce 0.5s ease infinite alternate' }}>🚀</div>
            <h1 style={{ color: 'white', fontSize: '2rem', margin: '0 0 12px', fontWeight: 800 }}>O seu pedido está a caminho!</h1>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1.1rem', marginBottom: 40 }}>Quarto {order?.roomService?.roomNumber} · Já vem aí!</p>
            <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 14, padding: '12px 28px', color: 'white', fontWeight: 600 }}>
                Toque para fechar
            </div>
            <style>{`@keyframes bounce{from{transform:translateY(-10px)}to{transform:translateY(10px)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.85}}`}</style>
        </div>
    );

    /* ── Main tracking page ── */
    const headerBg = isCancelled
        ? 'linear-gradient(135deg,#7f1d1d,#991b1b)'
        : isDelivered
            ? 'linear-gradient(135deg,#064e3b,#065f46)'
            : 'linear-gradient(135deg,#1e1b4b,#312e81)';

    return (
        <div style={{ minHeight: '100svh', background: '#f8fafc', fontFamily: "'Inter',sans-serif", maxWidth: 460, margin: '0 auto' }}>
            {/* Silent audio for ready notification */}
            <audio ref={audioRef} preload="none">
                <source src="data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA" type="audio/wav" />
            </audio>

            {/* Header */}
            <div style={{ background: headerBg, padding: '24px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: 8 }}>{isCancelled ? '❌' : currentStep?.icon || '📋'}</div>
                <h1 style={{ color: 'white', margin: '0 0 4px', fontSize: '1.25rem', fontWeight: 700 }}>
                    🛏️ Quarto {order.roomService?.roomNumber || '—'}
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.65)', margin: 0, fontSize: '0.82rem' }}>
                    {order.customerName} · {totalItems} item{totalItems !== 1 ? 's' : ''} · {getElapsed(order.createdAt)}
                </p>
            </div>

            {/* Status label */}
            {!isCancelled && currentStep && (
                <div style={{ background: currentStep.color + '15', borderBottom: `2px solid ${currentStep.color}30`, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1.4rem' }}>{currentStep.icon}</span>
                    <div>
                        <p style={{ margin: 0, fontWeight: 700, color: currentStep.color, fontSize: '0.95rem' }}>{currentStep.label}</p>
                        <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>{currentStep.desc}</p>
                    </div>
                </div>
            )}

            {/* Progress Stepper */}
            {!isCancelled && (
                <div style={{ background: 'white', padding: '20px 20px 12px', borderBottom: '1px solid #f1f5f9' }}>
                    {STATUS_STEPS.map((step, idx) => {
                        const done = idx <= currentIdx;
                        const active = idx === currentIdx;
                        return (
                            <div key={step.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, position: 'relative', marginBottom: 4 }}>
                                {/* Vertical line */}
                                {idx < STATUS_STEPS.length - 1 && (
                                    <div style={{ position: 'absolute', left: 17, top: 36, width: 2, height: 26, background: idx < currentIdx ? step.color : '#e2e8f0', transition: 'background .4s' }} />
                                )}
                                {/* Circle */}
                                <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: active ? '1.1rem' : '0.85rem', background: done ? step.color : '#f1f5f9', boxShadow: active ? `0 0 0 5px ${step.color}30` : 'none', transition: 'all .3s' }}>
                                    {done ? step.icon : <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#cbd5e1', display: 'block' }} />}
                                </div>
                                {/* Text */}
                                <div style={{ paddingTop: 7, marginBottom: 22 }}>
                                    <p style={{ margin: 0, fontWeight: active ? 700 : 500, fontSize: '0.9rem', color: done ? '#1e293b' : '#94a3b8', transition: 'all .3s' }}>{step.label}</p>
                                    {active && !isDelivered && (
                                        <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: step.color, fontWeight: 600 }}>● Em progresso…</p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Cancelled */}
            {isCancelled && (
                <div style={{ margin: 16, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '16px', textAlign: 'center' }}>
                    <p style={{ color: '#991b1b', fontWeight: 700, margin: '0 0 4px' }}>Pedido Cancelado</p>
                    <p style={{ color: '#64748b', margin: 0, fontSize: '0.82rem' }}>Por favor contacte a receção.</p>
                </div>
            )}

            {/* Order Summary */}
            <div style={{ margin: 16, background: 'white', borderRadius: 14, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <h3 style={{ margin: '0 0 12px', fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>🧾 Resumo</h3>
                {order.items?.map((it, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.87rem', marginBottom: 7, color: '#475569' }}>
                        <span>{it.qty}× {it.item?.name || 'Item'}</span>
                        <span style={{ fontWeight: 600 }}>{Number(it.subtotal || (it.itemPrice || 0) * it.qty).toFixed(2)} MT</span>
                    </div>
                ))}
                {order.notes && (
                    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '7px 12px', marginTop: 8, fontSize: '0.78rem', color: '#92400e' }}>
                        📝 {order.notes}
                    </div>
                )}
                <div style={{ borderTop: '1px solid #f1f5f9', marginTop: 12, paddingTop: 12, display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#1e293b', fontSize: '1rem' }}>
                    <span>Total</span><span>{Number(order.total || 0).toFixed(2)} MT</span>
                </div>
                <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: '5px 0 0' }}>💳 Faturação ao quarto</p>
            </div>

            {/* Back link */}
            {!isCancelled && roomId && token && (
                <div style={{ margin: '4px 16px 24px' }}>
                    <a href={`/room/${restaurantId}?room=${roomId}&token=${encodeURIComponent(token)}`}
                        style={{ display: 'block', textAlign: 'center', padding: 12, background: '#f1f5f9', color: '#475569', borderRadius: 12, fontWeight: 600, textDecoration: 'none', fontSize: '0.88rem' }}>
                        ← Fazer mais um pedido
                    </a>
                </div>
            )}

            {/* Polling indicator */}
            {!isDelivered && !isCancelled && (
                <p style={{ textAlign: 'center', fontSize: '0.72rem', color: '#94a3b8', padding: '0 0 24px' }}>
                    🔄 A atualizar a cada {POLL_MS / 1000} segundos
                </p>
            )}
        </div>
    );
}
