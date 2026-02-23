import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { API_URL } from '../config/api';

const STATUS_STEPS = [
    { key: 'pending', label: 'Pedido Recebido', icon: '📋', color: '#f59e0b' },
    { key: 'confirmed', label: 'Confirmado', icon: '✅', color: '#3b82f6' },
    { key: 'preparing', label: 'Em Preparação', icon: '👨‍🍳', color: '#8b5cf6' },
    { key: 'ready', label: 'A Caminho do Quarto', icon: '🚶', color: '#10b981' },
    { key: 'served', label: 'Entregue!', icon: '🎉', color: '#10b981' }
];

const POLLING_INTERVAL = 15000; // 15 seconds

export default function RoomOrderTracking() {
    const { restaurantId, orderId } = useParams();
    const [searchParams] = useSearchParams();
    const roomId = searchParams.get('room');
    const token = searchParams.get('token');

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchOrder = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/public/room/order/${orderId}`);
            if (!res.ok) throw new Error('Pedido não encontrado');
            const data = await res.json();
            setOrder(data.order);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [orderId]);

    useEffect(() => {
        fetchOrder();
    }, [fetchOrder]);

    // Poll until served/completed/cancelled
    useEffect(() => {
        if (!order) return;
        if (['served', 'completed', 'cancelled'].includes(order.status)) return;

        const timer = setInterval(fetchOrder, POLLING_INTERVAL);
        return () => clearInterval(timer);
    }, [order, fetchOrder]);

    const currentStepIdx = order ? STATUS_STEPS.findIndex(s => s.key === order.status) : -1;
    const currentStep = currentStepIdx >= 0 ? STATUS_STEPS[currentStepIdx] : null;

    const getElapsed = (dateStr) => {
        const diff = Math.floor((Date.now() - new Date(dateStr)) / 60000);
        if (diff < 1) return 'agora mesmo';
        if (diff < 60) return `há ${diff} min`;
        return `há ${Math.floor(diff / 60)}h ${diff % 60}m`;
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', gap: '16px' }}>
                <div style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTop: '4px solid #312e81', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <p style={{ color: '#64748b', fontFamily: 'sans-serif' }}>A carregar pedido...</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center', fontFamily: 'sans-serif' }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⚠️</div>
                <h2 style={{ color: '#be123c' }}>Não encontrado</h2>
                <p style={{ color: '#64748b' }}>{error || 'Pedido não encontrado.'}</p>
            </div>
        );
    }

    const isCancelled = order.status === 'cancelled';
    const isDelivered = order.status === 'served' || order.status === 'completed';

    return (
        <div style={{ minHeight: '100svh', background: '#f8fafc', fontFamily: "'Inter', sans-serif", maxWidth: '460px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{
                background: isCancelled
                    ? 'linear-gradient(135deg, #7f1d1d, #991b1b)'
                    : isDelivered
                        ? 'linear-gradient(135deg, #064e3b, #065f46)'
                        : 'linear-gradient(135deg, #1e1b4b, #312e81)',
                padding: '24px 20px',
                textAlign: 'center'
            }}>
                <div style={{ fontSize: '3rem', marginBottom: '8px', animation: isDelivered ? 'bounce 0.6s ease' : undefined }}>
                    {currentStep?.icon || '📋'}
                </div>
                <h1 style={{ color: 'white', margin: '0 0 4px', fontSize: '1.3rem', fontWeight: '700' }}>
                    {order.roomService?.roomNumber ? `🛏️ Quarto ${order.roomService.roomNumber}` : 'Room Service'}
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.7)', margin: 0, fontSize: '0.85rem' }}>
                    {order.customerName} · Pedido {getElapsed(order.createdAt)}
                </p>
                <style>{`@keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }`}</style>
            </div>

            {/* Progress Stepper */}
            {!isCancelled && (
                <div style={{ background: 'white', padding: '24px 20px', borderBottom: '1px solid #f1f5f9' }}>
                    {STATUS_STEPS.map((step, idx) => {
                        const done = idx <= currentStepIdx;
                        const active = idx === currentStepIdx;
                        return (
                            <div key={step.key} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: idx < STATUS_STEPS.length - 1 ? '4px' : '0', position: 'relative' }}>
                                {/* Connector */}
                                {idx < STATUS_STEPS.length - 1 && (
                                    <div style={{ position: 'absolute', left: '17px', top: '36px', width: '2px', height: '28px', background: idx < currentStepIdx ? step.color : '#e2e8f0', transition: 'background 0.3s' }} />
                                )}
                                {/* Circle */}
                                <div style={{
                                    width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: active ? '1.2rem' : '0.9rem',
                                    background: done ? step.color : '#f1f5f9',
                                    boxShadow: active ? `0 0 0 4px ${step.color}33` : 'none',
                                    transition: 'all 0.3s'
                                }}>
                                    {done ? step.icon : '○'}
                                </div>
                                {/* Label */}
                                <div style={{ paddingTop: '6px', marginBottom: '20px' }}>
                                    <p style={{ margin: 0, fontWeight: active ? '700' : '500', color: done ? '#1e293b' : '#94a3b8', transition: 'all 0.3s' }}>
                                        {step.label}
                                    </p>
                                    {active && !isDelivered && (
                                        <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: step.color, fontWeight: '600' }}>
                                            ● Em progresso...
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {isCancelled && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', margin: '16px', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                    <p style={{ color: '#991b1b', fontWeight: '700', margin: '0 0 4px' }}>❌ Pedido Cancelado</p>
                    <p style={{ color: '#64748b', margin: 0, fontSize: '0.85rem' }}>Por favor contacte a receção para mais informações.</p>
                </div>
            )}

            {/* Order Summary */}
            <div style={{ margin: '16px', background: 'white', borderRadius: '14px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <h3 style={{ margin: '0 0 12px', fontWeight: '700', color: '#1e293b', fontSize: '1rem' }}>🧾 Resumo do Pedido</h3>
                {order.items?.map((it, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '8px', color: '#475569' }}>
                        <span>{it.qty}× {it.item?.name || 'Item'}</span>
                        <span style={{ fontWeight: '600' }}>{(it.subtotal || it.itemPrice * it.qty || 0).toFixed(2)} MT</span>
                    </div>
                ))}
                {order.notes && (
                    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '8px 12px', marginTop: '8px', fontSize: '0.8rem', color: '#92400e' }}>
                        📝 {order.notes}
                    </div>
                )}
                <div style={{ borderTop: '1px solid #f1f5f9', marginTop: '12px', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', fontWeight: '700', color: '#1e293b' }}>
                    <span>Total</span>
                    <span>{order.total?.toFixed(2)} MT</span>
                </div>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '6px 0 0' }}>💳 Faturação ao quarto · Pague no check-out</p>
            </div>

            {/* Back to menu */}
            {!isCancelled && roomId && token && (
                <div style={{ margin: '8px 16px 24px' }}>
                    <a
                        href={`/room/${restaurantId}?room=${roomId}&token=${token}`}
                        style={{ display: 'block', textAlign: 'center', padding: '12px', background: '#f1f5f9', color: '#475569', borderRadius: '12px', fontWeight: '600', textDecoration: 'none', fontSize: '0.9rem' }}
                    >
                        ← Fazer mais um pedido
                    </a>
                </div>
            )}

            {/* Auto-refresh indicator */}
            {!isDelivered && !isCancelled && (
                <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8', padding: '0 0 24px' }}>
                    🔄 A atualizar a cada 15 segundos
                </p>
            )}
        </div>
    );
}
