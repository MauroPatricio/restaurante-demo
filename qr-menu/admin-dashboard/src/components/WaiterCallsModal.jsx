import React, { useState, useEffect } from 'react';
import { X, User, Clock, CheckCircle, Coffee, MessageSquare, AlertTriangle, UserCheck, LayoutGrid, List } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale/pt';
import { waiterCallAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';

export default function WaiterCallsModal({ isOpen, onClose, restaurantId }) {
    const { user } = useAuth();
    const { socket } = useSocket();
    const [calls, setCalls] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [viewType, setViewType] = useState('cards'); // 'cards' or 'table'

    const isWaiter = user?.role?.name === 'Waiter' || user?.role === 'waiter';

    useEffect(() => {
        if (isOpen && restaurantId) {
            fetchCalls();
        }
    }, [isOpen, restaurantId]);

    useEffect(() => {
        if (!socket || !isOpen) return;

        const handleUpdate = () => {
            fetchCalls();
        };

        socket.on('waiter:call', handleUpdate);
        socket.on('waiter:call:acknowledged', handleUpdate);
        socket.on('waiter:call:resolved', handleUpdate);

        return () => {
            socket.off('waiter:call', handleUpdate);
            socket.off('waiter:call:acknowledged', handleUpdate);
            socket.off('waiter:call:resolved', handleUpdate);
        };
    }, [socket, isOpen]);

    const fetchCalls = async () => {
        setLoading(true);
        try {
            const waiterId = isWaiter ? user._id : null;
            const res = await waiterCallAPI.getActive(restaurantId, waiterId);
            setCalls(Array.isArray(res.data?.calls) ? res.data.calls : []);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch waiter calls:', err);
            setError('Falha ao carregar solicitações.');
        } finally {
            setLoading(false);
        }
    };

    const handleAttend = async (callId) => {
        try {
            await waiterCallAPI.resolve(callId);
        } catch (err) {
            console.error('Failed to attend call:', err);
            alert('Erro ao atender mesa.');
        }
    };

    if (!isOpen) return null;

    // Design Tokens - Emerald/Slate Palette
    const tokens = {
        primary: '#10b981',
        primaryDark: '#059669',
        secondary: '#0f172a',
        accent: '#f59e0b',
        danger: '#ef4444',
        slate50: '#f8fafc',
        slate100: '#f1f5f9',
        slate200: '#e2e8f0',
        slate400: '#94a3b8',
        slate600: '#475569',
        slate800: '#1e293b',
        glassBg: 'rgba(255, 255, 255, 0.85)',
        glassBorder: 'rgba(255, 255, 255, 0.6)',
        shadow: '0 40px 100px -20px rgba(0,0,0,0.15)',
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px', overflow: 'hidden'
        }}>
            {/* Backdrop with intense blur */}
            <div
                onClick={onClose}
                style={{
                    position: 'absolute', inset: 0,
                    background: 'rgba(15, 23, 42, 0.3)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                }}
            />

            {/* Modal Container */}
            <div style={{
                position: 'relative', width: '100%', maxWidth: '1000px',
                maxHeight: '85vh', background: tokens.glassBg,
                backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)',
                borderRadius: '40px', border: `1px solid ${tokens.glassBorder}`,
                boxShadow: tokens.shadow, display: 'flex', flexDirection: 'column',
                overflow: 'hidden', animation: 'modalScaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>

                {/* Header Section */}
                <div style={{
                    padding: '32px 40px', borderBottom: '1px solid rgba(0,0,0,0.04)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'linear-gradient(to right, rgba(16, 185, 129, 0.04), transparent)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{
                            width: '56px', height: '56px',
                            background: `linear-gradient(135deg, ${tokens.primary}, ${tokens.primaryDark})`,
                            borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white', boxShadow: '0 8px 16px -4px rgba(16, 185, 129, 0.3)'
                        }}>
                            <Coffee size={28} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '24px', fontWeight: '900', color: tokens.secondary, margin: 0, letterSpacing: '-0.02em' }}>
                                Solicitações Ativas
                            </h2>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                <div style={{
                                    width: '6px', height: '6px', borderRadius: '50%',
                                    background: calls.length > 0 ? tokens.danger : tokens.slate400,
                                    animation: calls.length > 0 ? 'pulseGlow 2s infinite' : 'none'
                                }} />
                                <span style={{ fontSize: '10px', fontWeight: '800', color: tokens.slate400, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                    {calls.length} mesas aguardando
                                </span>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ background: tokens.slate100, padding: '4px', borderRadius: '14px', display: 'flex', gap: '4px' }}>
                            <button
                                onClick={() => setViewType('cards')}
                                style={{
                                    border: 'none', background: viewType === 'cards' ? 'white' : 'transparent',
                                    padding: '8px 12px', borderRadius: '10px', cursor: 'pointer',
                                    boxShadow: viewType === 'cards' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                                    color: viewType === 'cards' ? tokens.secondary : tokens.slate400,
                                    transition: 'all 0.2s ease', display: 'flex', alignItems: 'center'
                                }}
                            >
                                <LayoutGrid size={18} />
                            </button>
                            <button
                                onClick={() => setViewType('table')}
                                style={{
                                    border: 'none', background: viewType === 'table' ? 'white' : 'transparent',
                                    padding: '8px 12px', borderRadius: '10px', cursor: 'pointer',
                                    boxShadow: viewType === 'table' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                                    color: viewType === 'table' ? tokens.secondary : tokens.slate400,
                                    transition: 'all 0.2s ease', display: 'flex', alignItems: 'center'
                                }}
                            >
                                <List size={18} />
                            </button>
                        </div>

                        <button
                            onClick={onClose}
                            style={{
                                width: '44px', height: '44px', border: 'none',
                                background: 'white', color: tokens.slate400,
                                borderRadius: '14px', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.03)'
                            }}
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Body Content */}
                <div style={{
                    overflowY: 'auto', padding: '32px 40px', flexGrow: 1,
                    background: 'rgba(255, 255, 255, 0.4)'
                }} className="custom-scrollbar">
                    {loading && calls.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '100px 0' }}>
                            <div style={{
                                width: '40px', height: '40px', border: '3px solid #f3f3f3',
                                borderTop: `3px solid ${tokens.primary}`, borderRadius: '50%',
                                margin: '0 auto 20px auto', animation: 'spinAround 0.8s linear infinite'
                            }} />
                            <p style={{ fontSize: '14px', fontWeight: '700', color: tokens.slate400 }}>Sincronizando mesas...</p>
                        </div>
                    ) : error ? (
                        <div style={{ textAlign: 'center', padding: '60px', background: '#fff1f2', borderRadius: '32px', border: '1px solid #ffe4e6' }}>
                            <AlertTriangle size={40} color={tokens.danger} style={{ marginBottom: '16px' }} />
                            <p style={{ fontWeight: '800', color: '#be123c', marginBottom: '16px' }}>{error}</p>
                            <button onClick={fetchCalls} style={{
                                padding: '12px 24px', background: 'white', border: '1px solid #ffe4e6',
                                borderRadius: '14px', fontWeight: '800', color: tokens.danger, cursor: 'pointer'
                            }}>Tentar novamente</button>
                        </div>
                    ) : calls.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '100px 0' }}>
                            <div style={{
                                width: '72px', height: '72px', background: 'white', borderRadius: '24px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto',
                                boxShadow: '0 8px 30px rgba(0,0,0,0.03)'
                            }}>
                                <CheckCircle size={36} color={tokens.slate200} />
                            </div>
                            <h3 style={{ fontSize: '22px', fontWeight: '900', color: tokens.secondary, margin: '0 0 8px 0' }}>Tudo Tranquilo!</h3>
                            <p style={{ color: tokens.slate400, fontWeight: '600', maxWidth: '320px', margin: '0 auto', lineHeight: '1.5' }}>Não existem solicitações ativas neste momento.</p>
                        </div>
                    ) : (
                        viewType === 'cards' ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                                {calls.map((call) => (
                                    <div key={call._id} style={{
                                        background: 'white', borderRadius: '30px', padding: '24px',
                                        border: '1px solid rgba(0,0,0,0.02)', boxShadow: '0 10px 30px rgba(0,0,0,0.03)',
                                        display: 'flex', flexDirection: 'column', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        cursor: 'default', position: 'relative', overflow: 'hidden'
                                    }} className="premium-card">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                                            <div style={{
                                                padding: '10px 20px', background: tokens.secondary, color: 'white',
                                                borderRadius: '14px', fontWeight: '900', fontSize: '18px',
                                                boxShadow: '0 6px 15px rgba(15, 23, 42, 0.2)'
                                            }}>
                                                Mesa {call.metadata?.tableNumber || '?'}
                                            </div>
                                            <div style={{
                                                padding: '6px 12px', borderRadius: '10px', fontSize: '9px', fontWeight: '900',
                                                textTransform: 'uppercase', letterSpacing: '0.08em',
                                                background: call.type === 'payment_request' ? '#fffbeb' : '#ecfdf5',
                                                color: call.type === 'payment_request' ? '#b45309' : '#047857',
                                                border: `1px solid ${call.type === 'payment_request' ? '#fef3c7' : '#d1fae5'}`
                                            }}>
                                                {call.type === 'payment_request' ? 'PAGAMENTO' : 'CHAMADA'}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: '32px', height: '32px', background: tokens.slate50, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: tokens.slate400 }}>
                                                    <User size={16} />
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontSize: '9px', fontWeight: '800', color: tokens.slate400, textTransform: 'uppercase' }}>Cliente</span>
                                                    <span style={{ fontSize: '13px', fontWeight: '700', color: tokens.slate800 }}>{call.metadata?.customerName || 'Visitante'}</span>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: '32px', height: '32px', background: tokens.slate50, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: tokens.slate400 }}>
                                                    <UserCheck size={16} />
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontSize: '9px', fontWeight: '800', color: tokens.slate400, textTransform: 'uppercase' }}>Atendente</span>
                                                    <span style={{ fontSize: '13px', fontWeight: '700', color: tokens.slate800 }}>{call.metadata?.waiterName || 'Todos'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{
                                            paddingTop: '20px', borderTop: '1px solid #f8fafc',
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: tokens.slate400 }}>
                                                <Clock size={14} />
                                                <span style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase' }}>
                                                    {formatDistanceToNow(new Date(call.createdAt), { locale: pt })}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => handleAttend(call._id)}
                                                style={{
                                                    padding: '10px 20px', background: tokens.secondary, color: 'white',
                                                    borderRadius: '12px', border: 'none', fontWeight: '900', fontSize: '11px',
                                                    cursor: 'pointer', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: '8px'
                                                }}
                                                className="interact-btn"
                                            >
                                                <CheckCircle size={14} />
                                                Atender
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            /* Premium Table View */
                            <div style={{
                                background: 'white', borderRadius: '28px', border: '1px solid rgba(0,0,0,0.03)',
                                overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
                            }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead style={{ background: '#f8fafc' }}>
                                        <tr>
                                            <th style={thStyle}>Mesa</th>
                                            <th style={thStyle}>Tipo</th>
                                            <th style={thStyle}>Solicitado Por</th>
                                            <th style={thStyle}>Aguardando Há</th>
                                            <th style={{ ...thStyle, textAlign: 'right' }}>Ação</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {calls.map((call) => (
                                            <tr key={call._id} style={{ borderBottom: '1px solid #f8fafc' }} className="table-row-hover">
                                                <td style={tdStyle}>
                                                    <div style={{
                                                        width: '36px', height: '36px', background: tokens.secondary, color: 'white',
                                                        borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontWeight: '900', fontSize: '14px'
                                                    }}>{call.metadata?.tableNumber || '?'}</div>
                                                </td>
                                                <td style={tdStyle}>
                                                    <span style={{
                                                        padding: '5px 10px', borderRadius: '8px', fontSize: '9px', fontWeight: '900',
                                                        textTransform: 'uppercase', letterSpacing: '0.04em',
                                                        background: call.type === 'payment_request' ? '#fffbeb' : '#ecfdf5',
                                                        color: call.type === 'payment_request' ? '#b45309' : '#047857'
                                                    }}>
                                                        {call.type === 'payment_request' ? 'Pagamento' : 'Chamada'}
                                                    </span>
                                                </td>
                                                <td style={tdStyle}>
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <span style={{ fontSize: '14px', fontWeight: '700', color: tokens.slate800 }}>{call.metadata?.customerName || 'Visitante'}</span>
                                                        <span style={{ fontSize: '9px', color: tokens.slate400, fontWeight: '700', textTransform: 'uppercase' }}>Atend: {call.metadata?.waiterName || 'Todos'}</span>
                                                    </div>
                                                </td>
                                                <td style={tdStyle}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: tokens.slate600 }}>
                                                        <Clock size={14} />
                                                        <span style={{ fontSize: '12px', fontWeight: '700' }}>
                                                            {formatDistanceToNow(new Date(call.createdAt), { locale: pt })}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td style={{ ...tdStyle, textAlign: 'right' }}>
                                                    <button
                                                        onClick={() => handleAttend(call._id)}
                                                        style={{
                                                            width: '38px', height: '38px', background: tokens.slate50, border: 'none',
                                                            borderRadius: '10px', cursor: 'pointer', color: tokens.slate400,
                                                            transition: 'all 0.2s ease', display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
                                                        }}
                                                        className="table-action-btn"
                                                    >
                                                        <CheckCircle size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )
                    )}
                </div>

                {/* Footer Status */}
                <div style={{
                    padding: '20px 40px', borderTop: '1px solid rgba(0,0,0,0.03)',
                    background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                }}>
                    <div className="pulse-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: tokens.primary }} />
                    <span style={{ fontSize: '9px', fontWeight: '900', color: tokens.slate400, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                        Serviço de Sincronização Ativo
                    </span>
                </div>
            </div>

            <style>{`
                @keyframes modalScaleIn {
                    from { transform: scale(0.9) translateY(20px); opacity: 0; }
                    to { transform: scale(1) translateY(0); opacity: 1; }
                }
                @keyframes pulseGlow {
                    0% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
                    70% { transform: scale(1.2); opacity: 0.5; box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
                    100% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
                }
                @keyframes spinAround {
                    to { transform: rotate(360deg); }
                }
                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                .premium-card:hover { transform: translateY(-4px); box-shadow: 0 20px 40px rgba(0,0,0,0.08); border-color: rgba(16, 185, 129, 0.2); }
                .interact-btn:hover { background: #10b981 !important; transform: scale(1.05); }
                .table-row-hover:hover { background: #fbfcfd !important; }
                .table-action-btn:hover { background: #10b981 !important; color: white !important; }
                .pulse-dot { animation: pulseGlow 2s infinite; }
            `}</style>
        </div>
    );
}

const thStyle = {
    padding: '16px 24px', fontSize: '9px', fontWeight: '900', color: '#94a3b8',
    textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid #f1f5f9'
};

const tdStyle = {
    padding: '16px 24px', verticalAlign: 'middle'
};
