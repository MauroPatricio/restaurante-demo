import React, { useEffect, useState } from 'react';
import { Bell, X, CheckCircle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale/pt';

export default function WaiterCallToast({ call, onDismiss, onAttend }) {
    const [visible, setVisible] = useState(false);
    const [timeAgo, setTimeAgo] = useState('');

    useEffect(() => {
        if (call) {
            setVisible(true);
            const interval = setInterval(() => {
                setTimeAgo(formatDistanceToNow(new Date(call.createdAt), { locale: pt, addSuffix: true }));
            }, 1000);
            setTimeAgo(formatDistanceToNow(new Date(call.createdAt), { locale: pt, addSuffix: true }));

            // Auto dismiss after 30 seconds if ignored? No, clearer to keep until dismissed manually or attended.

            return () => clearInterval(interval);
        }
    }, [call]);

    const handleAttend = (e) => {
        e.stopPropagation();
        if (onAttend) onAttend(call._id);
        setVisible(false);
    };

    const handleDismiss = (e) => {
        e.stopPropagation();
        setVisible(false);
        setTimeout(() => {
            if (onDismiss) onDismiss();
        }, 300);
    };

    if (!call) return null;

    return (
        <div
            style={{
                position: 'fixed',
                top: '24px',
                right: visible ? '24px' : '-400px',
                width: '380px',
                background: 'white',
                borderRadius: '24px',
                boxShadow: '0 20px 60px -10px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
                padding: '24px',
                zIndex: 9999,
                transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(-10px)'
            }}
        >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '40px', height: '40px',
                        background: '#ef4444',
                        borderRadius: '12px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white',
                        animation: 'pulse-red 2s infinite'
                    }}>
                        <Bell size={20} fill="currentColor" />
                    </div>
                    <div>
                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '900', color: '#0f172a' }}>
                            Nova Chamada
                        </h4>
                        <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: '700' }}>
                            Mesa {call.tableNumber || '?'}
                        </span>
                    </div>
                </div>
                <button
                    onClick={handleDismiss}
                    style={{
                        border: 'none', background: 'transparent', color: '#94a3b8',
                        cursor: 'pointer', padding: '4px'
                    }}
                >
                    <X size={20} />
                </button>
            </div>

            {/* Content */}
            <div style={{
                background: '#f8fafc',
                borderRadius: '16px',
                padding: '16px',
                marginBottom: '16px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>CLIENTE</span>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>TEMPO</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>
                        {call.customerName || 'Cliente'}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b' }}>
                        <Clock size={12} />
                        <span style={{ fontSize: '12px', fontWeight: '600' }}>{timeAgo}</span>
                    </div>
                </div>
                {call.waiterName && (
                    <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                            Garçom: <strong>{call.waiterName}</strong>
                        </span>
                    </div>
                )}
            </div>

            {/* Actions */}
            <button
                onClick={handleAttend}
                style={{
                    width: '100%',
                    padding: '14px',
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '16px',
                    fontWeight: '800',
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'background 0.2s'
                }}
            >
                <CheckCircle size={18} />
                Atender Chamada
            </button>

            <style>{`
                @keyframes pulse-red {
                    0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
                    70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
                }
            `}</style>
        </div>
    );
}
